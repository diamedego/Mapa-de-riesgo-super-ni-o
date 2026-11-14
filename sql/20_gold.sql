-- =====================================================================================
-- GOLD: índice de riesgo de inundación por gobierno local y mes (estructura INFORM).
--   Riesgo = (Amenaza × Exposición × Vulnerabilidad)^(1/3), cada componente de 0 a 10.
-- Corre igual en DuckDB y en Databricks SQL. Entrada: silver.*, bronze.parametros.
-- La sensibilidad de pesos (Monte Carlo, 1 000 simulaciones) se calcula en Python
-- (modelos/indice_riesgo.py); acá está el índice central.
-- =====================================================================================
CREATE SCHEMA IF NOT EXISTS gold;

-- -------------------------------------------------------------------------------------
-- 1. Componentes que no cambian mes a mes.
--    Cada indicador se lleva a 0-1 con UMBRALES FÍSICOS FIJOS en sus propias unidades
--    (u = (valor − cero) / (lleno − cero), recortado a 0-1; sin dato → 0), los mismos que
--    UMBRALES en modelos/indice_riesgo.py. No se compara con los demás municipios.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE TABLE gold.componentes_fijos AS
WITH base AS (
  SELECT
    *,
    -- promedio de los dos Niños observados, ignorando el que falte
    (COALESCE(agua_nino_2015_16_pct, agua_nino_2023_24_pct)
      + COALESCE(agua_nino_2023_24_pct, agua_nino_2015_16_pct)) / 2 AS agua_ninos_pct
  FROM silver.gobiernos_locales
),
indicadores AS (                                   -- formato largo: un indicador por fila
            SELECT cmu, 'amenaza_agua_historica' AS indicador, pct_area_agua_alguna_vez AS valor FROM base
  UNION ALL SELECT cmu, 'amenaza_agua_ninos',      agua_ninos_pct                         FROM base
  UNION ALL SELECT cmu, 'amenaza_terreno_bajo',    pct_area_hand_2m                       FROM base
  UNION ALL SELECT cmu, 'quebrada_arcilla',        arcilla_pct                            FROM base
  UNION ALL SELECT cmu, 'expo_personas_bajo',      LOG10(1 + COALESCE(pob_terreno_bajo, 0)) FROM base
  UNION ALL SELECT cmu, 'expo_proporcion_bajo',    COALESCE(pob_terreno_bajo / NULLIF(poblacion, 0), 0) FROM base
  UNION ALL SELECT cmu, 'vuln_sin_cloaca',         100 - pct_cloaca                       FROM base
  UNION ALL SELECT cmu, 'vuln_nbi',                pct_nbi                                FROM base
  UNION ALL SELECT cmu, 'vuln_materiales',         pct_materiales_deficientes             FROM base
  UNION ALL SELECT cmu, 'vuln_barrios_populares',
    CASE WHEN poblacion IS NULL THEN NULL
         ELSE barrios_populares / GREATEST(poblacion, 1) * 10000 END                      FROM base
),
umbrales (indicador, cero, lleno) AS (
  VALUES ('amenaza_agua_historica', 0, 10), ('amenaza_agua_ninos', 0, 5), ('amenaza_terreno_bajo', 0, 100),
         ('quebrada_arcilla', 10, 40), ('expo_personas_bajo', 0, 5), ('expo_proporcion_bajo', 0, 1),
         ('vuln_sin_cloaca', 0, 100), ('vuln_nbi', 0, 25), ('vuln_materiales', 0, 100), ('vuln_barrios_populares', 0, 10)
),
escalados AS (
  SELECT
    i.cmu,
    i.indicador,
    CASE WHEN i.valor IS NULL THEN 0.0
         ELSE LEAST(GREATEST((i.valor - u.cero) / (u.lleno - u.cero), 0), 1) END AS p
  FROM indicadores i
  JOIN umbrales u ON u.indicador = i.indicador
),
ancho AS (                                         -- vuelta a una fila por gobierno local
  SELECT
    cmu,
    MAX(CASE WHEN indicador = 'amenaza_agua_historica' THEN p END) AS p_agua_historica,
    MAX(CASE WHEN indicador = 'amenaza_agua_ninos'     THEN p END) AS p_agua_ninos,
    MAX(CASE WHEN indicador = 'amenaza_terreno_bajo'   THEN p END) AS p_terreno_bajo,
    MAX(CASE WHEN indicador = 'quebrada_arcilla'       THEN p END) AS p_arcilla,
    MAX(CASE WHEN indicador = 'expo_personas_bajo'     THEN p END) AS p_personas_bajo,
    MAX(CASE WHEN indicador = 'expo_proporcion_bajo'   THEN p END) AS p_proporcion_bajo,
    MAX(CASE WHEN indicador = 'vuln_sin_cloaca'        THEN p END) AS p_sin_cloaca,
    MAX(CASE WHEN indicador = 'vuln_nbi'               THEN p END) AS p_nbi,
    MAX(CASE WHEN indicador = 'vuln_materiales'        THEN p END) AS p_materiales,
    MAX(CASE WHEN indicador = 'vuln_barrios_populares' THEN p END) AS p_barrios_populares
  FROM escalados
  GROUP BY cmu
)
SELECT
  b.cmu, b.nam, b.jur, b.poblacion, b.pob_terreno_bajo,
  (a.p_agua_historica + a.p_agua_ninos + a.p_terreno_bajo) / 3              AS propension_agua,
  CASE WHEN b.pendiente_p90_grados IS NULL THEN NULL
       ELSE LEAST(GREATEST((b.pendiente_p90_grados - 5) / 20, 0), 1) END     AS s_quebrada,
  a.p_arcilla                                                                AS arcilla_escalada,
  10 * (a.p_personas_bajo + a.p_proporcion_bajo) / 2                         AS exposicion,
  10 * (a.p_sin_cloaca + a.p_nbi + a.p_materiales + a.p_barrios_populares) / 4 AS vulnerabilidad
FROM base b
JOIN ancho a ON a.cmu = b.cmu;

-- -------------------------------------------------------------------------------------
-- 2. Índice mensual oct-2026 → abr-2027.
--    Amenaza multi-componente (INFORM): H = 10 − (10−H_agua)(10−H_rio)(10−H_quebrada) / 10²
--    El factor de lluvia r se "achica" hacia 1 según cuánto viene acertando el pronóstico
--    (peso_pronostico, calculado por modelos/verificacion.py). Meses sin pronóstico: r = 1.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE TABLE gold.indice_riesgo_mensual AS
WITH meses AS (
            SELECT '2026-10' AS mes
  UNION ALL SELECT '2026-11' UNION ALL SELECT '2026-12' UNION ALL SELECT '2027-01'
  UNION ALL SELECT '2027-02' UNION ALL SELECT '2027-03' UNION ALL SELECT '2027-04'
),
componentes_mes AS (
  SELECT
    c.*,
    m.mes,
    COALESCE(1 + p.peso_pronostico * (f.r - 1), 1.0) AS r_lluvia,
    COALESCE(ar.h_rio, 0)                             AS h_rio_crudo
  FROM gold.componentes_fijos c
  CROSS JOIN meses m
  CROSS JOIN bronze.parametros p
  LEFT JOIN silver.factor_lluvia f ON f.cmu = c.cmu AND f.mes = m.mes
  LEFT JOIN silver.amenaza_rios ar ON ar.cmu = c.cmu AND ar.mes = m.mes
),
amenazas AS (
  SELECT
    *,
    LEAST(GREATEST(10 * propension_agua * LEAST(GREATEST(r_lluvia / 2, 0), 1), 0), 10) AS h_agua,
    LEAST(GREATEST(h_rio_crudo, 0), 10)                                               AS h_rio,
    LEAST(GREATEST(10 * s_quebrada * LEAST(GREATEST(r_lluvia / 2, 0), 1)
                      * (0.5 + 0.5 * arcilla_escalada), 0), 10)                        AS h_quebrada
  FROM componentes_mes
),
riesgo AS (
  SELECT
    *,
    10 - (10 - h_agua) * (10 - h_rio) * (10 - h_quebrada) / 100 AS amenaza
  FROM amenazas
)
SELECT
  cmu, nam, jur, mes, poblacion, pob_terreno_bajo,
  r_lluvia, h_agua, h_rio, h_quebrada, amenaza, exposicion, vulnerabilidad,
  CBRT(amenaza * exposicion * vulnerabilidad)                                  AS riesgo,
  COALESCE(pob_terreno_bajo, 0) * CBRT(amenaza * exposicion * vulnerabilidad) / 10 AS personas_en_riesgo,
  RANK() OVER (PARTITION BY mes ORDER BY CBRT(amenaza * exposicion * vulnerabilidad) DESC)  AS ranking_relativo,
  RANK() OVER (PARTITION BY mes ORDER BY COALESCE(pob_terreno_bajo, 0)
                                         * CBRT(amenaza * exposicion * vulnerabilidad) DESC) AS ranking_personas
FROM riesgo;

-- -------------------------------------------------------------------------------------
-- 3. Resumen nacional por mes (lo que muestran los indicadores de la web).
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE TABLE gold.resumen_mensual AS
SELECT
  mes,
  SUM(personas_en_riesgo)                           AS personas_en_riesgo,
  AVG(riesgo)                                       AS riesgo_medio,
  SUM(CASE WHEN riesgo >= 7 THEN 1 ELSE 0 END)      AS municipios_riesgo_alto,
  SUM(CASE WHEN h_rio > 0 THEN 1 ELSE 0 END)        AS municipios_con_amenaza_de_rio
FROM gold.indice_riesgo_mensual
GROUP BY mes;

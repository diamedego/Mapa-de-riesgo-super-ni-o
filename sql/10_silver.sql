-- =====================================================================================
-- SILVER: datos limpios, tipados y con claves comunes (códigos INDEC).
-- Corre igual en DuckDB (local, diario) y en Databricks SQL.
-- Entrada: tablas bronze.* (ver sql/exportar_bronze.py). Salida: silver.*
-- =====================================================================================
CREATE SCHEMA IF NOT EXISTS silver;

-- -------------------------------------------------------------------------------------
-- 1. Radios censales: población, saneamiento, pobreza, vivienda y terreno.
--    El Censo viene en formato largo (radio × variable × categoría × conteo):
--    se pasa a una fila por radio con porcentajes de hogares.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE TABLE silver.radios AS
WITH censo AS (
  SELECT
    CAST(id_geo AS STRING)          AS cod_indec,
    codigo_variable,
    CAST(valor_categoria AS STRING) AS categoria,
    CAST(conteo AS DOUBLE)          AS conteo
  FROM bronze.censo_radio
),
por_radio AS (
  SELECT
    cod_indec,
    SUM(CASE WHEN codigo_variable = 'PERSONA_EDADGRU' THEN conteo END) AS poblacion,
    -- % de hogares con desagüe del inodoro a red pública (cloaca)
    100 * SUM(CASE WHEN codigo_variable = 'HOGAR_H18' AND categoria = '1' THEN conteo ELSE 0 END)
        / NULLIF(SUM(CASE WHEN codigo_variable = 'HOGAR_H18' THEN conteo END), 0)            AS pct_cloaca,
    -- % de hogares con necesidades básicas insatisfechas
    100 * SUM(CASE WHEN codigo_variable = 'HOGAR_NBI_TOT' AND categoria = '1' THEN conteo ELSE 0 END)
        / NULLIF(SUM(CASE WHEN codigo_variable = 'HOGAR_NBI_TOT' THEN conteo END), 0)        AS pct_nbi,
    -- % de hogares con materiales de vivienda deficientes (calidad III y IV)
    100 * SUM(CASE WHEN codigo_variable = 'HOGAR_INMAT' AND categoria IN ('3', '4') THEN conteo ELSE 0 END)
        / NULLIF(SUM(CASE WHEN codigo_variable = 'HOGAR_INMAT' THEN conteo END), 0)          AS pct_materiales_deficientes
  FROM censo
  GROUP BY cod_indec
)
SELECT
  m.cod_indec,
  m.cmu,
  COALESCE(c.poblacion, 0)   AS poblacion,
  c.pct_cloaca,
  c.pct_nbi,
  c.pct_materiales_deficientes,
  t.hand_m,
  t.pct_area_hand_2m,
  t.pendiente_grados,
  t.pct_area_agua_alguna_vez
FROM bronze.map_radio_gobierno_local m
LEFT JOIN por_radio c                ON c.cod_indec = m.cod_indec
LEFT JOIN bronze.ee_terreno_radios t ON t.cod_indec = m.cod_indec;

-- -------------------------------------------------------------------------------------
-- 2. Gobiernos locales: agregados de sus radios (ponderados por población) + satélite + RENABAP.
--    "Terreno bajo" = radio con más de la mitad de su superficie a menos de 2 m sobre el cauce.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE TABLE silver.gobiernos_locales AS
WITH agregado AS (
  SELECT
    cmu,
    SUM(poblacion)                                                               AS poblacion,
    SUM(CASE WHEN pct_area_hand_2m > 50 THEN poblacion ELSE 0 END)               AS pob_terreno_bajo,
    SUM(CASE WHEN pct_area_hand_2m > 50 AND pct_cloaca < 50 THEN poblacion ELSE 0 END) AS pob_bajo_sin_cloaca,
    SUM(COALESCE(pct_cloaca, 0) * poblacion)                 / NULLIF(SUM(poblacion), 0) AS pct_cloaca,
    SUM(COALESCE(pct_nbi, 0) * poblacion)                    / NULLIF(SUM(poblacion), 0) AS pct_nbi,
    SUM(COALESCE(pct_materiales_deficientes, 0) * poblacion) / NULLIF(SUM(poblacion), 0) AS pct_materiales_deficientes
  FROM silver.radios
  GROUP BY cmu
)
SELECT
  g.cmu, g.nam, g.jur, g.cpr, g.area_km2,
  r.barrios_populares,
  a.poblacion, a.pob_terreno_bajo, a.pob_bajo_sin_cloaca,
  a.pct_cloaca, a.pct_nbi, a.pct_materiales_deficientes,
  t.hand_m, t.pct_area_hand_2m, t.pendiente_grados, t.pct_area_agua_alguna_vez, t.agua_ocurrencia_pct,
  o.agua_nino_2015_16_pct, o.agua_nino_2023_24_pct, o.agua_referencia_2022_23_pct,
  s.arcilla_pct, s.pendiente_p90_grados, s.deslizamientos_1970_2019
FROM bronze.gobiernos_locales g
LEFT JOIN agregado a                       ON a.cmu = g.cmu
LEFT JOIN bronze.ee_terreno_gl t           ON t.cmu = g.cmu
LEFT JOIN bronze.ee_agua_observada_gl o    ON o.cmu = g.cmu
LEFT JOIN bronze.ee_suelo_gl s             ON s.cmu = g.cmu
LEFT JOIN bronze.map_renabap_gobierno_local r ON r.cmu = g.cmu;

-- -------------------------------------------------------------------------------------
-- 3. Factor de lluvia por mes (ECMWF SEAS5, última corrida):
--    r = lluvia pronosticada / lluvia normal, acotado entre 0,2 y 3.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE TABLE silver.factor_lluvia AS
WITH ultima AS (
  SELECT MAX(fecha_corrida) AS corrida FROM bronze.seas5_gobiernos_locales
),
mensual AS (
  SELECT
    s.cmu,
    SUBSTR(s.mes, 1, 7)                                                   AS mes,
    AVG(CASE WHEN s.variable = 'precipitation_mean' THEN s.valor END)    AS lluvia_pronosticada_mm,
    AVG(CASE WHEN s.variable = 'precipitation_anomaly' THEN s.valor END) AS anomalia_mm,
    MAX(s.fecha_corrida)                                                  AS corrida
  FROM bronze.seas5_gobiernos_locales s
  JOIN ultima u ON s.fecha_corrida = u.corrida
  GROUP BY s.cmu, SUBSTR(s.mes, 1, 7)
)
SELECT
  cmu, mes, lluvia_pronosticada_mm, anomalia_mm, corrida,
  lluvia_pronosticada_mm - anomalia_mm AS lluvia_normal_mm,
  CASE
    WHEN lluvia_pronosticada_mm IS NULL OR anomalia_mm IS NULL THEN NULL
    WHEN lluvia_pronosticada_mm - anomalia_mm = 0 THEN
      CASE WHEN lluvia_pronosticada_mm > 0 THEN 3.0 WHEN lluvia_pronosticada_mm < 0 THEN 0.2 END
    ELSE LEAST(GREATEST(lluvia_pronosticada_mm / (lluvia_pronosticada_mm - anomalia_mm), 0.2), 3.0)
  END AS r
FROM mensual;

-- -------------------------------------------------------------------------------------
-- 4. Amenaza de crecida de ríos por gobierno local y mes:
--    estación del INA confiable más cercana (≤ 30 km), 10 × max(P(evacuación), ½·P(alerta)), con el peso de la distancia:
--    1 hasta 15 km y en línea recta hasta 0 a los 30 km (como modelos/indice_riesgo.py: sin corte brusco).
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE TABLE silver.amenaza_rios AS
SELECT
  m.cmu,
  r.mes,
  r.series_id,
  10 * GREATEST(COALESCE(r.p_evacuacion, 0), 0.5 * COALESCE(r.p_alerta, 0))
     * LEAST(GREATEST(1 - (m.dist_m - 15000) / 15000, 0), 1)                AS h_rio
FROM bronze.map_gobierno_local_estacion m
JOIN bronze.rios_pronostico_mensual r
  ON r.series_id = m.series_id
 AND r.r_validacion >= 0.7;

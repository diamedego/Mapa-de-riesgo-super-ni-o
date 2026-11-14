"""Índice de riesgo de inundación por gobierno local y mes (oct-2026 → abr-2027), estructura INFORM.

Riesgo = (Amenaza × Exposición × Vulnerabilidad)^(1/3), cada componente en escala 0-10.

ESCALA FÍSICA, NO RELATIVA: cada indicador se lleva a 0-1 con umbrales fijos en sus propias unidades (% de superficie,
% de hogares, personas), u(x) = clip((x − cero) / (lleno − cero), 0, 1) (ver UMBRALES). Un municipio queda «alto» por lo
que tiene, no por estar peor que los demás: si todos mejoran, todos bajan.

AMENAZA (por mes; combinación "multi-amenaza" de INFORM: H = 10 − Π(10 − Hi) / 10^(n−1)):
- Agua en superficie / anegamiento: propensión P = promedio de u(superficie que estuvo con agua alguna vez [JRC
  1984-2021]), u(agua observada en los Niños 2015-16 y 2023-24 [Dynamic World]) y u(% de superficie a < 2 m del
  cauce [HAND]) × factor de lluvia del mes f = clip(r/2, 0, 1), donde
  r = lluvia pronosticada / normal (SEAS5). Con lluvia normal (r = 1) la amenaza es la mitad de la
  propensión; con el doble de lluvia, la propensión completa. (Un modelo de ML no superó a la
  propensión histórica en la validación 2015-16 → 2023-24; ver bitácora.)
- Crecida de ríos grandes: 10 × max(P(evacuación), 0,5 × P(alerta)) de la estación INA confiable
  (r de validación ≥ 0,7) más cercana, si está a ≤ 30 km. Sin estación cercana: 0.
- Crecidas repentinas en quebradas: 10 × s × f × (0,5 + 0,5 × u(arcilla)), con s = clip((pendiente p90 − 5°)/20°, 0, 1).
  Meses sin pronóstico SEAS5 (mar-abr): r = 1.
EXPOSICIÓN: 10 × promedio de u(log10 de la población en terreno bajo) y u(proporción de la población en terreno
bajo). Terreno bajo = radio censal con > 50 % de su superficie a < 2 m del cauce.
VULNERABILIDAD: 10 × promedio de u(% hogares sin cloaca), u(% NBI), u(% materiales deficientes) y
u(barrios populares cada 10 000 habitantes).

Dos rankings: personas en riesgo (población en terreno bajo × riesgo/10) y riesgo relativo.
Sensibilidad: 1 000 simulaciones con pesos aleatorios (Dirichlet) para los indicadores de E y V y para
los exponentes de H, E y V; se informa en qué % de simulaciones cada municipio queda en el 10 % superior.

Entrada: data/referencia/rasgos_gobiernos_locales.parquet (fijos) + pronósticos (SEAS5, ríos).
Salida: data/gold/indice_riesgo_mensual.parquet y una foto con fecha en data/archivo/indice/.
"""
import datetime as dt
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
REF = RAIZ / "data" / "referencia"
GOLD = RAIZ / "data" / "gold"
MESES = ["2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04"]
N_SIM = 1000
SEMILLA = 42


# Umbrales físicos fijos (cero → 0, lleno → 1, lineal entre ambos). Los porcentajes de hogares y de superficie usan su
# rango natural salvo donde un valor menor ya es extremo en la Argentina:
UMBRALES = {
    "agua_alguna_vez_pct": (0, 10),     # 10 % del territorio con agua alguna vez en 1984-2021 (fuera de cauces chicos) ya es una llanura inundable
    "agua_ninos_pct": (0, 5),           # 5 % del territorio con agua nueva en una temporada Niño: inundación regional (Litoral 2015-16: 10-47 %)
    "hand_2m_pct": (0, 100),            # todo el territorio a menos de 2 m sobre el cauce
    "arcilla_pct": (10, 40),            # suelo franco-arenoso (10 %) a arcilloso (40 %)
    "log10_pob_bajo": (0, 5),           # 100 000 personas viviendo en terreno bajo
    "prop_bajo": (0, 1),                # toda la población en terreno bajo
    "sin_cloaca_pct": (0, 100),
    "nbi_pct": (0, 25),                 # 25 % de hogares con NBI (el país: 6,5 %; los peores municipios: 30-50 %)
    "materiales_pct": (0, 100),
    "barrios_cada_10k": (0, 10),        # 10 barrios populares cada 10 000 habitantes
}


def u(s: pd.Series, clave: str) -> pd.Series:
    cero, lleno = UMBRALES[clave]
    return ((s - cero) / (lleno - cero)).clip(0, 1).fillna(0)


def ultimo(patrones: list[Path]) -> Path:
    candidatos = [p for patron in patrones for p in patron.parent.glob(patron.name)]
    return max(candidatos, key=lambda p: p.stem[-10:])


def factor_lluvia() -> pd.DataFrame:
    f = ultimo([RAIZ / "data" / "raw" / "open_meteo" / "estacional_2*.parquet",
                RAIZ / "data" / "archivo" / "open_meteo" / "estacional_2*.parquet"])
    e = pd.read_parquet(f)
    e["mes"] = e["mes"].str[:7]
    p = e[e["variable"].isin(["precipitation_mean", "precipitation_anomaly"])] \
        .pivot_table(index=["cmu", "mes"], columns="variable", values="valor").reset_index()
    p["r"] = (p["precipitation_mean"] / (p["precipitation_mean"] - p["precipitation_anomaly"])).clip(0.2, 3)
    return p[["cmu", "mes", "r"]], f.stem[-10:]


def amenaza_rios(rasgos: pd.DataFrame) -> pd.DataFrame:
    """Probabilidad mensual de la estación confiable más cercana (≤ 30 km) para cada gobierno local."""
    f = GOLD / "rios_pronostico_mensual.parquet"
    if not f.exists():
        return pd.DataFrame(columns=["cmu", "mes", "H_rio"])
    rios = pd.read_parquet(f)
    rios = rios[rios["r_validacion"] >= 0.7]
    est = gpd.read_parquet(REF / "estaciones_ina.parquet")[["series_id", "geometry"]]
    est = est[est["series_id"].isin(rios["series_id"])].to_crs(5345)
    pts = gpd.GeoDataFrame(rasgos[["cmu"]], geometry=gpd.points_from_xy(rasgos["lon"], rasgos["lat"]), crs=4326)
    cerca = gpd.sjoin_nearest(pts.to_crs(5345), est[["series_id", "geometry"]], max_distance=30_000,
                              distance_col="dist_m").drop_duplicates("cmu")
    # Sin corte brusco: peso 1 hasta 15 km, baja en línea recta hasta 0 a 30 km (la estación pierde relevancia con la distancia)
    cerca["peso_dist"] = (1 - (cerca["dist_m"] - 15_000) / 15_000).clip(0, 1)
    rios["h"] = 10 * np.maximum(rios["p_evacuacion"].fillna(0), 0.5 * rios["p_alerta"].fillna(0))
    out = cerca[["cmu", "series_id", "peso_dist"]].merge(rios[["series_id", "mes", "h"]], on="series_id")
    out["H_rio"] = out["h"] * out["peso_dist"]
    return out[["cmu", "mes", "H_rio"]]


def main() -> None:
    g = pd.read_parquet(REF / "rasgos_gobiernos_locales.parquet")
    pts = pd.read_csv(REF / "puntos_gobiernos_locales.csv", dtype={"cmu": str})
    g = g.merge(pts, on="cmu")

    # Propensión al agua y rasgos de quebradas (fijos)
    agua_ninos = g[["agua_nino_2015_16_pct", "agua_nino_2023_24_pct"]].mean(axis=1)
    g["P_agua"] = (u(g["pct_area_agua_alguna_vez"], "agua_alguna_vez_pct") + u(agua_ninos, "agua_ninos_pct")
                   + u(g["pct_area_hand_2m"], "hand_2m_pct")) / 3
    g["s_quebrada"] = ((g["pendiente_p90_grados"] - 5) / 20).clip(0, 1)
    g["arcilla_rel"] = u(g["arcilla_pct"], "arcilla_pct")

    # Exposición y vulnerabilidad (fijas)
    prop_bajo = (g["pob_terreno_bajo"] / g["poblacion"]).fillna(0)
    ind_E = pd.DataFrame({"pob_bajo": u(np.log10(1 + g["pob_terreno_bajo"].fillna(0)), "log10_pob_bajo"),
                          "prop_bajo": u(prop_bajo, "prop_bajo")})
    ind_V = pd.DataFrame({"sin_cloaca": u(100 - g["pct_cloaca"], "sin_cloaca_pct"), "nbi": u(g["pct_nbi"], "nbi_pct"),
                          "materiales": u(g["pct_materiales_deficientes"], "materiales_pct"),
                          "barrios_pop": u(g["barrios_populares"] / g["poblacion"].clip(lower=1) * 1e4, "barrios_cada_10k")})
    g["E"] = 10 * ind_E.mean(axis=1)
    g["V"] = 10 * ind_V.mean(axis=1)

    fl, corrida_seas5 = factor_lluvia()
    # Retroalimentación: el pronóstico pesa según cuánto viene acertando (modelos/verificacion.py)
    ver = GOLD / "verificacion.json"
    peso = json.loads(ver.read_text())["lluvia_16_dias"].get("peso_pronostico", 1.0) if ver.exists() else 1.0
    fl["r"] = 1 + peso * (fl["r"] - 1)
    rios = amenaza_rios(g)
    filas = []
    for mes in MESES:
        d = g[["cmu", "nam", "jur", "poblacion", "pob_terreno_bajo", "P_agua", "s_quebrada", "arcilla_rel", "E", "V"]].copy()
        d["mes"] = mes
        d = d.merge(fl[fl["mes"] == mes], on=["cmu", "mes"], how="left")
        d["r"] = d["r"].fillna(1.0)
        f = (d["r"] / 2).clip(0, 1)
        d["H_agua"] = 10 * d["P_agua"] * f
        d["H_quebrada"] = 10 * d["s_quebrada"] * f * (0.5 + 0.5 * d["arcilla_rel"])
        d = d.merge(rios[rios["mes"] == mes][["cmu", "H_rio"]], on="cmu", how="left")
        d["rio_dato"] = d["H_rio"].notna()   # sin estación confiable a ≤ 30 km: sin información (no es "sin amenaza")
        d["H_rio"] = d["H_rio"].fillna(0)
        comps = d[["H_agua", "H_rio", "H_quebrada"]].clip(0, 10)
        d["H"] = 10 - np.prod(10 - comps.values, axis=1) / 10 ** (comps.shape[1] - 1)
        d["riesgo"] = np.cbrt(d["H"] * d["E"] * d["V"])
        d["personas_en_riesgo"] = d["pob_terreno_bajo"].fillna(0) * d["riesgo"] / 10
        filas.append(d)
    out = pd.concat(filas, ignore_index=True)

    # Sensibilidad (sobre el mes de mayor riesgo nacional medio)
    rng = np.random.default_rng(SEMILLA)
    pico = out.groupby("mes")["riesgo"].mean().idxmax()
    dp = out[out["mes"] == pico].set_index("cmu")
    en_top = pd.Series(0, index=dp.index, dtype=float)
    for _ in range(N_SIM):
        wE, wV = rng.dirichlet(np.ones(ind_E.shape[1])), rng.dirichlet(np.ones(ind_V.shape[1]))
        E = 10 * (ind_E.values @ wE)
        V = 10 * (ind_V.values @ wV)
        a = rng.dirichlet([3, 3, 3])  # exponentes alrededor de 1/3
        r = pd.Series(dp["H"].values ** a[0] * E ** a[1] * V ** a[2], index=g["cmu"].values).reindex(dp.index)
        en_top += (r >= r.quantile(0.9)).astype(float)
    estabilidad = (100 * en_top / N_SIM).rename("pct_simulaciones_top10")
    out = out.merge(estabilidad.reset_index(), on="cmu", how="left")
    out["ranking_personas"] = out.groupby("mes")["personas_en_riesgo"].rank(ascending=False, method="min")
    out["ranking_relativo"] = out.groupby("mes")["riesgo"].rank(ascending=False, method="min")
    out["corrida_seas5"] = corrida_seas5
    out["peso_pronostico"] = peso
    out["calculado"] = dt.date.today().isoformat()

    GOLD.mkdir(parents=True, exist_ok=True)
    out.round(4).to_parquet(GOLD / "indice_riesgo_mensual.parquet", index=False)
    foto = RAIZ / "data" / "archivo" / "indice" / f"{dt.date.today().isoformat()}.parquet"
    foto.parent.mkdir(parents=True, exist_ok=True)
    out[["cmu", "mes", "H", "H_agua", "H_rio", "H_quebrada", "rio_dato", "E", "V", "riesgo", "personas_en_riesgo"]] \
        .round(3).to_parquet(foto, index=False)

    print(f"Mes pico: {pico}")
    print(out.groupby("mes")[["H_agua", "H_rio", "H_quebrada", "H", "riesgo", "personas_en_riesgo"]]
          .agg({"H_agua": "mean", "H_rio": "mean", "H_quebrada": "mean", "H": "mean", "riesgo": "mean",
                "personas_en_riesgo": "sum"}).round(2).to_string())
    top = out[out["mes"] == pico].sort_values("personas_en_riesgo", ascending=False).head(10)
    print("\nTop 10 por personas en riesgo:\n", top[["nam", "jur", "riesgo", "personas_en_riesgo",
                                                    "pct_simulaciones_top10"]].round(2).to_string(index=False))
    top = out[out["mes"] == pico].sort_values("riesgo", ascending=False).head(10)
    print("\nTop 10 por riesgo relativo:\n", top[["nam", "jur", "H", "E", "V", "riesgo",
                                                 "pct_simulaciones_top10"]].round(2).to_string(index=False))


if __name__ == "__main__":
    main()

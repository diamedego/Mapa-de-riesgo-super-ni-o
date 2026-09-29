"""Índice de riesgo de inundación por gobierno local y mes (oct-2026 → abr-2027), estructura INFORM.

Riesgo = (Amenaza × Exposición × Vulnerabilidad)^(1/3), cada componente en escala 0-10.

AMENAZA (por mes; combinación "multi-amenaza" de INFORM: H = 10 − Π(10 − Hi) / 10^(n−1)):
- Agua en superficie / anegamiento: propensión histórica P (promedio de rangos de: superficie que estuvo
  con agua alguna vez [JRC 1984-2021], agua observada en los Niños 2015-16 y 2023-24 [Dynamic World],
  % de superficie a < 2 m del cauce [HAND]) × factor de lluvia del mes f = clip(r/2, 0, 1), donde
  r = lluvia pronosticada / normal (SEAS5). Con lluvia normal (r = 1) la amenaza es la mitad de la
  propensión; con el doble de lluvia, la propensión completa. (Un modelo de ML no superó a la
  propensión histórica en la validación 2015-16 → 2023-24; ver bitácora.)
- Crecida de ríos grandes: 10 × max(P(evacuación), 0,5 × P(alerta)) de la estación INA confiable
  (r de validación ≥ 0,7) más cercana, si está a ≤ 30 km. Sin estación cercana: 0.
- Crecidas repentinas en quebradas: 10 × s × f × (0,5 + 0,5 × arcilla), con s = clip((pendiente p90 − 5°)/20°, 0, 1).
  Meses sin pronóstico SEAS5 (mar-abr): r = 1.
EXPOSICIÓN: 10 × promedio de rangos de (población en terreno bajo) y (proporción de la población en
terreno bajo). Terreno bajo = radio censal con > 50 % de su superficie a < 2 m del cauce.
VULNERABILIDAD: 10 × promedio de rangos de: % hogares sin cloaca, % NBI, % materiales deficientes,
barrios populares cada 10 000 habitantes.

Dos rankings: personas en riesgo (población en terreno bajo × riesgo/10) y riesgo relativo.
Sensibilidad: 1 000 simulaciones con pesos aleatorios (Dirichlet) para los indicadores de E y V y para
los exponentes de H, E y V; se informa en qué % de simulaciones cada municipio queda en el 10 % superior.

Entrada: data/referencia/rasgos_gobiernos_locales.parquet (fijos) + pronósticos (SEAS5, ríos).
Salida: data/gold/indice_riesgo_mensual.parquet y una foto con fecha en data/archivo/indice/.
"""
import datetime as dt
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


def rango(s: pd.Series) -> pd.Series:
    return s.rank(pct=True).fillna(0)


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
    ser = pd.read_parquet(REF / "estaciones_ina.parquet") if (REF / "estaciones_ina.parquet").exists() else \
        gpd.read_parquet(RAIZ / "data" / "raw" / "ina" / "series.parquet")[["series_id", "geometry"]]
    est = gpd.GeoDataFrame(ser, geometry="geometry", crs=4326)
    est = est[est["series_id"].isin(rios["series_id"])].to_crs(5345)
    pts = gpd.GeoDataFrame(rasgos[["cmu"]], geometry=gpd.points_from_xy(rasgos["lon"], rasgos["lat"]), crs=4326)
    cerca = gpd.sjoin_nearest(pts.to_crs(5345), est[["series_id", "geometry"]], max_distance=30_000,
                              distance_col="dist_m").drop_duplicates("cmu")
    rios["h"] = 10 * np.maximum(rios["p_evacuacion"].fillna(0), 0.5 * rios["p_alerta"].fillna(0))
    return cerca[["cmu", "series_id"]].merge(rios[["series_id", "mes", "h"]], on="series_id") \
        .rename(columns={"h": "H_rio"})[["cmu", "mes", "H_rio"]]


def main() -> None:
    g = pd.read_parquet(REF / "rasgos_gobiernos_locales.parquet")
    pts = pd.read_csv(REF / "puntos_gobiernos_locales.csv", dtype={"cmu": str})
    g = g.merge(pts, on="cmu")

    # Propensión al agua y rasgos de quebradas (fijos)
    agua_ninos = g[["agua_nino_2015_16_pct", "agua_nino_2023_24_pct"]].mean(axis=1)
    g["P_agua"] = (rango(g["pct_area_agua_alguna_vez"]) + rango(agua_ninos) + rango(g["pct_area_hand_2m"])) / 3
    g["s_quebrada"] = ((g["pendiente_p90_grados"] - 5) / 20).clip(0, 1)
    g["arcilla_rel"] = rango(g["arcilla_pct"])

    # Exposición y vulnerabilidad (fijas)
    prop_bajo = (g["pob_terreno_bajo"] / g["poblacion"]).fillna(0)
    ind_E = pd.DataFrame({"pob_bajo": rango(np.log1p(g["pob_terreno_bajo"].fillna(0))), "prop_bajo": rango(prop_bajo)})
    ind_V = pd.DataFrame({"sin_cloaca": rango(100 - g["pct_cloaca"]), "nbi": rango(g["pct_nbi"]),
                          "materiales": rango(g["pct_materiales_deficientes"]),
                          "barrios_pop": rango(g["barrios_populares"] / g["poblacion"].clip(lower=1) * 1e4)})
    g["E"] = 10 * ind_E.mean(axis=1)
    g["V"] = 10 * ind_V.mean(axis=1)

    fl, corrida_seas5 = factor_lluvia()
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
        d = d.merge(rios[rios["mes"] == mes][["cmu", "H_rio"]], on="cmu", how="left").fillna({"H_rio": 0})
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
    out["calculado"] = dt.date.today().isoformat()

    GOLD.mkdir(parents=True, exist_ok=True)
    out.round(4).to_parquet(GOLD / "indice_riesgo_mensual.parquet", index=False)
    foto = RAIZ / "data" / "archivo" / "indice" / f"{dt.date.today().isoformat()}.parquet"
    foto.parent.mkdir(parents=True, exist_ok=True)
    out[["cmu", "mes", "H", "H_agua", "H_rio", "H_quebrada", "E", "V", "riesgo", "personas_en_riesgo"]] \
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

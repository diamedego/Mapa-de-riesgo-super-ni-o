"""Modelo de amenaza: ¿cuánta superficie de cada municipio se cubre de agua en una temporada Niño?

Diseño (validación fuera de muestra con otro evento):
- Entrenamiento: El Niño 2015-16.  Validación: El Niño 2023-24 (el modelo nunca lo vio).
- Pronóstico: temporada 2026-27, con la anomalía de lluvia nov-feb de ECMWF SEAS5.
- Objetivo (y): % de la superficie del gobierno local con agua en la temporada Niño y no en la
  sequía 2022-23 (Dynamic World, sin agua permanente). Se modela log(1 + y).
- Variables (X): lluvia normal y anomalía nov-feb; terreno (HAND, % a < 2 m y < 5 m del cauce,
  pendiente, elevación); agua histórica (JRC); arcilla; uso del suelo del año anterior (MapBiomas:
  urbano, humedal, cultivos, agua).

Modelos comparados: (a) línea base "agua histórica" (JRC); (b) regresión lineal regularizada;
(c) gradient boosting. Métricas: correlación de Spearman (¿ordena bien a los municipios?),
MAE, y aciertos en el 10 % más afectado (¿detecta a los peores?).

Salida: data/gold/amenaza_agua_gobiernos_locales.parquet, data/gold/amenaza_agua_metricas.json
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import RidgeCV
from sklearn.metrics import mean_absolute_error
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

RAIZ = Path(__file__).resolve().parents[1]
EE = RAIZ / "data" / "raw" / "earth_engine"
GOLD = RAIZ / "data" / "gold"
SEMILLA = 42

TERRENO = ["hand_m", "pct_area_hand_2m", "pct_area_hand_5m", "pendiente_grados", "elevacion_m",
           "agua_ocurrencia_pct", "pct_area_agua_alguna_vez", "arcilla_pct", "pendiente_p90_grados"]
USO = ["urbano", "humedal", "cultivos", "agua"]


def tabla_base() -> pd.DataFrame:
    t = pd.read_parquet(EE / "terreno_agua_gobiernos_locales.parquet")
    s = pd.read_parquet(EE / "suelo_deslizamientos_gobiernos_locales.parquet")
    return t.merge(s, on="cmu")


def uso_suelo(anio: int) -> pd.DataFrame:
    u = pd.read_parquet(EE / "uso_suelo_gobiernos_locales.parquet")
    return u[u["anio"] == anio].pivot(index="cmu", columns="clase", values="pct_area")[USO] \
        .add_prefix("uso_").reset_index()


def temporada(base, lluvia, obs, anio_uso, anomalia_col, objetivo_col=None) -> pd.DataFrame:
    df = base.merge(uso_suelo(anio_uso), on="cmu").merge(
        lluvia[["cmu", "lluvia_normal_mm", anomalia_col]].rename(columns={anomalia_col: "anomalia_mm"}), on="cmu")
    if objetivo_col:
        df = df.merge(obs[["cmu", objetivo_col]].rename(columns={objetivo_col: "y"}), on="cmu")
    return df


def variables_rio(gl_puntos: "gpd.GeoDataFrame", caudal_por_estacion: pd.Series) -> pd.DataFrame:
    """Para cada gobierno local: distancia a la estación de río grande más cercana y caudal relativo
    (temporada / sequía 2022-23) de ese río, atenuado con la distancia (e^(-d/20 km); 0 si d > 60 km)."""
    import geopandas as gpd
    est = gpd.read_parquet(RAIZ / "data" / "raw" / "ina" / "series.parquet") \
        .drop_duplicates("estacion_id")[["estacion_id", "geometry"]]
    est = est[est["estacion_id"].isin(caudal_por_estacion.index)].to_crs(5345)
    cerca = gpd.sjoin_nearest(gl_puntos.to_crs(5345), est, distance_col="dist_m")
    cerca = cerca.drop_duplicates("cmu")
    rel = cerca["estacion_id"].map(caudal_por_estacion).fillna(1.0)
    d_km = cerca["dist_m"] / 1000
    peso = np.where(d_km <= 60, np.exp(-d_km / 20), 0.0)
    return pd.DataFrame({"cmu": cerca["cmu"].values, "dist_rio_grande_km": d_km.values,
                         "caudal_relativo_ponderado": (np.log(rel.clip(lower=0.01)) * peso).values})


def metricas(y_real, y_pred) -> dict:
    top = y_real >= np.quantile(y_real, 0.9)
    pred_top = y_pred >= np.quantile(y_pred, 0.9)
    return {
        "spearman": round(float(spearmanr(y_real, y_pred).statistic), 3),
        "mae_pct_superficie": round(float(mean_absolute_error(y_real, y_pred)), 3),
        "aciertos_top10": round(float((top & pred_top).sum() / top.sum()), 3),
    }


def main() -> None:
    base = tabla_base()
    lluvia = pd.read_parquet(EE / "lluvia_temporadas_gobiernos_locales.parquet")
    obs = pd.read_parquet(EE / "inundacion_observada_gobiernos_locales.parquet")

    import geopandas as gpd
    gl = gpd.read_parquet(RAIZ / "data" / "raw" / "limites" / "gobiernos_locales.parquet")[["cmu", "geometry"]]
    gl["geometry"] = gl.to_crs(5345).representative_point().to_crs(4326)
    q = pd.read_parquet(RAIZ / "data" / "raw" / "glofas" / "temporadas.parquet") \
        .pivot(index="estacion_id", columns="temporada", values="caudal_medio_m3s")
    ref = q["2022_23"].clip(lower=1)
    rio = {t: variables_rio(gl, (q[t] / ref)) for t in ["2015_16", "2023_24"]}

    train = temporada(base, lluvia, obs, 2015, "anomalia_2015_16_mm", "agua_extra_nino_2015_16_pct") \
        .merge(rio["2015_16"], on="cmu")
    test = temporada(base, lluvia, obs, 2023, "anomalia_2023_24_mm", "agua_extra_nino_2023_24_pct") \
        .merge(rio["2023_24"], on="cmu")
    X_cols = TERRENO + [f"uso_{c}" for c in USO] + ["lluvia_normal_mm", "anomalia_mm",
                                                     "dist_rio_grande_km", "caudal_relativo_ponderado"]

    modelos = {
        "lineal_ridge": make_pipeline(StandardScaler(), RidgeCV(alphas=np.logspace(-2, 3, 20))),
        "gradient_boosting": HistGradientBoostingRegressor(max_iter=400, learning_rate=0.05, max_depth=4,
                                                           min_samples_leaf=30, l2_regularization=1.0,
                                                           random_state=SEMILLA),
    }
    resultados = {"linea_base_agua_historica_jrc": metricas(test["y"], test["pct_area_agua_alguna_vez"])}
    for nombre, m in modelos.items():
        m.fit(train[X_cols], np.log1p(train["y"]))
        pred = np.expm1(m.predict(test[X_cols])).clip(0)
        resultados[nombre] = metricas(test["y"], pred)

    # Combinación: promedio de rankings entre el mejor modelo y la línea base (agua histórica)
    gb_pred = np.expm1(modelos["gradient_boosting"].predict(test[X_cols])).clip(0)
    combo = (pd.Series(gb_pred).rank(pct=True) + test["pct_area_agua_alguna_vez"].rank(pct=True).values) / 2
    resultados["combinado_gb_mas_linea_base"] = metricas(test["y"].values, combo.values)
    resultados["combinado_gb_mas_linea_base"]["mae_pct_superficie"] = None  # es un ranking, no un %

    print("Validación fuera de muestra (entrenado en 2015-16, evaluado en 2023-24):")
    print(pd.DataFrame(resultados).T.to_string())

    # Modelo final: el mejor por Spearman, reentrenado con ambos Niños para el pronóstico
    mejor = max(modelos, key=lambda k: resultados[k]["spearman"])
    final = modelos[mejor]
    ambos = pd.concat([train, test], ignore_index=True)
    final.fit(ambos[X_cols], np.log1p(ambos["y"]))

    # Pronóstico 2026-27: anomalía SEAS5 nov-feb; uso del suelo 2024 (último disponible)
    est = pd.read_parquet(sorted((RAIZ / "data" / "raw" / "open_meteo").glob("estacional_*.parquet"))[-1])
    meses = ["2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01"]
    anom = est[(est["variable"] == "precipitation_anomaly") & est["mes"].isin(meses)] \
        .groupby("cmu")["valor"].sum().rename("anomalia_2026_27_mm").reset_index()
    lluvia_fc = lluvia[["cmu", "lluvia_normal_mm"]].merge(anom, on="cmu")
    pron = pd.concat(pd.read_parquet(p) for p in sorted((RAIZ / "data" / "raw" / "glofas").glob("*/estacion_*.parquet")))
    pron = pron[pron["fecha"].between("2026-11-01", "2027-02-28")].groupby("estacion_id")["river_discharge_mean"].mean()
    fc = temporada(base, lluvia_fc, None, 2024, "anomalia_2026_27_mm") \
        .merge(variables_rio(gl, pron / ref.reindex(pron.index)), on="cmu")
    fc["agua_pronosticada_pct"] = np.expm1(final.predict(fc[X_cols])).clip(0)
    # Referencia: qué predice el mismo modelo con lluvia normal (anomalía 0) → efecto propio de El Niño
    neutro = fc.assign(anomalia_mm=0)
    fc["agua_con_lluvia_normal_pct"] = np.expm1(final.predict(neutro[X_cols])).clip(0)

    GOLD.mkdir(parents=True, exist_ok=True)
    salida = fc[["cmu", "anomalia_mm", "agua_pronosticada_pct", "agua_con_lluvia_normal_pct"]] \
        .rename(columns={"anomalia_mm": "anomalia_lluvia_nov_feb_mm"})
    salida.to_parquet(GOLD / "amenaza_agua_gobiernos_locales.parquet", index=False)
    (GOLD / "amenaza_agua_metricas.json").write_text(json.dumps({
        "validacion_2023_24": resultados, "modelo_elegido": mejor, "variables": X_cols,
        "entrenamiento": "El Niño 2015-16 (validación) → 2015-16 + 2023-24 (pronóstico)",
        "n_gobiernos_locales": int(len(fc)),
    }, indent=2, ensure_ascii=False))
    print(f"\nModelo elegido: {mejor}")
    print(salida.describe().round(2).to_string())


if __name__ == "__main__":
    main()

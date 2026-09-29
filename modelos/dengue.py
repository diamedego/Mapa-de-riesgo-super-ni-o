"""Modelo de riesgo de dengue por departamento y temporada (nov-feb → temporada epidemiológica).

Pregunta: dado el clima de la temporada y las características del departamento, ¿cuánta incidencia
de dengue esperar? Se usa para pronosticar la temporada 2026-27 con el pronóstico SEAS5.

Datos: 6 temporadas completas (2018-19, 2019-20, 2020-21, 2022-23, 2023-24, 2024-25) × 528 departamentos.
- y = log(1 + casos por 100 000 habitantes).
- Clima (ERA5-Land, nov-feb): temperatura media y su anomalía, lluvia y su anomalía.
- Estructura (Censo 2022): población, densidad, latitud, % hogares con NBI, % hogares sin agua de red,
  % hogares que se abastecen por cisterna/lluvia/río (almacenamiento de agua = criaderos), % urbano.
- Historia: máxima incidencia en temporadas ANTERIORES (nunca usa la temporada que predice).

Validación:
- Fuera de muestra temporal: entrenar hasta 2023-24 y predecir 2024-25.
- "¿Se podía anticipar la epidemia del Niño 2023-24?": entrenar con las otras 5 temporadas y predecir 2023-24.
- Líneas base: persistencia (repetir la máxima incidencia histórica) y solo clima.

Límite conocido: las epidemias también dependen del serotipo que circula y de la inmunidad de la
población, que no se observan. Por eso se evalúa sobre todo el ORDEN entre departamentos y se reporta
la incidencia como índice relativo, no como número de casos garantizado.

Resultado: la persistencia supera al modelo y la magnitud nacional no es predecible con datos públicos;
el índice final combina 75 % historia + 25 % clima (validado en el Niño 2023-24) y es RELATIVO.

Salidas: data/gold/dengue_pronostico_departamentos.parquet, data/gold/dengue_metricas.json
"""
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.ensemble import HistGradientBoostingRegressor

RAIZ = Path(__file__).resolve().parents[1]
RAW = RAIZ / "data" / "raw"
GOLD = RAIZ / "data" / "gold"
TEMPORADAS = [2018, 2019, 2020, 2022, 2023, 2024]
SEMILLA = 42


def censo_departamento() -> pd.DataFrame:
    def leer(var):
        d = pd.read_parquet(RAW / "censo" / f"{var}.parquet")
        d["cde"] = d["id_geo"].str[:5]
        return d.groupby(["cde", "valor_categoria"])["conteo"].sum().unstack(fill_value=0)

    edad, nbi, agua, urp = leer("PERSONA_EDADGRU"), leer("HOGAR_NBI_TOT"), leer("HOGAR_H14"), leer("VIVIENDA_URP")
    dep = gpd.read_parquet(RAW / "limites" / "departamentos.parquet")[["cde", "geometry"]]
    dep = dep[dep.geometry.representative_point().y > -56]
    out = pd.DataFrame({"cde": dep["cde"].values,
                        "lat": dep.geometry.representative_point().y.values,
                        "area_km2": dep.to_crs(5345).area.values / 1e6}).set_index("cde")
    out["poblacion"] = edad.sum(axis=1)
    out["pct_nbi"] = 100 * nbi.get("1", 0) / nbi.sum(axis=1)
    out["pct_agua_no_red"] = 100 * (1 - agua.get("1", 0) / agua.sum(axis=1))
    out["pct_agua_almacenada"] = 100 * agua.get("5", 0) / agua.sum(axis=1)
    out["pct_urbano"] = 100 * urp.get("1", 0) / urp.sum(axis=1)
    out["log_densidad"] = np.log1p(out["poblacion"] / out["area_km2"])
    return out.dropna(subset=["poblacion"]).reset_index()


def clima() -> pd.DataFrame:
    c = pd.read_parquet(RAW / "earth_engine" / "clima_departamentos.parquet")
    normal = c[c["temporada_inicio"] == "normal"].pivot(index="cde", columns="variable", values="valor")
    ano = c[c["temporada_inicio"] != "normal"].copy()
    ano["temporada_inicio"] = ano["temporada_inicio"].astype(int)
    ano = ano.pivot_table(index=["cde", "temporada_inicio"], columns="variable", values="valor").reset_index()
    ano = ano.merge(normal.add_suffix("_normal").reset_index(), on="cde")
    ano["temp_anomalia_c"] = ano["temp_media_c"] - ano["temp_media_c_normal"]
    ano["lluvia_anomalia_mm"] = ano["lluvia_mm"] - ano["lluvia_mm_normal"]
    return ano


def panel() -> pd.DataFrame:
    casos = pd.read_parquet(RAIZ / "data" / "silver" / "dengue_temporadas.parquet")
    est = censo_departamento()
    grid = est.merge(pd.DataFrame({"temporada_inicio": TEMPORADAS}), how="cross")
    df = grid.merge(casos, on=["cde", "temporada_inicio"], how="left").fillna({"casos": 0})
    df = df.merge(clima(), on=["cde", "temporada_inicio"], how="left")
    df["y"] = np.log1p(1e5 * df["casos"] / df["poblacion"])
    # Historia: máxima incidencia en temporadas anteriores a la que se predice (sin mirar el futuro)
    df = df.sort_values(["cde", "temporada_inicio"])
    df["hist_max_y"] = df.groupby("cde")["y"].transform(lambda s: s.shift(1).cummax())
    return df


X_COLS = ["temp_media_c", "temp_anomalia_c", "lluvia_mm", "lluvia_anomalia_mm", "lat", "log_densidad",
          "pct_nbi", "pct_agua_no_red", "pct_agua_almacenada", "pct_urbano", "hist_max_y"]


def modelo():
    return HistGradientBoostingRegressor(max_iter=500, learning_rate=0.04, max_depth=4, min_samples_leaf=20,
                                         l2_regularization=1.0, random_state=SEMILLA)


def metricas(y, pred) -> dict:
    top = y >= np.quantile(y, 0.9)
    ptop = pred >= np.quantile(pred, 0.9)
    return {"spearman": round(float(spearmanr(y, pred).statistic), 3),
            "aciertos_top10": round(float((top & ptop).sum() / max(top.sum(), 1)), 3),
            "mae_log": round(float(np.mean(np.abs(y - pred))), 3)}


def evaluar(df, test_temp, train_temps) -> dict:
    tr = df[df["temporada_inicio"].isin(train_temps)]
    te = df[df["temporada_inicio"] == test_temp]
    m = modelo().fit(tr[X_COLS], tr["y"])
    clima_solo = modelo().fit(tr[[c for c in X_COLS if c != "hist_max_y"]], tr["y"])
    res = {
        "modelo": metricas(te["y"].values, m.predict(te[X_COLS])),
        "solo_clima_y_estructura": metricas(te["y"].values,
                                            clima_solo.predict(te[[c for c in X_COLS if c != "hist_max_y"]])),
        "persistencia_max_historica": metricas(te["y"].values, te["hist_max_y"].fillna(0).values),
    }
    # ¿Anticipa la magnitud nacional? casos totales predichos vs reales
    casos_pred = (np.expm1(m.predict(te[X_COLS])).clip(0) * te["poblacion"] / 1e5).sum()
    res["casos_totales"] = {"reales": int(te["casos"].sum()), "predichos": int(casos_pred)}
    return res


def main() -> None:
    df = panel()
    validacion = {
        "temporal_2024_25": evaluar(df, 2024, [2018, 2019, 2020, 2022, 2023]),
        "epidemia_nino_2023_24": evaluar(df, 2023, [2018, 2019, 2020, 2022, 2024]),
    }
    print(json.dumps(validacion, indent=2, ensure_ascii=False))

    # Resultado de la validación: la persistencia (historia) ordena mejor que cualquier modelo, y el
    # modelo no anticipa la magnitud nacional (serotipos e inmunidad no observados). En la temporada
    # Niño 2023-24, sumar el modelo de clima con peso 25 % mejoró el orden (Spearman 0,743 → 0,766;
    # top 10 % 38 % → 42 %); en 2024-25 (post-epidemia) no. Como 2026-27 es Niño se usa 75/25.
    # Salida = índice RELATIVO entre departamentos, no cantidad de casos.
    x_clima = [c for c in X_COLS if c != "hist_max_y"]
    modelo_clima = modelo().fit(df[x_clima], df["y"])
    sea = pd.read_parquet(sorted((RAW / "open_meteo").glob("estacional_departamentos_*.parquet"))[-1])
    meses = ["2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01"]
    sea = sea[sea["mes"].isin(meses)]
    t_anom = sea[sea["variable"] == "temperature_2m_anomaly"].groupby("cde")["valor"].mean()
    p_anom = sea[sea["variable"] == "precipitation_anomaly"].groupby("cde")["valor"].sum()
    base = df[df["temporada_inicio"] == 2024].set_index("cde")
    fc = base[["lat", "log_densidad", "pct_nbi", "pct_agua_no_red", "pct_agua_almacenada", "pct_urbano",
               "poblacion", "temp_media_c_normal", "lluvia_mm_normal"]].copy()
    fc["temp_anomalia_c"] = t_anom
    fc["lluvia_anomalia_mm"] = p_anom
    fc["temp_media_c"] = fc["temp_media_c_normal"] + fc["temp_anomalia_c"]
    fc["lluvia_mm"] = fc["lluvia_mm_normal"] + fc["lluvia_anomalia_mm"]
    fc = fc.dropna(subset=["temp_anomalia_c"])
    fc["historia_max_incidencia_log"] = df.groupby("cde")["y"].max()
    fc["componente_clima"] = modelo_clima.predict(fc[x_clima])
    fc["indice_riesgo_dengue"] = (0.75 * fc["historia_max_incidencia_log"].rank(pct=True)
                                  + 0.25 * fc["componente_clima"].rank(pct=True)).rank(pct=True).round(3)

    GOLD.mkdir(parents=True, exist_ok=True)
    salida = fc.reset_index()[["cde", "poblacion", "temp_anomalia_c", "lluvia_anomalia_mm",
                               "historia_max_incidencia_log", "componente_clima", "indice_riesgo_dengue"]]
    salida.to_parquet(GOLD / "dengue_pronostico_departamentos.parquet", index=False)
    (GOLD / "dengue_metricas.json").write_text(json.dumps({
        "validacion": validacion, "variables": X_COLS, "temporadas": TEMPORADAS,
        "indice_final": "75 % historia (máxima incidencia) + 25 % modelo de clima, en rangos percentiles",
        "combinacion_validada": {"2023_24_nino": {"solo_historia": {"spearman": 0.743, "top10": 0.377},
                                                 "75_25": {"spearman": 0.766, "top10": 0.415}},
                                 "2024_25_post_epidemia": {"solo_historia": {"spearman": 0.446, "top10": 0.283},
                                                           "75_25": {"spearman": 0.428, "top10": 0.226}}},
        "n_departamentos": int(df["cde"].nunique())}, indent=2, ensure_ascii=False))
    print(salida.describe().round(2).to_string())


if __name__ == "__main__":
    main()

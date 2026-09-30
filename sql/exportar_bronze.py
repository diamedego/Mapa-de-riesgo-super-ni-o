"""Aterrizaje (landing) de la capa bronze: exporta a data/bronze/ los insumos del índice como Parquet plano.

Bronze = datos tal como vienen de cada fuente, sin transformar. Lo único que se resuelve acá (en Python,
porque es geoespacial) son tres cruces de mapas, que se dejan como tablas de correspondencia:
- radio censal → gobierno local (el punto interior del radio cae en el polígono del gobierno local);
- barrios populares RENABAP por gobierno local;
- gobierno local → estación del INA confiable más cercana (≤ 30 km).

Todo lo demás (limpieza, agregación, índice) se hace en SQL: sql/10_silver.sql y sql/20_gold.sql,
que corren igual en DuckDB (local, diario) y en Databricks.
"""
import json
from pathlib import Path

import geopandas as gpd
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
RAW, REF, GOLD = RAIZ / "data" / "raw", RAIZ / "data" / "referencia", RAIZ / "data" / "gold"
BRONZE = RAIZ / "data" / "bronze"
VARIABLES_CENSO = ["PERSONA_EDADGRU", "HOGAR_H18", "HOGAR_NBI_TOT", "HOGAR_INMAT"]


def ultimo(*patrones) -> Path:
    return max((p for pat in patrones for p in pat.parent.glob(pat.name)), key=lambda p: p.stem[-10:])


def main() -> None:
    BRONZE.mkdir(parents=True, exist_ok=True)
    salidas = {}

    # Censo 2022 por radio (formato largo, como lo publica REDATAM)
    salidas["censo_radio"] = pd.concat(
        pd.read_parquet(RAW / "censo" / f"{v}.parquet")[["id_geo", "codigo_variable", "valor_categoria",
                                                          "etiqueta_categoria", "conteo"]]
        for v in VARIABLES_CENSO)

    # Earth Engine
    ee = RAW / "earth_engine"
    salidas["ee_terreno_radios"] = pd.read_parquet(ee / "terreno_agua_radios.parquet")
    salidas["ee_terreno_gl"] = pd.read_parquet(ee / "terreno_agua_gobiernos_locales.parquet")
    salidas["ee_agua_observada_gl"] = pd.read_parquet(ee / "inundacion_observada_gobiernos_locales.parquet")
    salidas["ee_suelo_gl"] = pd.read_parquet(ee / "suelo_deslizamientos_gobiernos_locales.parquet")

    # Gobiernos locales (atributos, sin geometría)
    gl = gpd.read_parquet(RAW / "limites" / "gobiernos_locales.parquet")
    salidas["gobiernos_locales"] = pd.DataFrame({
        "cmu": gl["cmu"], "nam": gl["nam"], "jur": gl["jur"], "cpr": gl["cpr"], "cat_gl": gl["cat_gl"],
        "area_km2": gl.to_crs(5345).area / 1e6})

    # Cruces geoespaciales resueltos en Python
    rr = pd.read_parquet(REF / "rasgos_radios.parquet")
    salidas["map_radio_gobierno_local"] = rr[["cod_indec", "cmu"]].dropna()
    salidas["map_renabap_gobierno_local"] = pd.read_parquet(REF / "rasgos_gobiernos_locales.parquet")[
        ["cmu", "barrios_populares"]]
    rios = pd.read_parquet(GOLD / "rios_pronostico_mensual.parquet")
    confiables = rios.loc[rios["r_validacion"] >= 0.7, "series_id"].unique()
    est = gpd.read_parquet(REF / "estaciones_ina.parquet")
    est = est[est["series_id"].isin(confiables)][["series_id", "geometry"]].to_crs(5345)
    pts = pd.read_csv(REF / "puntos_gobiernos_locales.csv", dtype={"cmu": str})
    pts = gpd.GeoDataFrame(pts[["cmu"]], geometry=gpd.points_from_xy(pts["lon"], pts["lat"]), crs=4326)
    cerca = gpd.sjoin_nearest(pts.to_crs(5345), est, max_distance=30_000, distance_col="dist_m") \
        .drop_duplicates("cmu")
    salidas["map_gobierno_local_estacion"] = pd.DataFrame(cerca[["cmu", "series_id", "dist_m"]])

    # Pronósticos (última corrida disponible)
    f = ultimo(RAW / "open_meteo" / "estacional_2*.parquet", RAIZ / "data" / "archivo" / "open_meteo" / "estacional_2*.parquet")
    salidas["seas5_gobiernos_locales"] = pd.read_parquet(f)
    salidas["rios_pronostico_mensual"] = rios[["series_id", "mes", "p_alerta", "p_evacuacion", "r_validacion",
                                               "corrida_glofas"]]
    ver = json.loads((GOLD / "verificacion.json").read_text()) if (GOLD / "verificacion.json").exists() else {}
    salidas["parametros"] = pd.DataFrame([{
        "peso_pronostico": float(ver.get("lluvia_16_dias", {}).get("peso_pronostico", 1.0))}])

    for nombre, df in salidas.items():
        df.to_parquet(BRONZE / f"{nombre}.parquet", index=False)
        print(f"{nombre:32s} {len(df):>8} filas")


if __name__ == "__main__":
    main()

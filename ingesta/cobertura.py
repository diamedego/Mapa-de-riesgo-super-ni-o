"""Matriz de cobertura REAL: para cada gobierno local, qué datos tenemos y cuáles faltan.

Se calcula sobre lo descargado (no se estima). Reglas:
- Pronóstico estacional: hay valores para el gobierno local.
- Censo: % de radios del gobierno local con datos del Censo 2022.
- Ríos grandes (INA): hay una estación con nivel de alerta a ≤ 30 km del gobierno local.
- Puntos (salud, escuelas, OSM, RENABAP, sumideros, reclamos 147): cantidad dentro del gobierno local.
- Capas satelitales (Earth Engine): pendientes hasta procesarlas.
- Sin fuente pública: se listan como faltantes para todos.

Además calcula la población que vive fuera de todo gobierno local (zonas rurales), que se cubre por departamento.

Salidas: data/cobertura.csv (largo), data/cobertura_provincias.csv (resumen por provincia)
"""
import glob

import geopandas as gpd
import pandas as pd

from comun import RAIZ, RAW

CRS_METROS = 5345  # POSGAR 2007 / Argentina 4 (para distancias)


def contar_en(gl: gpd.GeoDataFrame, puntos: gpd.GeoDataFrame, nombre: str) -> pd.Series:
    pts = puntos.copy()
    pts["geometry"] = pts.geometry.representative_point()
    j = gpd.sjoin(pts[["geometry"]], gl[["cmu", "geometry"]], predicate="within")
    return j.groupby("cmu").size().reindex(gl["cmu"], fill_value=0).rename(nombre)


def main() -> None:
    gl = gpd.read_parquet(RAW / "limites" / "gobiernos_locales.parquet")
    gl["geometry"] = gl.geometry.make_valid()
    radios = gpd.read_parquet(RAW / "limites" / "radios_censales.parquet")

    # Población por radio (suma de grupos de edad) y asignación radio → gobierno local
    pob = pd.read_parquet(RAW / "censo" / "PERSONA_EDADGRU.parquet").groupby("id_geo")["conteo"].sum()
    rp = radios[["cod_indec", "cde", "geometry"]].copy()
    rp["geometry"] = rp.geometry.representative_point()
    rp = gpd.sjoin(rp, gl[["cmu", "geometry"]], predicate="within", how="left").drop(columns="index_right")
    rp = rp.drop_duplicates("cod_indec")
    rp["poblacion"] = rp["cod_indec"].map(pob).fillna(0)
    rp["con_censo"] = rp["cod_indec"].isin(pob.index)

    pob_total = rp["poblacion"].sum()
    pob_sin_gl = rp.loc[rp["cmu"].isna(), "poblacion"].sum()

    tabla = gl[["cmu", "nam", "jur", "cat_gl"]].set_index("cmu")
    por_gl = rp.dropna(subset=["cmu"]).groupby("cmu")
    tabla["poblacion_2022"] = por_gl["poblacion"].sum()
    tabla["radios"] = por_gl.size()
    tabla["pct_radios_con_censo"] = (por_gl["con_censo"].mean() * 100).round(1)

    # Pronóstico estacional
    est = pd.read_parquet(sorted(glob.glob(str(RAW / "open_meteo" / "estacional_*.parquet")))[-1])
    tabla["seas5_meses"] = est.groupby("cmu")["mes"].nunique()

    # Ríos grandes: estación INA con nivel de alerta a ≤ 30 km
    ina = gpd.read_parquet(RAW / "ina" / "series.parquet")
    ina = ina[ina["nivel_alerta"].notna()].to_crs(CRS_METROS)
    glm = gl[["cmu", "geometry"]].to_crs(CRS_METROS)
    cerca = gpd.sjoin_nearest(glm, ina[["estacion", "geometry"]], max_distance=30_000, how="left")
    tabla["estacion_ina_30km"] = cerca.groupby("cmu")["estacion"].apply(lambda s: s.notna().any())

    # Puntos de exposición e infraestructura
    ign = RAW / "ign"
    tabla = tabla.join(contar_en(gl, gpd.read_parquet(ign / "salud.parquet"), "salud_ign"), how="left")
    edu = pd.concat([gpd.read_parquet(ign / "educacion_020601.parquet"),
                     gpd.read_parquet(ign / "educacion_020602.parquet")])
    tabla = tabla.join(contar_en(gl, edu, "educacion_ign"), how="left")
    osm = gpd.read_parquet(RAW / "osm" / "infraestructura.parquet")
    for cat in sorted(osm["categoria"].unique()):
        tabla = tabla.join(contar_en(gl, osm[osm["categoria"] == cat], f"osm_{cat}"), how="left")
    renabap = gpd.read_file(RAW / "renabap" / "barrios.gpkg").to_crs(4326)
    tabla = tabla.join(contar_en(gl, renabap, "barrios_renabap"), how="left")
    res = pd.concat([gpd.read_parquet(ign / f) for f in
                     ["residuos_areas.parquet", "residuos_puntos.parquet", "rellenos_sanitarios.parquet"]])
    tabla = tabla.join(contar_en(gl, res, "residuos_ign"), how="left")

    # Solo CABA: sumideros y reclamos 147 pluviales (se cuentan en la capa silver; aquí, disponibilidad)
    es_caba = tabla["jur"].eq("CABA")
    tabla["sumideros_georref"] = es_caba
    tabla["reclamos_147_pluviales"] = es_caba

    # Capas procesadas en Earth Engine: hay dato si el gobierno local tiene valor
    ee_dir = RAW / "earth_engine"
    terreno = pd.read_parquet(ee_dir / "terreno_agua_gobiernos_locales.parquet").set_index("cmu")
    tabla["terreno_hand_pendiente"] = terreno["hand_m"].notna()
    tabla["agua_historica_jrc"] = terreno["agua_ocurrencia_pct"].notna()
    uso = pd.read_parquet(ee_dir / "uso_suelo_gobiernos_locales.parquet")
    tabla["mapbiomas_1985_2024"] = uso.groupby("cmu")["anio"].nunique().eq(40)
    suelo = pd.read_parquet(ee_dir / "suelo_deslizamientos_gobiernos_locales.parquet").set_index("cmu")
    tabla["arcilla_suelo"] = suelo["arcilla_pct"].notna()
    tabla["deslizamientos_historicos"] = suelo["deslizamientos_1970_2019"]
    tabla["manchas_inundacion_sentinel1"] = "pendiente"

    # Sin fuente pública nacional
    for capa in ["red_pluvial_fuera_caba", "red_cloacal_geometria", "napas_freaticas", "dengue_por_municipio"]:
        tabla[capa] = "faltante"

    tabla = tabla.reset_index()
    tabla.to_csv(RAIZ / "data" / "cobertura.csv", index=False)

    # Resumen por provincia: % de gobiernos locales con cada dato
    def pct(col):
        s = tabla[col]
        ok = s.eq(True) if s.dtype in (bool, object) else s.fillna(0).astype(float) > 0
        return ok.groupby(tabla["jur"]).mean().mul(100).round(0)

    columnas = ["seas5_meses", "terreno_hand_pendiente", "agua_historica_jrc", "mapbiomas_1985_2024",
                "arcilla_suelo", "estacion_ina_30km", "salud_ign", "educacion_ign", "barrios_renabap",
                "residuos_ign", "deslizamientos_historicos"] + [c for c in tabla.columns if c.startswith("osm_")]
    resumen = pd.DataFrame({c: pct(c) for c in columnas})
    resumen.insert(0, "gobiernos_locales", tabla.groupby("jur").size())
    resumen.insert(1, "pct_radios_con_censo", tabla.groupby("jur")["pct_radios_con_censo"].mean().round(1))
    resumen.loc["ARGENTINA"] = [len(tabla), tabla["pct_radios_con_censo"].mean().round(1)] + [
        round(pct(c).mul(tabla.groupby("jur").size()).sum() / len(tabla)) for c in columnas]
    resumen.to_csv(RAIZ / "data" / "cobertura_provincias.csv")

    print(f"Población total (radios): {pob_total:,.0f}")
    print(f"Población fuera de gobiernos locales: {pob_sin_gl:,.0f} ({pob_sin_gl / pob_total:.1%})")
    print(resumen.to_string())


if __name__ == "__main__":
    main()

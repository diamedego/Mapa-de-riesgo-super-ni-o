"""Clima de cada temporada (nov → feb) por departamento, para el modelo de dengue (ERA5-Land mensual).

Para cada departamento del INDEC (529) y cada temporada 2018-19 … 2024-25:
- temp_media_c: temperatura media a 2 m, nov-feb.
- lluvia_mm: lluvia acumulada nov-feb.
Y la normal 1991-2020 de ambas (para calcular anomalías, que es lo que pronostica SEAS5).

Se usa nov-feb para que coincida con la ventana del pronóstico SEAS5 disponible para 2026-27.
Salida: data/raw/earth_engine/clima_departamentos.parquet (cde, temporada_inicio, variable, valor)
"""
import json
import sys
from pathlib import Path

import ee
import geopandas as gpd
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ingesta"))
from comun import RAW, registrar  # noqa: E402
from config import PROYECTO_EE  # noqa: E402

COLECCION = "ECMWF/ERA5_LAND/MONTHLY_AGGR"
TEMPORADAS = range(2018, 2025)
LOTE = 200


def nov_feb(anio) -> ee.Image:
    inicio = ee.Date.fromYMD(anio, 11, 1)
    c = ee.ImageCollection(COLECCION).filterDate(inicio, inicio.advance(4, "month"))
    return ee.Image.cat(c.select("temperature_2m").mean().subtract(273.15).rename("temp_media_c"),
                        c.select("total_precipitation_sum").sum().multiply(1000).rename("lluvia_mm"))


def main() -> None:
    ee.Initialize(project=PROYECTO_EE)
    normal = ee.ImageCollection(ee.List.sequence(1991, 2020).map(lambda a: nov_feb(ee.Number(a)))).mean()
    bandas = [normal.select(["temp_media_c", "lluvia_mm"], ["temp_media_c_normal", "lluvia_mm_normal"])]
    for t in TEMPORADAS:
        bandas.append(nov_feb(t).rename([f"temp_media_c_{t}", f"lluvia_mm_{t}"]))
    img = ee.Image.cat(bandas)

    dep = gpd.read_parquet(RAW / "limites" / "departamentos.parquet")[["cde", "geometry"]]
    dep = dep[dep.geometry.representative_point().y > -56]  # sin Antártida ni islas del Atlántico Sur
    dep["geometry"] = dep.to_crs(5345).simplify(300).to_crs(4326).make_valid()
    filas = []
    for i in range(0, len(dep), LOTE):
        fc = ee.FeatureCollection(json.loads(dep.iloc[i:i + LOTE].to_json()))
        res = img.reduceRegions(fc, ee.Reducer.mean(), scale=11132, tileScale=4).getInfo()
        filas += [f["properties"] for f in res["features"]]
    ancho = pd.DataFrame(filas)
    # Departamentos más chicos que la celda (comunas de CABA, partidos del conurbano): valor de su celda
    faltan = ancho[ancho["temp_media_c_normal"].isna()]["cde"]
    if len(faltan):
        pts = dep[dep["cde"].isin(faltan)].copy()
        pts["geometry"] = pts.geometry.representative_point()
        res = img.reduceRegions(ee.FeatureCollection(json.loads(pts.to_json())), ee.Reducer.first(),
                                scale=11132).getInfo()
        relleno = pd.DataFrame([f["properties"] for f in res["features"]]).set_index("cde")
        ancho = ancho.set_index("cde")
        ancho.update(relleno)
        ancho = ancho.reset_index()

    largo = ancho.melt(id_vars="cde", var_name="var_temporada", value_name="valor")
    partes = largo["var_temporada"].str.rsplit("_", n=1, expand=True)
    largo["variable"], largo["temporada_inicio"] = partes[0], partes[1]
    largo = largo.drop(columns="var_temporada")
    destino = RAW / "earth_engine" / "clima_departamentos.parquet"
    largo.to_parquet(destino, index=False)
    registrar("Google Earth Engine (ERA5-Land)", "temperatura y lluvia nov-feb por departamento 2018-2024 y normal",
              COLECCION, destino, "Parquet", len(largo), "Copernicus C3S (uso libre con cita)",
              nota=f"{len(faltan)} departamentos chicos completados con su celda")
    print(f"{ancho['cde'].nunique()} departamentos; {len(faltan)} completados con su celda; "
          f"nulos: {int(largo['valor'].isna().sum())}")
    print(ancho.filter(like="temp").describe().round(1).T[["mean", "min", "max"]])


if __name__ == "__main__":
    main()

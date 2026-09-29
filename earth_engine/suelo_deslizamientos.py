"""Suelo (infiltración) y deslizamientos históricos por gobierno local, en Google Earth Engine.

- arcilla_pct: % de arcilla en superficie (OpenLandMap, 250 m). Más arcilla = menos infiltración,
  más escorrentía. Reemplaza al mapa de suelos del INTA mientras su geoservicio no responda.
- pendiente_p90_grados: percentil 90 de la pendiente (Copernicus DEM 30 m); detecta laderas
  empinadas dentro de un municipio aunque el promedio sea bajo (clave para aludes en el NOA).
- deslizamientos_1970_2019: eventos del Catálogo Global de Deslizamientos de la NASA dentro del
  gobierno local (subregistro esperable: se basa en noticias).

Salida: data/raw/earth_engine/suelo_deslizamientos_gobiernos_locales.parquet
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

CATALOGO = "projects/sat-io/open-datasets/events/global_landslide_1970-2019"
LOTE = 200


def main() -> None:
    ee.Initialize(project=PROYECTO_EE)
    gl = gpd.read_parquet(RAW / "limites" / "gobiernos_locales.parquet")[["cmu", "geometry"]]
    gl["geometry"] = gl.to_crs(5345).simplify(100).to_crs(4326).make_valid()

    arcilla = ee.Image("OpenLandMap/SOL/SOL_CLAY-WFRACTION_USDA-3A1A1A_M/v02").select("b0").rename("arcilla_pct")
    dem30 = ee.ImageCollection("COPERNICUS/DEM/GLO30").select("DEM").mosaic() \
        .setDefaultProjection("EPSG:4326", None, 30)
    pendiente = ee.Terrain.slope(dem30).rename("pendiente_p90_grados")
    eventos = ee.FeatureCollection(CATALOGO)

    filas = []
    for i in range(0, len(gl), LOTE):
        fc = ee.FeatureCollection(json.loads(gl.iloc[i:i + LOTE].to_json()))
        a = arcilla.reduceRegions(fc, ee.Reducer.mean().setOutputs(["arcilla_pct"]), scale=250)
        p = pendiente.reduceRegions(a, ee.Reducer.percentile([90]).setOutputs(["pendiente_p90_grados"]),
                                    scale=90, tileScale=4)
        con_eventos = p.map(lambda f: f.set("deslizamientos_1970_2019",
                                            eventos.filterBounds(f.geometry()).size()))
        res = con_eventos.select(["cmu", "arcilla_pct", "pendiente_p90_grados",
                                  "deslizamientos_1970_2019"], None, False).getInfo()
        filas += [x["properties"] for x in res["features"]]
        print(f"  {min(i + LOTE, len(gl))}/{len(gl)}", flush=True)

    df = pd.DataFrame(filas)
    destino = RAW / "earth_engine" / "suelo_deslizamientos_gobiernos_locales.parquet"
    df.to_parquet(destino, index=False)
    registrar("Google Earth Engine", "arcilla, pendiente p90 y deslizamientos históricos por gobierno local",
              f"OpenLandMap clay v02; COPERNICUS/DEM/GLO30; {CATALOGO}", destino, "Parquet", len(df),
              "OpenLandMap CC BY-SA 4.0; Copernicus DEM; NASA GLC (uso libre con cita)")
    print(df.describe().round(2).to_string())
    print("Gobiernos locales con deslizamientos registrados:", (df["deslizamientos_1970_2019"] > 0).sum())


if __name__ == "__main__":
    main()

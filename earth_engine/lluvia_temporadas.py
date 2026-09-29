"""Lluvia observada por temporada (nov → feb) y su anomalía, por gobierno local (ERA5-Land mensual).

Se usa nov-feb (4 meses) porque es la ventana que cubre el pronóstico SEAS5 disponible para 2026-27
(sep-2026 → feb-2027). Así, el modelo se entrena y se aplica con la misma variable.

- lluvia_<temporada>_mm: lluvia acumulada nov-feb de esa temporada.
- lluvia_normal_mm: promedio nov-feb 1991-2020 (normal climatológica OMM).
- anomalia_<temporada>_mm = lluvia_<temporada>_mm - lluvia_normal_mm

Temporadas: 2015-16 (Niño, entrenamiento), 2023-24 (Niño, validación), 2022-23 (Niña seca, referencia).

Salida: data/raw/earth_engine/lluvia_temporadas_gobiernos_locales.parquet
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
TEMPORADAS = {"2015_16": 2015, "2023_24": 2023, "2022_23": 2022}  # año de inicio (noviembre)
LOTE = 300


def lluvia_nov_feb(anio_inicio) -> ee.Image:
    inicio = ee.Date.fromYMD(anio_inicio, 11, 1)
    return (ee.ImageCollection(COLECCION).filterDate(inicio, inicio.advance(4, "month"))
            .select("total_precipitation_sum").sum().multiply(1000))  # m → mm


def main() -> None:
    ee.Initialize(project=PROYECTO_EE)
    normal = ee.ImageCollection(ee.List.sequence(1991, 2020).map(
        lambda a: lluvia_nov_feb(ee.Number(a)))).mean().rename("lluvia_normal_mm")
    bandas = [normal] + [lluvia_nov_feb(a).rename(f"lluvia_{t}_mm") for t, a in TEMPORADAS.items()]
    img = ee.Image.cat(bandas)

    gl = gpd.read_parquet(RAW / "limites" / "gobiernos_locales.parquet")[["cmu", "geometry"]]
    gl["geometry"] = gl.to_crs(5345).simplify(200).to_crs(4326).make_valid()
    filas = []
    for i in range(0, len(gl), LOTE):
        fc = ee.FeatureCollection(json.loads(gl.iloc[i:i + LOTE].to_json()))
        res = img.reduceRegions(fc, ee.Reducer.mean(), scale=11132, tileScale=4).getInfo()
        filas += [f["properties"] for f in res["features"]]
        print(f"  {min(i + LOTE, len(gl))}/{len(gl)}", flush=True)

    df = pd.DataFrame(filas)
    # Municipios más chicos que la celda de ERA5 (~11 km) quedan sin píxel: se toma la celda
    # donde cae su punto representativo
    faltan = df[df["lluvia_normal_mm"].isna()]["cmu"]
    if len(faltan):
        pts = gl[gl["cmu"].isin(faltan)].copy()
        pts["geometry"] = pts.geometry.representative_point()
        res = img.reduceRegions(ee.FeatureCollection(json.loads(pts.to_json())),
                                ee.Reducer.first(), scale=11132).getInfo()
        relleno = pd.DataFrame([f["properties"] for f in res["features"]]).set_index("cmu")
        df = df.set_index("cmu")
        df.update(relleno)
        df = df.reset_index()
        print(f"  {len(faltan)} municipios chicos completados con el valor de su celda")
    for t in TEMPORADAS:
        df[f"anomalia_{t}_mm"] = df[f"lluvia_{t}_mm"] - df["lluvia_normal_mm"]
    destino = RAW / "earth_engine" / "lluvia_temporadas_gobiernos_locales.parquet"
    df.to_parquet(destino, index=False)
    registrar("Google Earth Engine (ERA5-Land)", "lluvia nov-feb por temporada y normal 1991-2020",
              COLECCION, destino, "Parquet", len(df), "Copernicus C3S (uso libre con cita)",
              nota="escala ~11 km; municipios chicos toman el valor de la celda")
    print(df.describe().round(1).to_string())


if __name__ == "__main__":
    main()

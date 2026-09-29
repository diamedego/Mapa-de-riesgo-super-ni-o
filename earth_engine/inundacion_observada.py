"""Agua en superficie observada en años Niño vs. un año seco, por gobierno local (Dynamic World).

Dynamic World (Google, Sentinel-2, 10 m) clasifica cada imagen con un modelo de deep learning.
Para cada mes se toma la clase más frecuente (moda); un píxel "tuvo agua" en un período si fue
agua en al menos un mes. Se descarta el agua permanente (JRC, ocurrencia > 80 %).

Períodos (temporada de lluvias nov → abr):
- nino_2023_24: nov-2023 → abr-2024
- nino_2015_16: nov-2015 → abr-2016 (Dynamic World arranca a mediados de 2015)
- referencia_2022_23: nov-2022 → abr-2023, sequía de La Niña

Se descartó primero un método con radar Sentinel-1 (umbral VV < -18 dB): en la sequía 2022-23
detectaba MÁS agua que en El Niño, porque el suelo seco y liso refleja poco y se confunde con agua
(y en 2022-23 solo operaba Sentinel-1A). Ver bitácora.

Limitaciones: Sentinel-2 es óptico; las nubes persistentes reducen observaciones en meses muy lluviosos
(la moda mensual lo mitiga). No detecta agua bajo vegetación densa ni anegamientos breves de horas.

Uso: python earth_engine/inundacion_observada.py
Salida: data/raw/earth_engine/inundacion_observada_gobiernos_locales.parquet
"""
import json
import sys
import time
from pathlib import Path

import ee
import geopandas as gpd
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ingesta"))
from comun import RAW, registrar  # noqa: E402
from config import PROYECTO_EE  # noqa: E402

ESCALA = 100
LOTE = 50
PERIODOS = {
    "nino_2023_24": ("2023-11-01", "2024-05-01"),
    "nino_2015_16": ("2015-11-01", "2016-05-01"),
    "referencia_2022_23": ("2022-11-01", "2023-05-01"),
}


def agua_periodo(inicio: str, fin: str) -> ee.Image:
    dw = ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1").filterDate(inicio, fin).select("label")
    n = ee.Date(fin).difference(ee.Date(inicio), "month").round()
    meses = ee.List.sequence(0, n.subtract(1))
    mensual = ee.ImageCollection(meses.map(
        lambda k: dw.filterDate(ee.Date(inicio).advance(k, "month"),
                                ee.Date(inicio).advance(ee.Number(k).add(1), "month")).mode().eq(0)))
    return mensual.max().unmask(0)


def imagen() -> ee.Image:
    permanente = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence").unmask(0).gt(80)
    capas = {nombre: agua_periodo(*fechas).And(permanente.Not()) for nombre, fechas in PERIODOS.items()}
    ref = capas["referencia_2022_23"]
    return ee.Image.cat(
        [img.multiply(100).rename(f"agua_{n}_pct") for n, img in capas.items()]
        + [capas["nino_2023_24"].And(ref.Not()).multiply(100).rename("agua_extra_nino_2023_24_pct"),
           capas["nino_2015_16"].And(ref.Not()).multiply(100).rename("agua_extra_nino_2015_16_pct")])


def main() -> None:
    ee.Initialize(project=PROYECTO_EE)
    gl = gpd.read_parquet(RAW / "limites" / "gobiernos_locales.parquet")[["cmu", "geometry"]]
    gl["geometry"] = gl.to_crs(5345).simplify(100).to_crs(4326).make_valid()
    img = imagen()
    parciales = RAW / "earth_engine" / "_parcial_inundacion"
    parciales.mkdir(parents=True, exist_ok=True)

    for i in range(0, len(gl), LOTE):
        f = parciales / f"lote_{i:06d}.parquet"
        if f.exists():
            continue
        fc = ee.FeatureCollection(json.loads(gl.iloc[i:i + LOTE].to_json()))
        for intento in range(4):
            try:
                res = img.reduceRegions(fc, ee.Reducer.mean(), scale=ESCALA, tileScale=16).getInfo()
                break
            except ee.EEException as e:
                print(f"    reintento {intento + 1}: {str(e)[:120]}", flush=True)
                time.sleep(20 * (intento + 1))
        else:
            raise RuntimeError("Earth Engine no respondió tras 4 intentos")
        pd.DataFrame([x["properties"] for x in res["features"]]).to_parquet(f, index=False)
        print(f"  {min(i + LOTE, len(gl))}/{len(gl)}", flush=True)

    df = pd.concat([pd.read_parquet(p) for p in sorted(parciales.glob("lote_*.parquet"))], ignore_index=True)
    destino = RAW / "earth_engine" / "inundacion_observada_gobiernos_locales.parquet"
    df.to_parquet(destino, index=False)
    registrar("Google Earth Engine (Dynamic World)", "agua observada en Niños 2015-16 y 2023-24 vs. sequía 2022-23",
              "GOOGLE/DYNAMICWORLD/V1; JRC/GSW1_4/GlobalSurfaceWater", destino, "Parquet", len(df),
              "Dynamic World CC BY 4.0; JRC GSW CC BY 4.0", nota=f"moda mensual; escala {ESCALA} m")
    print(df.describe().round(2).to_string())


if __name__ == "__main__":
    main()

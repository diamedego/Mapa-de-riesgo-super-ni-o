"""Uso y cobertura del suelo 1985-2024 (MapBiomas Argentina, colección 2) por gobierno local.

Para cada gobierno local y cada año calcula el % de superficie de:
- urbano (clase 24): impermeabilización, el agua no infiltra;
- agua (clase 33): ríos, lagunas; su expansión en años Niño muestra anegamientos;
- humedal (clase 11) y cultivos (clase 19): contexto productivo y ambiental.

Clases verificadas con muestras: CABA 98 % urbano (24), Delta 39 % humedal (11),
pampa agrícola 74 % cultivos (19).

Salida: data/raw/earth_engine/uso_suelo_gobiernos_locales.parquet
(formato largo: cmu, anio, clase, pct_area)
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

ASSET = "projects/mapbiomas-public/assets/argentina/lulc/collection2/mapbiomas_argentina_collection2_integration_v3"
CLASES = {24: "urbano", 33: "agua", 11: "humedal", 19: "cultivos"}
ANIOS = range(1985, 2025)
ESCALA = 90
LOTE = 100


def imagen() -> ee.Image:
    mb = ee.Image(ASSET)
    bandas = []
    for anio in ANIOS:
        c = mb.select(f"classification_{anio}")
        for codigo, nombre in CLASES.items():
            bandas.append(c.eq(codigo).multiply(100).rename(f"{nombre}_{anio}"))
    return ee.Image.cat(bandas)


def main() -> None:
    ee.Initialize(project=PROYECTO_EE)
    gl = gpd.read_parquet(RAW / "limites" / "gobiernos_locales.parquet")[["cmu", "geometry"]]
    gl["geometry"] = gl.to_crs(5345).simplify(100).to_crs(4326).make_valid()
    img = imagen()
    parciales = RAW / "earth_engine" / "_parcial_uso_suelo"
    parciales.mkdir(parents=True, exist_ok=True)

    for i in range(0, len(gl), LOTE):
        f = parciales / f"lote_{i:06d}.parquet"
        if f.exists():
            continue
        fc = ee.FeatureCollection(json.loads(gl.iloc[i:i + LOTE].to_json()))
        for intento in range(4):
            try:
                res = img.reduceRegions(fc, ee.Reducer.mean(), scale=ESCALA, tileScale=8).getInfo()
                break
            except ee.EEException as e:
                print(f"    reintento {intento + 1}: {str(e)[:120]}", flush=True)
                time.sleep(15 * (intento + 1))
        else:
            raise RuntimeError("Earth Engine no respondió tras 4 intentos")
        pd.DataFrame([x["properties"] for x in res["features"]]).to_parquet(f, index=False)
        print(f"  {min(i + LOTE, len(gl))}/{len(gl)}", flush=True)

    ancho = pd.concat([pd.read_parquet(p) for p in sorted(parciales.glob("lote_*.parquet"))], ignore_index=True)
    largo = ancho.melt(id_vars="cmu", var_name="clase_anio", value_name="pct_area")
    largo[["clase", "anio"]] = largo["clase_anio"].str.rsplit("_", n=1, expand=True)
    largo = largo.drop(columns="clase_anio").astype({"anio": int})
    destino = RAW / "earth_engine" / "uso_suelo_gobiernos_locales.parquet"
    largo.to_parquet(destino, index=False)
    registrar("Google Earth Engine (MapBiomas Argentina col. 2)", "uso del suelo 1985-2024 por gobierno local",
              ASSET, destino, "Parquet", len(largo), "CC BY-SA 4.0 (MapBiomas)",
              nota=f"clases {CLASES}; escala {ESCALA} m")
    print(largo.groupby(["clase", "anio"])["pct_area"].mean().unstack(0).loc[[1985, 1998, 2016, 2024]].round(2))


if __name__ == "__main__":
    main()

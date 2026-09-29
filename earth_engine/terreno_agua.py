"""Terreno y agua histórica por unidad territorial, procesado en Google Earth Engine.

Para cada gobierno local (o radio censal) calcula:
- elevacion_m: elevación media (MERIT Hydro, 90 m).
- hand_m: altura media sobre el cauce más cercano (HAND). Cuanto más bajo, más fácil que se inunde.
- pct_area_hand_2m / pct_area_hand_5m: % de la superficie a menos de 2 / 5 m sobre el cauce.
- pendiente_grados: pendiente media (Copernicus DEM GLO-30, 30 m). En llanura, pendiente baja = drenaje lento.
- agua_ocurrencia_pct: % del tiempo (1984-2021) en que hubo agua en superficie (JRC Global Surface Water).
- pct_area_agua_alguna_vez: % de la superficie que estuvo cubierta de agua al menos una vez.

Solo se descargan los resultados agregados (KB), no las imágenes.

Uso: python earth_engine/terreno_agua.py [gobiernos_locales|radios]
Salida: data/raw/earth_engine/terreno_agua_<unidad>.parquet
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

UNIDADES = {
    "gobiernos_locales": ("gobiernos_locales.parquet", "cmu", 100, 200),   # archivo, id, simplificación (m), lote
    "radios": ("radios_censales.parquet", "cod_indec", 20, 1000),
}
ESCALA = 90


def imagen() -> ee.Image:
    merit = ee.Image("MERIT/Hydro/v1_0_1")
    hand = merit.select("hnd")
    dem30 = ee.ImageCollection("COPERNICUS/DEM/GLO30").select("DEM").mosaic() \
        .setDefaultProjection("EPSG:4326", None, 30)
    agua = ee.Image("JRC/GSW1_4/GlobalSurfaceWater")
    return ee.Image.cat([
        merit.select("elv").rename("elevacion_m"),
        hand.rename("hand_m"),
        hand.lt(2).multiply(100).rename("pct_area_hand_2m"),
        hand.lt(5).multiply(100).rename("pct_area_hand_5m"),
        ee.Terrain.slope(dem30).rename("pendiente_grados"),
        agua.select("occurrence").unmask(0).rename("agua_ocurrencia_pct"),
        agua.select("max_extent").unmask(0).multiply(100).rename("pct_area_agua_alguna_vez"),
    ])


def procesar_lote(img, lote: gpd.GeoDataFrame, id_col: str) -> list[dict]:
    fc = ee.FeatureCollection(json.loads(lote[[id_col, "geometry"]].to_json()))
    for intento in range(4):
        try:
            res = img.reduceRegions(fc, ee.Reducer.mean(), scale=ESCALA, tileScale=4).getInfo()
            return [f["properties"] for f in res["features"]]
        except ee.EEException as e:
            print(f"    reintento {intento + 1}: {str(e)[:120]}", flush=True)
            time.sleep(10 * (intento + 1))
    raise RuntimeError("Earth Engine no respondió tras 4 intentos")


def main(unidad: str = "gobiernos_locales") -> None:
    archivo, id_col, tolerancia, tam_lote = UNIDADES[unidad]
    ee.Initialize(project=PROYECTO_EE)
    gdf = gpd.read_parquet(RAW / "limites" / archivo)[[id_col, "geometry"]]
    # Simplificar reduce el tamaño enviado a Earth Engine sin cambiar los promedios de forma apreciable
    gdf["geometry"] = gdf.to_crs(5345).simplify(tolerancia).to_crs(4326).make_valid()

    destino = RAW / "earth_engine" / f"terreno_agua_{unidad}.parquet"
    destino.parent.mkdir(parents=True, exist_ok=True)
    parciales = RAW / "earth_engine" / f"_parcial_{unidad}"
    parciales.mkdir(exist_ok=True)

    # Se excluyen la Antártida e islas del Atlántico Sur (al sur de 56° S): un solo radio antártico
    # mide 872 000 km² y bloquea el procesamiento, sin aportar al análisis de riesgo.
    # Se filtra dentro de cada lote para no correr los índices de los lotes ya procesados.
    fuera = gdf.geometry.representative_point().y < -56

    img = imagen()
    for i in range(0, len(gdf), tam_lote):
        f = parciales / f"lote_{i:06d}.parquet"
        if f.exists():  # retoma donde quedó
            continue
        lote = gdf.iloc[i:i + tam_lote][~fuera.iloc[i:i + tam_lote]]
        filas = procesar_lote(img, lote, id_col)
        pd.DataFrame(filas).to_parquet(f, index=False)
        print(f"  {min(i + tam_lote, len(gdf))}/{len(gdf)}", flush=True)

    df = pd.concat([pd.read_parquet(p) for p in sorted(parciales.glob("lote_*.parquet"))], ignore_index=True)
    df.to_parquet(destino, index=False)
    registrar("Google Earth Engine", f"terreno y agua histórica por {unidad}",
              "MERIT/Hydro/v1_0_1; COPERNICUS/DEM/GLO30; JRC/GSW1_4/GlobalSurfaceWater",
              destino, "Parquet", len(df),
              "MERIT Hydro CC BY-NC 4.0; Copernicus DEM (licencia Copernicus); JRC GSW CC BY 4.0",
              nota=f"escala {ESCALA} m; geometrías simplificadas {tolerancia} m")
    print(df.describe().round(2).to_string())


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "gobiernos_locales")

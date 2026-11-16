"""Earth Engine para las zonas rurales sin gobierno local (ingesta/zonas_rurales.py): agrega sus filas a las mismas salidas
que ya tienen los gobiernos locales, sin recalcular estos.

- terreno_agua_gobiernos_locales.parquet (terreno_agua.py): HAND, pendiente, agua histórica.
- inundacion_observada_gobiernos_locales.parquet (inundacion_observada.py): agua en los Niños 2015-16 y 2023-24 (Dynamic World).
- suelo_deslizamientos_gobiernos_locales.parquet (suelo_deslizamientos.py): arcilla, pendiente p90, deslizamientos.
- uso_suelo_gobiernos_locales.parquet (uso_suelo.py): MapBiomas 1985-2024.
- lluvia_temporadas_gobiernos_locales.parquet (lluvia_temporadas.py): lluvia nov-feb (ERA5-Land).

Las zonas rurales miden de 25 a 100.000 km²: se reducen con píxeles de 250 m (los gobiernos locales, con 90 m o 30 m). En promedios
sobre áreas tan grandes la diferencia es despreciable y evita que Earth Engine corte el cálculo por tiempo.
Uso: .venv/bin/python earth_engine/zonas_rurales_ee.py
"""
import json
import sys
import time
from pathlib import Path

import ee
import geopandas as gpd
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "ingesta"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from comun import RAW  # noqa: E402
from config import PROYECTO_EE  # noqa: E402
import inundacion_observada as IO  # noqa: E402
import lluvia_temporadas as LT  # noqa: E402
import suelo_deslizamientos as SD  # noqa: E402
import terreno_agua as TA  # noqa: E402
import uso_suelo as US  # noqa: E402

EE = RAW / "earth_engine"
ESCALA = 250
LOTE = 8


def reducir(img, gdf, reductor, escala=ESCALA, tile=16) -> list[dict]:
    filas = []
    for i in range(0, len(gdf), LOTE):
        fc = ee.FeatureCollection(json.loads(gdf.iloc[i:i + LOTE][["cmu", "geometry"]].to_json()))
        for intento in range(5):
            try:
                res = img.reduceRegions(fc, reductor, scale=escala, tileScale=tile).getInfo()
                filas += [f["properties"] for f in res["features"]]
                break
            except ee.EEException as e:
                print(f"    reintento {intento + 1}: {str(e)[:120]}", flush=True)
                time.sleep(15 * (intento + 1))
        else:
            raise RuntimeError("Earth Engine no respondió tras 5 intentos")
        print(f"    {min(i + LOTE, len(gdf))}/{len(gdf)}", flush=True)
    return filas


def agregar(archivo: str, nuevas: pd.DataFrame) -> None:
    """Suma las filas nuevas (reemplaza las de las mismas zonas si ya estaban)."""
    destino = EE / archivo
    viejo = pd.read_parquet(destino)
    viejo = viejo[~viejo["cmu"].isin(nuevas["cmu"].unique())]
    pd.concat([viejo, nuevas[[c for c in viejo.columns if c in nuevas.columns]]], ignore_index=True).to_parquet(destino, index=False)
    print(f"  {archivo}: +{nuevas['cmu'].nunique()} zonas", flush=True)


def main() -> None:
    ee.Initialize(project=PROYECTO_EE)
    gl = gpd.read_parquet(RAW / "limites" / "gobiernos_locales.parquet")
    zr = gl[gl["cat_gl"] == "ZR"][["cmu", "geometry"]].copy()
    zr["geometry"] = zr.to_crs(5345).simplify(250).to_crs(4326).make_valid()
    hechos = lambda archivo: set(pd.read_parquet(EE / archivo)["cmu"])  # noqa: E731
    falta = lambda archivo: zr[~zr["cmu"].isin(hechos(archivo))]  # noqa: E731

    if len(z := falta("terreno_agua_gobiernos_locales.parquet")):
        print("Terreno y agua histórica")
        agregar("terreno_agua_gobiernos_locales.parquet", pd.DataFrame(reducir(TA.imagen(), z, ee.Reducer.mean())))
    if len(z := falta("inundacion_observada_gobiernos_locales.parquet")):
        print("Agua observada en los Niños (Dynamic World)")
        agregar("inundacion_observada_gobiernos_locales.parquet", pd.DataFrame(reducir(IO.imagen(), z, ee.Reducer.mean(), escala=500)))
    if len(z := falta("suelo_deslizamientos_gobiernos_locales.parquet")):
        print("Arcilla, pendiente p90 y deslizamientos")
        arcilla = ee.Image("OpenLandMap/SOL/SOL_CLAY-WFRACTION_USDA-3A1A1A_M/v02").select("b0").rename("arcilla_pct")
        dem30 = ee.ImageCollection("COPERNICUS/DEM/GLO30").select("DEM").mosaic().setDefaultProjection("EPSG:4326", None, 30)
        img = arcilla.addBands(ee.Terrain.slope(dem30).rename("pendiente_p90_grados"))
        red = ee.Reducer.mean().setOutputs(["arcilla_pct"]).combine(ee.Reducer.percentile([90]).setOutputs(["pendiente_p90_grados"]))
        # mean de la banda 1 y percentil de la banda 2: se reducen por separado y se juntan
        a = pd.DataFrame(reducir(arcilla, z, ee.Reducer.mean().setOutputs(["arcilla_pct"])))
        p = pd.DataFrame(reducir(img.select("pendiente_p90_grados"), z, ee.Reducer.percentile([90]).setOutputs(["pendiente_p90_grados"])))
        del red
        eventos = ee.FeatureCollection(SD.CATALOGO)
        fc = ee.FeatureCollection(json.loads(z.to_json())).map(lambda f: f.set("deslizamientos_1970_2019", eventos.filterBounds(f.geometry()).size()))
        d = pd.DataFrame([x["properties"] for x in fc.select(["cmu", "deslizamientos_1970_2019"], None, False).getInfo()["features"]])
        agregar("suelo_deslizamientos_gobiernos_locales.parquet", a.merge(p, on="cmu").merge(d, on="cmu"))
    if len(z := falta("uso_suelo_gobiernos_locales.parquet")):
        print("Uso del suelo (MapBiomas)")
        ancho = pd.DataFrame(reducir(US.imagen(), z, ee.Reducer.mean()))
        largo = ancho.melt(id_vars="cmu", var_name="clase_anio", value_name="pct_area")
        largo[["clase", "anio"]] = largo["clase_anio"].str.rsplit("_", n=1, expand=True)
        agregar("uso_suelo_gobiernos_locales.parquet", largo.drop(columns="clase_anio").astype({"anio": int}))
    if len(z := falta("lluvia_temporadas_gobiernos_locales.parquet")):
        print("Lluvia nov-feb (ERA5-Land)")
        normal = ee.ImageCollection(ee.List.sequence(1991, 2020).map(lambda a: LT.lluvia_nov_feb(ee.Number(a)))).mean().rename("lluvia_normal_mm")
        img = ee.Image.cat([normal] + [LT.lluvia_nov_feb(a).rename(f"lluvia_{t}_mm") for t, a in LT.TEMPORADAS.items()])
        df = pd.DataFrame(reducir(img, z, ee.Reducer.mean(), escala=11132, tile=4))
        for t in LT.TEMPORADAS:
            df[f"anomalia_{t}_mm"] = df[f"lluvia_{t}_mm"] - df["lluvia_normal_mm"]
        agregar("lluvia_temporadas_gobiernos_locales.parquet", df)
    print("Listo")


if __name__ == "__main__":
    main()

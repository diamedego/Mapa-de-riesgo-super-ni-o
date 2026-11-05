"""Alertas vigentes del SMN para el mapa (capa "Condiciones actuales").

Lee las alertas archivadas (data/archivo/smn_cap, las escribe ingesta/smn_alertas.py cada 3 horas), se queda con
las que siguen vigentes ahora y las guarda simplificadas: web/datos/alertas.geojson.
Nivel: Moderate = amarilla, Severe = naranja, Extreme = roja (convención CAP del SMN).
"""
import datetime as dt
import glob
import json
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely import wkb

RAIZ = Path(__file__).resolve().parents[1]
SALIDA = Path(__file__).resolve().parent / "datos" / "alertas.geojson"
NIVEL = {"Moderate": "amarilla", "Severe": "naranja", "Extreme": "roja", "Minor": "amarilla"}


def tipo(evento: str, titulo: str) -> str:
    x = f"{evento} {titulo}".lower()
    for clave, nombre in (("zonda", "zonda"), ("torment", "tormentas"), ("lluvia", "lluvias"), ("nev", "nevadas"),
                          ("viento", "viento"), ("calor", "calor"), ("fr", "frio"), ("niebla", "niebla"), ("polvo", "polvo")):
        if clave in x:
            return nombre
    return "otras"


def main() -> None:
    archivos = sorted(glob.glob(str(RAIZ / "data" / "archivo" / "smn_cap" / "alertas_*.parquet")))
    archivos += sorted(glob.glob(str(RAIZ / "data" / "raw" / "smn_cap" / "alertas_*.parquet")))
    if not archivos:
        print("Sin alertas archivadas")
        return
    df = pd.concat([pd.read_parquet(f) for f in sorted(archivos, key=lambda f: Path(f).name)[-3:]], ignore_index=True)
    df = df.drop_duplicates("identificador", keep="last")
    ahora = pd.Timestamp(dt.datetime.now(dt.timezone.utc))
    df["vence_ts"] = pd.to_datetime(df["vence"], utc=True, errors="coerce")
    df = df[df["vence_ts"] > ahora].copy()
    df["geometry"] = df["geometry"].apply(lambda g: wkb.loads(g) if isinstance(g, (bytes, bytearray)) else g)
    g = gpd.GeoDataFrame(df, geometry="geometry", crs=4326)
    g = g[g.geometry.notna() & ~g.geometry.is_empty]
    g["geometry"] = g.geometry.simplify(0.01).set_precision(1e-3)
    g["nivel"] = g["severidad"].map(NIVEL).fillna("amarilla")
    g["tipo"] = [tipo(e or "", t or "") for e, t in zip(g["evento"], g["titulo"])]
    g["aviso"] = g["urgencia"].eq("Immediate")     # aviso a corto plazo (horas)
    g["vence"] = g["vence_ts"].dt.tz_convert("America/Argentina/Buenos_Aires").dt.strftime("%Y-%m-%dT%H:%M")
    g["titulo"] = g["titulo"].str.slice(0, 120)
    salida = g[["tipo", "nivel", "evento", "titulo", "vence", "aviso", "geometry"]]
    texto = salida.to_json(drop_id=True) if len(salida) else json.dumps({"type": "FeatureCollection", "features": []})
    datos = json.loads(texto)
    datos["generado"] = ahora.strftime("%Y-%m-%dT%H:%MZ")
    SALIDA.write_text(json.dumps(datos, separators=(",", ":"), ensure_ascii=False))
    print(f"Alertas vigentes: {len(salida)} ({salida['tipo'].value_counts().to_dict() if len(salida) else {}}); "
          f"{SALIDA.stat().st_size / 1e3:.0f} KB")


if __name__ == "__main__":
    main()

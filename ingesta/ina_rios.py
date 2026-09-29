"""Alturas de ríos del INA (Sistema Alerta 5) para las estaciones con nivel de alerta.

- Catálogo de series de altura hidrométrica (var_id=2) con sus niveles de alerta y evacuación.
- Observaciones de las series con nivel de alerta desde 2015 (incluye El Niño 2015-16 y 2023-24,
  útiles para validar) hasta hoy.

Salida: data/raw/ina/series.parquet y data/raw/ina/alturas.parquet
"""
import datetime as dt
import json
import os

import geopandas as gpd
import pandas as pd
from shapely.geometry import shape

from comun import RAW, registrar, sesion

BASE = "https://alerta.ina.gob.ar/a5/obs/puntual"
# En GitHub Actions se piden solo los últimos días (INA_DESDE) y se guarda un archivo por fecha
DESDE = os.environ.get("INA_DESDE", "2015-01-01")
FECHADO = os.environ.get("INA_SALIDA_FECHADA") == "1"


def main() -> None:
    s = sesion()
    r = s.get(f"{BASE}/series", params={"var_id": 2, "format": "json"}, timeout=120)
    series = json.loads(r.content.decode("utf-8"))["rows"]  # la API no declara UTF-8 y requests lo lee como latin-1
    cat = gpd.GeoDataFrame([{
        "series_id": x["id"],
        "estacion_id": x["estacion"]["id"],
        "estacion": x["estacion"]["nombre"],
        "rio": x["estacion"].get("rio"),
        "provincia": x["estacion"].get("provincia"),
        "nivel_alerta": x["estacion"].get("nivel_alerta"),
        "nivel_evacuacion": x["estacion"].get("nivel_evacuacion"),
        "nivel_aguas_bajas": x["estacion"].get("nivel_aguas_bajas"),
        "desde": (x.get("date_range") or {}).get("timestart"),
        "hasta": (x.get("date_range") or {}).get("timeend"),
        "geometry": shape(x["estacion"]["geom"]),
    } for x in series if x["estacion"].get("geom")], crs=4326)
    carpeta = RAW / "ina"
    carpeta.mkdir(parents=True, exist_ok=True)
    cat.to_parquet(carpeta / "series.parquet")
    registrar("INA", "catálogo de series de altura", f"{BASE}/series?var_id=2", carpeta / "series.parquet",
              "GeoParquet", len(cat), "Datos públicos INA, citar fuente")

    con_alerta = cat[cat["nivel_alerta"].notna()]
    hasta = (dt.date.today() + dt.timedelta(days=1)).isoformat()
    obs = []
    for i, sid in enumerate(con_alerta["series_id"], 1):
        r = s.get(f"{BASE}/observaciones", params={
            "series_id": sid, "timestart": DESDE, "timeend": hasta, "format": "json"}, timeout=180)
        if r.ok:
            obs += [(sid, o["timestart"], o["valor"]) for o in r.json()]
        if i % 25 == 0:
            print(f"  {i}/{len(con_alerta)} series", flush=True)
    alturas = pd.DataFrame(obs, columns=["series_id", "fecha", "altura_m"])
    alturas["fecha"] = pd.to_datetime(alturas["fecha"], utc=True)
    nombre = f"alturas_{dt.date.today().isoformat()}.parquet" if FECHADO else "alturas.parquet"
    alturas.to_parquet(carpeta / nombre, index=False)
    registrar("INA", f"alturas diarias desde {DESDE} (series con nivel de alerta)",
              f"{BASE}/observaciones", carpeta / nombre, "Parquet", len(alturas),
              "Datos públicos INA, citar fuente", nota=f"{len(con_alerta)} series")
    print(f"INA: {len(cat)} series, {len(con_alerta)} con alerta, {len(alturas)} observaciones")


if __name__ == "__main__":
    main()

"""Lluvia diaria histórica 2011 → hoy en cada barrio de CABA (reanálisis ERA5 vía Open-Meteo).

Es la variable explicativa del modelo lluvia → reclamos al 147 (anegamientos, sumideros).
Además descarga los polígonos de los 48 barrios porteños (BA Data).

Salida: data/raw/caba/barrios.geojson, data/raw/open_meteo/lluvia_diaria_caba.parquet
"""
import datetime as dt

import geopandas as gpd
import pandas as pd

from comun import RAW, descargar_archivo, registrar, sesion

URL_BARRIOS = ("https://cdn.buenosaires.gob.ar/datosabiertos/datasets/"
               "innovacion-transformacion-digital/barrios/barrios.geojson")
URL_ARCHIVO = "https://archive-api.open-meteo.com/v1/archive"
DESDE = "2011-01-01"


def main() -> None:
    barrios_f = descargar_archivo(URL_BARRIOS, RAW / "caba" / "barrios.geojson")
    barrios = gpd.read_file(barrios_f)
    registrar("BA Data (GCBA)", "barrios de CABA", URL_BARRIOS, barrios_f, "GeoJSON",
              len(barrios), "CC BY 2.5 AR (BA Data)")
    col_nombre = next(c for c in barrios.columns if c.lower() in {"barrio", "nombre"})
    pts = barrios.representative_point()

    hasta = (dt.date.today() - dt.timedelta(days=6)).isoformat()  # ERA5 tiene ~5 días de demora
    r = sesion().get(URL_ARCHIVO, params={
        "latitude": ",".join(f"{y:.4f}" for y in pts.y),
        "longitude": ",".join(f"{x:.4f}" for x in pts.x),
        "start_date": DESDE, "end_date": hasta,
        "daily": "precipitation_sum,precipitation_hours",
        "timezone": "America/Argentina/Buenos_Aires",
    }, timeout=600)
    r.raise_for_status()
    filas = []
    for barrio, resp in zip(barrios[col_nombre], r.json()):
        d = resp["daily"]
        filas.append(pd.DataFrame({"barrio": barrio, "fecha": d["time"],
                                   "lluvia_mm": d["precipitation_sum"],
                                   "horas_lluvia": d["precipitation_hours"]}))
    df = pd.concat(filas, ignore_index=True)
    destino = RAW / "open_meteo" / "lluvia_diaria_caba.parquet"
    df.to_parquet(destino, index=False)
    registrar("Open-Meteo (ERA5)", f"lluvia diaria por barrio de CABA {DESDE} → {hasta}", URL_ARCHIVO,
              destino, "Parquet", len(df), "CC BY 4.0, uso no comercial gratuito",
              nota="reanálisis ERA5 ~25 km: varios barrios comparten celda")
    print(f"Lluvia CABA: {len(barrios)} barrios × {df['fecha'].nunique()} días")


if __name__ == "__main__":
    main()

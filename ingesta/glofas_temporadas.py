"""Caudal de GloFAS (reanálisis vía Open-Meteo) en las estaciones INA con alerta, por temporada nov-feb.

Para el modelo de amenaza: parte del agua de un Niño llega por los ríos grandes (crecidas que vienen
de Brasil y Paraguay), no por la lluvia local. Se usa la misma celda del río elegida para el pronóstico
(glofas_rios.py), así el caudal histórico y el pronosticado salen del mismo modelo.

Temporadas: 2015-16 y 2023-24 (Niños) y 2022-23 (sequía, referencia).
Salida: data/raw/glofas/temporadas.parquet (estacion_id, temporada, caudal_medio_m3s)
"""
import time

import pandas as pd

from comun import RAW, registrar, sesion

URL = "https://flood-api.open-meteo.com/v1/flood"
TEMPORADAS = {"2015_16": ("2015-11-01", "2016-02-29"), "2022_23": ("2022-11-01", "2023-02-28"),
              "2023_24": ("2023-11-01", "2024-02-29")}


def main() -> None:
    celdas = pd.concat(pd.read_parquet(p) for p in sorted((RAW / "glofas").glob("*/estacion_*.parquet"))) \
        .drop_duplicates("estacion_id")[["estacion_id", "lat_celda", "lon_celda"]]
    s = sesion()
    filas = []
    for i, c in enumerate(celdas.itertuples(), 1):
        for t, (ini, fin) in TEMPORADAS.items():
            for intento in range(4):
                r = s.get(URL, params={"latitude": c.lat_celda, "longitude": c.lon_celda,
                                       "daily": "river_discharge", "start_date": ini, "end_date": fin}, timeout=120)
                if r.status_code != 429:
                    break
                print("    cupo agotado, espero 60 s…", flush=True)
                time.sleep(60 * (intento + 1))
            r.raise_for_status()
            q = pd.Series(r.json()["daily"]["river_discharge"], dtype=float)
            filas.append((c.estacion_id, t, q.mean(), q.max()))
            time.sleep(1)
        if i % 20 == 0:
            print(f"  {i}/{len(celdas)} estaciones", flush=True)
    df = pd.DataFrame(filas, columns=["estacion_id", "temporada", "caudal_medio_m3s", "caudal_max_m3s"])
    destino = RAW / "glofas" / "temporadas.parquet"
    df.to_parquet(destino, index=False)
    registrar("Open-Meteo (GloFAS v4 reanálisis)", "caudal nov-feb 2015-16, 2022-23, 2023-24 en estaciones INA",
              URL, destino, "Parquet", len(df), "CC BY 4.0, uso no comercial gratuito")
    print(df.pivot(index="estacion_id", columns="temporada", values="caudal_medio_m3s").describe().round(0))


if __name__ == "__main__":
    main()

"""Caudal diario GloFAS (reanálisis) para calibrar la relación caudal → altura en cada estación del INA.

Ventanas (sep → jun):
- 2015-16: Niño con crecida del Paraná (entrenamiento, rango alto)
- 2021-22: bajante histórica (entrenamiento, rango bajo)
- 2023-24: Niño (validación fuera de muestra)

Se usa la misma celda del río que en el pronóstico (glofas_rios.py). Retoma donde quedó si se agota el
cupo diario de la API gratuita.

Salida: data/raw/glofas/calibracion/estacion_<id>.parquet (fecha, caudal_m3s)
"""
import time

import pandas as pd

from comun import RAW, registrar, sesion

URL = "https://flood-api.open-meteo.com/v1/flood"
VENTANAS = [("2015-09-01", "2016-06-30"), ("2021-09-01", "2022-06-30"), ("2023-09-01", "2024-06-30")]


def main() -> None:
    celdas = pd.concat(pd.read_parquet(p) for p in sorted((RAW / "glofas").glob("20*/estacion_*.parquet"))) \
        .drop_duplicates("estacion_id")[["estacion_id", "lat_celda", "lon_celda"]]
    carpeta = RAW / "glofas" / "calibracion"
    carpeta.mkdir(parents=True, exist_ok=True)
    s = sesion()
    for i, c in enumerate(celdas.itertuples(), 1):
        destino = carpeta / f"estacion_{c.estacion_id}.parquet"
        if destino.exists():
            continue
        partes = []
        for ini, fin in VENTANAS:
            for intento in range(3):
                r = s.get(URL, params={"latitude": c.lat_celda, "longitude": c.lon_celda,
                                       "daily": "river_discharge", "start_date": ini, "end_date": fin}, timeout=120)
                if r.status_code != 429:
                    break
                motivo = r.json().get("reason", "")
                if "Daily" in motivo:
                    raise SystemExit(f"Cupo DIARIO agotado en la estación {i}/{len(celdas)}; volver a correr mañana.")
                print(f"    {motivo[:60]} — espero…", flush=True)
                time.sleep(90 * (intento + 1))
            r.raise_for_status()
            d = r.json()["daily"]
            partes.append(pd.DataFrame({"fecha": d["time"], "caudal_m3s": d["river_discharge"]}))
            time.sleep(1)
        pd.concat(partes).assign(estacion_id=c.estacion_id).to_parquet(destino, index=False)
        if i % 10 == 0:
            print(f"  {i}/{len(celdas)} estaciones", flush=True)
    n = len(list(carpeta.glob("estacion_*.parquet")))
    registrar("Open-Meteo (GloFAS v4 reanálisis)", "caudal diario 2015-16, 2021-22, 2023-24 para calibración",
              URL, carpeta, "Parquet (1 archivo por estación)", n, "CC BY 4.0, uso no comercial gratuito")
    print(f"Calibración: {n}/{len(celdas)} estaciones")


if __name__ == "__main__":
    main()

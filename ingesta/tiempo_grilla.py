"""Grilla del tiempo sobre Argentina (lluvia, viento, ráfagas y temperatura máxima, 16 días) para las capas del mapa.

Open-Meteo (mejor modelo disponible por punto, gratis para uso no comercial), un punto cada 1° alrededor del país.
Se corre todos los días en GitHub Actions junto con el pronóstico corto.

Salida: web/datos/tiempo.json  (valores enteros o con 1 decimal, orden: día → fila (de norte a sur) → columna)
  {"corrida": "AAAA-MM-DD", "dias": [...], "lon0": -74, "lat0": -21, "paso": 1, "nx": 22, "ny": 35,
   "lluvia": [...mm], "viento": [...km/h], "rafaga": [...km/h], "direccion": [...° de donde sopla], "temp": [...°C]}
  null en los puntos lejos del país.
"""
import json
import time
from pathlib import Path

import numpy as np

from comun import RAIZ, hoy, sesion

URL = "https://api.open-meteo.com/v1/forecast"
LON0, LAT0, PASO, NX, NY = -74.0, -21.0, 1.0, 22, 35     # -74…-53 (E) y -21…-55 (S)
LOTE = 100
VARIABLES = {"precipitation_sum": "lluvia", "wind_speed_10m_max": "viento", "wind_gusts_10m_max": "rafaga",
             "wind_direction_10m_dominant": "direccion", "temperature_2m_max": "temp"}
SALIDA = RAIZ / "web" / "datos" / "tiempo.json"
PUNTOS = RAIZ / "data" / "referencia" / "grilla_tiempo_puntos.json"   # índices de la grilla cercanos al país (se calcula una vez)


def puntos_cercanos():
    pts = [(LON0 + i * PASO, LAT0 - j * PASO) for j in range(NY) for i in range(NX)]
    if not PUNTOS.exists():   # requiere los límites originales (solo en la Mac)
        import geopandas as gpd
        from shapely.geometry import Point
        pais = gpd.read_parquet(RAIZ / "data" / "raw" / "limites" / "provincias.parquet").to_crs(5345)
        tierra = pais.geometry.union_all().buffer(130_000).simplify(5000)   # ~1,2° alrededor del país
        marca = gpd.GeoSeries([Point(p) for p in pts], crs=4326).to_crs(5345).within(tierra)
        PUNTOS.write_text(json.dumps([k for k, d in enumerate(marca) if d]))
    return pts, set(json.loads(PUNTOS.read_text()))


def main() -> None:
    pts, dentro = puntos_cercanos()
    idx = sorted(dentro)
    s = sesion()
    datos = {v: None for v in VARIABLES.values()}
    dias = None
    for a in range(0, len(idx), LOTE):
        lote = idx[a:a + LOTE]
        for intento in range(4):
            r = s.get(URL, params={
                "latitude": ",".join(str(pts[k][1]) for k in lote), "longitude": ",".join(str(pts[k][0]) for k in lote),
                "daily": ",".join(VARIABLES), "forecast_days": 16, "timezone": "America/Argentina/Buenos_Aires"}, timeout=120)
            if r.status_code != 429:
                break
            time.sleep(60 * (intento + 1))
        r.raise_for_status()
        resp = r.json()
        resp = resp if isinstance(resp, list) else [resp]
        for k, d in zip(lote, resp):
            dd = d["daily"]
            dias = dias or dd["time"]
            for var, nombre in VARIABLES.items():
                if datos[nombre] is None:
                    datos[nombre] = np.full((len(dias), NY * NX), np.nan)
                datos[nombre][:, k] = np.array(dd[var], dtype=float)
        time.sleep(1)
    salida = {"corrida": hoy(), "dias": dias, "lon0": LON0, "lat0": LAT0, "paso": PASO, "nx": NX, "ny": NY}
    for nombre, m in datos.items():
        dec = 0 if nombre in ("viento", "rafaga", "direccion") else 1
        salida[nombre] = [None if np.isnan(v) else round(float(v), dec) if dec else int(round(float(v))) for v in m.ravel()]
    SALIDA.write_text(json.dumps(salida, separators=(",", ":")))
    print(f"Grilla del tiempo: {len(idx)} puntos × {len(dias)} días, {SALIDA.stat().st_size / 1e3:.0f} KB")


if __name__ == "__main__":
    main()

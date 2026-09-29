"""Pronóstico de caudal GloFAS (vía Open-Meteo Flood API) en las estaciones del INA con nivel de alerta.

Problema: la coordenada de la estación no siempre cae en la celda del río en la grilla de GloFAS (5 km).
Solución: se consulta la estación y sus 8 celdas vecinas (consulta liviana, 30 días, 1 variable) y se
elige la de mayor caudal medio (el cauce principal concentra el caudal). Después se pide el pronóstico
completo (210 días, ensamble) solo para esa celda. Queda documentado como supuesto en la metodología.

La API gratuita limita consultas por minuto/hora/día: el script hace pausas y guarda cada estación
por separado, así puede retomar donde quedó si se corta.

Salida: data/raw/glofas/<AAAA-MM-DD>/estacion_<id>.parquet
"""
import time

import geopandas as gpd
import pandas as pd

from comun import RAW, hoy, registrar, sesion

URL = "https://flood-api.open-meteo.com/v1/flood"
PASO = 0.05  # resolución de GloFAS v4
VARIABLES = ["river_discharge", "river_discharge_mean", "river_discharge_median",
             "river_discharge_p25", "river_discharge_p75", "river_discharge_min", "river_discharge_max"]
PAUSA_S = 3


def _get(s, params):
    """GET con espera larga ante 429 (cupo agotado)."""
    for intento in range(4):
        r = s.get(URL, params=params, timeout=180)
        if r.status_code != 429:
            r.raise_for_status()
            return r.json()
        espera = 60 * (intento + 1)
        print(f"    cupo de la API agotado, espero {espera}s…", flush=True)
        time.sleep(espera)
    raise RuntimeError("cupo diario agotado; volver a correr más tarde (retoma donde quedó)")


def main() -> None:
    est = gpd.read_parquet(RAW / "ina" / "series.parquet")
    est = est[est["nivel_alerta"].notna()].drop_duplicates("estacion_id")
    carpeta = RAW / "glofas" / hoy()
    carpeta.mkdir(parents=True, exist_ok=True)
    s = sesion()
    s.mount("https://", __import__("requests").adapters.HTTPAdapter())  # sin reintentos automáticos: los manejamos acá

    for i, (_, e) in enumerate(est.iterrows(), 1):
        destino = carpeta / f"estacion_{e['estacion_id']}.parquet"
        if destino.exists():
            continue
        lats = [e.geometry.y + dy * PASO for dy in (-1, 0, 1) for dx in (-1, 0, 1)]
        lons = [e.geometry.x + dx * PASO for dy in (-1, 0, 1) for dx in (-1, 0, 1)]
        vecinas = _get(s, {"latitude": ",".join(f"{v:.3f}" for v in lats),
                           "longitude": ",".join(f"{v:.3f}" for v in lons),
                           "daily": "river_discharge_mean", "forecast_days": 30})
        mejor = max(vecinas, key=lambda x: pd.Series(x["daily"]["river_discharge_mean"]).mean(skipna=True) or 0)
        time.sleep(PAUSA_S)
        completo = _get(s, {"latitude": mejor["latitude"], "longitude": mejor["longitude"],
                            "daily": ",".join(VARIABLES), "forecast_days": 210})
        df = pd.DataFrame(completo["daily"]).rename(columns={"time": "fecha"})
        df["estacion_id"] = e["estacion_id"]
        df["lat_celda"], df["lon_celda"] = mejor["latitude"], mejor["longitude"]
        df["fecha_corrida"] = hoy()
        df.to_parquet(destino, index=False)
        print(f"  {i}/{len(est)} {e['estacion']} ({e['rio']})", flush=True)
        time.sleep(PAUSA_S)

    partes = sorted(carpeta.glob("estacion_*.parquet"))
    n = sum(len(pd.read_parquet(p)) for p in partes)
    registrar("Open-Meteo (GloFAS v4)", "pronóstico de caudal 210 días en estaciones INA con alerta", URL,
              carpeta, "Parquet (1 archivo por estación)", n, "CC BY 4.0, uso no comercial gratuito",
              nota=f"{len(partes)}/{len(est)} estaciones; celda = máximo caudal medio en 3x3")
    print(f"GloFAS: {len(partes)}/{len(est)} estaciones")


if __name__ == "__main__":
    main()

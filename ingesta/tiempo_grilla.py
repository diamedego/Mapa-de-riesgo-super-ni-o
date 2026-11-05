"""Grilla del tiempo sobre Argentina para las capas del mapa: lluvia, viento y temperatura.

Open-Meteo (mejor modelo disponible por punto, gratis para uso no comercial), un punto cada 0,5° (~50 km) sobre el
país y una franja de 45 km alrededor (para que la interpolación no se corte en el borde). Dos horizontes:
- diario, 16 días: lluvia, probabilidad de lluvia, máxima y mínima, viento máximo, ráfaga máxima,
  dirección dominante y código de tiempo (WMO);
- cada 3 horas, próximas 48 h: lluvia de las 3 h siguientes, temperatura, viento, dirección y ráfaga máxima.

Se corre dos veces por día en GitHub Actions (después de las corridas 00 y 12 UTC de los modelos).

Salida: web/datos/tiempo.json. Cada variable va como bytes en base64 (uint8 o uint16, little endian) con escala y
desplazamiento: valor = crudo × escala + desplazamiento; el crudo máximo (255 o 65535) es "sin dato".
Orden de los bytes: paso de tiempo → punto (en el orden de "puntos", índices de la grilla fila × nx + columna).
"""
import base64
import datetime as dt
import json
import time

import numpy as np

from comun import RAIZ, sesion

URL = "https://api.open-meteo.com/v1/forecast"
LON0, LAT0, PASO, NX, NY = -74.0, -21.0, 0.5, 43, 70      # -74…-53 (E) y -21…-55,5 (S)
LOTE = 100
SALIDA = RAIZ / "web" / "datos" / "tiempo.json"
PUNTOS = RAIZ / "data" / "referencia" / "grilla_tiempo_puntos_05.json"   # se calcula una vez (necesita los límites)

DIARIAS = {   # variable de Open-Meteo: (nombre, tipo, escala, desplazamiento)
    "precipitation_sum": ("lluvia", "u16", 0.1, 0),
    "precipitation_probability_max": ("prob", "u8", 1, 0),
    "temperature_2m_max": ("tmax", "u8", 0.5, -40),
    "temperature_2m_min": ("tmin", "u8", 0.5, -40),
    "wind_speed_10m_max": ("viento", "u8", 1, 0),
    "wind_gusts_10m_max": ("rafaga", "u8", 1, 0),
    "wind_direction_10m_dominant": ("dir", "u8", 360 / 256, 0),
    "weather_code": ("codigo", "u8", 1, 0),
}
HORARIAS = {
    "precipitation": ("lluvia", "u16", 0.1, 0),     # se suma en las 3 h siguientes
    "temperature_2m": ("temp", "u8", 0.5, -40),
    "wind_speed_10m": ("viento", "u8", 1, 0),
    "wind_direction_10m": ("dir", "u8", 360 / 256, 0),
    "wind_gusts_10m": ("rafaga", "u8", 1, 0),       # máximo de las 3 h siguientes
}
PASOS_3H = 17   # ahora, +3 h, …, +48 h


def puntos():
    """Índices de la grilla a pedir (país + 45 km) y cuáles caen dentro del país (para las partículas de viento)."""
    if not PUNTOS.exists():
        import geopandas as gpd
        from shapely.geometry import Point, box
        pais = gpd.read_parquet(RAIZ / "data" / "raw" / "limites" / "provincias.parquet")
        pais = pais.clip(box(-75, -56, -52, -21)).to_crs(5345).geometry.union_all()
        cerca, dentro = pais.buffer(45_000).simplify(2000), pais.buffer(5_000).simplify(2000)
        pts = gpd.GeoSeries([Point(LON0 + i * PASO, LAT0 - j * PASO) for j in range(NY) for i in range(NX)],
                            crs=4326).to_crs(5345)
        idx = [int(k) for k in np.flatnonzero(pts.within(cerca).to_numpy())]
        den = [int(k) for k in np.flatnonzero(pts.within(dentro).to_numpy())]
        PUNTOS.write_text(json.dumps({"puntos": idx, "dentro": den}))
    d = json.loads(PUNTOS.read_text())
    return d["puntos"], d["dentro"]


def codificar(valores: np.ndarray, tipo: str, escala: float, desplaz: float) -> str:
    maximo = 255 if tipo == "u8" else 65535
    crudo = np.round((valores - desplaz) / escala)
    crudo = np.where(np.isnan(crudo), maximo, np.clip(crudo, 0, maximo - 1)).astype("<u1" if tipo == "u8" else "<u2")
    return base64.b64encode(crudo.tobytes()).decode()


def pedir(s, lote_pts):
    for intento in range(5):
        r = s.get(URL, params={
            "latitude": ",".join(f"{y:.2f}" for _, y in lote_pts), "longitude": ",".join(f"{x:.2f}" for x, _ in lote_pts),
            "daily": ",".join(DIARIAS), "hourly": ",".join(HORARIAS), "forecast_days": 16, "forecast_hours": 51,
            "timezone": "America/Argentina/Buenos_Aires"}, timeout=180)
        if r.status_code != 429:
            r.raise_for_status()
            resp = r.json()
            return resp if isinstance(resp, list) else [resp]
        time.sleep(60 * (intento + 1))
    r.raise_for_status()


def main() -> None:
    idx, dentro = puntos()
    coords = [(LON0 + (k % NX) * PASO, LAT0 - (k // NX) * PASO) for k in idx]
    s = sesion()
    n = len(idx)
    diario = {nombre: np.full((16, n), np.nan) for nombre, *_ in DIARIAS.values()}
    horario = {nombre: np.full((PASOS_3H, n), np.nan) for nombre, *_ in HORARIAS.values()}
    dias = horas = None
    for a in range(0, n, LOTE):
        for j, d in enumerate(pedir(s, coords[a:a + LOTE])):
            p = a + j
            dd, hh = d["daily"], d["hourly"]
            dias = dias or dd["time"]
            for var, (nombre, *_) in DIARIAS.items():
                diario[nombre][:, p] = np.array(dd[var], dtype=float)[:16]
            h = {var: np.array(hh[var], dtype=float) for var in HORARIAS}
            horas = horas or hh["time"][0:3 * PASOS_3H:3]
            for k in range(PASOS_3H):
                v = slice(3 * k, 3 * k + 3)
                horario["lluvia"][k, p] = np.nansum(h["precipitation"][v]) if len(h["precipitation"][v]) else np.nan
                horario["temp"][k, p] = h["temperature_2m"][3 * k]
                horario["viento"][k, p] = h["wind_speed_10m"][3 * k]
                horario["dir"][k, p] = h["wind_direction_10m"][3 * k]
                horario["rafaga"][k, p] = np.nanmax(h["wind_gusts_10m"][v])
        time.sleep(1)

    def bloque(tabla, especif):
        return {nombre: {"tipo": tipo, "escala": round(esc, 6), "desplaz": des, "b64": codificar(tabla[nombre], tipo, esc, des)}
                for nombre, tipo, esc, des in especif.values()}
    salida = {
        "generado": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "fuente": "Open-Meteo.com (mejor modelo por punto)",
        "lon0": LON0, "lat0": LAT0, "paso": PASO, "nx": NX, "ny": NY,
        "puntos": idx, "dentro": dentro, "dias": dias, "horas": horas,
        "diario": bloque(diario, DIARIAS), "horario": bloque(horario, HORARIAS),
    }
    SALIDA.write_text(json.dumps(salida, separators=(",", ":")))
    print(f"Grilla del tiempo: {n} puntos, {len(dias)} días y {len(horas)} pasos de 3 h; "
          f"{SALIDA.stat().st_size / 1e3:.0f} KB; lluvia máx. diaria {np.nanmax(diario['lluvia']):.0f} mm, "
          f"ráfaga máx. {np.nanmax(diario['rafaga']):.0f} km/h, tmax {np.nanmax(diario['tmax']):.0f} °C")


if __name__ == "__main__":
    main()

"""Pronóstico diario de lluvia a 16 días (ECMWF IFS vía Open-Meteo) por gobierno local.

Horizonte corto del motor de actualización: se corre todos los días (GitHub Actions) y cada corrida
se guarda con su fecha, para después verificarla contra la lluvia observada (retroalimentación).
Incluye los 3 días pasados (lluvia ya ocurrida según el modelo) para empalmar con lo observado.

Salida: data/raw/pronostico_corto/<AAAA-MM-DD>.parquet (cmu, fecha, lluvia_mm, prob_lluvia_pct)
"""
import time

import pandas as pd

from comun import RAIZ, RAW, hoy, registrar, sesion

URL = "https://api.open-meteo.com/v1/forecast"
LOTE = 100
PUNTOS = RAIZ / "data" / "referencia" / "puntos_gobiernos_locales.csv"


def main() -> None:
    pts = pd.read_csv(PUNTOS, dtype={"cmu": str})
    s = sesion()
    filas = []
    for i in range(0, len(pts), LOTE):
        lote = pts.iloc[i:i + LOTE]
        for intento in range(3):
            r = s.get(URL, params={
                "latitude": ",".join(map(str, lote["lat"])), "longitude": ",".join(map(str, lote["lon"])),
                "daily": "precipitation_sum,precipitation_probability_max", "models": "ecmwf_ifs025",
                "forecast_days": 16, "past_days": 3, "timezone": "America/Argentina/Buenos_Aires"}, timeout=120)
            if r.status_code != 429:
                break
            time.sleep(60 * (intento + 1))
        r.raise_for_status()
        resp = r.json()
        resp = resp if isinstance(resp, list) else [resp]
        for cmu, d in zip(lote["cmu"], resp):
            dd = d["daily"]
            filas.append(pd.DataFrame({"cmu": cmu, "fecha": dd["time"], "lluvia_mm": dd["precipitation_sum"],
                                       "prob_lluvia_pct": dd.get("precipitation_probability_max")}))
        time.sleep(1)
    df = pd.concat(filas, ignore_index=True)
    df["fecha_corrida"] = hoy()
    destino = RAW / "pronostico_corto" / f"{hoy()}.parquet"
    destino.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(destino, index=False)
    registrar("Open-Meteo (ECMWF IFS 0.25°)", "pronóstico diario de lluvia 16 días por gobierno local", URL,
              destino, "Parquet", len(df), "CC BY 4.0, uso no comercial gratuito")
    print(f"Pronóstico corto: {df['cmu'].nunique()} gobiernos locales × {df['fecha'].nunique()} días")


if __name__ == "__main__":
    main()

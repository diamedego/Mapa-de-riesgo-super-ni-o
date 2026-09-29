"""Pronóstico estacional ECMWF SEAS5 (vía Open-Meteo) para cada gobierno local de Argentina.

Guarda una "foto" por fecha de corrida: así se puede comparar cómo cambió el pronóstico
de un mes a otro (SEAS5 se actualiza el día 5 de cada mes).

Salida: data/raw/open_meteo/estacional_<AAAA-MM-DD>.parquet en formato largo
(cmu, mes, variable, valor).
"""
import geopandas as gpd
import pandas as pd

from comun import RAW, hoy, registrar, sesion

URL = "https://seasonal-api.open-meteo.com/v1/seasonal"
VARIABLES = [
    "precipitation_mean", "precipitation_anomaly",
    "soil_moisture_0_to_7cm_mean",
    "runoff_mean", "runoff_anomaly",
    "temperature_2m_anomaly",
]
LOTE = 100  # la API acepta varias coordenadas separadas por coma


def puntos_consulta() -> pd.DataFrame:
    """Un punto representativo (dentro del polígono) por gobierno local del INDEC."""
    gl = gpd.read_parquet(RAW / "limites" / "gobiernos_locales.parquet")
    pts = gl.representative_point()
    return pd.DataFrame({"cmu": gl["cmu"], "lat": pts.y.round(4), "lon": pts.x.round(4)})


def main() -> None:
    s = sesion()
    pts = puntos_consulta()
    filas = []
    for i in range(0, len(pts), LOTE):
        lote = pts.iloc[i:i + LOTE]
        r = s.get(URL, params={
            "latitude": ",".join(map(str, lote["lat"])),
            "longitude": ",".join(map(str, lote["lon"])),
            "monthly": ",".join(VARIABLES),
        }, timeout=120)
        r.raise_for_status()
        respuestas = r.json()
        if isinstance(respuestas, dict):
            respuestas = [respuestas]
        for cmu, resp in zip(lote["cmu"], respuestas):
            m = resp["monthly"]
            for var in VARIABLES:
                for mes, valor in zip(m["time"], m[var]):
                    filas.append((cmu, mes, var, valor))
        print(f"  {min(i + LOTE, len(pts))}/{len(pts)} gobiernos locales", flush=True)

    df = pd.DataFrame(filas, columns=["cmu", "mes", "variable", "valor"])
    df["fecha_corrida"] = hoy()
    destino = RAW / "open_meteo" / f"estacional_{hoy()}.parquet"
    destino.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(destino, index=False)
    registrar("Open-Meteo (ECMWF SEAS5)", "pronóstico estacional mensual por gobierno local",
              URL, destino, "Parquet", len(df), "CC BY 4.0, uso no comercial gratuito",
              nota=f"{pts.shape[0]} puntos; variables: {', '.join(VARIABLES)}")


if __name__ == "__main__":
    main()

"""Pronóstico estacional ECMWF SEAS5 (vía Open-Meteo) para cada gobierno local de Argentina.

Guarda una "foto" por fecha de corrida: así se puede comparar cómo cambió el pronóstico
de un mes a otro (SEAS5 se actualiza el día 5 de cada mes).

Salida: data/raw/open_meteo/estacional_<AAAA-MM-DD>.parquet en formato largo
(cmu, mes, variable, valor).
"""
import geopandas as gpd
import pandas as pd

from comun import RAIZ, RAW, hoy, registrar, sesion

URL = "https://seasonal-api.open-meteo.com/v1/seasonal"
VARIABLES = [
    "precipitation_mean", "precipitation_anomaly",
    "soil_moisture_0_to_7cm_mean",
    "runoff_mean", "runoff_anomaly",
    "temperature_2m_anomaly",
]
LOTE = 100  # la API acepta varias coordenadas separadas por coma


PUNTOS = RAIZ / "data" / "referencia" / "puntos_gobiernos_locales.csv"


def puntos_consulta() -> pd.DataFrame:
    """Un punto representativo (dentro del polígono) por gobierno local del INDEC.

    Se guarda en data/referencia (versionado) para que GitHub Actions no necesite los polígonos.
    """
    if PUNTOS.exists():
        return pd.read_csv(PUNTOS, dtype={"cmu": str})
    gl = gpd.read_parquet(RAW / "limites" / "gobiernos_locales.parquet")
    pts = gl.representative_point()
    df = pd.DataFrame({"cmu": gl["cmu"], "lat": pts.y.round(4), "lon": pts.x.round(4)})
    PUNTOS.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(PUNTOS, index=False)
    return df


def puntos_departamentos() -> pd.DataFrame:
    """Un punto por departamento del INDEC (para el modelo de dengue, que trabaja por departamento)."""
    archivo = RAIZ / "data" / "referencia" / "puntos_departamentos.csv"
    if archivo.exists():
        return pd.read_csv(archivo, dtype={"cde": str})
    dep = gpd.read_parquet(RAW / "limites" / "departamentos.parquet")
    pts = dep.representative_point()
    df = pd.DataFrame({"cde": dep["cde"], "lat": pts.y.round(4), "lon": pts.x.round(4)})
    df = df[df["lat"] > -56]  # sin Antártida
    df.to_csv(archivo, index=False)
    return df


def main(unidad: str = "gobiernos_locales") -> None:
    s = sesion()
    pts = puntos_consulta() if unidad == "gobiernos_locales" else puntos_departamentos()
    id_col = "cmu" if unidad == "gobiernos_locales" else "cde"
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
        for cmu, resp in zip(lote[id_col], respuestas):
            m = resp["monthly"]
            for var in VARIABLES:
                for mes, valor in zip(m["time"], m[var]):
                    filas.append((cmu, mes, var, valor))
        print(f"  {min(i + LOTE, len(pts))}/{len(pts)} {unidad}", flush=True)

    df = pd.DataFrame(filas, columns=[id_col, "mes", "variable", "valor"])
    df["fecha_corrida"] = hoy()
    sufijo = "" if unidad == "gobiernos_locales" else "departamentos_"
    destino = RAW / "open_meteo" / f"estacional_{sufijo}{hoy()}.parquet"
    destino.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(destino, index=False)
    registrar("Open-Meteo (ECMWF SEAS5)", f"pronóstico estacional mensual por {unidad}",
              URL, destino, "Parquet", len(df), "CC BY 4.0, uso no comercial gratuito",
              nota=f"{pts.shape[0]} puntos; variables: {', '.join(VARIABLES)}")
    print(f"{unidad}: {pts.shape[0]} puntos, {len(df)} valores")


if __name__ == "__main__":
    import sys
    main(sys.argv[1] if len(sys.argv) > 1 else "gobiernos_locales")

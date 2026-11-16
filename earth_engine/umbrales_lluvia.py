"""Umbrales locales de lluvia para el riesgo de los próximos días: la lluvia de 3 días seguidos que en cada lugar se supera, en
promedio, una vez cada 2, 5 y 10 años.

Se miden con el clima del propio modelo del pronóstico, como hace el ECMWF con su índice de pronósticos extremos (EFI): el
pronóstico de lluvia sale del ECMWF (ensamble IFS) y estos umbrales, del reanálisis ERA5-Land del mismo centro, así la comparación
es pareja (un modelo suaviza los picos: compararlo con pluviómetros o satélite exageraría o achicaría las probabilidades).

Cálculo por celda de 0,1°: lluvia diaria de ERA5-Land 1995-2024 → suma de 3 días seguidos → máximo de cada año (30 máximos) →
ajuste de Gumbel por momentos: x_T = μ − σ·√6/π·(0,5772 + ln(−ln(1 − 1/T))). T2 es prácticamente la mediana de los máximos.

Salida: data/procesado/umbrales_lluvia.npy (bandas T2, T5, T10, en mm) y data/referencia/umbrales_lluvia_municipios.parquet
(valor en el centro de cada gobierno local).
Uso: .venv/bin/python earth_engine/umbrales_lluvia.py [anios desde hasta | ajustar]
"""
import sys
import time
from pathlib import Path

import ee
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import PROYECTO_EE  # noqa: E402
import lluvia_ninos as LN  # noqa: E402  (misma grilla y descarga)

RAIZ = Path(__file__).resolve().parents[1]
CRUDO = RAIZ / "data" / "procesado" / "umbrales_lluvia"
ANIOS = list(range(1995, 2025))


def maximo_anual(anio: int) -> np.ndarray:
    """Máximo de la suma de 3 días seguidos en el año (mm), por celda."""
    # Dos tramos del año que se superponen 2 días (ninguna ventana de 3 días queda partida); cada pedido, de a franjas de 8,5°
    tramos = [(f"{anio}-01-01", f"{anio}-07-03"), (f"{anio}-07-01", f"{anio + 1}-01-01")]
    partes = []
    for j in range(0, LN.ALTO, 85):
        mx = None
        for desde, hasta in tramos:
            era = ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR").filterDate(desde, hasta).select("total_precipitation_sum")
            img = era.map(lambda i: i.multiply(10000).round().toInt16()).toBands()   # décimas de mm
            a = LN.bajar(img, LN.OESTE, LN.NORTE - j * LN.PASO, LN.ANCHO, min(85, LN.ALTO - j))
            d = np.stack([a[n] for n in a.dtype.names]).astype(np.float32) / 10   # días × filas × columnas
            m = (d[:-2] + d[1:-1] + d[2:]).max(axis=0)
            mx = m if mx is None else np.maximum(mx, m)
        partes.append(mx)
    return np.concatenate(partes, axis=0)


def anios(desde: int, hasta: int) -> None:
    CRUDO.mkdir(parents=True, exist_ok=True)
    for anio in range(desde, hasta + 1):
        f = CRUDO / f"max3d_{anio}.npy"
        if f.exists():
            continue
        t = time.time()
        np.save(f, maximo_anual(anio))
        print(f"{anio}: {time.time() - t:.0f} s", flush=True)


def ajustar() -> None:
    import geopandas as gpd
    import pandas as pd
    M = np.stack([np.load(CRUDO / f"max3d_{a}.npy") for a in ANIOS])
    M[M < 0] = np.nan   # celdas sin dato de ERA5-Land (mar, grandes lagos): vienen con un valor de relleno negativo
    mu, sd = np.nanmean(M, axis=0), np.nanstd(M, axis=0, ddof=1)
    alfa = sd * np.sqrt(6) / np.pi
    gumbel = lambda T: mu - alfa * (0.5772 + np.log(-np.log(1 - 1 / T)))
    U = np.stack([gumbel(2), gumbel(5), gumbel(10)]).astype(np.float32)
    np.save(RAIZ / "data" / "procesado" / "umbrales_lluvia.npy", U)
    # El mismo punto de consulta que usa el riesgo diario (en las zonas rurales, el centro de su población)
    mun = pd.read_csv(RAIZ / "data" / "referencia" / "puntos_gobiernos_locales.csv", dtype={"cmu": str})
    c = gpd.GeoSeries(gpd.points_from_xy(mun["lon"], mun["lat"]), crs=4326)
    col = ((c.x - LN.OESTE) / LN.PASO).astype(int).clip(0, LN.ANCHO - 1).values
    fil = ((LN.NORTE - c.y) / LN.PASO).astype(int).clip(0, LN.ALTO - 1).values
    cmu = mun["cmu"]
    # Si el centro cae en una celda sin dato (costa, laguna), el promedio de las celdas con dato en 5 × 5 alrededor
    def valor(k, f, c):
        v = U[k, f, c]
        return v if np.isfinite(v) else np.nanmean(U[k, max(0, f - 2):f + 3, max(0, c - 2):c + 3])
    vals = np.array([[valor(k, f, c) for f, c in zip(fil, col)] for k in range(3)])
    out = pd.DataFrame({"cmu": cmu.values, "lon": c.x.round(3).values, "lat": c.y.round(3).values,
                        "t2": vals[0].round(1), "t5": vals[1].round(1), "t10": vals[2].round(1)})
    out.to_parquet(RAIZ / "data" / "referencia" / "umbrales_lluvia_municipios.parquet")
    print(out.describe().round(1))


if __name__ == "__main__":
    ee.Initialize(project=PROYECTO_EE)
    if sys.argv[1] == "anios":
        anios(int(sys.argv[2]), int(sys.argv[3]))
    else:
        ajustar()

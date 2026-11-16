"""Umbrales de lluvia diaria con el método del SMN (Nota Técnica SMN 2021-109, «Definición de umbrales meteorológicos para el
nuevo sistema de alertas»), calculados por celda de 0,1° en lugar de por región.

El SMN parte de la lluvia diaria (24 h) de sus estaciones 1961-2014: percentiles de cada mes y se queda con el mes más lluvioso.
Amarillo = percentil 90; naranja = percentil 99 (lo subieron desde el 95 para separarlo del amarillo); rojo = cerca del valor
extremo de la estación. Redondea a múltiplos de 5 mm y agrupa por región.

Acá, lo mismo con ERA5-Land diario 1991-2020 (el clima del mismo centro que hace el pronóstico, ECMWF, así la comparación es
pareja: un modelo suaviza los picos):
- amarillo: percentil 90 de los días con lluvia (≥ 1 mm) del mes en que es más alto;
- naranja: percentil 99, igual;
- rojo: la lluvia diaria que se supera una vez cada 10 años (Gumbel sobre los 30 máximos anuales), nunca menos que naranja + 10 mm;
todos redondeados a múltiplos de 5 mm.

Salida: data/procesado/umbrales_smn.npy (amarillo, naranja, rojo × filas × columnas, mm) y data/referencia/umbrales_smn_municipios.parquet
(valor en el punto de consulta de cada lugar). Uso: .venv/bin/python earth_engine/umbrales_smn.py
"""
import sys
from pathlib import Path

import ee
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import PROYECTO_EE  # noqa: E402
import lluvia_ninos as LN  # noqa: E402  (misma grilla y descarga)

RAIZ = Path(__file__).resolve().parents[1]
CRUDO = RAIZ / "data" / "procesado" / "umbrales_smn"
DIARIO = "ECMWF/ERA5_LAND/DAILY_AGGR"
ANIOS = range(1991, 2021)


def dias_anio(anio: int) -> np.ndarray:
    """Lluvia de cada día del año (décimas de mm, Int16) en la grilla: días × filas × columnas. Earth Engine no alcanza a sacar
    percentiles de 30 años de una vez (se queda sin memoria): se baja año por año, en franjas, y se calculan acá."""
    semestres = []
    for desde, hasta in [(f"{anio}-01-01", f"{anio}-07-01"), (f"{anio}-07-01", f"{anio + 1}-01-01")]:   # 365 bandas juntas no entran en un pedido
        era = ee.ImageCollection(DIARIO).filterDate(desde, hasta).select("total_precipitation_sum")
        img = era.map(lambda i: i.multiply(10000).round().toInt16()).toBands()
        partes = []
        for j in range(0, LN.ALTO, 85):
            a = LN.bajar(img, LN.OESTE, LN.NORTE - j * LN.PASO, LN.ANCHO, min(85, LN.ALTO - j))
            partes.append(np.stack([a[n] for n in a.dtype.names]))
        semestres.append(np.concatenate(partes, axis=1))
    return np.concatenate(semestres, axis=0)


def main() -> None:
    ee.Initialize(project=PROYECTO_EE)
    CRUDO.mkdir(parents=True, exist_ok=True)
    for a in ANIOS:   # guardado por año: si se corta, sigue donde quedó
        f = CRUDO / f"dias_{a}.npy"
        if not f.exists():
            np.save(f, dias_anio(a))
            print(f"{a} listo", flush=True)
    def anio(a):
        D = np.load(CRUDO / f"dias_{a}.npy", mmap_mode="r")
        mes = np.arange(np.datetime64(f"{a}-01-01"), np.datetime64(f"{a + 1}-01-01"))[:D.shape[0]].astype("datetime64[M]").astype(int) % 12
        return D, mes
    maximos = [np.load(CRUDO / f"dias_{a}.npy", mmap_mode="r").max(axis=0).astype(np.float32) / 10 for a in ANIOS]
    P = []
    for m in range(12):   # de a un mes (los 30 años juntos no entran en memoria)
        M = np.concatenate([D[mes == m] for D, mes in map(anio, ANIOS)]).astype(np.float32) / 10
        M[M < 1] = np.nan   # solo los días con lluvia (≥ 1 mm); las celdas sin dato vienen negativas
        P += list(np.nanpercentile(M, [90, 99], axis=0))
        del M
    P, X = np.stack(P), np.stack(maximos)
    p90, p99 = np.nanmax(P[0::2], axis=0), np.nanmax(P[1::2], axis=0)
    X[X < 0] = np.nan
    mu, sd = np.nanmean(X, axis=0), np.nanstd(X, axis=0, ddof=1)
    t10 = mu - sd * np.sqrt(6) / np.pi * (0.5772 + np.log(-np.log(1 - 1 / 10)))
    redondo = lambda v: np.round(v / 5) * 5  # noqa: E731
    am, na = redondo(p90), redondo(p99)
    ro = np.maximum(redondo(t10), na + 10)
    U = np.stack([am, na, ro]).astype(np.float32)
    np.save(RAIZ / "data" / "procesado" / "umbrales_smn.npy", U)
    pts = pd.read_csv(RAIZ / "data" / "referencia" / "puntos_gobiernos_locales.csv", dtype={"cmu": str})
    col = ((pts.lon - LN.OESTE) / LN.PASO).astype(int).clip(0, LN.ANCHO - 1).values
    fil = ((LN.NORTE - pts.lat) / LN.PASO).astype(int).clip(0, LN.ALTO - 1).values

    def valor(k, f_, c_):   # celda sin dato (costa, laguna): el promedio de las vecinas en 5 × 5
        v = U[k, f_, c_]
        return v if np.isfinite(v) else np.nanmean(U[k, max(0, f_ - 2):f_ + 3, max(0, c_ - 2):c_ + 3])
    out = pd.DataFrame({"cmu": pts.cmu, **{n: [valor(k, a, b) for a, b in zip(fil, col)] for k, n in enumerate(["amarillo", "naranja", "rojo"])}})
    out.to_parquet(RAIZ / "data" / "referencia" / "umbrales_smn_municipios.parquet", index=False)
    print(out.describe().round(0).to_string())


if __name__ == "__main__":
    main()

"""Calibración de los umbrales de lluvia del riesgo contra las alertas del SMN (lo que se publica y se ve en los noticieros).

Problema (17-nov-2026): con los umbrales del SMN calculados en ERA5-Land, el ensamble del ECMWF (celdas de ~25 km) casi nunca
llega a superarlos en tormentas aisladas: de 1.656 municipios con alerta amarilla del SMN, el modelo daba ≥ 10 % de chance a 184.
Un modelo suaviza los picos; el SMN alerta con estaciones, radar y criterio del pronosticador.

Método (calibración contra el pronóstico oficial, como se ajustan los productos de impacto a las alertas de un servicio): para cada
día con alertas archivadas (data/archivo/smn_cap/, desde el 28-sep) se baja la lluvia diaria que cayó (ERA5-Land, el reanálisis del
mismo centro que hace el pronóstico) en la grilla de 0,1°; se busca el factor k sobre los umbrales amarillo y naranja que mejor hace
coincidir «lluvia > k × umbral» con «había alerta del SMN por tormentas o lluvias de ese nivel o más» (máximo ETS, el índice
equitativo de aciertos). k se busca entre 0,1 y 1,2 y se guarda en data/referencia/parametros_riesgo.json (factor_umbral), que usa
modelos/riesgo_diario.py. Se puede volver a correr cuando haya más días (la verificación semanal lo puede retomar).

Uso: .venv/bin/python modelos/calibrar_smn.py
"""
import datetime as dt
import json
import sys
from pathlib import Path

import ee
import geopandas as gpd
import numpy as np
import pandas as pd
from shapely import vectorized, wkb

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "earth_engine"))
from config import PROYECTO_EE  # noqa: E402
import lluvia_ninos as LN  # noqa: E402

CACHE = RAIZ / "data" / "procesado" / "calibrar_smn"
PARAM = RAIZ / "data" / "referencia" / "parametros_riesgo.json"


def nivel_alerta(severidad: str) -> int:
    """Nivel por la severidad del CAP del SMN: moderada = amarilla, severa = naranja, extrema = roja."""
    return {"Moderate": 1, "Severe": 2, "Extreme": 3}.get(severidad, 0)


def lluvia_dias(desde: str, hasta: str) -> tuple[list, np.ndarray]:
    f = CACHE / f"era5_{desde}_{hasta}.npz"
    if f.exists():
        z = np.load(f)
        return list(z["dias"]), z["mm"]
    col = ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR").filterDate(desde, hasta).select("total_precipitation_sum")
    dias = [d[:10] for d in col.aggregate_array("system:index").getInfo()]
    img = col.map(lambda i: i.multiply(10000).round().toInt16()).toBands()
    partes = []
    for j in range(0, LN.ALTO, 85):
        a = LN.bajar(img, LN.OESTE, LN.NORTE - j * LN.PASO, LN.ANCHO, min(85, LN.ALTO - j))
        partes.append(np.stack([a[n] for n in a.dtype.names]))
    mm = np.concatenate(partes, axis=1).astype(np.float32) / 10
    mm[mm < 0] = np.nan
    dias = [f"{d[:4]}-{d[4:6]}-{d[6:8]}" for d in dias]
    CACHE.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(f, dias=np.array(dias), mm=mm)
    return dias, mm


def ets(a, b, c, d) -> float:
    n = a + b + c + d
    azar = (a + b) * (a + c) / n if n else 0
    den = a + b + c - azar
    return float((a - azar) / den) if den > 0 else 0.0


def main() -> None:
    ee.Initialize(project=PROYECTO_EE)
    U = np.load(RAIZ / "data" / "procesado" / "umbrales_smn.npy")
    ny, nx = U.shape[1:]
    lat = LN.NORTE - (np.arange(ny) + 0.5) * LN.PASO
    lon = LN.OESTE + (np.arange(nx) + 0.5) * LN.PASO
    LON, LAT = np.meshgrid(lon, lat)
    pv = gpd.read_file(RAIZ / "web" / "datos" / "provincias_geo.geojson").union_all()
    tierra = vectorized.contains(pv, LON, LAT) & np.isfinite(U).all(axis=0)
    # Alertas por día (fecha de envío en hora argentina): nivel máximo por celda, solo tormentas y lluvias
    archivos = sorted((RAIZ / "data" / "archivo" / "smn_cap").glob("alertas_*.parquet"))
    hasta = (dt.date.today() - dt.timedelta(days=6)).isoformat()   # ERA5-Land llega con ~5 días de atraso
    dias, mm = lluvia_dias(archivos[0].stem[-10:], hasta)
    A = np.zeros((len(dias), ny, nx), np.int8)
    for f in archivos:
        d = pd.read_parquet(f)
        d = d[d["evento"].str.contains("TORMENTA|LLUVIA", case=False, na=False) & (d["certeza"] != "Observed")]   # sin avisos a corto plazo (lo ya observado)
        for _, r in d.iterrows():
            dia = str(r["enviado"])[:10]
            if dia not in dias:
                continue
            n = nivel_alerta(r["severidad"])
            if not n:
                continue
            g = wkb.loads(r["geometry"]) if isinstance(r["geometry"], (bytes, bytearray)) else r["geometry"]
            k = dias.index(dia)
            m = vectorized.contains(g, LON, LAT)
            A[k][m] = np.maximum(A[k][m], n)
    print(f"{len(dias)} días ({dias[0]} a {dias[-1]}); celdas-día con alerta amarilla+: {int((A >= 1).sum())}, naranja+: {int((A >= 2).sum())}")
    res = {}
    for j, (nombre, nv) in enumerate([("amarillo", 1), ("naranja", 2)]):
        mejor = (0.0, 1.0)
        for k in np.round(np.arange(0.1, 1.21, 0.05), 2):
            pron = mm > (k * U[j])[None]
            obs = A >= nv
            m = tierra[None] & np.isfinite(mm)
            a = int((pron & obs & m).sum()); b = int((pron & ~obs & m).sum()); c = int((~pron & obs & m).sum()); d_ = int((~pron & ~obs & m).sum())
            e = ets(a, b, c, d_)
            if e > mejor[0]:
                mejor = (e, float(k))
        res[nombre] = {"factor": mejor[1], "ets": round(mejor[0], 3)}
        print(f"  {nombre}: factor {mejor[1]} (ETS {mejor[0]:.3f})")
    P = json.loads(PARAM.read_text())
    P["factor_umbral"] = {"amarillo": res["amarillo"]["factor"], "naranja": res["naranja"]["factor"], "rojo": 1.0}   # sin alertas rojas en la muestra: el rojo no se calibra
    P["historial"].append({"fecha": dt.date.today().isoformat(), "cambio": f"factor_umbral calibrado contra las alertas del SMN ({len(dias)} días, {dias[0]} a {dias[-1]}): "
                           f"amarillo {res['amarillo']['factor']} (ETS {res['amarillo']['ets']}), naranja {res['naranja']['factor']}; rojo sin calibrar (ETS {res['naranja']['ets']})"})
    PARAM.write_text(json.dumps(P, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

"""Habitantes expuestos a inundaciones por radio censal, con el mismo terreno que el simulador.

Tabla precalculada una vez (herramientas/exposicion_simulador.py, con el código de la web): fracción de la superficie de cada radio
que queda con 10 cm de agua o más para 9 lluvias de 3 días (P) y 3 humedades del suelo (w), con el número de curva, los bajos del
relieve de ~32 m, los desagües de 2 años del lugar y 800 m de terreno alrededor. El cálculo de cada día (modelos/riesgo_diario.py)
solo interpola en esa tabla con la lluvia pronosticada: los dos miran los mismos datos, sin simular cada punto del país.

Radios sin calcular (zonas rurales muy dispersas): la fracción a menos de 2 m sobre el cauce (HAND) por la proporción nacional
entre las dos medidas en cada columna.
"""
from pathlib import Path

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
TABLA = RAIZ / "data" / "referencia" / "exposicion_simulador.parquet"
EXPO_P = np.array([10, 20, 30, 50, 75, 100, 150, 200, 300], float)
EXPO_W = np.array([0.1, 0.5, 0.9])


def tabla(r: pd.DataFrame) -> np.ndarray:
    """r: cod_indec, poblacion, pct_area_hand_2m → matriz radios × 3 × 9 (fracción de 0 a 1), en el orden de r."""
    t = pd.read_parquet(TABLA).set_index("cod_indec")
    cols = [f"f{k}" for k in range(27)]
    t = t[t["cubierto"] >= 0.5]   # radios vistos en al menos la mitad de su superficie (si no, el valor de respaldo)
    F = t.reindex(r["cod_indec"])[cols].to_numpy(float).copy()
    hand = r["pct_area_hand_2m"].fillna(0).to_numpy(float) / 100
    ok = np.isfinite(F).all(axis=1)
    pob = r["poblacion"].fillna(0).to_numpy(float)
    razon = (pob[ok, None] * F[ok]).sum(0) / max((pob[ok] * hand[ok]).sum(), 1)
    F[~ok] = np.clip(hand[~ok, None] * razon[None, :], 0, 1)
    return F.reshape(-1, 3, 9)


def fraccion(F: np.ndarray, P: np.ndarray, w: np.ndarray) -> np.ndarray:
    """Fracción con agua interpolada (lineal) en la tabla: F radios × 3 × 9; P y w por radio (mismo largo)."""
    P = np.clip(P, 0, EXPO_P[-1])
    w = np.clip(w, EXPO_W[0], EXPO_W[-1])
    ip = np.clip(np.searchsorted(EXPO_P, P) - 1, 0, 7)
    tp = np.clip((P - EXPO_P[ip]) / (EXPO_P[ip + 1] - EXPO_P[ip]), 0, 1)
    tp = np.where(P < EXPO_P[0], 0, tp)
    iw = np.clip(np.searchsorted(EXPO_W, w) - 1, 0, 1)
    tw = (w - EXPO_W[iw]) / (EXPO_W[iw + 1] - EXPO_W[iw])
    n = np.arange(len(P))
    f = lambda a, b: F[n, a, b]   # noqa: E731
    fw0 = f(iw, ip) * (1 - tp) + f(iw, ip + 1) * tp
    fw1 = f(iw + 1, ip) * (1 - tp) + f(iw + 1, ip + 1) * tp
    out = fw0 * (1 - tw) + fw1 * tw
    return np.where(P < EXPO_P[0], out * P / EXPO_P[0], out)   # menos de 10 mm: proporcional (con 0 mm, nada)


def pct_expuesto(r: pd.DataFrame) -> pd.Series:
    """% de cada radio con agua con una lluvia de referencia (100 mm en 3 días, suelo medio): la exposición fija del índice mensual
    y del mapa de radios (el riesgo de cada día usa la lluvia pronosticada)."""
    F = tabla(r)
    return pd.Series(100 * F[:, 1, 5], index=r.index)

"""Selección del factor f_k de los umbrales de lluvia contra las alertas del SMN (parte pura, sin Earth Engine: la usa
modelos/calibrar_smn.py y se prueba en herramientas/pruebas/probar_calibracion.py).

v9 (18-nov-2026): en lugar de «el f de máximo ETS» a secas (v8: llevaba f a 0,20 / 0,25 sin control de sobrealerta), se elige el f de
máximo ETS ENTRE los que mantienen el Frequency Bias dentro de [BIAS_MIN, BIAS_MAX], con un piso físico en mm/24 h que el umbral
efectivo no puede cruzar: umbral = máx(f · U ; piso). Si ningún f cumple, se toma el de Bias más cercano al rango (se avisa).
Entre f con el mismo ETS manda el MAYOR (el menos deformado respecto de los umbrales del SMN).
"""
import numpy as np

BIAS_MIN, BIAS_MAX = 0.8, 1.5
KS = np.round(np.arange(0.1, 1.21, 0.05), 2)


def contingencia(pron, obs, mascara) -> tuple[int, int, int, int]:
    m = np.broadcast_to(mascara, pron.shape)
    return (int((pron & obs & m).sum()), int((pron & ~obs & m).sum()), int((~pron & obs & m).sum()), int((~pron & ~obs & m).sum()))


def metricas(a: int, b: int, c: int, d: int) -> dict:
    n = a + b + c + d
    azar = (a + b) * (a + c) / n if n else 0.0
    den = a + b + c - azar
    nan = float("nan")
    return {"POD": a / (a + c) if a + c else nan, "FAR": b / (a + b) if a + b else nan, "bias": (a + b) / (a + c) if a + c else nan,
            "ETS": float((a - azar) / den) if den > 0 else 0.0, "n_pred": a + b, "n_obs": a + c}


def elegir_factor(mm, U, A, nivel: int, mascara, piso: float = 0.0, bias=(BIAS_MIN, BIAS_MAX), ks=KS) -> dict:
    """mm: días × filas × columnas (lluvia observada); U: filas × columnas (umbral del SMN del nivel); A: días × filas × columnas (nivel de
    alerta máximo); mascara: celdas válidas (tierra y con dato). Devuelve {factor, ets, POD, FAR, bias, sin_alerta_pct, cumple_bias}."""
    obs = A >= nivel
    sin = ~(A >= 1) & mascara
    cand = []
    for k in ks:
        pron = mm > np.maximum(k * U, piso)[None]
        m = metricas(*contingencia(pron, obs, mascara))
        m.update(factor=float(k), sin_alerta_pct=100 * float((pron & sin).sum()) / max(1, int(np.broadcast_to(sin, pron.shape).sum())))
        cand.append(m)
    ok = [m for m in cand if bias[0] <= m["bias"] <= bias[1]]
    if ok:
        mejor = max(ok, key=lambda m: (round(m["ETS"], 6), m["factor"]))
    else:   # ninguno cumple: el de Bias más cercano al rango (sobre todo si el Bias es alto), a favor de menos sobrealerta
        dist = lambda m: (bias[0] - m["bias"]) if m["bias"] < bias[0] else (m["bias"] - bias[1])  # noqa: E731
        mejor = min((m for m in cand if np.isfinite(m["bias"])), key=lambda m: (dist(m), -m["factor"]))
    return {**mejor, "cumple_bias": bool(ok)}

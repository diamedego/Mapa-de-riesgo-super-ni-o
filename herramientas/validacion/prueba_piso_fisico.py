"""Chequeo de orientación (NO es validación estadística) del piso físico en mm/24 h para los umbrales de lluvia.
Usa la lluvia observada de 4 días (14 a 17-nov-2026, análisis de corto plazo del ECMWF archivado en data/archivo/verificacion/pronosticos/)
y las alertas CAP archivadas de esos días (tormentas/lluvias, enviadas ese día, sin avisos «Observed»), por gobierno local.
Compara «lluvia > máx(f_k · U_k ; piso_k)» con la alerta del SMN de nivel k o superior: POD, FAR, Frequency Bias, ETS y el % de
gobiernos locales sin alerta SMN que quedarían señalados. No incluye P ni s_m ni el ensamble (no están archivados por miembro).
Uso: python herramientas/validacion/prueba_piso_fisico.py"""
import glob
from pathlib import Path
import numpy as np
import pandas as pd
from shapely import wkb
from shapely.geometry import Point

RAIZ = Path(__file__).resolve().parents[2]
sys_path = str(RAIZ / "herramientas" / "validacion")
import sys; sys.path.insert(0, sys_path)
from auditoria_umbrales_produccion import ets  # noqa: E402


def cargar():
    pts = pd.read_csv(RAIZ / "data/referencia/puntos_gobiernos_locales.csv", dtype={"cmu": str}).set_index("cmu")
    lluvia, U = {}, None
    for f in sorted(glob.glob(str(RAIZ / "data/archivo/verificacion/pronosticos/*.npz"))):   # el archivo más nuevo manda para cada día
        z = np.load(f, allow_pickle=True)
        U = pd.DataFrame(z["umb"], index=z["cmu"].astype(str), columns=["a", "n", "r"]) if U is None else U
        for j, d in enumerate(z["obs_dias"]):
            lluvia[str(d)] = pd.Series(z["obs"][:, j], index=z["cmu"].astype(str))
    A = {}
    for d in lluvia:
        arch = RAIZ / f"data/archivo/smn_cap/alertas_{d}.parquet"
        nivel = pd.Series(0, index=lluvia[d].index)
        if arch.exists():
            a = pd.read_parquet(arch)
            a = a[a["evento"].str.contains("TORMENTA|LLUVIA", case=False, na=False) & (a["certeza"] != "Observed") & a["enviado"].astype(str).str.startswith(d)]
            for _, r in a.iterrows():
                n = {"Moderate": 1, "Severe": 2, "Extreme": 3}.get(r["severidad"], 0)
                g = wkb.loads(r["geometry"]) if isinstance(r["geometry"], (bytes, bytearray)) else r["geometry"]
                x0, y0, x1, y1 = g.bounds
                for c in nivel.index[(pts.loc[nivel.index, "lon"] >= x0) & (pts.loc[nivel.index, "lon"] <= x1) & (pts.loc[nivel.index, "lat"] >= y0) & (pts.loc[nivel.index, "lat"] <= y1)]:
                    if g.contains(Point(pts.loc[c, "lon"], pts.loc[c, "lat"])):
                        nivel[c] = max(nivel[c], n)
        A[d] = nivel
    return lluvia, A, U


def evaluar(lluvia, A, U, f, piso):
    out = {}
    for k, (nombre, col) in enumerate((("amarilla", "a"), ("naranja", "n"))):
        thr = np.maximum(U[col].to_numpy() * f[k], piso[k])
        P = np.concatenate([(lluvia[d].reindex(U.index).to_numpy() > thr) for d in lluvia])
        O = np.concatenate([(A[d].reindex(U.index).to_numpy() >= k + 1) for d in lluvia])
        any_o = np.concatenate([(A[d].reindex(U.index).to_numpy() >= 1) for d in lluvia])
        a, b, c, d_ = int((P & O).sum()), int((P & ~O).sum()), int((~P & O).sum()), int((~P & ~O).sum())
        out[nombre] = dict(POD=a / (a + c) if a + c else np.nan, FAR=b / (a + b) if a + b else np.nan, Bias=(a + b) / (a + c) if a + c else np.nan,
                           ETS=ets(a, b, c, d_), sin_alerta_pct=100 * (P & ~any_o).sum() / max(1, (~any_o).sum()), n_pred=a + b, n_obs=a + c)
    return out


def main():
    lluvia, A, U = cargar()
    print("días:", sorted(lluvia), "| gobiernos locales:", len(U), "| alertados SMN (amarilla+) por día:", {d: int((A[d] >= 1).sum()) for d in sorted(A)})
    print("U mediana:", U.median().round(0).to_dict(), "| con piso 15/30: el piso manda (f·U < piso) en",
          f"{(U['a'] * 0.20 < 15).mean() * 100:.0f} % (amarilla) y {(U['n'] * 0.25 < 30).mean() * 100:.0f} % (naranja) de los gobiernos locales")
    configs = {"v8 (f 0,20/0,25, sin piso)": ((0.20, 0.25), (0, 0)), "SMN sin deformar (f 1,0)": ((1.0, 1.0), (0, 0)),
               "piso 15/30 (f 0,20/0,25)": ((0.20, 0.25), (15, 30)), "piso 20/35 (f 0,20/0,25)": ((0.20, 0.25), (20, 35))}
    filas = []
    for nom, (f, p) in configs.items():
        for niv, m in evaluar(lluvia, A, U, f, p).items():
            filas.append({"config": nom, "nivel": niv, **{k: round(v, 3) if isinstance(v, float) else v for k, v in m.items()}})
    print(pd.DataFrame(filas).to_string(index=False))


if __name__ == "__main__":
    main()

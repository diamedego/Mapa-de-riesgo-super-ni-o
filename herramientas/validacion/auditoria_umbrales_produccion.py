"""Auditoría de los umbrales de lluvia en PRODUCCIÓN (ensamble ECMWF + f_k + P + s_m) contra las alertas del SMN, con las copias
archivadas de data/archivo/riesgo_diario/ (nivel por lluvia «l» y por alerta «a» de cada gobierno local y día).
Mide POD, FAR, Frequency Bias y ETS por nivel, y el % de gobiernos locales con amenaza por lluvia donde el SMN no alertó nada.
Uso: python herramientas/validacion/auditoria_umbrales_produccion.py"""
import json, glob
from pathlib import Path
import numpy as np

RAIZ = Path(__file__).resolve().parents[2]

def ets(a, b, c, d):
    n = a + b + c + d; azar = (a + b) * (a + c) / n if n else 0; den = a + b + c - azar
    return (a - azar) / den if den > 0 else float("nan")

def tabla(L, A, nv):
    p, o = L >= nv, A >= nv
    a, b, c, d = int((p & o).sum()), int((p & ~o).sum()), int((~p & o).sum()), int((~p & ~o).sum())
    return dict(hits=a, falsas=b, perdidos=c, nulos=d, POD=a / (a + c) if a + c else float("nan"), FAR=b / (a + b) if a + b else float("nan"),
                bias=(a + b) / (a + c) if a + c else float("nan"), ETS=ets(a, b, c, d), pred=a + b, obs=a + c)

def main():
    por_plazo = {}
    for f in sorted(glob.glob(str(RAIZ / "data/archivo/riesgo_diario/*.json"))):
        j = json.load(open(f)); fecha = Path(f).stem
        for cmu, v in j["cmu"].items():
            for d in range(3):
                por_plazo.setdefault(d, []).append((fecha, cmu, int(v["l"][d]), int(v["a"][d]), int(v["q"][d])))
    for d, filas in por_plazo.items():
        arr = np.array([(l, a) for _, _, l, a, _ in filas]); L, A = arr[:, 0], arr[:, 1]
        fechas = sorted({x[0] for x in filas})
        print(f"\n=== plazo {d} d (archivos {fechas[0]} a {fechas[-1]}; {len(fechas)} días × {len(filas)//len(fechas)} lugares) ===")
        for nombre, nv in (("amarilla+", 1), ("naranja+", 2)):
            t = tabla(L, A, nv); print(f"  {nombre}: " + ", ".join(f"{k}={v:.3f}" if isinstance(v, float) else f"{k}={v}" for k, v in t.items()))
        sin = A == 0
        print(f"  Sin alerta SMN: {sin.sum()} lugares-día; con amenaza amarilla+ por lluvia: {(L[sin]>=1).mean()*100:.1f} %, naranja+: {(L[sin]>=2).mean()*100:.1f} %")
        for fecha in fechas:
            m = np.array([x[0] == fecha for x in filas]); s = m & sin
            print(f"    {fecha}: alertados SMN {int((A[m]>=1).sum())} | lluvia amarilla+ {int((L[m]>=1).sum())} (sin alerta: {int((L[s]>=1).sum())} = {(L[s]>=1).mean()*100:.1f} %) | naranja+ {int((L[m]>=2).sum())} (sin alerta: {int((L[s]>=2).sum())})")

if __name__ == "__main__":
    main()

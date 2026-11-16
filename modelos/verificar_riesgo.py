"""Verificación del riesgo diario contra lo que pasó, y ajuste prudente de sus parámetros (sin cambiar el método).

Cada cosa con la frecuencia que tiene sentido:
- DIARIO (después de cada corrida de modelos/riesgo_diario.py): se anota lo ocurrido frente a lo pronosticado.
    · Lluvia: la de anteayer en cada lugar (análisis de corto plazo del ECMWF, el mismo que usa el riesgo) contra la probabilidad
      que cada pronóstico archivado le dio a superar los umbrales amarillo, naranja y rojo del SMN para ese día (plazo 0 a 14).
      Se guardan histogramas (probabilidad pronosticada en 10 tramos × ocurrió o no) por plazo y nivel: con eso salen todas las
      métricas sin guardar cada lugar.
    · Ríos: el estado de cada estación del INA hoy (normal, alerta, evacuación) contra lo pronosticado para hoy por cada corrida
      anterior y contra la persistencia (el estado del día en que se emitió).
- SEMANAL (lunes): métricas de las últimas 8 semanas (aciertos, falsas alarmas, puntaje de Brier, confiabilidad) en
  web/datos/verificacion_riesgo.json y ajuste de data/referencia/parametros_riesgo.json:
    · probabilidad mínima para avisar (p_umbral): la que maximiza el ETS (índice equitativo de aciertos, estándar en verificación
      de lluvia) del umbral amarillo a 1-3 días; se mueve como mucho 0,05 por semana, entre 0,20 y 0,50, y solo con ≥ 30 eventos en ≥ 21 días distintos;
    · días de persistencia de lo medido en el río: hasta el plazo en que la persistencia acierta tanto o más que el pronóstico
      (entre 1 y 7, de a 1 día por semana, con ≥ 30 comparaciones por plazo en ≥ 21 días distintos).
  Cada cambio queda en el historial del archivo de parámetros con fecha y motivo.
- MENSUAL (pendiente): agua vista por el radar Sentinel-1 (cada 12 días) contra los lugares marcados en alto y el simulador.

Uso: python modelos/verificar_riesgo.py diario | semanal
"""
import datetime as dt
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
ARCH = RAIZ / "data" / "archivo"
VER = ARCH / "verificacion"
PARAM = RAIZ / "data" / "referencia" / "parametros_riesgo.json"
NIVELES = ["amarillo", "naranja", "rojo"]
MIN_DIAS = 21   # además de los eventos, al menos 3 semanas distintas de datos: un solo temporal no alcanza para ajustar
CLASE = {"normal": 0, "alerta": 1, "evacuacion": 3}


def diario() -> None:
    pron = sorted((VER / "pronosticos").glob("*.npz"))
    if not pron:
        return print("verificación: todavía no hay pronósticos archivados")
    hoy = np.load(pron[-1], allow_pickle=False)
    fecha_obs = str(hoy["obs_dias"][0])   # anteayer: la lluvia más firme de esta corrida (0-24 h del análisis)
    obs = pd.Series(hoy["obs"][:, 0], index=hoy["cmu"])
    filas = []
    for f in pron:
        A = np.load(f, allow_pickle=False)
        dias = list(A["dias"])
        if fecha_obs not in dias:
            continue
        k = dias.index(fecha_obs)
        o = obs.reindex(A["cmu"]).values
        ok = np.isfinite(o)
        for j, niv in enumerate(NIVELES):
            ocurrio = (o > A["umb"][:, j])[ok]
            p = A["p3"][ok, k, j] / 100
            tramo = np.minimum((p * 10).astype(int), 9)
            for b in range(10):
                sel = tramo == b
                n1, n0 = int((ocurrio & sel).sum()), int((~ocurrio & sel).sum())
                if n1 or n0:
                    filas.append({"fecha_obs": fecha_obs, "emision": f.stem, "plazo": k, "nivel": niv, "tramo": b, "si": n1, "no": n0})
    _agregar(VER / "lluvia.csv", pd.DataFrame(filas), ["fecha_obs", "emision"])
    # Ríos: estado de hoy contra lo pronosticado para hoy y contra la persistencia
    est = {str(x["properties"]["estacion_id"]): x["properties"] for x in json.loads((RAIZ / "web" / "datos" / "estaciones.geojson").read_text())["features"]}
    hoy_iso = dt.datetime.now(dt.timezone(dt.timedelta(hours=-3))).date().isoformat()
    filas = []
    for f in sorted((ARCH / "riesgo_diario").glob("*.json")):
        R = json.loads(f.read_text())
        if hoy_iso not in R.get("dias", []) or f.stem > hoy_iso:
            continue
        k = R["dias"].index(hoy_iso)
        for e, v in R.get("est", {}).items():
            pr = est.get(e)
            if not pr or pr.get("estado") not in CLASE:
                continue
            filas.append({"fecha": hoy_iso, "emision": f.stem, "plazo": k, "estacion": e, "pron": int(str(v["n"])[k]),
                          "pers": int(str(v["n"])[0]), "obs": CLASE[pr["estado"]]})
    _agregar(VER / "rios.csv", pd.DataFrame(filas), ["fecha", "emision", "estacion"])
    print(f"verificación diaria: lluvia del {fecha_obs} y ríos del {hoy_iso} anotados")


def _agregar(f: Path, nuevo: pd.DataFrame, clave: list) -> None:
    if nuevo.empty:
        return
    viejo = pd.read_csv(f, dtype=str) if f.exists() else pd.DataFrame(columns=nuevo.columns)
    viejo = viejo[~viejo.set_index(clave).index.isin(nuevo.astype(str).set_index(clave).index)]
    pd.concat([viejo, nuevo.astype(str)], ignore_index=True).to_csv(f, index=False)


def ets(si, no, corte) -> float:
    """Índice equitativo de aciertos (Gilbert skill score) avisando cuando la probabilidad ≥ corte."""
    av = np.arange(10) / 10 >= corte - 1e-9
    a, b = si[av].sum(), no[av].sum()          # aciertos, falsas alarmas
    c, d = si[~av].sum(), no[~av].sum()        # sin aviso: no detectados, correctos negativos
    n = a + b + c + d
    azar = (a + b) * (a + c) / n if n else 0
    den = a + b + c - azar
    return float((a - azar) / den) if den > 0 else 0.0


def semanal() -> None:
    P = json.loads(PARAM.read_text())
    desde = (dt.date.today() - dt.timedelta(days=56)).isoformat()
    salida = {"generado": dt.date.today().isoformat(), "ventana_dias": 56, "lluvia": {}, "rios": {}, "parametros": {k: v for k, v in P.items() if k != "historial"}}
    cambios = []
    if (VER / "lluvia.csv").exists():
        L = pd.read_csv(VER / "lluvia.csv")
        L = L[L["fecha_obs"] >= desde]
        for niv in NIVELES:
            for nombre, (a, b) in {"1-3": (1, 3), "4-7": (4, 7), "8-14": (8, 14)}.items():
                g = L[(L["nivel"] == niv) & L["plazo"].between(a, b)].groupby("tramo")[["si", "no"]].sum().reindex(range(10), fill_value=0)
                si, no = g["si"].values, g["no"].values
                p = (np.arange(10) + 0.5) / 10
                n = si + no
                av = np.arange(10) / 10 >= P["p_umbral"] - 1e-9
                salida["lluvia"][f"{niv}_{nombre}"] = {
                    "eventos": int(si.sum()), "casos": int(n.sum()),
                    "pod": round(float(si[av].sum() / si.sum()), 3) if si.sum() else None,
                    "far": round(float(no[av].sum() / (si[av].sum() + no[av].sum())), 3) if (si[av].sum() + no[av].sum()) else None,
                    "brier": round(float(((p - 1) ** 2 * si + p ** 2 * no).sum() / n.sum()), 4) if n.sum() else None,
                    "confiabilidad": [[round(float(p[b]), 2), round(float(si[b] / n[b]), 3) if n[b] else None, int(n[b])] for b in range(10)]}
        g = L[(L["nivel"] == "amarillo") & L["plazo"].between(1, 3)].groupby("tramo")[["si", "no"]].sum().reindex(range(10), fill_value=0)
        if g["si"].sum() >= 30 and L["fecha_obs"].nunique() >= MIN_DIAS:
            cortes = np.round(np.arange(0.2, 0.51, 0.05), 2)
            mejor = float(cortes[int(np.argmax([ets(g["si"].values, g["no"].values, c) for c in cortes]))])
            nuevo = round(float(np.clip(P["p_umbral"] + np.clip(mejor - P["p_umbral"], -0.05, 0.05), 0.2, 0.5)), 2)
            if nuevo != P["p_umbral"]:
                cambios.append(f"p_umbral {P['p_umbral']} → {nuevo} (el mejor ETS con {int(g['si'].sum())} eventos de lluvia amarilla a 1-3 días está en {mejor})")
                P["p_umbral"] = nuevo
    if (VER / "rios.csv").exists():
        Rr = pd.read_csv(VER / "rios.csv")
        Rr = Rr[Rr["fecha"] >= desde]
        acierto = Rr.assign(ap=Rr["pron"] == Rr["obs"], ape=Rr["pers"] == Rr["obs"]).groupby("plazo").agg(n=("ap", "size"), pron=("ap", "mean"), pers=("ape", "mean"))
        salida["rios"] = {str(k): {"n": int(v.n), "acierto_pronostico": round(float(v.pron), 3), "acierto_persistencia": round(float(v.pers), 3)} for k, v in acierto.iterrows()}
        validos = acierto[acierto["n"] >= 30]
        if len(validos) and Rr["fecha"].nunique() >= MIN_DIAS:
            gana = [int(k) for k, v in validos.iterrows() if k >= 1 and v.pers >= v.pron]
            objetivo = int(np.clip(max(gana) + 1 if gana else 1, 1, 7))
            nuevo = int(np.clip(P["persistencia_rio_dias"] + np.sign(objetivo - P["persistencia_rio_dias"]), 1, 7))
            if nuevo != P["persistencia_rio_dias"]:
                cambios.append(f"persistencia_rio_dias {P['persistencia_rio_dias']} → {nuevo} (la persistencia acierta tanto o más que el pronóstico hasta el plazo {objetivo - 1})")
                P["persistencia_rio_dias"] = nuevo
    if cambios:
        P["historial"].append({"fecha": dt.date.today().isoformat(), "cambio": "; ".join(cambios)})
        PARAM.write_text(json.dumps(P, ensure_ascii=False, indent=2))
        with open(RAIZ / "docs" / "00_bitacora.md", "a") as b:
            b.write(f"\n- {dt.date.today().isoformat()} (verificación semanal automática): " + "; ".join(cambios) + "\n")
    salida["cambios"] = cambios
    (RAIZ / "web" / "datos" / "verificacion_riesgo.json").write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")))
    print("verificación semanal:", cambios or "sin cambios (pocos eventos o parámetros ya en su mejor valor)")


if __name__ == "__main__":
    {"diario": diario, "semanal": semanal}[sys.argv[1] if len(sys.argv) > 1 else "diario"]()

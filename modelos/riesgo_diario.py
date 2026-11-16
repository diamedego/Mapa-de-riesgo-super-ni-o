"""Riesgo de inundación de hoy y de los próximos 14 días por gobierno local (reemplaza al riesgo mensual, que fuera de los ríos
grandes no tenía sustento: la lluvia de un mes no se puede pronosticar).

Amenaza de cada día (nivel 0 a 3) = el mayor entre:
- LLUVIA: probabilidad de que la lluvia de 3 días seguidos que termina ese día supere la que en el lugar se da una vez cada 2, 5 o
  10 años (umbrales del clima del propio modelo: earth_engine/umbrales_lluvia.py). Probabilidad = fracción de los 51 pronósticos
  del ensamble del ECMWF (Open-Meteo) que la superan. Nivel 1 / 2 / 3 si al menos el 30 % supera 2 / 5 / 10 años (el sistema
  europeo EFAS avisa cuando el 30 % del ensamble supera la crecida de 5 años). En lugares poco propensos a juntar agua (propensión
  histórica < 0,15: sin terreno bajo ni historia de agua) baja un nivel.
- RÍO: estaciones del INA con curva validada (43). Caudal de los 51 pronósticos de GloFAS → altura con la curva de cada estación.
  Nivel 1 si al menos el 30 % llega a alerta; 2 si el 30 % llega a evacuación; 3 si el 70 % llega a evacuación. Hoy manda la
  altura medida por el INA. Cuenta para los gobiernos locales a ≤ 15 km de la estación (a 15-30 km, un nivel menos).
- ALERTAS DEL SMN vigentes que cubren el lugar (solo los días que dura cada alerta): amarilla 1, naranja 2, roja 3.

Riesgo = ∛(H × E × V), con H = 0 / 4 / 7 / 10 según el nivel y E y V la exposición y la vulnerabilidad fijas del índice (escala
física 0-10). Se pinta con los mismos cortes del sitio.

Salida: web/datos/riesgo_diario.json
  {generado, dias, cmu: {cmu: {r: [15 riesgos], n: "nivel de amenaza por día", l / q / a: "nivel por lluvia / río / alerta",
                               p: [15 prob. del nivel que manda]}}, est: {estacion_id: {n: "nivel por día", p: [15 prob.]}}}
(los niveles van como texto de 15 dígitos 0-3) y una copia con fecha en data/archivo/riesgo_diario/ (para verificar después
contra lo que pasó). Las respuestas de Open-Meteo se guardan por día en data/procesado/riesgo_diario/ y se reusan si se corre de
nuevo el mismo día.
Uso: python modelos/riesgo_diario.py
"""
import datetime as dt
import json
import math
import pickle
import time
from pathlib import Path

import numpy as np
import pandas as pd
import requests

RAIZ = Path(__file__).resolve().parents[1]
REF, WEB = RAIZ / "data" / "referencia", RAIZ / "web" / "datos"
DIAS, P_UMBRAL, P_ALTA = 15, 0.30, 0.70
H_NIVEL = [0, 4, 7, 10]
ENSAMBLE = "https://ensemble-api.open-meteo.com/v1/ensemble"
CRECIDA = "https://flood-api.open-meteo.com/v1/flood"


def pedir(url, params, intentos=4):
    for k in range(intentos):
        try:
            r = requests.get(url, params=params, timeout=180)
            if r.ok:
                return r.json()
            print("  respuesta", r.status_code, r.text[:120], flush=True)
        except requests.RequestException as e:
            print("  error", e, flush=True)
        time.sleep(15 * (k + 1))
    return None


def lluvia_por_celda(puntos: pd.DataFrame) -> dict:
    """Celda de 0,25° → matriz miembros × días (17: 2 pasados + hoy + 14) de lluvia diaria del ensamble del ECMWF."""
    celdas = puntos[["celda_lat", "celda_lon"]].drop_duplicates().reset_index(drop=True)
    out = {}
    for i in range(0, len(celdas), 50):
        lote = celdas.iloc[i:i + 50]
        j = pedir(ENSAMBLE, {"latitude": ",".join(f"{v:.2f}" for v in lote.celda_lat), "longitude": ",".join(f"{v:.2f}" for v in lote.celda_lon),
                             "daily": "precipitation_sum", "models": "ecmwf_ifs025", "forecast_days": DIAS, "past_days": 2,
                             "timezone": "America/Argentina/Buenos_Aires"})
        if j is None:
            continue
        for (_, c), d in zip(lote.iterrows(), j if isinstance(j, list) else [j]):
            ks = [k for k in d["daily"] if k.startswith("precipitation_sum")]
            out[(c.celda_lat, c.celda_lon)] = (d["daily"]["time"], np.array([[v if v is not None else 0 for v in d["daily"][k]] for k in ks], dtype=float))
        time.sleep(2)
    return out


def niveles_lluvia(M: np.ndarray, u: pd.Series) -> tuple[list, list]:
    """Por día (desde hoy): nivel 0-3 y probabilidad de superar el umbral del nivel alcanzado (o el de 2 años)."""
    tres = M[:, :-2] + M[:, 1:-1] + M[:, 2:]   # ventana que termina en cada día desde hoy
    niv, prob = [], []
    for d in range(min(DIAS, tres.shape[1])):
        p = [(tres[:, d] > u[k]).mean() for k in ("t2", "t5", "t10")]
        n = 3 if p[2] >= P_UMBRAL else 2 if p[1] >= P_UMBRAL else 1 if p[0] >= P_UMBRAL else 0
        niv.append(n); prob.append(round(float(p[max(0, n - 1)]), 2))
    return niv, prob


def niveles_rios(hoy: str) -> dict:
    """estacion_id → (niveles por día 0-3, probabilidad del nivel), con GloFAS en altura y la altura medida hoy."""
    curvas = pd.read_parquet(REF / "rios_curvas.parquet")
    import geopandas as gpd
    info = gpd.read_parquet(REF / "estaciones_ina.parquet").set_index("series_id")   # con geometría (punto de la estación)
    celdas = pd.read_csv(REF / "celdas_glofas.csv").set_index("estacion_id")
    obs = {str(f["properties"]["estacion_id"]): f["properties"] for f in json.loads((WEB / "estaciones.geojson").read_text())["features"]}
    out = {}
    for _, c in curvas.iterrows():
        e = info.loc[c["series_id"]]
        est = int(e["estacion_id"])
        if est not in celdas.index or pd.isna(e["nivel_alerta"]):
            continue
        j = pedir(CRECIDA, {"latitude": celdas.loc[est, "lat_celda"], "longitude": celdas.loc[est, "lon_celda"], "daily": "river_discharge",
                            "ensemble": "true", "forecast_days": DIAS, "past_days": 10})
        time.sleep(1.5)
        if j is None:
            continue
        ks = [k for k in j["daily"] if k.startswith("river_discharge")]
        fechas = pd.to_datetime(j["daily"]["time"])
        Q = np.array([[v if v is not None else np.nan for v in j["daily"][k]] for k in ks], dtype=float)
        H = np.interp(np.log1p(Q), c["x_log_caudal"], c["y_altura"]) + float(c["sesgo_calibracion"])
        des = int(c["desfase_dias"])   # el caudal llega a la escala unos días después
        alerta, evac = float(e["nivel_alerta"]), e["nivel_evacuacion"]
        evac = float(evac) if pd.notna(evac) else None
        i0 = int(np.searchsorted(fechas.values, np.datetime64(hoy)))
        niv, prob = [], []
        for d in range(DIAS):
            k = i0 + d - des
            if k < 0 or k >= H.shape[1]:
                niv.append(0); prob.append(0.0); continue
            h = H[:, k][~np.isnan(H[:, k])]
            pa = float((h >= alerta).mean()) if len(h) else 0.0
            pe = float((h >= evac).mean()) if len(h) and evac else 0.0
            n = 3 if pe >= P_ALTA else 2 if pe >= P_UMBRAL else 1 if pa >= P_UMBRAL else 0
            if d == 0:   # hoy manda lo medido por el INA
                o = obs.get(str(est), {})
                try:
                    ho = float(o.get("h"))
                    n = 3 if evac and ho >= evac else 1 if ho >= alerta else 0
                    pe = pa = 1.0 if n else 0.0
                except (TypeError, ValueError):
                    pass
            niv.append(n); prob.append(round(pe if n >= 2 else pa, 2))
        out[str(est)] = {"n": niv, "p": prob, "lat": e.geometry.y, "lon": e.geometry.x, "nombre": e["estacion"]}
    return out


def alertas_smn(puntos: pd.DataFrame, dias: list) -> dict:
    """cmu → niveles 0-3 por día de las alertas vigentes del SMN que cubren su punto."""
    from shapely.geometry import Point, shape
    out = {}
    try:
        al = json.loads((WEB / "alertas.geojson").read_text())["features"]
    except (OSError, ValueError):
        return out
    nivel = {"amarilla": 1, "naranja": 2, "roja": 3}
    for f in al:
        pr, g = f["properties"], shape(f["geometry"])
        n = nivel.get(pr.get("nivel"))
        if not n:
            continue
        vence = (pr.get("vence") or dias[0])[:10]
        for r in puntos.itertuples():
            if g.bounds[0] <= r.lon <= g.bounds[2] and g.bounds[1] <= r.lat <= g.bounds[3] and g.contains(Point(r.lon, r.lat)):
                v = out.setdefault(r.cmu, [0] * DIAS)
                for d, iso in enumerate(dias):
                    if iso <= vence:
                        v[d] = max(v[d], n)
    return out


def guardado(nombre: str, fn):
    """Resultado de fn guardado en data/procesado/riesgo_diario/<nombre>.pkl (cada parte por separado: si algo falla después,
    no se vuelve a bajar lo que ya estaba)."""
    f = RAIZ / "data" / "procesado" / "riesgo_diario" / f"{nombre}.pkl"
    if f.exists():
        return pickle.loads(f.read_bytes())
    v = fn()
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_bytes(pickle.dumps(v))
    return v


def km(lat1, lon1, lat2, lon2):
    a = math.sin(math.radians(lat2 - lat1) / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


def main() -> None:
    hoy = dt.datetime.now(dt.timezone(dt.timedelta(hours=-3))).date().isoformat()
    dias = [(dt.date.fromisoformat(hoy) + dt.timedelta(days=d)).isoformat() for d in range(DIAS)]
    puntos = pd.read_csv(REF / "puntos_gobiernos_locales.csv", dtype={"cmu": str})
    puntos["celda_lat"], puntos["celda_lon"] = (puntos.lat / 0.25).round() * 0.25, (puntos.lon / 0.25).round() * 0.25
    umb = pd.read_parquet(REF / "umbrales_lluvia_municipios.parquet").astype({"cmu": str}).set_index("cmu")
    idx = pd.read_parquet(RAIZ / "data" / "gold" / "indice_riesgo_mensual.parquet").astype({"cmu": str}).drop_duplicates("cmu").set_index("cmu")
    # Las respuestas del ensamble se guardan por día: correrlo de nuevo el mismo día no vuelve a gastar pedidos a Open-Meteo
    rios = guardado(f"{hoy}_rios", lambda: niveles_rios(hoy))   # primero lo corto: si falla, falla rápido
    lluvia = guardado(f"{hoy}_lluvia", lambda: lluvia_por_celda(puntos))
    smn = alertas_smn(puntos, dias)
    salida, sin_lluvia = {}, 0
    for r in puntos.itertuples():
        n, p = [0] * DIAS, [0.0] * DIAS
        fuente = {"l": [0] * DIAS, "q": [0] * DIAS, "a": [0] * DIAS}   # nivel por lluvia, río y alerta
        L = lluvia.get((r.celda_lat, r.celda_lon))
        if L and r.cmu in umb.index:
            nl, pl = niveles_lluvia(L[1], umb.loc[r.cmu])
            propenso = float(idx.loc[r.cmu, "P_agua"]) >= 0.15 if r.cmu in idx.index else True
            for d in range(len(nl)):
                v = nl[d] if propenso else max(0, nl[d] - 1)
                fuente["l"][d] = v
                if v > n[d]: n[d], p[d] = v, pl[d]
        else:
            sin_lluvia += 1
        for est, R in rios.items():
            dist = km(r.lat, r.lon, R["lat"], R["lon"])
            if dist > 30:
                continue
            for d in range(DIAS):
                v = R["n"][d] if dist <= 15 else max(0, R["n"][d] - 1)
                fuente["q"][d] = max(fuente["q"][d], v)
                if v > n[d]: n[d], p[d] = v, R["p"][d]
        for d, v in enumerate(smn.get(r.cmu, [])):
            fuente["a"][d] = v
            if v > n[d]: n[d], p[d] = v, 1.0
        E = float(idx.loc[r.cmu, "E"]) if r.cmu in idx.index else 0.0
        V = float(idx.loc[r.cmu, "V"]) if r.cmu in idx.index else 0.0
        riesgo = [round((H_NIVEL[v] * E * V) ** (1 / 3), 1) for v in n]
        digitos = lambda xs: "".join(str(x) for x in xs)
        salida[r.cmu] = {"r": riesgo, "n": digitos(n), **{k: digitos(v) for k, v in fuente.items()}, "p": p}
    res = {"generado": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"), "dias": dias, "umbral_p": P_UMBRAL, "h_nivel": H_NIVEL,
           "fuentes": {"lluvia": "Ensamble ECMWF IFS 0,25° (51 miembros, Open-Meteo)", "umbrales": "ERA5-Land 1995-2024, Gumbel",
                       "rios": f"GloFAS (51 miembros) + curva de cada estación; hoy, INA ({len(rios)} estaciones)", "alertas": "SMN vigentes"},
           "sin_lluvia": sin_lluvia, "cmu": salida,
           "est": {e: {"n": "".join(str(x) for x in R["n"]), "p": R["p"]} for e, R in rios.items()}}
    (WEB / "riesgo_diario.json").write_text(json.dumps(res, separators=(",", ":")))
    arch = RAIZ / "data" / "archivo" / "riesgo_diario"
    arch.mkdir(parents=True, exist_ok=True)
    (arch / f"{hoy}.json").write_text(json.dumps(res, separators=(",", ":")))
    cuenta = pd.Series([max(v["n"]) for v in salida.values()]).value_counts().sort_index().to_dict()   # máximo dígito
    print(f"riesgo_diario: {len(salida)} gobiernos locales, {len(rios)} estaciones, sin lluvia {sin_lluvia}; nivel máximo en 14 días: {cuenta}")


if __name__ == "__main__":
    main()

"""Validación del simulador contra el agua vista por satélite en El Niño 2015-16 y 2023-24 (y en la sequía 2022-23).

Para cada una de las 20 ciudades con relieve FABDEM, en un círculo de 5 km alrededor de su centro:
1. Simulado: el mismo modelo del sitio (web/hidraulica.js) corre cada temporada de noviembre a abril con la lluvia real hora por
   hora (Open-Meteo, archivo ERA5) y la altura real del río (INA, estación a menos de 15 km), en Chrome sin ventana
   (herramientas/validacion/correr_simulacion.js). Celda con agua en el mes: 10 cm o más durante al menos la mitad del mes.
2. Observado: Dynamic World (Sentinel-2, 10 m) en Earth Engine: agua como clase más frecuente del mes en al menos un mes de la
   temporada, sin el agua permanente (JRC > 80 %), llevada a la grilla del modelo como fracción de agua por celda.
3. Comparación celda por celda (celdas de tierra del círculo): aciertos (POD), falsas alarmas (FAR), CSI y superficie con agua.
   Referencia trivial para saber si el modelo aporta algo: "donde el satélite vio agua alguna vez" (JRC 1984-2021).

Salidas: data/validacion/simulado/<cmu>.json, data/validacion/observado/<cmu>.npz, data/validacion/resultados.csv y
web/datos/validacion.json (resumen que muestra el simulador).
Uso: .venv/bin/python herramientas/validacion/validar.py [simular|observar|resumir] [cmu ...]   (servidor local en el puerto 8765)
"""
import base64
import json
import math
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from shapely import wkb

RAIZ = Path(__file__).resolve().parents[2]
WEB = RAIZ / "web"
SALIDA = RAIZ / "data" / "validacion"
TEMPORADAS = [("nino_2015_16", "2015-11-01", "2016-04-30"), ("nino_2023_24", "2023-11-01", "2024-04-30"),
              ("referencia_2022_23", "2022-11-01", "2023-04-30")]
RADIO_KM, ESTACION_KM = 5, 15
MIN_CELDAS_OBS = 20   # para medir aciertos por celda hace falta agua observada suficiente


def ciudades() -> list[dict]:
    R = json.loads((WEB / "datos" / "riesgo.json").read_text())
    idx = json.loads((WEB / "datos" / "terreno" / "indice.json").read_text())
    return [{"cmu": c["cmu"], "nombre": c["nombre"], "lon": R["cmu"][c["cmu"]]["c"][0], "lat": R["cmu"][c["cmu"]]["c"][1]} for c in idx["ciudades"]]


def km(lon1, lat1, lon2, lat2) -> float:
    r = math.pi / 180
    a = math.sin((lat2 - lat1) * r / 2) ** 2 + math.cos(lat1 * r) * math.cos(lat2 * r) * math.sin((lon2 - lon1) * r / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


_ina = None
def crecidas(lon: float, lat: float) -> tuple[dict, dict | None]:
    """Crecida diaria (altura − mediana 2015-2026) de la estación del INA más cercana con datos en las tres temporadas."""
    global _ina
    if _ina is None:
        s = pd.read_parquet(RAIZ / "data" / "raw" / "ina" / "series.parquet")
        s = s[s["geometry"].notna()].copy()
        pts = s["geometry"].map(lambda b: wkb.loads(b) if isinstance(b, (bytes, bytearray)) else b)
        s["lon"], s["lat"] = pts.map(lambda p: p.x), pts.map(lambda p: p.y)
        a = pd.read_parquet(RAIZ / "data" / "raw" / "ina" / "alturas.parquet")
        a["dia"] = (pd.to_datetime(a["fecha"], utc=True) - pd.Timedelta(hours=3)).dt.strftime("%Y-%m-%d")
        _ina = (s, a.groupby(["series_id", "dia"])["altura_m"].mean())
    s, a = _ina
    s = s.assign(dist=[km(lon, lat, x, y) for x, y in zip(s["lon"], s["lat"])]).query("dist <= @ESTACION_KM").sort_values("dist")
    for _, e in s.iterrows():
        if e["series_id"] not in a.index.get_level_values(0):
            continue
        serie = a.loc[e["series_id"]]
        por = {}
        for nombre, desde, hasta in TEMPORADAS:
            tramo = serie[(serie.index >= desde) & (serie.index <= hasta)]
            if len(tramo) < 120:   # casi todos los días de la temporada
                break
            por[nombre] = {d: round(float(np.clip(v - serie.median(), -2, 8)), 2) for d, v in tramo.items()}
        if len(por) == len(TEMPORADAS):
            return por, {"estacion": e["estacion"], "rio": e["rio"], "km": round(e["dist"], 1), "series_id": int(e["series_id"])}
    return {}, None


def simular(c: dict) -> None:
    destino = SALIDA / "simulado" / f"{c['cmu']}.json"
    if destino.exists():
        return
    por, est = crecidas(c["lon"], c["lat"])
    val = {"temporadas": [{"nombre": n, "desde": d, "hasta": h, "crecida": por.get(n)} for n, d, h in TEMPORADAS]}
    js = f"window.__VAL = {json.dumps(val)};\n" + (Path(__file__).parent / "correr_simulacion.js").read_text()
    url = f"http://localhost:8765/?punto={c['lon']:.4f},{c['lat']:.4f}&radio={RADIO_KM}"
    env = {**os.environ, "ABIERTO": "1", "LARGO": "20000000"}
    r = subprocess.run([sys.executable, str(RAIZ / "herramientas" / "cdp.py"), url, "1200", "800", "12", js], env=env,
                       capture_output=True, text=True, timeout=3600)
    linea = next((l for l in r.stdout.splitlines() if l.startswith("JS: ")), None)
    if not linea or linea.startswith("JS: None"):
        print(f"  {c['nombre']}: sin resultado\n{r.stdout[-1500:]}")
        return
    try:
        out = json.loads(linea[4:])
    except json.JSONDecodeError:
        out = {}
    if "temporadas" not in out:
        errores = [l for l in r.stdout.splitlines() if l.startswith(("JS ERROR", "EXCEPCION", "CONSOLA"))]
        print(f"  {c['nombre']}: sin resultado {out.get('error', '')} {' | '.join(errores)[:900]}")
        return
    out.update({"cmu": c["cmu"], "nombre": c["nombre"], "lon": c["lon"], "lat": c["lat"], "estacion_ina": est})
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(out))
    print(f"  {c['nombre']}: {out['seg_total']} s · río {est['estacion'] + ' (' + str(est['km']) + ' km)' if est else 'sin estación'} · "
          + " · ".join(f"{k} {v['lluvia_mm']} mm, balance {v['balance_pct']:.2f} %" for k, v in out["temporadas"].items()))


def mascara(b64: str, ny: int, nx: int) -> np.ndarray:
    return np.frombuffer(base64.b64decode(b64), dtype=np.uint8).reshape(ny, nx).astype(bool)


def observar(cmu: str) -> None:
    """Fracción de agua por celda (Dynamic World por temporada y JRC alguna vez) en la grilla exacta del modelo."""
    import ee
    sys.path.insert(0, str(RAIZ / "earth_engine"))
    from config import PROYECTO_EE
    from inundacion_observada import agua_periodo
    destino = SALIDA / "observado" / f"{cmu}.npz"
    sim = json.loads((SALIDA / "simulado" / f"{cmu}.json").read_text())
    if destino.exists():
        return
    ee.Initialize(project=PROYECTO_EE)
    G = sim["grilla"]
    R = 6378137.0
    x0, x1 = R * math.radians(G["oeste"]), R * math.radians(G["este"])
    y1 = R * math.log(math.tan(math.pi / 4 + math.radians(G["norte"]) / 2))
    y0 = R * math.log(math.tan(math.pi / 4 + math.radians(G["sur"]) / 2))
    sx, sy = (x1 - x0) / G["nx"], (y1 - y0) / G["ny"]
    proy = ee.Projection("EPSG:3857", [sx, 0, x0, 0, -sy, y1])
    region = ee.Geometry.Rectangle([G["oeste"], G["sur"], G["este"], G["norte"]], None, False)
    jrc = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence").unmask(0)
    permanente = jrc.gt(80)
    capas = {n: agua_periodo(d, h).And(permanente.Not()).rename(n) for n, d, h in TEMPORADAS}
    capas["jrc_alguna_vez"] = jrc.gt(0).And(permanente.Not()).rename("jrc_alguna_vez")
    img = ee.Image.cat(list(capas.values())).toFloat().unmask(0)
    fr = img.reduceResolution(ee.Reducer.mean(), maxPixels=1024).reproject(proy)
    arr = fr.sampleRectangle(region=region, defaultValue=0).getInfo()["properties"]
    datos = {k: np.array(v, dtype=np.float32) for k, v in arr.items()}
    for k, v in datos.items():   # sampleRectangle puede devolver una fila o columna de más en el borde
        datos[k] = v[: G["ny"], : G["nx"]]
    destino.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(destino, **datos)
    print(f"  observado {sim['nombre']}: " + ", ".join(f"{k} {100 * v.mean():.1f} %" for k, v in datos.items()))


def metricas(sim: np.ndarray, obs_frac: np.ndarray, valido: np.ndarray) -> dict:
    obs = obs_frac >= 0.5
    s, o = sim[valido], obs[valido]
    ac, fa, pe = int((s & o).sum()), int((s & ~o).sum()), int((~s & o).sum())
    return {"sup_sim_pct": round(100 * s.mean(), 2), "sup_obs_pct": round(100 * obs_frac[valido].mean(), 2),
            "pod": round(ac / (ac + pe), 3) if ac + pe else None, "far": round(fa / (ac + fa), 3) if ac + fa else None,
            "csi": round(ac / (ac + fa + pe), 3) if ac + fa + pe else None, "celdas_obs": int(o.sum()), "celdas_sim": int(s.sum())}


def resumir() -> None:
    filas = []
    for f in sorted((SALIDA / "simulado").glob("*.json")):
        sim = json.loads(f.read_text())
        o = SALIDA / "observado" / f"{sim['cmu']}.npz"
        if not o.exists():
            continue
        obs = dict(np.load(o))
        G = sim["grilla"]
        valido = mascara(G["tierra"], G["ny"], G["nx"]) & mascara(G["dentro"], G["ny"], G["nx"])
        for n, _, _ in TEMPORADAS:
            t = sim["temporadas"][n]
            m = metricas(mascara(t["mes"], G["ny"], G["nx"]), obs[n], valido)
            base = metricas(obs["jrc_alguna_vez"] >= 0.5, obs[n], valido)   # referencia trivial: donde hubo agua alguna vez
            filas.append({"cmu": sim["cmu"], "ciudad": sim["nombre"], "temporada": n, "lluvia_mm": t["lluvia_mm"],
                          "rio": sim["estacion_ina"]["rio"] if sim.get("estacion_ina") else None, "crecida_max_m": t["crecida_max"],
                          **m, "csi_jrc": base["csi"], "pod_jrc": base["pod"], "far_jrc": base["far"], "celda_m": round(G["dx"])})
    if not filas:
        print("sin resultados")
        return
    df = pd.DataFrame(filas)
    df.to_csv(SALIDA / "resultados.csv", index=False)
    nino = df[df["temporada"] != "referencia_2022_23"]
    rho = nino[["sup_sim_pct", "sup_obs_pct"]].corr(method="spearman").iloc[0, 1]
    # Las métricas por celda solo tienen sentido donde el satélite vio agua suficiente (20 celdas o más, ~0,5 km²)
    casos = nino[nino["celdas_obs"] >= MIN_CELDAS_OBS]
    med = lambda c: round(float(casos[c].median()), 3)
    resumen = {
        "generado": pd.Timestamp.now(tz="America/Argentina/Buenos_Aires").strftime("%Y-%m-%d"),
        "ciudades": int(df["cmu"].nunique()), "radio_km": RADIO_KM, "min_celdas_obs": MIN_CELDAS_OBS,
        "temporadas": [n for n, _, _ in TEMPORADAS],
        "nino": {"casos": int(len(casos)), "sin_agua_observada": int((nino["celdas_obs"] < MIN_CELDAS_OBS).sum()),
                 "pod_mediana": med("pod"), "far_mediana": med("far"), "csi_mediana": med("csi"), "csi_jrc_mediana": med("csi_jrc"),
                 "mejor_que_jrc": int((casos["csi"] > casos["csi_jrc"]).sum()),
                 "spearman_superficie": round(float(rho), 2) if pd.notna(rho) else None},
        "por_ciudad": {cmu: g.drop(columns=["cmu"]).astype(object).where(pd.notna(g.drop(columns=["cmu"])), None).to_dict(orient="records")
                       for cmu, g in df.groupby("cmu")},
    }
    (WEB / "datos" / "validacion.json").write_text(json.dumps(resumen, ensure_ascii=False, separators=(",", ":"), allow_nan=False, default=str))
    print(json.dumps(resumen["nino"], ensure_ascii=False))


if __name__ == "__main__":
    paso = sys.argv[1] if len(sys.argv) > 1 else "todo"
    elegidas = set(sys.argv[2:])
    lista = [c for c in ciudades() if not elegidas or c["cmu"] in elegidas or c["nombre"] in elegidas]
    if paso in ("simular", "todo"):
        for c in lista:
            for _ in range(2):   # un reintento si falla algo transitorio (red, teselas)
                simular(c)
                if (SALIDA / "simulado" / f"{c['cmu']}.json").exists():
                    break
    if paso in ("observar", "todo"):
        for c in lista:
            if (SALIDA / "simulado" / f"{c['cmu']}.json").exists():
                observar(c["cmu"])
    if paso in ("resumir", "todo"):
        resumir()

"""Validación del río contra el radar: crecida del río Uruguay en Concordia, noviembre de 2023 (Niño 2023-24).

El 26-nov-2023 el INA midió 13,79 m en Concordia (evacuación: 12,5 m) y Sentinel-1 pasó el 28-nov, con el río todavía alto.
El radar ve el agua a través de las nubes: el agua quieta refleja poco (se ve oscura, VV < −16 dB).
1. Simulado (correr_rio.js, en Chrome sin ventana con el sitio local): con la altura del INA de ese día respecto del nivel de
   evacuación, dónde queda agua de 10 cm o más según (a) la fórmula del peor Niño y (b) el modelo 3D (hidraulica.js), sin lluvia.
2. Observado (Earth Engine): agua en Sentinel-1 el 28-nov (VV < −16 dB, filtro de mediana de 50 m) que NO era agua en la
   referencia de río bajo (mediana de enero a marzo de 2023, sequía) ni es agua permanente (JRC > 80 %), en la grilla del modelo.
3. Comparación celda por celda en la tierra del círculo: aciertos (POD), falsas alarmas (FAR) y CSI. Primera corrida (15-nov-2026):
   con un límite fijo de 1 km de ribera la fórmula acertaba el 24 % (CSI 0,15); sin límite (tierra conectada y más baja que el
   río) acierta el 76 % (CSI 0,32), igual que el modelo 3D. El modelo 3D no inundaba nada sin lluvia: arrancaba «quieto». Límite conocido: el radar
   no ve bien el agua entre edificios (el rebote en las paredes la hace brillar), así que en la ciudad subestima lo inundado.

Salida: data/validacion/rio_radar.json y web/datos/validacion_rio.json
Uso: .venv/bin/python herramientas/validacion/validar_rio_radar.py   (servidor local en el puerto 8765)
"""
import base64
import json
import math
import os
import subprocess
import sys
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parents[2]
SALIDA = RAIZ / "data" / "validacion"
CASO = {"nombre": "Concordia", "lon": -58.02, "lat": -31.39, "radio": 5, "estacion": "79", "fecha": "2023-11-28",
        "radar": ("2023-11-28", "2023-11-29"), "referencia": ("2023-01-01", "2023-04-01")}


def mascara(b64: str, ny: int, nx: int) -> np.ndarray:
    return np.frombuffer(base64.b64decode(b64), dtype=np.uint8).reshape(ny, nx).astype(bool)


def simular() -> dict:
    destino = SALIDA / "rio_radar_simulado.json"
    if destino.exists():
        return json.loads(destino.read_text())
    S = json.loads((RAIZ / "web" / "datos" / "rios_ninos" / f"{CASO['estacion']}.json").read_text())["2023-24"]
    k = (np.datetime64(CASO["fecha"]) - np.datetime64(S["d0"])).astype(int)
    h = S["m"][k] / 100
    est = next(f["properties"] for f in json.loads((RAIZ / "web" / "datos" / "estaciones.geojson").read_text())["features"]
               if str(f["properties"]["estacion_id"]) == CASO["estacion"])
    ref = est["nivel_evacuacion"]
    js = f"window.__RIO = {json.dumps({'dRio': round(h - ref, 3), 'horas': 48})};\n" + (Path(__file__).parent / "correr_rio.js").read_text()
    url = f"http://localhost:8765/?punto={CASO['lon']:.4f},{CASO['lat']:.4f}&radio={CASO['radio']}"
    r = subprocess.run([sys.executable, str(RAIZ / "herramientas" / "cdp.py"), url, "1200", "800", "12", js],
                       env={**os.environ, "ABIERTO": "1", "LARGO": "20000000"}, capture_output=True, text=True, timeout=3600)
    linea = next((l for l in r.stdout.splitlines() if l.startswith("JS: ")), None)
    out = json.loads(linea[4:]) if linea and not linea.startswith("JS: None") else {"error": r.stdout[-1500:]}
    if "grilla" not in out:
        raise SystemExit(f"sin resultado: {out}")
    out.update({"altura_m": h, "evacuacion_m": ref})
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(out))
    return out


def observar(G: dict, umbral: float = -16.0) -> dict:
    import ee
    sys.path.insert(0, str(RAIZ / "earth_engine"))
    from config import PROYECTO_EE
    ee.Initialize(project=PROYECTO_EE)
    R = 6378137.0
    x0, x1 = R * math.radians(G["oeste"]), R * math.radians(G["este"])
    y1 = R * math.log(math.tan(math.pi / 4 + math.radians(G["norte"]) / 2))
    y0 = R * math.log(math.tan(math.pi / 4 + math.radians(G["sur"]) / 2))
    proy = ee.Projection("EPSG:3857", [(x1 - x0) / G["nx"], 0, x0, 0, -(y1 - y0) / G["ny"], y1])
    region = ee.Geometry.Rectangle([G["oeste"], G["sur"], G["este"], G["norte"]], None, False)
    s1 = ee.ImageCollection("COPERNICUS/S1_GRD").filterBounds(region).filter(ee.Filter.eq("instrumentMode", "IW")) \
        .filter(ee.Filter.eq("orbitProperties_pass", "DESCENDING")).select("VV")
    liso = lambda i: i.focalMedian(50, "circle", "meters")
    post = liso(s1.filterDate(*CASO["radar"]).mosaic())
    ref = liso(s1.filterDate(*CASO["referencia"]).median())
    jrc = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence").unmask(0)
    capas = {}
    for u in (umbral - 2, umbral, umbral + 1):   # sensibilidad al umbral del agua
        capas[f"agua_{abs(u):.0f}"] = post.lt(u).And(ref.gte(u)).And(jrc.lte(80)).rename(f"agua_{abs(u):.0f}")
    img = ee.Image.cat(list(capas.values())).toFloat().unmask(0)
    fr = img.reduceResolution(ee.Reducer.mean(), maxPixels=1024).reproject(proy)
    arr = fr.sampleRectangle(region=region, defaultValue=0).getInfo()["properties"]
    return {k: np.array(v, dtype=np.float32)[: G["ny"], : G["nx"]] for k, v in arr.items()}


def metricas(sim: np.ndarray, obs_frac: np.ndarray, valido: np.ndarray) -> dict:
    obs = obs_frac >= 0.5
    s, o = sim[valido], obs[valido]
    ac, fa, pe = int((s & o).sum()), int((s & ~o).sum()), int((~s & o).sum())
    return {"celdas_sim": int(s.sum()), "celdas_obs": int(o.sum()), "pod": round(ac / (ac + pe), 3) if ac + pe else None,
            "far": round(fa / (ac + fa), 3) if ac + fa else None, "csi": round(ac / (ac + fa + pe), 3) if ac + fa + pe else None}


def main() -> None:
    sim = simular()
    G = sim["grilla"]
    obs = observar(G)
    valido = mascara(G["tierra"], G["ny"], G["nx"]) & mascara(G["dentro"], G["ny"], G["nx"])
    res = {"caso": CASO, "altura_m": sim["altura_m"], "evacuacion_m": sim["evacuacion_m"], "celda_m": round(G["dx"]), "celdas_tierra": int(valido.sum()),
           "personas_formula": sim["personas_formula"], "resultados": {}}
    for k, o in obs.items():
        res["resultados"][k] = {"formula": metricas(mascara(sim["formula"], G["ny"], G["nx"]), o, valido),
                                "modelo3d": metricas(mascara(sim["modelo3d"], G["ny"], G["nx"]), o, valido)}
    (SALIDA / "rio_radar.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
    (RAIZ / "web" / "datos" / "validacion_rio.json").write_text(json.dumps(res, ensure_ascii=False))
    print(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()

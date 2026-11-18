"""Población expuesta con el mismo método del simulador, para todo el país.

Problema (17-nov-2026): el riesgo usaba «zona inundable» = vivir a menos de 2 m sobre el arroyo más cercano (HAND, relieve de ~90 m).
En la llanura casi todo cumple eso, y lugares en riesgo «alto» no juntaban agua ni con el peor Niño en el simulador.

Método: se cubre la población con círculos de 1,5 km de radio (centros cada 2,1 km, así se tocan sin huecos) y en cada uno se corre,
en Chrome sin ventana y con el código de la web, el cálculo del peor Niño del simulador (indiceNino: número de curva, bajos del
relieve de ~32 m llenados con priority-flood, desagües de 2 años y río de los días de la tormenta). Para cada radio censal se guarda
la fracción de su superficie con 10 cm de agua o más. Las consultas horarias a Open-Meteo se bloquean (cupo diario): la tormenta usa
el hietograma triangular con el total y el pico de IMERG, y la humedad media del suelo.

Salida: data/referencia/exposicion_simulador.parquet (cod_indec, cubierto, f0..f26: fracción del radio con agua para 9 lluvias
de 3 días × 3 humedades del suelo; ver exposicion_circulo.js). Se puede cortar y retomar.
Uso: .venv/bin/python herramientas/exposicion_simulador.py [procesos=4] [pob_min_circulo=100]
"""
import json
import subprocess
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import pandas as pd
import websocket

RAIZ = Path(__file__).resolve().parents[1]
CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CRUDO = RAIZ / "data" / "procesado" / "exposicion_simulador_v3.jsonl"
SALIDA = RAIZ / "data" / "referencia" / "exposicion_simulador.parquet"
URL = "http://127.0.0.1:8765/index.html?radio=1.5"
LOTE, RECARGA = 20, 150   # puntos por llamada; se recarga la página cada tantos puntos (memoria)
JS = (Path(__file__).parent / "exposicion_circulo.js").read_text()


def centros(pob_min: float) -> list:
    r = pd.read_parquet(RAIZ / "data" / "referencia" / "rasgos_radios.parquet", columns=["lat", "lon", "poblacion"])
    k = 2.1 / 111
    r["a"] = (r.lat / k).round().astype(int)
    r["b"] = (r.lon / (k / np.cos(np.radians(r.a * k)))).round().astype(int)
    g = r.groupby(["a", "b"]).poblacion.sum()
    g = g[g >= pob_min].sort_values(ascending=False)
    return [[round(b * k / np.cos(np.radians(a * k)), 5), round(a * k, 5)] for a, b in g.index]


def trabajador(i: int, puntos: list) -> None:
    """Reintenta con un Chrome nuevo si un lote se traba (red caída, página colgada): lo hecho ya quedó guardado."""
    for _ in range(20):
        hechos = {tuple(json.loads(l)["punto"]) for l in open(CRUDO)} if CRUDO.exists() else set()
        resto = [p for p in puntos if tuple(p) not in hechos]
        if not resto:
            return
        try:
            _trabajador(i, resto)
            return
        except Exception as e:   # noqa: BLE001
            print(f"[{i}] reintento tras error: {e}", flush=True)
            time.sleep(30)


def _trabajador(i: int, puntos: list) -> None:
    puerto = 9400 + i
    p = subprocess.Popen([CH, "--headless=new", f"--remote-debugging-port={puerto}", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
                          "--host-resolver-rules=MAP *.open-meteo.com 127.0.0.1:1, MAP api.open-meteo.com 127.0.0.1:1",
                          "--window-size=1440,900", f"--user-data-dir=/tmp/cdp_expo_{puerto}", "about:blank"], stderr=subprocess.DEVNULL)
    try:
        for _ in range(60):
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{puerto}/json")); break
            except Exception:
                time.sleep(0.3)
        ws = websocket.create_connection([t for t in tabs if t["type"] == "page"][0]["webSocketDebuggerUrl"], suppress_origin=True, timeout=900)
        n = [0]

        def cmd(m, **pa):
            n[0] += 1; ws.send(json.dumps({"id": n[0], "method": m, "params": pa}))
            while True:
                r = json.loads(ws.recv())
                if r.get("id") == n[0]:
                    return r.get("result", {})
        hechos = 0
        for j in range(0, len(puntos), LOTE):
            if hechos % RECARGA == 0:
                cmd("Page.navigate", url=URL); time.sleep(7)
                cmd("Runtime.evaluate", expression=JS)
            lote = puntos[j:j + LOTE]
            r = cmd("Runtime.evaluate", expression=f"(async()=>{{const o=[];for(const p of {json.dumps(lote)})o.push(await __circulo(p));return JSON.stringify(o)}})()",
                    awaitPromise=True, returnByValue=True)
            filas = json.loads(r.get("result", {}).get("value") or "[]")
            with open(CRUDO, "a") as f:
                for x in filas:
                    f.write(json.dumps(x) + "\n")
            hechos += len(lote)
            print(f"[{i}] {hechos}/{len(puntos)}", flush=True)
    finally:
        p.terminate()


def resumir() -> None:
    """Por radio, la suma de los cuadrados centrales que lo cubren (sin superposición): fracción de su superficie con 10 cm o más
    de agua para cada lluvia de 3 días y humedad del suelo (27 columnas f0..f26, en el orden de EXPO_W × EXPO_P)."""
    suma = {}
    for linea in open(CRUDO):
        for cod, vis, tot, moj in json.loads(linea).get("radios", []):
            v, t, m = suma.get(cod, (0, tot, np.zeros(27)))
            suma[cod] = (v + vis, t, m + np.array(moj))
    filas = [[c, v / max(t, 1), *(m / v)] for c, (v, t, m) in suma.items() if v]
    d = pd.DataFrame(filas, columns=["cod_indec", "cubierto", *[f"f{k}" for k in range(27)]])
    d.to_parquet(SALIDA, index=False)
    print(f"{SALIDA.name}: {len(d)} radios; con agua con 300 mm y suelo mojado: {(d.f26 > 0).sum()}")


if __name__ == "__main__":
    if sys.argv[1:2] == ["resumir"]:
        resumir(); sys.exit()
    procesos = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    pts = centros(float(sys.argv[2]) if len(sys.argv) > 2 else 100)
    hechos = {tuple(json.loads(l)["punto"]) for l in open(CRUDO)} if CRUDO.exists() else set()
    pts = [p for p in pts if tuple(p) not in hechos]
    CRUDO.parent.mkdir(parents=True, exist_ok=True)
    print(f"{len(pts)} círculos por calcular ({len(hechos)} hechos)", flush=True)
    with ThreadPoolExecutor(procesos) as ex:
        list(ex.map(lambda i: trabajador(i, pts[i::procesos]), range(procesos)))
    resumir()

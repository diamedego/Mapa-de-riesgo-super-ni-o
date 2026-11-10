"""Prueba la web en Chrome sin ventana: abre una URL, espera, ejecuta JavaScript e imprime el resultado (y los errores de consola).

Uso: .venv/bin/python herramientas/cdp.py URL ancho alto espera_seg "codigo_js" [captura.png]
Variables: ABIERTO=1 deja usar servicios externos (si no, se bloquean los mapas base y el relieve); TEMA=dark; POST=seg extra.
La captura es opcional (por defecto no se guarda: las pruebas devuelven datos, no imágenes).
"""
import base64, json, os, subprocess, sys, time, urllib.request
import websocket

url, w, h, espera, js = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
captura = sys.argv[6] if len(sys.argv) > 6 else None
CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
bloqueo = [] if os.environ.get("ABIERTO") else ["--host-resolver-rules=MAP apis.datos.gob.ar 127.0.0.1:1, MAP tiles.openfreemap.org 127.0.0.1:1, MAP s3.amazonaws.com 127.0.0.1:1"]
p = subprocess.Popen([CH, "--headless=new", "--remote-debugging-port=9333", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
                      *bloqueo, f"--window-size={w},{h}", "--user-data-dir=/tmp/cdp_perfil_2", "about:blank"], stderr=subprocess.DEVNULL)
try:
    for _ in range(60):
        try:
            tabs = json.load(urllib.request.urlopen("http://127.0.0.1:9333/json")); break
        except Exception:
            time.sleep(0.2)
    ws = websocket.create_connection([t for t in tabs if t["type"] == "page"][0]["webSocketDebuggerUrl"], suppress_origin=True)
    n = 0

    def cmd(m, **pa):
        global n
        n += 1; ws.send(json.dumps({"id": n, "method": m, "params": pa}))
        while True:
            r = json.loads(ws.recv())
            if r.get("id") == n:
                return r.get("result", {})
            if r.get("method") == "Runtime.consoleAPICalled" and r["params"]["type"] in ("error", "assert"):
                print("CONSOLA:", str([a.get("value", a.get("description")) for a in r["params"]["args"]])[:400])
            if r.get("method") == "Runtime.exceptionThrown":
                d = r["params"]["exceptionDetails"]
                print("EXCEPCION:", d.get("exception", {}).get("description", d.get("text"))[:600])

    cmd("Runtime.enable"); cmd("Network.enable"); cmd("Network.setCacheDisabled", cacheDisabled=True)
    cmd("Emulation.setDeviceMetricsOverride", width=w, height=h, deviceScaleFactor=1, mobile=w < 700)
    if os.environ.get("TEMA"):
        cmd("Emulation.setEmulatedMedia", features=[{"name": "prefers-color-scheme", "value": os.environ["TEMA"]}])
    cmd("Page.navigate", url=url)
    fin = time.time() + espera
    while time.time() < fin:
        cmd("Runtime.evaluate", expression="1"); time.sleep(0.5)
    r = cmd("Runtime.evaluate", expression=js, awaitPromise=True, returnByValue=True)
    if "exceptionDetails" in r:
        print("JS ERROR:", str(r["exceptionDetails"])[:800])
    print("JS:", str(r.get("result", {}).get("value"))[:4000])
    fin = time.time() + float(os.environ.get("POST", 0))
    while time.time() < fin:
        cmd("Runtime.evaluate", expression="1"); time.sleep(0.5)
    if captura:
        open(captura, "wb").write(base64.b64decode(cmd("Page.captureScreenshot", format="png")["data"]))
finally:
    p.terminate()

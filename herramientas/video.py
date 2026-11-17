"""Graba un video del sitio con Chrome sin ventana: ejecuta un guion de acciones con tiempos y captura cuadros, y los une con ffmpeg.

Uso: .venv/bin/python herramientas/video.py salida.mp4
El guion está abajo (GUION): (segundo, código JS). Se captura a FPS cuadros por segundo durante DURACION segundos.
"""
import base64, json, os, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path

import imageio_ffmpeg
import websocket

URL = "http://127.0.0.1:8765/index.html"
W, H, ESCALA, FPS, DURACION = 1280, 720, 1.5, 10, 26
GUION = [
    (0.0, "true"),
    (3.0, "mapa.flyTo({center:[-60.3,-31.2],zoom:7.2,duration:3500})"),
    (8.0, "seleccionarPunto([-59.65,-30.74],{volar:true})"),
    (13.0, "irALamina(2)"),
    (19.0, "(()=>{const t=setInterval(()=>{if(SIM.modelo&&!SIM.modelo.corriendo){clearInterval(t);reproducirSimulador()}},200)})()"),
]
CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def main(salida: str) -> None:
    p = subprocess.Popen([CH, "--headless=new", "--remote-debugging-port=9350", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
                          f"--window-size={W},{H}", "--user-data-dir=/tmp/cdp_video", "about:blank"], stderr=subprocess.DEVNULL)
    try:
        for _ in range(60):
            try:
                tabs = json.load(urllib.request.urlopen("http://127.0.0.1:9350/json")); break
            except Exception:
                time.sleep(0.2)
        ws = websocket.create_connection([t for t in tabs if t["type"] == "page"][0]["webSocketDebuggerUrl"], suppress_origin=True)
        n = [0]

        def cmd(m, **pa):
            n[0] += 1; ws.send(json.dumps({"id": n[0], "method": m, "params": pa}))
            while True:
                r = json.loads(ws.recv())
                if r.get("id") == n[0]:
                    return r.get("result", {})
        cmd("Emulation.setDeviceMetricsOverride", width=W, height=H, deviceScaleFactor=ESCALA, mobile=False)
        cmd("Page.enable"); cmd("Page.navigate", url=URL)
        time.sleep(9)   # carga del mapa y los datos
        tmp = Path(tempfile.mkdtemp())
        t0, k, pend = time.time(), 0, list(GUION)
        while (ahora := time.time() - t0) < DURACION:
            while pend and pend[0][0] <= ahora:
                cmd("Runtime.evaluate", expression=pend.pop(0)[1])
            img = cmd("Page.captureScreenshot", format="jpeg", quality=85)["data"]
            (tmp / f"c{k:05d}.jpg").write_bytes(base64.b64decode(img)); k += 1
            time.sleep(max(0, (k / FPS) - (time.time() - t0)))
        fps_real = k / DURACION
        subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error", "-framerate", f"{fps_real:.2f}", "-i", str(tmp / "c%05d.jpg"),
                        "-vf", "scale=1920:-2,format=yuv420p", "-c:v", "libx264", "-crf", "23", "-r", "30", salida], check=True)
        print(f"{k} cuadros ({fps_real:.1f} por segundo) → {salida}")
    finally:
        p.terminate()


if __name__ == "__main__":
    main(sys.argv[1])

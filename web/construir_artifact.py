"""Arma una versión de la web en un solo HTML para verla en privado en claude.ai (desde el celular).

Ese entorno solo deja cargar scripts de CDNs conocidos y los archivos propios: se inlinan los estilos
(los de MapLibre incluidos) y app.js, y se activa SIN_TESELAS (sin mapa base ni relieve externos).
Los datos (web/datos/) se publican como archivos aparte.

Uso: python web/construir_artifact.py <ruta_salida.html>
"""
import re
import sys
import urllib.request
from pathlib import Path

WEB = Path(__file__).resolve().parent
MAPLIBRE = "https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl"


def main(salida: Path) -> None:
    html = (WEB / "index.html").read_text()
    cuerpo = re.search(r"<body>(.*)</body>", html, re.S).group(1)
    cuerpo = re.sub(r'<script src="app.js"></script>', "", cuerpo)
    cuerpo = re.sub(r'<script src="https://cdn.jsdelivr.net/npm/maplibre-gl[^"]+"></script>', "", cuerpo)
    css_maplibre = urllib.request.urlopen(f"{MAPLIBRE}.css", timeout=60).read().decode()
    pagina = f"""<title>Argentina frente a El Niño 2026-27</title>
<style>{css_maplibre}</style>
<style>{(WEB / "estilos.css").read_text()}</style>
{cuerpo.strip()}
<script src="{MAPLIBRE}.js"></script>
<script>window.SIN_TESELAS = true;</script>
<script>{(WEB / "app.js").read_text()}</script>
"""
    salida.write_text(pagina)
    print(f"{salida}: {salida.stat().st_size / 1e3:.0f} KB")


if __name__ == "__main__":
    main(Path(sys.argv[1]))

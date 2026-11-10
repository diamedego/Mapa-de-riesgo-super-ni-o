"""Arma una versión de la web en un solo HTML para verla en privado en claude.ai (desde el celular).

Ese entorno solo deja cargar scripts de CDNs conocidos, hojas de estilo de Google Fonts y los archivos propios:
se inlinan los estilos (los de MapLibre incluidos) y los módulos de JavaScript, y se activa SIN_TESELAS
(mapa base propio: calles y agua de web/datos/base, sin relieve externo). Los datos se publican como archivos aparte.

Uso: python web/construir_artifact.py <ruta_salida.html>
"""
import re
import sys
import urllib.request
from pathlib import Path

WEB = Path(__file__).resolve().parent
MAPLIBRE = "https://cdn.jsdelivr.net/npm/maplibre-gl@5.24.0/dist/maplibre-gl"
MODULOS = ["textos", "utiles", "graficos", "tiempo", "mapa", "buscador", "tableros", "modelo_inundacion", "simulador", "app"]


def main(salida: Path) -> None:
    html = (WEB / "index.html").read_text()
    cuerpo = re.search(r"<body>(.*)</body>", html, re.S).group(1)
    cuerpo = re.sub(r'<script src="[^"]+"></script>\s*', "", cuerpo)
    fuentes = re.search(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com/[^"]+)">', html).group(1)
    css_maplibre = urllib.request.urlopen(f"{MAPLIBRE}.css", timeout=60).read().decode()
    scripts = "\n".join(f"<script>{(WEB / f'{m}.js').read_text()}</script>" for m in MODULOS)
    pagina = f"""<title>Argentina frente a El Niño 2026-27</title>
<link rel="stylesheet" href="{fuentes}">
<style>{css_maplibre}</style>
<style>{(WEB / "estilos.css").read_text()}</style>
{cuerpo.strip()}
<script src="{MAPLIBRE}.js"></script>
<script>window.SIN_TESELAS = true;</script>
{scripts}
"""
    salida.write_text(pagina)
    print(f"{salida}: {salida.stat().st_size / 1e3:.0f} KB")


if __name__ == "__main__":
    main(Path(sys.argv[1]))

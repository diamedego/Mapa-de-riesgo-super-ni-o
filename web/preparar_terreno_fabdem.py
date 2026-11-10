"""Terreno sin edificios ni árboles (FABDEM V1-2, 30 m) para las 20 ciudades con más personas en riesgo.

FABDEM: Hawker y otros (2022), Universidad de Bristol, licencia CC BY-NC-SA 4.0 (uso no comercial). Es el modelo Copernicus
GLO-30 al que se le quitaron edificios y árboles con aprendizaje automático: para inundaciones urbanas es mucho mejor que el
relieve satelital común (que mide techos y copas).

Se recorta cada ciudad (su municipio + ~13 km alrededor) en bloques de 0,25° (900 × 900 píxeles, ~1-2 MB) codificados como
Terrarium (altura = R·256 + G + B/256 − 32768) y un índice. El simulador usa estos bloques cuando el círculo cae completo
dentro de ellos; si no, el relieve de AWS.

Entrada: data/raw/fabdem/*.zip (data.bris.ac.uk, 10° × 10°). Salida: web/datos/terreno/ (se publica).
Uso: .venv/bin/python web/preparar_terreno_fabdem.py   (procesa lo que haya descargado; se puede volver a correr)
"""
import io
import json
import math
import zipfile
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image

RAIZ = Path(__file__).resolve().parents[1]
WEB = Path(__file__).resolve().parent
SALIDA = WEB / "datos" / "terreno"
BLOQUE = 0.25          # grados
PX = int(BLOQUE * 3600)  # 900 píxeles de 1 segundo de arco
MARGEN = 0.12          # ~13 km alrededor del municipio


def ciudades() -> list[dict]:
    R = json.loads((WEB / "datos" / "riesgo.json").read_text())
    geo = json.loads((WEB / "datos" / "municipios_geo.geojson").read_text())
    por_cmu = {f["properties"]["cmu"]: f for f in geo["features"]}
    top = sorted(R["cmu"].items(), key=lambda kv: -max(kv[1]["p"]))[:20]
    out = []
    for c, _ in top:
        f = por_cmu[c]
        cs = f["geometry"]["coordinates"]
        pts = [p for pol in (cs if f["geometry"]["type"] == "MultiPolygon" else [cs]) for anillo in pol for p in anillo]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        out.append({"cmu": c, "nombre": f["properties"]["nam"], "caja": [min(xs) - MARGEN, min(ys) - MARGEN, max(xs) + MARGEN, max(ys) + MARGEN]})
    return out


def zips() -> dict:
    """Nombre del archivo .tif de 1° → zip que lo contiene."""
    idx = {}
    for z in sorted((RAIZ / "data" / "raw" / "fabdem").glob("*.zip")):
        try:
            for n in zipfile.ZipFile(z).namelist():
                if n.endswith(".tif"):
                    idx[n] = z
        except zipfile.BadZipFile:   # todavía descargándose
            pass
    return idx


_cache: dict = {}
def hoja(lat_sur: int, lon_oeste: int, idx: dict):
    """Grilla de 1° (3600 × 3600) cuya esquina suroeste es (lat_sur, lon_oeste); None si no está descargada."""
    nombre = f"S{-lat_sur:02d}W{-lon_oeste:03d}_FABDEM_V1-2.tif"
    if nombre not in _cache:
        if nombre not in idx:
            _cache[nombre] = None
        else:
            with tifffile.TiffFile(io.BytesIO(zipfile.ZipFile(idx[nombre]).read(nombre))) as t:
                _cache[nombre] = t.pages[0].asarray()
    return _cache[nombre]


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    idx = zips()
    lista = ciudades()
    bloques = set()
    for c in lista:
        x0, y0, x1, y1 = c["caja"]
        for bx in range(math.floor(x0 / BLOQUE), math.floor(x1 / BLOQUE) + 1):
            for by in range(math.floor(y0 / BLOQUE), math.floor(y1 / BLOQUE) + 1):
                bloques.add((bx, by))
    hechos, faltan = [], 0
    for bx, by in sorted(bloques):
        lon0, lat0 = bx * BLOQUE, by * BLOQUE          # esquina suroeste del bloque
        lon_h, lat_h = math.floor(lon0), math.floor(lat0)
        a = hoja(lat_h, lon_h, idx)
        if a is None:
            faltan += 1
            continue
        # Filas: la grilla de 1° empieza arriba (lat_h + 1)
        fila0 = round((lat_h + 1 - (lat0 + BLOQUE)) * 3600)
        col0 = round((lon0 - lon_h) * 3600)
        z = a[fila0:fila0 + PX, col0:col0 + PX].astype(np.float64)
        z[z < -1000] = 0.0                              # sin dato (mar): 0 m
        v = np.clip(np.round((z + 32768) * 256), 0, 2 ** 24 - 1).astype(np.uint32)
        rgb = np.stack([(v >> 16) & 255, (v >> 8) & 255, v & 255], axis=-1).astype(np.uint8)
        archivo = f"fabdem_{bx}_{by}.png"
        Image.fromarray(rgb, "RGB").save(SALIDA / archivo, optimize=True)
        hechos.append({"lon0": round(lon0, 4), "lat0": round(lat0, 4), "archivo": archivo})
    indice = {"fuente": "FABDEM V1-2 (Hawker et al. 2022, Universidad de Bristol), CC BY-NC-SA 4.0", "bloque": BLOQUE, "px": PX,
              "ciudades": [{"cmu": c["cmu"], "nombre": c["nombre"]} for c in lista], "bloques": hechos}
    (SALIDA / "indice.json").write_text(json.dumps(indice, ensure_ascii=False, indent=1))
    tam = sum((SALIDA / b["archivo"]).stat().st_size for b in hechos) / 1e6
    print(f"terreno FABDEM: {len(hechos)} bloques ({tam:.0f} MB); faltan {faltan} (zip sin descargar)")


if __name__ == "__main__":
    main()

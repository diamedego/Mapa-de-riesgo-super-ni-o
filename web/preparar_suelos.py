"""Mapa nacional de textura del suelo (primeros 30 cm) para la infiltración del simulador.

Fuente: SoilGrids 2.0 (ISRIC, CC BY 4.0), arcilla y arena medias a 0-5, 5-15 y 15-30 cm, pedidas por WCS a ~0,02° (~2 km).
Se promedian por espesor, se clasifican con el triángulo textural USDA y se guardan como una imagen de clases (un píxel =
una clase) más un índice con los parámetros de Green-Ampt de Rawls, Brakensiek y Miller (1983).

Salida: web/datos/suelo/textura.png y web/datos/suelo/indice.json. Uso: .venv/bin/python web/preparar_suelos.py
"""
import io
import json
import time
import urllib.request
from pathlib import Path

import numpy as np
import tifffile
from PIL import Image

SALIDA = Path(__file__).resolve().parent / "datos" / "suelo"
CAJA = (-74.0, -56.0, -53.0, -21.5)   # oeste, sur, este, norte
PASO = 0.02
CAPAS = [("0-5cm", 5), ("5-15cm", 10), ("15-30cm", 15)]
# Clases USDA → nombre en castellano y parámetros Green-Ampt (Ks mm/h, succión mm, porosidad)
CLASES = [
    ("sin dato", None), ("arenoso", (117.8, 49.5, 0.437)), ("arenoso franco", (29.9, 61.3, 0.437)),
    ("franco arenoso", (10.9, 110.1, 0.453)), ("franco", (3.4, 88.9, 0.463)), ("franco limoso", (6.5, 166.8, 0.501)),
    ("limoso", (6.5, 166.8, 0.501)), ("franco arcillo arenoso", (1.5, 218.5, 0.398)), ("franco arcilloso", (1.0, 208.8, 0.464)),
    ("franco arcillo limoso", (1.0, 273.0, 0.471)), ("arcillo arenoso", (0.6, 239.0, 0.430)), ("arcillo limoso", (0.5, 292.2, 0.479)),
    ("arcilloso", (0.3, 316.3, 0.475)),
]


def pedir(propiedad: str, capa: str) -> np.ndarray:
    o, s, e, n = CAJA
    nx, ny = round((e - o) / PASO), round((n - s) / PASO)
    url = (f"https://maps.isric.org/mapserv?map=/map/{propiedad}.map&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage"
           f"&COVERAGEID={propiedad}_{capa}_mean&FORMAT=image/tiff&SUBSET=long({o},{e})&SUBSET=lat({s},{n})"
           f"&SUBSETTINGCRS=http://www.opengis.net/def/crs/EPSG/0/4326&OUTPUTCRS=http://www.opengis.net/def/crs/EPSG/0/4326"
           f"&SCALESIZE=long({nx}),lat({ny})")
    for intento in range(4):
        try:
            datos = urllib.request.urlopen(url, timeout=300).read()
            return tifffile.imread(io.BytesIO(datos)).astype(np.float32)
        except Exception as ex:
            print(f"  {propiedad} {capa}: {ex}; reintento")
            time.sleep(20 * (intento + 1))
    raise RuntimeError(f"SoilGrids no respondió: {propiedad} {capa}")


def clase_usda(arena, limo, arcilla):
    c = np.zeros(arena.shape, np.uint8)
    reglas = [  # en orden: la primera que se cumple
        (12, (arcilla >= 40) & (limo < 40) & (arena <= 45)),
        (11, (arcilla >= 40) & (limo >= 40)),
        (10, (arcilla >= 35) & (arena > 45)),
        (9, (arcilla >= 27) & (arcilla < 40) & (arena <= 20)),
        (8, (arcilla >= 27) & (arcilla < 40) & (arena > 20) & (arena <= 45)),
        (7, (arcilla >= 20) & (arcilla < 35) & (limo < 28) & (arena > 45)),
        (6, (limo >= 80) & (arcilla < 12)),
        (5, (limo >= 50) & (((arcilla >= 12) & (arcilla < 27)) | ((limo < 80) & (arcilla < 12)))),
        (4, (arcilla >= 7) & (arcilla < 27) & (limo >= 28) & (limo < 50) & (arena <= 52)),
        (1, (limo + 1.5 * arcilla) < 15),
        (2, ((limo + 1.5 * arcilla) >= 15) & ((limo + 2 * arcilla) < 30)),
        (3, np.ones(arena.shape, bool)),
    ]
    sin = np.ones(arena.shape, bool)
    for k, m in reglas:
        sel = m & sin & (c == 0)
        c[sel] = k
    return c


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    arcilla = arena = 0
    for capa, espesor in CAPAS:
        arcilla = arcilla + pedir("clay", capa) * espesor
        arena = arena + pedir("sand", capa) * espesor
    total = sum(e for _, e in CAPAS)
    arcilla, arena = arcilla / total / 10, arena / total / 10    # g/kg → %
    valido = (arcilla > 0) | (arena > 0)
    limo = np.clip(100 - arcilla - arena, 0, 100)
    c = clase_usda(arena, limo, arcilla)
    c[~valido] = 0
    Image.fromarray(c, "L").save(SALIDA / "textura.png", optimize=True)
    o, s, e, n = CAJA
    (SALIDA / "indice.json").write_text(json.dumps({
        "fuente": "SoilGrids 2.0 (ISRIC, CC BY 4.0), arcilla y arena 0-30 cm; clases USDA; Green-Ampt de Rawls et al. (1983)",
        "oeste": o, "sur": s, "este": e, "norte": n, "paso": PASO,
        "clases": [{"nombre": nom, "ks": p[0], "psi": p[1], "thetaS": p[2]} if p else {"nombre": nom} for nom, p in CLASES]},
        ensure_ascii=False, indent=1))
    vals, cuenta = np.unique(c[valido], return_counts=True)
    print("textura.png:", c.shape, {CLASES[v][0]: int(k) for v, k in zip(vals, cuenta)})


if __name__ == "__main__":
    main()

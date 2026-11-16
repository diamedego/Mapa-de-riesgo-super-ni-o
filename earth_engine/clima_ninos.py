"""Lo que el simulador pedía a Open-Meteo cada vez que se abría, precalculado por celda de 0,1° (la misma grilla de lluvia_ninos.py).

Antes, cada apertura del simulador bajaba del archivo de Open-Meteo la lluvia diaria de 1951 a 2024 y la humedad y la evaporación
diarias desde 1997 en el punto: unas 350 unidades del cupo gratis diario de 10.000 por IP, que comparten todas las personas de una
misma red (una oficina con 30 aperturas lo agotaba). Ahora salen de teselas propias:

- Humedad del suelo (0-7 cm, ERA5-Land): mínimo y máximo de los días de octubre a abril de los Niños con datos completos (desde
  1997-98): el rango de la barra de humedad y la base de la humedad relativa del peor Niño (w de Brocca).
- Evapotranspiración de referencia: media diaria de esos mismos días, con la fórmula de Hargreaves (FAO-56, ecuación 52) con las
  temperaturas máxima y mínima de ERA5-Land y la radiación extraterrestre de la latitud y el día.
- Niños de 1951 a 1996 (solo el cuadro informativo): la peor lluvia de 3 días seguidos de octubre a abril (ERA5-Land) y su primer
  día.

Salida: web/datos/clima_ninos/<tesela>.bin (las mismas teselas de 2° × 2° de lluvia_ninos, Int16) + indice.json.
Uso: .venv/bin/python earth_engine/clima_ninos.py
"""
import json
import math
import sys
import time
from pathlib import Path

import ee
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import PROYECTO_EE  # noqa: E402
import lluvia_ninos as LN  # noqa: E402  (misma grilla, descarga y teselas)

RAIZ = Path(__file__).resolve().parents[1]
CRUDO = RAIZ / "data" / "procesado" / "clima_ninos.npy"
PARTES = RAIZ / "data" / "procesado" / "clima_ninos"
SALIDA = RAIZ / "web" / "datos" / "clima_ninos"
ANTIGUOS = [1951, 1952, 1953, 1957, 1958, 1963, 1965, 1968, 1969, 1972, 1976, 1977, 1979, 1982, 1986, 1987, 1991, 1994]   # Niños antes de 1997
DIARIO = "ECMWF/ERA5_LAND/DAILY_AGGR"


def temporada(anio: int) -> ee.ImageCollection:
    return ee.ImageCollection(DIARIO).filterDate(f"{anio}-10-01", f"{anio + 1}-05-01")


def et0_hargreaves(img: ee.Image) -> ee.Image:
    """ET0 (mm/día) = 0,0023 · (Tmedia + 17,8) · √(Tmáx − Tmín) · 0,408 · Ra, con Ra en MJ/m²/día (FAO-56, ecuaciones 21 a 25 y 52)."""
    j = ee.Number(ee.Date(img.get("system:time_start")).getRelative("day", "year")).add(1)
    b = j.multiply(2 * math.pi / 365)
    dr, dec = b.cos().multiply(0.033).add(1), b.subtract(1.39).sin().multiply(0.409)
    lat = ee.Image.pixelLonLat().select("latitude").multiply(math.pi / 180)
    ws = lat.tan().multiply(ee.Image.constant(dec).tan()).multiply(-1).clamp(-1, 1).acos()
    ra = ws.multiply(lat.sin()).multiply(ee.Image.constant(dec).sin()).add(lat.cos().multiply(ee.Image.constant(dec).cos()).multiply(ws.sin())) \
        .multiply(ee.Image.constant(dr)).multiply(24 * 60 / math.pi * 0.0820)
    tmax, tmin = img.select("temperature_2m_max").subtract(273.15), img.select("temperature_2m_min").subtract(273.15)
    return tmax.add(tmin).divide(2).add(17.8).multiply(tmax.subtract(tmin).max(0).sqrt()).multiply(ra).multiply(0.0023 * 0.408).rename("et0")


def peor_antigua(anio: int) -> ee.Image:
    """Peor lluvia de 3 días seguidos de la temporada (mm) y su primer día (desde el 1 de octubre), sin bajar los días."""
    col = temporada(anio).select("total_precipitation_sum")
    n = int((np.datetime64(f"{anio + 1}-05-01") - np.datetime64(f"{anio}-10-01")).astype(int))
    d0 = ee.Date(f"{anio}-10-01")
    ventanas = ee.ImageCollection(ee.List.sequence(0, n - 3).map(lambda k: col.filterDate(d0.advance(k, "day"), d0.advance(ee.Number(k).add(3), "day"))
                                                                  .sum().multiply(1000).rename("t3").addBands(ee.Image.constant(k).toFloat().rename("d0"))))
    return ventanas.qualityMosaic("t3").rename([f"t3_{anio}", f"d0_{anio}"])


def calcular() -> np.ndarray:
    """De a partes chicas (grupos de bandas × franjas de 4,3° de latitud), guardadas para retomar si Earth Engine corta un pedido."""
    completos = ee.ImageCollection([])
    for a in LN.TEMPORADAS:
        completos = completos.merge(temporada(a))
    sm = completos.select("volumetric_soil_water_layer_1")
    grupos = [sm.min().rename("hmin").addBands(sm.max().rename("hmax")).addBands(completos.map(et0_hargreaves).mean().rename("et0"))]
    grupos += [ee.Image.cat([peor_antigua(a) for a in ANTIGUOS[k:k + 3]]) for k in range(0, len(ANTIGUOS), 3)]
    PARTES.mkdir(parents=True, exist_ok=True)
    salida = []
    for g, img in enumerate(grupos):
        franjas = []
        for j in range(0, LN.ALTO, 43):
            f = PARTES / f"g{g}_f{j}.npy"
            if not f.exists():
                t = time.time()
                a = LN.bajar(img.toFloat(), LN.OESTE, LN.NORTE - j * LN.PASO, LN.ANCHO, min(43, LN.ALTO - j))
                np.save(f, np.stack([a[n] for n in a.dtype.names]).astype(np.float32))
                print(f"  grupo {g + 1} de {len(grupos)}, franja {j // 43 + 1} de {-(-LN.ALTO // 43)}: {time.time() - t:.0f} s", flush=True)
            franjas.append(np.load(f))
        salida.append(np.concatenate(franjas, axis=1))
    return np.concatenate(salida, axis=0)   # banda × fila × columna


def teselas(B: np.ndarray) -> None:
    """Int16 por celda: hmin y hmax (× 10.000, m³/m³), et0 (× 100, mm/día) y, por cada Niño antiguo, t3 (× 10, mm) y d0 (día)."""
    I = json.loads((LN.SALIDA / "indice.json").read_text())   # las mismas teselas de lluvia_ninos (donde hay Argentina)
    n = I["tesela"]
    esc = np.array([10000, 10000, 100] + [10, 1] * len(ANTIGUOS), dtype=np.float32)[:, None, None]
    ny, nx = -(-LN.ALTO // n), -(-LN.ANCHO // n)
    B = np.pad(B, ((0, 0), (0, ny * n - LN.ALTO), (0, nx * n - LN.ANCHO)), constant_values=np.nan)
    D = np.where(np.isfinite(B), B * esc, -1).round().clip(-32768, 32767).astype("<i2")
    SALIDA.mkdir(parents=True, exist_ok=True)
    for nombre in I["teselas"]:
        tx, ty = map(int, nombre.split("_"))
        (SALIDA / f"{nombre}.bin").write_bytes(D[:, ty * n:(ty + 1) * n, tx * n:(tx + 1) * n].reshape(-1).tobytes())
    indice = {k: I[k] for k in ("oeste", "norte", "paso", "ancho", "alto", "tesela", "teselas")}
    indice.update({"bandas": ["hmin", "hmax", "et0"] + [f"{b}_{a}" for a in ANTIGUOS for b in ("t3", "d0")],
                   "escala": {"hmin": 10000, "hmax": 10000, "et0": 100, "t3": 10, "d0": 1}, "antiguos": ANTIGUOS,
                   "temporadas_humedad": LN.TEMPORADAS,
                   "fuente": "ERA5-Land diario (Earth Engine): humedad 0-7 cm, ET0 de Hargreaves y lluvia; earth_engine/clima_ninos.py"})
    (SALIDA / "indice.json").write_text(json.dumps(indice, separators=(",", ":")))
    tam = sum((SALIDA / f"{x}.bin").stat().st_size for x in I["teselas"]) / 1e6
    print(f"clima_ninos: {len(I['teselas'])} teselas, {tam:.1f} MB")


if __name__ == "__main__":
    ee.Initialize(project=PROYECTO_EE)
    if CRUDO.exists():
        B = np.load(CRUDO)
    else:
        B = calcular()
        CRUDO.parent.mkdir(parents=True, exist_ok=True)
        np.save(CRUDO, B)
    f, c = int((LN.NORTE + 34.10) / LN.PASO), int((-59.03 - LN.OESTE) / LN.PASO)
    print("Zárate:", {k: round(float(B[i, f, c]), 3) for i, k in enumerate(["hmin", "hmax", "et0", "t3_1951", "d0_1951"])})
    teselas(B)

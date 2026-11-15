"""La peor tormenta de cada Niño en cada celda de 0,1° (~11 km) de Argentina, con la lluvia del satélite IMERG.

Por qué IMERG (validar_lluvia.py, 482 tormentas en 235 pluviómetros del INA y del SMN, 2002-2026; peor tormenta de 3 días de
cada temporada): en las tormentas de 100 mm o más, las que inundan, IMERG da el 82 % de lo medido con un error mediano del 24 %;
el reanálisis ERA5, el 60 % (error 40 %), y el promedio de los dos, el 65 % (error 35 %). IMERG exagera las lluvias chicas
(< 60 mm), que no son las que definen el peor Niño. Una tormenta convectiva cae en pocos kilómetros y el reanálisis la diluye.

Fuentes (Earth Engine, gratis):
- IMERG V07 Final (NASA/GPM_L3/IMERG_V07): satélites calibrados con pluviómetros (GPCC), 0,1°, cada 30 min, desde jun-2000.
- ERA5-Land (ECMWF/ERA5_LAND/HOURLY): reanálisis, 0,1°, horario, desde 1950. Solo para 1997-98 (todavía no había IMERG) y como
  comparación (se guarda su total en la misma tormenta).

Cálculo por temporada (1 de octubre a 30 de abril, días de 0 a 24 h de Argentina, UTC−3):
1. Lluvia de cada hora (IMERG: suma de sus dos medias horas) y de cada día; la peor tormenta es la ventana de 3 días seguidos con
   más lluvia.
2. De esa tormenta: su primer día, su total (IMERG y, para comparar, ERA5) y la hora más lluviosa.
3. De toda la temporada: la hora y el día más lluviosos (para los máximos de la barra de lluvia del simulador).

Capacidad de los desagües (por celda): la lluvia de 1 hora que se supera, en promedio, una vez cada 2 años (mediana de los
máximos anuales 2001-2025 de la lluvia horaria de IMERG). La red pluvial urbana se diseña para recurrencias de 2 a 10 años; se
toma la más baja (ver documento funcional). Se mide con el mismo dato que las tormentas, así la comparación es coherente.

Salida: web/datos/lluvia_ninos/<tesela>.bin (teselas de 2° × 2°, Int16 little-endian) + indice.json con la disposición.
Uso: .venv/bin/python earth_engine/lluvia_ninos.py [prueba|temporadas|desagues|teselas]
"""
import json
import sys
import time
from pathlib import Path

import ee
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import PROYECTO_EE  # noqa: E402

RAIZ = Path(__file__).resolve().parents[1]
CRUDO = RAIZ / "data" / "procesado" / "lluvia_ninos"
SALIDA = RAIZ / "web" / "datos" / "lluvia_ninos"
TEMPORADAS = [1997, 2002, 2004, 2006, 2009, 2014, 2015, 2018, 2023]   # Niños con datos completos (lluvia y ríos desde 1997)
OESTE, NORTE, PASO, ANCHO, ALTO = -74.0, -21.5, 0.1, 210, 340        # grilla de IMERG (bordes en múltiplos de 0,1°)
BANDAS = ["t3", "d0", "e3", "i3", "p1", "p1s", "p24s"]               # mm × 10 salvo d0 (día desde el 1 de octubre)
ART = 3 * 3600 * 1000                                                 # 00 h de Argentina = 03 UTC
IMERG_DESDE = "2000-06-01"


def _era(desde, hasta):
    # ERA5-Land: cada imagen trae la lluvia de la hora que TERMINA en su time_start → la hora [t, t+1h) es la imagen de t+1h
    return ee.ImageCollection("ECMWF/ERA5_LAND/HOURLY").filterDate(ee.Date(desde).advance(1, "hour"), ee.Date(hasta).advance(1, "hour")) \
        .select("total_precipitation_hourly")


def _imerg(desde, hasta):
    return ee.ImageCollection("NASA/GPM_L3/IMERG_V07").filterDate(desde, hasta).select("precipitation")


def horas_imerg(t: ee.Date, n: int) -> ee.ImageCollection:
    """Lluvia de cada hora (mm) de IMERG desde t: suma de sus dos medias horas (mm/h × 0,5 h)."""
    return ee.ImageCollection(ee.List.sequence(0, n - 1).map(lambda h: _imerg(t.advance(h, "hour"), t.advance(ee.Number(h).add(1), "hour")).sum().multiply(0.5)))


def dia(t: ee.Date, con_imerg: bool) -> ee.Image:
    """Un día de Argentina desde t: lluvia ERA5-Land (e), IMERG (x, −1 si no hay) y la hora más lluviosa (m: IMERG; sin IMERG,
    ERA5-Land), en mm."""
    fin = t.advance(1, "day")
    e = _era(t, fin).sum().multiply(1000).resample("bilinear").rename("e")
    if con_imerg:
        x = _imerg(t, fin).sum().multiply(0.5).rename("x")
        m = horas_imerg(t, 24).max().rename("m")
    else:
        x = ee.Image.constant(-1).rename("x")
        m = _era(t, fin).max().multiply(1000).resample("bilinear").rename("m")
    return e.addBands(x).addBands(m)


def temporada(anio: int, banda: str) -> ee.Image:
    """Una banda (e, x o m) de cada día de la temporada, como una imagen de ~212 bandas en décimas de mm (Int16)."""
    desde = ee.Date.fromYMD(anio, 10, 1).advance(3, "hour")
    n = (np.datetime64(f"{anio + 1}-05-01") - np.datetime64(f"{anio}-10-01")).astype(int)
    con_imerg = f"{anio}-10-01" >= IMERG_DESDE
    dias = [dia(desde.advance(k, "day"), con_imerg).select(banda).multiply(10).round().toInt16().rename(f"{banda}{k}") for k in range(n)]
    return ee.Image.cat(dias)


def peor_tormenta(e: np.ndarray, x: np.ndarray, m: np.ndarray) -> dict:
    """De los días (días × filas × columnas, mm): la peor ventana de 3 días de IMERG (sin IMERG, de ERA5) y lo que se guarda."""
    p = e if (x < 0).all() else x
    t3 = p[:-2] + p[1:-1] + p[2:]
    d0 = t3.argmax(axis=0)
    toma = lambda a: np.take_along_axis(a, d0[None], 0)[0]
    tres = lambda a: a[:-2] + a[1:-1] + a[2:]
    m3 = np.maximum(np.maximum(m[:-2], m[1:-1]), m[2:])
    return {"t3": toma(t3), "d0": d0.astype(np.float32), "e3": toma(tres(e)), "i3": toma(tres(x)) if (x >= 0).all() else np.full(d0.shape, -1.0),
            "p1": toma(m3), "p1s": m.max(axis=0), "p24s": p.max(axis=0)}


def bajar(img: ee.Image, oeste=OESTE, norte=NORTE, ancho=ANCHO, alto=ALTO) -> np.ndarray:
    grid = {"dimensions": {"width": ancho, "height": alto}, "crsCode": "EPSG:4326",
            "affineTransform": {"scaleX": PASO, "shearX": 0, "translateX": oeste, "shearY": 0, "scaleY": -PASO, "translateY": norte}}
    for intento in range(4):
        try:
            return ee.data.computePixels({"expression": img, "fileFormat": "NUMPY_NDARRAY", "grid": grid})
        except ee.EEException as e:
            print("  reintento:", str(e)[:120]); time.sleep(20 * (intento + 1))
    raise RuntimeError("Earth Engine no respondió")


def bajar_temporada(anio: int, oeste=OESTE, norte=NORTE, ancho=ANCHO, alto=ALTO) -> dict:
    partes = {b: [] for b in "exm"}
    for j in range(0, alto, 85):   # de a franjas de 8,5° de latitud: cada pedido debe pesar menos de 48 MB y terminar en minutos
        for b in "exm":
            if b == "x" and f"{anio}-10-01" < IMERG_DESDE:
                partes[b].append(None); continue
            a = bajar(temporada(anio, b), oeste, norte - j * PASO, ancho, min(85, alto - j))
            partes[b].append(np.stack([a[n] for n in a.dtype.names]).astype(np.float32) / 10)
    if partes["x"][0] is None:
        partes["x"] = [np.full_like(a, -1) for a in partes["e"]]
    return {b: np.concatenate(v, axis=1) for b, v in partes.items()}


def prueba() -> None:
    """Una temporada en 2° × 2° alrededor de Zárate: tiempo de cálculo y valores."""
    t = time.time()
    d = bajar_temporada(2015, -60.0, -33.0, 20, 20)
    r = peor_tormenta(d["e"], d["x"], d["m"])
    print(f"2015-16, 20 × 20 celdas: {time.time() - t:.0f} s")
    f, c = int((-33.0 + 34.10) / PASO), int((-59.03 + 60.0) / PASO)
    print({b: round(float(r[b][f, c]), 1) for b in BANDAS})


def temporadas() -> None:
    CRUDO.mkdir(parents=True, exist_ok=True)
    for anio in TEMPORADAS:
        f = CRUDO / f"temporada_{anio}.npy"
        if f.exists():
            continue
        t = time.time()
        d = bajar_temporada(anio)
        r = peor_tormenta(d["e"], d["x"], d["m"])
        np.save(f, np.stack([r[b] for b in BANDAS]).astype(np.float32))
        np.save(CRUDO / f"dias_{anio}.npy", (np.stack([d["e"], d["x"]]) * 10).round().astype(np.int16))   # ERA5 e IMERG de cada día, para validar
        print(f"{anio}-{str(anio + 1)[2:]}: {time.time() - t:.0f} s")


def desagues() -> None:
    """Máximo anual de la lluvia horaria de IMERG, 2001-2025; la mediana es la lluvia de 1 h de 2 años."""
    CRUDO.mkdir(parents=True, exist_ok=True)
    anios = list(range(2001, 2026))
    if len(sys.argv) > 2:   # «desagues 2025 2014»: otro proceso en paralelo recorre los años en otro orden (saltea los hechos)
        a0, a1 = int(sys.argv[2]), int(sys.argv[3])
        anios = list(range(a0, a1 - 1, -1)) if a0 > a1 else list(range(a0, a1 + 1))
    for anio in anios:
        f = CRUDO / f"max_horaria_{anio}.npy"
        if f.exists():
            continue
        t, partes = time.time(), []
        t0 = ee.Date(f"{anio}-01-01T03:00:00")
        img = horas_imerg(t0, int((np.datetime64(f"{anio + 1}-01-01") - np.datetime64(f"{anio}-01-01")).astype(int)) * 24).max().rename("p")
        for j in range(0, ALTO, 85):
            partes.append(bajar(img, OESTE, NORTE - j * PASO, ANCHO, min(85, ALTO - j))["p"].astype(np.float32))
        np.save(f, np.concatenate(partes, axis=0))
        print(f"máximo horario {anio}: {time.time() - t:.0f} s")


def teselas() -> None:
    """Teselas de 2° × 2° (20 × 20 celdas) solo donde hay Argentina: Int16 [temporada][banda][celda] + [desagüe][celda]."""
    import geopandas as gpd
    from shapely.geometry import box
    T = np.stack([np.load(CRUDO / f"temporada_{a}.npy") for a in TEMPORADAS])          # temporada × banda × fila × columna
    anual = np.stack([np.load(CRUDO / f"max_horaria_{a}.npy") for a in range(2001, 2026)])
    desague = np.median(anual, axis=0)                                                   # lluvia de 1 h de 2 años (mediana de máximos anuales)
    pais = gpd.read_file(RAIZ / "web" / "datos" / "provincias_geo.geojson").to_crs(4326).union_all()
    n, ESC = 20, 10
    ny, nx = -(-ALTO // n), -(-ANCHO // n)   # la última fila y columna de teselas quedan a medias: se completan sin dato (−1)
    T = np.pad(T, ((0, 0), (0, 0), (0, ny * n - ALTO), (0, nx * n - ANCHO)), constant_values=-1)
    desague = np.pad(desague, ((0, ny * n - ALTO), (0, nx * n - ANCHO)), constant_values=-1)
    SALIDA.mkdir(parents=True, exist_ok=True)
    nombres = []
    for ty in range(ny):
        for tx in range(nx):
            if not pais.intersects(box(OESTE + tx * n * PASO, NORTE - (ty + 1) * n * PASO, OESTE + (tx + 1) * n * PASO, NORTE - ty * n * PASO)):
                continue
            sl = (slice(ty * n, (ty + 1) * n), slice(tx * n, (tx + 1) * n))
            bloque = T[:, :, sl[0], sl[1]].copy()
            for k, b in enumerate(BANDAS):
                if b != "d0":
                    bloque[:, k] = np.where(bloque[:, k] < 0, -1, bloque[:, k] * ESC)
            datos = np.concatenate([bloque.reshape(-1), desague[sl].reshape(-1) * ESC]).round().clip(-32768, 32767).astype("<i2")
            (SALIDA / f"{tx}_{ty}.bin").write_bytes(datos.tobytes())
            nombres.append(f"{tx}_{ty}")
    indice = {"oeste": OESTE, "norte": NORTE, "paso": PASO, "ancho": ANCHO, "alto": ALTO, "tesela": n, "escala": ESC,
              "temporadas": TEMPORADAS, "bandas": BANDAS, "teselas": nombres,
              "fuente": "IMERG V07 Final (1997-98: ERA5-Land), Earth Engine, earth_engine/lluvia_ninos.py"}
    (SALIDA / "indice.json").write_text(json.dumps(indice, separators=(",", ":")))
    tam = sum((SALIDA / f"{x}.bin").stat().st_size for x in nombres) / 1e6
    print(f"lluvia_ninos: {len(nombres)} teselas, {tam:.1f} MB; desagüe de 2 años: mediana {np.median(desague):.1f} mm/h")


if __name__ == "__main__":
    ee.Initialize(project=PROYECTO_EE)
    {"prueba": prueba, "temporadas": temporadas, "desagues": desagues, "teselas": teselas}[sys.argv[1] if len(sys.argv) > 1 else "prueba"]()

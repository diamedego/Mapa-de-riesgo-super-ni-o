"""Callejero propio para buscar direcciones sin conexión (versión de la web dentro de claude.ai).

Fuente: cuadras del INDEC publicadas por Georef (data/raw/limites/georef_cuadras.ndjson, ~2 millones de
cuadras con su numeración y su trazado). Se guarda solo lo necesario, agrupado por departamento/partido:

  web/datos/callejero/c<N>.json  →  {depto: {"CALLE NORMALIZADA": [[desde, hasta, x1, y1, x2, y2], ...]}}
  (solo un tercio de las cuadras del INDEC trae numeración; las calles sin numeración se guardan igual,
   con un único punto central [0, 0, x, y, x, y], para que la búsqueda al menos encuentre la calle)
  web/datos/callejero/indice.json →  {"depto_archivo": {depto: archivo}, "cmu_depto": {cmu: [deptos]}}

Coordenadas en enteros (grados × 100 000, ~1 m). El navegador interpola el número dentro de la cuadra.
El nombre se normaliza igual que en app.js (mayúsculas, sin tildes, sin palabras como AV, CALLE, GRAL).
"""
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

import geopandas as gpd

RAIZ = Path(__file__).resolve().parents[1]
ORIGEN = RAIZ / "data" / "raw" / "limites" / "georef_cuadras.ndjson"
SALIDA = Path(__file__).resolve().parent / "datos" / "callejero"
VACIAS = {"AV", "AVDA", "AVENIDA", "CALLE", "BV", "BOULEVARD", "BULEVAR", "PJE", "PASAJE", "DR", "DOCTOR",
          "GRAL", "GENERAL", "ING", "INGENIERO", "PTE", "PRESIDENTE", "CNEL", "CORONEL", "DE", "DEL", "LA", "LAS",
          "LOS", "EL", "Y", "N"}
MAX_BYTES = 6_000_000


def clave(nombre: str) -> str:
    s = unicodedata.normalize("NFD", nombre).encode("ascii", "ignore").decode().upper()
    return " ".join(w for w in re.sub(r"[^A-Z0-9 ]", " ", s).split() if w not in VACIAS)


def main() -> None:
    por_depto = defaultdict(lambda: defaultdict(list))
    sin_numero = defaultdict(list)   # (depto, calle) → puntos medios de sus cuadras
    total = usadas = 0
    with ORIGEN.open(encoding="utf-8") as f:
        next(f)  # encabezado
        for linea in f:
            total += 1
            c = json.loads(linea)
            a = c["altura"]
            alturas = [a["inicio"]["derecha"], a["inicio"]["izquierda"], a["fin"]["derecha"], a["fin"]["izquierda"]]
            alturas = [h for h in alturas if h]
            nombre = clave(c["calle"]["nombre"])
            geo = c.get("geometria") or {}
            if not nombre or nombre == "SN" or not geo.get("coordinates"):
                continue
            depto = c["calle"]["departamento"]["id"]
            if not alturas:
                pts = [p for ln in (geo["coordinates"] if geo["type"] == "MultiLineString" else [geo["coordinates"]]) for p in ln]
                sin_numero[(depto, nombre)].append(pts[len(pts) // 2])
                continue
            ini_vals = [h for h in (a["inicio"]["derecha"], a["inicio"]["izquierda"]) if h]
            desde = min(ini_vals) if ini_vals else min(alturas)
            hasta = max(alturas)
            lineas = geo["coordinates"] if geo["type"] == "MultiLineString" else [geo["coordinates"]]
            (x1, y1), (x2, y2) = lineas[0][0], lineas[-1][-1]
            por_depto[depto][nombre].append(
                [desde, hasta, round(x1 * 1e5), round(y1 * 1e5), round(x2 * 1e5), round(y2 * 1e5)])
            usadas += 1

    solo_sin_numero = 0
    for (depto, nombre), pts in sin_numero.items():
        if nombre in por_depto[depto]:
            continue
        cx, cy = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
        x, y = min(pts, key=lambda p: (p[0] - cx) ** 2 + (p[1] - cy) ** 2)   # cuadra más central
        por_depto[depto][nombre].append([0, 0, round(x * 1e5), round(y * 1e5), round(x * 1e5), round(y * 1e5)])
        solo_sin_numero += 1

    SALIDA.mkdir(parents=True, exist_ok=True)
    for viejo in SALIDA.glob("c*.json"):
        viejo.unlink()
    depto_archivo, lote, tam, n = {}, {}, 0, 0

    def guardar():
        nonlocal lote, tam, n
        if lote:
            nombre = f"c{n}.json"
            (SALIDA / nombre).write_text(json.dumps(lote, separators=(",", ":")))
            for d in lote:
                depto_archivo[d] = nombre
            n += 1
            lote, tam = {}, 0

    for d in sorted(por_depto):
        calles = {k: sorted(v) for k, v in por_depto[d].items()}
        bytes_d = len(json.dumps(calles, separators=(",", ":")))
        if tam and tam + bytes_d > MAX_BYTES:
            guardar()
        lote[d] = calles
        tam += bytes_d
    guardar()

    # Qué departamentos toca cada gobierno local (un municipio puede abarcar más de uno)
    raw = RAIZ / "data" / "raw" / "limites"
    gl = gpd.read_parquet(raw / "gobiernos_locales.parquet")[["cmu", "geometry"]]
    dep = gpd.read_parquet(raw / "departamentos.parquet")[["cde", "geometry"]]
    gl["geometry"] = gl.to_crs(5345).buffer(-200).to_crs(4326)   # evita tocar al vecino por el borde
    cruce = gpd.sjoin(gl[~gl.geometry.is_empty], dep, predicate="intersects")
    cmu_depto = cruce.groupby("cmu")["cde"].apply(lambda s: sorted(set(s))).to_dict()

    (SALIDA / "indice.json").write_text(json.dumps({"depto_archivo": depto_archivo, "cmu_depto": cmu_depto},
                                                   separators=(",", ":")))
    tam_total = sum(p.stat().st_size for p in SALIDA.glob("*.json"))
    print(f"{total} cuadras, {usadas} con numeración, {solo_sin_numero} calles más sin numeración; "
          f"{len(por_depto)} departamentos en {n} archivos; "
          f"{tam_total / 1e6:.1f} MB")


if __name__ == "__main__":
    main()

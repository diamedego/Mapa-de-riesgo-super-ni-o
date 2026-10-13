"""Mapa base propio (calles y agua) para la versión dentro de claude.ai, donde no se pueden pedir teselas externas.

- Calles: las 2 076 269 cuadras del INDEC (Georef), unidas por calle dentro de cada departamento.
- Agua: superficies (Paraná, lagunas, embalses) y ríos, canales y arroyos con nombre, de OpenStreetMap.

Formato compacto (el navegador lo convierte a GeoJSON): coordenadas enteras (grados × 100 000) codificadas como
diferencias con el punto anterior, que ocupan 3-4 cifras en vez de 9.
  {"n": [nombres], "l": [[nombre_idx, clase, x0, y0, dx1, dy1, ...], ...], "p": [[nombre_idx, [anillo], [anillo]...], ...]}
Clases de calle: 0 calle/pasaje, 1 avenida/bulevar, 2 ruta/autopista, 3 vía férrea. Agua: 0 arroyo, 1 río, 2 canal.

Salida: web/datos/base/calles_<N>.json, agua_<N>.json (agua: un archivo por celda de 3°) e indice.json ({"calles": [[archivo, caja]], "agua": [...]}),
con la caja real de lo que contiene cada archivo para cargar solo lo que se ve.
"""
import json
from collections import defaultdict
from pathlib import Path

import geopandas as gpd
import shapely
from shapely.geometry import MultiLineString

RAIZ = Path(__file__).resolve().parents[1]
SALIDA = Path(__file__).resolve().parent / "datos" / "base"
MAX_BYTES = 3_000_000
CLASE_CALLE = {"AV": 1, "BV": 1, "ACC": 1, "RUTA": 2, "AUT": 2, "LINEA FERREA": 3}
EXCLUIR = {"LINEA IMAGINARIA", "LIMITE DE PROPIEDAD"}


def nombre_lindo(n: str) -> str:
    """ROCHA DARDO → Rocha Dardo (el INDEC publica en mayúsculas)."""
    chicas = {"DE", "DEL", "LA", "LAS", "LOS", "EL", "Y"}
    return " ".join(w.lower() if i and w in chicas else w.capitalize() for i, w in enumerate(n.split()))


def codificar(coords) -> list[int]:
    out, px, py = [], 0, 0
    for x, y in coords:
        ix, iy = round(x * 1e5), round(y * 1e5)
        out += [ix - px, iy - py]
        px, py = ix, iy
    return out


class Archivos:
    """Junta partes en archivos de tamaño acotado y anota la caja de cada uno."""

    def __init__(self, prefijo: str, max_bytes: int = MAX_BYTES):
        self.prefijo, self.indice, self.n, self.max_bytes = prefijo, [], 0, max_bytes
        self.nuevo()

    def nuevo(self):
        self.nombres, self.idx, self.l, self.p, self.tam = [], {}, [], [], 0
        self.caja = [180, 90, -180, -90]

    def nombre(self, n):
        if not n:
            return -1
        if n not in self.idx:
            self.idx[n] = len(self.nombres)
            self.nombres.append(n)
            self.tam += len(n) + 3
        return self.idx[n]

    def ampliar(self, b):
        c = self.caja
        self.caja = [min(c[0], b[0]), min(c[1], b[1]), max(c[2], b[2]), max(c[3], b[3])]

    def linea(self, nombre, clase, geom):
        for parte in getattr(geom, "geoms", [geom]):
            if parte.is_empty or len(parte.coords) < 2:
                continue
            fila = [self.nombre(nombre), clase] + codificar(parte.coords)
            self.l.append(fila)
            self.tam += 4 * len(fila)
            self.ampliar(parte.bounds)

    def poligono(self, nombre, geom):
        for parte in getattr(geom, "geoms", [geom]):
            if parte.is_empty:
                continue
            anillos = [codificar(parte.exterior.coords)] + [codificar(r.coords) for r in parte.interiors]
            self.p.append([self.nombre(nombre)] + anillos)
            self.tam += 4 * sum(len(a) for a in anillos)
            self.ampliar(parte.bounds)

    def cerrar_si_lleno(self):
        if self.tam > self.max_bytes:
            self.guardar()

    def guardar(self):
        if not (self.l or self.p):
            return
        archivo = f"{self.prefijo}_{self.n}.json"
        (SALIDA / archivo).write_text(json.dumps({"n": self.nombres, "l": self.l, "p": self.p}, separators=(",", ":")))
        self.indice.append([archivo, [round(v, 4) for v in self.caja]])
        self.n += 1
        self.nuevo()


def calles():
    por_depto = defaultdict(lambda: defaultdict(list))
    with (RAIZ / "data" / "raw" / "limites" / "georef_cuadras.ndjson").open(encoding="utf-8") as f:
        next(f)
        for linea in f:
            c = json.loads(linea)
            cat = c["calle"].get("categoria") or "CALLE"
            g = c.get("geometria") or {}
            if cat in EXCLUIR or not g.get("coordinates"):
                continue
            partes = g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]
            nombre = c["calle"]["nombre"] or ""
            if nombre.upper() in ("CALLE SN", "SN", "S/N"):
                nombre = ""
            por_depto[c["calle"]["departamento"]["id"]][(nombre, CLASE_CALLE.get(cat, 0))].extend(partes)
    def morton(depto):   # orden en curva Z del centro del departamento: los vecinos quedan juntos
        pts = [p for partes in por_depto[depto].values() for parte in partes for p in parte[:1]]
        x = int((sum(p[0] for p in pts) / len(pts) + 75) * 10)
        y = int((sum(p[1] for p in pts) / len(pts) + 56) * 10)
        return sum(((x >> i & 1) << (2 * i)) | ((y >> i & 1) << (2 * i + 1)) for i in range(10))

    arch = Archivos("calles", max_bytes=1_000_000)
    for depto in sorted(por_depto, key=morton):
        for (nombre, clase), partes in por_depto[depto].items():
            geom = shapely.line_merge(MultiLineString(partes)).simplify(0.00001)
            arch.linea(nombre_lindo(nombre), clase, geom)
        arch.cerrar_si_lleno()
    arch.guardar()
    return arch.indice


def agua():
    """Agua de OpenStreetMap (ingesta/osm_agua.py): el IGN no trae los ríos anchos como superficie."""
    osm = gpd.read_parquet(RAIZ / "data" / "raw" / "osm" / "agua.parquet")
    osm["fna"] = osm["nombre"]
    areas = osm[osm["tipo"] == "area"].copy()
    ha = areas.to_crs(5345).area / 1e4
    areas = areas[(areas["clase"] == "rio") | (ha >= 2) | areas["nombre"].notna()]   # sin estanques chicos sin nombre
    lineas = osm[osm["tipo"] == "linea"].copy()
    lineas["clase"] = lineas["clase"].map({"arroyo": 0, "rio": 1, "canal": 2})
    areas["geometry"] = areas.geometry.simplify(0.00005)
    lineas["geometry"] = lineas.geometry.simplify(0.00005)
    # celdas de 3° (un archivo por celda) para cargar solo la zona que se ve
    areas["tipo"], lineas["tipo"] = "p", "l"
    todo = gpd.GeoDataFrame(gpd.pd.concat([areas, lineas], ignore_index=True), crs=4326)
    rp = todo.geometry.representative_point()
    todo["celda"] = (rp.x // 3).astype(int).astype(str) + "_" + (rp.y // 3).astype(int).astype(str)
    arch = Archivos("agua")
    for _, grupo in todo.groupby("celda"):
        for fila in grupo.itertuples():
            nombre = fila.fna if isinstance(fila.fna, str) else ""
            if fila.tipo == "p":
                arch.poligono(nombre, fila.geometry)
            else:
                arch.linea(nombre, int(fila.clase), fila.geometry)
        arch.guardar()
    return arch.indice


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    for viejo in SALIDA.glob("*.json"):
        viejo.unlink()
    indice = {"agua": agua(), "calles": calles()}
    (SALIDA / "indice.json").write_text(json.dumps(indice, separators=(",", ":")))
    tam = sum(p.stat().st_size for p in SALIDA.glob("*.json"))
    print(f"agua: {len(indice['agua'])} archivos; calles: {len(indice['calles'])} archivos; total {tam / 1e6:.1f} MB")


if __name__ == "__main__":
    main()

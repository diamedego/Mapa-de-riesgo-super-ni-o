"""Funciones compartidas por todos los scripts de ingesta.

- sesion(): cliente HTTP con reintentos (varias fuentes públicas son inestables).
- descargar_wfs(): baja una capa WFS completa paginando y la guarda como GeoParquet.
- registrar(): agrega una fila a data/manifest.csv para dejar trazabilidad de cada descarga.
"""
from __future__ import annotations

import csv
import datetime as dt
import io
import os
from pathlib import Path

import geopandas as gpd
import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Algunas geometrías (p. ej. provincias del IGN) superan el límite por defecto de GDAL para GeoJSON
os.environ.setdefault("OGR_GEOJSON_MAX_OBJ_SIZE", "0")

RAIZ = Path(__file__).resolve().parents[1]
RAW = RAIZ / "data" / "raw"
MANIFEST = RAIZ / "data" / "manifest.csv"
CAMPOS_MANIFEST = [
    "fecha_descarga", "fuente", "dataset", "url", "archivo",
    "formato", "registros", "licencia", "estado", "nota",
]


def sesion() -> requests.Session:
    s = requests.Session()
    reintentos = Retry(total=5, backoff_factor=2,
                       status_forcelist=[429, 500, 502, 503, 504],
                       allowed_methods=["GET", "POST"])
    s.mount("https://", HTTPAdapter(max_retries=reintentos))
    s.mount("http://", HTTPAdapter(max_retries=reintentos))
    s.headers["User-Agent"] = "proyecto-el-nino-argentina/0.1 (portfolio, datos públicos)"
    return s


def registrar(fuente: str, dataset: str, url: str, archivo: Path | str,
              formato: str, registros: int | None, licencia: str,
              estado: str = "ok", nota: str = "") -> None:
    """Agrega una fila al manifest (lo crea con encabezado si no existe)."""
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    nuevo = not MANIFEST.exists()
    with MANIFEST.open("a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CAMPOS_MANIFEST)
        if nuevo:
            w.writeheader()
        w.writerow({
            "fecha_descarga": dt.datetime.now().isoformat(timespec="seconds"),
            "fuente": fuente,
            "dataset": dataset,
            "url": url,
            "archivo": str(Path(archivo).relative_to(RAIZ)) if archivo else "",
            "formato": formato,
            "registros": registros if registros is not None else "",
            "licencia": licencia,
            "estado": estado,
            "nota": nota,
        })


def descargar_wfs(base: str, capa: str, destino: Path, *, pagina: int = 5000,
                  propiedades: list[str] | None = None, timeout: int = 180) -> gpd.GeoDataFrame:
    """Descarga todas las features de una capa WFS 2.0 y las guarda en GeoParquet (EPSG:4326)."""
    s = sesion()
    partes, inicio = [], 0
    while True:
        params = {
            "service": "WFS", "version": "2.0.0", "request": "GetFeature",
            "typeNames": capa, "outputFormat": "application/json",
            "count": pagina, "startIndex": inicio, "sortBy": _clave_orden(base, capa),
        }
        if propiedades:
            params["propertyName"] = ",".join(propiedades)
        r = s.get(base, params=params, timeout=timeout)
        r.raise_for_status()
        gdf = gpd.read_file(io.BytesIO(r.content))
        if gdf.empty:
            break
        partes.append(gdf)
        inicio += len(gdf)
        print(f"  {capa}: {inicio} features…", flush=True)
        if len(gdf) < pagina:
            break

    todo = (gpd.GeoDataFrame(pd.concat(partes, ignore_index=True), crs=partes[0].crs)
            if partes else gpd.GeoDataFrame())
    if not todo.empty and todo.crs is not None and todo.crs.to_epsg() != 4326:
        todo = todo.to_crs(4326)
    destino.parent.mkdir(parents=True, exist_ok=True)
    todo.to_parquet(destino)
    return todo


def descargar_archivo(url: str, destino: Path, *, timeout: int = 600) -> Path:
    """Descarga un archivo en streaming (sirve para CSV/ZIP grandes). No re-descarga si ya existe."""
    destino.parent.mkdir(parents=True, exist_ok=True)
    if destino.exists() and destino.stat().st_size > 0:
        return destino
    tmp = destino.with_suffix(destino.suffix + ".part")
    with sesion().get(url, stream=True, timeout=timeout) as r:
        r.raise_for_status()
        with tmp.open("wb") as f:
            for bloque in r.iter_content(chunk_size=1 << 20):
                f.write(bloque)
    tmp.rename(destino)
    return destino


def contar_lineas(archivo: Path) -> int:
    with archivo.open("rb") as f:
        return max(sum(1 for _ in f) - 1, 0)  # sin encabezado


_ORDEN_CACHE: dict[tuple[str, str], str] = {}


def _clave_orden(base: str, capa: str) -> str:
    """GeoServer necesita un orden estable para paginar sin duplicar ni saltear features."""
    # La mayoría de las capas del IGN tienen 'gid'; las del INDEC tienen 'fid'.
    return _ORDEN_CACHE.get((base, capa), "gid" if "ign.gob.ar" in base else "fid")


def hoy() -> str:
    return dt.date.today().isoformat()

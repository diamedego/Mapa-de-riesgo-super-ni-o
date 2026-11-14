"""Capas extra del mapa (se corre a mano en la Mac; los archivos se publican con la web).

- datos/barrios_populares.geojson: barrios populares del RENABAP (polígonos simplificados), con viviendas y familias.
- datos/infraestructura_critica.geojson: hospitales y clínicas, policía, bomberos, Defensa Civil, subestaciones eléctricas,
  plantas potabilizadoras y cloacales, estaciones de bombeo, centros comunitarios, Cruz Roja, puntos de encuentro y basurales
  (OpenStreetMap, ya descargado en data/raw/osm/infraestructura.parquet).

Uso: .venv/bin/python web/preparar_capas.py
"""
import json
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely import wkb

RAIZ = Path(__file__).resolve().parents[1]
SALIDA = Path(__file__).resolve().parent / "datos"
GRUPO = {  # categoría de OSM → grupo de la leyenda
    "hospital_clinica": "salud", "policia": "seguridad", "bomberos": "seguridad", "defensa_civil": "seguridad",
    "subestacion_electrica": "energia", "planta_potabilizadora": "agua", "planta_cloacal": "agua", "estacion_bombeo": "agua",
    "centro_comunitario": "comunidad", "cruz_roja": "comunidad", "punto_encuentro": "comunidad", "caritas": "comunidad",
    "banco_alimentos": "comunidad", "basural_relleno": "basural",
}


def barrios() -> None:
    g = gpd.read_file(RAIZ / "data" / "raw" / "renabap" / "barrios.gpkg").to_crs(4326)
    g["geometry"] = g.geometry.simplify(0.0001, preserve_topology=True)
    g = g[g.geometry.notna() & ~g.geometry.is_empty]
    sal = gpd.GeoDataFrame({"n": g["nombre_barrio"], "viv": g["cantidad_viviendas_aproximadas"], "fam": g["cantidad_familias_aproximada"],
                            "loc": g["localidad"]}, geometry=g.geometry.set_precision(1e-5), crs=4326)
    (SALIDA / "barrios_populares.geojson").write_text(sal.to_json(drop_id=True, na="null"))
    print(f"barrios_populares: {len(sal)} ({(SALIDA / 'barrios_populares.geojson').stat().st_size / 1e6:.1f} MB)")
    indice_barrios(sal)


def indice_barrios(sal: gpd.GeoDataFrame) -> None:
    """Índice liviano para el buscador: [nombre, localidad, lon, lat, viviendas] de cada barrio popular (punto interior)."""
    p = sal.geometry.representative_point()
    filas = [[n, loc or "", round(pt.x, 5), round(pt.y, 5), int(v or 0)] for n, loc, pt, v in zip(sal["n"], sal["loc"], p, sal["viv"]) if n]
    (SALIDA / "barrios_buscador.json").write_text(json.dumps(filas, ensure_ascii=False, separators=(",", ":")))
    print(f"barrios_buscador: {len(filas)} barrios")


def infraestructura() -> None:
    i = pd.read_parquet(RAIZ / "data" / "raw" / "osm" / "infraestructura.parquet")
    i = i[i["categoria"].isin(GRUPO)].copy()
    geom = i["geometry"].map(lambda b: wkb.loads(b) if isinstance(b, (bytes, bytearray)) else b)
    g = gpd.GeoDataFrame(i[["categoria", "nombre"]], geometry=geom, crs=4326)
    g["geometry"] = g.geometry.representative_point().set_precision(1e-5)
    sal = gpd.GeoDataFrame({"c": g["categoria"], "g": g["categoria"].map(GRUPO), "n": g["nombre"]}, geometry=g.geometry, crs=4326)
    (SALIDA / "infraestructura_critica.geojson").write_text(sal.to_json(drop_id=True, na="null"))
    print(f"infraestructura_critica: {len(sal)} ({(SALIDA / 'infraestructura_critica.geojson').stat().st_size / 1e6:.1f} MB)", sal["g"].value_counts().to_dict())


def sin_datos() -> None:
    """Partes de cada provincia que no cubre ningún gobierno local (en el mapa: transparentes con borde punteado)."""
    web = Path(__file__).resolve().parent / "datos"
    mun = gpd.read_file(web / "municipios_geo.geojson").to_crs(4326)
    prov = gpd.read_file(web / "provincias_geo.geojson").to_crs(4326)
    resto = gpd.overlay(prov[["geometry"]], gpd.GeoDataFrame(geometry=[mun.buffer(0.002).union_all()], crs=4326), how="difference")
    resto = resto[resto.area > 0.01].explode(index_parts=False)
    resto = resto[resto.area > 0.01]
    resto["geometry"] = resto.geometry.simplify(0.005).set_precision(1e-4)
    (SALIDA / "sin_datos.geojson").write_text(resto.to_json(drop_id=True))
    print(f"sin_datos: {len(resto)} zonas")


if __name__ == "__main__":
    barrios()
    infraestructura()
    sin_datos()

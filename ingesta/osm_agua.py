"""Agua de OpenStreetMap para el mapa base propio (versión en claude.ai): superficies de ríos, lagunas y embalses,
y líneas de ríos, canales y arroyos con nombre.

El IGN no trae los ríos anchos (Paraná, Uruguay, Luján) como superficie: solo como línea o nada.
Usa el mismo extracto de Geofabrik que ingesta/osm.py (ya descargado).

Salida: data/raw/osm/agua.parquet (tipo = "area" | "linea", clase = río/canal/arroyo/lago, nombre)
"""
import geopandas as gpd
import osmium
from shapely import wkb

from comun import RAW, descargar_archivo, registrar

URL = "https://download.geofabrik.de/south-america/argentina-latest.osm.pbf"
LICENCIA = "ODbL (© colaboradores de OpenStreetMap)"
LINEAS = {"river": "rio", "canal": "canal", "stream": "arroyo"}


class Agua(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.fab = osmium.geom.WKBFactory()
        self.filas = []

    def _agregar(self, tipo, clase, nombre, crear):
        try:
            self.filas.append({"tipo": tipo, "clase": clase, "nombre": nombre, "geometry": wkb.loads(crear(), hex=True)})
        except Exception:  # geometrías incompletas en el extracto
            pass

    def way(self, w):
        clase = LINEAS.get(w.tags.get("waterway"))
        nombre = w.tags.get("name")
        if clase and (clase != "arroyo" or nombre):   # arroyos sin nombre: demasiados y poco útiles para ubicarse
            self._agregar("linea", clase, nombre, lambda: self.fab.create_linestring(w))

    def area(self, a):
        t = a.tags
        if t.get("natural") == "water" or t.get("waterway") == "riverbank" or t.get("landuse") == "reservoir":
            clase = "rio" if (t.get("water") in {"river", "canal", "stream"} or t.get("waterway") == "riverbank") else "lago"
            self._agregar("area", clase, t.get("name"), lambda: self.fab.create_multipolygon(a))


def main() -> None:
    pbf = descargar_archivo(URL, RAW / "osm" / "argentina-latest.osm.pbf")
    h = Agua()
    h.apply_file(str(pbf), locations=True)
    gdf = gpd.GeoDataFrame(h.filas, geometry="geometry", crs=4326)
    destino = RAW / "osm" / "agua.parquet"
    gdf.to_parquet(destino)
    registrar("OpenStreetMap (Geofabrik)", "agua: superficies y cursos", URL, destino, "GeoParquet", len(gdf), LICENCIA,
              nota=gdf.groupby(["tipo", "clase"]).size().to_json())
    print(gdf.groupby(["tipo", "clase"]).size().to_string())


if __name__ == "__main__":
    main()

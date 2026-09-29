"""OpenStreetMap Argentina (Geofabrik): infraestructura crítica y de drenaje que no está en fuentes oficiales.

Se descarga el extracto completo (~430 MB) y se filtran solo las etiquetas relevantes:
puentes, plantas cloacales y potabilizadoras, estaciones de bombeo, canales, zanjas,
alcantarillas, subestaciones eléctricas, hospitales, escuelas, bomberos, basurales.

Salida: data/raw/osm/infraestructura.parquet (una fila por elemento, con su categoría)
"""
import geopandas as gpd
import osmium
from shapely import wkb

from comun import RAW, descargar_archivo, registrar

URL = "https://download.geofabrik.de/south-america/argentina-latest.osm.pbf"
LICENCIA = "ODbL (© colaboradores de OpenStreetMap)"

# categoría → (clave, valores aceptados)
FILTROS = {
    "puente": ("bridge", None),
    "alcantarilla": ("tunnel", {"culvert"}),
    "canal_zanja_desague": ("waterway", {"canal", "drain", "ditch"}),
    "planta_cloacal": ("man_made", {"wastewater_plant"}),
    "planta_potabilizadora": ("man_made", {"water_works"}),
    "estacion_bombeo": ("man_made", {"pumping_station"}),
    "subestacion_electrica": ("power", {"substation"}),
    "hospital_clinica": ("amenity", {"hospital", "clinic"}),
    "escuela": ("amenity", {"school"}),
    "bomberos": ("amenity", {"fire_station"}),
    "basural_relleno": ("landuse", {"landfill"}),
}


def categoria(tags) -> str | None:
    for cat, (clave, valores) in FILTROS.items():
        v = tags.get(clave)
        if v and v != "no" and (valores is None or v in valores):
            return cat
    return None


class Filtro(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.fab = osmium.geom.WKBFactory()
        self.filas = []

    def _agregar(self, obj, tipo, crear_geom):
        cat = categoria(obj.tags)
        if not cat:
            return
        try:
            geom = wkb.loads(crear_geom(obj), hex=True)
        except Exception:  # geometrías incompletas en el extracto
            return
        self.filas.append({"osm_id": f"{tipo}/{obj.id}", "categoria": cat,
                           "nombre": obj.tags.get("name"), "geometry": geom})

    def node(self, n):
        self._agregar(n, "n", self.fab.create_point)

    def way(self, w):
        if w.is_closed() and w.tags.get("landuse") == "landfill":
            return  # los polígonos se toman en area()
        self._agregar(w, "w", self.fab.create_linestring)

    def area(self, a):
        if a.tags.get("landuse") == "landfill" or a.tags.get("man_made") in {"wastewater_plant", "water_works"}:
            self._agregar(a, "a", self.fab.create_multipolygon)


def main() -> None:
    pbf = descargar_archivo(URL, RAW / "osm" / "argentina-latest.osm.pbf")
    h = Filtro()
    h.apply_file(str(pbf), locations=True)
    gdf = gpd.GeoDataFrame(h.filas, geometry="geometry", crs=4326)
    destino = RAW / "osm" / "infraestructura.parquet"
    gdf.to_parquet(destino)
    registrar("OpenStreetMap (Geofabrik)", "infraestructura crítica y de drenaje", URL, destino,
              "GeoParquet", len(gdf), LICENCIA, nota=gdf["categoria"].value_counts().to_json())
    print(gdf["categoria"].value_counts().to_string())


if __name__ == "__main__":
    main()

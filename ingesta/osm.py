"""OpenStreetMap Argentina (Geofabrik): infraestructura crítica, de drenaje y de respuesta social.

Se descarga el extracto completo (~430 MB) y se filtran solo las etiquetas relevantes:
puentes, plantas cloacales y potabilizadoras, estaciones de bombeo, canales, zanjas,
alcantarillas, subestaciones eléctricas, hospitales, escuelas, bomberos, basurales;
y para la capa social: policía, puntos de encuentro, centros comunitarios, clubes,
lugares de culto, y organizaciones de ayuda por nombre (Cruz Roja, Cáritas, bancos de alimentos,
Defensa Civil).

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
    # Capa social y de respuesta: posibles puntos de alojamiento y ayuda (nunca oficiales)
    "policia": ("amenity", {"police"}),
    "punto_encuentro": ("emergency", {"assembly_point"}),
    # No se usa amenity=shelter: en Argentina son casi siempre paradas de colectivo techadas
    "centro_comunitario": ("amenity", {"community_centre", "social_facility"}),
    "club_deportivo": ("leisure", {"sports_centre", "stadium"}),
    "lugar_culto": ("amenity", {"place_of_worship"}),
}

# Organizaciones de ayuda: se detectan por nombre (en OSM suelen tener etiquetas variadas)
POR_NOMBRE = {
    "cruz_roja": ("cruz roja",),
    "caritas": ("cáritas", "caritas"),
    "banco_alimentos": ("banco de alimentos",),
    "defensa_civil": ("defensa civil", "protección civil", "proteccion civil"),
}


def categoria(tags) -> str | None:
    nombre = (tags.get("name") or "").lower()
    # Las calles, vías y cursos de agua pueden llamarse "Cruz Roja Argentina": no son organizaciones
    es_via = any(k in tags for k in ("highway", "railway", "waterway"))
    es_via = es_via or "farmacia" in nombre  # "Farmacia Cruz Roja" es un comercio, no la organización
    for cat, claves in POR_NOMBRE.items():
        if not es_via and any(k in nombre for k in claves):
            return cat
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
        if w.is_closed() and (w.tags.get("landuse") == "landfill"
                              or w.tags.get("leisure") in {"sports_centre", "stadium"}
                              or w.tags.get("amenity") in {"community_centre", "social_facility",
                                                           "place_of_worship", "police"}):
            return  # los polígonos se toman en area()
        self._agregar(w, "w", self.fab.create_linestring)

    def area(self, a):
        # Polígonos que interesan como superficie (no como línea): basurales, plantas y lugares de alojamiento
        if (a.tags.get("landuse") == "landfill"
                or a.tags.get("man_made") in {"wastewater_plant", "water_works"}
                or a.tags.get("leisure") in {"sports_centre", "stadium"}
                or a.tags.get("amenity") in {"community_centre", "social_facility", "place_of_worship", "police"}):
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

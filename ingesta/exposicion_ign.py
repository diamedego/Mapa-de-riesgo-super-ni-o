"""Puntos y áreas estratégicas del IGN: salud, educación, residuos e hidrografía.

Salida: data/raw/ign/<capa>.parquet
"""
from comun import RAW, descargar_wfs, registrar

IGN_WFS = "https://wms.ign.gob.ar/geoserver/ows"
LICENCIA = "CC BY 4.0 (IGN)"
CAPAS = {
    "ign:salud_020801": "salud",
    "ign:puntos_de_ciencia_y_educacion_020601": "educacion_020601",
    "ign:puntos_de_ciencia_y_educacion_020602": "educacion_020602",
    "ign:areas_de_gestion_de_residuos_AB030": "residuos_areas",
    "ign:puntos_de_gestion_de_residuos_AB030": "residuos_puntos",
    "ign:areas_de_gestion_de_residuos_relleno_sanitario": "rellenos_sanitarios",
    "ign:lineas_de_aguas_continentales_perenne": "cursos_agua_perennes",
    "ign:lineas_de_aguas_continentales_intermitentes": "cursos_agua_intermitentes",
    "ign:lineas_de_aguas_continentales_BH020": "canales",
    "ign:lineas_de_aguas_continentales_BI020": "diques_represas",
    "ign:areas_de_aguas_continentales_perenne": "espejos_agua_perennes",
    "ign:areas_de_aguas_continentales_intermitente": "espejos_agua_intermitentes",
}


def main() -> None:
    for capa, nombre in CAPAS.items():
        destino = RAW / "ign" / f"{nombre}.parquet"
        print(f"Descargando {capa}…")
        try:
            gdf = descargar_wfs(IGN_WFS, capa, destino)
            registrar("IGN", capa, IGN_WFS, destino, "GeoParquet", len(gdf), LICENCIA)
        except Exception as e:
            registrar("IGN", capa, IGN_WFS, "", "GeoParquet", None, LICENCIA, "error", str(e)[:200])
            print(f"  ERROR: {e}")


if __name__ == "__main__":
    main()

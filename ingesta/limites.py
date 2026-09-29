"""Límites territoriales: base de todos los cruces (nación → provincia → departamento → gobierno local → radio).

Fuentes:
- INDEC GeoNode (WFS): departamentos, gobiernos locales, radios y fracciones censales 2022.
- IGN GeoServer (WFS): provincias.
- API Georef (datos.gob.ar): catálogo de municipios con centroides (sirve para consultar APIs por punto).
"""
import json

from comun import RAW, descargar_wfs, registrar, sesion

INDEC_WFS = "https://geonode.indec.gob.ar/geoserver/ows"
IGN_WFS = "https://wms.ign.gob.ar/geoserver/ows"
GEOREF = "https://apis.datos.gob.ar/georef/api"

CAPAS = [
    # (fuente, base WFS, capa, archivo destino, licencia)
    ("IGN", IGN_WFS, "ign:provincia", "provincias.parquet", "CC BY 4.0 (IGN)"),
    ("INDEC", INDEC_WFS, "geonode:departamentos", "departamentos.parquet", "INDEC, uso libre con cita"),
    ("INDEC", INDEC_WFS, "geonode:gobiernos_locales4", "gobiernos_locales.parquet", "INDEC, uso libre con cita"),
    ("INDEC", INDEC_WFS, "geonode:fracciones_censales", "fracciones_censales.parquet", "INDEC, uso libre con cita"),
    ("INDEC", INDEC_WFS, "geonode:radios_censales2", "radios_censales.parquet", "INDEC, uso libre con cita"),
]


def main() -> None:
    carpeta = RAW / "limites"
    for fuente, base, capa, archivo, licencia in CAPAS:
        destino = carpeta / archivo
        print(f"Descargando {capa}…")
        try:
            gdf = descargar_wfs(base, capa, destino)
            registrar(fuente, capa, base, destino, "GeoParquet", len(gdf), licencia)
        except Exception as e:  # se registra el fallo y se sigue con la próxima capa
            registrar(fuente, capa, base, "", "GeoParquet", None, licencia, "error", str(e)[:200])
            print(f"  ERROR: {e}")

    # Georef: municipios con centroide (todas las páginas)
    s = sesion()
    url = f"{GEOREF}/municipios"
    r = s.get(url, params={"max": 5000, "campos": "completo"}, timeout=120)
    r.raise_for_status()
    datos = r.json()
    destino = carpeta / "georef_municipios.json"
    destino.write_text(json.dumps(datos["municipios"], ensure_ascii=False), encoding="utf-8")
    registrar("Georef (datos.gob.ar)", "municipios", url, destino, "JSON",
              len(datos["municipios"]), "CC BY 4.0")
    print(f"Georef municipios: {len(datos['municipios'])}")


if __name__ == "__main__":
    main()

"""Registro Nacional de Barrios Populares (RENABAP), actualización dic-2023.

- Polígonos de los barrios con sus atributos (incluye acceso a agua, cloaca y electricidad,
  que usamos como proxy de conexiones irregulares).
- Factores de riesgo en barrios populares del Gran Buenos Aires.

Salida: data/raw/renabap/
"""
import geopandas as gpd

from comun import RAW, descargar_archivo, registrar

BASE = "https://archivo.infraestructura.gob.ar/dataset/ssisu"
LICENCIA = "CC BY 4.0 (datos.gob.ar)"
ARCHIVOS = {
    "barrios.gpkg": f"{BASE}/20231205_info_publica.gpkg",
    "barrios_datos.csv": f"{BASE}/20231205_info_publica_datos_barrios.csv",
    "barrios_referencias.csv": f"{BASE}/20231205_info_publica_referencias.csv",
    "factores_riesgo_gba.zip": f"{BASE}/renabap-factores-de-riesgo",
}


def main() -> None:
    carpeta = RAW / "renabap"
    for nombre, url in ARCHIVOS.items():
        try:
            destino = descargar_archivo(url, carpeta / nombre)
            n = len(gpd.read_file(destino)) if nombre.endswith(".gpkg") else None
            registrar("RENABAP (SISU)", nombre, url, destino, nombre.split(".")[-1].upper(), n, LICENCIA)
            print(f"{nombre}: ok ({n if n is not None else '-'} registros)")
        except Exception as e:
            registrar("RENABAP (SISU)", nombre, url, "", "", None, LICENCIA, "error", str(e)[:200])
            print(f"{nombre}: ERROR {e}")


if __name__ == "__main__":
    main()

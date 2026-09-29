"""Ciudad de Buenos Aires (BA Data): sumideros de la red pluvial y reclamos ciudadanos (147 / BA Colaborativa).

- Sumideros: ubicación de cada sumidero, en 5 zonas.
- Reclamos SUACI / BA Colaborativa 2011-2026: se usan para el modelo lluvia → anegamientos
  (sumideros tapados, desbordes, etc.). Se guardan crudos; el filtrado se hace en la capa silver.

Salida: data/raw/caba/
"""
from comun import RAW, contar_lineas, descargar_archivo, registrar

CDN = "https://cdn.buenosaires.gob.ar/datosabiertos/datasets"
LICENCIA = "CC BY 2.5 AR (BA Data)"
ANIOS_RECLAMOS = range(2011, 2027)


def main() -> None:
    carpeta = RAW / "caba"
    for zona in range(1, 6):
        url = f"{CDN}/ministerio-de-espacio-publico-e-higiene-urbana/sumideros/sumideros-zona-{zona}.csv"
        destino = descargar_archivo(url, carpeta / f"sumideros_zona_{zona}.csv")
        registrar("BA Data (GCBA)", f"sumideros zona {zona}", url, destino, "CSV (WKT)",
                  contar_lineas(destino), LICENCIA)
        print(f"Sumideros zona {zona}: ok")

    for anio in ANIOS_RECLAMOS:
        url = (f"{CDN}/atencion-ciudadana/sistema-unico-atencion-ciudadana/"
               f"sistema-unico-de-atencion-ciudadana-{anio}.csv")
        try:
            destino = descargar_archivo(url, carpeta / f"reclamos_147_{anio}.csv")
            registrar("BA Data (GCBA)", f"reclamos SUACI / BA Colaborativa {anio}", url, destino,
                      "CSV", contar_lineas(destino), LICENCIA)
            print(f"Reclamos {anio}: ok")
        except Exception as e:
            registrar("BA Data (GCBA)", f"reclamos SUACI / BA Colaborativa {anio}", url, "",
                      "CSV", None, LICENCIA, "error", str(e)[:200])
            print(f"Reclamos {anio}: ERROR {e}")


if __name__ == "__main__":
    main()

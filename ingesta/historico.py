"""Registros históricos para calibrar y validar el modelo.

- Dengue y Zika (Ministerio de Salud, datos.gob.ar): casos por departamento y semana epidemiológica,
  2018-2025. Incluye la epidemia récord 2023-24, que siguió al Niño 2023.
- DesInventar Argentina: base histórica de desastres (inundaciones, aludes, etc.) por departamento.

Salida: data/raw/historico/
"""
from comun import RAW, descargar_archivo, registrar, sesion

DENGUE_PAQUETE = "vigilancia-de-las-enfermedades-por-virus-del-dengue-y-zika"
DESINVENTAR = "https://www.desinventar.net/DesInventar/download/DI_export_arg.zip"


def main() -> None:
    carpeta = RAW / "historico"
    s = sesion()
    paquete = s.get("https://datos.gob.ar/api/3/action/package_show",
                    params={"id": DENGUE_PAQUETE}, timeout=60).json()["result"]
    for r in paquete["resources"]:
        if not r["url"].endswith((".csv", ".xlsx")):
            continue  # se descarta el .xls de 2018 (duplica el CSV). Ojo: el portal etiqueta mal
                      # algunos formatos (2023-2024 figura como XLS y es CSV), por eso se mira la URL
        nombre = "dengue_" + r["url"].rsplit("/", 1)[-1][-60:]
        try:
            destino = descargar_archivo(r["url"], carpeta / "dengue" / nombre)
            registrar("Ministerio de Salud (datos.gob.ar)", f"dengue y zika: {r['name']}", r["url"],
                      destino, r.get("format", ""), None, "CC BY 4.0")
            print(f"{r['name']}: ok")
        except Exception as e:
            registrar("Ministerio de Salud (datos.gob.ar)", f"dengue y zika: {r['name']}", r["url"],
                      "", r.get("format", ""), None, "CC BY 4.0", "error", str(e)[:200])
            print(f"{r['name']}: ERROR {e}")

    destino = descargar_archivo(DESINVENTAR, carpeta / "desinventar_arg.zip")
    registrar("DesInventar (UNDRR)", "base histórica de desastres de Argentina", DESINVENTAR, destino,
              "ZIP (XML)", None, "Uso libre con cita (DesInventar Sendai)")
    print("DesInventar: ok")


if __name__ == "__main__":
    main()

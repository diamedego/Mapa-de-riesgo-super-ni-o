"""Genera el documento funcional en PDF (HTML + Chrome sin ventana).

Uso: .venv/bin/python docs/documento_funcional/generar.py
Salida: docs/Documento_funcional_El_Nino_2026-27.pdf  (se calcula el índice con números de página en dos pasadas)
"""
import subprocess
import sys
from pathlib import Path

from pypdf import PdfReader

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
sys.path.insert(0, str(AQUI))
import contenido  # noqa: E402
import graficos  # noqa: E402

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SALIDA = RAIZ / "docs" / "Documento_funcional_El_Nino_2026-27.pdf"
FUENTES = ("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700"
           "&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&display=swap")
TITULOS = {1: "Introducción, objetivos y alcance", 2: "Marco conceptual", 3: "Datos: fuentes, cobertura y actualización", 4: "Arquitectura del sistema",
           5: "Modelos analíticos", 6: "Simulador hidráulico y de inundación", 7: "Validación del simulador",
           8: "Requerimientos funcionales y guía de uso", 9: "Calidad, pruebas y trazabilidad", 10: "Registro cronológico del proceso",
           11: "Cumplimiento del pedido de noviembre", 12: "Limitaciones, riesgos y trabajo futuro", "glosario": "Glosario", "refs": "Referencias",
           "anexo": "Estructura del repositorio y comandos"}


def figuras() -> dict:
    return {"cobertura": graficos.cobertura_datos(), "arquitectura": contenido.ARQUITECTURA, "indice": contenido.INDICE, "ml": graficos.sensibilidad_ml(),
            "verif": graficos.verificacion_pronostico(), "hidraulica": contenido.HIDRAULICA,
            "val": graficos.validacion_simulador(RAIZ / "data" / "validacion" / "resultados.csv"), "crono": graficos.cronograma()}


def armar(paginas: dict) -> str:
    c = contenido.capitulos(figuras(), paginas)
    orden = ["portada", "resumen", "indice", *range(1, 13), "glosario", "refs", "anexo"]
    cuerpo = "\n".join(c[k] for k in orden)
    css = (AQUI / "estilos.css").read_text()
    return (f'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Argentina frente a El Niño 2026–27 · Documento funcional</title>'
            f'<style>{css}</style></head><body>{cuerpo}</body></html>')


def imprimir(html: str, destino: Path) -> None:
    arch = AQUI / "_documento.html"
    arch.write_text(html)
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=25000",
                    f"--print-to-pdf={destino}", f"file://{arch}"], check=True, capture_output=True, timeout=180)


def numerar(pdf: Path) -> dict:
    """Página (impresa, contando la portada como 1) en que empieza cada capítulo."""
    lector = PdfReader(str(pdf))
    textos = [(p.extract_text() or "") for p in lector.pages]
    pagina_indice = next(i for i, t in enumerate(textos) if "Cómo leer este documento" in t)
    out = {}
    import re
    for i in range(pagina_indice + 1, len(textos)):
        cab = "".join(textos[i][:300].upper().split())
        m = re.search(r"CAPÍTULO(\d+)", cab) or re.search(r"ANEXO([ABC])", cab)
        if not m:
            continue
        k = int(m.group(1)) if m.group(1).isdigit() else {"A": "glosario", "B": "refs", "C": "anexo"}[m.group(1)]
        out.setdefault(k, i + 1)
    return out


if __name__ == "__main__":
    tmp = AQUI / "_borrador.pdf"
    imprimir(armar({}), tmp)
    pag = numerar(tmp)
    print("páginas por capítulo:", pag)
    imprimir(armar(pag), SALIDA)
    tmp.unlink(missing_ok=True)
    (AQUI / "_documento.html").unlink(missing_ok=True)
    n = len(PdfReader(str(SALIDA)).pages)
    print(f"{SALIDA.name}: {n} páginas, {SALIDA.stat().st_size / 1e6:.1f} MB")

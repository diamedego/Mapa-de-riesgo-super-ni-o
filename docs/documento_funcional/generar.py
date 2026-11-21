"""Genera el documento funcional en PDF (HTML + Chrome sin ventana).

Las cifras de las validaciones y de los datos se leen de los archivos de resultados (valores()), así el texto coincide siempre
con lo calculado.
Uso: .venv/bin/python docs/documento_funcional/generar.py ["descripción de la versión"]
Salida: docs/Documento_funcional_El_Nino_2026-27.pdf y una copia «vN - fecha - descripción (ULTIMA).pdf» en
«Documento funcional - versiones/» (a la anterior se le quita «(ULTIMA)»). El índice lleva números de página (dos pasadas).
"""
import datetime as dt
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from pypdf import PdfReader

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[1]
sys.path.insert(0, str(AQUI))
import contenido  # noqa: E402
import graficos  # noqa: E402

CHROME = next((c for c in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                           r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") if Path(c).exists()),
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
SALIDA = RAIZ / "docs" / "Documento_funcional_El_Nino_2026-27.pdf"
VERSIONES = RAIZ / "Documento funcional - versiones"
VAL = RAIZ / "data" / "validacion"
# Primera corrida de la validación del río (15-nov-2026), con el río limitado a 1 km de la orilla (umbral del radar −16 dB)
RIO_ANTES = {"pod": 0.244, "far": 0.732, "csi": 0.146}
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def csv_dw() -> Path:
    v2 = VAL / "v2_rio_corregido" / "resultados.csv"
    return v2 if v2.exists() else VAL / "resultados.csv"


def valores() -> dict:
    vl = json.loads((RAIZ / "web" / "datos" / "validacion_lluvia.json").read_text())
    f = vl["fuentes"]
    L = {"tormentas": vl["tormentas"], "pluviometros": vl["pluviometros"], "descartadas": vl["descartadas_control"],
         **{f"{k}_100": f[k]["peor_temporada"]["fuertes_100"] for k in ("imerg", "era5", "promedio")},
         "promedio": {"error_mediano": f["promedio"]["peor_temporada"]["error_mediano"]}}
    rr = json.loads((VAL / "rio_radar.json").read_text())
    R = {"ahora": rr["resultados"]["agua_16"]["formula"], "antes": RIO_ANTES, "altura": rr["altura_m"], "celda_m": rr["celda_m"], "celdas_tierra": rr["celdas_tierra"]}
    d = pd.read_csv(csv_dw())
    d = d[(d.temporada != "referencia_2022_23") & (d.celdas_obs >= 20)]
    D = {"n": len(d), "csi": float(d.csi.median()), "jrc": float(d.csi_jrc.median()), "gana": int((d.csi > d.csi_jrc).sum())}
    ve = json.loads((RAIZ / "data" / "gold" / "verificacion.json").read_text())
    pp = ve["lluvia_16_dias"]["por_plazo"]
    verif = {"dias": ve["lluvia_16_dias"]["dias_verificados"], "c03": pp["0-3"]["correlacion"], "c47": pp["4-7"]["correlacion"], "c815": pp["8-15"]["correlacion"],
             "peso": ve["lluvia_16_dias"]["peso_pronostico"], "rio_error": ve["rios"]["error_medio_m"], "rio_sesgo": ve["rios"]["sesgo_m"],
             "rio_pares": f"{ve['rios']['pares']:,}".replace(",", ".")}
    res = json.loads((RAIZ / "web" / "datos" / "resumen.json").read_text())
    c = dt.date.fromisoformat(res["calculado"])
    a, m = res["mes_pico"].split("-")
    pico = res["por_mes"][res["mes_pico"]]
    indice = {"fecha": f"{c.day} de {MESES[c.month - 1]} de {c.year}", "mes_pico": f"{MESES[int(m) - 1]} de {a}",
              "riesgo_medio": f"{pico['riesgo_medio']:.1f}".replace(".", ","), "alto": int(pico["municipios_riesgo_alto"])}
    # Desagües y picos horarios: de lo precalculado (earth_engine/lluvia_ninos.py)
    crudo = RAIZ / "data" / "procesado" / "lluvia_ninos"
    cache_desague = RAIZ / "data" / "referencia" / "desague_documento.json"   # lo calculado la última vez (data/procesado no se versiona)
    if not crudo.exists() and cache_desague.exists():
        desague = json.loads(cache_desague.read_text(encoding="utf-8"))
        return _resto(L, R, D, verif, indice, desague)
    sys.path.insert(0, str(RAIZ / "earth_engine"))
    import lluvia_ninos as LN
    anual = np.stack([np.load(crudo / f"max_horaria_{y}.npy") for y in range(2001, 2026)])
    D2 = np.median(anual, axis=0)
    T = np.stack([np.load(crudo / f"temporada_{y}.npy") for y in LN.TEMPORADAS if y >= 2002])
    filas, cols = np.indices(D2.shape)
    lon, lat = LN.OESTE + (cols + 0.5) * LN.PASO, LN.NORTE - (filas + 0.5) * LN.PASO
    llanura = (lon > -66) & (lat > -40) & (lat < -24) & (T[:, 0].max(axis=0) > 0)   # llanura chaco-pampeana y litoral
    p1 = T[:, LN.BANDAS.index("p1")][:, llanura]
    fz, cz = int((LN.NORTE + 34.10) / LN.PASO), int((-59.03 - LN.OESTE) / LN.PASO)
    q25, q75 = np.percentile(p1, [25, 75])
    desague = {"mediana": f"{np.median(D2[llanura]):.0f}", "zarate": f"{D2[fz, cz]:.0f}", "p1_rango": f"{5 * round(q25 / 5):.0f} a {5 * round(q75 / 5):.0f}"}
    cache_desague.write_text(json.dumps(desague), encoding="utf-8")
    return _resto(L, R, D, verif, indice, desague)


def _resto(L, R, D, verif, indice, desague) -> dict:
    # Riesgo por día (modelos/riesgo_diario.py): municipios en riesgo alto hoy, el día más comprometido y la propensión
    rd = json.loads((RAIZ / "web" / "datos" / "riesgo_diario.json").read_text())
    cortes = [3, 4.5, 6, 7]
    niv = lambda v: 1 + sum(v >= x for x in cortes)
    por_dia = [sum(niv(m["r"][i]) >= 4 for m in rd["cmu"].values()) for i in range(len(rd["dias"]))]
    ip = int(np.argmax(por_dia))
    dp = dt.date.fromisoformat(rd["dias"][ip])
    gen = (dt.datetime.fromisoformat(rd["generado"]) - dt.timedelta(hours=3)).date()
    diario = {"fecha": f"{gen.day} de {MESES[gen.month - 1]} de {gen.year}", "hoy_alto": por_dia[0],
              "dia_pico": f"{['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'][dp.weekday()]} {dp.day} de {MESES[dp.month - 1]}",
              "n_pico": f"{por_dia[ip]} municipios en riesgo alto o muy alto" if por_dia[ip] != 1 else "1 municipio en riesgo alto o muy alto",
              "prop_alta": f"{sum((m.get('pr') or 0) >= 6 for m in rd['cmu'].values()):,}".replace(",", ".")}
    tes = sorted((RAIZ / "web" / "datos" / "lluvia_ninos").glob("*.bin"))
    um = pd.read_parquet(RAIZ / "data" / "referencia" / "umbrales_smn_municipios.parquet")
    umbr = f"amarilla {um['amarillo'].median():.0f} mm, naranja {um['naranja'].median():.0f} mm y roja {um['rojo'].median():.0f} mm en un día"
    return {"lluvia": L, "rio": R, "dw": D, "verif": verif, "indice": indice, "diario": diario, "desague": desague, "umbr": umbr,
            "teselas": len(tes), "teselas_mb": f"{sum(x.stat().st_size for x in tes) / 1e6:.1f}".replace(".", ",")}


def figuras(V: dict) -> dict:
    return {"cobertura": graficos.cobertura_datos(), "arquitectura": contenido.ARQUITECTURA, "indice": contenido.INDICE, "ml": graficos.sensibilidad_ml(),
            "verif": graficos.verificacion_pronostico(), "hidraulica": contenido.HIDRAULICA, "val": graficos.validacion_simulador(csv_dw()),
            "lluvia": graficos.validacion_lluvia(VAL / "lluvia_estaciones.csv"), "rio": graficos.validacion_rio(V["rio"]["antes"], V["rio"]["ahora"]),
            "crono": graficos.cronograma()}


def armar(paginas: dict, V: dict, F: dict) -> str:
    c = contenido.capitulos(F, paginas, V)
    orden = ["portada", "resumen", "indice", *range(1, 14), "glosario", "refs", "anexo"]
    cuerpo = "\n".join(c[k] for k in orden)
    css = (AQUI / "estilos.css").read_text()
    return (f'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Argentina frente a El Niño 2026–27 · Documento funcional</title>'
            f'<style>{css}</style></head><body>{cuerpo}</body></html>')


def imprimir(html: str, destino: Path) -> None:
    arch = AQUI / "_documento.html"
    arch.write_text(html)
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=25000",
                    f"--print-to-pdf={destino}", arch.as_uri()], check=True, capture_output=True, timeout=180)


def numerar(pdf: Path) -> dict:
    """Página (impresa, contando la portada como 1) en que empieza cada capítulo."""
    lector = PdfReader(str(pdf))
    textos = [(p.extract_text() or "") for p in lector.pages]
    pagina_indice = next(i for i, t in enumerate(textos) if "Cómo leer este documento" in t)
    out = {}
    for i in range(pagina_indice + 1, len(textos)):
        cab = "".join(textos[i][:300].upper().split())
        m = re.search(r"CAPÍTULO(\d+)", cab) or re.search(r"ANEXO([ABC])", cab)
        if not m:
            continue
        k = int(m.group(1)) if m.group(1).isdigit() else {"A": "glosario", "B": "refs", "C": "anexo"}[m.group(1)]
        out.setdefault(k, i + 1)
    return out


WEB_CSS = """
@media screen {
  /* Computadora: una hoja A4 centrada con los mismos márgenes, la misma tipografía y el mismo espaciado que el PDF */
  html { background: #ecebe6; }
  html { font-size: 9.5pt; }   /* un poco más chica que en el PDF (10,1 pt) */
  body { width: auto; max-width: none; margin: 0; padding: 21mm 0.6cm; background: #fff; }   /* 0,6 cm a cada lado */
  .portada { width: auto; margin: -21mm -0.6cm 0; }   /* como la primera página: la hoja entera, sin margen */
  h1 { margin-top: 21mm; padding-top: 12mm; border-top: 1px solid #d8d5cd; }   /* cada capítulo arranca como en una página nueva */
  figure svg, img { max-width: 100%; height: auto; }
  .indice li { cursor: pointer; } .indice li .p { display: none; }
  .formula { overflow-x: auto; }
}
@media screen and (max-width: 860px) {
  /* Celular: columna de una sola pieza con 0,6 cm de margen a cada lado */
  html { font-size: 13px; }
  body { width: auto; padding: 16px 0.6cm 48px; text-align: left; hyphens: manual; box-shadow: none; }
  .portada { width: auto; height: auto; min-height: 560px; margin: -16px -0.6cm 24px; }
  .portada .contenido { position: relative; left: 0; right: 0; top: 0; padding: 48px 24px 0; }
  .portada .pie { position: relative; left: 0; right: 0; bottom: 0; padding: 160px 24px 24px; }
  .portada .olas { height: 140px; }
  h1 { margin-top: 32px; padding-top: 24px; }
  table { display: block; overflow-x: auto; max-width: 100%; }
  .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
"""
JS_WEB = """<script>
// Índice navegable: cada capítulo es un ancla (#cap-1 … #anexo-c)
document.querySelectorAll("section").forEach((s) => { const n = s.querySelector("h1 .num")?.textContent?.trim(); if (n) s.id = n.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, "-"); });
document.querySelectorAll(".indice li").forEach((li) => { const n = li.querySelector(".n")?.textContent?.trim(); li.onclick = () => { const id = /^[ABC]$/.test(n) ? `anexo-${n.toLowerCase()}` : `capitulo-${n}`; document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }; });
</script>"""


def web(html: str) -> None:
    """Versión web navegable (lámina 04 del observatorio y /documentacion/): el mismo contenido que el PDF, adaptada a pantalla."""
    destino = RAIZ / "web" / "documentacion" / "documento.html"
    destino.parent.mkdir(exist_ok=True)
    destino.write_text(html.replace("</style>", WEB_CSS + "</style>", 1).replace("</body>", JS_WEB + "</body>", 1))
    print("versión web:", destino.relative_to(RAIZ))


def versionar(descripcion: str) -> Path:
    """Copia el PDF como la versión siguiente, marcada (ULTIMA), y desmarca la anterior."""
    VERSIONES.mkdir(exist_ok=True)
    nums = [int(m.group(1)) for p in VERSIONES.glob("v*.pdf") if (m := re.match(r"v(\d+) ", p.name))]
    for p in VERSIONES.glob("* (ULTIMA).pdf"):
        p.rename(p.with_name(p.name.replace(" (ULTIMA)", "")))
    ahora = dt.datetime.now()
    destino = VERSIONES / f"v{max(nums, default=0) + 1} - {ahora.day}-{['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][ahora.month - 1]} {ahora:%Hh%M} - {descripcion} (ULTIMA).pdf"
    shutil.copy2(SALIDA, destino)
    return destino


if __name__ == "__main__":
    V = valores()
    F = figuras(V)
    tmp = AQUI / "_borrador.pdf"
    imprimir(armar({}, V, F), tmp)
    pag = numerar(tmp)
    print("páginas por capítulo:", pag)
    imprimir(armar(pag, V, F), SALIDA)
    tmp.unlink(missing_ok=True)
    (AQUI / "_documento.html").unlink(missing_ok=True)
    web(armar(pag, V, F))
    n = len(PdfReader(str(SALIDA)).pages)
    print(f"{SALIDA.name}: {n} páginas, {SALIDA.stat().st_size / 1e6:.1f} MB")
    if len(sys.argv) > 1:
        print("versión:", versionar(sys.argv[1]).name)

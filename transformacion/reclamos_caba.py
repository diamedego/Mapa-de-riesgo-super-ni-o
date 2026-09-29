"""Capa silver de reclamos pluviales y cloacales de CABA (147 / BA Colaborativa), 2011-2026.

Limpiezas (contadas en el reporte de calidad):
1. Cuatro esquemas de columnas y separadores distintos según el año (`;` o `,`; concepto/prestacion;
   domicilio_barrio/barrio) → uno solo: fecha, barrio, texto del reclamo.
2. Clasificación por texto del reclamo:
   - pluvial: sumideros, alcantarillas, bocas de registro pluvial, calle anegada/inundada;
   - cloacal: cloacas, desagote de pozo ciego, desobstrucción.
   Lo demás (baches, arbolado, etc.) se descarta.
3. Fechas en varios formatos (d/m/aaaa, aaaa-mm-dd, con hora) → fecha.
4. Se detectó que 2012 y 2013 están incompletos en el portal (585 y 3 304 filas vs ~800 000 por año):
   quedan en la silver pero el modelo los excluye. Los reclamos cloacales cambian de registro en 2020
   (decenas de miles/año hasta 2019, casi cero después): no se usan como serie continua.
5. Nombres de barrio normalizados (mayúsculas, sin tildes, variantes) para cruzar con los 48 barrios oficiales.

Salida: data/silver/reclamos_caba_diarios.parquet (fecha, barrio, tipo, reclamos),
        data/silver/reclamos_caba_calidad.json
"""
import json
import re
import unicodedata
from pathlib import Path

import geopandas as gpd
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
CRUDO = RAIZ / "data" / "raw" / "caba"
SILVER = RAIZ / "data" / "silver"

PLUVIAL = re.compile(r"sumider|pluvial|anegad|inundad|alcantarill|boca de tormenta", re.I)
CLOACAL = re.compile(r"cloaca|pozo ciego|desobstruc", re.I)
VARIANTES = {"NUNEZ": "NUNEZ", "NUEZ": "NUNEZ",  # la Ñ se pierde en algunos años por codificación
             "VILLA GRAL MITRE": "VILLA GRAL. MITRE", "VILLA GENERAL MITRE": "VILLA GRAL. MITRE",
             "LA BOCA": "BOCA", "MONSERRAT": "MONSERRAT", "MONTSERRAT": "MONSERRAT",
             "COGHLAN": "COGHLAN", "VILLA PUEYRREDON": "VILLA PUEYRREDON"}


def normalizar(nombre) -> str | None:
    if not isinstance(nombre, str) or not nombre.strip():
        return None
    s = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode().upper().strip()
    s = re.sub(r"\s+", " ", s)
    return VARIANTES.get(s, s)


def leer(anio: int) -> pd.DataFrame:
    f = CRUDO / f"reclamos_147_{anio}.csv"
    primera = f.open(encoding="utf-8", errors="replace").readline()
    sep = ";" if primera.count(";") > primera.count(",") else ","
    d = pd.read_csv(f, sep=sep, dtype=str, encoding_errors="replace", on_bad_lines="skip")
    d.columns = [c.strip().strip('"') for c in d.columns]
    texto_cols = [c for c in ["categoria", "rubro", "subcategoria", "concepto", "prestacion"] if c in d.columns]
    barrio_col = "barrio" if "barrio" in d.columns else "domicilio_barrio"
    return pd.DataFrame({
        "anio_archivo": anio,
        "fecha_txt": d["fecha_ingreso"],
        "barrio": d[barrio_col].map(normalizar),
        "texto": d[texto_cols].fillna("").agg(" | ".join, axis=1),
    })


def main() -> None:
    barrios_oficiales = {normalizar(b) for b in gpd.read_file(CRUDO / "barrios.geojson")["nombre"]}
    partes, calidad = [], {"por_anio": {}}
    for anio in range(2011, 2027):
        d = leer(anio)
        d["tipo"] = None
        d.loc[d["texto"].str.contains(CLOACAL), "tipo"] = "cloacal"
        d.loc[d["texto"].str.contains(PLUVIAL), "tipo"] = "pluvial"   # si menciona ambos, prima pluvial
        sel = d[d["tipo"].notna()].copy()
        sel["fecha"] = pd.to_datetime(sel["fecha_txt"], dayfirst=True, errors="coerce", format="mixed").dt.normalize()
        ok_fecha = sel["fecha"].notna()
        ok_barrio = sel["barrio"].isin(barrios_oficiales)
        calidad["por_anio"][anio] = {
            "reclamos_totales": int(len(d)), "pluviales": int((sel["tipo"] == "pluvial").sum()),
            "cloacales": int((sel["tipo"] == "cloacal").sum()),
            "pct_con_fecha_valida": round(100 * ok_fecha.mean(), 1) if len(sel) else None,
            "pct_con_barrio_oficial": round(100 * ok_barrio.mean(), 1) if len(sel) else None,
        }
        partes.append(sel[ok_fecha & ok_barrio][["fecha", "barrio", "tipo"]])
        print(anio, calidad["por_anio"][anio], flush=True)

    todo = pd.concat(partes)
    todo = todo[todo["fecha"].dt.year.between(2011, 2026)]
    diarios = todo.groupby(["fecha", "barrio", "tipo"]).size().rename("reclamos").reset_index()
    SILVER.mkdir(parents=True, exist_ok=True)
    diarios.to_parquet(SILVER / "reclamos_caba_diarios.parquet", index=False)
    no_cruzan = pd.concat([leer(a) for a in (2011, 2017, 2024)])["barrio"].dropna()
    calidad["barrios_que_no_cruzan_muestra"] = sorted(set(no_cruzan) - barrios_oficiales)[:30]
    calidad["reclamos_en_silver"] = int(diarios["reclamos"].sum())
    (SILVER / "reclamos_caba_calidad.json").write_text(json.dumps(calidad, indent=2, ensure_ascii=False))
    print("Barrios que no cruzan (muestra):", calidad["barrios_que_no_cruzan_muestra"])


if __name__ == "__main__":
    main()

"""Capa silver de dengue: casos por departamento (código INDEC) y temporada epidemiológica.

Limpiezas (cada una se cuenta y se registra en el reporte de calidad):
1. Dos esquemas de columnas (hasta 2022 / desde 2023) → uno solo.
2. Versiones repetidas del mismo año (2024 publicado 3 veces; 2021 en 2 archivos): se usa la más reciente.
3. Códigos de departamento: se completan ceros ("6648" → "06648") y se arma provincia (2) + departamento (3).
4. CABA: las comunas vienen como 02001..02015 o 001..015, pero el INDEC usa múltiplos de 7
   (Comuna 1 = 02007, Comuna 2 = 02014, …). Se convierten.
5. Códigos previos al Censo 2022 (Río Grande, Ushuaia, Chascomús) → código vigente.
6. Casos sin departamento ("desconocido", "*sin dato*") o cargados solo a nivel provincia: se excluyen
   del modelo por departamento y se informan.
7. Temporada epidemiológica = semana 31 del año t → semana 30 del año t+1 (cubre el verano completo).
   Solo se conservan temporadas con ambas mitades publicadas.

Salida: data/silver/dengue_temporadas.parquet, data/silver/dengue_calidad.json
"""
import json
from pathlib import Path

import geopandas as gpd
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
CRUDO = RAIZ / "data" / "raw" / "historico" / "dengue"
SILVER = RAIZ / "data" / "silver"

# Para cada año calendario, el archivo más reciente que lo contiene (según el nombre publicado)
ARCHIVO_POR_ANIO = {
    2018: "hasta-20181231.csv",
    2019: "hasta-20191231_3.xlsx",
    2020: "hasta-20201231_1.xlsx",
    2021: "nacional-ha.xlsx",            # "Diciembre 2021": reemplaza al de julio 2021
    2022: "anio-2022.csv",
    2023: "de-2023-2024-06-10.csv",
    2024: "de-2024-2025-05-05.csv",      # última de las 3 versiones de 2024
    2025: "de-2025-2025-09-29.csv",
}


def leer(anio: int) -> pd.DataFrame:
    f = next(CRUDO.glob(f"*{ARCHIVO_POR_ANIO[anio]}"))
    d = pd.read_excel(f, dtype=str) if f.suffix == ".xlsx" else \
        pd.read_csv(f, sep=None, engine="python", encoding="latin-1", dtype=str)
    d.columns = [c.replace("ï»¿", "").strip('"') for c in d.columns]
    if "sepi_min" in d.columns:   # esquema 2023+
        out = pd.DataFrame({"prov": d["id_prov_indec_residencia"], "depto": d["id_depto_indec_residencia"],
                            "anio": d["anio_min"], "se": d["sepi_min"], "evento": d["evento"],
                            "casos": d["cantidad"]})
    else:                          # esquema hasta 2022
        out = pd.DataFrame({"prov": d["provincia_id"], "depto": d["departamento_id"],
                            "anio": d.get("año", d.get("ano")), "se": d["semanas_epidemiologicas"],
                            "evento": d["evento_nombre"], "casos": d["cantidad_casos"],
                            "prov_nombre": d["provincia_nombre"]})
    out["archivo"] = f.name
    return out


# Códigos anteriores al Censo 2022 que Salud sigue usando → código INDEC 2022
EQUIVALENCIAS = {
    "94007": "94008",  # Río Grande (Tierra del Fuego)
    "94014": "94015",  # Ushuaia
    "06217": "06218",  # Chascomús (se separó Lezama)
}


def codigo_indec(r) -> str | None:
    depto = str(r["depto"]).strip()
    prov = str(r["prov"]).strip()
    if not depto.isdigit():
        return None
    if len(depto) <= 3 and prov.isdigit():          # esquema 2023+: provincia y departamento separados
        codigo = prov.zfill(2) + depto.zfill(3)
    else:
        codigo = depto.zfill(5)
    if codigo.startswith("02") and int(codigo[2:]) <= 15:   # CABA: comuna n → 02(7n)
        codigo = "02" + str(int(codigo[2:]) * 7).zfill(3)
    return EQUIVALENCIAS.get(codigo, codigo)


def main() -> None:
    crudo = pd.concat([leer(a) for a in ARCHIVO_POR_ANIO], ignore_index=True)
    crudo = crudo[crudo["evento"].str.contains("Dengue", case=False, na=False)]
    crudo["casos"] = pd.to_numeric(crudo["casos"], errors="coerce").fillna(0)
    crudo["anio"] = pd.to_numeric(crudo["anio"], errors="coerce").astype(int)
    crudo["se"] = pd.to_numeric(crudo["se"], errors="coerce")
    crudo["cde"] = crudo.apply(codigo_indec, axis=1)

    deptos = set(gpd.read_parquet(RAIZ / "data" / "raw" / "limites" / "departamentos.parquet")["cde"])
    total = crudo["casos"].sum()
    sin_codigo = crudo.loc[crudo["cde"].isna(), "casos"].sum()
    no_cruza = crudo.loc[crudo["cde"].notna() & ~crudo["cde"].isin(deptos), "casos"].sum()
    ok = crudo[crudo["cde"].isin(deptos)].copy()

    # Temporada: semana 31 del año t → semana 30 del año t+1
    ok["temporada_inicio"] = ok["anio"].where(ok["se"] >= 31, ok["anio"] - 1)
    ok = ok[ok["temporada_inicio"].between(2018, 2024)]
    # Solo temporadas con las dos mitades publicadas (en 2021 falta el segundo semestre)
    mitades = ok.assign(mitad=(ok["se"] >= 31)).groupby("temporada_inicio")["mitad"].nunique()
    completas = mitades[mitades == 2].index
    ok = ok[ok["temporada_inicio"].isin(completas)]
    temporadas = ok.groupby(["cde", "temporada_inicio"], as_index=False)["casos"].sum()

    SILVER.mkdir(parents=True, exist_ok=True)
    temporadas.to_parquet(SILVER / "dengue_temporadas.parquet", index=False)
    calidad = {
        "casos_totales_crudos": int(total),
        "casos_sin_departamento": int(sin_codigo),
        "casos_con_codigo_que_no_existe_en_INDEC": int(no_cruza),
        "pct_casos_asignados": round(100 * (1 - (sin_codigo + no_cruza) / total), 2),
        "temporadas_completas": [f"{t}-{str(t + 1)[2:]}" for t in completas],
        "temporadas_descartadas_por_incompletas": [f"{t}-{str(t + 1)[2:]}" for t in mitades.index
                                                   if t not in completas],
        "casos_por_temporada": {f"{t}-{str(t + 1)[2:]}": int(v)
                                for t, v in temporadas.groupby("temporada_inicio")["casos"].sum().items()},
        "departamentos_con_casos": int(temporadas["cde"].nunique()),
    }
    (SILVER / "dengue_calidad.json").write_text(json.dumps(calidad, indent=2, ensure_ascii=False))
    print(json.dumps(calidad, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

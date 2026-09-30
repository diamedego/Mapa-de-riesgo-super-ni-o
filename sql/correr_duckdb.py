"""Corre el modelo en capas (bronze → silver → gold) en DuckDB y lo contrasta con la versión en Python.

Uso: python sql/correr_duckdb.py
Salida: data/medallon.duckdb (base local) y data/gold/validacion_sql_vs_python.json
"""
import json
from pathlib import Path

import duckdb
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
SQL = Path(__file__).resolve().parent
BRONZE = RAIZ / "data" / "bronze"


def sentencias(texto: str) -> list[str]:
    """Divide un archivo .sql en sentencias (separadas por ';' al final de la línea), sin comentarios."""
    limpio = "\n".join(l for l in texto.splitlines() if not l.strip().startswith("--"))
    return [s.strip() for s in limpio.split(";\n") if s.strip().strip(";")]


def correr(con, archivo: Path) -> None:
    for s in sentencias(archivo.read_text()):
        con.execute(s.rstrip(";"))


def main() -> None:
    con = duckdb.connect(str(RAIZ / "data" / "medallon.duckdb"))
    # BRONZE: cada Parquet aterrizado → una tabla, sin transformar
    con.execute("CREATE SCHEMA IF NOT EXISTS bronze")
    for f in sorted(BRONZE.glob("*.parquet")):
        con.execute(f"CREATE OR REPLACE TABLE bronze.{f.stem} AS SELECT * FROM read_parquet('{f}')")
    correr(con, SQL / "10_silver.sql")
    correr(con, SQL / "20_gold.sql")

    for capa in ("bronze", "silver", "gold"):
        tablas = con.execute(f"SELECT table_name FROM information_schema.tables WHERE table_schema = '{capa}' "
                             "ORDER BY table_name").fetchall()
        print(capa, "→", ", ".join(f"{t[0]} ({con.execute(f'SELECT COUNT(*) FROM {capa}.{t[0]}').fetchone()[0]})"
                                    for t in tablas))

    # Control de calidad: ¿el SQL reproduce el índice calculado en Python?
    sql = con.execute("SELECT * FROM gold.indice_riesgo_mensual").df()
    py = pd.read_parquet(RAIZ / "data" / "gold" / "indice_riesgo_mensual.parquet")
    m = sql.merge(py, on=["cmu", "mes"], suffixes=("_sql", "_py"))
    pares = {"amenaza": "H", "h_agua": "H_agua", "h_rio": "H_rio", "h_quebrada": "H_quebrada",
             "exposicion": "E", "vulnerabilidad": "V", "riesgo_sql": "riesgo_py",
             "personas_en_riesgo_sql": "personas_en_riesgo_py", "ranking_relativo_sql": "ranking_relativo_py"}
    difs = {a: float((m[a] - m[b]).abs().max()) for a, b in pares.items()}
    rasgos_sql = con.execute("SELECT * FROM silver.gobiernos_locales").df()
    rasgos_py = pd.read_parquet(RAIZ / "data" / "referencia" / "rasgos_gobiernos_locales.parquet")
    r = rasgos_sql.merge(rasgos_py, on="cmu", suffixes=("_sql", "_py"))
    for c in ["poblacion", "pob_terreno_bajo", "pct_cloaca", "pct_nbi", "pct_materiales_deficientes"]:
        difs[f"silver_{c}"] = float((r[f"{c}_sql"].fillna(-1) - r[f"{c}_py"].fillna(-1)).abs().max())
    resultado = {"filas_sql": len(sql), "filas_python": len(py), "filas_cruzadas": len(m),
                 "diferencia_maxima": difs,
                 "coincide": all(v < 1e-3 for k, v in difs.items() if not k.startswith("personas"))
                 and difs["personas_en_riesgo_sql"] < 1}
    (RAIZ / "data" / "gold" / "validacion_sql_vs_python.json").write_text(json.dumps(resultado, indent=2))
    print(json.dumps(resultado, indent=2))


if __name__ == "__main__":
    main()

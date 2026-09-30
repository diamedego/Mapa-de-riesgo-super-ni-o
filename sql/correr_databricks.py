"""Corre el mismo modelo en capas (bronze → silver → gold) en Databricks Free Edition.

1. Crea los esquemas workspace.bronze / silver / gold y un volumen para los archivos de aterrizaje.
2. Sube data/bronze/*.parquet al volumen y crea las tablas bronze (read_files).
3. Ejecuta sql/10_silver.sql y sql/20_gold.sql en el SQL warehouse serverless (los mismos archivos
   que corren en DuckDB).
4. Contrasta gold.indice_riesgo_mensual de Databricks con la versión local.

Requisitos: perfil "mapa-nino" en ~/.databrickscfg (login por navegador, sin claves en el código).
Uso: python sql/correr_databricks.py
"""
import json
import time
from pathlib import Path

import pandas as pd
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import Disposition, Format, StatementState

from correr_duckdb import sentencias

RAIZ = Path(__file__).resolve().parents[1]
SQL = Path(__file__).resolve().parent
CATALOGO = "workspace"
VOLUMEN = f"/Volumes/{CATALOGO}/bronze/aterrizaje"


def ejecutar(w: WorkspaceClient, warehouse: str, sentencia: str) -> list[list]:
    r = w.statement_execution.execute_statement(warehouse_id=warehouse, statement=sentencia, catalog=CATALOGO,
                                                wait_timeout="50s", disposition=Disposition.INLINE,
                                                format=Format.JSON_ARRAY)
    while r.status.state in (StatementState.PENDING, StatementState.RUNNING):
        time.sleep(2)
        r = w.statement_execution.get_statement(r.statement_id)
    if r.status.state != StatementState.SUCCEEDED:
        raise RuntimeError(f"{r.status.error.message}\n--- sentencia ---\n{sentencia[:400]}")
    filas = list(r.result.data_array or []) if r.result else []
    # Resultados grandes llegan en varios bloques
    chunk = r.result.next_chunk_index if r.result else None
    while chunk is not None:
        c = w.statement_execution.get_statement_result_chunk_n(r.statement_id, chunk)
        filas += c.data_array or []
        chunk = c.next_chunk_index
    return filas


def main() -> None:
    w = WorkspaceClient(profile="mapa-nino")
    print("Conectada como", w.current_user.me().user_name)
    wh = next(iter(w.warehouses.list()))
    print(f"SQL warehouse: {wh.name} ({wh.state})")

    for capa in ("bronze", "silver", "gold"):
        ejecutar(w, wh.id, f"CREATE SCHEMA IF NOT EXISTS {CATALOGO}.{capa}")
    ejecutar(w, wh.id, f"CREATE VOLUME IF NOT EXISTS {CATALOGO}.bronze.aterrizaje")

    # BRONZE: subir los Parquet de aterrizaje y crear una tabla por archivo
    for f in sorted((RAIZ / "data" / "bronze").glob("*.parquet")):
        with f.open("rb") as fh:
            w.files.upload(f"{VOLUMEN}/{f.name}", fh, overwrite=True)
        ejecutar(w, wh.id, f"CREATE OR REPLACE TABLE bronze.{f.stem} AS "
                           f"SELECT * FROM read_files('{VOLUMEN}/{f.name}', format => 'parquet')")
        print(f"  bronze.{f.stem}")

    # SILVER y GOLD: los mismos archivos SQL que en DuckDB
    for archivo in ("10_silver.sql", "20_gold.sql"):
        for s in sentencias((SQL / archivo).read_text()):
            ejecutar(w, wh.id, s.rstrip(";"))
        print(f"  {archivo} ejecutado")

    # Control: Databricks vs. versión local
    filas = ejecutar(w, wh.id, "SELECT cmu, mes, riesgo, ranking_relativo FROM gold.indice_riesgo_mensual")
    dbx = pd.DataFrame(filas, columns=["cmu", "mes", "riesgo", "ranking_relativo"]).astype(
        {"riesgo": float, "ranking_relativo": int})
    local = pd.read_parquet(RAIZ / "data" / "gold" / "indice_riesgo_mensual.parquet")[
        ["cmu", "mes", "riesgo", "ranking_relativo"]]
    m = dbx.merge(local, on=["cmu", "mes"], suffixes=("_dbx", "_local"))
    res = {"filas_databricks": len(dbx), "filas_cruzadas": len(m),
           "dif_max_riesgo": float((m["riesgo_dbx"] - m["riesgo_local"]).abs().max()),
           "dif_max_ranking": int((m["ranking_relativo_dbx"] - m["ranking_relativo_local"]).abs().max())}
    (RAIZ / "data" / "gold" / "validacion_databricks.json").write_text(json.dumps(res, indent=2))
    print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()

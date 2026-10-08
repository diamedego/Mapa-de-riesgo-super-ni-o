"""Línea base del consumo de IA del proyecto: costo equivalente en API, por día, sesión y causa.

Entrada: data/consumo_ia/{respuestas,herramientas}.parquet (consumo_ia/extraer_consumo.py).
Salida: data/consumo_ia/linea_base.json (y un resumen en pantalla).

Costo equivalente: lo que costarían esos tokens en la API de Anthropic a precio de lista
(el uso con suscripción no se factura por token; sirve para comparar antes/después).
"""
import json
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
DATOS = RAIZ / "data" / "consumo_ia"
# USD por millón de tokens, Claude Opus 5.5 (lista de precios vigente)
PRECIOS = {"claude-opus-5-5": {"entrada": 4.0, "salida": 20.0, "cache_5m": 5.0, "cache_1h": 8.0, "cache_leido": 0.20}}


def costo(r: pd.DataFrame) -> pd.DataFrame:
    p = r["modelo"].map(PRECIOS)
    ok = p.notna()
    r = r[ok].copy()
    p = p[ok]
    r["usd_entrada"] = r["entrada"] * p.map(lambda x: x["entrada"]) / 1e6
    r["usd_salida"] = r["salida"] * p.map(lambda x: x["salida"]) / 1e6
    r["usd_cache_escrito"] = (r["cache_creado_5m"] * p.map(lambda x: x["cache_5m"])
                              + r["cache_creado_1h"] * p.map(lambda x: x["cache_1h"])) / 1e6
    r["usd_cache_leido"] = r["cache_leido"] * p.map(lambda x: x["cache_leido"]) / 1e6
    r["usd"] = r[["usd_entrada", "usd_salida", "usd_cache_escrito", "usd_cache_leido"]].sum(axis=1)
    r["contexto"] = r["entrada"] + r["cache_creado"] + r["cache_leido"]
    return r


def main() -> None:
    r = costo(pd.read_parquet(DATOS / "respuestas.parquet")).sort_values("fecha_hora")
    h = pd.read_parquet(DATOS / "herramientas.parquet")
    r["dia"] = r["fecha_hora"].dt.date.astype(str)
    p = PRECIOS["claude-opus-5-5"]

    total = r[["usd_entrada", "usd_salida", "usd_cache_escrito", "usd_cache_leido", "usd"]].sum()
    sin_cache = (r["contexto"] * p["entrada"] / 1e6 + r["usd_salida"]).sum()
    por_dia = r.groupby("dia").agg(respuestas=("usd", "size"), usd=("usd", "sum"),
                                   contexto_medio=("contexto", "mean")).round(2)
    por_sesion = r.groupby("sesion").agg(respuestas=("usd", "size"), usd=("usd", "sum"),
                                         contexto_medio=("contexto", "mean"), contexto_max=("contexto", "max"),
                                         desde=("dia", "min"), hasta=("dia", "max")).round(2)

    # ¿Qué hace crecer el contexto? Tamaño de los resultados de herramientas (≈ 4 caracteres por token)
    h["tokens_aprox"] = h["caracteres_resultado"] / 4
    por_herr = h.groupby("herramienta").agg(usos=("tokens_aprox", "size"), tokens_total=("tokens_aprox", "sum"),
                                            tokens_medio=("tokens_aprox", "mean"),
                                            tokens_max=("tokens_aprox", "max")).sort_values("tokens_total", ascending=False)
    grandes = h[h["tokens_aprox"] > 5000]
    # Un resultado grande se vuelve a leer (desde caché) en cada respuesta posterior de la sesión
    r_ses = r.groupby("sesion")["fecha_hora"].apply(list)
    relecturas = sum(sum(1 for t in r_ses.get(s, []) if t > f) * tok
                     for s, f, tok in zip(grandes["sesion"], grandes["fecha_hora"], grandes["tokens_aprox"]))

    # Razonamiento y salida
    razonamiento = r["razonamiento"].sum()
    resumen = {
        "periodo": [r["dia"].min(), r["dia"].max()],
        "respuestas": int(len(r)), "sesiones": int(r["sesion"].nunique()),
        "tokens": {k: int(r[k].sum()) for k in ["entrada", "salida", "razonamiento", "cache_creado", "cache_leido"]},
        "usd_equivalente": {k: round(float(v), 2) for k, v in total.items()},
        "usd_sin_cache": round(float(sin_cache), 2),
        "ahorro_por_cache_pct": round(100 * (1 - total["usd"] / sin_cache), 1),
        "pct_costo": {k: round(100 * float(total[k] / total["usd"]), 1)
                      for k in ["usd_entrada", "usd_salida", "usd_cache_escrito", "usd_cache_leido"]},
        "contexto_medio_por_respuesta": int(r["contexto"].mean()),
        "pct_salida_que_es_razonamiento": round(100 * razonamiento / r["salida"].sum(), 1),
        "resultados_de_herramientas_grandes_5k_tokens": int(len(grandes)),
        "tokens_releidos_por_resultados_grandes_aprox": int(relecturas),
        "por_dia": por_dia.reset_index().to_dict("records"),
        "por_sesion": por_sesion.reset_index().to_dict("records"),
        "por_herramienta": por_herr.round(0).reset_index().to_dict("records"),
    }
    (DATOS / "linea_base.json").write_text(json.dumps(resumen, indent=1, ensure_ascii=False, default=str))
    print(json.dumps({k: v for k, v in resumen.items() if not k.startswith("por_")}, indent=1, ensure_ascii=False))
    print(por_dia.to_string()); print(por_sesion.to_string()); print(por_herr.round(0).to_string())


if __name__ == "__main__":
    main()

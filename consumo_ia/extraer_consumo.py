"""Extrae el consumo de tokens de Claude Code en este proyecto, a partir de los registros locales de sesión.

Lee ~/.claude/projects/*/*.jsonl y guarda SOLO metadatos de consumo (nunca el texto de la conversación):
- por respuesta del modelo: sesión, fecha y hora, modelo, tokens de entrada, salida, caché creado (5 min / 1 h),
  caché leído, razonamiento, búsquedas web, si fue un subagente, y los NOMBRES de las herramientas que pidió;
- por resultado de herramienta: nombre de la herramienta y TAMAÑO del resultado en caracteres (sin el contenido).

Qué cuenta como "este proyecto": la sesión principal (94535e6e…, que empezó acá) y toda respuesta cuyo
directorio de trabajo esté dentro de "Super Niño". Las sesiones de otros proyectos (CV, Aerowind…) se excluyen.
Claude Code a veces copia el mismo registro a varias carpetas y escribe una respuesta en varias líneas:
se deduplica por identificador de mensaje.

Salida: data/consumo_ia/respuestas.parquet y data/consumo_ia/herramientas.parquet
"""
import glob
import json
import os
import unicodedata
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
SALIDA = RAIZ / "data" / "consumo_ia"
SESION_PRINCIPAL = "94535e6e-7367-4fbe-84ce-7dfddd3fd9ae"


def es_del_proyecto(sesion: str, cwd: str) -> bool:
    cwd = unicodedata.normalize("NFC", cwd or "").lower()
    return sesion == SESION_PRINCIPAL or "super niño" in cwd or "super-nino" in cwd or "super nino" in cwd


def tamano(contenido) -> int:
    if isinstance(contenido, str):
        return len(contenido)
    if isinstance(contenido, list):
        return sum(len(c.get("text", "")) if c.get("type") == "text" else 1500 for c in contenido)  # imagen ≈ 1 500
    return 0


def main() -> None:
    respuestas, herramientas, pedidos = {}, [], {}
    for f in glob.glob(os.path.expanduser("~/.claude/projects/*/*.jsonl")):
        for linea in open(f, encoding="utf-8"):
            try:
                d = json.loads(linea)
            except json.JSONDecodeError:
                continue
            sesion, cwd = d.get("sessionId", ""), d.get("cwd", "")
            if not es_del_proyecto(sesion, cwd):
                continue
            m = d.get("message") or {}
            if d.get("type") == "assistant" and m.get("usage"):
                u = m["usage"]
                cc = u.get("cache_creation") or {}
                stu = u.get("server_tool_use") or {}
                usadas = [c.get("name") for c in m.get("content", []) if isinstance(c, dict) and c.get("type") == "tool_use"]
                for c in m.get("content", []):
                    if isinstance(c, dict) and c.get("type") == "tool_use":
                        pedidos[c.get("id")] = c.get("name")
                previo = respuestas.get(m.get("id"), {})
                respuestas[m.get("id")] = {
                    "mensaje_id": m.get("id"), "sesion": sesion, "subagente": bool(d.get("isSidechain")),
                    "fecha_hora": d.get("timestamp"), "modelo": m.get("model"),
                    "entrada": u.get("input_tokens", 0), "salida": u.get("output_tokens", 0),
                    "cache_creado_5m": cc.get("ephemeral_5m_input_tokens", 0),
                    "cache_creado_1h": cc.get("ephemeral_1h_input_tokens", 0),
                    "cache_creado": u.get("cache_creation_input_tokens", 0),
                    "cache_leido": u.get("cache_read_input_tokens", 0),
                    "razonamiento": (u.get("output_tokens_details") or {}).get("thinking_tokens", 0),
                    "busquedas_web": stu.get("web_search_requests", 0), "lecturas_web": stu.get("web_fetch_requests", 0),
                    # una respuesta puede venir en varias líneas (una por bloque): se acumulan las herramientas
                    "herramientas": ",".join(sorted(set(filter(None, (previo.get("herramientas", "") + "," + ",".join(usadas)).split(","))))),
                }
            elif d.get("type") == "user" and isinstance(m.get("content"), list):
                for c in m["content"]:
                    if isinstance(c, dict) and c.get("type") == "tool_result":
                        herramientas.append({"sesion": sesion, "fecha_hora": d.get("timestamp"),
                                             "tool_use_id": c.get("tool_use_id"),
                                             "caracteres_resultado": tamano(c.get("content")),
                                             "es_error": bool(c.get("is_error"))})
    r = pd.DataFrame(respuestas.values())
    h = pd.DataFrame(herramientas).drop_duplicates("tool_use_id")
    h["herramienta"] = h["tool_use_id"].map(pedidos)
    for df in (r, h):
        df["fecha_hora"] = pd.to_datetime(df["fecha_hora"], utc=True).dt.tz_convert("America/Argentina/Buenos_Aires")
    SALIDA.mkdir(parents=True, exist_ok=True)
    r.to_parquet(SALIDA / "respuestas.parquet", index=False)
    h.to_parquet(SALIDA / "herramientas.parquet", index=False)
    print(f"{len(r)} respuestas en {r['sesion'].nunique()} sesiones; {len(h)} resultados de herramientas")


if __name__ == "__main__":
    main()

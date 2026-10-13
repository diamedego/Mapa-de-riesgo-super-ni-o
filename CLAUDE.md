# Argentina frente a El Niño 2026-27 — mapa de riesgo de inundación

Proyecto de portfolio de Diamela (ingeniera química, busca rol de datos). Publicación única en LinkedIn ~1-dic-2026: video del mapa 3D + web + este repo. Bilingüe ES/EN. Solo datos de Argentina. Foco actual: **solo riesgo de inundación** (dengue, impacto agrícola y capa social quedan pospuestos).

## Estructura
- `ingesta/` — un script por fuente (SMN, INA, Open-Meteo SEAS5/GloFAS/ECMWF, IGN, INDEC, Censo, OSM, RENABAP, BA Data, históricos). `comun.py`: sesión HTTP con reintentos, descarga WFS paginada, registro en `data/manifest.csv`.
- `earth_engine/` — terreno, agua histórica, MapBiomas, suelo, Dynamic World, lluvia ERA5. Proyecto GEE en `earth_engine/config.py`.
- `transformacion/` — capas silver (rasgos fijos por radio y gobierno local, reclamos CABA, dengue).
- `modelos/` — `rios.py` (curva caudal→altura + sesgo reciente), `anegamientos_caba.py`, `indice_riesgo.py` (INFORM + Monte Carlo), `verificacion.py`, `amenaza_agua.py` y `dengue.py` (documentados, no usados en el índice).
- `sql/` — medallón bronze→silver→gold; `correr_duckdb.py` (local, validado igual a Python) y `correr_databricks.py` (perfil `mapa-nino`, login pendiente).
- `web/` — MapLibre 3D. `preparar_geometrias.py` (fijo, Mac) y `actualizar_datos_web.py` (diario, Actions). `construir_artifact.py` arma la versión privada en claude.ai.
- `consumo_ia/` — medición del consumo de tokens de Claude Code en este proyecto.
- `.github/workflows/actualizar_datos.yml` — SMN cada 3 h, INA + pronóstico 16 días diario, GloFAS los lunes, SEAS5 el 6 de cada mes, y recálculo del índice y la web.
- `docs/00_bitacora.md` (registro paso a paso, se agrega al final), `docs/01_fuentes.md` (fuentes y cobertura).

## Comandos
- Entorno: `.venv/bin/python`. Web local: `cd web && python3 -m http.server 8765`.
- Índice: `modelos/rios.py pronostico` → `modelos/verificacion.py` → `modelos/indice_riesgo.py` → `web/actualizar_datos_web.py`.
- SQL: `sql/exportar_bronze.py` → `sql/correr_duckdb.py`.

## Reglas para trabajar barato y rápido
- No leer ni listar `data/raw/`, `data/archivo/`, `web/datos/` ni archivos `.parquet`/`.geojson` enteros: inspeccionar con pandas (`shape`, `columns`, `head(3)`).
- No releer `docs/00_bitacora.md` entero: agregar entradas al final con `cat >>`.
- Este archivo resume el proyecto: no re-explorar el repo para ubicarse.
- Antes de publicar algo nuevo, contrastar cifras extremas (p. ej. GloFAS vs INA) y presentarlas como escenario.
- Commits con la línea `Co-Authored-By` que indique el sistema; `git pull --rebase` antes de `push` (Actions sube datos solos).

## Pendientes (actualizar al terminar cada tarea)
- Databricks: login por navegador en la Mac (perfil `mapa-nino`) y correr `sql/correr_databricks.py`.
- GloFAS semanal: la corrida automática del lunes 5-oct no se guardó; revisar el workflow (posible límite de la API).
- Sudestada (SHN), reintentar suelos INTA, validar paleta con Node.
- Re-medir consumo de IA (`consumo_ia/`) en 1-2 semanas.
- Lanzamiento (antes del 30-nov): pulir web, video 30-60 s, post ES/EN, README, repo público + GitHub Pages.
- Versión privada en claude.ai: https://claude.ai/artifact/2LcKXVqiZ3ZiGc9ZnnNbyU (actualizar con `web/construir_artifact.py`).
  Al republicar subir también `datos/callejero/*` (`web/preparar_callejero.py`) y `datos/base/*` (`web/preparar_mapa_base.py`:
  calles y agua propias, no se commitea; en dos publicaciones porque supera 64 MB) si se regeneraron.
- Cloudflare Pages (gratis, versión completa con calles y Georef): ella crea la cuenta y conecta el repo (Framework None,
  build vacío, output `web`). Después: botón "Abrir mapa completo" en el artifact con ese link.

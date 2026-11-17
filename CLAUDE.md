# Argentina frente a El Niño 2026-27 — mapa de riesgo de inundación

Proyecto de portfolio de Diamela (ingeniera química). Publicación única en LinkedIn ~1-dic-2026: video del mapa 3D + web + este repo. Bilingüe ES/EN. Solo datos de Argentina. Foco actual: **solo riesgo de inundación** (dengue, impacto agrícola y capa social quedan pospuestos).

## Estructura
- `ingesta/` — un script por fuente (SMN, INA, Open-Meteo SEAS5/GloFAS/ECMWF, IGN, INDEC, Censo, OSM, RENABAP, BA Data, históricos).
  `zonas_rurales.py`: 162 zonas rurales sin gobierno local (cmu «R» + departamento) sumadas a los 2.282 gobiernos locales (16-nov). `comun.py`: sesión HTTP con reintentos, descarga WFS paginada, registro en `data/manifest.csv`.
- `earth_engine/` — terreno, agua histórica, MapBiomas, suelo, Dynamic World, lluvia ERA5. `lluvia_ninos.py`: peor tormenta de cada Niño
  (IMERG, 1997-98 ERA5-Land) y desagües de 2 años por celda de 0,1° → `web/datos/lluvia_ninos/`; `clima_ninos.py`: rango de humedad,
  ET0 y Niños 1951-96 por celda → `web/datos/clima_ninos/` (el simulador ya no pide series diarias a Open-Meteo); `validar_lluvia.py`: fuentes contra 482
  tormentas de pluviómetros (INA RHN-SAT + GHCN). Proyecto GEE en `earth_engine/config.py`.
- `transformacion/` — capas silver (rasgos fijos por radio y gobierno local, reclamos CABA, dengue).
- `modelos/` — `rios.py` (curva caudal→altura + sesgo reciente), `anegamientos_caba.py`, `indice_riesgo.py` (INFORM + Monte Carlo), `verificacion.py`, `amenaza_agua.py` y `dengue.py` (documentados, no usados en el índice).
- `sql/` — medallón bronze→silver→gold; `correr_duckdb.py` (local, validado igual a Python) y `correr_databricks.py` (perfil `mapa-nino`, login pendiente).
- `web/` — tablero "sala de situación" (MapLibre, sin otras librerías). Módulos: `textos.js` (ES/EN), `utiles.js`, `graficos.js`,
  `tiempo.js` (campos del tiempo, partículas de viento, miniaturas), `mapa.js`, `buscador.js`, `tableros.js` (un tablero por capa y
  el análisis de abajo), `laminas.js` (las tres láminas: panorama, simulador y análisis con la validación en la 03),
  `guia.js` (encabezado, fuentes por tipo, recorrido guiado), `app.js` (estado, indicadores, modo actual/futuro). Datos: `preparar_geometrias.py` y `preparar_centros.py` (fijos, Mac),
  `actualizar_datos_web.py` (diario), `preparar_rios_extremos.py` y `preparar_rios_ninos.py` (fijos, Mac; altura de cada día de los Niños en `datos/rios_ninos/`), `exportar_alertas.py` (cada 3 h), `ingesta/tiempo_grilla.py` (2 veces por día).
  `construir_artifact.py` arma la versión privada en claude.ai (inlina los módulos; mapa base propio).
- `consumo_ia/` — medición del consumo de tokens de Claude Code en este proyecto.
- `.github/workflows/actualizar_datos.yml` — SMN cada 3 h (+ alertas vigentes para la web), INA + pronóstico 16 días diario, grilla del tiempo 05:20 y 17:20 ART, GloFAS los lunes, SEAS5 el 6 de cada mes, y recálculo del índice y la web.
- `docs/00_bitacora.md` (registro paso a paso, se agrega al final), `docs/01_fuentes.md` (fuentes y cobertura),
  `docs/03_investigacion_trabajos.md` (17 trabajos de referencia; PDF en la carpeta local «Investigación - trabajos», sin commitear),
  `docs/04_validacion_simulador.md` (validación: Dynamic World, lluvia contra pluviómetros, río contra radar en
  `herramientas/validacion/validar_rio_radar.py`), `docs/documento_funcional/generar.py` (PDF; versiones en «Documento funcional - versiones»).

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
- Antes de subir cambios al workflow, validarlo (`yaml.safe_load`): un nombre con ": " lo dejó inválido del 5 al 8-nov.

## Pendientes (actualizar al terminar cada tarea)
- Databricks: login por navegador en la Mac (perfil `mapa-nino`) y correr `sql/correr_databricks.py`.
- GloFAS semanal: la corrida automática del lunes 5-oct no se guardó; revisar el workflow (posible límite de la API).
- Sudestada (SHN), reintentar suelos INTA, validar paleta con Node.
- Re-medir consumo de IA (`consumo_ia/`) en 1-2 semanas.
- Lanzamiento (antes del 30-nov): pulir web, video 30-60 s, post ES/EN, README, repo público + GitHub Pages.
- Versión privada en claude.ai: https://claude.ai/artifact/2LcKXVqiZ3ZiGc9ZnnNbyU (actualizar con `web/construir_artifact.py`; publicar también
  `datos/tiempo.json`, `alertas.geojson`, `estaciones.geojson`, `riesgo.json`, `riesgo_diario.json` y `resumen.json`, que cambian todos los días;
  republicada el 16-nov, v25, con radios y capas nuevas).
  Al republicar subir también `datos/callejero/*` (`web/preparar_callejero.py`) y `datos/base/*` (`web/preparar_mapa_base.py`:
  calles y agua propias, no se commitea; en dos publicaciones porque supera 64 MB) si se regeneraron.
- Reestructura pedida 14-nov (respaldo: etiqueta `respaldo-2026-11-14`): dos secciones, (1) situación de hoy + pronóstico en línea de
  tiempo y (2) simulación de escenarios con barras entre mínimos y máximos históricos de cada zona en años Niño (si no hay, otros
  extremos): lluvia y duración, viento, humedad del suelo, lagunas, río. Mapa de la estructura actual: `docs/mapa_proyecto/mapa_proyecto.html`
  (PDF en `Mapa del proyecto - versiones/`). 14-nov hecho: índice con umbrales físicos fijos (`UMBRALES` en
  `modelos/indice_riesgo.py`, también radios y SQL) y simulador con barras de escenario (lluvia y duración, humedad del suelo,
  lagunas, río o mar, desagües; sin viento) entre extremos de 8 temporadas Niño (ERA5) y del INA (`web/preparar_rios_extremos.py`).
  Las dos secciones quedaron como riesgo por día (lámina 01) y simulador (lámina 02). Réplica SQL con el ajuste por distancia de los ríos
  (16-nov: igual a Python). Falta: peso del pronóstico estacional (w = 0,10) en el índice mensual, que ya solo aporta E, V y propensión.
- Rediseño «láminas» (13-nov): 01 y 02 iguales a la maqueta aprobada (`Propuestas de diseño`, fotos 6, 7 y 10); falta ajustar 03 y 04 a sus maquetas si lo pide, probar en el celular y republicar la versión privada de claude.ai.
- Pedido 10-nov (`docs/02_plan_cambios_nov.md`): tandas 1 a 6 publicadas (colores, capas, filtros, período, Situación con tortas y
  recomendaciones, análisis tipo Power BI, encabezado con fuentes por tipo y recorrido guiado en `web/guia.js`) y tandas 7-8
  (calles cortadas, aislados, confianza, validación contra satélite en `herramientas/validacion/`, ver `docs/04_validacion_simulador.md`).
  13-nov: revisada una crítica externa (ver bitácora): confianza baja sin validación, «Sin información» en ríos sin estación, límites explícitos. Próximo: mejorar el modelo donde falla (nivel de referencia del río, lagunas) y volver a correr `validar.py`.
- Buscador: TomTom activo (clave en `web/claves.js`). Lugares cargados a mano en `LUGARES_PROPIOS` (`web/buscador.js`): Toyota Boshoku,
  Tenaris Siderca, refinerías y sedes de petroleras. Estaciones de servicio fuera de los resultados salvo que se pidan. Padilla Logística cargada (near-place.com).
- 15-nov (ver bitácora y documento v4): lluvia de los Niños con IMERG, río de los días de la tormenta (+3 días), fórmula del peor
  Niño con λ = 0,05, humedad relativa, bajos del relieve y río conectado; modelo 3D corregido (arrancaba quieto). Falta: sensibilidad
  de la ventana del río (1/3/7 días), radar en otras crecidas, republicar la versión privada con `datos/lluvia_ninos/*` y `datos/rios_ninos/*`.
- Simulador con dos solapas (escenario / pronóstico 15 días con ensamble y radar). Agua de hoy por radar: `earth_engine/agua_hoy_radar.py`,
  regenerada por Actions (cuenta de servicio `mapa-nino-actions`, identidad federada sin claves). Verificar la primera corrida automática y
  cuánto dura un mapa de Earth Engine (si vence antes de 3 h, regenerar más seguido). Documento funcional v4 listo en el código, sin
  generar: la usuaria pide esperar a validar el simulador (agregarle la solapa de pronóstico).
- Sitio público (Cloudflare Workers, gratis): https://mapa-de-riesgo-super-nino.diamedego.workers.dev — se publica solo con cada push
  (configuración en `wrangler.jsonc` y `web/.assetsignore`; ~11 publicaciones por día, plan gratis 500 por mes).
- Riesgo por día, MÉTODO NUEVO (17-nov): probabilidad × impacto (umbrales del SMN `earth_engine/umbrales_smn.py`, niveles del INA,
  alertas del SMN; impacto `transformacion/impacto.py`). Ver bitácora. Falta: documento funcional y validar contra lo que pase.
  Documento funcional (cuando ella valide todo): DESTACAR la verificación diaria/semanal con ajuste prudente (`modelos/verificar_riesgo.py`), lo pidió.
- Riesgo por día (15-nov): `modelos/riesgo_diario.py` (ensamble ECMWF de datos abiertos + umbrales ERA5-Land, GloFAS con error
  reciente del INA, alertas SMN) → `web/datos/riesgo_diario.json`, 2 veces por día. El índice mensual se sigue calculando solo por
  E y V. Amenaza del día = combinación de la fija del lugar (propensión con lluvia normal) y la pronosticada; subindicador «Propensión a
  juntar agua». Falta: verificar el riesgo diario contra lo que pase (copias en `data/archivo/riesgo_diario/`), sumarlo al documento funcional.
- Diseño: todo cambio visual sigue `docs/06_constitucion_grafica.md` (retícula 8 px, sin «…», semáforo solo para riesgo, auditoría de 5 puntos).
- Simulador: grilla por tramos de radio (≤1,5 km ~32 m z14; ≤3 km ~63 m z13; …), encajada y alineada: ≤ 9 s por corrida.
- Simulador (versión pública): vista Mapa + Maqueta 3D con lluvia animada (estilo reel CutSheetRX). Posible mejora: relieve
  de 5 m (IGN / IDECOR) en ciudades puntuales para ver el escurrimiento de cerca.

# Argentina frente a El Niño 2026–27 · Observatorio de riesgo de inundación

> **Trabajo en curso.** Lanzamiento público: diciembre de 2026. El sitio ya funciona y se actualiza solo varias veces por día.
> **Work in progress.** Public launch: December 2026. The site already works and updates itself several times a day.

**Sitio / Site:** https://mapa-de-riesgo-super-nino.diamedego.workers.dev

Herramienta experimental, orientativa y no oficial. Ante una emergencia, seguir a Defensa Civil, el SMN y el INA.

---

## Qué hace

- **Riesgo de inundación para hoy y cada uno de los próximos 14 días** en los 2.282 gobiernos locales, las 162 zonas rurales sin gobierno local y los 66.515 radios censales de la Argentina. Estructura INFORM (amenaza × exposición × vulnerabilidad) con umbrales físicos fijos. La amenaza de cada día combina la propensión del lugar a juntar agua con el pronóstico: lluvia de los 50 escenarios del ensamble del ECMWF frente a la lluvia de 2, 5 y 10 años del lugar, ríos (GloFAS corregido con lo que mide el INA) y alertas del SMN.
- **Qué cambia en los próximos días:** zonas que suben o bajan de nivel, cuándo y por qué, con recomendaciones armadas con los datos de cada lugar.
- **Simulador hidráulico 3D** en el navegador (ecuaciones de aguas poco profundas en forma inercial, infiltración de Green-Ampt) sobre relieve real:
  - repite la peor tormenta de cada Niño desde 1997–98 (satélite IMERG), con la humedad del suelo y el río de esos mismos días;
  - simula los próximos 15 días desde las condiciones de hoy (lluvia real de dos semanas, agua vista por radar y pronóstico probable o pesimista).
- **Validación publicada:** lluvia contra 482 tormentas medidas en pluviómetros, crecida de río contra el radar Sentinel-1 y agua contra Dynamic World.

## What it does

- **Flood risk for today and each of the next 14 days** for Argentina's 2,282 municipalities, 162 rural areas without local government and 66,515 census tracts, using the INFORM structure (hazard × exposure × vulnerability) with fixed physical thresholds. Each day's hazard combines the place's propensity to hold water with the forecast: rain from the 50-member ECMWF ensemble against the local 2-, 5- and 10-year rainfall, rivers (GloFAS corrected with INA gauges) and national weather warnings.
- **What changes in the coming days:** areas rising or falling in risk level, when and why, with advice built from local data.
- **3D hydraulic simulator** running in the browser (local inertial shallow-water equations, Green-Ampt infiltration) on real terrain: it replays the worst storm of each El Niño since 1997–98 and simulates the next 15 days from today's conditions.
- **Published validation** against rain gauges, Sentinel-1 radar and Dynamic World.

## Datos y herramientas · Data and stack

Solo datos públicos y servicios gratuitos · Public data and free services only.

- **Fuentes:** INDEC (Censo 2022), SMN, INA, ECMWF (ensamble de datos abiertos, ERA5, ERA5-Land, SEAS5), GloFAS, NASA (IMERG, MODIS), ESA (Sentinel-1), JRC, Dynamic World, MERIT Hydro, FABDEM, SoilGrids, MapBiomas, RENABAP, IGN y OpenStreetMap. Detalle en `docs/01_fuentes.md`.
- **Procesamiento:** Python (pandas, GeoPandas, NumPy), Google Earth Engine, SQL en capas bronze → silver → gold (DuckDB; preparado para Databricks).
- **Automatización:** GitHub Actions (cada 3 horas, diaria y dos veces por día).
- **Web:** HTML, CSS y JavaScript sin frameworks; MapLibre GL para el mapa y three.js para la maqueta 3D. Publicada en Cloudflare Workers con cada cambio.

## Correr localmente · Run locally

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cd web && python3 -m http.server 8765   # http://localhost:8765
```

Cálculo del riesgo por día: `.venv/bin/python modelos/riesgo_diario.py`. Índice y archivos de la web: `modelos/rios.py pronostico` → `modelos/verificacion.py` → `modelos/indice_riesgo.py` → `web/actualizar_datos_web.py`.

## Estructura · Structure

| Carpeta | Contenido |
|---|---|
| `ingesta/` | Un script por fuente, con reintentos y registro |
| `earth_engine/` | Terreno, agua histórica, tormentas de los Niños, umbrales de lluvia, agua de hoy por radar |
| `transformacion/`, `sql/` | Capas de datos y modelo medallón |
| `modelos/` | Ríos, índice con Monte Carlo, riesgo por día, verificación del pronóstico |
| `web/` | Aplicación web y preparación de sus datos |
| `herramientas/` | Pruebas en Chrome sin ventana y validaciones |
| `docs/` | Bitácora del proceso, fuentes, trabajos de referencia, validación y documento funcional |

## Autoría · Authorship

Proyecto personal de Diamela, ingeniera química (UTN), desarrollado con la asistencia de Claude (Anthropic). Las decisiones de alcance, método y diseño son de la autora; cada paso está registrado en `docs/00_bitacora.md`.

# Argentina frente a El Niño 2026–27 · Observatorio de riesgo de inundación

> **Lanzamiento público: noviembre de 2026.** El sitio ya funciona y se actualiza automáticamente varias veces al día.
> **Public launch: November 2026.** The website is already operational and updates automatically several times a day.

**Sitio / Website:** https://mapa-de-riesgo-super-nino.diamedego.workers.dev

Herramienta experimental, orientativa y no oficial. Ante una emergencia, seguir las indicaciones de Defensa Civil, el SMN y el INA.

---

## Qué hace

- **Riesgo de inundación para hoy y cada uno de los próximos 14 días** en los 2.282 gobiernos locales, las 162 zonas rurales sin gobierno local y los 66.515 radios censales de Argentina. El riesgo se calcula como **probabilidad × impacto**, en una escala de 0 a 10. La probabilidad de cada día combina la lluvia de los 50 escenarios del ensamble del ECMWF frente a los umbrales de lluvia del lugar (método del SMN: percentiles 90 y 99 y valor extremo de la lluvia diaria, con ERA5-Land 1991–2020, calibrados con las alertas del SMN), los niveles de los ríos (GloFAS corregido con mediciones del INA) y las alertas vigentes del SMN. El impacto es la población expuesta, estimada con el relieve de cada radio censal y el método del simulador.
- **Evolución del riesgo en los próximos días:** identifica las zonas que suben o bajan de nivel, cuándo y por qué, con recomendaciones elaboradas a partir de los datos de cada lugar.
- **Simulador hidráulico 3D** en el navegador (ecuaciones de aguas poco profundas en forma inercial e infiltración de Green-Ampt) sobre relieve real:
  - reproduce la peor tormenta de cada evento El Niño desde 1997–98 (satélite IMERG; ERA5-Land en 1997–98, anterior a IMERG), con la humedad del suelo y los niveles de los ríos de esos mismos días;
  - simula los próximos 15 días a partir de las condiciones actuales: lluvia observada en las últimas dos semanas, agua detectada por radar y pronósticos en escenarios probable y pesimista.
- **Validación publicada:** lluvia contra 482 tormentas medidas en pluviómetros, crecidas de ríos contra el radar Sentinel-1 y detección de agua contra Dynamic World.

## Datos y herramientas

Solo utiliza datos públicos y servicios gratuitos.

- **Fuentes:** INDEC (Censo 2022), SMN, INA, ECMWF (ensamble de datos abiertos, ERA5, ERA5-Land, SEAS5), GloFAS, NASA (IMERG, MODIS), ESA (Sentinel-1), JRC, Dynamic World, MERIT Hydro, FABDEM, SoilGrids, MapBiomas, RENABAP, IGN y OpenStreetMap. Detalle en `docs/01_fuentes.md`.
- **Licencias de los datos:** cada fuente conserva la suya. En particular, FABDEM (relieve sin edificios ni árboles) se distribuye bajo CC BY-NC-SA 4.0, que limita los usos comerciales, y los datos abiertos del ECMWF bajo CC BY 4.0.
- **Procesamiento:** Python (pandas, GeoPandas, NumPy), Google Earth Engine y SQL con arquitectura de datos bronze → silver → gold (DuckDB; preparado para Databricks).
- **Automatización:** GitHub Actions (ejecuciones cada 3 horas, diarias y dos veces por día).
- **Aplicación web:** HTML, CSS y JavaScript sin frameworks; MapLibre GL para el mapa y three.js para la maqueta 3D. Publicada en Cloudflare Workers y actualizada automáticamente con cada cambio.

## Ejecución local

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cd web && python3 -m http.server 8765   # http://localhost:8765
```

Cálculo del riesgo diario: `.venv/bin/python modelos/riesgo_diario.py`. Índice y archivos de la web: `modelos/rios.py pronostico` → `modelos/verificacion.py` → `modelos/indice_riesgo.py` → `web/actualizar_datos_web.py`.

## Estructura del proyecto

| Carpeta | Contenido |
|---|---|
| `ingesta/` | Un script por fuente, con reintentos y registro |
| `earth_engine/` | Terreno, agua histórica, tormentas de El Niño, umbrales de lluvia y agua actual detectada por radar |
| `transformacion/`, `sql/` | Capas de datos y modelo medallón |
| `modelos/` | Ríos, índice con Monte Carlo, riesgo diario y verificación del pronóstico |
| `web/` | Aplicación web y preparación de sus datos |
| `herramientas/` | Pruebas automatizadas en Chrome y validaciones |
| `docs/` | Bitácora del proceso, fuentes, trabajos de referencia, validación y documento funcional |

## Autoría

Proyecto personal de Diamela Dego, ingeniera química (UTN), desarrollado con asistencia de Claude (Anthropic). Las decisiones de alcance, metodología y diseño corresponden a la autora. El proceso de desarrollo está documentado en `docs/00_bitacora.md`.

---

# Argentina and El Niño 2026–27 · Flood Risk Observatory

**Public launch: November 2026.** The website is already operational and updates automatically several times a day.

**Website:** https://mapa-de-riesgo-super-nino.diamedego.workers.dev

An experimental, indicative and unofficial tool. In an emergency, follow the guidance issued by Civil Defense, the National Meteorological Service (SMN) and the National Water Institute (INA).

---

## What it does

- **Flood risk for today and each of the next 14 days** across Argentina's 2,282 local governments, 162 rural areas without local government and 66,515 census tracts. Risk is computed as **probability × impact**, on a 0 to 10 scale. Each day's probability combines rainfall from the ECMWF ensemble's 50 members against local rainfall thresholds (SMN method: 90th and 99th percentiles and extreme value of daily rainfall, from ERA5-Land 1991–2020, calibrated against SMN warnings), river levels (GloFAS adjusted with INA gauge measurements) and current SMN warnings. Impact is the exposed population, estimated from the terrain of each census tract using the simulator's method.
- **How risk evolves over the coming days:** identifies areas where risk levels increase or decrease, when and why, with recommendations generated from location-specific data.
- **Browser-based 3D hydraulic simulator** (local inertial form of the shallow water equations and Green-Ampt infiltration) on real terrain:
  - replays the worst storm of each El Niño event since 1997–98 (IMERG satellite data; ERA5-Land for 1997–98, before IMERG), using soil moisture and river levels from the same dates;
  - simulates the next 15 days from current conditions: rainfall observed over the previous two weeks, water detected by radar and forecasts under likely and pessimistic scenarios.
- **Published validation:** rainfall against 482 storms measured by rain gauges, river floods against Sentinel-1 radar and water detection against Dynamic World.

## Data and technology stack

Uses only public datasets and free services.

- **Data sources:** INDEC (2022 Census), SMN, INA, ECMWF (open ensemble data, ERA5, ERA5-Land, SEAS5), GloFAS, NASA (IMERG, MODIS), ESA (Sentinel-1), JRC, Dynamic World, MERIT Hydro, FABDEM, SoilGrids, MapBiomas, RENABAP, IGN and OpenStreetMap. Full details in `docs/01_fuentes.md`.
- **Data licences:** each source keeps its own. In particular, FABDEM (terrain without buildings or trees) is distributed under CC BY-NC-SA 4.0, which restricts commercial use, and ECMWF open data under CC BY 4.0.
- **Data processing:** Python (pandas, GeoPandas, NumPy), Google Earth Engine and SQL using a bronze → silver → gold data architecture (DuckDB; Databricks-ready).
- **Automation:** GitHub Actions (scheduled every 3 hours, daily and twice a day).
- **Web application:** HTML, CSS and JavaScript without frameworks; MapLibre GL for mapping and three.js for the 3D model. Deployed on Cloudflare Workers and automatically updated with every change.

## Run locally

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cd web && python3 -m http.server 8765   # http://localhost:8765
```

Daily risk calculation: `.venv/bin/python modelos/riesgo_diario.py`. Risk index and website data pipeline: `modelos/rios.py pronostico` → `modelos/verificacion.py` → `modelos/indice_riesgo.py` → `web/actualizar_datos_web.py`.

## Project structure

| Folder | Contents |
|---|---|
| `ingesta/` | One script per data source, with retries and logging |
| `earth_engine/` | Terrain, historical water extent, El Niño storms, rainfall thresholds and current radar-based water detection |
| `transformacion/`, `sql/` | Data layers and medallion architecture |
| `modelos/` | Rivers, Monte Carlo index, daily risk and forecast verification |
| `web/` | Web application and data preparation |
| `herramientas/` | Headless Chrome tests and validation tools |
| `docs/` | Development log, data sources, reference studies, validation and functional documentation |

## Authorship

Personal project by Diamela Dego, Chemical Engineer (UTN), developed with assistance from Claude (Anthropic). All decisions regarding scope, methodology and design are the author's. The development process is documented in `docs/00_bitacora.md`.

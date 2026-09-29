# Bitácora del proyecto · Project log

Registro cronológico de lo que se hizo, las decisiones tomadas y los problemas encontrados.
*Chronological record of work done, decisions and issues.*

---

## 2026-09-27 · Investigación inicial de fuentes

- Contexto del evento: NOAA CPC (10-sep-2026) da más de 90 % de probabilidad de un El Niño muy fuerte en el verano 2026-27, con 75 % de superar +2.5 °C en el Niño 3.4 entre octubre y diciembre. El SMN pronostica lluvias superiores a lo normal en el Litoral y la región pampeana, con efectos al menos hasta abril de 2027.
- Primer relevamiento de APIs y fuentes públicas. Se probaron endpoints en vivo (código de respuesta, formato, CORS).

## 2026-09-28 · Definición del alcance y arranque de la ingesta

**Decisiones**
- Alcance: **solo Argentina**, en los niveles nación → provincia → departamento → gobierno local → radio censal.
- Producto: web 3D bilingüe con línea de tiempo + un único post en LinkedIn (~1-dic-2026).
- Stack: Python + GitHub Actions (ingesta), Google Earth Engine (procesamiento satelital pesado), Databricks (modelo medallón en SQL), MapLibre/deck.gl (web), Power BI (tablero complementario).
- Unidad municipal de referencia: **gobiernos locales del INDEC (2 282)**. La API Georef tiene 2 082 municipios y no incluye Santiago del Estero ni Santa Cruz; la capa del IGN tiene 2 114 y no incluye Santiago del Estero. INDEC las cubre todas (165 en Santiago del Estero, 20 en Santa Cruz).
- Se amplió el alcance de riesgos más allá del anegamiento urbano: aludes en el NOA, Pilcomayo/Bermejo, lagunas y napas, sudestada, rutas cortadas, contaminación del agua, salud, efecto cascada en servicios e impacto productivo.

**Hecho**
- Estructura del repositorio y entorno de Python (`.venv`).
- `ingesta/comun.py`: cliente HTTP con reintentos, descarga WFS paginada a GeoParquet, registro de cada descarga en `data/manifest.csv`.
- `ingesta/limites.py`: 24 provincias (IGN), 529 departamentos, 2 282 gobiernos locales, 6 571 fracciones y **66 515 radios censales** (INDEC), 2 082 municipios de Georef.
- `ingesta/smn_alertas.py`: 91 avisos CAP vigentes del SMN con sus polígonos.
- `ingesta/ina_rios.py`: 1 141 series de altura de ríos; 175 con nivel de alerta. **1,25 millones de mediciones** desde 2015 (incluye los Niños 2015-16 y 2023-24 para validar).
- `ingesta/open_meteo_estacional.py`: pronóstico ECMWF SEAS5 (sep-2026 → feb-2027) para los 2 282 gobiernos locales, 6 variables, 82 152 valores, sin nulos.

**Primer hallazgo**
- Anomalía de lluvia pronosticada dic-feb (mediana por provincia): Corrientes +363 mm, Misiones +343 mm, Formosa +306 mm, Chaco +285 mm, Entre Ríos +165 mm. Los máximos por gobierno local superan +400 mm (Formosa capital, Posadas). Es consistente con el patrón histórico de El Niño en el NEA.

**Problemas encontrados**
- El GeoServer del IGN devuelve polígonos provinciales demasiado grandes para el lector GeoJSON de GDAL. Se resolvió quitando el límite (`OGR_GEOJSON_MAX_OBJ_SIZE=0`).
- El nombre de la capa de radios en el INDEC no es `radios_censales` sino `radios_censales2`.
- BA Data (datos abiertos de CABA) respondió con errores 502/503 durante la jornada; se reintentará.
- La Mac no tenía git; se instalan las Command Line Tools de Apple.
- Nombres de variables de Open-Meteo: la humedad de suelo es `soil_moisture_0_to_7cm_mean` (la documentación no coincide).

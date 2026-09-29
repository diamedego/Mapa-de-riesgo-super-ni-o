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

## 2026-09-28 (tarde) · Más fuentes y cobertura real

**Hecho**
- `exposicion_ign.py`: salud (8 311), educación, residuos, cursos de agua, canales, diques y espejos de agua del IGN.
- `renabap.py`: 6 467 barrios populares con atributos de servicios + factores de riesgo en barrios del GBA.
- `caba.py`: sumideros (5 zonas) y reclamos al 147 **2011-2026** (~2,5 GB). En 2024 la categoría PLUVIALES tuvo ~2 200 reclamos (destape de sumideros, calle anegada, sumidero roto); el 99 % trae coordenadas.
- `osm.py`: extracto de Argentina (430 MB). Se filtraron 40 658 puentes, 35 825 alcantarillas, 40 687 canales y zanjas, 735 plantas cloacales, 640 potabilizadoras, 273 estaciones de bombeo, 1 670 subestaciones, 397 basurales.
- `censo.py`: 17 variables del Censo 2022 por radio (66 348 radios con hogares).
- `lluvia_historica_caba.py`: lluvia diaria ERA5 2011-2026 en los 48 barrios porteños.
- `cobertura.py`: matriz de cobertura real por gobierno local (`data/cobertura.csv`, `data/cobertura_provincias.csv`).
- `docs/01_fuentes.md` reescrito solo con Argentina y la cobertura medida.

**Hallazgos de cobertura**
- Pronóstico, censo, escuelas y salud cubren prácticamente todo el país (90-100 %).
- Solo el 21 % de los gobiernos locales tiene una estación de río con nivel de alerta a ≤ 30 km, y es 0 % en el NOA, Cuyo y la Patagonia. Justo donde El Niño trae aludes, faltan estaciones.
- OpenStreetMap subregistra plantas cloacales (9 %), bombeo (5 %) y basurales (6-9 %). Se marca como limitación.
- Solo el 1 % de la población vive fuera de un gobierno local; se asigna al departamento.

**Problemas**
- Open-Meteo gratuito: se agotó el cupo por hora con GloFAS. El script ahora hace pausas, maneja el error 429 y retoma donde quedó.
- Git se instaló (Command Line Tools) y se hizo el primer commit.

## 2026-09-28 (noche) · Repo en GitHub y caudales GloFAS

**Hecho**
- Repositorio privado en GitHub (`diamedego/Mapa-de-riesgo-super-ni-o`), con una deploy key exclusiva de este repo para subir cambios.
- `glofas_rios.py`: pronóstico de caudal a 210 días para 96 estaciones del INA con nivel de alerta.

**Hallazgo (a contrastar con el INA antes de publicar)**
- En Rosario, el caudal medio del ensamble GloFAS pasa de ~19 300 m³/s (hoy) a una meseta de ~43 500 m³/s entre diciembre de 2026 y abril de 2027 (banda p25-p75: ~36 000-50 000). Es más del doble del actual y del orden de El Niño 1982-83.

**Decisiones**
- Resumir GloFAS por mes (media y banda p25-p75), no por el pico diario. La serie es una meseta casi plana y el máximo diario caía, sin sentido físico, en el último día con datos (los últimos 22 de los 210 días vienen vacíos).

**Problemas**
- La API del INA no declara UTF-8 y los nombres llegaban con acentos rotos ("ParanÃ¡"). Se decodifica explícitamente en UTF-8.

## 2026-09-28 (noche) · Google Earth Engine

**Hecho**
- Earth Engine autorizado en la Mac. Proyecto de Google Cloud: ID `camisetas-de-futbol-argentino` (nombre visible cambiado a "Mapa de riesgo El Nino"; Google no permite cambiar el ID). Configurado en `earth_engine/config.py`.
- `earth_engine/terreno_agua.py`: elevación, HAND (altura sobre el cauce más cercano), pendiente y agua histórica (JRC 1984-2021) para los 2 282 gobiernos locales, en ~5 minutos. Solo se descargan los promedios.

**Hallazgos**
- La mitad de los gobiernos locales tiene más del 45 % de su superficie a menos de 2 m sobre el cauce más cercano (mediana de HAND: 3,2 m). Es la llanura pampeana y chaqueña: drenaje lento.
- Pendiente mediana de 0,8°: el agua escurre muy despacio en la mayor parte del país habitado.

## 2026-09-28 (noche) · Actualización automática y MapBiomas

**Hecho**
- `.github/workflows/actualizar_datos.yml`: GitHub Actions guarda en `data/archivo/` (versionado) las alertas del SMN cada 3 horas, las alturas del INA todos los días, los caudales de GloFAS cada lunes y el pronóstico SEAS5 el día 6 de cada mes. El historial de alertas solo se puede armar guardándolo desde ahora: el feed del SMN muestra lo vigente.
- Los scripts leen las rutas de variables de entorno (`RAW_DIR`, `MANIFEST`, `INA_DESDE`), así funcionan igual en la Mac y en Actions.
- `data/referencia/puntos_gobiernos_locales.csv`: un punto por gobierno local, versionado, para que Actions no necesite los polígonos.
- MapBiomas Argentina colección 2 (1985-2024) accesible en Earth Engine. Clases verificadas con muestras: 24 urbano (CABA 98 %), 33 agua, 11 humedal (Delta 39 %), 19 cultivos (pampa 74 %).
- En curso: terreno por radio censal (66 515) y uso del suelo anual 1985-2024 por gobierno local.

## 2026-09-28 (noche) · Históricos: dengue y desastres

**Hecho**
- `historico.py`: casos de dengue y zika por departamento y semana (Ministerio de Salud, 2018-2025, 11 archivos), incluida la epidemia 2023-24 que siguió al Niño 2023. También la base DesInventar de Argentina (desastres históricos por departamento, con su cartografía).

**Problemas**
- `datos.salud.gob.ar` no envía el certificado intermedio "Sectigo DV R36" y la verificación TLS fallaba. No se desactivó la verificación: se agregó el intermedio oficial (descargado de la URL AIA del propio certificado, `crt.sectigo.com`) en `ingesta/certificados/`, y `comun.sesion()` lo suma a los certificados estándar.
- El portal etiqueta mal los formatos (2023-2024 figura como XLS y es CSV). El filtro ahora mira la extensión de la URL.
- Los archivos de dengue tienen dos esquemas de columnas: hasta 2022 (`departamento_id`, `año`, `semanas_epidemiologicas`…) y desde 2024 (`id_depto_indec_residencia`, `anio_min`, `sepi_min`…). Se unifican en la capa silver.

## 2026-09-28 (noche) · MapBiomas, suelo y deslizamientos

**Hecho**
- `earth_engine/uso_suelo.py`: % de superficie urbana, agua, humedal y cultivos para cada gobierno local y cada año 1985-2024 (MapBiomas Argentina col. 2). 365 120 valores, sin nulos.
- `earth_engine/suelo_deslizamientos.py`: arcilla superficial (OpenLandMap 250 m), percentil 90 de la pendiente y deslizamientos del Catálogo Global de la NASA (1970-2019) por gobierno local.

**Hallazgos**
- La superficie urbana dentro de los gobiernos locales creció de 10 081 km² (1985) a 13 675 km² (2024): **+36 %**. Más superficie impermeable = más escorrentía.
- El agua en superficie sube en los años Niño: ~15 200 km² en 1997 y 2016, frente a 12 300 km² en la sequía de La Niña 2022-23 (**−19 %**). Es la señal que el mapa tiene que mostrar.
- El catálogo de la NASA registra deslizamientos en solo 7 gobiernos locales: **subregistro** (se basa en noticias) y muchos aludes ocurren fuera de los ejidos. Para el NOA se usará un indicador propio: pendiente p90 + arcilla + anomalía de lluvia SEAS5.

**Problemas**
- El geoservicio del INTA (`geo-backend.inta.gob.ar`) no respondió. La textura/arcilla de OpenLandMap reemplaza por ahora al mapa de suelos del INTA; se reintentará.

## 2026-09-28 (noche) · Terreno por radio censal

**Hecho**
- `terreno_agua.py radios`: elevación, HAND, pendiente y agua histórica para **66 514 radios censales**, sin valores faltantes (~1 h 20 min en Earth Engine).
- Se excluyó 1 radio: el de la Antártida Argentina (872 000 km²). Bloqueaba el procesamiento y no aporta al análisis. El filtro se aplica dentro de cada lote para poder retomar sin reprocesar.

**Hallazgo (preliminar)**
- ~18,0 millones de personas (39,5 %) viven en radios con más de la mitad de su superficie a menos de 2 m sobre el cauce más cercano (HAND, MERIT Hydro 90 m).
- De ellas, ~7,8 millones (17 % del total) viven en radios donde menos de la mitad de los hogares desagota a red cloacal (Censo 2022).
- Matiz metodológico: en la llanura pampeana y chaqueña un HAND bajo es muy frecuente. Indica terreno bajo y drenaje lento, no inundación segura. Se combinará con el pronóstico de lluvia, el agua histórica y los reclamos en el índice de riesgo.

## 2026-09-28 (noche) · Inundación observada por satélite

**Decisión: se descarta Sentinel-1 y se usa Dynamic World**
- Primer intento: radar Sentinel-1, agua = VV < -18 dB, comparando El Niño 2023-24 con la sequía de La Niña 2022-23. En una muestra de 10 municipios de Corrientes y Entre Ríos, la sequía mostraba **más** agua que El Niño (p. ej., Estación Torrent: 8,0 % vs 1,2 %), lo que no tiene sentido físico. Causas conocidas: el suelo seco y liso refleja poca señal de radar y se confunde con agua, y en 2022-23 solo operaba Sentinel-1A (Sentinel-1B falló en dic-2021). **No se usa.**
- Segundo intento: Dynamic World (clasificación con deep learning sobre Sentinel-2). En la misma muestra, El Niño muestra más agua que la sequía en los 10 casos (Estación Torrent: 5,5 % vs 0,06 %). Es coherente, así que se adopta. Se agrega El Niño 2015-16 (Dynamic World empieza a mediados de 2015).
- `earth_engine/inundacion_observada.py` en curso para los 2 282 gobiernos locales.

## 2026-09-29 (madrugada) · Resultado de Dynamic World

- 2 282 gobiernos locales, sin faltantes. Superficie con agua (sin contar el agua permanente) dentro de los gobiernos locales:
  - El Niño 2023-24: **21 709 km²**
  - El Niño 2015-16: **20 029 km²**
  - Sequía de La Niña 2022-23: **12 839 km²**
- El Niño 2023-24 tuvo **+69 %** de superficie con agua respecto de la sequía; 13 174 km² de agua "nueva". Los dos Niños dan magnitudes parecidas, lo que da consistencia.
- Más agua nueva en 2023-24: Buenos Aires (3 411 km²), Corrientes (2 403), Santa Fe (1 984), Entre Ríos (1 909).
- Municipios con mayor % de superficie con agua nueva: Puerto Vilelas (Chaco) 22,9 %, Isla Las Lechiguanas y Victoria (Entre Ríos) ~21 %.
- En el 65 % de los gobiernos locales el agua observada en El Niño supera a la de la sequía. En el resto no hay diferencia apreciable: zonas áridas o sin cuerpos de agua.
- Esta capa sirve para **validar** el índice de riesgo: los municipios que el índice marque como más riesgosos deberían ser los que más agua tuvieron en los Niños pasados.

## 2026-09-29 · Diseño del índice de riesgo (decisiones de la usuaria)

- **Un índice por amenaza + uno combinado**: crecida de ríos grandes, anegamiento y agua en superficie, aludes (NOA/Cuyo) y salud (dengue).
- **Dos rankings**: por cantidad de personas en riesgo y por proporción del municipio en riesgo (lógica de Pareto).
- **Mapa**: gobierno local de lejos; radio censal al acercar.
- **Método híbrido** (se discutieron y descartaron las alternativas puras):
  - *Solo INFORM* (pesos iguales, media geométrica): estándar pero genérico.
  - *Todo calibrado con datos*: hay solo dos Niños con satélite completo (sobreajuste). El satélite mide agua abierta, no daño: un índice calibrado solo contra agua le quitaría peso a la vulnerabilidad social. Además sería circular (no quedaría evento para validar).
  - *Elegido*:
    - (1) **Amenaza con modelo propio**: entrenar con El Niño 2015-16, validar fuera de muestra con El Niño 2023-24 y aplicar al pronóstico 2026-27.
    - (2) **Exposición y vulnerabilidad con estructura INFORM**, transparente.
    - (3) **Análisis de sensibilidad** de pesos (Monte Carlo): qué municipios quedan en el top con cualquier combinación razonable.
    - (4) **Validación extra** con el modelo del 147 en CABA y el dengue 2023-24.

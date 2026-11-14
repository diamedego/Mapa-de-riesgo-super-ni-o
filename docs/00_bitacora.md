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

## 2026-09-29 · Modelo de amenaza de agua: resultado y más modelos

**Resultado del modelo de amenaza (validación fuera de muestra)**
- Se entrenó con El Niño 2015-16 y se evaluó con 2023-24. Variables: terreno, suelo, uso del suelo, lluvia (ERA5-Land) y caudal de ríos grandes (GloFAS).
- Resultados (Spearman / aciertos en el 10 % más afectado):
  - Línea base "agua histórica JRC": **0,64 / 50 %**
  - Gradient boosting: 0,53 / 31 %
  - Ridge: 0,47 / 40 %
  - Combinado GB + línea base: 0,63 / 46 %
- Al revés (entrenar 2023-24, evaluar 2015-16): gradient boosting 0,52 contra línea base 0,64. Usar el agua de un Niño para predecir la del otro da 0,50.
- **Conclusión**: dónde aparece el agua depende sobre todo de la geografía, que el historial de 40 años ya captura. Un modelo entrenado con un solo evento no agrega precisión. La amenaza de agua se basa en la **propensión histórica**, modulada por el pronóstico de lluvia y caudal 2026-27. Queda documentado; no se destaca en el post (decisión de la usuaria).
- Hallazgo: el patrón de lluvia pronosticado para nov-2026 → feb-2027 se parece al de El Niño 2015-16 (correlación 0,63 entre municipios), con una anomalía mediana algo mayor (+103 mm contra +84 mm).

**Nuevos datos**
- `earth_engine/lluvia_temporadas.py`: lluvia nov-feb (ERA5-Land) de 2015-16, 2022-23 y 2023-24, y la normal 1991-2020, por gobierno local. 41 municipios más chicos que la celda (~11 km) se completan con el valor de su celda.
- `ingesta/glofas_temporadas.py`: caudal medio nov-feb de GloFAS en 96 estaciones. En la mediana, 2015-16 trajo ~6 veces el caudal de la sequía 2022-23.

**Decisiones de la usuaria**
- Modelos de pronóstico propios: **dengue, ríos (nivel de alerta), anegamientos en CABA (147) e impacto agrícola**.
- Capa social (albergues, donaciones, comedores): **pospuesta**. Quedó hecho solo un filtro ampliado de OpenStreetMap (policía, puntos de encuentro, centros comunitarios, clubes, lugares de culto, Cruz Roja, Cáritas, Defensa Civil). Se descartaron `amenity=shelter` (en Argentina son paradas de colectivo techadas) y los nombres de calles y farmacias que contienen "Cruz Roja".

## 2026-09-29 · Modelo de dengue

**Datos (capa silver, `transformacion/dengue.py`)**
- 802 438 casos crudos (2018 → SE 38 de 2025). Se asignó el **96,23 %** a un departamento del INDEC; el resto viene como "999 desconocido" en el origen.
- Limpiezas: dos esquemas de columnas; 2024 publicado 3 veces (se usa la última); 2021 en dos archivos superpuestos; códigos sin cero inicial; comunas de CABA (02001 → 02007, múltiplos de 7); códigos previos al Censo 2022 (Río Grande 94007 → 94008, Ushuaia 94014 → 94015, Chascomús 06217 → 06218). Reporte en `data/silver/dengue_calidad.json`.
- Temporada epidemiológica = SE 31 → SE 30. Quedan 6 temporadas completas; 2021-22 se descarta porque no se publicó el segundo semestre de 2021.
- Casos por temporada: 2018-19 2 753 · 2019-20 46 362 · 2020-21 4 059 · 2022-23 129 079 · **2023-24 570 026** (post Niño 2023) · 2024-25 17 267.

**Clima**: `earth_engine/clima_departamentos.py` (temperatura y lluvia nov-feb, 2018-2024 + normal 1991-2020, 528 departamentos). La temporada 2023-24 fue +1,0 °C más cálida que la normal. SEAS5 por departamento: `open_meteo_estacional.py departamentos`.

**Validación (`modelos/dengue.py`)**
- Gradient boosting con clima, Censo e historia vs persistencia (máxima incidencia previa):
  - 2024-25: modelo Spearman 0,34 vs persistencia 0,45.
  - 2023-24: modelo 0,53 vs persistencia 0,74.
- **Magnitud nacional no predecible**: predijo ~2 500 casos en 2023-24 (hubo 570 229) y ~500 000 en 2024-25 (hubo 17 269). Las epidemias dependen del serotipo y de la inmunidad, que no se observan en datos públicos.
- Combinación historia + clima: con peso 25 % para el clima mejora en la temporada Niño (2023-24: Spearman 0,743 → 0,766; top 10 % 38 % → 42 %), pero no en la post-epidemia (2024-25: 0,446 → 0,428).
- **Índice final**: 75 % historia + 25 % clima (validado en el Niño análogo). Se reporta como **riesgo relativo entre departamentos, no como número de casos**.
- Departamentos de mayor riesgo relativo 2026-27: San Justo y Río Segundo (Córdoba), Chicligasta, Capital y Tafí Viejo (Tucumán), Metán (Salta), Federación (Entre Ríos), Capital (La Rioja).

**Otros**
- Se corrigió un error latente: `cobertura.py` y `amenaza_agua.py` buscaban `estacional_*.parquet` y el nuevo archivo por departamento se ordenaba último. Ahora buscan `estacional_2*`.
- GitHub Actions descarga también el pronóstico SEAS5 por departamento cada mes.

## 2026-09-29 · Foco en inundación, modelo de ríos y motor de actualización

**Decisiones de la usuaria**
- Solo riesgos de **inundación**. Dengue e impacto agrícola quedan pospuestos (el trabajo de dengue queda guardado).
- **Motor de actualización continua**: la simulación se retroalimenta con observaciones y pronósticos nuevos, y el riesgo se recalcula solo.

**Modelo de ríos (`modelos/rios.py`)**
- Curva caudal (GloFAS) → altura (INA) por estación, con regresión isotónica y el desfase de días que mejor ajusta. Entrenamiento: 2015-16 (crecida) + 2021-22 (bajante). Validación: Niño 2023-24. Datos: `ingesta/glofas_calibracion.py` (74 194 pares diarios en 94 estaciones).
- 43 de 91 estaciones validan con r ≥ 0,7 (Paraná y Uruguay: r 0,91-0,94). Pero había un **corrimiento sistemático** (error medio 1,25 m con correlación alta): la forma de la curva es correcta y está desplazada.
- **Retroalimentación**: corregir ese corrimiento con los 30 días observados antes del período evaluado bajó el error medio a **0,70 m**. La detección de días sobre el nivel de alerta subió de 720 a 963 (de 2 037); las falsas alarmas, de 224 a 424. Paso de los Libres: 96 de 98 días detectados.
- **Contraste con la realidad**: con el corrimiento de 2024, el modelo sobrestimaba la altura de hoy entre 0,5 y 1,8 m (Rosario: 4,24 m modelado contra 2,81 m medido por el INA el 28-sep). Eso inflaba las probabilidades de evacuación (~100 % en dic-ene en todo el Paraná inferior). **No se publican** esos valores. Se agregó `past_days=31` a `glofas_rios.py` para recalcular el corrimiento con los datos de este mes en cada corrida (automático en Actions).
- La probabilidad por día se obtiene interpolando entre los cuantiles del ensamble (mín, p25, mediana, p75, máx); por mes se toma la máxima diaria. Es una aproximación: pedir los 50 miembros agotaría el cupo gratuito de la API.

**Reclamos de CABA (`transformacion/reclamos_caba.py`)**
- 4 esquemas de columnas entre 2011 y 2026. Pluviales: 1 600 a 6 000 por año, 97-100 % con barrio oficial.
- 2012 y 2013 están incompletos en el portal (585 y 3 304 filas). Los reclamos cloacales cambian de registro en 2020 (probable traspaso a AySA), así que no son serie continua. "NUEZ" = Núñez (se pierde la Ñ).

## 2026-09-29 · Modelo de anegamientos en CABA (reclamos al 147)

- `modelos/anegamientos_caba.py`: GLM binomial negativo de reclamos pluviales diarios por barrio. Variables: lluvia del día, del día anterior y acumulada 3 días (log), interacción, barrio, día de la semana y régimen 2020+. Entrenamiento 2014-2022; validación 2023-2026 (incluye El Niño 2023-24).
- **Primer modelo que supera a su línea base**:
  - Correlación diaria de la ciudad: 0,44 vs −0,03 del promedio histórico.
  - En los 58 días con ≥ 20 mm: 1 165 reclamos observados; el modelo anticipa 659 y la línea base 335.
  - Ranking de barrios: Spearman 0,87.
  - Error semanal por barrio: parecido a la línea base (0,92 vs 0,94).
- Límite: subestima los días de tormenta fuerte. ERA5 (~25 km) suaviza la lluvia convectiva localizada.
- Pronóstico 2026-27 por método delta (días de lluvia históricos del mes escalados por el cociente SEAS5/normal de CABA): dic +3 %, ene +5 % de reclamos respecto de lluvia normal (p90: 225 y 251 reclamos/mes en toda la ciudad). El Niño afecta menos a CABA que al Litoral.

## 2026-09-29 · Índice de riesgo de inundación (preliminar) y motor de actualización

**Hecho**
- `transformacion/rasgos.py`: rasgos fijos por radio (66 515; 2,5 MB) y por gobierno local (2 282; 0,4 MB) en `data/referencia/`, versionados. GitHub Actions puede recalcular el riesgo sin los datos crudos pesados. Población en terreno bajo: 17,8 M; en terreno bajo y sin cloaca: 7,9 M.
- `ingesta/pronostico_corto.py`: lluvia diaria a 16 días (ECMWF IFS 0,25°) + 3 días pasados, por gobierno local. Se suma al workflow diario.
- `modelos/indice_riesgo.py`: índice INFORM mensual (oct-2026 → abr-2027).
  - Amenaza multi-componente: agua en superficie, ríos y quebradas.
  - Exposición: población en terreno bajo, en cantidad y proporción.
  - Vulnerabilidad: sin cloaca, NBI, materiales deficientes y barrios populares.
  - Riesgo = media geométrica. Sensibilidad: 1 000 simulaciones con pesos Dirichlet.
  - Cada corrida deja una foto en `data/archivo/indice/<fecha>.parquet` para la línea de tiempo.

**Resultados preliminares** (el componente de ríos todavía usa el sesgo de 2024 → probabilidades infladas; se recalcula con la corrección de este mes)
- Mes pico: feb-2027.
- Riesgo relativo más alto: Cecilio Echavarría y Goya (Corrientes), Fontana, Barranqueras y Puerto Vilelas (Chaco), Helvecia, Recreo, Villa G. Gálvez y Timbúes (Santa Fe). Robustos: están en el 10 % superior en el 92-100 % de las simulaciones.
- Más personas en riesgo: La Matanza, Rosario, Santa Fe, Lomas de Zamora, Lanús, Resistencia, Quilmes, Merlo, Avellaneda, Corrientes. Los del conurbano entran por cantidad de población, no por riesgo relativo alto: aparecen en el 10 % superior en solo 0-2 % de las simulaciones.

## 2026-09-29 (tarde) · Motor de actualización automática en marcha

**Hecho**
- `modelos/rios.py` dividido en dos partes:
  - **Calibración** (Mac): guarda las curvas en `data/referencia/rios_curvas.parquet` y las estaciones en `estaciones_ina.parquet`.
  - **Pronóstico diario** (Actions): curvas + última corrida GloFAS + alturas recientes del INA.
- GloFAS se descarga ahora con los 31 días pasados. Las 43 estaciones confiables recalculan el corrimiento con los datos de este mes. En estaciones sin desfase, el primer día coincide con lo medido (Corrientes 4,39 vs 4,29 m; Goya 4,30 vs 4,26 m).
- `modelos/verificacion.py`: compara cada pronóstico de lluvia a 16 días y cada pronóstico de altura con lo observado después. La precisión define el peso del pronóstico en el índice (`r_ajustada = 1 + w·(r − 1)`). Hasta tener ≥ 7 días verificados, w = 1 y figura como "sin verificar todavía".
- Workflow diario:
  1. pronóstico a 16 días;
  2. alturas INA;
  3. pronóstico de ríos;
  4. verificación;
  5. índice de riesgo;
  6. foto del día en `data/archivo/indice/`.
- Se sembraron los archivos iniciales en `data/archivo/` (SEAS5 del 28-sep, GloFAS del 29-sep, primer pronóstico a 16 días) para que el recálculo automático funcione desde el primer día.

**Contraste con el INA (29-sep)**
- El INA informa aguas medias en el Paraná, con tendencia estable o en descenso, y posibles aumentos en 7-15 días (sobre todo en el Uruguay y el Iguazú). No emite pronóstico estacional ni menciona El Niño.
- El escenario GloFAS da probabilidades de evacuación del 90-100 % en dic-ene en el Paraná inferior, con caudales comparables a El Niño 2015-16 (cuando Rosario superó el nivel de evacuación). Los ensambles estacionales suelen ser demasiado confiados. **Se presenta como "escenario GloFAS", aclarando que el INA no hace pronóstico estacional**, y la verificación diaria ajustará su peso.

## 2026-09-29 (noche) · Web 3D, primera versión

- `web/preparar_datos.py` genera los datos livianos:
  - municipios (3,2 MB), estaciones, barrios de CABA y resumen nacional;
  - **radios censales por provincia** (49 MB en total; Buenos Aires 13,7 MB sin comprimir). El riesgo de cada radio es cbrt(amenaza del municipio en el mes × exposición del radio [% superficie a < 2 m del cauce] × vulnerabilidad del radio [sin cloaca, NBI, materiales]).
- `web/index.html` + `app.js` + `estilos.css`:
  - MapLibre GL 5.24 + relieve AWS Terrain Tiles + mapa base OpenFreeMap.
  - Municipios en 3D (altura = riesgo por encima de 3, escalada según el zoom). Desde zoom 10 cambia a radios censales, cargados por provincia solo cuando se miran.
  - Estaciones de río (tamaño = probabilidad de evacuación, "escenario GloFAS").
  - Selector de mes con reproducción; relato con scroll en 5 capítulos, cada uno con su vista del mapa.
  - Ficha del municipio (componentes H/E/V); indicadores del mes; gráfico mes a mes (una serie, un eje, con tooltip); tabla top 20 por riesgo relativo y por personas.
  - Bilingüe ES/EN, modo claro/oscuro, links directos (`#litoral`, `?tema=oscuro`).
- Guía de visualización aplicada: una sola escala de color (azul, 7 clases ordinales), en oscuro "más riesgo = más claro"; gráfico sin área (el eje no arranca en cero); tabla como alternativa accesible; nada de arcoíris ni doble eje. **Pendiente**: correr el validador de paleta (no hay Node en la Mac).
- Correcciones al revisar capturas:
  - el mapa base mostraba "Falkland Islands": se fuerzan los nombres en español (`name:es` → "Islas Malvinas");
  - vista inicial demasiado lejana;
  - zonas en blanco explicadas en la leyenda (áreas rurales sin gobierno local);
  - la columna del conurbano tapaba todo (altura según zoom);
  - la capa de barrios de CABA se superponía (ahora solo contorno).

## 2026-09-30 · Modelo en capas en SQL (bronze → silver → gold)

- `sql/exportar_bronze.py`: aterrizaje de 12 tablas bronze (7,6 MB), sin transformar. Solo se resuelven en Python los 3 cruces geoespaciales (radio → gobierno local, RENABAP por gobierno local, estación de río más cercana), que quedan como tablas de correspondencia.
- `sql/10_silver.sql`: radios censales (Censo de formato largo a una fila por radio: % cloaca, NBI, materiales), gobiernos locales (agregados ponderados por población + satélite + RENABAP), factor de lluvia SEAS5 por mes y amenaza de ríos.
- `sql/20_gold.sql`: componentes fijos (indicadores a formato largo → percentiles con `RANK` + `CUME_DIST` por ventana → vuelta a formato ancho), índice mensual INFORM y resumen nacional.
- Los mismos archivos SQL corren en **DuckDB** (`sql/correr_duckdb.py`) y en **Databricks** (`sql/correr_databricks.py`, pendiente del login).
- **Validación**: el SQL reproduce el índice de Python en las 15 974 combinaciones municipio × mes con los **mismos rankings** y diferencias ≤ 0,00005 (redondeo de salida). En la primera prueba había diferencias de hasta 0,002: los rasgos se guardaban redondeados y eso creaba empates artificiales en los percentiles. Se quitó el redondeo de `transformacion/rasgos.py`.

## 2026-09-30 · Web: geometrías fijas + números diarios

- Separación de la web en dos partes:
  - **fijo** (`web/preparar_geometrias.py`, Mac): `municipios_geo.geojson` y `radios/<provincia>.geojson`, con exposición y vulnerabilidad del radio;
  - **diario** (`web/actualizar_datos_web.py`, GitHub Actions): `riesgo.json` (630 KB), `estaciones.geojson`, `resumen.json`.
- El navegador une ambos y calcula el riesgo de cada radio (cbrt de la amenaza del municipio × E × V). Así el repo no sube 50 MB de geometrías por día.
- El workflow diario, después del índice, actualiza los datos de la web.

## 2026-10-08 · Consumo de IA: línea base

- `consumo_ia/extraer_consumo.py` y `analizar_consumo.py`: consumo de tokens de Claude Code en el proyecto (solo metadatos). Detalle en `docs/05_consumo_ia.md`.
- 779 respuestas en 6 sesiones; USD 128 equivalentes en API (USD 904 sin caché). El 40 % se va en 17 retomas de sesiones largas después de pausas de más de 1 hora (el caché vence y se reescribe todo el contexto).
- Primera mejora: `CLAUDE.md` con el resumen del proyecto, para trabajar en sesiones nuevas y cortas sin re-explorar el repo.

## 2026-10-08 · Web: análisis por zona (estilo Power BI)

- Pedidos de la usuaria: escala de riesgo de 5 niveles con nombre (muy alto en rojo), gris para "sin datos", mapa plano por defecto (el 3D es solo el relieve; altura del riesgo opcional), línea fina gris oscuro entre niveles de riesgo, gráficos en vez de tablas, buscador con filtro por zona y gráficos por zona.
- **Buscador** (`web/datos/buscador.json`, 6 820 lugares): provincias, partidos/departamentos, municipios, localidades y barrios (Georef + BA Data), cada uno con sus gobiernos locales y su caja. Al elegir, el mapa va a la zona, atenúa el resto y todos los gráficos se recalculan.
- **Gráficos por zona** con desglose jerárquico (país → provincias → partidos/departamentos → municipios) y clic para entrar:
  - **Pareto** de personas en riesgo (barras = % de cada zona; línea = % acumulado; un solo eje en %). Hallazgo a nivel país: 7 de 24 provincias concentran el 80 % de las personas en riesgo, y Buenos Aires casi la mitad.
  - **Mapa de calor zona × mes** (riesgo ponderado por población, colores del mapa).
  - Líneas de riesgo y amenazas de la zona en un mismo eje 0-10 (sin doble eje) y ranking de municipios en barras.
- **Bordes entre niveles** (`bordes_geo.geojson`, 2,3 MB fijos): tramos compartidos entre municipios vecinos; el navegador dibuja solo los que separan niveles distintos en el mes elegido. Se descartó disolver por nivel cada día (9 MB diarios en el repo).

## 2026-10-09 · Web: calles, tres buscadores y ficha con semáforo

- **Calles al acercarse**: el riesgo pasa a relleno plano semitransparente debajo de ríos, calles y nombres del mapa base (antes, columnas 3D que tapaban todo). La altura del riesgo queda como opción. A nivel calle se ven las cuadras con el color de su radio censal.
- **Tres buscadores combinables** (pueden quedar vacíos): partido o departamento; localidad o municipio (filtrado por el partido elegido); dirección exacta (API oficial de direcciones Georef, con el partido como filtro). La dirección se marca en el mapa, se ubica en su municipio (punto en polígono) y abre la ficha de su radio censal. Links directos: `?partido=Campana&dir=Mitre 500`, `?lugar=…`, `?vista=lon,lat,zoom`.
- **Ficha = tablero de control**: números grandes con semáforo según una meta por factor (verde ≤ meta, amarillo, rojo). Índices 0-10: meta < 4,5 (alineada con los niveles del mapa), rojo ≥ 6. Población en terreno bajo y hogares sin cloaca: meta < 20 %, rojo ≥ 50 %. NBI: < 5 %, rojo ≥ 10 % (promedio nacional ≈ 6,7 %). Materiales deficientes: < 10 %, rojo ≥ 25 %. Para una zona, valores ponderados por población.
- Corrección: al cargar, el relato movía el mapa a la vista del país y pisaba búsquedas y links. Ahora solo lo mueve cuando la persona scrollea el relato.
- La versión privada de claude.ai no puede mostrar calles ni buscar direcciones (bloquea servicios externos); la versión completa sí (Mac / GitHub Pages).

## 2026-10-13 — Búsqueda por dirección sin servicios externos (callejero propio)
- **Problema**: dentro de claude.ai (vista privada desde el celular) el navegador no puede llamar a la API Georef, así que la búsqueda por dirección fallaba.
- **Solución**: callejero propio a partir de las **2 076 269 cuadras del INDEC** (descargadas de Georef, 1,1 GB). `web/preparar_callejero.py` guarda solo calle normalizada, numeración (desde-hasta) y extremos de cada cuadra, agrupado por departamento en 7 archivos (38 MB en total); el celular descarga solo el del partido elegido. La web primero intenta Georef y, si no responde, usa el callejero y ubica el número interpolando dentro de la cuadra.
- **Limitación del dato**: solo **677 608 cuadras (33 %) traen numeración** en el INDEC. Las 96 552 calles sin numeración se guardan con un punto central: la búsqueda encuentra la calle y avisa que la ubicación es aproximada.
- **Prueba** (con Georef bloqueado a propósito): Zárate "Justa Lima 700", Campana "Av Rocca 500", Comuna 14 "Santa Fe 3200" → ubicación correcta y ficha del radio censal abierta.

## 2026-10-13 — Versión para celular
- **Pedido**: en el celular la ficha de la dirección tapaba todo el mapa. Causa: una regla de estilo posterior pisaba la de pantallas chicas.
- **Cambios (≤ 760 px)**: ficha como panel inferior que arranca compacto (solo el riesgo y su semáforo) y se despliega con "Ver detalle" en una grilla de 3 columnas; la historia del mapa se oculta mientras hay ficha abierta; leyenda mínima arriba; KPIs en carrusel; partido y localidad lado a lado; meses en una fila deslizable; al buscar se cierra el teclado y la página baja sola hasta el mapa; mapa de calor ajustado al ancho. Misma web, mismo formato: solo cambia la disposición.
- **Prueba**: capturas a 390 px de ancho (Zárate y Palermo), ficha compacta y desplegada.

## 2026-10-13 — Calles, ríos y nombres propios en la versión de claude.ai; ficha que se abre completa
- **Pedido**: en claude.ai no se veían calles ni ríos (el mapa base viene de un servidor externo que ese entorno bloquea) y la ficha del celular arrancaba cerrada.
- **Mapa base propio** (`web/preparar_mapa_base.py`, solo para esa versión): calles de las 2 076 269 cuadras del INDEC unidas por calle y agrupadas por cercanía (curva Z) en 24 archivos de ~1,2 MB; agua de OpenStreetMap (`ingesta/osm_agua.py`: 3 513 superficies de río, lagunas ≥ 2 ha o con nombre, ríos, canales y arroyos con nombre) en celdas de 3°. Coordenadas como enteros en diferencias: 64 MB en total. El navegador carga solo lo que se ve (agua desde zoom 6,5, calles desde 11,5) y dibuja los nombres con glifos propios (Noto Sans). El IGN no tiene los ríos anchos (Paraná) como superficie: por eso OSM.
- **Ficha**: se abre con todo el detalle (en el celular se puede achicar con "Ver menos"); el punto buscado se corre para no quedar debajo de la ficha.
- **Errores corregidos**: (1) las direcciones caen sobre la calle, que es el borde entre radios simplificados: si el punto no queda adentro de ninguno se toma el radio más cercano del mismo municipio; (2) carrera entre dos cargas de radios: la segunda buscaba antes de que llegaran los datos; ahora ambas esperan la misma descarga.
- **Prueba**: Chrome controlado en tiempo real (protocolo DevTools) con Georef y teselas bloqueados: Los Polvorines "dardo rocha 3732" y Zárate-Campana (Paraná de las Palmas con nombre). El modo de tiempo simulado de Chrome no sirve para esta versión (el mapa nunca termina de cargar).

## 2026-10-14 — Buscador más inteligente, meses en desplegables, botón Borrar filtros
- **Meses y años** como dos desplegables (ocupan una fila corta); al cambiar de año se mantiene el mismo mes si existe, si no el primero disponible.
- **Borrar filtros**: botón chico que aparece apenas hay algo escrito o una zona elegida y limpia partido, localidad, dirección, marca y ficha.
- **Entiende lo escrito**: al buscar, lo que está en partido o localidad sin elegir de la lista se interpreta solo (coincidencia exacta primero: "campana" → Campana); si no existe se avisa.
- **Dirección con lugar**: "Mitre 500, Campana" separa la calle de la localidad o partido y completa el filtro. Si se busca una dirección sin lugar, al elegirlo después (Enter en la lista) la dirección se busca sola, sin volver a tocarla.
- **Prueba** con Chrome real (computadora y 390 px): los tres recorridos y el cambio de año.

## 2026-10-14 — Simulación mes a mes y gráfico de evolución de la selección
- **Simular 6 meses**: botón con texto (▶ / ❚❚ / ↻) que arranca en el mes actual (oct 26) y avanza un mes cada 2 s hasta abr 27 y se detiene; cartel con el mes y barra de progreso sobre el mapa, cambio de color con mezcla de 0,9 s, y la ficha, el gráfico y los rankings se actualizan en vivo.
- **Gráfico de evolución** ahora justo debajo del mapa: riesgo total de la selección (línea gruesa) y cada amenaza (agua en superficie, crecida de ríos, quebradas), más el total del país como línea punteada de referencia. Con una dirección exacta, la línea de riesgo es la de su radio censal ("Riesgo en la dirección").
- Corregido: al cambiar de mes con una dirección elegida la ficha volvía a la del municipio; ahora conserva la del radio.

## 2026-10-14 — Capas del tiempo (lluvia, viento, temperatura) separadas del riesgo
- **Pedido**: ver vientos, lluvias y más en el mapa, con un filtro propio para no mezclarlos con el riesgo.
- **Datos**: `ingesta/tiempo_grilla.py` baja de Open-Meteo (gratis) lluvia, viento máximo, ráfagas, dirección y temperatura máxima a 16 días en una grilla de 1° (458 puntos alrededor del país, 261 KB → `web/datos/tiempo.json`). Corre todos los días en Actions con el pronóstico corto. Puntos de la grilla guardados en `data/referencia/grilla_tiempo_puntos.json` (Actions no tiene los límites originales).
- **Mapa** (`web/tiempo.js`): selector Riesgo | Lluvia | Viento | Temperatura; al elegir una capa del tiempo se apaga el riesgo. Se dibuja como imagen suave (interpolación bilineal en proyección Mercator), el viento además con flechas (dirección y tamaño por velocidad). Línea de 16 días con play, lluvia acumulada opcional, leyenda con escala y cuadro al tocar con los valores del lugar. Mismo código en la versión de claude.ai.
- **Límite**: la grilla de 1° (~100 km) muestra patrones regionales, no el detalle de una ciudad.

## 2026-10-15 — Capas del tiempo: dibujo directo en lienzo
- **Problema**: en la versión de claude.ai las capas del tiempo no actualizaban los colores. Hipótesis: ese entorno restringido bloquea las imágenes generadas en memoria (`data:`) que usaba la capa. En el navegador de prueba sí funcionaba.
- **Cambio**: la capa pasa a una fuente `canvas` de MapLibre (se dibuja directo, sin URL de imagen) con extensión fija de la grilla; se sube a la GPU unos cuadros al cambiar de día y se pausa. Verificado que al mover el día la imagen cambia. **No verificado dentro de claude.ai** (la extensión de Chrome no estaba conectada).

## 2026-11-05 — Rediseño completo de la web: "sala de situación"
- **Pedido**: dirección exacta que lleve al punto con un círculo de X km y análisis de ese círculo (también al tocar el mapa); zonas resaltadas por el borde en cian; tablero llamativo y profesional con resumen de la situación y acción recomendada; más indicadores arriba; buscador en un renglón con provincia y autocompletado tipo GPS; "condiciones actuales" y "futuras" con rango; riesgo en grande y las otras capas en chico, intercambiables; lluvia, viento y temperatura mucho mejor dibujados; tipos de viento; un tablero distinto por capa.
- **Estructura nueva de la web** (módulos sin librerías extra): `textos.js` (ES/EN), `utiles.js`, `graficos.js` (barras, líneas con cursor, rangos, rosa de vientos, brújula, medidor, ranking, mapa de calor), `tiempo.js` (campos del tiempo, partículas de viento, miniaturas), `mapa.js`, `buscador.js`, `tableros.js` (un tablero por capa + análisis por zonas), `app.js` (estado, indicadores, modo, línea de tiempo, recorrido guiado).
- **Datos nuevos**: grilla del tiempo cada 0,5° (1 377 puntos) con 16 días y 48 h cada 3 h, en binario base64 (465 KB), dos veces por día en su propio horario de Actions (cupo gratuito por hora de Open-Meteo); alertas vigentes del SMN (`web/exportar_alertas.py`, cada 3 h); estado actual de los ríos con la última altura del INA, cambio en 24 h y nivel (normal/alerta/evacuación), sin series de otra referencia (Federación) ni estaciones duplicadas de otra red; centro poblado de cada municipio (`web/preparar_centros.py`) para leer el tiempo donde vive la gente (Luján de Cuyo pasaba a medirse en la cordillera).
- **Hallazgo de hoy**: el Paraná está en evacuación en 7 estaciones (Corrientes 7,02 m con evacuación en 7,00 m) y en alerta en 4.
- **Mapa**: lluvia en franjas tipo radar, viento con partículas animadas y temperatura continua, recortados al contorno del país con interpolación bicúbica (34 ms por cuadro); valores en 33 ciudades; velo sobre el mapa base para que resalten los colores. Selección en cian con halo: bordes exteriores de la zona (filtro sobre los bordes entre municipios) o círculo de 1 a 20 km.
- **Tableros**: riesgo del círculo con radios censales (población, terreno bajo, cloacas, población por nivel, componentes, evolución, ríos cercanos); lluvia (acumulado, días, próximas 48 h, ranking); viento (brújula, Beaufort, rosa de vientos, Sudestada/Pampero/Zonda/norte/patagónico); temperatura (mínimas y máximas, ola de calor, heladas). Cada uno con situación y acciones (orientativas, no oficiales).
- **Prueba**: Chrome real, 24 combinaciones de capa × modo × selección sin errores, en computadora y 390 px, claro y oscuro, español e inglés, versión completa y versión para claude.ai.

## 2026-11-05 — Sitio público en Cloudflare
- **Sitio**: https://mapa-de-riesgo-super-nino.diamedego.workers.dev (Cloudflare Workers con archivos estáticos, plan gratis, tráfico sin límite). Se publica solo con cada push, incluidas las actualizaciones automáticas de datos. `wrangler.jsonc` publica `web/`; `web/.assetsignore` deja afuera los scripts .py. Se eligió Cloudflare y no Vercel porque el plan gratis de Vercel tiene 100 GB de tráfico por mes (cada visita baja 6-10 MB).
- **Error corregido en la búsqueda de direcciones**: el servicio oficial devolvía la misma calle en otro pueblo (Rivadavia 400 en Tres Algarrobos al buscar en Campana). Ahora se le pasa el partido y solo se acepta un resultado dentro de la zona elegida.
- La versión de claude.ai tiene un botón "Versión completa" que abre el sitio público.

## 2026-11-06 — Simulador de lluvia en 3D (llenado de bajos con relieve real)
- **Pedido**: una pantalla nueva con solo el punto/círculo elegido, el relieve real (sin exagerar) y una barra de milímetros que vaya llenando de agua los bajos.
- **Cómo funciona** (`web/simulador.js`): relieve SRTM ~30 m (AWS Terrain Tiles, hasta 5 × 5 teselas), suavizado 5 × 5 porque incluye edificios y árboles; ríos y lagunas del mapa base (y 30 m de orilla) quedan fuera; altura de cada lugar sobre el bajo más cercano (500 m y 2,5 km); de la lluvia se restan 10 mm de infiltración y escurre el 50 %; el volumen llena primero lo más bajo con un tope de 1,5 m por bajo (el resto desborda). Nivel por búsqueda binaria sobre sumas acumuladas (instantáneo). Personas: población de cada radio × fracción de su superficie con 10 cm o más.
- **Iteraciones**: la primera versión mandaba toda el agua al río Paraná (lo más bajo) → se excluyen ríos y lagunas; después aparecían "pozos" de 8 m (ruido del relieve en orillas) → orilla excluida y tope de profundidad.
- **Resultados de prueba** (círculo de 2 km): La Plata, 392 mm (como en 2013) → ~16 % del área con agua, concentrada en la franja baja del centro-oeste; Corrientes, 150 mm → ~7,5 %.
- Solo en la versión completa (el relieve viene de un servidor externo); en claude.ai el botón explica y enlaza al sitio público.

## 2026-11-06 — Simulador v2 y relieve en el mapa principal
- Simulador: filtros (Todos, Colores por altura, Curvas cada 2 m, Drenaje, Corte) y Relieve ×5 opcional (escala real por defecto).
  - Colores por altura entre los percentiles 2 y 98 del círculo; curvas cada 2 m sobre el relieve suavizado.
  - Drenaje: dirección D8 sobre el relieve suavizado ~200 m; cauces que juntan ~10 ha o más, línea celeste muy clara con borde oscuro.
  - Corte oeste-este del terreno con el agua (tocando el mapa se elige otra latitud) y altura al pasar el cursor o tocar.
  - En celular, filtros y corte quedan en el panel debajo del mapa.
- Mapa principal: botón "Relieve" (apagado por defecto). Sombreado, colores por altura ajustados a la zona visible y curvas de nivel
  desde zoom 11 (maplibre-contour 0.1.0). Con el relieve prendido, el riesgo se dibuja con la mitad de opacidad. Solo en la versión completa.
- Capturas: docs/img/diseno/simulador_v2_*.png y mapa_relieve.png.

## 2026-11-08 — Mails de error de GitHub y maqueta 3D con lluvia animada
- **Mails "Run failed … No jobs were run"**: desde el 5-nov el archivo `.github/workflows/actualizar_datos.yml` era inválido
  (el nombre de un paso tenía "temperatura: 48 h" y los dos puntos rompen el YAML). No corría ninguna actualización automática
  y GitHub mandaba un mail por cada push. Corregido y validado con PyYAML. También se corrigió `web/exportar_alertas.py`
  (polígonos de avisos del SMN con huecos fuera del borde: `make_valid` + redondeo punto a punto).
- **Simulador, vista "Maqueta 3D"** (botón Mapa / Maqueta 3D, aprobado tras el reel de CutSheetRX):
  - El círculo recortado como maqueta, con paredes de tierra, imagen satelital Sentinel-2 sin nubes 2023 (EOX, ~10 m)
    y cámara que gira (arrastrar) y acerca (rueda o pellizco). Escala real por defecto; Relieve ×5 opcional.
  - ▶ o los botones de lluvia hacen llover ~7 s y escurrir ~5 s: el terreno se moja, líneas blancas bajan siguiendo la
    pendiente y se juntan donde se descarga el agua, y los bajos se llenan.
  - Las líneas y la película de agua salen de un modelo de escurrimiento ("caños virtuales") sobre el relieve suavizado
    ~120 m; los bajos llenos y las cifras salen del mismo cálculo de llenado del mapa, así todo coincide.
  - Descartados (no volver a proponer): colores fuertes rojo→azul y flechas.
  - Límite: el relieve nacional gratis es de ~30 m; de cerca (una manzana) no se ve el detalle del reel, que usa LiDAR de 1 m.
- Confirmado el 9-nov: con el workflow corregido volvieron las corridas automáticas (grilla del tiempo 23:48 UTC del 8-nov,
  alertas SMN 00:56 UTC del 9-nov, esta última ya con `alertas.geojson` actualizado). GitHub atrasó la primera ~3,5 h.
- 9-nov, fallas reportadas desde el celular:
  - **Los links con `?punto=` y toda selección de un punto se rompían**: el arreglo de alertas (`make_valid`) dejó 4 avisos como
    GeometryCollection y `cajaDe` fallaba ("pols is not iterable"). Ahora `exportar_alertas.py` conserva solo polígonos y `cajaDe`
    ignora tipos raros. Lección: probar el sitio con los datos nuevos después de tocar un exportador.
  - El botón "Simular lluvia en 3D" solo aparecía con un punto elegido: ahora siempre está (con una localidad usa su centro; con
    el país o una provincia pide elegir un punto). Relieve ×5 también sobre el mapa del simulador. Los links esperan a que las
    capas del mapa existan (antes dependían del evento "load" y en el celular a veces no hacían nada).
- 9-nov, buscador "inteligente" (pedido: pegar direcciones de Google Maps):
  - Entiende texto pegado en cualquier campo: direcciones completas con código postal y "Provincia de …"
    (ej.: "Ruta Nacional 9, Colectora Sur Km 87.5, B2800 Zárate, Provincia de Buenos Aires"), coordenadas decimales con o sin
    signo, en grados/minutos/segundos y links de Google Maps (@lat,lon o !3d…!4d…). Coordenadas fuera del país: aviso.
  - Orden de búsqueda: Georef (primero filtrando por la localidad) → OpenStreetMap/Nominatim (rutas, colectoras; variantes sin
    "Km" ni "Colectora"; máx. 1 consulta por segundo; el resultado tiene que ser de la misma localidad) → callejero propio del
    INDEC → si no aparece la calle, se muestra la localidad con un aviso. Probado con 13 casos.
- 9-nov, buscador libre y referencias en el mapa:
  - Campo "Buscar" con sugerencias mientras se escribe, como Google Maps: coordenadas, localidades y partidos propios, calles del
    callejero y Photon (Komoot, gratis, sobre OpenStreetMap: empresas y plantas, clubes, hospitales, escuelas, comercios, calles),
    filtrado a la Argentina y sesgado a la zona elegida. Al apretar Buscar, si no hay dirección exacta, va al mejor resultado y
    ofrece las otras opciones ("¿Era otro?").
  - Referencias en el mapa (interruptor en la leyenda): nombres de los 2 282 municipios de lejos, 5 194 plantas y parques
    industriales con nombre (Overpass, `web/preparar_referencias.py`) y, del mapa base, hospitales, universidades, estadios,
    municipalidades, estaciones, clubes, escuelas y empresas desde z 12-13,5 (el mapa base los muestra recién en z 15).
- 9-nov, simulador (pedidos desde el celular):
  - Calidad con radios chicos: el relieve se baja con zoom adaptativo (radio 1 km: z 15, ~4 m por píxel; antes siempre z 13,
    ~16 m), con suavizado y orilla de ríos definidos en metros: líneas de drenaje y curvas finas, igual que con 5 km.
  - Período de lluvia pronosticada (desde/hasta y botones de 3 días a 3 meses): los primeros 16 días salen del pronóstico
    diario del punto; más allá, del estacional SEAS5 del municipio (`web/datos/lluvia_estacional.json`, lo escribe
    `actualizar_datos_web.py`). Se simula como si toda la lluvia cayera junta (escenario más desfavorable), y se aclara.
  - "Ver el corte en 3D": en Mapa, la cámara se pone de frente a la línea del corte; en la Maqueta, además, se corta el
    terreno por esa línea y se ve la tajada con suelo y agua.
  - Imagen satelital: mosaico Sentinel-2 sin nubes 2025 de EOX (el de 2026 todavía no existe), hasta z 15.

## 2026-11-10 — Simulador: modelo hidráulico 2D (etapa 1)
- Respaldo previo: tag `respaldo-2026-11-10`. Plan completo del pedido en `docs/02_plan_cambios_nov.md`.
- `web/hidraulica.js` (Web Worker): aproximación inercial local de aguas poco profundas (Bates 2010; familia LISFLOOD-FP /
  HEC-RAS 2D onda difusa), paso adaptativo, Manning por cobertura, infiltración Green-Ampt con humedad que evoluciona,
  desagües supuestos (10 mm/h en superficies impermeables), evaporación (ET0), lagunas como almacenamiento con nivel propio,
  ríos con nivel fijo + crecida ajustable, salida libre en los bordes; horas secas sin mover el agua (períodos largos viables).
- `web/modelo_inundacion.js`: lluvia horaria de Open-Meteo (14 días de análisis = dato real; 16 días de pronóstico) y, más
  allá, escenario estacional SEAS5 repartido en días de lluvia típicos (21 años de archivo Open-Meteo); grilla de 20 a 60 m;
  arroyos y canales grabados en el terreno; impermeable y rugosidad desde el mapa base; personas por celda (radios censales).
- Validación numérica (`herramientas/pruebas/`): cuenco → balance de agua exacto y nivel final 49,6 cm vs 49,8 cm teórico;
  ladera con lluvia constante → profundidad 93-95 % de la solución de Manning. Casos reales con balance 0,00 %:
  La Plata 21 días en 12 s; Corrientes 3 meses (2 496 h) en 101 s; lagunas de Corrientes suben 20-32 cm con 150 mm.
- Interfaz: línea de tiempo con dato real / pronóstico / escenario, hitos (hoy, fin del pronóstico, más agua), ▶ por horas,
  maqueta con líneas que siguen la pendiente del agua del modelo, nivel del río, tormentas de prueba, supuestos visibles.
- Pendiente de esta etapa: terreno FABDEM en las 20 ciudades (descargando), mapa nacional de suelos (SoilGrids),
  validación contra inundaciones reales (satélite 2015-16 / 2023-24, La Plata 2013), cámara que no se reinicia al cambiar de vista.
- 10-nov (cont.): suelo real por lugar — mapa nacional de textura (SoilGrids 2.0, arcilla y arena 0-30 cm, ~2 km, clases USDA,
  Green-Ampt de Rawls 1983; `web/preparar_suelos.py`, 134 KB). Terreno FABDEM en las ciudades prioritarias
  (`web/preparar_terreno_fabdem.py`, bloques de 0,25°; primer archivo procesado: Gran Buenos Aires, La Plata, Mar del Plata).
  La cámara se conserva al pasar de Mapa a Maqueta y viceversa (punto 16).
- 10-nov (noche): terreno FABDEM completo en las 20 ciudades prioritarias: 121 bloques de 0,25° (89 MB). Dos archivos de
  Bristol se cortaban; para Santiago del Estero se bajó solo la hoja necesaria (S28W065, 17 MB) leyendo el zip remoto por
  rangos HTTP. Los 6,3 GB originales se borraron después de recortar (pedido de la usuaria); queda `data/raw/fabdem/license.txt`.

## 2026-11-11 — Tanda 4: "Situación" en viñetas, tortas y "Qué hacer" según el lugar (punto 11f)
- Panel izquierdo, capa de riesgo: título "Situación en {lugar}" con la fuente en chico debajo y viñetas **Situación** (nivel,
  comparación con el resto de los municipios o con el promedio del municipio, amenaza que domina), **Ahora** (ríos del INA y alertas
  del SMN), **Período** (cuántos meses llegan a riesgo alto), **Peor mes**, **Motivo** (por qué no se absorbe el agua: terreno bajo,
  pendiente, textura del suelo, superficie construida, cloacas, humedales), **Antecedentes** (agua extra vista por satélite en los
  Niño 2015-16 y 2023-24 frente a la sequía 2022-23; agua alguna vez 1984-2021) y **Población** con tres tortas: por nivel de riesgo,
  con y sin cloaca, terreno bajo y alto (con la cantidad de personas en chico).
- "Qué hacer" separado en **Prevención (antes)** y **Emergencia (durante y después)**: cada recomendación sale de un dato del lugar
  (lluvia fuerte de los próximos 7 días, río en alerta, escenario GloFAS, quebradas, % en terreno bajo, % sin cloaca, antecedentes de
  El Niño, centros de salud y servicios en terreno bajo, barrios populares, superficie construida) y se muestran las 4 más
  prioritarias de cada lista. Con un río en evacuación o alerta naranja/roja, la emergencia va primero. Teléfonos al pie.
- Se sacó el gráfico de evolución mensual; las notas de fuente pasaron debajo de los títulos; "Orientativo…" más chico, a la derecha.
- Datos nuevos en la web (`web/preparar_geometrias.py`): municipios con superficie, barrios populares, % urbano, arcilla, pendiente,
  humedales, agua alguna vez y agua extra en los Niño; radios censales con NBI, agua alguna vez y pendiente (+2 MB en total).
  Barrios populares e infraestructura crítica se bajan solo cuando se elige un punto, sin demorar el tablero.
- Probado sin imágenes (`herramientas/pruebas/tanda4.js`): país, Santa Fe, un punto en La Plata, inglés y lluvia; celular sin desbordes.

## 2026-11-11 — Tanda 5: análisis debajo del mapa con filtros tipo Power BI (puntos 17 y 20)
- Se sacaron las tablas (mapa de calor con números y la tabla oculta): todo en gráficos, 3 por fila en escritorio (2 en pantallas
  medianas, 1 en el celular).
- Riesgo: ¿dónde se concentra la gente en riesgo? (Pareto), municipios prioritarios (por nivel o por personas) y ¿qué explica el
  riesgo? (amenaza, exposición y vulnerabilidad de la selección frente a su provincia y al país).
- Lluvia, viento y temperatura: dónde llueve/sopla/hace más calor, "día por día" en paneles chicos con la misma escala (con una zona
  elegida: ella, su provincia y el país) y ¿cuánta gente tendrá lluvia fuerte / ráfagas fuertes / calor extremo? por día.
- Los gráficos siguen el filtro: sin selección, provincias; con una provincia, sus partidos o municipios; con un municipio o un punto,
  los municipios de su provincia con el elegido resaltado (si no está entre los primeros, aparece al final con su puesto). Tocar una
  zona la elige y completa los casilleros de arriba; tocar un día lo elige como período. Un punto fuera de la zona elegida pasa a ser
  el filtro de todo.
- Filtros activos como etiquetas con ✕ arriba del análisis y "Borrar filtros" global (lugar, búsqueda y período); los casilleros con
  filtro se marcan con el color de acento.
- Situación (tanda 4, ajuste): explica de qué se compone el riesgo (amenaza × exposición × vulnerabilidad, con los números del índice)
  y el motivo empieza por la amenaza que domina.
- Probado sin imágenes (`herramientas/pruebas/tanda5.js`): país, Campana, clic en el Pareto, lluvia, clic en un día, borrar filtros,
  Córdoba, punto fuera de la zona; celular sin desbordes.

## 2026-11-11 — Tanda 6: encabezado, fuentes por tipo de dato y recorrido guiado (puntos 1 y 2)
- Encabezado: la bajada explica qué es el tablero y qué se puede hacer; debajo, la situación del país en el mes en curso (riesgo,
  personas en riesgo alto o muy alto, estaciones de río en evacuación y alerta, alertas del SMN con su nivel máximo, mes pico), las
  5 zonas de mayor riesgo (botones que filtran) y la última actualización de cada fuente (riesgo, tiempo, alertas, INA, GloFAS, SEAS5).
- "Ver fuentes de datos por tipo": ventana con 20 fuentes en 7 grupos (tiempo y alertas, ríos, terreno y suelo, agua del pasado,
  población, infraestructura y mapa, cálculos propios). Cada una dice qué aporta, de dónde sale (enlace), cada cuánto se actualiza,
  la última fecha y el tipo de dato: observado, pronóstico, histórico, estimación propia, simulación o referencia. Se abre también
  con el enlace `#fuentes` y desde el pie.
- Recorrido guiado nuevo (`web/guia.js`): 13 pasos que explican cómo usar la app (encabezado, indicadores, buscador, condiciones,
  simulador, mapas, capas, mapa, leyenda, miniaturas, panel, análisis y fuentes). Cada paso lleva la pantalla a esa parte, la
  resalta y pone el cartel al costado sin taparla (en el celular, abajo). Se maneja con los botones o con las flechas y Esc.
  Reemplaza al recorrido anterior, que resumía la situación del país.
- Probado sin imágenes (`herramientas/pruebas/tanda6.js`): encabezado, fuentes, clic en una zona, los 13 pasos en escritorio y
  celular, inglés y Esc.

## 2026-11-11 — Tanda 7: revisión punto por punto del pedido del 10-nov y simulador para decidir (puntos 8, 11c, 19, 21-24)
- Revisión de los 28 puntos: faltaban 19, 21, 22, 23 (en el simulador), 24 y 11c, y el período seguía repetido fuera de la fila de
  condiciones (miniaturas, análisis, situación de lluvia): corregido (ahora solo hay fechas de actualización de datos).
- Simulador: calles y rutas de OpenStreetMap en la grilla del modelo (los puentes siguen pasables). Por hora: km de calles con 30 cm
  de agua o más (en rojo en el mapa, con su capa), personas aisladas (en seco llegaban por calle a la salida del área y con agua no;
  búsqueda por la red de calles transitables, 0,6 ms) y centros de salud sin acceso (con agua o con sus calles cortadas).
- Confianza alta/media/baja de cada hora: la menor entre la lluvia (dato real o pronóstico < 3 días: alta; 3-7 días: media; más
  lejos o escenario: baja), el relieve (FABDEM: alta; satelital: media) y el modelo (media hasta compararlo con inundaciones reales).
- Aviso visible de validez (probado con casos teóricos, todavía sin comparar con inundaciones reales), antecedentes de la zona
  (agua extra en los Niño 2015-16 y 2023-24, agua alguna vez 1984-2021, y el peor momento de la corrida, como referencia y no como
  validación) y uso del suelo del círculo (impermeable, con tierra o vegetación, agua).
- Con un municipio o una localidad elegida, el simulador cubre toda la zona (círculo desde su centro, hasta 20 km).
- Probado sin imágenes (`herramientas/pruebas/tanda7.js`, La Plata con tormenta de prueba): en seco 0 aislados y 0 calles cortadas.

## 2026-11-11 — Tanda 8: validación del simulador contra inundaciones reales (punto 19) y método en cada indicador (18)
- `herramientas/validacion/`: el mismo modelo del sitio repite El Niño 2015-16 y 2023-24 y la sequía 2022-23 (noviembre a abril) en
  las 20 ciudades con FABDEM, con la lluvia real hora por hora (Open-Meteo, ERA5) y la altura real del río (INA, estación a menos de
  15 km, nuevo: el modelo acepta el nivel del río hora por hora). Se compara celda por celda con el agua que vio Dynamic World.
- Resultado: en los 9 casos con agua observada suficiente, CSI 0,20 contra 0,35 de la referencia «donde ya hubo agua» (le gana en
  4 de 9); correlación de la superficie con agua entre ciudades 0,52. Bien en Corrientes (0,69 y 0,50) y Santa Fe 2015-16; falla en
  Santa Fe 2023-24, Formosa 2015-16 (se pasa) y el delta de Tigre. En el conurbano el satélite casi no ve agua: no se puede validar.
- El simulador muestra la validación con un gráfico por ciudad y la conclusión «orientativo»; la confianza del modelo depende del
  resultado de cada ciudad. Detalle en `docs/04_validacion_simulador.md`.
- Indicadores de arriba con método, fuente y tipo de dato al pasar el mouse (punto 18).

## 2026-11-11 — Tanda 9: mejora del modelo con la validación
- El río se ata al nivel de evacuación del INA (en evacuación cubre el 40 % más bajo de las orillas) y las lagunas conectadas al
  río suben con él. Se probaron los cuantiles 10, 25 y 40 % (riesgo de sobreajuste: documentado).
- Validación: CSI mediano 0,20 → 0,36 (referencia «donde ya hubo agua» 0,35), le gana en 5 de 9; Santa Fe 2015-16 simula 12,7 % del
  círculo con agua contra 13,2 % observado; Corrientes 1,95 % contra 1,91 %. Sigue corto en Santa Fe 2023-24 y Tigre.
- El simulador del sitio arranca con la altura de hoy de la estación del INA más cercana (antes, nivel fijo de la imagen satelital).

## 2026-11-11 — Ajustes del encabezado y los filtros
- Título y bajada nuevos; «Datos actualizados» pasó al final de la página.
- «Zonas de mayor riesgo» como indicador de barras en el encabezado: país → municipios; provincia o partido → sus municipios;
  municipio → sus radios censales; punto en el mapa → no se muestra. Se actualiza con los filtros y el período.
- Gráfico de riesgo semana a semana de la zona elegida (promedio ponderado por población), con `web/datos/riesgo_semanal.json`
  (última foto diaria del índice de cada semana, generado por `actualizar_datos_web.py` y subido por el workflow).
- Radio como barra (0,5 a 20 km) en la fila de filtros.
- «Líneas de relieve» solo dibuja líneas con su altura: ya no pinta colores, sombreado ni baja la opacidad del riesgo.

## 2026-11-11 — Capas en dos grupos, curvas de nivel adaptativas y ajustes
- Capas: «Mapa · elegí uno» (riesgo, lluvia, viento, temperatura; botón redondo) y «Sumá capas · podés elegir varias» (Hidrografía,
  Alertas, Zonas que ya se inundaron, Densidad, Barrios, Suelo, Infraestructura, Rutas; casilleros) en la misma fila; Referencias y
  Líneas de relieve quedan en la fila chica. 3D eliminado. Con una capa de superficie encendida el riesgo se atenúa al 45 %.
- Curvas de nivel: la separación se elige según el relieve que se ve (unas 8 líneas de punta a punta, de 1 m a 1 000 m), medido con
  el terreno a escala 1 %; cada 5.ª línea es principal y lleva su altura, repetida cada ~400 px.
- Clic en una estación de río: va al punto como en el resto del mapa. Sin cartel de alertas al pasar el mouse; el cartel se esconde
  al tocar, arrastrar o hacer zoom.
- Riesgo semana a semana en barras con el color de cada nivel. Línea de tiempo del panel y gráfico del simulador con marcas por semana.

## 2026-11-12 — Simulador: vuelve la barra de lluvia a simular
- El simulador nuevo solo mostraba la lluvia real y pronosticada: sin lluvia fuerte no había agua en celeste y parecía no hacer nada.
- Vuelve la barra «Lluvia a simular» (0 a 300 mm) con la duración (1, 3, 6, 12 o 24 h): se suma a la real y la pronosticada y recalcula
  con el modelo hidráulico; al terminar muestra la hora con más agua (celeste). 100 mm en La Plata/Corrientes: 3 h → 11,8 % del
  círculo con agua, 1 h → 22,6 %, 24 h → casi nada (se infiltra y desagua).
- El rediseño tipográfico y del panel (Libre Franklin, Archivo Narrow, secciones) no se aprobó: queda guardado en `git stash`
  («rediseno-12nov-no-aprobado»).

## 2026-11-12 — Maqueta 3D: diagnóstico y respaldos
- La maqueta se dibuja bien en mis pruebas (claro, oscuro y celular, con pixeles leídos del canvas), pero no en el navegador de la
  usuaria. Se agregó: enlace «Diagnóstico» (navegador, WebGL, three.js, teselas satelitales, errores) con botón copiar, cuatro
  intentos de WebGL de más a menos exigente, CDN de respaldo para three.js (cdnjs), tiempo límite de 15 s por tesela satelital,
  verificación de que el centro no salga vacío y, si falla, mensaje con el motivo y vuelta al mapa 2D con el agua en celeste.

## 2026-11-12 — Simulador: solo maqueta 3D y tormenta en cámara lenta
- Se sacaron el selector Mapa/Maqueta y «Relieve ×5»; el simulador abre directo en 3D (el mapa 2D queda como respaldo si falla WebGL).
  Capas del simulador: «Calles cortadas» (ahora también en rojo sobre la maqueta) y «Corte».
- El agua se dibuja desde 2 cm, en celeste (antes desde 10 cm: solo se veían las lagunas); las estadísticas siguen contando desde 10 cm.
- ▶ reproduce la tormenta en cámara lenta: antes pasaba toda en ~1 s (12 h/s). Ahora cada hora con lluvia o agua corriendo dura 0,6 s con
  fotogramas mezclados (0,18 s si el agua ya casi se fue) y las secas pasan de golpe; cartel «Lloviendo X mm/h · Y mm en total»,
  «Escurriendo…» o «Seco». Las líneas blancas (hacia dónde baja el agua) nacen desde 1 mm de lámina (antes 3 mm).
- Comparado con el respaldo del 10-nov (relleno de bajos por relieve): el modelo actual calcula el flujo, la infiltración y el
  desagüe, así que el agua forma láminas en los bajos y calles en lugar de charcos redondos.

## 2026-11-12 — Simulador: controles de reproducción y gráfico con ejes
- Panel en este orden: fecha y confianza → ⏮ «Empezar de cero», ▶ y barra de horas → velocidad (×0,5, ×1, ×2, ×4, se puede cambiar en
  pleno juego) → gráfico de lluvia y % con agua → corte del terreno y mapa topográfico → «Lluvia a simular» (mm y duración, debajo del
  mapa topográfico) → capas → resultados.
- El gráfico tiene dos paneles con sus ejes (mm por día y % del círculo con agua): las barras nacen del eje x; la etiqueta del pico
  baja para no pisar la de «hoy».

## 2026-11-12 — Simulador: solo acumulaciones netas y solo hacia adelante
- La película de agua que corre y las líneas blancas (los «destellos», 17 % de los píxeles cambiaban en 0,7 s) quedan detrás de la capa
  «Escurrimiento», apagada por defecto: sin ella, 3 % (solo los charcos de 2 cm o más).
- El gráfico, la barra de horas, el texto de lluvia acumulada y la reproducción arrancan en «ahora»: las 2 semanas anteriores se
  calculan en silencio (humedad del suelo y lagunas) pero no se muestran. La lluvia se muestra como pronóstico, tormenta de prueba y
  escenario estacional por separado.

## 2026-11-12 — Simulador: rápido, sin arranque solo, reinicio que funciona y desagües a la vista
- La tormenta de prueba ya no recorre las 2 semanas anteriores: arranca 24 h antes de ahora con la humedad del suelo de Open-Meteo a
  esa hora, y usa celdas de ~60 m. Abre en 17 s (antes 41) y recalcula en ~7 s (antes 37 s) con el mismo pico (5,7 % contra 5,2 %).
- Mientras el modelo calcula no se anima nada (antes parecía que el ▶ se disparaba solo) y ▶ / ⏮ quedan bloqueados; al terminar se
  muestra el pico, quieto.
- Las líneas de escurrimiento («Desagües») vuelven a estar encendidas por defecto; se eliminó la película de agua que titilaba.
- La reproducción dura ~12 s a ×1 sin importar el largo de la tormenta.

## 2026-11-12 — Documento funcional en PDF
- `docs/Documento_funcional_El_Nino_2026-27.pdf` (26 páginas, estilo universitario): resumen, marco conceptual, datos, arquitectura,
  modelos, simulador, validación, requerimientos funcionales, calidad, cronología, cumplimiento del pedido de noviembre, limitaciones,
  glosario, referencias y anexo. Se regenera con `docs/documento_funcional/generar.py` (HTML + Chrome sin ventana; tipografías del
  sistema, sin descargas).

## 2026-11-13 — Mails «Run failed» de GitHub Actions
- Causa: el SMN limita las consultas seguidas (HTTP 429 y respuestas vacías); `ingesta/smn_alertas.py` bajaba ~160 avisos CAP uno por
  uno y un XML inválido o un 429 tiraba abajo toda la corrida.
- Arreglo: el script lee cada aviso con tolerancia (limpia caracteres inválidos y, si no puede, lo saltea), espera 0,4 s entre
  pedidos, no vuelve a pedir los avisos que ya guardó hoy y corta después de 3 fallas seguidas (lo que falta se baja 3 horas después).
- El workflow ya no falla por una fuente caída: las ingestas siguen adelante con una advertencia en el registro (sin mail) y el
  guardado reintenta 4 veces dando prioridad a los datos de la corrida. Un error real del recálculo del índice sigue fallando.

## 13-nov-2026 · Revisión de una crítica externa al documento funcional
Se verificó cada punto contra el código y los datos. Aceptado y aplicado: (1) confianza del simulador **baja** donde el modelo no está validado (antes «media»); (2) «Sin información» en «Crecida de ríos» donde no hay estación del INA confiable a ≤ 30 km (2.058 de 2.282 municipios; antes mostraba 0,0); (3) el corte de 30 km pasa a decaimiento lineal entre 15 y 30 km; (4) límites y supuestos del simulador explícitos en pantalla y en el PDF (sin entrada de agua desde afuera, desagüe 10 mm/h parejo, cauces de ~10 m supuestos, aislados relativos al borde del círculo, validación a 150 m vs 34–60 m, 9 casos de 5 ciudades); (5) «robustez» definida como sensibilidad a pesos y exponentes; fórmula del peso 0,107 del pronóstico; (6) licencia FABDEM (derivados heredan atribución) y cuota de Cloudflare (agrupar pushes).
Descartado: «sin balance en horas secas» (falso: `balance(1,r,e)` sigue corriendo) y «corte binario distorsiona el índice» (Spearman 0,934 entre exposición con corte y continua; 92 de 100 municipios coinciden en el top por personas en terreno bajo; en radios la exposición ya es continua).

## 13-nov-2026 — Rediseño «láminas» aplicado al sitio
- La web pasa a cuatro láminas con estética de plano de ingeniería (papel cuadriculado, riel de solapas con cajetín, franja de título, radios 0, Instrument Sans + JetBrains Mono): 01 Panorama y mapa, 02 Simulador 3D, 03 Alertas y ríos, 04 Análisis y validación. Enlaces directos `#lamina-N`.
- Mapas, animaciones (viento, lluvia) y simulador 3D satelital quedan como estaban; solo cambia el marco. Módulo nuevo `web/laminas.js`; `index.html` reescrito; `estilos.css` con tokens nuevos y sección «Láminas».
- Escritorio: página a pantalla completa con desplazamiento interno (mínimo 860 px de alto); ≤1100 px: una columna (titular e indicadores, mapa, gráficos, tablero).
- Verificado por DOM en 1440×900, 1366×768, 1200×800 y 390×800: sin desborde horizontal, las 4 láminas, ES/EN, tema oscuro, recorrido de 14 pasos, simulador y partículas de viento (con red abierta), y `construir_artifact.py`.

## 13-nov-2026 — Láminas 01 y 02 iguales a la maqueta aprobada
- Lámina 01: buscador único y ES | EN en la franja; el mapa ocupa la izquierda con los controles encima (mapa, ahora/pronóstico, panel «Capas»),
  referencias arriba a la derecha (niveles con rango, ríos con cantidad, escala gráfica), retícula con grados, recuadro A y «Detalle A» del Litoral.
  Lectura: rótulo, titular «Riesgo medio de inundación: 4,7 sobre 10», bajada, 8 indicadores con ícono, escala de riesgo y camino al pico.
- Lámina 02: panel derecho con «¿Hasta dónde llega el agua?», lluvia a simular (− / +), «Cae en», ▶, 6 indicadores y validación
  (acierto CSI frente a JRC y modelo vs. satélite). El modelo, la maqueta 3D y el resto de los controles quedan igual, debajo.
- Verificado por DOM en 1440, 1280 y 390 px, ES/EN, tema oscuro, capas, pronóstico, buscador y láminas 03-04.

## 13-nov-2026 — Maqueta 3D como terrón arrancado
- Debajo del círculo satelital, un terrón de tierra irregular que se afina hasta una punta (anillos con ruido en radio y profundidad,
  vetas de color), en lugar de la pared recta y la base plana. Cámara un poco más baja para verlo de costado. El modelo no cambia.

### 13-nov — Indicadores: barra de color y cuadro del ícono
- La barra de color de cada indicador ya no pisa la etiqueta (la etiqueta se corre 10 px).
- El cuadro del ícono se pinta con el color del indicador al 20 % de opacidad (80 % transparente) y borde del mismo color.

### 13-nov — Escala de riesgo como indicador de aguja
- En la lámina 01 la regla de 0 a 10 pasó a ser un medidor semicircular: un tramo por nivel (cortes 3, 4,5, 6 y 7), aguja en el valor de hoy y el valor con su nivel debajo.

### 13-nov — Lámina 01: orden del detalle, mapa base liso, zoom, alertas y curvas de nivel
- Se quitó «Riesgo semana a semana». «Evolución en el período» y «El tiempo en el lugar» pasan arriba del detalle (`#lec-arriba`), rediseñados con el lenguaje de la lámina.
- Mapa base liso (`mapaBaseLiso` en `mapa.js`): océano color papel, demás países de un solo tono, sin bosques ni parques.
- Leyenda de ríos sin cantidades. Botones de zoom abajo a la izquierda (el cuadro de referencias los tapaba).
- Alertas del SMN apagadas por defecto; la lámina 03 las enciende y al salir vuelven a como estaban.
- Curvas de nivel: se ven desde zoom 3, van encima del riesgo, sin fondo marino, con la altura en metros escrita derecha sobre las líneas (antes el ángulo máximo descartaba casi todas las etiquetas) y 500 m de separación mínima con el país entero a la vista.

### 14-nov — Costa, animación de desagües, sin calles cortadas en rojo y buscador de empresas
- Mapa: borde fino de la costa (`--mapa-costa`), porque el océano y los países tenían tonos parecidos.
- Maqueta 3D: vuelve la animación de desagües del respaldo del 10-nov (caños virtuales propios de la maqueta: película de agua que moja y líneas blancas que bajan y se juntan), alimentada con la lluvia de cada hora de la tormenta. Es solo visual: los charcos y las cifras siguen saliendo del modelo de inundación; al terminar, la película se seca y quedan los charcos calculados.
- Simulador: se quitaron las calles cortadas en rojo (mapa y maqueta) y su filtro; la cifra de km cortados sigue en los indicadores.
- Buscador: «Master Bus, Zárate» no aparecía porque Photon ponía primero la ciudad de Zárate. Ahora se separa el nombre del lugar, se busca también solo el nombre cerca de ese lugar (60 km: en OSM MasterBus figura en Campana), se ordena por parecido con el nombre y, si Photon no responde, se prueba Nominatim (también con las palabras juntas).

### 14-nov — Respaldo y mapa del proyecto antes de reestructurar
- Respaldo: etiqueta `respaldo-2026-11-14` (commit 0fd256e), subida a GitHub.
- Mapa de la estructura actual en `docs/mapa_proyecto/mapa_proyecto.html` → PDF «Mapa del proyecto - versiones/v1 - 14-nov - estructura actual antes del rediseño (ULTIMA).pdf» (15 páginas): vista general, fuentes, automatización, ecuaciones del índice INFORM, ríos, retroalimentación, simulador hidráulico, validación, web, modelos sin uso, variables para la nueva sección de escenarios y puntos débiles.
- Hallazgos al armarlo: el peso del pronóstico estacional (w = 0,10) sale del acierto del pronóstico diario a 8-15 días, por eso el índice casi no responde a SEAS5; el 90 % de los municipios no tiene estación de río confiable a ≤ 30 km; viento y humedad del suelo no entran en el índice; en el simulador las lagunas arrancan siempre llenas.

### 14-nov — Índice en escala física y escenarios del simulador
- Índice: los rangos percentiles (relativos a los demás municipios) se reemplazaron por umbrales físicos fijos en las unidades de cada dato (`UMBRALES` en `modelos/indice_riesgo.py`): agua alguna vez 0-10 % del territorio, agua nueva en Niños 0-5 %, superficie a < 2 m del cauce 0-100 %, arcilla 10-40 %, personas en terreno bajo en log10 hasta 100 000, proporción 0-100 %, sin cloaca 0-100 %, NBI 0-25 %, materiales 0-100 %, barrios populares 0-10 cada 10 000 hab. Igual en los radios censales (`preparar_geometrias.py`) y en `sql/20_gold.sql` (coincide con Python en esos componentes; la amenaza de ríos ya difería: falta el ajuste por distancia en SQL).
- Resultado (ene-2027): 25 municipios en riesgo alto o muy alto (antes 183), 308 mil personas en riesgo alto (antes 5,4 M), país 2,8 «muy bajo». Primeros: Fontana y Barranqueras (Chaco), costa santafesina del Paraná.
- Simulador: barras de escenario con lluvia y duración (1-72 h), humedad del suelo, lagunas (nivel bajo la orilla), río o mar y desagües. Límites: máximos y mínimos de 8 temporadas Niño (1982-83 a 2023-24, archivo Open-Meteo) en el punto; río, alturas del INA en los Niño 2015-16 y 2023-24 (`web/datos/rios_extremos.json`; si no midió en un Niño, todo el registro); lagunas y desagües sin registro: rango supuesto y avisado. Viento excluido (solo importa como sudestada, que es la altura del río o del mar). La corrida del escenario: 2 h secas, la tormenta y 36 h más. Botones «Condiciones de hoy» y «Peor Niño registrado». Se quitaron la tormenta de prueba con +/−, los presets (La Plata 2013 quedaba fuera de lo registrado) y la barra de río de abajo.

### 14-nov — Indicadores del punto elegido
- Con un punto elegido, la lectura de la lámina 01 se calcula con los radios censales dentro del círculo (antes mostraba el municipio entero: en Zárate daba 0 personas en riesgo alto aunque un radio del círculo tenía 6,2). Titular = riesgo de los radios ponderado por población; «Personas en riesgo alto» = población de los radios con 6 o más; «Radios en riesgo alto» reemplaza a «Municipios»; ríos = estaciones a ≤ 15 km (o dentro del círculo); alertas = las que cubren el punto; camino al pico y mes pico = estaciones cercanas o, sin ellas, el riesgo del lugar mes a mes.

### 14-nov — Radio del círculo arriba de la lectura
- El control del radio del círculo pasó del tablero a lo primero de la lectura de la lámina 01 (solo con un punto elegido); al cambiarlo se recalculan los indicadores del círculo.
- Buscador: «Maasterbus en zarate» no encontraba nada. Ahora separa el lugar también después de «en», «de», «del» o «cerca de», y si ningún resultado se parece al nombre prueba sin las letras repetidas por error de tipeo (también en el respaldo con Nominatim).

### 14-nov — Imagen de alta resolución en la maqueta 3D y radio en el simulador
- La maqueta usa Esri World Imagery hasta z 18 (~0,5 m por píxel en un radio de 0,5 km; antes Sentinel-2 de EOX, ~10 m, hasta z 15) con textura de hasta 2048 px (1536 en celular). Donde Esri no tiene ese zoom devuelve una tesela «sin datos» de ~2,5 KB: se usa la de un zoom menor recortada (hasta 3 niveles) y, si Esri no responde, EOX. Probado en Zárate (81/81 teselas z 18) y en campo pampeano (sin huecos).
- El radio del círculo también está arriba de todo en la lámina 02: al soltarlo, la maqueta se arma de nuevo con el círculo nuevo.

### 14-nov — Orden de la lectura
- Lámina 01: titular → radio del círculo → escala de riesgo y camino al pico → bajada → indicadores.

### 14-nov — Radio por defecto y países transparentes
- Radio del círculo: más chico, entre líneas, visible aunque no haya punto elegido; radio por defecto 1 km.
- Lámina 01: océano y demás países transparentes (se ve el papel); la costa queda con su línea fina; la hidrografía ya no pinta el océano.
- Maqueta de 0,5 km: medido en el sitio, la imagen es z 18 (Esri) y la maqueta dibujada conserva el detalle de la textura.

### 14-nov — Fondo liso, sin dato y detalle
- Lámina 01: fuera de la Argentina color de fondo liso (sin cuadrícula ni retícula punteada); zonas sin dato con color de tierra (ya no transparentes).
- Detalle: sigue al punto, localidad, partido o provincia elegidos (círculo o borde en celeste, radios censales de cerca); no tapa la atribución.
- Camino al pico fuera; el radio queda al lado de la escala de riesgo.

### 14-nov — Encuadre y océano
- Vista inicial del país a la izquierda del cuadro de referencias (no lo tapa) y con los botones de zoom a la vista.
- Océano con la cuadrícula del papel (patrón de 20 px); demás países color de fondo liso.
- Créditos del mapa cerrados por defecto; se abren con el ícono (i). Se mantienen los tres (OpenFreeMap, OpenMapTiles, OpenStreetMap): sus licencias exigen la atribución.
- Corrección: el océano vuelve a verse como antes (transparente: cuadrícula del papel y retícula punteada con sus grados). Para que los demás países queden lisos se agregó la tierra mundial (Natural Earth 1:50 M, world-atlas en jsDelivr) con el color de la hoja, encima de la retícula y debajo de la Argentina.
- Fondo como la lámina aprobada: con el país entero (zoom < 6) no se dibuja el mapa base (países vecinos, ciudades, costas): solo el papel con su cuadrícula, la retícula punteada y la Argentina. Desde zoom 6 vuelven calles y ríos. Se quitó la capa de tierra mundial.
- Cabeza de la lectura: radio compacto («Radio», barra de 90 px y valor) a la derecha del rótulo, sin líneas; escala de riesgo y bajada lado a lado.
- Océano y detalle: cuadrícula del papel (20 px) bajo el mapa y bajo el detalle; retícula gris de 1 px con rayas de 4 px igual en ambos; sin la línea gris entre zonas de riesgo (bordes-riesgo oculta).
- Buscador: lugar mal escrito (zarata → Zárate, distancia de edición ≤ 2); para el nombre mal escrito se prueba Overpass (3 servidores públicos, 9 s c/u), hoy saturados. Botones del mapa más abajo y a la derecha: no tapan los grados.
- Buscador: lugares propios (LUGARES_PROPIOS en buscador.js) con nombre aproximado: MasterBus terminal de micros (Zárate, Terminal de Ómnibus) y oficina (Campana). Con el lugar en el texto, primero el de ese lugar.
- Retícula y cuadrícula idénticas a la lámina aprobada (maqueta v6): retícula cada 5° (2° en el detalle), petróleo al 30 %, 0,6 px, rayas de 3 px, debajo de la Argentina, meridianos desde 14 px y paralelos desde 30 px del borde, rótulos de longitud solo a la izquierda del cuadro de referencias; el mapa sin fondo propio (hoja translúcida sobre la cuadrícula de 20 px de la página); el detalle con fondo liso sin cuadrícula.
- Vuelven los continentes con fondo liso (capa «tierra», Natural Earth 1:50 M) encima de la retícula y debajo de la Argentina; nada más cambia.
- MasterBus terminal de micros (Zárate): ubicación corregida con el link de Google Maps de la usuaria (RN 9, Colectora Sur km 87,5; -34.16999685, -58.9561856).
- MasterBus terminal Zárate: el punto de Google era el centro de la vista (caía en Campana). Ahora calculado: 2 km al noroeste del km 85,5 (RN 9 y Larrea, Georef) sobre el trazado OSM, lado sur (-34.125982, -59.084059; Los Mirtillos, Zárate).
- Buscador de barrios: índice web/datos/barrios_buscador.json (6.467 barrios populares RENABAP, nombre, localidad y punto; generado por preparar_capas.py). Admite «barrio …», errores de tipeo y lugar a 25 km. San Cayetano (el más inundado en mayo-2025) figura en Campana, junto a Zárate.

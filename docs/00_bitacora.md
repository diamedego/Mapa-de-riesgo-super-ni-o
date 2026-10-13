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

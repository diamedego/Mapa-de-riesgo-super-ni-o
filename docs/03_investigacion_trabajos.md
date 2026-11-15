# Investigación: trabajos de referencia (v1, 15-nov-2026)

Trabajos de otros autores que estudiaron y midieron lo mismo que este proyecto: lluvia extrema, escurrimiento, inundación
compuesta (lluvia + río), mapas rápidos de inundación y su validación. Cada ficha indica qué aporta y qué cambia en el proyecto.
Los PDF están en la carpeta local «Investigación - trabajos» (no se suben al repositorio público: cada uno tiene su propia licencia); acá figura el enlace o la cita de cada uno.

## Medición propia: ¿cuánto llovió de verdad en mayo de 2025? (16 al 18-may, ventana del SMN 09 a 09 h)

Lluvia observada en estaciones del SMN (tabla 1 del informe FCAG, ficha 10) frente a tres fuentes grilladas.

| Estación | Observado | Satélite IMERG V07 | CHIRPS | Reanálisis ERA5 (el que usa hoy el simulador) |
|---|---|---|---|---|
| San Fernando | 187 mm | 229 (122 %) | 126 (67 %) | 67 (36 %) |
| Buenos Aires Obs. | 193 mm | 226 (117 %) | 136 (70 %) | 84 (43 %) |
| El Palomar | 158 mm | 220 (139 %) | 148 (94 %) | 72 (45 %) |
| La Plata Aero | 141 mm | 193 (136 %) | 114 (81 %) | 64 (46 %) |
| Rosario | 145 mm | 90 (62 %) | 39 (27 %) | 153 (106 %) |
| Las Flores | 111 mm | 107 (96 %) | 98 (89 %) | 63 (56 %) |
| **Promedio** | | **112 %, error medio 26 %** | 71 %, error 29 % | **55 %, error 47 %** |
| Promedio de IMERG y ERA5 | | **84 %, error medio 16 %** | | |

- ERA5 se queda, en promedio, con la mitad de la lluvia de una tormenta fuerte. Para Zárate y Campana da 68-78 mm, cuando
  la prensa y el municipio informaron 300 mm o más (no hay estación del SMN en esas ciudades).
- Caso extremo: La Plata, 2-abr-2013 (392 mm observados en el Observatorio): ERA5 da 13 mm en el día; IMERG, 87 mm.
- Ninguna fuente sola es confiable en todos lados; el promedio de dos fuentes independientes (reanálisis + satélite) reduce
  el error a la mitad en este evento. Es un solo evento con 6 estaciones: hay que confirmarlo con más (ver plan).

## Inundación compuesta: lluvia + río (o mar)

**01 · Ward et al. (2018).** *Dependence between high sea-level and high river discharge increases flood hazard in global deltas
and estuaries.* Environ. Res. Lett. 13, 084012.
- Hallazgo: en muchos deltas el río alto y el mar alto llegan juntos más seguido de lo que daría el azar; tratarlos por separado
  subestima la amenaza.
- Aplica a: Zárate, Campana, San Fernando y Tigre, donde manda el Paraná más la sudestada del Río de la Plata.

**02 · Couasnon et al. (2020).** *Measuring compound flood potential from river discharge and storm surge extremes at the global
scale.* NHESS 20, 489-504.
- Hallazgo: la inundación compuesta se mide emparejando los dos extremos dentro de una ventana de tiempo corta; lo que importa
  es que coincidan.
- Aplica a: el río del escenario debe ser el nivel durante la tormenta y los días en que el agua drena, no el máximo de la
  temporada.

**11, 12, 13 · Instituto Nacional del Agua (INA), Delta del Paraná.**
- Trabajos: folleto de escalas hidrométricas (INA-INTA); Guizzardi, Bianchi y Sabarots Gerbec (CONAGUA 2025), actualización del
  pronóstico hidrodinámico; Re, Sabarots Gerbec y Storto (Ríos 2015), estadística de niveles con modelación hidrodinámica.
- Hallazgo: en el Delta el nivel depende del caudal del Paraná y del Río de la Plata (marea y sudestada).
- Aplica a: con un solo caudal (GloFAS) no se puede reproducir el nivel en Zárate; hay que usar alturas medidas del INA cuando
  existan y declarar el límite.

## Escurrimiento (método del número de curva, CN)

**03 · Hawkins, Jiang, Woodward, Hjelmfelt y VanMullem (2002).** *Runoff curve number method: examination of the initial
abstraction ratio.*
- Hallazgo: con datos de 134 cuencas, la abstracción inicial λ = Ia/S ronda 0,05 (mediana 0,048), no el 0,20 de las tablas.
- Conversión: S₀,₀₅ = 1,33 · S₀,₂₀^1,15 (S en pulgadas).
- Efecto: con λ = 0,05 escurren antes las lluvias chicas y los suelos con CN bajo.
- Aplica a: `indiceNino` usa λ = 0,20; corresponde pasar a 0,05 con el CN convertido.

## Mapas rápidos de inundación (sin modelo 2D completo)

**04 · Aristizabal et al. (2024).** *Effects of high-quality elevation data and explanatory variables on the accuracy of flood
inundation mapping via Height Above Nearest Drainage.* HESS 28, 1287-1315.
- Hallazgo: HAND sirve para la crecida de ríos, pero su acierto depende mucho de la calidad del relieve.
- Aplica a: la fracción «a menos de 2 m del cauce» sirve para el río, no para charcos de lluvia lejos del cauce.

**05 · Seleem, Heistermann y Bronstert (2021).** *Efficient hazard assessment for pluvial floods in urban environments: a
benchmarking case study for the city of Berlin.* Water 13, 2476.
- Hallazgo: compara métodos rápidos (llenado de depresiones y otros) contra un modelo hidrodinámico 2D; los rápidos ubican bien
  los bajos pero no la profundidad.

**06 · Samela et al. (2020).** *Safer_RAIN: a DEM-based hierarchical filling-&-spilling algorithm for pluvial flood hazard
assessment and mapping across large urban areas.* Water 12, 1514.
- Hallazgo: con el relieve se calcula cuánto volumen cabe en cada bajo antes de desbordar hacia el siguiente.
- Aplica a: reemplazar el factor de pendiente sin calibrar 1/(1+p %) por el volumen real que almacenan los bajos del círculo.

## Validación de mapas de inundación

**14 · Sadana et al. (2025, preprint).** *Validation of the open-source hydrodynamic model SFINCS on historical river floods at
the global scale.*
- Hallazgo: valida un modelo 2D contra mapas satelitales de crecidas reales con el índice CSI (aciertos / (aciertos + falsas
  alarmas + omisiones)).
- Aplica a: referencia de qué CSI es razonable para un modelo de escala global.

**15 · Mukherjee et al. (2024).** *A globally sampled high-resolution hand-labeled validation dataset for evaluating surface water
extent maps.* ESSD 16, 4311-4323.
- Hallazgo: los mapas de agua ópticos, como Dynamic World, fallan con nubes y vegetación inundada; el radar (Sentinel-1) ve a
  través de las nubes.
- Aplica a: validar con radar el temporal de mayo de 2025, que fue con cielo cubierto.

## Lluvia extrema y curvas intensidad-duración-frecuencia (IDF)

**17 · Benítez et al. (CONGREMET XV).** *Validación de curvas IDF construidas con datos diarios de precipitación y datos horarios
en la región del SESA.*
- Hallazgo: compara curvas IDF de satélite con las de pluviógrafo en 5 estaciones; el satélite subestima las intensidades (RMSE
  por debajo de 10 mm/h en casi todas).

**18 · Soto-Escobar, Zambrano-Bigiarini, Tolorza et al. (2026).** *Developing IDF curves using sub-daily gridded and in situ
datasets.* HESS 30, 91-117.
- Hallazgo: evalúa productos grillados subdiarios frente a estaciones para curvas IDF; los grillados suavizan los picos cortos.

**20 · Bonilla (INA, IFRH 2016).** *Estimación de la distribución espacial de tormentas intensas mediante isoyetas elípticas.*
- Hallazgo: una tormenta intensa cae concentrada en un área chica; la lluvia promedio de un área es menor que la de un punto.
- Aplica a: explica por qué una celda de 10 a 30 km (satélite, reanálisis) da menos que el pluviómetro.

**10 · FCAG-UNLP (2025).** *Precipitaciones en la región central del país entre el 16 y 18 de mayo de 2025.*
- Contenido: tabla de lluvia diaria en estaciones del SMN; es la base de la medición propia de arriba.

## Desagües urbanos

**16 · Resumen ejecutivo del EIA del arroyo Maldonado (CABA).**
- Contenido: escaneado, sin texto para buscar.
- Referencia: la red pluvial de CABA se diseñaba para recurrencias de 2 a 10 años; antes de las obras, el Maldonado no
  alcanzaba ni para la tormenta de 2 años.
- Aplica a: hoy el simulador supone desagües de 10 mm/h «sin datos»; hay que justificar ese valor con la recurrencia de diseño.

## El Niño y los ríos de la cuenca del Plata

**08 · Lovino et al. (2018).** *Interannual-to-multidecadal hydroclimate variability and its sectoral impacts in northeastern
Argentina.* HESS 22, 3155-3174.
- Hallazgo: El Niño se asocia con más lluvia y crecidas en el noreste argentino, con impactos en agro, rutas y ciudades.

**Solo enlace (bloquean la descarga automática):**
- Camilloni y Barros: respuesta del Paraná a El Niño 1982-83 y 1997-98 (la crecida de 1983 fue la mayor).
  https://www.cima.fcen.uba.ar/~lcr/publicaciones/pub-b34_The_Parana_River_Response.pdf
- Antico y Díaz: la crecida del Paraná en 2016 fue menor que la de 1998. https://ri.conicet.gov.ar/handle/11336/233052
- JRC (2024): auditoría estadística del índice INFORM.
  https://publications.jrc.ec.europa.eu/repository/bitstream/JRC139164/JRC139164_01.pdf
- Validación de IMERG en la región pampeana (CONICET).
  https://ri.conicet.gov.ar/bitstream/handle/11336/77612/CONICET_Digital_Nro.affc74ba-9d79-4ef4-8f75-ae832157865b_A.pdf?sequence=2
- Hobouchian (SMN): corrección de IMERG con pluviómetros.
  https://pmm.nasa.gov/sites/default/files/document_files/2022_GPM_Mentorship/Hobouchian.project.pdf

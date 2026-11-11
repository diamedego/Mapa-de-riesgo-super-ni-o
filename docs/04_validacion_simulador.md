# Validación del simulador de inundación

*Cómo se comprobó el modelo hidráulico del sitio contra inundaciones reales. Código: `herramientas/validacion/`.*

## Qué modelo se valida
El mismo que usa el sitio (`web/hidraulica.js` y `grillaModelo` en `web/modelo_inundacion.js`): aproximación inercial local de las
ecuaciones de aguas poco profundas (Bates y otros, 2010), hora por hora, con infiltración Green-Ampt según la textura del suelo
(SoilGrids), rugosidad e impermeabilización según la cobertura del mapa base, evaporación (ET0), lagunas que guardan agua, ríos con
nivel impuesto y desagües pluviales supuestos de 10 mm/h en superficies impermeables (no hay datos de la red fuera de CABA).

Antes de esta validación se probó contra casos teóricos: en un cuenco cerrado el balance de agua cierra exacto (nivel final 49,6 cm
contra 49,8 cm teóricos) y en una ladera el caudal llega al 93-95 % de la solución de Manning.

## Cómo se compara con la realidad
- **Lugares**: las 20 ciudades con relieve FABDEM (sin edificios ni árboles), un círculo de 5 km alrededor del centro de cada una.
- **Temporadas**: El Niño 2015-16 y 2023-24 (noviembre a abril) y, como referencia seca, la sequía de 2022-23.
- **Simulado**: el modelo corre cada temporada completa con la lluvia real hora por hora (Open-Meteo, archivo ERA5), la
  evapotranspiración y la humedad inicial del suelo del mismo archivo, y la altura real del río medida por el INA en la estación
  más cercana a menos de 15 km (crecida = altura del día − mediana 2015-2026 de esa estación). Una celda "tiene agua en el mes"
  si tiene 10 cm o más durante al menos la mitad de las horas del mes.
- **Observado**: Dynamic World (Google, Sentinel-2, 10 m) en Earth Engine: agua como clase más frecuente del mes en al menos un
  mes de la temporada, sin el agua permanente (JRC, ocurrencia mayor a 80 %), llevada a la grilla exacta del modelo como fracción
  de agua por celda (con agua si la fracción es 0,5 o más).
- **Métricas** (solo celdas de tierra dentro del círculo): aciertos (POD = aciertos / celdas con agua observadas), falsas alarmas
  (FAR = celdas simuladas sin agua observada / celdas simuladas), CSI = aciertos / (aciertos + falsas alarmas + faltantes) y
  superficie con agua simulada contra observada.
- **Referencia trivial**: "donde el satélite vio agua alguna vez" (JRC 1984-2021). Si el modelo no le gana a esa referencia, no
  aporta más que mirar el mapa histórico.

## Limitaciones de la comparación
- El satélite óptico ve el agua que dura semanas y a cielo abierto: no ve anegamientos de pocas horas, agua bajo árboles ni bajo
  nubes persistentes (la moda mensual lo atenúa). Por eso se compara contra el agua que dura al menos medio mes en el modelo.
- ERA5 tiene celdas de ~25 km: suaviza las tormentas locales intensas (por ejemplo, La Plata 2013 no se puede reproducir con esa
  lluvia).
- El río se impone con la crecida de una sola estación para todo el círculo; el modelo no simula la onda de crecida aguas arriba.
- Las lagunas arrancan llenas hasta la orilla: si una laguna estaba seca antes de la temporada (sequía previa), el modelo no lo sabe.
- No hay datos de la red de desagües, bombeos ni defensas costeras fuera de lo que muestra el relieve.

## Resultados (corrida del 11-nov-2026)
- **20 ciudades × 3 temporadas** corridas con balance de agua exacto (error < 0,01 %). En 31 de los 40 casos de El Niño el satélite
  vio menos de 20 celdas con agua (~0,5 km²) en el círculo: sobre todo el conurbano, donde los anegamientos duran horas. Ahí no se
  puede medir el acierto celda por celda.
- **En los 9 casos con agua observada suficiente** (Corrientes, Santa Fe, Formosa, Rosario y Tigre): el modelo detectó el 24 % de
  las celdas con agua (mediana), con 33 % de falsas alarmas; **CSI 0,20 contra 0,35 de la referencia «donde ya hubo agua»**. Le gana
  a la referencia en 4 de 9 casos.
- **Superficie con agua entre ciudades**: la simulada sigue a la observada con una correlación de Spearman de 0,52 (40 casos).
- **Dónde anda bien**: Corrientes (CSI 0,69 en 2015-16 y 0,50 en 2023-24, mejor que la referencia) y Santa Fe 2015-16 (0,54).
  **Dónde falla**: Santa Fe 2023-24 (simula 1,7 % del círculo con agua contra 9,6 % observado), Formosa 2015-16 (se pasa: 15,8 %
  contra 4,9 %, con 6,25 m de crecida del Paraguay aplicada a todo el río del círculo) y Tigre (el delta: 0,7-0,9 % contra 4-5 %).

| Ciudad | Temporada | Lluvia (mm) | Río (INA) | Agua simulada | Agua observada | Aciertos (POD) | Falsas alarmas (FAR) | CSI modelo | CSI «donde ya hubo agua» |
|---|---|---|---|---|---|---|---|---|---|
| Tigre | 2015-16 | 647 | LUJAN | 0.7 % | 4.1 % | 0.03 | 0.96 | 0.02 | 0.00 |
| Tigre | 2023-24 | 974 | LUJAN | 0.9 % | 4.8 % | 0.03 | 0.93 | 0.02 | 0.00 |
| Corrientes | 2015-16 | 1356 | PARANAMED | 1.9 % | 1.9 % | 0.86 | 0.23 | 0.69 | 0.57 |
| Corrientes | 2023-24 | 1434 | PARANAMED | 1.4 % | 2.5 % | 0.57 | 0.19 | 0.50 | 0.53 |
| Formosa | 2015-16 | 1388 | PARAGUAY | 15.8 % | 4.9 % | 0.94 | 0.80 | 0.20 | 0.34 |
| Formosa | 2023-24 | 1131 | PARAGUAY | 0.6 % | 2.4 % | 0.04 | 0.94 | 0.02 | 0.21 |
| Santa Fe | 2015-16 | 1079 | PARANAINF | 9.9 % | 13.2 % | 0.63 | 0.21 | 0.54 | 0.74 |
| Santa Fe | 2023-24 | 949 | PARANAINF | 1.7 % | 9.6 % | 0.15 | 0.28 | 0.14 | 0.68 |
| Rosario | 2015-16 | 827 | PARANAINF | 0.5 % | 1.7 % | 0.24 | 0.33 | 0.22 | 0.17 |

## Qué se concluye y qué cambia en el sitio
- El modelo es físicamente coherente (balance exacto, casos teóricos) pero **no supera, en general, al mapa de dónde ya hubo agua**
  para predecir el agua que dura semanas. El sitio lo dice así: el simulador muestra esta validación, la conclusión «orientativo»
  y recomienda la capa «Zonas que ya se inundaron» para ver dónde se junta el agua por semanas.
- La confianza del modelo en cada hora simulada usa este resultado: alta donde se validó con CSI ≥ 0,5 (Corrientes), media entre
  0,3 y 0,5 o donde no se pudo validar, baja por debajo de 0,3.
- Causas probables, a mejorar: el río se impone con una sola estación y su mediana como nivel de referencia (el relieve satelital
  tiene el río a la altura del día en que se midió); errores verticales de 1 a 3 m en las planicies; las lagunas arrancan llenas;
  celdas de ~150 m para corridas de 6 meses.

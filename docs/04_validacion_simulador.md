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

## Resultados (11-nov-2026)
**Primera versión:** CSI mediano 0,20 contra 0,35 de la referencia «donde ya hubo agua» (le ganaba en 4 de 9 casos). El río se
imponía como altura del INA menos su mediana, sobre la orilla más baja: Formosa 2015-16 se inundaba de más (15,8 % contra 4,9 %) y
Santa Fe 2023-24 de menos.

**Mejoras** (en el modelo del sitio, no solo en la validación):
1. La altura del río se ata al nivel de evacuación oficial de cada estación del INA: en el nivel de evacuación el agua llega a la
   orilla del cuantil 40 % (el 40 % más bajo de las orillas queda cubierto) y cada metro de más o de menos se suma o se resta.
2. Las lagunas conectadas al río (madrejones, Setúbal) son parte del río y suben con su crecida.
3. El simulador del sitio arranca con la altura de hoy de la estación del INA más cercana (a menos de 15 km), con el mismo método.

El cuantil se eligió entre tres valores probados (10 %, 25 % y 40 %) sobre estos mismos datos: hay riesgo de sobreajuste y conviene
confirmarlo con otras temporadas (por ejemplo 2019 o 2026-27 cuando termine).

**Versión actual:** en los 9 casos con agua observada suficiente, **CSI mediano 0,36 contra 0,35 de la referencia**; le gana en 5
de 9; detecta el 57 % de las celdas con agua con 42 % de falsas alarmas. Correlación de la superficie con agua entre ciudades: 0,54.
En los otros 31 casos (sobre todo el conurbano) el satélite casi no ve agua y no se puede medir el acierto por celda.

| Ciudad | Temporada | Agua simulada | Agua observada | Aciertos | Falsas alarmas | CSI antes | CSI ahora | CSI «donde ya hubo agua» |
|---|---|---|---|---|---|---|---|---|
| Tigre | 2015-16 | 0.7 % | 4.1 % | 0.03 | 0.95 | 0.02 | 0.02 | 0.00 |
| Tigre | 2023-24 | 0.9 % | 4.8 % | 0.03 | 0.93 | 0.02 | 0.02 | 0.00 |
| Corrientes | 2015-16 | 1.9 % | 1.9 % | 0.86 | 0.23 | 0.69 | 0.69 | 0.57 |
| Corrientes | 2023-24 | 1.4 % | 2.5 % | 0.57 | 0.19 | 0.50 | 0.50 | 0.53 |
| Formosa | 2015-16 | 6.6 % | 4.9 % | 0.79 | 0.60 | 0.20 | 0.36 | 0.34 |
| Formosa | 2023-24 | 0.5 % | 2.4 % | 0.04 | 0.94 | 0.02 | 0.02 | 0.21 |
| Santa Fe | 2015-16 | 12.7 % | 13.2 % | 0.73 | 0.28 | 0.54 | 0.57 | 0.74 |
| Santa Fe | 2023-24 | 3.4 % | 9.6 % | 0.29 | 0.27 | 0.14 | 0.26 | 0.68 |
| Rosario | 2015-16 | 2.1 % | 1.7 % | 0.88 | 0.42 | 0.22 | 0.54 | 0.17 |

## Qué se concluye y qué cambia en el sitio
- El modelo **empata con el mapa de dónde ya hubo agua** para el agua que dura semanas y lo supera donde manda la crecida del río
  con estación cercana (Corrientes, Rosario, Formosa 2015-16). Sigue corto en Santa Fe 2023-24 y en el delta de Tigre, y no se
  puede validar el anegamiento urbano de pocas horas con satélites ópticos.
- El simulador muestra esta validación con un gráfico por ciudad. La confianza del modelo en cada hora usa el resultado de su
  ciudad: alta con CSI ≥ 0,5, media entre 0,3 y 0,5 o donde no se pudo validar, baja por debajo de 0,3.

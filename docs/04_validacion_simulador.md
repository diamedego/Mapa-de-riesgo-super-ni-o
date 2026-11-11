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

## Resultados
*(se completan al terminar la corrida de `herramientas/validacion/validar.py`)*

# Plan de cambios (pedido del 10-nov-2026) · respaldo previo: tag `respaldo-2026-11-10`

Orden acordado: primero el **simulador** (hoy y próximos días); después video corto de uso, post de LinkedIn y documento
funcional/técnico. El resto de la lista (interfaz, filtros, análisis, recorrido) va después del simulador.

## 1. Simulador de inundación (P0) — decisiones de la usuaria

- **Modelo híbrido:** modelo hidráulico 2D en el navegador, en cualquier punto del país. En las **20 ciudades con más personas en
  riesgo (+ La Plata)** usa terreno sin edificios ni árboles (FABDEM, 30 m) alojado en el sitio; en el resto, AWS Terrain (SRTM).
- **Lluvia:** últimos 14 días = dato real (Open-Meteo, análisis horario) → estado inicial del suelo; 16 días = pronóstico horario;
  más allá = pronóstico estacional mensual (SEAS5) repartido en días de lluvia típicos del lugar (21 años de Open-Meteo archivo).
  **Siempre visible qué es dato real, qué es pronóstico y qué es escenario estacional.**
- **Ríos (Paraná, Uruguay…):** nivel pronosticado (INA/GloFAS) como condición de borde + barra para probar otro nivel.
- **Validación:** todas las inundaciones reales con datos (Litoral 2015-16 y 2023-24 por satélite, La Plata abril 2013, otras).

### Diseño técnico
- Solver: inercial local 2D (Bates et al. 2010, familia LISFLOOD-FP / HEC-RAS 2D onda difusa), paso de tiempo adaptativo (CFL),
  en un Web Worker. Grilla ~250-350 celdas por lado. Rugosidad de Manning por cobertura.
- Infiltración: Green-Ampt según textura del suelo (raster nacional precalculado, SoilGrids) y humedad inicial (Open-Meteo).
  Superficies impermeables (edificios, calles, zonas urbanas) a partir de las capas del mapa base.
- Evaporación: ET0 de Open-Meteo sobre agua estancada y suelo húmedo.
- Lagunas guardan agua (nivel sube); ríos sacan agua o la aportan según su nivel.
- Desagües pluviales: no hay datos (solo CABA) → supuesto explícito y ajustable.
- Salidas: profundidad en el tiempo, superficie inundada, personas, calles/rutas y hospitales bajo agua, línea de tiempo con hitos.

## 2. Resto del pedido (después del simulador) — decisiones tomadas
- Colores: semáforo verde→rojo en riesgo, lluvia y viento; temperatura de azul a rojo (excepción); sin dato = **opción B**
  (transparente con borde punteado).
- Filtros tipo Power BI; si se toca un punto fuera de la zona elegida, **todo pasa al punto**. Botón global "Borrar filtros".
- Capas nuevas (todas, cuidando el ruido visual): hidrografía (por defecto), zonas que ya se inundaron (satélite), densidad de
  población, barrios populares, suelo impermeable/verde, infraestructura crítica, rutas y vías. Sin "riesgo en 3D".
  Sacar paradas de colectivo. Interruptores fuera de cada mapa, con descripción al pasar el mouse.
- Radio con barra de 0,5 a 20 km; simulación también por municipio (hasta ~1 500 km²).
- Fechas futuras hasta el fin del pronóstico estacional (~6 meses); detalle diario hasta 16 días.
- Panel izquierdo rediseñado (situación en viñetas, gráficos de torta, recomendaciones según amenaza, suelo, cloacas,
  historial y horizonte; preventivas vs emergencia). Sacar "evolución mensual". Notas chicas bajo los títulos.
- "Lluvia por zona" en gráficos (sin tabla); los 3 análisis en una fila; todo filtrado por la zona elegida.
- Encabezado con explicación, resumen del país, actualización de datos y link a fuentes por tipo de dato.
- Recorrido guiado = cómo usar la app (botones, mapas, búsquedas), con desplazamiento automático al cartel de cada paso.
- Trazabilidad: fuente, fecha y método de cada indicador; observado / histórico / estimado / pronóstico diferenciados;
  "Sin información" cuando no hay dato; confianza alta/media/baja; comparación histórica; rutas y hospitales aislados.
- En celular, filtros y análisis se apilan; las descripciones aparecen al tocar.

## Estado al 11-nov-2026
- Publicado: tandas 1 a 6 (puntos 1 a 17 y 20, salvo la consulta por municipio del punto 11c).
- Falta: validación del simulador con inundaciones reales e incertidumbre (19), comparación histórica en el simulador (21), rutas y
  hospitales bajo agua (22), uso y permeabilidad del suelo en el simulador (23), confianza alta/media/baja (24), revisión integral de
  trazabilidad y calidad (18, 25-28) y la consulta por municipio (11c).

# Constitución gráfica y retícula invisible

Pedido de Diamela, 15-nov-2026. No obliga a rehacer lo que ya está: se aplica a **todo cambio funcional o visual de ahora en adelante**.
Prohibido romper la alineación existente al agregar, mover o editar un componente.

## 1. Retícula invisible maestra y márgenes (regla de oro)
- Unidad espacial base: múltiplo estricto de 8 px (8, 16, 24, 32). Nunca valores arbitrarios (10, 13, 18, 22) en márgenes o separaciones.
- Marco perimetral uniforme: la lámina mantiene el mismo margen exterior en los 4 lados (24 px en escritorio). Ningún texto, pie o recuadro toca ni queda cortado por el borde.
- Rieles verticales compartidos:
  - Riel lateral izquierdo fijo (248 px) con un filete continuo de 1 px. Su bloque técnico inferior (Proyecto / Lámina / Fecha / Fuentes / Método / Aviso) ocupa 1 columna completa cuando el texto supera 16 caracteres: 0 truncamientos («…») y 0 números huérfanos en segunda línea (nunca partir «2026– / 27»).
  - Todo elemento flotante sobre el mapa (leyenda «Mapa de riesgo», recuadro «Detalle A») se ancla a un mismo riel derecho: mismo ancho exacto (p. ej. 240 px), mismo margen de 16 px en todos sus bordes libres, bordes izquierdo y derecho alineados entre sí.
  - Los controles del mapa (+ / −, capas) nunca quedan tapados ni rozan la leyenda: 16 px de separación mínima.
  - Columna derecha de lectura: guía vertical al 50 % que alinea las filas de KPIs y las tarjetas inferiores («Escala de riesgo», «Camino al pico»), con el mismo padding interno (20 px) y la misma línea de inicio.

## 2. Jerarquía de filetes, cajas y trazos
- Prohibido acumular cajas con sombra sobre cajas con borde: superficie plana (#FFFFFF sobre papel técnico #F7F6F2) y filetes de 1 px (#D8D5CD).
- Solo la pestaña activa y el marco estructural principal usan acento de 2 px o fondo sólido petróleo (#0B5E6F) o tinta (#13191F).
- Todo recuadro auxiliar sobre el mapa: mismo radio (0 o 2 px), mismo borde (1 px), mismo padding (16 px).

## 3. Tipografía
- Display / titulares: Archivo 700, tracking −0,02em, interlínea 1,15, máximo 2 líneas.
- Cuerpo: DM Sans 14–15 px, interlínea 1,55, máximo 68 caracteres de ancho.
- Metadatos, ejes, escalas y cifras: IBM Plex Mono con `font-variant-numeric: tabular-nums`.
- KPIs: la unidad («M», «mm», «km/h», «°C») y el denominador («/ 2.282») comparten la línea de base del número, con 4 px de separación y 55–60 % de su tamaño.
- Anti-corte y anti-colisión: prohibido truncar nombres propios o métricas con «…». Nombres largos se abrevian editorialmente («T. del Fuego», «Sgo. del Estero»). En ejes, dos etiquetas nunca se tocan: alternar arriba/abajo o 8 px mínimos.

## 4. Gráficos, íconos y color
- Íconos de interfaz: 16 px, trazo 1,5 px, en caja cuadrada de 28 × 28 px con borde de 1 px alineada al borde superior derecho del título del KPI.
- El semáforo (verde / amarillo / naranja / rojo) se reserva ÚNICAMENTE para nivel de riesgo o umbral de alerta.
- Gráficos de volumen, cantidad o Pareto (población, mm de lluvia, barras temporales): escala monocromática petróleo (#0B5E6F) o grafito.

## 5. Auditoría obligatoria tras cada cambio
1. ¿Los bordes izquierdo y derecho de los bloques apilados (sobre el mapa y en paneles) coinciden al píxel?
2. ¿Todos los recuadros flotantes tienen el mismo margen (16 px) respecto de su contenedor?
3. ¿Hay texto cortado, con «…» o chocando con ejes, barras o íconos?
4. ¿Las tarjetas hermanas tienen el mismo padding, radio y borde?
5. ¿El pie del riel izquierdo respira con 24 px libres?

Si falla cualquiera de los 5 puntos, se corrige antes de entregar (verificar midiendo el DOM, sin capturas: ver la memoria «Entregables al chat»).

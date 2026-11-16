"""Texto del documento funcional (HTML), versión 5. Las figuras, los números de página y las cifras de las validaciones entran
como parámetros (generar.py los lee de los archivos de resultados), así el texto siempre coincide con los datos."""

LOGO = '''<svg viewBox="0 0 40 40" class="logo"><rect width="40" height="40" rx="10" fill="#0e7490"/><path d="M8 24c3 0 3-2 6-2s3 2 6 2 3-2 6-2 3 2 6 2" fill="none" stroke="#22d3ee" stroke-width="2.4" stroke-linecap="round"/><path d="M8 30c3 0 3-2 6-2s3 2 6 2 3-2 6-2 3 2 6 2" fill="none" stroke="#a5f3fc" stroke-width="2.4" stroke-linecap="round" opacity=".7"/><path d="M20 8c3 3.6 5 6.3 5 8.8a5 5 0 0 1-10 0c0-2.5 2-5.2 5-8.8Z" fill="#ecfeff"/></svg>'''

OLAS = '''<svg class="olas" viewBox="0 0 794 227" preserveAspectRatio="none"><path d="M0 120c60 0 80-30 140-30s80 30 140 30 80-30 140-30 80 30 140 30 80-30 140-30 60 30 94 30V227H0Z" fill="#0e7490" opacity=".28"/><path d="M0 160c60 0 80-30 140-30s80 30 140 30 80-30 140-30 80 30 140 30 80-30 140-30 60 30 94 30V227H0Z" fill="#0e7490" opacity=".45"/><path d="M0 200c60 0 80-26 140-26s80 26 140 26 80-26 140-26 80 26 140 26 80-26 140-26 60 26 94 26V227H0Z" fill="#22d3ee" opacity=".22"/></svg>'''

ARQUITECTURA = '''<svg viewBox="0 0 640 262" xmlns="http://www.w3.org/2000/svg" font-family="Avenir Next, Gill Sans, Helvetica Neue, Arial, sans-serif" font-size="9">
<defs><marker id="f" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#5b6675"/></marker></defs>
<g stroke="#5b6675" stroke-width="1.3" fill="none" marker-end="url(#f)"><path d="M118 118H140"/><path d="M262 118H284"/><path d="M404 118H426"/><path d="M526 118H548"/><path d="M345 168V196"/><path d="M478 150V196"/></g>
<g text-anchor="middle">
<rect x="6" y="44" width="112" height="148" rx="8" fill="#eef3f7" stroke="#c7d0da"/><text x="62" y="62" font-weight="700" fill="#0a1c28">FUENTES</text>
<text x="62" y="80" fill="#5b6675">SMN · INA · INDEC</text><text x="62" y="94" fill="#5b6675">Open-Meteo (ECMWF)</text><text x="62" y="108" fill="#5b6675">GloFAS · SEAS5</text><text x="62" y="122" fill="#5b6675">Earth Engine (IMERG,</text><text x="62" y="136" fill="#5b6675">ERA5-Land, JRC, Dynamic</text><text x="62" y="148" fill="#5b6675">World, Sentinel-1)</text><text x="62" y="162" fill="#5b6675">IGN · RENABAP · OSM</text><text x="62" y="176" fill="#5b6675">FABDEM · SoilGrids</text>
<rect x="140" y="44" width="122" height="148" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="201" y="62" font-weight="700" fill="#0a1c28">INGESTA</text><text x="201" y="80" fill="#0e7490">un script por fuente</text><text x="201" y="94" fill="#0e7490">reintentos y registro</text><text x="201" y="108" fill="#0e7490">(manifest.csv)</text><text x="201" y="128" fill="#5b6675">GitHub Actions:</text><text x="201" y="142" fill="#5b6675">cada 3 h · diario ·</text><text x="201" y="156" fill="#5b6675">2 veces al día ·</text><text x="201" y="170" fill="#5b6675">semanal · mensual</text>
<rect x="284" y="44" width="120" height="148" rx="8" fill="#eef3f7" stroke="#c7d0da"/><text x="344" y="62" font-weight="700" fill="#0a1c28">CAPAS DE DATOS</text><text x="344" y="84" fill="#5b6675">bronze (crudo)</text><text x="344" y="102" fill="#5b6675">silver (limpio,</text><text x="344" y="114" fill="#5b6675">claves comunes)</text><text x="344" y="134" fill="#5b6675">gold (índices)</text><text x="344" y="156" fill="#0e7490">SQL · DuckDB</text><text x="344" y="170" fill="#0e7490">Parquet</text>
<rect x="426" y="44" width="100" height="148" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="476" y="62" font-weight="700" fill="#0a1c28">MODELOS</text><text x="476" y="82" fill="#0e7490">índice INFORM</text><text x="476" y="96" fill="#0e7490">ríos (GloFAS→INA)</text><text x="476" y="110" fill="#0e7490">tormentas Niño</text><text x="476" y="124" fill="#0e7490">verificación</text><text x="476" y="146" fill="#5b6675">simulador 2D</text><text x="476" y="160" fill="#5b6675">(en el navegador)</text>
<rect x="548" y="44" width="86" height="148" rx="8" fill="#0a1c28"/><text x="591" y="62" font-weight="700" fill="#fff">WEB</text><text x="591" y="82" fill="#a5f3fc">MapLibre GL</text><text x="591" y="96" fill="#a5f3fc">4 láminas</text><text x="591" y="110" fill="#a5f3fc">análisis</text><text x="591" y="124" fill="#a5f3fc">simulador 3D</text><text x="591" y="146" fill="#7fa6b8">ES / EN</text><text x="591" y="160" fill="#7fa6b8">claro / oscuro</text>
<rect x="284" y="196" width="122" height="44" rx="8" fill="#fff" stroke="#c7d0da"/><text x="345" y="214" font-weight="600" fill="#0a1c28">Repositorio GitHub</text><text x="345" y="228" fill="#5b6675">código · datos · bitácora</text>
<rect x="418" y="196" width="130" height="44" rx="8" fill="#fff" stroke="#c7d0da"/><text x="483" y="214" font-weight="600" fill="#0a1c28">Cloudflare Workers</text><text x="483" y="228" fill="#5b6675">publica con cada push</text>
</g></svg>'''

INDICE = '''<svg viewBox="0 0 640 190" xmlns="http://www.w3.org/2000/svg" font-family="Avenir Next, Gill Sans, Helvetica Neue, Arial, sans-serif" font-size="9">
<defs><marker id="g" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#5b6675"/></marker></defs>
<g text-anchor="middle">
<rect x="6" y="10" width="150" height="66" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="81" y="28" font-weight="700" fill="#0a1c28">Amenaza fija del lugar</text><text x="81" y="42" fill="#0e7490">agua en superficie y quebradas</text><text x="81" y="55" fill="#0e7490">con lluvia normal (f = 0,5)</text><text x="81" y="68" fill="#5b6675">nunca 0 donde junta agua</text>
<rect x="6" y="96" width="150" height="84" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="81" y="114" font-weight="700" fill="#0a1c28">Amenaza pronosticada</text><text x="81" y="128" fill="#0e7490">nivel 0 a 3 → 0, 4, 7 o 10</text><text x="81" y="142" fill="#5b6675">lluvia: 50 pronósticos ECMWF</text><text x="81" y="155" fill="#5b6675">ríos: GloFAS + INA</text><text x="81" y="168" fill="#5b6675">alertas del SMN</text>
<g stroke="#5b6675" stroke-width="1.2" fill="none" marker-end="url(#g)"><path d="M156 43H184"/><path d="M156 138H184"/><path d="M304 90H330"/></g>
<rect x="184" y="52" width="120" height="76" rx="8" fill="#0a1c28"/><text x="244" y="72" font-weight="700" fill="#fff">AMENAZA DEL DÍA</text><text x="244" y="87" fill="#a5f3fc">10 − (10 − fija) ×</text><text x="244" y="99" fill="#a5f3fc">(10 − pron.) / 10</text><text x="244" y="115" fill="#7fa6b8">hoy y 14 días</text>
<rect x="330" y="8" width="120" height="48" rx="8" fill="#eef3f7" stroke="#c7d0da"/><text x="390" y="26" font-weight="700" fill="#0a1c28">EXPOSICIÓN</text><text x="390" y="40" fill="#5b6675">habitantes en terreno bajo</text>
<rect x="330" y="66" width="120" height="48" rx="8" fill="#0a1c28"/><text x="390" y="86" font-weight="700" fill="#fff">∛( H × E × V )</text><text x="390" y="101" fill="#a5f3fc">media geométrica</text>
<rect x="330" y="124" width="120" height="48" rx="8" fill="#eef3f7" stroke="#c7d0da"/><text x="390" y="142" font-weight="700" fill="#0a1c28">VULNERABILIDAD</text><text x="390" y="156" fill="#5b6675">cloacas · NBI · vivienda</text>
<g stroke="#5b6675" stroke-width="1.2" fill="none" marker-end="url(#g)"><path d="M390 56V66"/><path d="M390 124V114"/><path d="M450 90H486"/></g>
<rect x="486" y="46" width="148" height="88" rx="10" fill="#e6f3f6" stroke="#0e7490" stroke-width="1.4"/><text x="560" y="68" font-weight="700" fill="#0a1c28">RIESGO 0 – 10</text><text x="560" y="84" fill="#5b6675">hoy y cada uno de 14 días</text><text x="560" y="97" fill="#5b6675">5 niveles, verde a rojo</text><text x="560" y="110" fill="#5b6675">+ propensión con su semáforo</text><text x="560" y="123" fill="#5b6675">robustez (Monte Carlo)</text>
</g></svg>'''

HIDRAULICA = '''<svg viewBox="0 0 640 170" xmlns="http://www.w3.org/2000/svg" font-family="Avenir Next, Gill Sans, Helvetica Neue, Arial, sans-serif" font-size="9">
<defs><marker id="h" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#0e7490"/></marker></defs>
<g text-anchor="middle">
<rect x="6" y="10" width="100" height="42" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="56" y="28" font-weight="700" fill="#0a1c28">Lluvia horaria</text><text x="56" y="41" fill="#0e7490">real o de escenario</text>
<rect x="6" y="118" width="100" height="42" rx="8" fill="#eef3f7" stroke="#c7d0da"/><text x="56" y="136" font-weight="700" fill="#0a1c28">Evaporación</text><text x="56" y="149" fill="#5b6675">ET₀ (Open-Meteo)</text>
<rect x="150" y="10" width="110" height="42" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="205" y="28" font-weight="700" fill="#0a1c28">Infiltración</text><text x="205" y="41" fill="#0e7490">Green-Ampt · suelo</text>
<rect x="150" y="64" width="110" height="42" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="205" y="82" font-weight="700" fill="#0a1c28">Desagüe pluvial</text><text x="205" y="95" fill="#0e7490">lluvia de 1 h de 2 años</text>
<rect x="304" y="30" width="150" height="76" rx="10" fill="#0a1c28"/><text x="379" y="54" font-weight="700" fill="#fff">Escurrimiento 2D</text><text x="379" y="69" fill="#a5f3fc">onda inercial (Bates 2010)</text><text x="379" y="83" fill="#a5f3fc">Manning por cobertura</text><text x="379" y="97" fill="#7fa6b8">paso adaptativo</text>
<rect x="498" y="10" width="136" height="42" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="566" y="28" font-weight="700" fill="#0a1c28">Acumulación</text><text x="566" y="41" fill="#0e7490">bajos, calles, lagunas</text>
<rect x="498" y="64" width="136" height="42" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="566" y="82" font-weight="700" fill="#0a1c28">Ríos y bordes</text><text x="566" y="95" fill="#0e7490">nivel INA · salida libre</text>
<rect x="498" y="118" width="136" height="42" rx="8" fill="#fff" stroke="#0e7490"/><text x="566" y="136" font-weight="700" fill="#0a1c28">Balance de agua</text><text x="566" y="149" fill="#0e7490">cierra con error 0,00 %</text>
<g stroke="#0e7490" stroke-width="1.3" fill="none" marker-end="url(#h)"><path d="M106 31H150"/><path d="M106 139L304 100" stroke-dasharray="3 3"/><path d="M260 31L330 48"/><path d="M260 85L304 85"/><path d="M454 55L498 33"/><path d="M454 85H498"/><path d="M454 100L498 135"/></g>
</g></svg>'''

PEOR = '''<svg viewBox="0 0 640 196" xmlns="http://www.w3.org/2000/svg" font-family="Avenir Next, Gill Sans, Helvetica Neue, Arial, sans-serif" font-size="9">
<defs><marker id="p" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#0e7490"/></marker></defs>
<g text-anchor="middle">
<rect x="4" y="8" width="118" height="54" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="63" y="26" font-weight="700" fill="#0a1c28">Tormenta del Niño</text><text x="63" y="40" fill="#0e7490">IMERG, 3 días, celda 0,1°</text><text x="63" y="53" fill="#0e7490">hora a hora (ERA5 corregido)</text>
<rect x="4" y="74" width="118" height="44" rx="8" fill="#eef3f7" stroke="#c7d0da"/><text x="63" y="92" font-weight="700" fill="#0a1c28">Humedad antes</text><text x="63" y="106" fill="#5b6675">w del rango del lugar</text>
<rect x="4" y="130" width="118" height="54" rx="8" fill="#eef3f7" stroke="#c7d0da"/><text x="63" y="148" font-weight="700" fill="#0a1c28">Río esos días</text><text x="63" y="162" fill="#5b6675">INA o GloFAS, del 1.er día</text><text x="63" y="175" fill="#5b6675">de lluvia a 3 días después</text>
<rect x="160" y="8" width="132" height="54" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="226" y="26" font-weight="700" fill="#0a1c28">Suelo permeable</text><text x="226" y="40" fill="#0e7490">Número de Curva</text><text x="226" y="53" fill="#0e7490">λ = 0,05 · S según w</text>
<rect x="160" y="74" width="132" height="44" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="226" y="92" font-weight="700" fill="#0a1c28">Impermeable</text><text x="226" y="106" fill="#0e7490">Σ máx(0; iₜ − desagüe)</text>
<rect x="330" y="30" width="142" height="66" rx="10" fill="#0a1c28"/><text x="401" y="52" font-weight="700" fill="#fff">Bajos del relieve</text><text x="401" y="67" fill="#a5f3fc">llenado y desborde</text><text x="401" y="81" fill="#7fa6b8">(priority-flood, D8)</text>
<rect x="330" y="130" width="142" height="54" rx="10" fill="#0a1c28"/><text x="401" y="150" font-weight="700" fill="#fff">Río conectado</text><text x="401" y="165" fill="#a5f3fc">tierra unida al río y</text><text x="401" y="177" fill="#a5f3fc">más baja que su nivel</text>
<rect x="510" y="62" width="126" height="76" rx="10" fill="#e6f3f6" stroke="#0e7490" stroke-width="1.4"/><text x="573" y="84" font-weight="700" fill="#0a1c28">Personas con</text><text x="573" y="98" font-weight="700" fill="#0a1c28">10 cm o más</text><text x="573" y="114" fill="#5b6675">radios censales</text><text x="573" y="127" fill="#c62f2f">▲ el peor Niño</text>
<g stroke="#0e7490" stroke-width="1.3" fill="none" marker-end="url(#p)"><path d="M122 35H160"/><path d="M122 96L160 96"/><path d="M122 96L160 52"/><path d="M292 35L330 55"/><path d="M292 96L330 80"/><path d="M122 157H330"/><path d="M472 63L510 88"/><path d="M472 157L510 118"/></g>
</g></svg>'''


def fig(svg, num, texto, extra=""):
    return f'<figure>{svg}<figcaption><b>Figura {num}.</b> {texto}{extra}</figcaption></figure>'


def alcance(texto):
    return f'<div class="decision"><b>Alcance y validez</b>{texto}</div>'


def capitulos(F, P, V):
    """F: figuras (SVG), P: páginas de cada capítulo (para el índice), V: cifras de las validaciones y de los datos."""
    p = lambda k: P.get(k, "")
    L, R, D = V["lluvia"], V["rio"], V["dw"]
    pc = lambda x: f"{100 * x:.0f} %"
    n2 = lambda x: f"{x:.2f}".replace(".", ",")
    return {
"portada": f'''<section class="portada"><div class="contenido">{LOGO}<div class="tipo">Documento funcional y registro del proceso</div>
<h1>Argentina frente a El Niño 2026–27</h1><div class="sub">Mapa de riesgo de inundación para los 2.282 gobiernos locales del país, con tablero de situación y simulador hidráulico 3D de escenarios históricos</div>
<div class="datos"><b>Autora:</b> Diamela, ingeniera química (UTN)<br><b>Desarrollo:</b> con la asistencia de Claude (Anthropic)<br><b>Versión:</b> 5.0 · <b>Fecha:</b> 16 de noviembre de 2026<br><b>Sitio:</b> mapa-de-riesgo-super-nino.diamedego.workers.dev<br><b>Repositorio:</b> github.com/diamedego/Mapa-de-riesgo-super-ni-o</div></div>{OLAS}
<div class="pie">Proyecto personal con datos públicos. No es un producto oficial: ante una emergencia, seguir a Defensa Civil, el SMN y el INA.</div></section>''',

"resumen": f'''<section class="resumen"><h1><span class="num">Resumen</span>Resumen ejecutivo</h1>
<p>Este documento describe el sistema <em>Argentina frente a El Niño 2026–27</em>: un tablero web que estima y muestra el riesgo de inundación en los 2.282 gobiernos locales y los 66.515 radios censales de la Argentina durante el evento El Niño 2026–27, y un simulador hidráulico 3D que reproduce en un punto elegido las tormentas reales de los Niños anteriores, o una tormenta definida por el usuario. Todo se construyó con datos públicos y servicios gratuitos, se actualiza solo varias veces por día y se publica de forma automática.</p>
<p>El riesgo sigue la estructura INFORM (amenaza × exposición × vulnerabilidad, media geométrica, escala de 0 a 10) y se calcula <b>para hoy y para cada uno de los próximos 14 días</b>. La amenaza de cada día combina la propensión fija del lugar a juntar agua con la amenaza pronosticada: la lluvia de 3 días de los 50 pronósticos del ensamble del ECMWF frente a la lluvia habitual del lugar, la crecida de los ríos (GloFAS corregido con lo que mide el INA) y las alertas del SMN. Cada indicador se lleva a la escala 0–1 con <b>umbrales físicos fijos</b> en sus propias unidades: un lugar queda «alto» por lo que tiene, no por estar peor que los demás. La versión anterior calculaba el riesgo por mes con el pronóstico estacional; la autora lo descartó porque la lluvia de un mes no se puede pronosticar con una precisión útil.</p>
<p>El simulador resuelve las ecuaciones de aguas poco profundas en forma inercial (Bates y otros, 2010) con infiltración de Green-Ampt, desagües, lagunas y ríos. Sus barras de escenario van del mínimo al máximo registrado en los Niños desde 1997–98 en ese lugar. Al elegir un Niño se repite su peor tormenta <b>tal como ocurrió</b>: la lluvia del satélite IMERG, la humedad del suelo de ese momento y la altura del río <b>de esos mismos días</b>. Una fórmula, sin simular el agua, estima en milisegundos qué Niño dejó a más personas con agua. Una segunda solapa simula los próximos 15 días desde las condiciones de hoy: la lluvia real de las últimas dos semanas, el agua que vio el radar y el pronóstico, con su rango probable y pesimista.</p>
<div class="caja-clave"><b>Qué tan bien funciona, medido.</b>
<ul>
<li><b>Lluvia.</b> Contra {L["tormentas"]} tormentas medidas en {L["pluviometros"]} pluviómetros del INA y del SMN, el reanálisis ERA5, que usaban las versiones anteriores, daba el {pc(L["era5_100"]["mediana_cociente"])} de las tormentas de 100 mm o más (error mediano {pc(L["era5_100"]["error_mediano"])}). El satélite IMERG da el {pc(L["imerg_100"]["mediana_cociente"])} (error {pc(L["imerg_100"]["error_mediano"])}) y por eso pasó a ser la fuente.</li>
<li><b>Crecida de río.</b> En la del río Uruguay en Concordia (noviembre de 2023), el modelo acierta el {pc(R["ahora"]["pod"])} del agua que vio el radar Sentinel-1 (CSI {n2(R["ahora"]["csi"])}).</li>
<li><b>Agua que dura semanas.</b> Contra Dynamic World, en {D["n"]} casos con agua suficiente, el simulador obtiene un CSI mediano de {n2(D["csi"])}, contra {n2(D["jrc"])} de la referencia «donde ya hubo agua».</li>
</ul>
Conclusión: el sistema es una herramienta <b>orientativa</b>, fuerte en las crecidas de ríos con estación cercana y débil en el anegamiento urbano de pocas horas, que ningún satélite registra.</div>
<div class="kpis"><div class="kpi"><b>2.282</b><span>gobiernos locales con riesgo para hoy y 14 días</span></div><div class="kpi"><b>{L["tormentas"]}</b><span>tormentas medidas para elegir la fuente de lluvia</span></div><div class="kpi"><b>{n2(R["ahora"]["csi"])}</b><span>CSI del río contra el radar (Concordia 2023)</span></div><div class="kpi"><b>$ 0</b><span>costo: servicios y herramientas gratuitas</span></div></div>
<p class="palabras"><b>Palabras clave:</b> riesgo de inundación · El Niño · INFORM · pronóstico por ensamble · inundación compuesta · número de curva · modelo hidráulico 2D · IMERG · validación · Argentina.</p></section>''',

"indice": f'''<section class="indice"><h1><span class="num">Contenido</span>Índice</h1><ol>
<li><span class="n">1</span><span class="t">Introducción, objetivos y alcance</span><span class="p">{p(1)}</span></li>
<li><span class="n">2</span><span class="t">Marco conceptual y antecedentes</span><span class="p">{p(2)}</span></li>
<li><span class="n">3</span><span class="t">Datos: fuentes, cobertura y actualización</span><span class="p">{p(3)}</span></li>
<li><span class="n">4</span><span class="t">Arquitectura del sistema</span><span class="p">{p(4)}</span></li>
<li><span class="n">5</span><span class="t">Modelos analíticos del riesgo</span><span class="p">{p(5)}</span></li>
<li><span class="n">6</span><span class="t">Simulador hidráulico y escenarios de los Niños</span><span class="p">{p(6)}</span></li>
<li><span class="n">7</span><span class="t">El peor Niño para la población: método rápido</span><span class="p">{p(7)}</span></li>
<li><span class="n">8</span><span class="t">Validación</span><span class="p">{p(8)}</span></li>
<li><span class="n">9</span><span class="t">Requerimientos funcionales y guía de uso</span><span class="p">{p(9)}</span></li>
<li><span class="n">10</span><span class="t">Calidad, pruebas y trazabilidad</span><span class="p">{p(10)}</span></li>
<li><span class="n">11</span><span class="t">Registro cronológico del proceso</span><span class="p">{p(11)}</span></li>
<li><span class="n">12</span><span class="t">Cumplimiento de los pedidos</span><span class="p">{p(12)}</span></li>
<li><span class="n">13</span><span class="t">Limitaciones, riesgos y trabajo futuro</span><span class="p">{p(13)}</span></li>
<li><span class="n">A</span><span class="t">Glosario</span><span class="p">{p("glosario")}</span></li>
<li><span class="n">B</span><span class="t">Referencias</span><span class="p">{p("refs")}</span></li>
<li><span class="n">C</span><span class="t">Estructura del repositorio y comandos</span><span class="p">{p("anexo")}</span></li></ol>
<div class="caja-clave" style="margin-top:12mm"><b>Cómo leer este documento.</b>
<ul>
<li><b>Capítulos 1 a 4:</b> qué es el sistema, en qué se apoya y cómo está armado.</li>
<li><b>Capítulos 5 a 7:</b> cómo se calcula cada resultado, con sus ecuaciones y unidades.</li>
<li><b>Capítulo 8:</b> qué tan bien funciona, medido contra datos reales.</li>
<li><b>Capítulos 9 y 10:</b> qué hace la aplicación y cómo se la controla.</li>
<li><b>Capítulos 11 y 12:</b> el registro de lo hecho, con las decisiones y los errores.</li>
<li><b>Capítulo 13:</b> lo que falta.</li>
</ul>
Cada modelo termina con un recuadro «Alcance y validez»: qué pregunta responde, a qué escala, con qué precisión medida y qué no afirma.</div></section>''',

1: f'''<section><h1><span class="num">Capítulo 1</span>Introducción, objetivos y alcance</h1>
<h2><span class="n">1.1</span>Contexto</h2>
<p>El Niño es la fase cálida del ciclo El Niño–Oscilación del Sur. En la Argentina suele asociarse a lluvias por encima de lo normal en el Litoral y la región pampeana y a crecidas de los grandes ríos con semanas de retraso (Camilloni y Barros, 2000; Lovino y otros, 2018). En 2026 el fenómeno está en curso y el Servicio Meteorológico Nacional estima efectos al menos hasta abril de 2027. Por eso es útil una herramienta que muestre, para cada lugar, cuánto riesgo hay, por qué y qué conviene hacer.</p>
<p>La información pública para responder esa pregunta existe, pero está dispersa en decenas de fuentes con formatos, coberturas y frecuencias distintas: pronósticos meteorológicos, alturas de ríos, el Censo 2022, relieve, imágenes satelitales e infraestructura. El proyecto reúne esas fuentes en un solo modelo de datos, calcula un índice comparable entre municipios y permite repetir en cualquier punto las tormentas que de verdad ocurrieron en los Niños anteriores.</p>
<h2><span class="n">1.2</span>Objetivos</h2>
<ul><li><b>General.</b> Estimar y comunicar el riesgo de inundación de cada gobierno local y cada radio censal del país durante El Niño 2026–27, de forma verificable y actualizada.</li>
<li><b>Específicos.</b>
<ol type="a">
<li>Integrar las fuentes públicas en una arquitectura por capas reproducible.</li>
<li>Calcular el riesgo de hoy y de cada uno de los próximos 14 días con estructura estándar y umbrales físicos, y medir su robustez.</li>
<li>Anticipar crecidas de ríos a partir de caudales pronosticados.</li>
<li>Ofrecer un simulador de lluvia y escurrimiento sobre relieve real, con escenarios que repitan tormentas y crecidas reales, y una simulación de los próximos 15 días que arranque de las condiciones de hoy.</li>
<li>Elegir cada fuente midiendo su error contra observaciones independientes.</li>
<li>Medir qué tan bien funciona el simulador y decirlo en la propia aplicación.</li>
<li>Mantener todo gratuito, abierto y en dos idiomas.</li>
</ol></li></ul>
<h2><span class="n">1.3</span>Alcance y exclusiones</h2>
<p>El alcance cubre solo la Argentina y solo el riesgo de <b>inundación</b>. Por decisión de la autora quedaron pospuestos el dengue (hay un modelo documentado, no incluido en el índice), el impacto agrícola y la capa social de respuesta (albergues, donaciones, comedores). Tampoco se pretende reemplazar a los sistemas de alerta oficiales: el sitio lo aclara en cada pantalla.</p>
<h2><span class="n">1.4</span>Usuarios previstos</h2>
<table><thead><tr><th>Usuario</th><th>Qué necesita</th><th>Cómo lo resuelve el sistema</th></tr></thead><tbody>
<tr><td>Vecina o vecino</td><td>Saber si su zona es riesgosa y qué hacer</td><td>Buscador de direcciones, barrios y empresas; indicadores del círculo elegido; «Situación» y «Qué hacer»</td></tr>
<tr><td>Equipos municipales y de Defensa Civil</td><td>Priorizar zonas y personas expuestas, con tiempo para prepararse</td><td>«Qué cambia en los próximos días» (zonas que suben de nivel, cuándo y por qué); rankings; simulador con el peor Niño del lugar y con el pronóstico, calles cortadas y centros de salud sin acceso</td></tr>
<tr><td>Empresas e industrias</td><td>Saber si su predio junta agua</td><td>Buscador de plantas y sedes; propensión a juntar agua; indicador de industrias con agua en el simulador</td></tr>
<tr><td>Periodistas y público general</td><td>Entender el panorama del país</td><td>Lámina «Panorama y mapa», gráfico «Riesgo día por día», inundación de hoy por satélite, recorrido guiado</td></tr>
<tr><td>Colegas técnicos y comunidad de datos</td><td>Evaluar y reutilizar la metodología</td><td>Fórmulas con unidades, validaciones publicadas, trabajos de referencia y repositorio abierto</td></tr></tbody></table>
<h2><span class="n">1.5</span>Alcance de cada producto</h2>
<p>Cada resultado responde a una pregunta distinta, a una escala distinta y con una precisión distinta. La tabla los separa para que ninguno se lea como más de lo que es.</p>
<div class="tabla-t">Tabla 1. Productos del sistema: pregunta, escala, precisión medida y lo que no afirman</div>
<table><thead><tr><th>Producto</th><th>Pregunta que responde</th><th>Escala y horizonte</th><th>Precisión medida</th><th>Lo que no afirma</th></tr></thead><tbody>
<tr><td>Riesgo por día</td><td>¿Dónde y cuándo hay riesgo en las próximas dos semanas?</td><td>Municipio y radio censal; hoy y 14 días</td><td>Sin verificar todavía: cada corrida se archiva para compararla con lo ocurrido; robustez de pesos por Monte Carlo</td><td>Daños, pérdidas ni que un barrio se inunde en una fecha</td></tr>
<tr><td>Propensión a juntar agua</td><td>¿Es un lugar que junta agua, aunque hoy no haya amenaza?</td><td>Municipio; fija</td><td>Umbrales físicos explícitos (tabla 3)</td><td>Los desagües de un predio o de una calle</td></tr>
<tr><td>Crecida de ríos</td><td>¿Qué probabilidad hay de superar alerta o evacuación?</td><td>43 estaciones del INA; 15 días (y 7 meses para los escenarios)</td><td>Error medio verificado de {n2(V["verif"]["rio_error"])} m</td><td>Ríos sin estación (noroeste, Cuyo, Patagonia)</td></tr>
<tr><td>Tiempo a 16 días</td><td>¿Cuánto va a llover, soplar y hacer calor?</td><td>Grilla de 0,5°; 16 días</td><td>Correlación {n2(V["verif"]["c03"])} a 0–3 días; {n2(V["verif"]["c815"])} a 8–15 días</td><td>Tormentas de una hora en un barrio</td></tr>
<tr><td>Simulador 3D</td><td>Con esta lluvia y este río, ¿dónde se junta el agua?</td><td>Círculo de 0,5 a 20 km; celdas de 32 m hasta 1,5 km de radio, que se duplican por tramo; horas a días</td><td>Río: acierto {pc(R["ahora"]["pod"])} contra el radar; agua de semanas: CSI {n2(D["csi"])}</td><td>El anegamiento urbano de pocas horas (no validable con satélites); la red pluvial real</td></tr>
<tr><td>Escenarios de los Niños</td><td>¿Qué pasaría hoy con la peor tormenta de cada Niño?</td><td>Celda de 0,1° (~11 km); Niños desde 1997–98</td><td>Tormentas de 100 mm o más: {pc(L["imerg_100"]["mediana_cociente"])} de lo medido, error {pc(L["imerg_100"]["error_mediano"])}</td><td>La lluvia exacta de una manzana; los picos de minutos</td></tr>
<tr><td>Peor Niño (fórmula)</td><td>¿Cuál de esos Niños dejó a más personas con agua?</td><td>El mismo círculo; estimación estática</td><td>Río: igual al modelo 3D en equilibrio; lluvia: sin validar contra daños reales</td><td>Cuántas personas se inundaron de verdad</td></tr>
<tr><td>Simulación del pronóstico</td><td>Con lo que ya llovió y lo que se pronostica, ¿dónde va a haber agua?</td><td>El mismo círculo; 14 días pasados y 15 de pronóstico</td><td>Lluvia pronosticada: correlación {n2(V["verif"]["c03"])} a 0–3 días y {n2(V["verif"]["c815"])} a 8–15 días</td><td>La lluvia de cada hora más allá de una semana; el río más allá de su altura de hoy</td></tr></tbody></table></section>''',

2: f'''<section><h1><span class="num">Capítulo 2</span>Marco conceptual y antecedentes</h1>
<p>Antes de cambiar el modelo se revisaron trabajos de otros autores que estudiaron y midieron problemas parecidos, no solo para El Niño. Los 17 trabajos de acceso abierto se guardaron en la carpeta del proyecto; su índice, con la cita, el enlace y qué aporta cada uno, está en <code>docs/03_investigacion_trabajos.md</code>. Este capítulo resume los conceptos que se usan después.</p>
<h2><span class="n">2.1</span>Riesgo, amenaza, exposición y vulnerabilidad</h2>
<p>El riesgo no depende solo de que ocurra un fenómeno (amenaza), sino de cuánta gente y bienes están en su camino (exposición) y de cuán capaces son de resistirlo y recuperarse (vulnerabilidad). El índice INFORM de la Comisión Europea (Marin-Ferrer y otros, 2017) combina los tres componentes, en escala 0 a 10, con una media geométrica: un componente muy bajo reduce el riesgo total y ninguno puede compensarse por completo con otro.</p>
<h2><span class="n">2.2</span>Tres maneras en que una zona se inunda</h2>
<table><thead><tr><th>Tipo</th><th>Qué ocurre</th><th>Dónde pesa más</th><th>Datos clave</th></tr></thead><tbody>
<tr><td>Pluvial o urbana</td><td>La lluvia supera lo que el suelo absorbe y los desagües evacúan; el agua se junta en los bajos</td><td>Áreas urbanas llanas: Gran Buenos Aires, La Plata, ciudades del Litoral</td><td>Relieve, suelo, impermeabilización, lluvia hora a hora</td></tr>
<tr><td>Fluvial</td><td>Un río grande crece y desborda con días o semanas de retraso respecto de la lluvia</td><td>Paraná, Paraguay, Uruguay y afluentes</td><td>Caudales (GloFAS), alturas (INA), niveles de alerta y evacuación</td></tr>
<tr><td>Repentina de quebrada</td><td>Una tormenta en la sierra genera una crecida en minutos aguas abajo</td><td>Noroeste y Cuyo</td><td>Pendiente, arcilla, lluvia</td></tr></tbody></table>
<h2><span class="n">2.3</span>Inundación compuesta: lluvia y río al mismo tiempo</h2>
<p>Cuando llueve fuerte con el río alto, el agua de la lluvia no puede salir y la inundación es mayor que la suma de las dos por separado. Ward y otros (2018) mostraron que en muchos deltas el río alto y el mar alto coinciden más seguido de lo que daría el azar, y que tratarlos por separado subestima la amenaza. Couasnon y otros (2020) miden ese potencial emparejando los dos extremos <b>dentro de una ventana de tiempo corta</b>. En el Delta del Paraná el nivel resulta del caudal del Paraná y del Río de la Plata, con su marea y la sudestada (Re y otros, 2015; Guizzardi y otros, 2025).</p>
<p>La consecuencia para este proyecto es directa: un escenario que combine la peor lluvia de un Niño con la crecida máxima de toda la temporada, que pudo ocurrir meses después, no ocurrió nunca. Quien vivió ese año en el lugar lo notaría. Por eso el simulador toma el río <b>de los días de la tormenta</b> (sección 6.5).</p>
<h2><span class="n">2.4</span>Escorrentía: el método del Número de Curva</h2>
<p>El método del Número de Curva (CN) del Servicio de Conservación de Recursos Naturales de EE. UU. (USDA-NRCS, 2004) estima la lámina que escurre, Q, a partir de la lluvia de la tormenta, P, y de la retención potencial del suelo, S, que depende del tipo de suelo, de su uso y de su humedad previa. La forma clásica supone que antes de escurrir se pierde una abstracción inicial I<sub>a</sub> = λ·S con λ = 0,20. Hawkins y otros (2002), con datos de 134 cuencas, encontraron una mediana de λ = 0,048 y propusieron λ = 0,05, con la conversión S<sub>0,05</sub> = 1,33·S<sub>0,20</sub><sup>1,15</sup> (S en pulgadas). Con λ = 0,20, las lluvias moderadas escurren de menos.</p>
<p>La humedad previa se representa con tres condiciones antecedentes: seco (CN I), medio (CN II) y saturado (CN III), con las conversiones de Chow y otros (1988). Brocca y otros (2009) mostraron que la retención S disminuye en forma <b>lineal</b> con el grado de saturación del suelo medido. Esa es la base para interpolar S entre las tres condiciones según la humedad relativa del lugar.</p>
<h2><span class="n">2.5</span>Dónde se junta el agua: bajos, llenado y desborde</h2>
<p>Para estimar rápido dónde se acumula la lluvia sin resolver las ecuaciones del flujo, se usan métodos de «llenado y desborde» sobre el modelo de elevación:</p>
<ul>
<li>Se rellenan las depresiones del terreno desde los bordes y desde el agua, siempre por el punto más bajo (algoritmo <i>priority-flood</i> de Barnes y otros, 2014).</li>
<li>Cada hueco es un bajo que guarda agua hasta el nivel por donde desborda.</li>
<li>Safer_RAIN (Samela y otros, 2020) aplica la idea a ciudades enteras.</li>
<li>Seleem y otros (2021), en Berlín, compararon estos métodos con un modelo hidrodinámico 2D: ubican bien los bajos, pero no reproducen bien la profundidad ni la dinámica. Por eso aquí se usan solo para <b>comparar escenarios entre sí</b>, nunca como reemplazo del modelo 2D.</li>
<li>La altura sobre el cauce (HAND) sirve para las crecidas de ríos, pero su acierto depende mucho de la calidad del relieve y no representa los charcos de lluvia lejos de un cauce (Aristizabal y otros, 2024).</li>
</ul>
<h2><span class="n">2.6</span>Modelación hidráulica</h2>
<p>Las ecuaciones de aguas poco profundas describen cómo se mueve una lámina de agua sobre el terreno. La formulación inercial local de Bates y otros (2010) elimina el término de transporte convectivo de la cantidad de movimiento y conserva la inercia. Así permite pasos de tiempo mayores sin perder la dinámica principal de una inundación. Es la base de modelos de uso profesional como LISFLOOD-FP. La infiltración se modela con Green y Ampt (1911), con parámetros por textura del suelo (Rawls y otros, 1983).</p>
<h2><span class="n">2.7</span>Lluvia en un punto y lluvia en un área</h2>
<p>Una tormenta convectiva descarga la mayor parte de su agua en pocos kilómetros: la lluvia promedio de un área es menor que la de un pluviómetro en su centro (Bonilla, 2016). Los productos grillados (reanálisis y satélites) dan promedios de celdas de 10 a 30 km y, por lo tanto, <b>suavizan los picos cortos</b>. Benítez y otros (CONGREMET XV) y Soto-Escobar y otros (2026) lo midieron al construir curvas intensidad-duración-frecuencia con estos productos. El efecto se ve con claridad en los datos del proyecto:</p>
<ul>
<li>El 2 de abril de 2013 cayeron 392 mm en La Plata. El reanálisis ERA5 da 13 mm ese día; el satélite IMERG, 87 mm.</li>
<li>En el temporal del 16 al 18 de mayo de 2025, ERA5 dio en Zárate y Campana entre 68 y 78 mm, cuando se informaron más de 300 mm.</li>
</ul>
<h2><span class="n">2.8</span>Métricas de validación</h2>
<p>Para comparar mapas de agua celda por celda se usan:</p>
<ul>
<li><b>POD</b> (aciertos / agua observada): qué parte del agua observada acierta el modelo.</li>
<li><b>FAR</b> (falsas alarmas / agua simulada): qué parte del agua simulada no estaba.</li>
<li><b>CSI</b> (aciertos / (aciertos + falsas alarmas + faltantes)): de 0 a 1. Valores de 0,4 a 0,7 son habituales en modelos globales validados contra mapas satelitales de crecidas (Sadana y otros, 2025).</li>
<li><b>Error mediano y cociente mediano</b> (fuente / medido) para la lluvia: son robustos frente a valores extremos.</li>
</ul>
<p>Los mapas ópticos (Dynamic World) no ven el agua bajo las nubes ni bajo la vegetación. El radar (Sentinel-1; Torres y otros, 2012) sí, pero ve mal el agua entre edificios (Mukherjee y otros, 2024).</p>
<div class="decision"><b>Decisión de diseño</b>Se mantiene un modelo 2D inercial ejecutado en el navegador (sin servidor propio) y se agrega un método estático rápido solo para ordenar los Niños. El primero da la dinámica en cualquier punto del país en segundos; el segundo permite comparar nueve tormentas en milisegundos. Un modelo hidrodinámico calibrado tendría más fidelidad, pero necesita datos locales de drenaje que, fuera de la Ciudad de Buenos Aires, no están disponibles.</div></section>''',

3: f'''<section><h1><span class="num">Capítulo 3</span>Datos: fuentes, cobertura y actualización</h1>
<p>Todas las fuentes son públicas y gratuitas. La interfaz las clasifica en seis tipos, con etiquetas de color: <b>observado</b>, <b>pronóstico</b>, <b>histórico</b>, <b>estimación propia</b>, <b>simulación</b> y <b>referencia</b>. La regla de oro es que una estimación o una simulación nunca se presenta como una medición.</p>
<div class="tabla-t">Tabla 2. Fuentes principales por tipo de dato</div>
<table><thead><tr><th>Fuente</th><th>Aporta</th><th>Tipo</th><th>Actualización</th></tr></thead><tbody>
<tr><td>Open-Meteo (modelos ECMWF y otros)</td><td>Lluvia, viento, ráfagas y temperatura a 16 días; humedad del suelo de hoy</td><td>Pronóstico</td><td>2 veces por día</td></tr>
<tr><td>SMN (alertas CAP)</td><td>Alertas vigentes con nivel y vencimiento</td><td>Observado</td><td>Cada 3 horas</td></tr>
<tr><td>Ensamble del ECMWF (IFS, datos abiertos, CC BY 4.0)</td><td>Lluvia diaria de 50 pronósticos a 15 días, celdas de 0,25°: base del riesgo por día</td><td>Pronóstico</td><td>2 veces por día</td></tr>
<tr><td>ECMWF SEAS5 vía Open-Meteo</td><td>Lluvia mensual esperada a 6 meses por municipio (referencia del simulador; ya no entra al riesgo)</td><td>Pronóstico</td><td>Mensual (día 6)</td></tr>
<tr><td>INA (sistema de alerta, API a5)</td><td>Alturas de ríos en 175 estaciones con niveles de alerta y evacuación; lluvia diaria de 366 pluviómetros (red RHN-SAT, desde 2019)</td><td>Observado</td><td>Diaria</td></tr>
<tr><td>GloFAS v4 (Copernicus) vía Open-Meteo</td><td>Ensamble de 51 caudales a 15 días (riesgo por día); pronóstico a 7 meses; reanálisis diario desde 1997</td><td>Pronóstico / histórico</td><td>2 veces por día / semanal</td></tr>
<tr><td>IMERG V07 Final (NASA) en Earth Engine</td><td>Lluvia de satélites calibrada con pluviómetros, celdas de 0,1° cada 30 minutos, desde junio de 2000</td><td>Histórico</td><td>Precalculada</td></tr>
<tr><td>ERA5 y ERA5-Land (ECMWF)</td><td>Reanálisis horario: lluvia (forma de cada tormenta, Niños antes de 2000), humedad del suelo y la lluvia de 3 días de 2, 5 y 10 años de cada celda (1995–2024)</td><td>Histórico</td><td>Al usar / precalculada</td></tr>
<tr><td>GHCN-Daily (NOAA)</td><td>Lluvia diaria de 75 estaciones argentinas (validación)</td><td>Observado</td><td>Fijo</td></tr>
<tr><td>Sentinel-1 (ESA) en Earth Engine</td><td>Radar que ve el agua a través de las nubes: validación del río y agua de hoy para la simulación del pronóstico</td><td>Observado</td><td>Cada 3 horas (en revisión)</td></tr>
<tr><td>MODIS (NASA LANCE, vía GIBS)</td><td>Inundación de hoy y de ayer vista por satélite, 250 m (capa del mapa)</td><td>Observado</td><td>Diaria</td></tr>
<tr><td>INDEC, Censo 2022</td><td>Población, cloacas, NBI y vivienda en 66.515 radios censales</td><td>Histórico</td><td>Fijo</td></tr>
<tr><td>MERIT Hydro, Copernicus DEM, FABDEM</td><td>Altura sobre el cauce (HAND), pendiente y relieve de 30 m sin edificios ni árboles en 20 ciudades</td><td>Histórico</td><td>Fijo</td></tr>
<tr><td>JRC Global Surface Water y Dynamic World</td><td>Frecuencia de agua 1984–2021 y agua observada en los Niños 2015–16 y 2023–24</td><td>Histórico</td><td>Fijo</td></tr>
<tr><td>MapBiomas, SoilGrids 2.0, OpenLandMap</td><td>Superficie construida y humedales; textura del suelo y arcilla</td><td>Histórico</td><td>Anual / fijo</td></tr>
<tr><td>RENABAP, IGN, OpenStreetMap</td><td>Barrios populares, límites y localidades, infraestructura crítica, calles y agua</td><td>Referencia</td><td>Fijo / descarga propia</td></tr>
<tr><td>Photon, Nominatim, Georef y TomTom Search</td><td>Búsqueda de direcciones, lugares y empresas (TomTom: 2.500 consultas diarias gratis)</td><td>Referencia</td><td>Al usar</td></tr>
<tr><td>Cálculo propio</td><td>Riesgo por día, propensión, probabilidades de crecida, tormentas de los Niños, simulador</td><td>Estimación / simulación</td><td>2 veces por día / al usar</td></tr></tbody></table>
{fig(F["cobertura"], 1, "Cobertura de los datos principales sobre los 2.282 gobiernos locales. Los datos de ríos con niveles de alerta existen solo en el Litoral y el Área Metropolitana; el noroeste, Cuyo y la Patagonia no tienen estaciones con alerta definida.")}
<h2><span class="n">3.1</span>La lluvia de las tormentas históricas: por qué IMERG</h2>
<p>Las versiones anteriores tomaban la lluvia de los Niños del reanálisis ERA5. La validación del capítulo 8, con {L["tormentas"]} tormentas medidas en {L["pluviometros"]} pluviómetros, mostró que ERA5 se queda con el {pc(L["era5_100"]["mediana_cociente"])} de las tormentas de 100 mm o más. Para las mismas tormentas, IMERG da el {pc(L["imerg_100"]["mediana_cociente"])}, con la mitad del error que el promedio de las dos fuentes.</p>
<ul>
<li><b>Desde 2000:</b> IMERG es la fuente.</li>
<li><b>1997–98:</b> no había IMERG y se usa ERA5-Land, marcado en pantalla.</li>
<li><b>Niños anteriores a 1997:</b> solo figuran en un cuadro informativo, con ERA5 y sin caudal de ríos.</li>
</ul>
<h2><span class="n">3.2</span>Datos que faltan y cómo se tratan</h2>
<p>En lugar de inventar un valor, el sistema usa sustitutos explícitos y escribe «Sin información» o «sin dato» cuando no hay dato.</p>
<ul>
<li><b>Red pluvial.</b> No hay una red pluvial pública fuera de la Ciudad de Buenos Aires. Los desagües se dimensionan con la lluvia de 1 hora que se supera una vez cada 2 años en el lugar (sección 6.6).</li>
<li><b>Curvas de diseño locales.</b> No hay curvas intensidad-duración-frecuencia públicas para la mayoría de las ciudades, ni estaciones del SMN en Zárate o Campana.</li>
<li><b>Estaciones de NOAA.</b> A las estaciones argentinas de GHCN-Daily les faltan muchos días después de 2005: vienen de mensajes SYNOP incompletos. Solo se usan las temporadas con 90 % de días medidos.</li>
<li><b>Ríos.</b> Si una estación no tiene altura ni estimación para los días de una tormenta, esa tormenta queda «sin dato del río».</li>
</ul>
<h2><span class="n">3.3</span>Actualización automática</h2>
<p>Una única automatización de GitHub Actions orquesta la ingesta:</p>
<ul>
<li>alertas del SMN cada 3 horas;</li>
<li>alturas de ríos y pronóstico de 16 días a diario;</li>
<li>la grilla del tiempo y el riesgo de hoy y de los próximos 14 días a las 05:20 y las 17:20 (hora argentina);</li>
<li>el agua de hoy vista por radar, con las alertas;</li>
<li>GloFAS a 7 meses los lunes y SEAS5 el día 6 de cada mes.</li>
</ul>
<p>GitHub ejecuta las tareas programadas con horas de atraso (la de las 05:20 suele correr cerca del mediodía), por eso cada capa muestra en pantalla la fecha y hora de su dato. Los pasos que dependen de servicios externos dejan su resultado en <code>data/archivo/diagnostico/</code>, que se sube con los datos. Después de cada ingesta se recalcula el índice y se regeneran los archivos que lee la web. Las tormentas de los Niños, los desagües de 2 años y las alturas diarias de los ríos en cada temporada son datos fijos y se precalculan una sola vez (sección 4.3).</p></section>''',

4: f'''<section><h1><span class="num">Capítulo 4</span>Arquitectura del sistema</h1>
{fig(F["arquitectura"], 2, "Flujo de datos de punta a punta: de las fuentes públicas a la web publicada. El procesamiento pesado ocurre fuera del navegador (Python, SQL y Earth Engine); el simulador es lo único que se calcula en el navegador.")}
<h2><span class="n">4.1</span>Capas de datos (medallón)</h2>
<p>El modelo de datos sigue una arquitectura de tres capas:</p>
<ul>
<li><b>Bronze:</b> lo descargado, tal cual.</li>
<li><b>Silver:</b> lo limpio, con claves comunes (códigos de gobierno local y de radio censal).</li>
<li><b>Gold:</b> los resultados finales: el índice por municipio (exposición, vulnerabilidad y propensión), el riesgo por día, las probabilidades de crecida y las verificaciones.</li>
</ul>
<p>Las capas se construyen con SQL y se validaron con DuckDB en forma local, con resultados idénticos a los de Python en los componentes de exposición y vulnerabilidad. La ejecución en Databricks quedó preparada y pendiente del inicio de sesión de la autora.</p>
<h2><span class="n">4.2</span>Aplicación web</h2>
<p>La interfaz es una aplicación estática con MapLibre GL como única librería de mapas, más maplibre-contour para las curvas de nivel y three.js, que se carga solo con la maqueta 3D. Se organiza en tres láminas (Panorama y mapa · Simulador 3D · Análisis y validación) y en módulos de responsabilidad única. Los cambios visuales siguen una guía de diseño propia (retícula de 8 px, filetes de 1 px, cifras en tipografía monoespaciada, el semáforo reservado para el nivel de riesgo y una revisión de cinco puntos antes de publicar: <code>docs/05_constitucion_grafica.md</code>).</p>
<table><thead><tr><th>Módulo</th><th>Responsabilidad</th></tr></thead><tbody>
<tr><td><code>textos.js</code></td><td>Todos los textos en español e inglés; los que dependen de datos son funciones</td></tr>
<tr><td><code>utiles.js</code>, <code>graficos.js</code></td><td>Formatos, geometría, íconos y gráficos propios en SVG, sin librerías</td></tr>
<tr><td><code>tiempo.js</code></td><td>Campos del tiempo, partículas de viento y miniaturas</td></tr>
<tr><td><code>mapa.js</code>, <code>buscador.js</code>, <code>claves.js</code></td><td>Mapa, capas, curvas de nivel con altura; búsqueda de provincia, partido, localidad, dirección, barrio popular, empresa (TomTom y lugares cargados a mano, como refinerías y plantas) o coordenadas</td></tr>
<tr><td><code>tableros.js</code>, <code>laminas.js</code>, <code>guia.js</code></td><td>Tablero de cada capa, «Qué cambia en los próximos días» y análisis; las tres láminas y el cuadro de detalle; encabezado, gráfico «Riesgo día por día», fuentes por tipo y recorrido guiado</td></tr>
<tr><td><code>app.js</code></td><td>Estado, riesgo por día (armado con el archivo diario y los rasgos fijos), indicadores del círculo elegido, fechas y línea de tiempo</td></tr>
<tr><td><code>modelo_inundacion.js</code>, <code>hidraulica.js</code>, <code>simulador.js</code></td><td>Datos del lugar y base de tormentas de los Niños; motor hidráulico (en un Web Worker); escenario, peor Niño y maqueta 3D</td></tr></tbody></table>
<h2><span class="n">4.3</span>Datos precalculados del simulador</h2>
<p>Para que el simulador responda en segundos en cualquier punto, lo que no cambia se calcula una sola vez:</p>
<ul>
<li><code>earth_engine/lluvia_ninos.py</code> calcula en Earth Engine, para cada celda de 0,1° de la Argentina y cada Niño desde 1997–98, la peor tormenta de 3 días, su total, su hora más lluviosa y la de la temporada, y la lluvia de 1 hora de 2 años. Se guarda en {V["teselas"]} teselas binarias de 2° × 2° ({V["teselas_mb"]} MB en total); la web baja solo la del punto.</li>
<li><code>earth_engine/umbrales_lluvia.py</code> calcula, para cada celda de 0,1°, la lluvia de 3 días seguidos que se supera una vez cada 2, 5 y 10 años, con los máximos anuales de ERA5-Land de 1995 a 2024 y un ajuste de Gumbel. El riesgo por día compara el pronóstico con esos umbrales.</li>
<li><code>web/preparar_rios_ninos.py</code> guarda, por estación, la altura de cada día de octubre a mayo de cada Niño: medida por el INA cuando existe y, si no, estimada con GloFAS y la curva caudal-altura de la estación.</li>
</ul>
<h2><span class="n">4.4</span>Publicación y costo</h2>
<p>El sitio público se publica automáticamente en Cloudflare Workers con cada cambio en el repositorio (unas 11 publicaciones por día frente a un cupo gratuito de 500 por mes). No hay base de datos ni servidor propios: el costo operativo es nulo.</p></section>''',

5: f'''<section><h1><span class="num">Capítulo 5</span>Modelos analíticos del riesgo</h1>
<h2><span class="n">5.1</span>Riesgo de inundación de hoy y de los próximos 14 días</h2>
{fig(F["indice"], 3, "Estructura del riesgo por día. Cada componente se expresa de 0 a 10; el riesgo es la raíz cúbica de su producto.")}
<div class="formula">Riesgo = ∛( Amenaza × Exposición × Vulnerabilidad )<span class="eq">(1)</span></div>
<p><b>Escala física.</b> Cada indicador x se lleva a 0–1 con dos umbrales fijos en sus propias unidades: u(x) = clip((x − x<sub>0</sub>) / (x<sub>1</sub> − x<sub>0</sub>); 0; 1), donde x<sub>0</sub> es el valor que vale 0 y x<sub>1</sub> el que vale 1. Las versiones anteriores usaban rangos entre municipios: con ellos, siempre había un 10 % «muy alto» aunque el país entero estuviera seco.</p>
<div class="tabla-t">Tabla 3. Umbrales físicos de cada indicador</div>
<table><thead><tr><th>Indicador</th><th class="num">Vale 0</th><th class="num">Vale 1</th><th>Justificación del umbral de 1</th></tr></thead><tbody>
<tr><td>Superficie con agua alguna vez, 1984–2021 (JRC)</td><td class="num">0 %</td><td class="num">10 %</td><td>Fuera de los cauces chicos, 10 % del territorio ya es una llanura inundable</td></tr>
<tr><td>Agua nueva en los Niños 2015–16 y 2023–24 (Dynamic World)</td><td class="num">0 %</td><td class="num">5 %</td><td>5 % es una inundación regional; en el Litoral 2015–16 hubo de 10 a 47 %</td></tr>
<tr><td>Superficie a menos de 2 m sobre el cauce (HAND)</td><td class="num">0 %</td><td class="num">100 %</td><td>Rango natural</td></tr>
<tr><td>Arcilla del suelo</td><td class="num">10 %</td><td class="num">40 %</td><td>De franco-arenoso a arcilloso</td></tr>
<tr><td>Personas en terreno bajo (log₁₀)</td><td class="num">1</td><td class="num">100.000</td><td>Las mayores ciudades del Litoral</td></tr>
<tr><td>Proporción de la población en terreno bajo</td><td class="num">0 %</td><td class="num">100 %</td><td>Rango natural</td></tr>
<tr><td>Hogares sin cloaca · materiales deficientes</td><td class="num">0 %</td><td class="num">100 %</td><td>Rango natural</td></tr>
<tr><td>Hogares con NBI</td><td class="num">0 %</td><td class="num">25 %</td><td>El país tiene 6,5 %; los peores municipios, 30 a 50 %</td></tr>
<tr><td>Barrios populares cada 10.000 habitantes</td><td class="num">0</td><td class="num">10</td><td>Valor extremo elegido: por encima, la vulnerabilidad por este indicador se considera completa</td></tr></tbody></table>
<p><b>Amenaza del día.</b> Combina la amenaza fija del lugar con la pronosticada para ese día, con la regla multi-amenaza de INFORM, de modo que cualquiera de las dos que sea alta eleva el total sin pasar de 10:</p>
<div class="formula">H<sub>d</sub> = 10 − ( 10 − H<sub>fija</sub> ) · ( 10 − H<sub>pron,d</sub> ) / 10<span class="eq">(1b)</span></div>
<ul><li><i>Amenaza fija</i>: el agua en superficie y las quebradas con lluvia normal (factor f = 0,5), combinadas con la misma regla. Agua en superficie = 10 × P × f, donde la propensión P es el promedio de u(agua alguna vez), u(agua en los Niños) y u(superficie a menos de 2 m del cauce). Quebradas = 10 × s × f × (½ + ½ u(arcilla)), con s = clip((pendiente p90 − 5°) / 20°; 0; 1). Gracias a ella, un lugar que junta agua nunca da riesgo 0, aunque ese día no haya amenaza pronosticada.</li>
<li><i>Amenaza pronosticada</i>: un nivel de 0 a 3, que vale 0, 4, 7 o 10, el mayor de tres:
<ul>
<li><b>Lluvia.</b> Para cada uno de los 50 pronósticos del ensamble del ECMWF se suma la lluvia de los 3 días que terminan ese día y se compara con la que en ese lugar se supera una vez cada 2, 5 y 10 años. Esos umbrales salen del clima del mismo centro (ERA5-Land, 1995–2024), como hace el ECMWF con su índice de pronósticos extremos: comparar el modelo con su propio clima evita exagerar o achicar las probabilidades. Nivel 1, 2 o 3 si al menos el 30 % de los pronósticos supera la lluvia de 2, 5 o 10 años; es el criterio con que el sistema europeo de alerta de inundaciones avisa una crecida. Donde el terreno casi no junta agua (P &lt; 0,15), un nivel menos.</li>
<li><b>Ríos.</b> Los 51 pronósticos de caudal de GloFAS se pasan a altura con la curva de cada estación (5.2). Nivel 1 si el 30 % llega a alerta, 2 si el 30 % llega a evacuación y 3 si el 70 % llega a evacuación. Hoy manda la altura medida por el INA. El nivel vale completo hasta 15 km de la estación y uno menos entre 15 y 30 km.</li>
<li><b>Alertas del SMN</b> por tormentas o lluvias que cubren el lugar, mientras están vigentes: amarilla 1, naranja 2, roja 3. Las de calor, viento, nieve o zonda no cuentan.</li>
</ul></li></ul>
<div class="formula">x<sub>T</sub> = μ − σ · (√6 / π) · ( 0,5772 + ln( −ln( 1 − 1/T ) ) )<span class="eq">(1c)</span></div>
<p>La ecuación 1c es el ajuste de Gumbel por momentos: μ y σ son la media y el desvío de los 30 máximos anuales de la lluvia de 3 días de cada celda, y T el período de retorno en años. La lluvia de 2 años es casi la mediana de esos máximos.</p>
<p><b>Exposición</b> = 10 × promedio de u(log₁₀ de los habitantes en terreno bajo) y u(su proporción). Un radio censal está en terreno bajo si más de la mitad de su superficie está a menos de 2 m sobre el curso de agua más cercano. El Censo cuenta dónde vive la gente, no dónde trabaja. <b>Vulnerabilidad</b> = 10 × promedio de u(sin cloaca), u(NBI), u(materiales deficientes) y u(barrios populares por habitante).</p>
<p>Con un punto elegido, los indicadores de la lámina 01 se calculan con los radios censales dentro del círculo, ponderados por población: riesgo = ∛(H<sub>d</sub> del municipio × exposición del radio × vulnerabilidad del radio).</p>
<p><b>Propensión a juntar agua.</b> Es la misma amenaza fija con f = 1, de 0 a 10, y se muestra como subindicador con su propio semáforo, debajo del riesgo y en «Qué lo explica». No depende del pronóstico: un lugar puede tener hoy riesgo verde y propensión amarilla o roja. {V["diario"]["prop_alta"]} municipios tienen propensión alta o muy alta.</p>
<p><b>Qué cambia en los próximos días.</b> Para cada municipio se compara el nivel de riesgo de hoy con el mayor de los próximos 3, 7 o 14 días, a elección. Se listan los que suben (con el día en que llegan, la amenaza que manda y su probabilidad), los que siguen en riesgo alto y los que bajan. Cada uno lleva una recomendación armada con sus datos: la amenaza y la fecha límite, y si corresponde, la parte de la población en terreno bajo o sin cloaca. Un gráfico de columnas muestra, para cada día, qué parte de la superficie queda en cada nivel; al tocar una columna el mapa se pinta con ese día.</p>
<p>Con el cálculo del {V["diario"]["fecha"]}, hoy {V["diario"]["hoy_alto"]} municipios están en riesgo alto o muy alto, y el día más comprometido de las dos semanas es el {V["diario"]["dia_pico"]}, con {V["diario"]["n_pico"]}.</p>
<div class="nota"><b>Por qué se dejó el riesgo mensual.</b> La versión anterior combinaba la propensión con el pronóstico estacional de lluvia (SEAS5) mes a mes, de octubre a abril. La autora lo descartó: la lluvia de un mes no se puede pronosticar con una precisión útil, y la verificación propia lo confirma (5.4). Ese cálculo se sigue haciendo solo para producir la exposición, la vulnerabilidad y la propensión de cada municipio.</div>
<div class="nota"><b>Error corregido en esta versión.</b> Al pasar a días, la primera versión tomaba la amenaza pronosticada sola: sin pronóstico, el riesgo daba 0,0 incluso en lugares que se inundan, como el predio de Toyota Boshoku en Campana, donde el simulador mostraba lagunas. Con la amenaza fija, ese lugar da 3,3 (bajo) en un día sin amenaza y su propensión es 4,5 (media).</div>
<h3>Sensibilidad de los pesos</h3>
<p>Para no depender de una elección arbitraria, se sortean 1.000 combinaciones de pesos (distribución de Dirichlet) entre los indicadores de exposición y vulnerabilidad y entre los exponentes de los tres componentes. La <i>robustez</i> mide la sensibilidad del ranking a esas elecciones; no mide la calidad de los datos ni del modelo. Es el porcentaje de simulaciones en que un municipio queda en el 10 % de mayor riesgo.</p>
<div class="decision"><b>Decisión metodológica</b>Se probó un modelo de aprendizaje automático para la amenaza. Entrenado con El Niño 2015–16 y evaluado con 2023–24, no superó a la regla simple de propensión histórica, y al invertir los eventos el resultado fue igual. Con un solo evento de entrenamiento, aprender no agrega información que 40 años de historia no tengan.</div>
{fig(F["ml"], 4, "Correlación de Spearman entre el agua observada y la predicha en 2023–24 para distintos métodos entrenados con 2015–16.")}
{alcance("Indica dónde y cuándo hay más riesgo en las próximas dos semanas, con umbrales escritos en unidades físicas que se pueden discutir. Cuanto más lejos el día, más incierto el pronóstico. Todavía no está verificado: cada corrida se archiva para compararla con lo que ocurra. No estima daños ni que un barrio se inunde en una fecha; tampoco reemplaza una alerta oficial.")}
<h2><span class="n">5.2</span>Modelo de ríos</h2>
<p>El caudal pronosticado por GloFAS se convierte en altura en cada estación con una curva caudal-altura ajustada a las mediciones del INA (regresión isotónica, desfase y sesgo reciente). Con eso se obtiene la probabilidad de superar el nivel de alerta y el de evacuación cada día de los próximos 15 (riesgo por día) y cada mes de los próximos 7 (escenarios).</p>
<p>Para el riesgo por día, el error de la curva frente a lo medido por el INA se mide en los días pasados de la misma corrida. El de los últimos 2 días pesa más al principio y se diluye hacia el de los últimos 15, con una escala de unos 5 días:</p>
<div class="formula">sesgo(d) = e<sub>15</sub> + ( e<sub>2</sub> − e<sub>15</sub> ) · exp( −d / 5 )<span class="eq">(1d)</span></div>
<p>Así el pronóstico arranca donde está el río hoy. Antes, el Paraná podía pasar de «normal» medido hoy a «evacuación» mañana: su altura depende del caudal de 10 días antes, que quedaba fuera de la consulta, y se usaba el sesgo fijo de la calibración.</p>
<ul>
<li>De 91 estaciones evaluadas, 43 superaron un coeficiente de validación de 0,7 y son las que se muestran.</li>
<li>La verificación continua contra lo medido da un error medio de {n2(V["verif"]["rio_error"])} m y un sesgo de {n2(V["verif"]["rio_sesgo"])} m en {V["verif"]["rio_pares"]} pares.</li>
<li>La misma curva convierte el reanálisis de GloFAS (desde 1997) en la altura diaria de cada Niño para el simulador.</li>
</ul>
{alcance("Probabilidades de alerta y evacuación en 43 estaciones con curva validada. Fuera de ellas no hay estimación, y el sistema lo dice. Los valores extremos de GloFAS se contrastan con el INA y se presentan como escenario.")}
<h2><span class="n">5.3</span>Reclamos por anegamiento en la Ciudad de Buenos Aires</h2>
<p>Con los reclamos «pluviales» al 147 (2011–2026) y la lluvia diaria se ajustó un modelo por barrio:</p>
<ul>
<li>La correlación diaria con los reclamos observados es de 0,44; la línea base sin modelo da −0,03.</li>
<li>La correlación de Spearman entre barrios, para el total del período, es de 0,87.</li>
<li>En los 58 días con 20 mm o más, el modelo reproduce 659 de los 1.165 reclamos observados, frente a 335 de la línea base: capta la forma pero subestima la magnitud.</li>
</ul>
<h2><span class="n">5.4</span>Verificación del pronóstico y retroalimentación</h2>
<p>Cada pronóstico de lluvia se archiva y se compara con lo ocurrido. Con {V["verif"]["dias"]} días verificados, la correlación cae de {n2(V["verif"]["c03"])} a 0–3 días a {n2(V["verif"]["c47"])} a 4–7 días y a {n2(V["verif"]["c815"])} a 8–15 días. Esa caída justifica tratar el riesgo de cada día como un pronóstico cada vez más incierto, y es el motivo por el que el riesgo mensual se descartó. En el cálculo mensual que se conserva, esa precisión define el peso del pronóstico frente a la historia (hoy {n2(V["verif"]["peso"])}). El riesgo por día también se archiva (<code>data/archivo/riesgo_diario/</code>) para medir, con el tiempo, cuántas veces un nivel pronosticado se cumplió.</p>
{fig(F["verif"], 5, "Verificación del pronóstico de lluvia por plazo.")}
</section>''',

6: f'''<section><h1><span class="num">Capítulo 6</span>Simulador hidráulico y escenarios de los Niños</h1>
<p>El simulador responde a una pregunta concreta: <i>si cae esta tormenta con el río a esta altura, ¿dónde se junta el agua, hacia dónde corre y qué queda cortado?</i> Se calcula en el navegador, para un círculo de 0,5 a 20 km alrededor del punto elegido, y se muestra en una maqueta 3D sobre la imagen satelital. Tiene dos solapas: «Simular un escenario» (los Niños o una tormenta a mano) y «Simular pronóstico» (desde hoy, 6.9). Al abrirlo, la maqueta está seca, como en la imagen satelital: el modelo corre de fondo el peor Niño del lugar y el agua se ve al tocar ▶. Al elegir otro Niño, la maqueta vuelve a la imagen seca de hoy hasta que se toca ▶.</p>
{fig(F["hidraulica"], 6, "Balance de agua de cada celda del modelo.")}
<h2><span class="n">6.1</span>Formulación</h2>
<p>El agua se mueve entre celdas vecinas con la ecuación inercial local de Bates y otros (2010). El caudal por unidad de ancho q en una cara entre dos celdas se actualiza con el gradiente de la superficie libre η y la fricción de Manning:</p>
<div class="formula">q<sup>t+Δt</sup> = ( q<sup>t</sup> − g · h<sub>f</sub> · Δt · ∂η/∂x ) / ( 1 + g · Δt · n² · |q<sup>t</sup>| / h<sub>f</sub><sup>7/3</sup> )<span class="eq">(2)</span></div>
<p>donde:</p>
<ul>
<li><b>q</b> es el caudal por unidad de ancho, en m²/s;</li>
<li><b>g</b> es la gravedad, en m/s²;</li>
<li><b>h<sub>f</sub></b> es la profundidad en la cara, en m;</li>
<li><b>n</b> es el coeficiente de Manning según la cobertura (calles, techos, vegetación), en s/m<sup>1/3</sup>;</li>
<li><b>Δt</b> es un paso adaptativo, Δt = α · Δx / √(g (h<sub>máx</sub> + 0,3)), con tope de 30 s.</li>
</ul>
<p>La lluvia de cada hora entra en 12 tramos de 5 minutos. La infiltración sigue Green-Ampt,</p>
<div class="formula">f = K<sub>s</sub> · ( 1 + ψ · Δθ / F )<span class="eq">(3)</span></div>
<p>donde:</p>
<ul>
<li><b>K<sub>s</sub></b> es la conductividad, en mm/h;</li>
<li><b>ψ</b> es la succión del frente de mojado, en mm;</li>
<li><b>Δθ</b> es el déficit de humedad;</li>
<li><b>F</b> es la lámina ya infiltrada, en mm.</li>
</ul>
<p>Los parámetros salen de la clase textural del suelo (SoilGrids 2.0, 0–30 cm). El balance de masa cierra con error de 0,00 %.</p>
<h2><span class="n">6.2</span>Terreno, cuerpos de agua y condiciones de borde</h2>
<ul><li><b>Relieve.</b> FABDEM de 30 m (sin edificios ni árboles) en las 20 ciudades con más personas en riesgo; en el resto, AWS Terrain Tiles.</li>
<li><b>Grilla.</b> Las celdas están alineadas a una cuadrícula común del mapa y su tamaño va por tramos de radio: unos 32 m hasta 1,5 km, 63 m hasta 3 km, 127 m hasta 6 km, y así. Cada celda de un tramo son exactamente 2 × 2 celdas del anterior. Dentro de un tramo, un mismo lugar cae siempre en la misma celda y el agua no cambia al agrandar o achicar el círculo; cada corrida tarda 9 segundos o menos.</li>
<li><b>Arroyos y canales</b> se graban en el terreno (1 m los arroyos y zanjas; 2 m los canales). Su agua no se cuenta como inundación.</li>
<li><b>Lagunas</b>: cada una guarda agua con un único nivel; las conectadas a un río son parte del río.</li>
<li><b>Ríos</b>: tienen el nivel impuesto, atado al nivel de evacuación de la estación del INA más cercana (a menos de 15 km). En ese nivel, el agua llega a la orilla del cuantil 40 % de las orillas, y cada metro de más o de menos se suma o se resta. Los bordes tienen salida libre.</li></ul>
<div class="nota"><b>Errores corregidos en esta versión.</b> El motor arrancaba «quieto» y solo movía el agua con lluvia o cuando cambiaba el río: con el río alto y sin lluvia no inundaba nada. Lo descubrió la validación contra el radar (8.3); ahora el agua arranca en movimiento siempre que hay río o mar. Además, las lagunas cambiaban al mover el radio: la grilla tenía siempre unas 100 celdas por lado, que arrancaban donde empezaba cada círculo, y el detalle del relieve cambiaba con el radio. Con la grilla alineada y por tramos, 1 y 1,5 km dan el mismo agua en la zona que comparten.</div>
<h2><span class="n">6.3</span>Escenario: las barras y sus límites</h2>
<p>Cada barra representa un factor que cambia cuánto se inunda con una lluvia, y va del mínimo al máximo registrado <b>en los Niños desde 1997–98 en ese lugar</b>. Si no hay registro de un Niño se usa todo el registro, y si no hay ninguno, un rango supuesto, avisado en pantalla. El viento no figura: no cambia cuánta agua se junta; solo importaría como sudestada, que ya es la altura del río o del mar.</p>
<div class="tabla-t">Tabla 4. Barras del escenario</div>
<table><thead><tr><th>Barra</th><th>Rango</th><th>De dónde sale el rango</th></tr></thead><tbody>
<tr><td>Lluvia (mm) y duración (1 a 72 h)</td><td>0 al máximo de esa duración</td><td>Lo más que llovió en esa cantidad de horas en algún Niño (IMERG). Se conocen la hora, el día y los 3 días más lluviosos de cada temporada; entre esos puntos la lluvia crece como una potencia de la duración, como en las curvas intensidad-duración-frecuencia, y se toma el mayor de ese valor y de lo medido en las tormentas hora a hora</td></tr>
<tr><td>Humedad del suelo</td><td>Mínimo y máximo de los Niños</td><td>ERA5, 0–7 cm, en el punto</td></tr>
<tr><td>Lagunas</td><td>−1,5 m a llenas</td><td>Sin registro: rango supuesto</td></tr>
<tr><td>Río (con estación)</td><td>Mínimo y máximo de los Niños, de hoy y de las tormentas</td><td>Alturas del INA y estimaciones de GloFAS</td></tr>
<tr><td>Desagües</td><td>0 a 30 mm/h; por defecto, la lluvia de 1 h de 2 años del lugar</td><td>Sección 6.6</td></tr></tbody></table>
<h2><span class="n">6.4</span>Las tormentas de los Niños</h2>
<p>Para cada Niño desde 1997–98, la peor tormenta del lugar es la de los 3 días seguidos con más lluvia en su celda de IMERG, de octubre a abril. De ella se guardan su primer día, su total y su hora más lluviosa, y, para comparar, lo que dio ERA5 esos mismos días.</p>
<p>La hora a hora se arma con la forma de ERA5, que indica en qué horas llovió, corregida para que el total T y la hora más lluviosa M sean los de IMERG. La corrección es de sesgo no lineal (Leander y Buishand, 2007):</p>
<div class="formula">p*<sub>t</sub> = M · ( p<sub>t</sub> / p<sub>máx</sub> )<sup>b</sup>,&nbsp;&nbsp;con b tal que Σ p*<sub>t</sub> = T<span class="eq">(4)</span></div>
<p>La función Σ (p<sub>t</sub>/p<sub>máx</sub>)<sup>b</sup> baja de forma monótona con b: vale la cantidad de horas con lluvia cuando b = 0 y tiende a 1 cuando b crece. Por eso b se encuentra por bisección. Si ERA5 no vio la tormenta, se usa un hietograma triangular del SCS con ese total y ese pico. La humedad del suelo es la de ERA5 en la hora anterior al primer milímetro.</p>
<p>Al elegir un Niño, las barras toman esos valores y se corre el modelo hidráulico: 2 h secas, la tormenta y 36 h más para que el agua termine de escurrir.</p>
<h2><span class="n">6.5</span>El río de la tormenta</h2>
<p>Como se explicó en 2.3, la lluvia y el río tienen que ser del mismo momento. La altura del río del escenario es la máxima entre el primer día con lluvia y 3 días después del último:</p>
<div class="formula">h<sub>río</sub> = máx {{ h(d) : d<sub>inicio</sub> ≤ d ≤ d<sub>fin</sub> + 3 días }}<span class="eq">(5)</span></div>
<p>Se toman 3 días porque, después de una tormenta, el agua de la ciudad y de su entorno sigue bajando hacia el río durante uno a tres días, y un río alto en ese lapso no la deja salir.</p>
<ul>
<li>Cada día se usa la altura medida por el INA y, si no hay, la estimada con GloFAS y la curva de la estación (5.2). La pantalla indica cuál de las dos es.</li>
<li>Si no hay dato esos días, el escenario lo avisa («sin dato del río en esos días») y la fórmula del capítulo 7 no le suma río.</li>
<li>La crecida máxima de la temporada solo aparece como contexto en el cuadro informativo.</li>
</ul>
<h2><span class="n">6.6</span>Desagües: la lluvia de 2 años</h2>
<p>La red pluvial urbana se diseña habitualmente para recurrencias de 2 a 10 años; la Ciudad de Buenos Aires adoptó 10 años en su Plan Director. Antes de sus obras, el arroyo Maldonado no alcanzaba ni para la tormenta de 2 años. Sin datos de la red de cada ciudad, se toma la recurrencia más baja como capacidad por defecto:</p>
<div class="formula">D = mediana de los máximos anuales de la lluvia horaria (IMERG, 2001–2025)<span class="eq">(6)</span></div>
<p>La mediana de los máximos anuales es, por definición, el valor que se supera en promedio una vez cada 2 años. Se mide con el mismo dato que las tormentas. Esto importa porque IMERG suaviza los picos (2.7): su hora más lluviosa ronda los {V['desague']['p1_rango']} mm/h, cuando un pluviómetro puede medir 40 mm o más en una hora de tormenta fuerte. Comparar la tormenta con una capacidad expresada en la misma «moneda» mantiene el balance coherente.</p>
<p>La mediana nacional de D es {V["desague"]["mediana"]} mm/h, y en Zárate, {V["desague"]["zarate"]} mm/h. La barra permite probar desagües tapados (0) o más grandes.</p>
<h2><span class="n">6.7</span>Resultados que informa</h2>
<table><thead><tr><th>Resultado</th><th>Definición</th></tr></thead><tbody>
<tr><td>Superficie con agua y profundidad máxima</td><td>Celdas de tierra del círculo con 10 cm o más; abajo, la mayor lámina en el bajo más hondo, sin el agua dentro de arroyos o canales</td></tr>
<tr><td>Habitantes</td><td>Quienes viven (Censo 2022) en celdas con 10 cm o más, repartidos por celda a partir de los radios censales. No cuenta a quienes trabajan en el lugar</td></tr>
<tr><td>Industrias</td><td>Hectáreas de zonas industriales y comerciales de OpenStreetMap con 10 cm o más, sobre el total de esas zonas en el círculo. No conoce los desagües de cada predio</td></tr>
<tr><td>Calles cortadas, personas aisladas y salud sin acceso</td><td>Calles con 30 cm o más (los puentes siguen pasables); quienes en seco llegaban a la salida del área y con agua no; centros de salud con agua o con sus calles cortadas</td></tr>
</tbody></table>
<h2><span class="n">6.8</span>Visualización y reproducción</h2>
<p>Arriba del panel están el ▶, la hora, la barra de tiempo, la velocidad (×0,5 a ×4) y el gráfico de lluvia y agua. La maqueta 3D usa imagen satelital de alta resolución (hasta nivel 18, unos 0,6 m por píxel en un círculo de 0,5 km) y muestra solo las acumulaciones de 2 cm o más. Mientras llueve, unas líneas blancas siguen la pendiente de la superficie calculada: su dirección sale del cálculo, y su velocidad y su largo son ilustrativos. Los indicadores se muestran en dos filas de tres, para el momento de más agua de la corrida.</p>
<p>La preparación pide en paralelo el relieve y los datos del lugar (Niños, ríos, humedad y suelo). El relieve en 3D y el sombreado del mapa 2D, que queda debajo de la maqueta como respaldo, se piden solo si se abre esa vista. Así el peor Niño queda elegido en unos 3,5 segundos, frente a unos 18 antes.</p>
<h2><span class="n">6.9</span>Simulación del pronóstico (15 días)</h2>
<p>La segunda solapa responde otra pregunta: <i>con lo que ya llovió y lo que se pronostica, ¿dónde va a haber agua en los próximos días?</i> La corrida arranca de las condiciones de hoy:</p>
<ul>
<li><b>Lluvia pasada.</b> La lluvia hora por hora de los últimos 14 días en el punto (análisis de los modelos, Open-Meteo) moja el suelo y llena los bajos como están hoy.</li>
<li><b>Agua vista por radar.</b> Donde Sentinel-1 vio agua en su última pasada (hasta 12 días; VV &lt; −16 dB, sin el agua permanente), cada bajo arranca con el nivel que cubre exactamente esas celdas, a la hora de la pasada.</li>
<li><b>Lluvia pronosticada.</b> De 1 a 7 días, el pronóstico hora por hora. De 8 a 15 días, uno de los 51 miembros del ensamble del ECMWF, elegido por su total: el probable (la mediana) o el pesimista (el percentil 90).</li>
<li><b>Río.</b> La altura medida hoy por el INA se mantiene los 15 días.</li>
</ul>
<p>La pantalla separa con colores la lluvia real, la pronosticada con confianza alta (0–2 días), media (3–6) y baja (7–15).</p>
{alcance(f"Muestra dónde se acumula el agua con una tormenta y un río dados, en un círculo de hasta 20 km y con horas de detalle. En crecidas de río con estación cercana acierta el {pc(R['ahora']['pod'])} del agua vista por radar. No representa la red pluvial real (se supone pareja) ni el agua que entra al círculo desde fuera de él, y no fue posible validar el anegamiento urbano de pocas horas. Las tormentas son reales pero vistas a 11 km de resolución: los picos de minutos quedan suavizados. La simulación del pronóstico hereda la incertidumbre del pronóstico, que crece con los días, y mantiene el río en su altura de hoy.")}</section>''',

7: f'''<section><h1><span class="num">Capítulo 7</span>El peor Niño para la población: método rápido</h1>
<p>El selector de Niños marca en rojo el que dejó a más personas con agua en el círculo. Correr el modelo hidráulico para cada Niño tardaba minutos, y la autora pidió un cálculo inmediato, con todas las variables y sin simular los charcos. La solución es una fórmula física estática, que se evalúa en milisegundos sobre la misma grilla del modelo.</p>
{fig(PEOR, 7, "Cadena de cálculo del peor Niño. Cada caja usa datos del lugar o de la tormenta; ninguna es un factor de ajuste.")}
<h2><span class="n">7.1</span>Escorrentía del suelo permeable</h2>
<p>La humedad relativa del lugar justo antes de la tormenta se mide con su propio rango en los Niños (ERA5). Así no depende de la porosidad, que viene de otra fuente y en las versiones anteriores dejaba saturaciones mayores al 100 %:</p>
<div class="formula">w = ( θ − θ<sub>mín</sub> ) / ( θ<sub>máx</sub> − θ<sub>mín</sub> ),&nbsp;&nbsp;0 ≤ w ≤ 1<span class="eq">(7)</span></div>
<p>El CN medio (CN II) sale de la textura del suelo: 49 en suelos arenosos, 61 en franco-arenosos, 69 en francos, 79 en franco-arcillosos y 84 en arcillosos. Esos valores corresponden a pastura en condición regular, grupos hidrológicos A a D. Con las conversiones de Chow y otros (1988):</p>
<div class="formula">CN<sub>I</sub> = 4,2 CN / (10 − 0,058 CN) ;&nbsp;&nbsp;CN<sub>III</sub> = 23 CN / (10 + 0,13 CN) ;&nbsp;&nbsp;S = 25.400 / CN − 254 (mm)<span class="eq">(8)</span></div>
<p>S<sub>0,20</sub> se interpola linealmente con w entre S<sub>I</sub> (w = 0), S<sub>II</sub> (w = 0,5) y S<sub>III</sub> (w = 1), como propone Brocca y otros (2009). Después se pasa a λ = 0,05 (Hawkins y otros, 2002):</p>
<div class="formula">S<sub>0,05</sub> = 25,4 · 1,33 · ( S<sub>0,20</sub> / 25,4 )<sup>1,15</sup> ;&nbsp;&nbsp;Q = ( P − 0,05 S )² / ( P + 0,95 S ) si P &gt; 0,05 S<span class="eq">(9)</span></div>
<h2><span class="n">7.2</span>Escorrentía de lo impermeable</h2>
<p>En techos y calles escurre la lluvia de cada hora que los desagües no alcanzan a llevarse. Así cuenta no solo cuánto llovió, sino en cuánto tiempo:</p>
<div class="formula">Q<sub>imp</sub> = Σ<sub>t</sub> máx( 0 ; i<sub>t</sub> − D ) (mm)<span class="eq">(10)</span></div>
<h2><span class="n">7.3</span>Dónde se junta: los bajos del relieve</h2>
<p>Sobre la grilla del modelo (la misma del 3D), el terreno se rellena con priority-flood (Barnes y otros, 2014) desde los bordes y desde el agua. Cada grupo de celdas que queda 1 cm o más bajo el nivel de llenado es un bajo k, con su nivel de desborde z<sub>k</sub><sup>tope</sup>. Cada celda de tierra desagua por la máxima pendiente (D8) hacia un bajo o hacia afuera. El bajo k recibe el volumen de su cuenca:</p>
<div class="formula">V<sub>k</sub> = ( A<sub>perm,k</sub> · Q + A<sub>imp,k</sub> · Q<sub>imp</sub> ) / 1.000 (m³)<span class="eq">(11)</span></div>
<p>y sube su nivel h<sub>k</sub> hasta guardarlo, celda por celda de la más baja a la más alta. Lo que no entra desborda y sale:</p>
<div class="formula">Σ<sub>z<sub>i</sub> &lt; h<sub>k</sub></sub> ( h<sub>k</sub> − z<sub>i</sub> ) · Δx² = mín( V<sub>k</sub> ; V<sub>k</sub><sup>máx</sup> ) ;&nbsp;&nbsp;d<sub>i</sub> = máx( 0 ; h<sub>k</sub> − z<sub>i</sub> )<span class="eq">(12)</span></div>
<p>Este cálculo reemplaza a la versión anterior, que repartía el agua en la fracción del círculo a menos de 2 m del cauce (HAND) y la dividía por (1 + pendiente %). Ese factor no tenía respaldo ni calibración.</p>
<h2><span class="n">7.4</span>El río de esos días</h2>
<p>Con la altura del río de la tormenta (ecuación 5), la superficie del río tiene la misma convención que el modelo 3D:</p>
<div class="formula">η = z<sub>base</sub> + b + ( h<sub>río</sub> − h<sub>evac</sub> )<span class="eq">(13)</span></div>
<p>Aquí, z<sub>base</sub> es el nivel base del río en el relieve y b es la altura de la orilla del cuantil 40 % sobre esa base. El agua entra en toda la tierra conectada al río por debajo de η, sin límite de distancia: un río no llega a donde hay terreno más alto en el medio, esté cerca o lejos. La versión anterior limitaba el río a 1 km de la orilla; la validación contra el radar (8.3) mostró que eso perdía tres cuartos del agua real. En cada celda la profundidad es la mayor entre la de la lluvia y la del río.</p>
<h2><span class="n">7.5</span>El resultado</h2>
<div class="formula">Personas = Σ<sub>c ∈ círculo</sub> pob<sub>c</sub> · [ d<sub>c</sub> ≥ 0,10 m ]<span class="eq">(14)</span></div>
<p>El peor Niño es el de más personas. Si hay empate, por ejemplo cero personas en todos, gana el de más volumen de agua en el círculo. El cuadro al pie del simulador muestra, para cada Niño desde 1997–98, su tormenta, el río de esos días y las personas estimadas. Los Niños anteriores aparecen como información, sin entrar en el cálculo.</p>
{alcance("Ordena los Niños de un lugar por su efecto estimado sobre la población, con la física del suelo, del relieve y del río. No simula el movimiento del agua: no encadena el desborde de un bajo con el siguiente y no tiene en cuenta cuánto tarda en drenar. Para el río coincide con el modelo 3D en equilibrio (8.3); para la lluvia no pudo validarse contra registros de daños, porque no hay una base pública de personas afectadas por barrio. Es una estimación para comparar, no un conteo.")}</section>''',

8: f'''<section><h1><span class="num">Capítulo 8</span>Validación</h1>
<p>«Simular lluvia sobre un terreno 3D no equivale a simular una inundación real». Con esa premisa, cada parte se contrastó con observaciones independientes: la física del motor, la lluvia, el río y el agua que vieron los satélites.</p>
<h2><span class="n">8.1</span>Pruebas numéricas</h2>
<p>El motor se probó primero contra soluciones conocidas:</p>
<ul>
<li>En un cuenco cerrado, el balance de agua cierra exacto y el nivel final es de 49,6 cm, contra 49,8 cm teóricos.</li>
<li>En una ladera con lluvia constante, el caudal alcanza el 93 a 95 % de la solución de Manning.</li>
<li>En casos reales (La Plata a 21 días, Corrientes a 3 meses), el balance de masa cierra con error de 0,00 %.</li>
</ul>
<h2><span class="n">8.2</span>Lluvia: tres fuentes contra pluviómetros</h2>
<p><b>Datos.</b> Se usaron {L["pluviometros"]} pluviómetros: los de la red RHN-SAT del INA (temporadas 2019–20 a 2025–26, con el Niño 2023–24 incluido) y las estaciones del SMN en GHCN-Daily (temporadas 2002–03 y 2004–05, las únicas completas).</p>
<p><b>Método.</b></p>
<ul>
<li>Para cada pluviómetro y temporada con al menos 90 % de días medidos, se tomó la peor tormenta de 3 días.</li>
<li>Se comparó con lo que daban ERA5-Land, IMERG y su promedio en la celda de 0,1°. Un día de pluviómetro va de 9 a 9 h, así que equivale a 15 h de un día de las fuentes y 9 h del siguiente.</li>
<li><b>Control de calidad:</b> se descartaron {L["descartadas"]} tormentas en las que el pluviómetro difería más de 10 veces, en el mismo sentido, de las dos fuentes, que son independientes entre sí. Eran picos falsos, como 576 mm en las sierras de Córdoba cuando el satélite veía 10, o equipos trabados.</li>
<li>Quedaron {L["tormentas"]} tormentas.</li>
</ul>
{fig(F["lluvia"], 8, "Peor tormenta de 3 días de cada temporada: lluvia de cada fuente frente a la del pluviómetro (izquierda; 100 % es exacto) y su error mediano (derecha), por tamaño de la tormenta medida.")}
<p><b>Resultados.</b></p>
<ul>
<li><b>Todas las tormentas juntas:</b> el promedio de las dos fuentes tiene el menor error, {pc(L["promedio"]["error_mediano"])}.</li>
<li><b>Tormentas de 100 mm o más</b> ({L["imerg_100"]["n"]} casos), que son las que inundan: IMERG da el {pc(L["imerg_100"]["mediana_cociente"])} de lo medido, con error {pc(L["imerg_100"]["error_mediano"])}; el promedio, el {pc(L["promedio_100"]["mediana_cociente"])} (error {pc(L["promedio_100"]["error_mediano"])}); ERA5, el {pc(L["era5_100"]["mediana_cociente"])} (error {pc(L["era5_100"]["error_mediano"])}).</li>
<li><b>Lluvias chicas (menos de 60 mm):</b> IMERG exagera, pero no son las que definen el peor Niño.</li>
</ul>
<p>Con estos resultados a la vista, la autora eligió IMERG.</p>
<div class="decision"><b>Corrección probada y descartada</b>Se probó un mapeo de cuantiles (Piani y otros, 2010; Gudmundsson y otros, 2012) para llevar el producto a la escala del pluviómetro. Se lo evaluó con validación cruzada, ajustando sin una temporada y midiendo en ella. No redujo el error: corrige el sesgo medio, pero no la subestimación de las tormentas grandes, que se reparten entre valores bajos y altos del producto. Aplicarlo habría sido un factor más sin beneficio medido.</div>
<h2><span class="n">8.3</span>Río: la crecida de Concordia contra el radar</h2>
<p><b>Caso.</b> El 26 de noviembre de 2023, en el Niño 2023–24, el INA midió 13,79 m en Concordia, con evacuación en 12,5 m. Sentinel-1 pasó el 28, con el río todavía en {n2(R["altura"])} m.</p>
<p><b>Observado.</b> Agua en el radar ese día (VV &lt; −16 dB, filtro de mediana de 50 m) que no era agua con el río bajo de la sequía de enero a marzo de 2023, ni agua permanente (JRC &gt; 80 %), llevada a la grilla del modelo.</p>
<p><b>Simulado.</b> La fórmula del capítulo 7 y el modelo 3D, sin lluvia, con el río a esa altura, en el mismo sitio local y en Chrome sin ventana.</p>
{fig(F["rio"], 9, f"Crecida del río Uruguay en Concordia (28-nov-2023), {R['celdas_tierra']:,} celdas de tierra de {R['celda_m']} m en un círculo de 5 km. Con el umbral del radar en −15 y −18 dB el orden de los resultados no cambia.".replace(",", "."))}
<p><b>Resultados.</b></p>
<ul>
<li>La regla anterior, que limitaba el río a 1 km de la orilla, acertaba solo el {pc(R["antes"]["pod"])} del agua vista (CSI {n2(R["antes"]["csi"])}).</li>
<li>Con la tierra conectada al río y más baja que su nivel, acierta el {pc(R["ahora"]["pod"])} (CSI {n2(R["ahora"]["csi"])}), igual que el modelo 3D.</li>
<li>Parte de las «falsas alarmas» ({pc(R["ahora"]["far"])}) son barrios inundados que el radar no ve: entre edificios, el rebote en las paredes hace que el agua brille.</li>
<li>La misma prueba destapó el error del motor descrito en 6.2.</li>
</ul>
<h2><span class="n">8.4</span>Simulador: agua que dura semanas contra Dynamic World</h2>
<p><b>Método.</b></p>
<ul>
<li>Se repitieron El Niño 2015–16 y 2023–24 y la sequía 2022–23, de noviembre a abril, en las 20 ciudades con relieve FABDEM, en un círculo de 5 km.</li>
<li>Se usaron la lluvia real hora por hora y la altura real del río del INA.</li>
<li>El resultado se comparó celda por celda con el agua que vio Dynamic World (clase más frecuente del mes, sin el agua permanente). Una celda tiene «agua en el mes» si mantiene 10 cm o más durante al menos la mitad de las horas.</li>
<li>La referencia trivial es «donde el satélite vio agua alguna vez» (JRC): si el modelo no la supera, no aporta más que mirar el mapa histórico.</li>
</ul>
<p><b>Resultados</b>, con el motor corregido:</p>
<ul>
<li>En la mayoría de los casos el satélite vio menos de 20 celdas con agua (unos 0,5 km²), sobre todo en el conurbano, donde los anegamientos duran horas y los satélites ópticos no los registran.</li>
<li>En los {D["n"]} casos con agua suficiente, el CSI mediano es {n2(D["csi"])}, contra {n2(D["jrc"])} de la referencia.</li>
<li>El modelo la supera en {D["gana"]} de {D["n"]} casos, sobre todo donde manda la crecida de un río con estación cercana.</li>
</ul>
{fig(F["val"], 10, "CSI del modelo y de la referencia en los casos con agua observada suficiente.")}
<div class="nota"><b>Advertencia de sobreajuste.</b> El cuantil de la orilla (40 %) se eligió entre tres valores probados sobre los mismos datos con que luego se mide. La crecida de Concordia (8.3) no se usó para elegirlo y funciona como prueba independiente.</div>
<h2><span class="n">8.5</span>Síntesis</h2>
<table><thead><tr><th>Componente</th><th>Contra qué</th><th>Resultado</th><th>Lectura</th></tr></thead><tbody>
<tr><td>Motor hidráulico</td><td>Soluciones analíticas</td><td>Balance 0,00 %; cuenco y ladera dentro de 1–7 %</td><td>Físicamente coherente</td></tr>
<tr><td>Lluvia de las tormentas</td><td>{L["tormentas"]} tormentas en pluviómetros</td><td>IMERG: {pc(L["imerg_100"]["mediana_cociente"])} de lo medido en las de 100 mm o más (error {pc(L["imerg_100"]["error_mediano"])})</td><td>Buena para comparar Niños; suaviza los picos de minutos</td></tr>
<tr><td>Río en la fórmula y en el 3D</td><td>Radar Sentinel-1, Concordia 2023</td><td>POD {n2(R["ahora"]["pod"])}, CSI {n2(R["ahora"]["csi"])}</td><td>Fuerte en crecidas con estación cercana</td></tr>
<tr><td>Agua que dura semanas</td><td>Dynamic World, 20 ciudades</td><td>CSI {n2(D["csi"])} contra {n2(D["jrc"])} de la referencia</td><td>A la par del mapa histórico</td></tr>
<tr><td>Anegamiento urbano de horas</td><td>No hay observación</td><td>Sin validar</td><td>Orientativo</td></tr></tbody></table></section>''',

9: f'''<section><h1><span class="num">Capítulo 9</span>Requerimientos funcionales y guía de uso</h1>
<div class="tabla-t">Tabla 5. Requerimientos funcionales implementados</div>
<table><thead><tr><th style="width:11mm">Código</th><th>Función</th><th>Descripción</th></tr></thead><tbody>
<tr><td>RF-01</td><td>Láminas</td><td>Tres láminas con solapas: Panorama y mapa · Simulador 3D · Análisis y validación</td></tr>
<tr><td>RF-02</td><td>Lectura del lugar</td><td>Titular de riesgo con escala de aguja, radio del círculo (1 km por defecto), evolución en el período y el tiempo en el lugar arriba de todo</td></tr>
<tr><td>RF-03</td><td>Indicadores del círculo</td><td>Habitantes en riesgo alto y radios en riesgo alto dentro del círculo, ríos a ≤ 15 km, alertas que cubren el punto y día más crítico de las dos semanas; ícono con el color del indicador; método y fuente al pasar el mouse</td></tr>
<tr><td>RF-04</td><td>Buscador</td><td>Provincia, partido, localidad, dirección, barrio popular (RENABAP), empresa (TomTom), lugares cargados a mano y coordenadas; si nada coincide, ofrece opciones en vez de llevar a un lugar parecido. Con el nombre de una petrolera lleva a sus refinerías y sedes, no a sus estaciones de servicio</td></tr>
<tr><td>RF-05</td><td>Mapa</td><td>Riesgo, lluvia, viento y temperatura; capas sumables (hidrografía, alertas del SMN, apagadas por defecto, zonas que ya se inundaron, inundación de hoy por satélite, densidad, barrios, suelo, infraestructura, rutas); curvas de nivel con su altura en metros; océano con retícula y continentes lisos</td></tr>
<tr><td>RF-06</td><td>Detalle del lugar</td><td>Recuadro que sigue la selección, con el punto, el círculo velado en gris y un llamado «Hacé clic acá · Mirá la lluvia en 3D»; todo el círculo abre el simulador; visible también en el celular</td></tr>
<tr><td>RF-07</td><td>Situación y «Qué hacer»</td><td>Viñetas con nivel, período, día más comprometido, motivo, antecedentes y población; tortas; recomendaciones de prevención y de emergencia armadas con los datos del lugar; propensión a juntar agua con su semáforo</td></tr>
<tr><td>RF-08</td><td>Riesgo por día</td><td>Fechas, ▶ y línea de tiempo de hoy a 14 días; gráfico «Riesgo día por día» que pinta el mapa al tocar una columna; «Qué cambia en los próximos días» (suben, siguen altos, bajan) con recomendaciones; alertas y ríos como capas e indicadores</td></tr>
<tr><td>RF-09</td><td>Análisis y validación</td><td>Gráficos que siguen los filtros, al estilo de Power BI, y la validación del simulador</td></tr>
<tr><td>RF-10</td><td>Simulador: reproducción</td><td>▶, hora, barra de tiempo, velocidad y gráfico arriba de todo; maqueta seca al abrir y al elegir otro Niño; imagen de alta resolución; animación de desagües</td></tr>
<tr><td>RF-11</td><td>Simulador: escenario</td><td>Barras de lluvia, duración (1–72 h), humedad, lagunas, río y desagües con sus límites y fuentes; al abrir, cargadas con el peor Niño del lugar</td></tr>
<tr><td>RF-12</td><td>Simulador: Niños</td><td>Selector con los Niños desde 1997–98, su tormenta, su fecha y el río de esos días; el peor para la población marcado con ▲; cuadro informativo con los 27 Niños desde 1951</td></tr>
<tr><td>RF-13</td><td>Simulador: resultados</td><td>Superficie con agua y profundidad máxima, habitantes, industrias, calles cortadas, aislados y salud sin acceso, en el momento de más agua</td></tr>
<tr><td>RF-16</td><td>Simulador: pronóstico</td><td>Solapa «Simular pronóstico»: 14 días reales, agua de hoy por radar y 15 días de pronóstico, probable o pesimista</td></tr>
<tr><td>RF-14</td><td>Fuentes y recorrido</td><td>Ventana de fuentes por tipo de dato y recorrido guiado</td></tr>
<tr><td>RF-15</td><td>Transversales</td><td>Español e inglés; tema claro y oscuro; adaptación a celular y tableta; separador de miles con punto; atribución del mapa plegada detrás del ícono «i»</td></tr></tbody></table>
<h2><span class="n">9.1</span>Guía rápida</h2>
<ol><li><b>Ver el país.</b> La lámina 01 resume la situación de hoy y de los próximos 14 días; «Qué cambia en los próximos días» lista las zonas que suben de nivel.</li><li><b>Elegir un lugar.</b> Escribir una dirección, un barrio o una empresa, o tocar el mapa. El radio define el círculo.</li><li><b>Leer el lugar.</b> Los indicadores muestran lo que pasa dentro del círculo; «Situación» explica el nivel y «Qué hacer» separa prevención y emergencia.</li><li><b>Simular.</b> «Simulador 3D» abre la maqueta seca. Se elige un Niño (el ▲ es el peor para la población) o se mueven las barras, y ▶ reproduce la tormenta.</li></ol></section>''',

10: f'''<section><h1><span class="num">Capítulo 10</span>Calidad, pruebas y trazabilidad</h1>
<h2><span class="n">10.1</span>Principios</h2>
<ul><li><b>No inventar.</b> Cada cifra tiene fuente, fecha y método. Cuando falta el dato se escribe «Sin información» y no se rellena con un supuesto oculto.</li><li><b>Coincidir con la realidad.</b> Un escenario histórico usa lluvia, humedad y río del mismo momento.</li><li><b>Elegir midiendo.</b> Cada fuente y cada regla se eligen comparando contra observaciones, y la comparación queda publicada.</li><li><b>Decir lo que no se sabe.</b> La validación y sus límites están en pantalla. Se probó un aviso de confianza alta, media o baja en cada hora simulada y se quitó: sin una medida propia de cada lugar, sumaba desconfianza sin informar</li></ul>
<h2><span class="n">10.2</span>Pruebas</h2>
<p>La aplicación se prueba en un Chrome sin ventana controlado por el protocolo de depuración, con guiones que devuelven datos y no imágenes: son repetibles y baratos.</p>
<ul>
<li>Hay una batería por cada tanda de cambios y un detector automático de textos encimados y desbordes, en 1.440 y 390 px.</li>
<li>Las validaciones del capítulo 8 se corren con scripts del repositorio sobre el mismo sitio local que se publica:
<ul>
<li><code>earth_engine/validar_lluvia.py</code>;</li>
<li><code>herramientas/validacion/validar_rio_radar.py</code>;</li>
<li><code>herramientas/validacion/validar.py</code>.</li>
</ul></li>
</ul>
<h2><span class="n">10.3</span>Incidentes y correcciones</h2>
<table><thead><tr><th>Incidente</th><th>Causa</th><th>Corrección</th></tr></thead><tbody>
<tr><td>Automatización inválida del 5 al 8 de noviembre</td><td>Un paso tenía «: » en su nombre</td><td>Corregido, con validación del YAML antes de subir cambios</td></tr>
<tr><td>Agua espuria en el modelo (balance de −109.724 %)</td><td>Ríos y lagunas iniciaban sobre su orilla</td><td>Nivel inicial bajo la orilla: balance de 0,00 %</td></tr>
<tr><td>Indicadores del punto que mostraban el municipio</td><td>Se leía el gobierno local en vez del círculo</td><td>Cálculo con los radios censales dentro del círculo</td></tr>
<tr><td>«Peor Niño» que tardaba minutos</td><td>Corría el modelo hidráulico para cada Niño</td><td>Fórmula física estática (cap. 7), en milisegundos</td></tr>
<tr><td>Río lejano que sumaba agua</td><td>El río se repartía en todos los bajos del círculo</td><td>Primero un límite de 1 km; luego, validado contra el radar, la tierra conectada y más baja</td></tr>
<tr><td>Escenarios con un río que no coincidía con la tormenta</td><td>Se usaba la crecida máxima de la temporada</td><td>El río de los días de la tormenta (ecuación 5)</td></tr>
<tr><td>Tormentas con la mitad de la lluvia real</td><td>ERA5 diluye las tormentas convectivas</td><td>IMERG, elegido con {L["tormentas"]} tormentas medidas</td></tr>
<tr><td>Modelo 3D sin inundación con río alto y sin lluvia</td><td>El motor arrancaba «quieto»</td><td>Arranca en movimiento si hay río o mar</td></tr>
<tr><td>Ubicaciones de empresas estimadas de capturas</td><td>Los enlaces de Google Maps no traen coordenadas</td><td>Se quitaron; se agregó TomTom y la regla de no llevar a un lugar parecido; luego se cargaron con el punto del lugar en Waze (Toyota Boshoku, Tenaris Siderca) o con el polígono de OpenStreetMap (refinerías)</td></tr>
<tr><td>Lagunas distintas al cambiar el radio del círculo</td><td>Grilla de unas 100 celdas por lado que arrancaba en cada círculo y relieve con otro detalle según el radio</td><td>Grilla alineada y por tramos encajados (6.2)</td></tr>
<tr><td>Simulador lento con radios grandes</td><td>Al fijar celdas de 32 m para todos los radios, 3 km tardaba 1,5 minutos y 5 km, 5</td><td>Tramos de radio: 9 s o menos</td></tr>
<tr><td>Riesgo 0,0 en lugares que se inundan</td><td>Al pasar a días, sin pronóstico la amenaza valía 0</td><td>Amenaza fija del lugar y subindicador de propensión (5.1)</td></tr>
<tr><td>Río que saltaba de normal a evacuación en un día</td><td>Faltaban los caudales de 10 días antes y se usaba el sesgo de calibración</td><td>31 días pasados y persistencia del error (ecuación 1d)</td></tr>
<tr><td>Límite gratuito de Open-Meteo superado</td><td>El ensamble para 1.345 celdas pesa más que el cupo por hora</td><td>Datos abiertos del ECMWF, sin cupo</td></tr>
<tr><td>Simulador que tardaba en prepararse</td><td>Esperaba al mapa 2D oculto y pedía los datos del lugar en serie</td><td>Todo en paralelo: peor Niño en unos 3,5 s</td></tr>
<tr><td>Buscador que llevaba a estaciones de servicio o a una calle parecida</td><td>Las estaciones caían como «comercio»; el servicio de calles iba antes que las empresas</td><td>Categoría propia, fuera de los resultados salvo que se pida; empresas antes que calles</td></tr></tbody></table></section>''',

11: f'''<section><h1><span class="num">Capítulo 11</span>Registro cronológico del proceso</h1>
<p>El proyecto se desarrolló entre el 27 de septiembre y el 16 de noviembre de 2026 en conversación continua entre la autora y el asistente. Cada paso quedó en una bitácora fechada del repositorio (<code>docs/00_bitacora.md</code>) y en los commits. La autora tomó las decisiones de alcance, método y diseño; el asistente investigó, programó y verificó.</p>
{fig(F["crono"], 11, "Cronología de los hitos principales.")}
<div class="tabla-t">Tabla 6. Hitos y decisiones</div>
<table class="cronologia"><thead><tr><th>Fecha</th><th>Hito y decisiones</th></tr></thead><tbody>
<tr><td>27–30 sep</td><td>Investigación de fuentes; alcance (solo Argentina, 2.282 gobiernos locales y 66.515 radios); ingesta con reintentos; Earth Engine; índice híbrido; foco solo en inundación; arquitectura medallón.</td></tr>
<tr><td>8–15 oct</td><td>Consumo de IA como línea base; análisis por zona; buscadores; versión para celular; capas del tiempo.</td></tr>
<tr><td>5–8 nov</td><td>Rediseño «sala de situación»; sitio público; primer simulador 3D; maqueta con lluvia animada.</td></tr>
<tr><td>10–12 nov</td><td>Pedido de 28 puntos; modelo hidráulico 2D; FABDEM; validación contra Dynamic World y su mejora; documento funcional v1 a v3.</td></tr>
<tr><td>13 nov</td><td>Revisión de una crítica externa: confianza baja sin validación, «Sin información» en ríos sin estación, límites explícitos. Rediseño en «láminas».</td></tr>
<tr><td>14 nov</td><td>Índice con umbrales físicos; indicadores del círculo; radio arriba; imagen de alta resolución; escenarios con los Niños; peor Niño por fórmula; solo Niños completos; buscador con TomTom y barrios; revisión visual automática.</td></tr>
<tr><td>15 nov</td><td>Investigación de 17 trabajos; validación de la lluvia ({L["tormentas"]} tormentas) y elección de IMERG; río de los días de la tormenta; validación del río contra el radar, regla de tierra conectada y corrección del motor; λ = 0,05, humedad relativa, bajos con relieve y desagües de 2 años; simulación del pronóstico con ensamble y radar; agua de hoy por satélite (NASA); documento v4 (sin generar).</td></tr>
<tr><td>15–16 nov</td><td>Riesgo por día en lugar del mensual (decisión de la autora) con ensamble del ECMWF, GloFAS corregido con el INA y alertas del SMN; «Qué cambia en los próximos días» y «Riesgo día por día»; grilla del simulador por tramos de radio; propensión con semáforo; habitantes e industrias; buscador de petroleras y plantas; preparación del simulador en paralelo; guía de diseño; diagnóstico de la automatización; documento v5.</td></tr></tbody></table>
</section>''',

12: f'''<section><h1><span class="num">Capítulo 12</span>Cumplimiento de los pedidos</h1>
<p>«Cumplido» significa implementado y probado; «parcial», que falta una parte; «pendiente», que depende de algo externo.</p>
<h2><span class="n">12.1</span>Pedido del 10 de noviembre (28 puntos)</h2>
<p>Los 28 puntos se cumplieron en las tandas 1 a 9 (ver la versión 3 de este documento). Quedan parciales:</p>
<ul>
<li><b>18, el PDF de detalle por indicador.</b> Las fórmulas están en este documento.</li>
<li><b>23, la permeabilidad por cobertura en pantalla.</b> El modelo ya la usa.</li>
<li><b>25 a 28, la revisión integral,</b> que es continua.</li>
</ul>
<p>El punto 21, la comparación histórica, pasó a cumplido con los escenarios de los Niños.</p>
<h2><span class="n">12.2</span>Pedidos del 13 al 16 de noviembre</h2>
<table><thead><tr><th>Pedido</th><th style="width:19mm">Estado</th><th>Cómo se resolvió</th></tr></thead><tbody>
<tr><td>Indicadores sin texto encimado y con el ícono del color del indicador</td><td class="ok">Cumplido</td><td>Revisión con detector automático en computadora y celular</td></tr>
<tr><td>Escala de riesgo de aguja; sin «riesgo semana a semana» ni «camino al pico»</td><td class="ok">Cumplido</td><td>Evolución y tiempo del lugar arriba de todo</td></tr>
<tr><td>Océano con la retícula de la maqueta y continentes lisos</td><td class="ok">Cumplido</td><td>Valores copiados de la maqueta aprobada</td></tr>
<tr><td>Indicadores del punto elegido y radio arriba</td><td class="ok">Cumplido</td><td>Radios censales del círculo; radio compacto, 1 km por defecto</td></tr>
<tr><td>Simulador con factores que inciden en la inundación y rangos históricos</td><td class="ok">Cumplido</td><td>Barras con mínimo y máximo de los Niños y fuente</td></tr>
<tr><td>Índice con umbral físico, no relativo</td><td class="ok">Cumplido</td><td>Tabla 3</td></tr>
<tr><td>Selector de Niños, peor por fórmula con todas las variables, sin simular</td><td class="ok">Cumplido</td><td>Capítulo 7</td></tr>
<tr><td>Solo Niños con datos completos y cuadro informativo</td><td class="ok">Cumplido</td><td>Desde 1997–98; los 27 en el cuadro</td></tr>
<tr><td>El río de un lugar lejano no debe sumar</td><td class="ok">Cumplido</td><td>Tierra conectada y más baja (validado, 8.3)</td></tr>
<tr><td>El río debe ser el del período de la tormenta</td><td class="ok">Cumplido</td><td>Ecuación 5 y sección 6.5</td></tr>
<tr><td>Investigar trabajos de otros, guardarlos y mejorar los puntos débiles</td><td class="ok">Cumplido</td><td>17 trabajos con índice; lluvia, río, λ, humedad, bajos y desagües</td></tr>
<tr><td>Buscador: Master Bus, barrios y que no vuelva a fallar</td><td class="ok">Cumplido</td><td>Lugares propios, RENABAP, TomTom y opciones si no coincide</td></tr>
<tr><td>Toyota Boshoku y Padilla Logística</td><td class="parcial">Parcial</td><td>Toyota Boshoku con el punto de Waze; Padilla Logística sin coordenadas exactas</td></tr>
<tr><td>Riesgo mensual sin sustento: hoy y las próximas dos semanas, con listas de zonas que cambian de nivel, recomendaciones y columnas que pintan el mapa</td><td class="ok">Cumplido</td><td>Sección 5.1</td></tr>
<tr><td>Inundaciones reales de hoy por satélite</td><td class="ok">Cumplido</td><td>Capa diaria de la NASA (MODIS)</td></tr>
<tr><td>Simular el pronóstico desde las condiciones de hoy</td><td class="ok">Cumplido</td><td>Sección 6.9</td></tr>
<tr><td>Lagunas que cambiaban con el radio, y que el simulador tarde como antes</td><td class="ok">Cumplido</td><td>Grilla por tramos y preparación en paralelo</td></tr>
<tr><td>Riesgo 0,0 con charcos en el simulador; quienes trabajan en una fábrica</td><td class="ok">Cumplido</td><td>Propensión con semáforo; habitantes e industrias</td></tr>
<tr><td>Petroleras: plantas y sedes, no estaciones de servicio; Pan American Energy en Campana; Siderca bien ubicada</td><td class="ok">Cumplido</td><td>Lugares cargados a mano y nueva categoría</td></tr>
<tr><td>Maqueta seca al cambiar de Niño</td><td class="ok">Cumplido</td><td>Vuelve a la imagen de hoy hasta ▶</td></tr>
<tr><td>Documento funcional con seriedad de tesis</td><td class="ok">Cumplido</td><td>Esta versión</td></tr></tbody></table></section>''',

13: f'''<section><h1><span class="num">Capítulo 13</span>Limitaciones, riesgos y trabajo futuro</h1>
<h2><span class="n">13.1</span>Limitaciones conocidas</h2>
<ul><li><b>Lluvia a 11 km.</b> IMERG suaviza los picos de minutos. Su hora más lluviosa ronda los {V['desague']['p1_rango']} mm/h, cuando un pluviómetro puede medir 40 mm o más, y en las tormentas de 150 mm o más se queda, en mediana, con un 73 % de lo medido. Exagera las lluvias chicas. En 1997–98 solo hay ERA5-Land, que subestima.</li>
<li><b>Ventana del río.</b> Los 3 días posteriores a la tormenta son un criterio físico razonable, no calibrado. GloFAS convertido a altura tiene un error de alrededor de 1 m. La sudestada no está modelada, lo que pesa en el Delta.</li>
<li><b>Fórmula del peor Niño.</b> No encadena desbordes entre bajos y no tiene en cuenta el tiempo de drenaje. Depende del relieve (errores verticales de 1 a 3 m en el satelital) y no se validó contra daños reales.</li>
<li><b>Simulador.</b>
<ul>
<li>El desagüe es parejo en toda el área.</li>
<li>No entra agua desde fuera del círculo.</li>
<li>Los cauces se graban con un ancho supuesto.</li>
<li>El anegamiento urbano de horas no se pudo validar.</li>
<li>La validación con Dynamic World usó celdas de 150 m, cuando el simulador usa desde 32 m.</li>
<li>La simulación del pronóstico mantiene el río en su altura de hoy.</li>
</ul></li>
<li><b>El riesgo por día</b> usa umbrales físicos discutibles, explícitos en la tabla 3, y todavía no se verificó contra lo ocurrido. No mide pérdidas ni daños. La propensión es la del municipio, no la de un predio. El Censo cuenta a quienes viven en un lugar, no a quienes trabajan.</li>
<li><b>Automatización.</b> GitHub corre las tareas con horas de atraso. El agua de hoy por radar no se estaba regenerando sola: su diagnóstico quedó automatizado y se está revisando.</li>
<li><b>Ríos sin estación con alerta</b> (noroeste, Cuyo, Patagonia): no tienen estimación.</li></ul>
<h2><span class="n">13.2</span>Riesgos del proyecto</h2>
<table><thead><tr><th>Riesgo</th><th>Mitigación</th></tr></thead><tbody>
<tr><td>Fuentes inestables (INA, SMN, Open-Meteo)</td><td>Reintentos, copias y avisos en pantalla; los datos históricos del simulador ya están precalculados</td></tr>
<tr><td>Interpretación alarmista o como producto oficial</td><td>Aviso permanente, lenguaje medido, validación visible y fuentes por tipo</td></tr>
<tr><td>Licencias y cuotas</td><td>FABDEM CC BY-NC-SA; OpenStreetMap ODbL; Open-Meteo, Earth Engine y TomTom gratuitos para uso no comercial. La clave de TomTom es pública por naturaleza, así que conviene limitarla al dominio del sitio. Cloudflare: 500 publicaciones por mes</td></tr>
<tr><td>Fecha de lanzamiento (antes del 30 de noviembre)</td><td>Lo que falta se muestra como faltante</td></tr></tbody></table>
<h2><span class="n">13.3</span>Trabajo futuro</h2>
<ol>
<li>Verificar el riesgo por día contra lo ocurrido: alertas, agua vista por satélite y reportes.</li>
<li>Usar el pronóstico de altura de los ríos (ya calculado para el riesgo por día) en la simulación del pronóstico.</li>
<li>Medir la sensibilidad del escenario a la ventana del río (1, 3 y 7 días) con crecidas de 2015–16.</li>
<li>Repetir la validación con radar en otras crecidas: Paraná 2015–16 y la propia 2026–27.</li>
<li>Incorporar la sudestada (Servicio de Hidrografía Naval) en el Delta.</li>
<li>Comparar la fórmula del peor Niño con registros de daños: reportes de Defensa Civil y noticias geolocalizadas.</li>
<li>Encadenar el desborde entre bajos, como en Safer_RAIN.</li>
<li>Curvas intensidad-duración-frecuencia locales para pasar de la lluvia de celda a la de punto.</li>
<li>Ejecutar el modelo en capas en Databricks.</li>
<li>Lanzamiento: video, publicación bilingüe, README y repositorio público.</li>
</ol></section>''',

"glosario": f'''<section class="glosario"><h1><span class="num">Anexo A</span>Glosario</h1><dl>
<dt>Abstracción inicial (λ)</dt><dd>Parte de la lluvia que se pierde antes de que empiece a escurrir, como fracción de la retención S. Aquí λ = 0,05.</dd>
<dt>Amenaza, exposición, vulnerabilidad</dt><dd>Los tres componentes del riesgo: qué tan probable es el fenómeno, cuánta gente está en su camino y cuánta capacidad tiene de resistirlo.</dd>
<dt>CN (Número de Curva)</dt><dd>Número de 0 a 100 que resume cuánto escurre un suelo según su tipo, su uso y su humedad; con 100 todo escurre.</dd>
<dt>CSI, POD, FAR</dt><dd>Índice de acierto, proporción de aciertos y proporción de falsas alarmas al comparar mapas de agua.</dd>
<dt>D8</dt><dd>Regla que manda el agua de cada celda a la vecina (de las ocho) con mayor pendiente hacia abajo.</dd>
<dt>Ensamble (pronóstico por ensamble)</dt><dd>Conjunto de pronósticos del mismo modelo con condiciones iniciales apenas distintas; la proporción que supera un umbral es la probabilidad de superarlo.</dd>
<dt>ERA5, ERA5-Land</dt><dd>Reanálisis del ECMWF: reconstrucción horaria del tiempo desde 1940 combinando un modelo con observaciones.</dd>
<dt>GloFAS</dt><dd>Sistema Global de Alerta de Inundaciones de Copernicus: pronostica y reconstruye caudales de ríos.</dd>
<dt>HAND</dt><dd>Altura sobre el cauce más cercano.</dd>
<dt>Hietograma</dt><dd>Lluvia de cada hora de una tormenta.</dd>
<dt>IMERG</dt><dd>Lluvia estimada por la constelación de satélites GPM de la NASA, calibrada con pluviómetros; celdas de 0,1° cada 30 minutos.</dd>
<dt>Inundación compuesta</dt><dd>La que ocurre porque dos causas, como la lluvia y un río alto, coinciden en el tiempo.</dd>
<dt>Período de retorno (T años)</dt><dd>Valor que se supera en promedio una vez cada T años; la lluvia de 2 años es casi la mediana de los máximos anuales.</dd>
<dt>Persistencia del error</dt><dd>Suponer que el error de un pronóstico de hoy sigue los próximos días y se va perdiendo de a poco.</dd>
<dt>Priority-flood</dt><dd>Algoritmo que rellena las depresiones de un relieve desde sus bordes, siempre por el punto más bajo.</dd>
<dt>Propensión a juntar agua</dt><dd>Cuánto tiende un lugar a acumular agua por su relieve, su historia de agua y sus quebradas, de 0 a 10, independiente del pronóstico.</dd>
<dt>Recurrencia de 2 años</dt><dd>Valor que se supera en promedio una vez cada 2 años; es la mediana de los máximos anuales.</dd>
<dt>Sentinel-1</dt><dd>Satélite de radar de la ESA; ve el agua a través de las nubes.</dd>
<dt>Validación cruzada</dt><dd>Ajustar un método sin una parte de los datos y medir su error justamente en esa parte.</dd></dl></section>''',

"refs": '''<section class="referencias"><h1><span class="num">Anexo B</span>Referencias</h1>
<p>Alfieri, L., Burek, P., Dutra, E., Krzeminski, B., Muraro, D., Thielen, J. y Pappenberger, F. (2013). GloFAS – global ensemble streamflow forecasting and flood early warning. <i>Hydrology and Earth System Sciences</i>, 17, 1161–1175.</p>
<p>Aristizabal, F., Chegini, T., Petrochenkov, G., Salas, F. y Judge, J. (2024). Effects of high-quality elevation data and explanatory variables on the accuracy of flood inundation mapping via Height Above Nearest Drainage. <i>Hydrology and Earth System Sciences</i>, 28, 1287–1315.</p>
<p>Barnes, R., Lehman, C. y Mulla, D. (2014). Priority-flood: An optimal depression-filling and watershed-labeling algorithm for digital elevation models. <i>Computers &amp; Geosciences</i>, 62, 117–127.</p>
<p>Bates, P. D., Horritt, M. S. y Fewtrell, T. J. (2010). A simple inertial formulation of the shallow water equations for efficient two-dimensional flood inundation modelling. <i>Journal of Hydrology</i>, 387(1–2), 33–45.</p>
<p>Benítez, V., Guerra, S. Z., Cano, M., Flores, K., Sgroi, L., Doyle, M. y Müller, G. Validación de curvas IDF construidas con datos diarios de precipitación y datos horarios en la región del SESA. <i>XV Congreso Argentino de Meteorología (CONGREMET)</i>.</p>
<p>Bonilla, J. F. (2016). Estimación de la distribución espacial de tormentas intensas, mediante isoyetas elípticas, en zonas de limitada disponibilidad de datos. <i>IFRH 2016</i>, Instituto Nacional del Agua.</p>
<p>Brocca, L., Melone, F., Moramarco, T. y Singh, V. P. (2009). Assimilation of observed soil moisture data in storm rainfall-runoff modeling. <i>Journal of Hydrologic Engineering</i>, 14(2), 153–165.</p>
<p>Camilloni, I. y Barros, V. (2000). The Paraná River response to El Niño 1982–83 and 1997–98 events. <i>Journal of Hydrometeorology</i>, 1(5), 412–430.</p>
<p>Chow, V. T., Maidment, D. R. y Mays, L. W. (1988). <i>Applied Hydrology</i>. Nueva York: McGraw-Hill.</p>
<p>Couasnon, A., Eilander, D., Muis, S., Veldkamp, T. I. E., Haigh, I. D., Wahl, T., Winsemius, H. C. y Ward, P. J. (2020). Measuring compound flood potential from river discharge and storm surge extremes at the global scale. <i>Natural Hazards and Earth System Sciences</i>, 20, 489–504.</p>
<p>FCAG-UNLP, Grupo de Pronóstico Meteorológico (2025). <i>Precipitaciones en la región central del país entre el 16 y 18 de mayo de 2025</i>. La Plata.</p>
<p>ECMWF (2026). <i>Open data: IFS ensemble forecasts (ENS)</i>. Centro Europeo de Pronósticos Meteorológicos a Plazo Medio, licencia CC BY 4.0.</p>
<p>Green, W. H. y Ampt, G. A. (1911). Studies on soil physics. <i>The Journal of Agricultural Science</i>, 4(1), 1–24.</p>
<p>Gumbel, E. J. (1958). <i>Statistics of Extremes</i>. Nueva York: Columbia University Press.</p>
<p>Gudmundsson, L., Bremnes, J. B., Haugen, J. E. y Engen-Skaugen, T. (2012). Technical Note: Downscaling RCM precipitation to the station scale using statistical transformations – a comparison of methods. <i>Hydrology and Earth System Sciences</i>, 16, 3383–3390.</p>
<p>Guizzardi, S., Bianchi, J. y Sabarots Gerbec, M. (2025). Actualización de un sistema de pronóstico hidrodinámico en el Delta del Paraná. <i>XXVIII Congreso Nacional del Agua (CONAGUA)</i>.</p>
<p>Harrigan, S., Zsoter, E., Alfieri, L. y otros (2020). GloFAS-ERA5 operational global river discharge reanalysis 1979–present. <i>Earth System Science Data</i>, 12, 2043–2060.</p>
<p>Hawker, L., Uhe, P., Paulo, L. y otros (2022). A 30 m global map of elevation with forests and buildings removed. <i>Environmental Research Letters</i>, 17(2), 024016.</p>
<p>Hawkins, R. H., Jiang, R., Woodward, D. E., Hjelmfelt, A. T. y Van Mullem, J. E. (2002). Runoff curve number method: examination of the initial abstraction ratio. <i>Second Federal Interagency Hydrologic Modeling Conference</i>, Las Vegas.</p>
<p>Hersbach, H., Bell, B., Berrisford, P. y otros (2020). The ERA5 global reanalysis. <i>Quarterly Journal of the Royal Meteorological Society</i>, 146(730), 1999–2049.</p>
<p>Huffman, G. J. y otros (2023). <i>Algorithm Theoretical Basis Document (ATBD) for the Integrated Multi-satellitE Retrievals for GPM (IMERG), versión 07</i>. NASA Goddard Space Flight Center.</p>
<p>Leander, R. y Buishand, T. A. (2007). Resampling of regional climate model output for the simulation of extreme river flows. <i>Journal of Hydrology</i>, 332(3–4), 487–496.</p>
<p>Lovino, M. A., Müller, O. V., Müller, G. V., Sgroi, L. C. y Baethgen, W. E. (2018). Interannual-to-multidecadal hydroclimate variability and its sectoral impacts in northeastern Argentina. <i>Hydrology and Earth System Sciences</i>, 22, 3155–3174.</p>
<p>Marin-Ferrer, M., Vernaccini, L. y Poljansek, K. (2017). <i>Index for Risk Management INFORM: Concept and Methodology Report, Version 2017</i>. EUR 28655 EN. Luxemburgo: Oficina de Publicaciones de la Unión Europea.</p>
<p>Menne, M. J., Durre, I., Vose, R. S., Gleason, B. E. y Houston, T. G. (2012). An overview of the Global Historical Climatology Network-Daily database. <i>Journal of Atmospheric and Oceanic Technology</i>, 29, 897–910.</p>
<p>Mukherjee, R., Policelli, F., Wang, R., Arellano-Thompson, E., Tellman, B. y otros (2024). A globally sampled high-resolution hand-labeled validation dataset for evaluating surface water extent maps. <i>Earth System Science Data</i>, 16, 4311–4323.</p>
<p>Muñoz-Sabater, J., Dutra, E., Agustí-Panareda, A. y otros (2021). ERA5-Land: a state-of-the-art global reanalysis dataset for land applications. <i>Earth System Science Data</i>, 13, 4349–4383.</p>
<p>Pekel, J.-F., Cottam, A., Gorelick, N. y Belward, A. S. (2016). High-resolution mapping of global surface water and its long-term changes. <i>Nature</i>, 540, 418–422.</p>
<p>Piani, C., Haerter, J. O. y Coppola, E. (2010). Statistical bias correction for daily precipitation in regional climate models over Europe. <i>Theoretical and Applied Climatology</i>, 99, 187–192.</p>
<p>Rawls, W. J., Brakensiek, D. L. y Miller, N. (1983). Green-Ampt infiltration parameters from soils data. <i>Journal of Hydraulic Engineering</i>, 109(1), 62–70.</p>
<p>Re, M., Sabarots Gerbec, M. y Storto, L. (2015). Estadística de niveles en el Delta del río Paraná mediante modelación hidrodinámica. <i>Séptimo Simposio Regional sobre Hidráulica de Ríos (Ríos 2015)</i>.</p>
<p>Sadana, T., Aerts, J. C. J. H., Eilander, D., Merz, B., de Moel, H., Busker, T., Bril, V. C. y de Bruijn, J. (2025). Validation of the open-source hydrodynamic model SFINCS on historical river floods at the global scale. <i>EGUsphere</i> (preprint).</p>
<p>Samela, C., Persiano, S., Bagli, S. y otros (2020). Safer_RAIN: A DEM-based hierarchical filling-&amp;-spilling algorithm for pluvial flood hazard assessment and mapping across large urban areas. <i>Water</i>, 12(6), 1514.</p>
<p>Seleem, O., Heistermann, M. y Bronstert, A. (2021). Efficient hazard assessment for pluvial floods in urban environments: a benchmarking case study for the city of Berlin, Germany. <i>Water</i>, 13(18), 2476.</p>
<p>Soto-Escobar, C., Zambrano-Bigiarini, M., Tolorza, V. y otros (2026). Developing Intensity-Duration-Frequency (IDF) curves using sub-daily gridded and in situ datasets: characterising precipitation extremes in a drying climate. <i>Hydrology and Earth System Sciences</i>, 30, 91–117.</p>
<p>Torres, R., Snoeij, P., Geudtner, D. y otros (2012). GMES Sentinel-1 mission. <i>Remote Sensing of Environment</i>, 120, 9–24.</p>
<p>USDA-NRCS (2004). <i>National Engineering Handbook, Part 630 Hydrology, Chapter 10: Estimation of Direct Runoff from Storm Rainfall</i>. Washington: Departamento de Agricultura de EE. UU.</p>
<p>Ward, P. J., Couasnon, A., Eilander, D. y otros (2018). Dependence between high sea-level and high river discharge increases flood hazard in global deltas and estuaries. <i>Environmental Research Letters</i>, 13, 084012.</p>
<p>Instituto Nacional de Estadística y Censos (2023). Censo Nacional de Población, Hogares y Viviendas 2022. Servicio Meteorológico Nacional (2026). Alertas (CAP). Instituto Nacional del Agua (2026). Sistema de alerta hidrológico. OpenStreetMap contributors (2026), licencia ODbL.</p></section>''',

"anexo": f'''<section><h1><span class="num">Anexo C</span>Estructura del repositorio y comandos</h1>
<table><thead><tr><th>Carpeta</th><th>Contenido</th></tr></thead><tbody>
<tr><td><code>ingesta/</code></td><td>Un script por fuente; sesión HTTP con reintentos y registro en <code>data/manifest.csv</code></td></tr>
<tr><td><code>earth_engine/</code></td><td>Terreno, agua histórica, MapBiomas, suelo, Dynamic World; <code>lluvia_ninos.py</code> (tormentas y desagües), <code>umbrales_lluvia.py</code> (lluvia de 2, 5 y 10 años), <code>agua_hoy_radar.py</code> y <code>validar_lluvia.py</code></td></tr>
<tr><td><code>transformacion/</code>, <code>sql/</code></td><td>Capas silver y modelo medallón; DuckDB local y preparado para Databricks</td></tr>
<tr><td><code>modelos/</code></td><td>Ríos, reclamos de CABA, índice con Monte Carlo, riesgo por día (<code>riesgo_diario.py</code>) y verificación del pronóstico</td></tr>
<tr><td><code>web/</code></td><td>Aplicación web, preparación de datos fijos (<code>preparar_rios_ninos.py</code> y otros) y diarios</td></tr>
<tr><td><code>herramientas/</code></td><td>Pruebas en Chrome sin ventana; validación del simulador contra Dynamic World y del río contra el radar</td></tr>
<tr><td><code>docs/</code></td><td>Bitácora, fuentes, trabajos de referencia (<code>03_investigacion_trabajos.md</code>), validación y este documento</td></tr></tbody></table>
<div class="tabla-t">Comandos frecuentes</div>
<table><tbody>
<tr><td>Índice completo</td><td><code>modelos/rios.py pronostico</code> → <code>modelos/verificacion.py</code> → <code>modelos/indice_riesgo.py</code> → <code>web/actualizar_datos_web.py</code></td></tr>
<tr><td>Riesgo por día</td><td><code>earth_engine/umbrales_lluvia.py anios 1995 2024</code> → <code>ajustar</code> (una vez) · <code>modelos/riesgo_diario.py</code> (dos veces por día)</td></tr>
<tr><td>Tormentas de los Niños</td><td><code>earth_engine/lluvia_ninos.py temporadas</code> → <code>desagues</code> → <code>teselas</code></td></tr>
<tr><td>Validaciones</td><td><code>earth_engine/validar_lluvia.py</code> · <code>herramientas/validacion/validar_rio_radar.py</code> · <code>herramientas/validacion/validar.py simular | resumir</code></td></tr>
<tr><td>Web local</td><td><code>cd web &amp;&amp; python3 -m http.server 8765</code></td></tr></tbody></table></section>''',
}

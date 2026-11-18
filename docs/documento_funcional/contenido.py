"""Texto del documento funcional (HTML), versión 6. Las figuras, los números de página y las cifras de las validaciones entran
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
<rect x="426" y="44" width="100" height="148" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="476" y="62" font-weight="700" fill="#0a1c28">MODELOS</text><text x="476" y="82" fill="#0e7490">probabilidad × impacto</text><text x="476" y="96" fill="#0e7490">ríos (GloFAS→INA)</text><text x="476" y="110" fill="#0e7490">tormentas Niño</text><text x="476" y="124" fill="#0e7490">verificación</text><text x="476" y="146" fill="#5b6675">simulador 2D</text><text x="476" y="160" fill="#5b6675">(en el navegador)</text>
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
"portada": f'''<section class="portada"><div class="contenido">{LOGO}<div class="tipo">Documento funcional y memoria técnica</div>
<h1>Argentina frente a El Niño 2026–27</h1><div class="sub">Sistema de pronóstico de riesgo de inundación basado en impacto para los gobiernos locales de la República Argentina, con simulación hidráulica bidimensional de escenarios históricos</div>
<div class="datos"><b>Autora:</b> Diamela, ingeniera química (UTN)<br><b>Versión:</b> 7.0 · <b>Fecha:</b> 18 de noviembre de 2026<br><b>Sitio:</b> mapa-de-riesgo-super-nino.diamedego.workers.dev<br><b>Repositorio:</b> github.com/diamedego/Mapa-de-riesgo-super-ni-o</div></div>{OLAS}
<div class="pie">Trabajo independiente elaborado con datos públicos. No constituye un producto oficial; ante una emergencia rigen las indicaciones de Defensa Civil, el SMN y el INA.</div></section>''',

"resumen": f'''<section class="resumen"><h1><span class="num">Resumen</span>Resumen</h1>
<p>El presente trabajo describe el diseño, la implementación y la validación de un sistema de pronóstico de riesgo de inundación para la República Argentina durante el evento El Niño 2026–27. El sistema abarca 2.282 gobiernos locales, 162 zonas rurales sin gobierno local y 66.515 radios censales, y se compone de dos productos: un tablero cartográfico de actualización automática y un simulador hidráulico bidimensional ejecutado en el navegador.</p>
<p>El riesgo diario se formula como un pronóstico basado en impacto para el día en curso y los trece días siguientes. La amenaza se expresa como la probabilidad de superar los umbrales de lluvia del Servicio Meteorológico Nacional (SMN), estimada con los 50 miembros del ensamble del ECMWF, los niveles de alerta y evacuación del Instituto Nacional del Agua (INA) o una alerta oficial vigente. El impacto se determina a partir de la población residente en zona inundable y de su vulnerabilidad. Ambos componentes se combinan mediante una matriz de riesgo análoga a las empleadas por el <i>Flood Guidance Statement</i> del Reino Unido y por el sistema europeo EFAS. Los umbrales se calibran semanalmente contra las alertas emitidas por el SMN y el pronóstico se verifica diariamente contra lo observado.</p>
<p>El simulador resuelve las ecuaciones de aguas poco profundas en su formulación inercial local (Bates y otros, 2010), con infiltración de Green-Ampt, capacidad de desagüe pluvial, lagunas y ríos con nivel impuesto. Los escenarios reproducen la tormenta más severa de cada evento El Niño desde 1997–98 a partir de la precipitación satelital IMERG, con la humedad del suelo y la altura del río registradas en las mismas fechas. Un método estático complementario, basado en el Número de Curva y en el llenado de depresiones, ordena dichos eventos según la población afectada en tiempos del orden de milisegundos.</p>
<div class="caja-clave"><b>Resultados principales de la validación.</b>
<ul>
<li><b>Precipitación.</b> Sobre {L["tormentas"]} tormentas registradas en {L["pluviometros"]} pluviómetros del INA y del SMN, el reanálisis ERA5 reproduce el {pc(L["era5_100"]["mediana_cociente"])} de la lluvia de las tormentas de 100 mm o más (error mediano {pc(L["era5_100"]["error_mediano"])}), mientras que IMERG reproduce el {pc(L["imerg_100"]["mediana_cociente"])} (error mediano {pc(L["imerg_100"]["error_mediano"])}). En consecuencia, se adoptó IMERG como fuente de las tormentas históricas.</li>
<li><b>Crecida fluvial.</b> En la crecida del río Uruguay en Concordia (noviembre de 2023), el modelo detecta el {pc(R["ahora"]["pod"])} de la superficie anegada observada por el radar Sentinel-1 (CSI {n2(R["ahora"]["csi"])}).</li>
<li><b>Anegamiento persistente.</b> Frente a Dynamic World, en {D["n"]} casos con superficie observada suficiente, el simulador alcanza un CSI mediano de {n2(D["csi"])}, contra {n2(D["jrc"])} de la referencia basada en la frecuencia histórica de agua.</li>
</ul>
Se concluye que el sistema constituye una herramienta de carácter orientativo, con buen desempeño en crecidas fluviales con estación hidrométrica cercana y desempeño no verificable en el anegamiento urbano de corta duración, que los sensores satelitales no registran.</div>
<div class="kpis"><div class="kpi"><b>2.282</b><span>gobiernos locales con pronóstico de riesgo a 14 días</span></div><div class="kpi"><b>{L["tormentas"]}</b><span>tormentas observadas para la selección de la fuente de lluvia</span></div><div class="kpi"><b>{n2(R["ahora"]["csi"])}</b><span>CSI fluvial frente al radar (Concordia, 2023)</span></div><div class="kpi"><b>$ 0</b><span>costo operativo: servicios y herramientas gratuitos</span></div></div>
<p class="palabras"><b>Palabras clave:</b> riesgo de inundación · El Niño · pronóstico basado en impacto · pronóstico por ensamble · inundación compuesta · número de curva · modelación hidráulica bidimensional · IMERG · validación · Argentina.</p></section>''',

"indice": f'''<section class="indice"><h1><span class="num">Contenido</span>Índice</h1><ol>
<li><span class="n">1</span><span class="t">Introducción</span><span class="p">{p(1)}</span></li>
<li><span class="n">2</span><span class="t">Marco teórico y antecedentes</span><span class="p">{p(2)}</span></li>
<li><span class="n">3</span><span class="t">Datos: fuentes, cobertura y actualización</span><span class="p">{p(3)}</span></li>
<li><span class="n">4</span><span class="t">Arquitectura del sistema</span><span class="p">{p(4)}</span></li>
<li><span class="n">5</span><span class="t">Metodología del pronóstico de riesgo</span><span class="p">{p(5)}</span></li>
<li><span class="n">6</span><span class="t">Modelo hidráulico y escenarios históricos</span><span class="p">{p(6)}</span></li>
<li><span class="n">7</span><span class="t">Método estático de ordenamiento de escenarios</span><span class="p">{p(7)}</span></li>
<li><span class="n">8</span><span class="t">Validación</span><span class="p">{p(8)}</span></li>
<li><span class="n">9</span><span class="t">Especificación funcional</span><span class="p">{p(9)}</span></li>
<li><span class="n">10</span><span class="t">Aseguramiento de la calidad y trazabilidad</span><span class="p">{p(10)}</span></li>
<li><span class="n">11</span><span class="t">Metodología de desarrollo</span><span class="p">{p(11)}</span></li>
<li><span class="n">12</span><span class="t">Conclusiones</span><span class="p">{p(12)}</span></li>
<li><span class="n">13</span><span class="t">Limitaciones, riesgos y trabajo futuro</span><span class="p">{p(13)}</span></li>
<li><span class="n">A</span><span class="t">Glosario</span><span class="p">{p("glosario")}</span></li>
<li><span class="n">B</span><span class="t">Referencias</span><span class="p">{p("refs")}</span></li>
<li><span class="n">C</span><span class="t">Estructura del repositorio y procedimientos de ejecución</span><span class="p">{p("anexo")}</span></li></ol>
<div class="caja-clave" style="margin-top:12mm"><b>Cómo leer este documento.</b>
<ul>
<li><b>Capítulos 1 a 4:</b> planteamiento del problema, fundamentos teóricos, datos empleados y arquitectura.</li>
<li><b>Capítulos 5 a 7:</b> metodología de cálculo de cada producto, con sus ecuaciones, parámetros y criterios de adopción.</li>
<li><b>Capítulo 8:</b> validación frente a observaciones independientes.</li>
<li><b>Capítulos 9 a 11:</b> especificación funcional, aseguramiento de la calidad y metodología de desarrollo.</li>
<li><b>Capítulos 12 y 13:</b> conclusiones, limitaciones y líneas de trabajo futuro.</li>
</ul>
Cada modelo concluye con un recuadro «Alcance y validez», que delimita la pregunta que responde, su escala, la precisión medida y las afirmaciones que no sustenta.</div></section>''',

1: f'''<section><h1><span class="num">Capítulo 1</span>Introducción</h1>
<h2><span class="n">1.1</span>Planteamiento del problema</h2>
<p>El Niño constituye la fase cálida del ciclo El Niño–Oscilación del Sur. En la Argentina se asocia a precipitaciones superiores a las normales en el Litoral y la región pampeana y a crecidas de los grandes ríos de la cuenca del Plata, que se manifiestan con semanas de desfase respecto de la lluvia (Camilloni y Barros, 2000; Lovino y otros, 2018). Para el período 2026–27, el Servicio Meteorológico Nacional prevé efectos del fenómeno al menos hasta abril de 2027.</p>
<p>La información pública necesaria para evaluar el riesgo de inundación a escala local existe, pero se encuentra dispersa en numerosas fuentes con formatos, coberturas espaciales y frecuencias de actualización heterogéneas: pronósticos meteorológicos, alturas hidrométricas, el Censo Nacional 2022, modelos digitales de elevación, imágenes satelitales e infraestructura. No se identificó una herramienta pública que integre dichas fuentes en una estimación de riesgo comparable entre municipios, actualizada diariamente y acompañada de una medición explícita de su precisión.</p>
<h2><span class="n">1.2</span>Objetivos</h2>
<p><b>Objetivo general.</b> Desarrollar un sistema que estime y comunique el riesgo de inundación de cada gobierno local y cada radio censal de la Argentina durante el evento El Niño 2026–27, de manera verificable, reproducible y con actualización automática.</p>
<p><b>Objetivos específicos.</b></p>
<ol type="a">
<li>Integrar las fuentes públicas en una arquitectura de datos por capas reproducible.</li>
<li>Pronosticar el riesgo del día en curso y de los trece días siguientes con un esquema basado en impacto y umbrales físicos explícitos.</li>
<li>Estimar la probabilidad de crecida en las estaciones hidrométricas a partir de caudales pronosticados.</li>
<li>Implementar un simulador de lluvia y escurrimiento sobre relieve real que reproduzca tormentas y crecidas históricas y que permita simular los quince días siguientes a partir de las condiciones observadas.</li>
<li>Seleccionar cada fuente de datos mediante la medición de su error frente a observaciones independientes.</li>
<li>Cuantificar el desempeño del simulador e informarlo en la propia aplicación.</li>
<li>Mantener la totalidad del sistema con servicios gratuitos, código abierto e interfaz bilingüe.</li>
</ol>
<h2><span class="n">1.3</span>Alcance y exclusiones</h2>
<p>El alcance se restringe al territorio argentino y al riesgo de inundación. Quedan excluidos el riesgo sanitario asociado al dengue (para el cual se documentó un modelo que no integra el índice), el impacto agropecuario y la capa de respuesta social (albergues, centros de donación, comedores). El sistema no reemplaza a los sistemas de alerta oficiales, condición que se explicita en cada pantalla.</p>
<h2><span class="n">1.4</span>Usuarios previstos</h2>
<table><thead><tr><th>Usuario</th><th>Necesidad</th><th>Respuesta del sistema</th></tr></thead><tbody>
<tr><td>Población residente</td><td>Conocer el riesgo de su zona y las medidas recomendadas</td><td>Buscador de direcciones, barrios y establecimientos; indicadores del área seleccionada; secciones «Situación» y «Qué hacer»</td></tr>
<tr><td>Equipos municipales y de Defensa Civil</td><td>Priorizar zonas y población expuesta con antelación</td><td>Listado de zonas que cambian de nivel, con fecha y causa; rankings; simulador con el escenario más severo del lugar y con el pronóstico; calles cortadas y centros de salud sin acceso</td></tr>
<tr><td>Empresas e industrias</td><td>Evaluar la propensión de un predio a acumular agua</td><td>Buscador de plantas y sedes; indicador de propensión a acumular agua; simulación del predio</td></tr>
<tr><td>Medios y público general</td><td>Comprender el panorama nacional</td><td>Lámina «Panorama y mapa», gráfico de riesgo diario, inundación observada por satélite, recorrido guiado</td></tr>
<tr><td>Especialistas y comunidad técnica</td><td>Evaluar y reutilizar la metodología</td><td>Ecuaciones con unidades, validaciones publicadas, bibliografía y repositorio abierto</td></tr></tbody></table>
<h2><span class="n">1.5</span>Productos del sistema</h2>
<p>Cada producto responde a una pregunta distinta, con una escala y una precisión propias. La tabla 1 los delimita a fin de evitar interpretaciones que excedan su validez.</p>
<div class="tabla-t">Tabla 1. Productos del sistema: pregunta, escala, precisión medida y afirmaciones que no sustenta</div>
<table><thead><tr><th>Producto</th><th>Pregunta</th><th>Escala y horizonte</th><th>Precisión medida</th><th>No sustenta</th></tr></thead><tbody>
<tr><td>Riesgo diario</td><td>¿Dónde y cuándo existe riesgo en las próximas dos semanas?</td><td>Gobierno local, celda de 0,1° y radio censal; 14 días</td><td>Verificación en curso: cada corrida se archiva y se compara con lo observado; calibración semanal contra el SMN</td><td>Daños, pérdidas ni la inundación de un barrio en una fecha determinada</td></tr>
<tr><td>Propensión a acumular agua</td><td>¿El lugar tiende a acumular agua aun sin amenaza pronosticada?</td><td>Gobierno local; fija</td><td>Umbrales físicos explícitos (tabla 4)</td><td>El funcionamiento del drenaje de un predio o una calle</td></tr>
<tr><td>Crecida fluvial</td><td>¿Cuál es la probabilidad de superar los niveles de alerta o evacuación?</td><td>43 estaciones del INA; 15 días (7 meses para los escenarios)</td><td>Error medio verificado de {n2(V["verif"]["rio_error"])} m</td><td>Ríos sin estación (noroeste, Cuyo, Patagonia)</td></tr>
<tr><td>Pronóstico del tiempo a 16 días</td><td>¿Cuánta lluvia, viento y temperatura se esperan?</td><td>Grilla de 0,5°; 16 días</td><td>Correlación {n2(V["verif"]["c03"])} a 0–3 días y {n2(V["verif"]["c815"])} a 8–15 días</td><td>Tormentas de una hora a escala de barrio</td></tr>
<tr><td>Simulador hidráulico</td><td>Con una lluvia y un nivel de río dados, ¿dónde se acumula el agua?</td><td>Círculo de 0,5 a 20 km; celdas de 32 m hasta 1,5 km de radio, duplicadas por tramo; horas a días</td><td>Río: detección del {pc(R["ahora"]["pod"])} frente al radar; anegamiento persistente: CSI {n2(D["csi"])}</td><td>El anegamiento urbano de pocas horas (no validable con satélites); la red pluvial real</td></tr>
<tr><td>Escenarios El Niño</td><td>¿Qué ocurriría hoy con la tormenta más severa de cada evento?</td><td>Celda de 0,1° (~11 km); eventos desde 1997–98</td><td>Tormentas de 100 mm o más: {pc(L["imerg_100"]["mediana_cociente"])} de lo observado, error {pc(L["imerg_100"]["error_mediano"])}</td><td>La lluvia de una manzana; los picos de minutos</td></tr>
<tr><td>Ordenamiento de escenarios</td><td>¿Qué evento afectó a más población?</td><td>Mismo círculo; estimación estática</td><td>Río: coincide con el modelo hidráulico en equilibrio; lluvia: sin validación contra daños</td><td>El número real de personas afectadas</td></tr>
<tr><td>Simulación del pronóstico</td><td>Con la lluvia ocurrida y la pronosticada, ¿dónde habrá agua?</td><td>Mismo círculo; 14 días pasados y 15 de pronóstico</td><td>Correlación de la lluvia pronosticada {n2(V["verif"]["c03"])} a 0–3 días y {n2(V["verif"]["c815"])} a 8–15 días</td><td>La lluvia horaria más allá de una semana; el rango del río (se emplea la mediana)</td></tr></tbody></table>
<h2><span class="n">1.6</span>Estructura del documento</h2>
<p>El capítulo 2 presenta los fundamentos teóricos y los antecedentes. El capítulo 3 describe las fuentes de datos y el capítulo 4, la arquitectura. Los capítulos 5 a 7 desarrollan la metodología de cada producto y el capítulo 8, su validación. Los capítulos 9 a 11 especifican la aplicación, los controles de calidad y la metodología de desarrollo. Los capítulos 12 y 13 exponen las conclusiones, las limitaciones y el trabajo futuro.</p></section>''',

2: f'''<section><h1><span class="num">Capítulo 2</span>Marco teórico y antecedentes</h1>
<p>La revisión bibliográfica comprendió 17 trabajos de acceso abierto sobre precipitación extrema, escurrimiento, inundación compuesta, métodos rápidos de mapeo y validación de mapas de inundación. Este capítulo sintetiza los conceptos que fundamentan la metodología.</p>
<h2><span class="n">2.1</span>Riesgo, amenaza, exposición y vulnerabilidad</h2>
<p>El riesgo de desastre resulta de la interacción entre la amenaza (la ocurrencia de un fenómeno potencialmente dañino), la exposición (las personas y los bienes situados en su área de influencia) y la vulnerabilidad (su susceptibilidad al daño y su capacidad de recuperación). El índice INFORM de la Comisión Europea (Marin-Ferrer y otros, 2017) combina los tres componentes en una escala de 0 a 10 mediante una media geométrica, de modo que un componente bajo reduce el riesgo total y ningún componente compensa por completo a otro. INFORM constituye, sin embargo, un índice de riesgo estructural, orientado a la prevención y la planificación. Para un horizonte de días resulta más adecuado el esquema de los pronósticos basados en impacto, en el que la amenaza se expresa como probabilidad de ocurrencia de un evento y la exposición y la vulnerabilidad determinan el impacto esperado (sección 5.1).</p>
<h2><span class="n">2.2</span>Tipos de inundación</h2>
<table><thead><tr><th>Tipo</th><th>Mecanismo</th><th>Regiones de mayor incidencia</th><th>Variables determinantes</th></tr></thead><tbody>
<tr><td>Pluvial o urbana</td><td>La precipitación excede la capacidad de infiltración y de desagüe; el agua se acumula en las depresiones</td><td>Áreas urbanas de llanura: Gran Buenos Aires, La Plata, ciudades del Litoral</td><td>Relieve, suelo, impermeabilización, intensidad horaria</td></tr>
<tr><td>Fluvial</td><td>Un curso de agua de gran cuenca crece y desborda con días o semanas de desfase respecto de la lluvia</td><td>Paraná, Paraguay, Uruguay y afluentes</td><td>Caudales (GloFAS), alturas (INA), niveles de alerta y evacuación</td></tr>
<tr><td>Repentina</td><td>Una tormenta en zona serrana genera una crecida en minutos aguas abajo</td><td>Noroeste y Cuyo</td><td>Pendiente, contenido de arcilla, precipitación</td></tr></tbody></table>
<h2><span class="n">2.3</span>Inundación compuesta</h2>
<p>Cuando una precipitación intensa coincide con un río crecido, el escurrimiento pluvial no encuentra salida y la inundación resultante excede la suma de ambos efectos considerados por separado. Ward y otros (2018) demostraron que en numerosos deltas los niveles altos del río y del mar coinciden con mayor frecuencia que la esperable por azar, por lo que su tratamiento independiente subestima la amenaza. Couasnon y otros (2020) cuantifican ese potencial mediante el emparejamiento de ambos extremos dentro de una ventana temporal acotada. En el Delta del Paraná, el nivel depende del caudal del Paraná y del Río de la Plata, con su marea y la sudestada (Re y otros, 2015; Guizzardi y otros, 2025).</p>
<p>De ello se desprende un requisito de diseño: un escenario que combine la tormenta más severa de un evento con la crecida máxima de la temporada, eventualmente ocurrida meses después, representa una situación que no se produjo. Por ese motivo, el simulador adopta el nivel del río registrado en los días de la tormenta (sección 6.5).</p>
<h2><span class="n">2.4</span>Escurrimiento: método del Número de Curva</h2>
<p>El método del Número de Curva (CN) del Servicio de Conservación de Recursos Naturales de los Estados Unidos (USDA-NRCS, 2004) estima la lámina escurrida Q a partir de la precipitación P y de la retención potencial S, función del tipo de suelo, su uso y su humedad antecedente. La formulación clásica supone una abstracción inicial I<sub>a</sub> = λ·S con λ = 0,20. Hawkins y otros (2002), sobre datos de 134 cuencas, obtuvieron una mediana de λ = 0,048 y propusieron λ = 0,05, con la conversión S<sub>0,05</sub> = 1,33·S<sub>0,20</sub><sup>1,15</sup> (S en pulgadas). Con λ = 0,20 se subestima el escurrimiento de las lluvias moderadas.</p>
<p>La humedad antecedente se representa mediante tres condiciones: seca (CN I), media (CN II) y saturada (CN III), con las conversiones de Chow y otros (1988). Brocca y otros (2009) verificaron que la retención S decrece linealmente con el grado de saturación medido del suelo, lo que fundamenta la interpolación de S entre las tres condiciones en función de la humedad relativa del lugar.</p>
<h2><span class="n">2.5</span>Métodos de llenado y desborde</h2>
<p>Los métodos de llenado y desborde estiman la acumulación de la lluvia sobre el modelo digital de elevación sin resolver las ecuaciones de flujo:</p>
<ul>
<li>Las depresiones se rellenan desde los bordes y desde los cuerpos de agua, siempre por el punto de menor cota (algoritmo <i>priority-flood</i>; Barnes y otros, 2014).</li>
<li>Cada depresión constituye un almacenamiento que se llena hasta su cota de desborde.</li>
<li>Safer_RAIN (Samela y otros, 2020) aplica el procedimiento a áreas urbanas extensas.</li>
<li>Seleem y otros (2021) compararon estos métodos con un modelo hidrodinámico 2D en Berlín y concluyeron que localizan correctamente las depresiones, pero no reproducen la profundidad ni la dinámica. En este trabajo se emplean exclusivamente para comparar escenarios entre sí y no como sustituto del modelo bidimensional.</li>
<li>La altura sobre el drenaje más cercano (HAND) resulta adecuada para crecidas fluviales, aunque su exactitud depende de la calidad del relieve y no representa la acumulación pluvial alejada de los cauces (Aristizabal y otros, 2024).</li>
</ul>
<h2><span class="n">2.6</span>Modelación hidráulica bidimensional</h2>
<p>Las ecuaciones de aguas poco profundas describen el movimiento de una lámina de agua sobre el terreno. La formulación inercial local de Bates y otros (2010) desprecia el término convectivo de la cantidad de movimiento y conserva la inercia local, lo que admite pasos de tiempo mayores sin pérdida de la dinámica principal de la inundación. Constituye la base de modelos de uso profesional como LISFLOOD-FP. La infiltración se representa con el modelo de Green y Ampt (1911), con parámetros por clase textural (Rawls y otros, 1983).</p>
<h2><span class="n">2.7</span>Precipitación puntual y areal</h2>
<p>Una tormenta convectiva concentra la mayor parte de su volumen en pocos kilómetros, de modo que la precipitación media de un área es inferior a la registrada por un pluviómetro situado en su centro (Bonilla, 2016). Los productos grillados (reanálisis y estimaciones satelitales) representan promedios de celdas de 10 a 30 km y, en consecuencia, atenúan los picos de corta duración, efecto documentado por Benítez y otros (CONGREMET XV) y por Soto-Escobar y otros (2026) en la construcción de curvas intensidad-duración-frecuencia. Los datos del proyecto exhiben el mismo comportamiento:</p>
<ul>
<li>El 2 de abril de 2013 se registraron 392 mm en La Plata; ERA5 estima 13 mm para ese día e IMERG, 87 mm.</li>
<li>En el temporal del 16 al 18 de mayo de 2025, ERA5 estimó entre 68 y 78 mm en Zárate y Campana, donde se informaron más de 300 mm.</li>
</ul>
<h2><span class="n">2.8</span>Métricas de validación</h2>
<p>La comparación celda a celda de mapas de agua emplea las siguientes métricas:</p>
<ul>
<li><b>POD</b> (aciertos / superficie observada): fracción del agua observada que el modelo detecta.</li>
<li><b>FAR</b> (falsas alarmas / superficie simulada): fracción del agua simulada que no fue observada.</li>
<li><b>CSI</b> (aciertos / (aciertos + falsas alarmas + omisiones)): varía entre 0 y 1. Valores de 0,4 a 0,7 son habituales en modelos de escala global validados contra mapas satelitales de crecidas (Sadana y otros, 2025).</li>
<li><b>Error mediano y cociente mediano</b> (fuente / observación) para la precipitación, estadísticos robustos frente a valores extremos.</li>
</ul>
<p>Los productos ópticos (Dynamic World) no detectan el agua bajo nubes ni bajo vegetación. El radar de apertura sintética (Sentinel-1; Torres y otros, 2012) atraviesa la nubosidad, pero detecta con dificultad el agua entre edificaciones (Mukherjee y otros, 2024).</p>
<div class="decision"><b>Criterio adoptado</b>Se adoptó un modelo bidimensional inercial ejecutado en el navegador, sin infraestructura de servidor, complementado por un método estático destinado exclusivamente al ordenamiento de escenarios. El primero reproduce la dinámica en cualquier punto del país en segundos; el segundo compara nueve tormentas en milisegundos. Un modelo hidrodinámico calibrado ofrecería mayor fidelidad, pero requiere información local de la red de drenaje que, fuera de la Ciudad Autónoma de Buenos Aires, no se encuentra disponible.</div></section>''',

3: f'''<section><h1><span class="num">Capítulo 3</span>Datos: fuentes, cobertura y actualización</h1>
<p>La totalidad de las fuentes es pública y gratuita. La interfaz las clasifica en seis tipos, identificados con etiquetas de color: <b>observado</b>, <b>pronóstico</b>, <b>histórico</b>, <b>estimación propia</b>, <b>simulación</b> y <b>referencia</b>. Como criterio general, ninguna estimación ni simulación se presenta como medición.</p>
<div class="tabla-t">Tabla 2. Fuentes principales por tipo de dato</div>
<table><thead><tr><th>Fuente</th><th>Aporte</th><th>Tipo</th><th>Actualización</th></tr></thead><tbody>
<tr><td>Open-Meteo (modelos ECMWF y otros)</td><td>Lluvia, viento, ráfagas y temperatura a 16 días; humedad actual del suelo</td><td>Pronóstico</td><td>2 veces por día</td></tr>
<tr><td>SMN (alertas CAP)</td><td>Alertas vigentes con nivel y vencimiento</td><td>Observado</td><td>Cada 3 horas</td></tr>
<tr><td>Ensamble del ECMWF (IFS, datos abiertos, CC BY 4.0)</td><td>Lluvia diaria de 50 miembros a 15 días, celdas de 0,25°: base del riesgo diario</td><td>Pronóstico</td><td>2 veces por día</td></tr>
<tr><td>ECMWF SEAS5 vía Open-Meteo</td><td>Lluvia mensual esperada a 6 meses por gobierno local (referencia del simulador)</td><td>Pronóstico</td><td>Mensual (día 6)</td></tr>
<tr><td>INA (sistema de alerta, API a5)</td><td>Alturas en 175 estaciones con niveles de alerta y evacuación; lluvia diaria de 366 pluviómetros (red RHN-SAT, desde 2019)</td><td>Observado</td><td>Diaria</td></tr>
<tr><td>GloFAS v4 (Copernicus) vía Open-Meteo</td><td>Ensamble de 51 caudales a 15 días; pronóstico a 7 meses; reanálisis diario desde 1997</td><td>Pronóstico / histórico</td><td>2 veces por día / semanal</td></tr>
<tr><td>IMERG V07 Final (NASA) en Earth Engine</td><td>Precipitación satelital calibrada con pluviómetros, celdas de 0,1° cada 30 minutos, desde junio de 2000</td><td>Histórico</td><td>Precalculada</td></tr>
<tr><td>ERA5 y ERA5-Land (ECMWF)</td><td>Reanálisis horario: forma temporal de las tormentas, eventos anteriores a 2000, humedad del suelo y umbrales de lluvia por celda</td><td>Histórico</td><td>Precalculada</td></tr>
<tr><td>GHCN-Daily (NOAA)</td><td>Lluvia diaria de 75 estaciones argentinas (validación)</td><td>Observado</td><td>Fijo</td></tr>
<tr><td>Sentinel-1 (ESA) en Earth Engine</td><td>Radar de apertura sintética: validación fluvial y agua superficial actual para la simulación del pronóstico</td><td>Observado</td><td>Cada 3 horas</td></tr>
<tr><td>MODIS (NASA LANCE, vía GIBS)</td><td>Inundación observada del día y del día anterior, 250 m</td><td>Observado</td><td>Diaria</td></tr>
<tr><td>INDEC, Censo 2022</td><td>Población, cobertura cloacal, NBI y calidad de la vivienda en 66.515 radios censales</td><td>Histórico</td><td>Fijo</td></tr>
<tr><td>MERIT Hydro, Copernicus DEM, FABDEM</td><td>Altura sobre el drenaje (HAND), pendiente y relieve de 30 m sin edificaciones ni vegetación en 20 ciudades</td><td>Histórico</td><td>Fijo</td></tr>
<tr><td>JRC Global Surface Water y Dynamic World</td><td>Frecuencia de agua 1984–2021; agua y vegetación inundada observadas por Sentinel-2</td><td>Histórico</td><td>Fijo / anual</td></tr>
<tr><td>MapBiomas, SoilGrids 2.0, OpenLandMap</td><td>Superficie construida y humedales; textura y contenido de arcilla del suelo</td><td>Histórico</td><td>Anual / fijo</td></tr>
<tr><td>RENABAP, IGN, OpenStreetMap</td><td>Barrios populares, límites y localidades, infraestructura crítica, calles y cuerpos de agua</td><td>Referencia</td><td>Fijo</td></tr>
<tr><td>Photon, Nominatim, Georef y TomTom Search</td><td>Geocodificación de direcciones, lugares y establecimientos</td><td>Referencia</td><td>A demanda</td></tr>
<tr><td>Cálculo propio</td><td>Riesgo diario, propensión, probabilidades de crecida, tormentas históricas, simulación</td><td>Estimación / simulación</td><td>2 veces por día / a demanda</td></tr></tbody></table>
{fig(F["cobertura"], 1, "Cobertura de los datos principales sobre los 2.282 gobiernos locales. Las estaciones con niveles de alerta definidos se concentran en el Litoral y el Área Metropolitana; el noroeste, Cuyo y la Patagonia carecen de ellas.")}
<h2><span class="n">3.1</span>Selección de la fuente de precipitación histórica</h2>
<p>La validación del capítulo 8, sobre {L["tormentas"]} tormentas registradas en {L["pluviometros"]} pluviómetros, indicó que ERA5 reproduce el {pc(L["era5_100"]["mediana_cociente"])} de la lluvia de las tormentas de 100 mm o más, frente al {pc(L["imerg_100"]["mediana_cociente"])} de IMERG. En función de ese resultado se adoptó el siguiente criterio:</p>
<ul>
<li><b>Eventos desde 2000:</b> IMERG.</li>
<li><b>Evento 1997–98:</b> ERA5-Land, por inexistencia de IMERG, con indicación explícita en pantalla.</li>
<li><b>Eventos anteriores a 1997:</b> se presentan solo con carácter informativo, con ERA5 y sin caudal fluvial.</li>
</ul>
<h2><span class="n">3.2</span>Tratamiento de datos faltantes</h2>
<p>Ante la ausencia de un dato, el sistema emplea sustitutos explícitos o informa «Sin información»; en ningún caso se imputa un valor oculto.</p>
<ul>
<li><b>Red pluvial.</b> No existe una red pluvial pública fuera de la Ciudad Autónoma de Buenos Aires. La capacidad de desagüe se dimensiona con la lluvia horaria de recurrencia bienal del lugar (sección 6.6).</li>
<li><b>Curvas intensidad-duración-frecuencia.</b> No se dispone de curvas públicas para la mayoría de las ciudades, ni de estaciones del SMN en Zárate o Campana.</li>
<li><b>Estaciones GHCN-Daily.</b> Las series argentinas presentan numerosos faltantes posteriores a 2005, derivados de mensajes SYNOP incompletos; solo se emplean temporadas con al menos 90 % de días registrados.</li>
<li><b>Ríos.</b> Si una estación carece de altura medida o estimada en los días de una tormenta, el escenario se identifica como «sin dato del río».</li>
</ul>
<h2><span class="n">3.3</span>Actualización automática</h2>
<p>Un único flujo de GitHub Actions orquesta la ingesta con las siguientes frecuencias:</p>
<ul>
<li>alertas del SMN y agua superficial observada por radar, cada 3 horas;</li>
<li>alturas hidrométricas y pronóstico a 16 días, diariamente;</li>
<li>grilla del tiempo y riesgo de los 14 días, a las 05:20 y 17:20 (hora argentina);</li>
<li>GloFAS a 7 meses y verificación y calibración semanales, los lunes;</li>
<li>SEAS5, el día 6 de cada mes.</li>
</ul>
<p>Dado que la plataforma ejecuta las tareas programadas con demoras de varias horas, cada capa informa en pantalla la fecha y hora de su dato. Los pasos que dependen de servicios externos registran un diagnóstico de cada ejecución. Las tormentas históricas, las capacidades de desagüe y las alturas diarias de los ríos en cada temporada constituyen datos fijos y se precalculan una única vez (sección 4.3).</p></section>''',

4: f'''<section><h1><span class="num">Capítulo 4</span>Arquitectura del sistema</h1>
{fig(F["arquitectura"], 2, "Flujo de datos desde las fuentes públicas hasta la aplicación publicada. El procesamiento intensivo se realiza fuera del navegador (Python, SQL y Earth Engine); el simulador hidráulico constituye el único cálculo ejecutado en el cliente.")}
<h2><span class="n">4.1</span>Modelo de datos por capas</h2>
<p>El modelo de datos sigue una arquitectura de tres capas, denominada medallón:</p>
<ul>
<li><b>Bronze:</b> datos descargados sin transformación.</li>
<li><b>Silver:</b> datos depurados, con claves comunes (códigos de gobierno local y de radio censal).</li>
<li><b>Gold:</b> resultados finales: exposición, vulnerabilidad y propensión por gobierno local, riesgo diario, probabilidades de crecida y verificaciones.</li>
</ul>
<p>Las capas se construyen en SQL y se validaron con DuckDB, con resultados idénticos a los de la implementación en Python para los componentes de exposición y vulnerabilidad. La ejecución sobre Databricks se encuentra preparada.</p>
<h2><span class="n">4.2</span>Aplicación web</h2>
<p>La interfaz es una aplicación estática basada en MapLibre GL, complementada por maplibre-contour para las curvas de nivel y three.js para la maqueta tridimensional, que se carga solo cuando se la solicita. Se organiza en tres láminas (Panorama y mapa · Simulador 3D · Análisis y validación) y en módulos de responsabilidad única (tabla 3). El diseño visual responde a una guía propia: retícula de 8 px, filetes de 1 px, cifras en tipografía monoespaciada, semáforo reservado al nivel de riesgo y una revisión de cinco puntos previa a cada publicación.</p>
<div class="tabla-t">Tabla 3. Módulos de la aplicación</div>
<table><thead><tr><th>Módulo</th><th>Responsabilidad</th></tr></thead><tbody>
<tr><td>Textos</td><td>Contenido en español e inglés; los textos dependientes de datos se generan por función</td></tr>
<tr><td>Utilidades y gráficos</td><td>Formatos, geometría, íconos y gráficos vectoriales propios, sin librerías externas</td></tr>
<tr><td>Tiempo</td><td>Campos meteorológicos, partículas de viento y miniaturas</td></tr>
<tr><td>Mapa y buscador</td><td>Capas, curvas de nivel acotadas y geocodificación de provincias, partidos, localidades, direcciones, barrios populares, establecimientos y coordenadas</td></tr>
<tr><td>Tableros, láminas y guía</td><td>Tablero de cada capa, listado de cambios de nivel, análisis, gráfico de riesgo diario, fuentes por tipo y recorrido guiado</td></tr>
<tr><td>Aplicación</td><td>Estado, armado del riesgo diario, indicadores del área seleccionada y línea de tiempo</td></tr>
<tr><td>Simulador</td><td>Datos del lugar, base de tormentas históricas, motor hidráulico (en un <i>Web Worker</i>), escenarios, ordenamiento de eventos y maqueta 3D</td></tr></tbody></table>
<p><b>Adaptación a dispositivos.</b> Las pantallas de hasta 760 px disponen de un diseño específico, con barra superior, navegación fija inferior e indicadores en dos columnas. Cada modificación se verifica mediante mediciones automáticas a 390 y 1.440 px (desbordes, superposición de textos y coherencia entre indicador y mapa en 30 lugares aleatorios). La representación cartográfica varía con la escala: gobiernos locales a escala nacional, celdas de 0,1° a escala regional y radios censales a escala local.</p>
<h2><span class="n">4.3</span>Datos precalculados</h2>
<p>A fin de que el simulador responda en segundos en cualquier punto del país, la información invariable se calcula una única vez en Earth Engine y se almacena en {V["teselas"]} teselas binarias de 2° × 2° ({V["teselas_mb"]} MB); la aplicación descarga solo la correspondiente al punto seleccionado. Se precalculan:</p>
<ul>
<li>para cada celda de 0,1° y cada evento desde 1997–98, la tormenta de 3 días más severa, su total, su hora de mayor intensidad y la lluvia horaria de recurrencia bienal;</li>
<li>el rango de humedad del suelo en los eventos El Niño (ERA5-Land, 0–7 cm), la evapotranspiración de referencia de esos meses (Hargreaves) y la tormenta de 3 días más severa de los eventos de 1951 a 1996;</li>
<li>los umbrales de lluvia diaria según el método del SMN (sección 5.1) y la población en zona inundable por celda;</li>
<li>las 162 zonas rurales sin gobierno local, con sus variables de terreno, agua y uso del suelo;</li>
<li>la altura diaria de cada estación de octubre a mayo de cada evento, medida por el INA o estimada con GloFAS y la curva caudal-altura de la estación.</li>
</ul>
<p>El precálculo de la humedad, la evapotranspiración y los eventos antiguos reemplazó las consultas en tiempo real al archivo de Open-Meteo, que consumían alrededor de 350 unidades por apertura sobre un cupo gratuito de 10.000 diarias compartido por dirección IP.</p>
<h2><span class="n">4.4</span>Publicación y costo</h2>
<p>El sitio se publica automáticamente en Cloudflare Workers ante cada cambio del repositorio, con alrededor de 11 publicaciones diarias frente a un cupo gratuito de 500 mensuales. Al no requerir base de datos ni servidor propios, el costo operativo es nulo.</p></section>''',

5: f'''<section><h1><span class="num">Capítulo 5</span>Metodología del pronóstico de riesgo</h1>
<h2><span class="n">5.1</span>Riesgo diario basado en impacto</h2>
<p>El riesgo diario combina la <i>probabilidad</i> de un evento capaz de producir inundación (precipitación intensa, crecida fluvial o alerta oficial) con el <i>impacto</i> esperable en caso de ocurrencia (población en zona inundable y su vulnerabilidad). En ausencia de un evento pronosticado, el riesgo resulta «muy bajo» con independencia de las condiciones estructurales del lugar. El esquema corresponde a los pronósticos basados en impacto: el <i>Flood Guidance Statement</i> del Reino Unido, la matriz de crecidas repentinas del sistema europeo EFAS y el paradigma que el SMN incorpora a su Sistema de Alerta Temprana.</p>
<p>Este esquema sustituyó a una formulación previa basada en la estructura de INFORM, ∛(amenaza × exposición × vulnerabilidad), con una amenaza estructural siempre positiva. El contraste con la situación hidrometeorológica del 16 de noviembre de 2026 evidenció su inadecuación para un horizonte de días: el Chaco resultaba en nivel alto sin lluvia pronosticada; La Paz, Diamante y Paraná, con el río Paraná sobre el nivel de evacuación, resultaban en nivel bajo; y Córdoba, San Luis y Mendoza, bajo alerta naranja por 80 a 120 mm, en nivel muy bajo. La representación reflejaba principalmente las condiciones fijas y apenas variaba con el pronóstico.</p>
<h3>Formulación</h3>
<div class="formula">A<sub>d</sub> = máx( A<sub>lluvia,d</sub> ; A<sub>río,d</sub> ; A<sub>alerta,d</sub> )  ∈ {{0, 1, 2, 3}}<span class="eq">(1)</span></div>
<div class="formula">Nivel<sub>d</sub> = M( A<sub>d</sub> , I )  ·  Riesgo<sub>d</sub> = c<sub>nivel−1</sub> + ( c<sub>nivel</sub> − c<sub>nivel−1</sub> − 0,1 ) · p<sub>d</sub><span class="eq">(1b)</span></div>
<p>donde M es la matriz de la tabla 4, I el impacto (1 a 4), c los cortes de la escala (0 · 3 · 4,5 · 6 · 7 · 10) y p<sub>d</sub> la probabilidad del evento determinante. El valor de 0 a 10 ordena los casos dentro de cada nivel sin modificarlo. Cada fuente de amenaza se asocia a su propio impacto (la lluvia afecta las zonas más bajas; el río, su planicie de inundación) y el riesgo del día corresponde a la fuente de mayor valor.</p>
<div class="tabla-t">Tabla 4. Matriz de riesgo: amenaza (probabilidad) × impacto</div>
<table><thead><tr><th>Amenaza · Impacto</th><th>1 mínimo</th><th>2 menor</th><th>3 significativo</th><th>4 severo</th></tr></thead><tbody>
<tr><td>0 · sin evento</td><td>Muy bajo</td><td>Muy bajo</td><td>Muy bajo</td><td>Muy bajo</td></tr>
<tr><td>1 · amarilla</td><td>Bajo</td><td>Bajo</td><td>Medio</td><td>Medio</td></tr>
<tr><td>2 · naranja</td><td>Bajo</td><td>Medio</td><td>Alto</td><td>Alto</td></tr>
<tr><td>3 · roja</td><td>Medio</td><td>Alto</td><td>Muy alto</td><td>Muy alto</td></tr></tbody></table>
<h3>Amenaza por precipitación</h3>
<p>Para cada uno de los 50 miembros del ensamble del ECMWF (0,25°) y cada día, la lluvia de 24 h se compara con tres umbrales del lugar. El nivel corresponde al mayor umbral superado por al menos el 30 % de los miembros:</p>
<div class="formula">U<sub>k,ef</sub> = U<sub>k</sub> · f<sub>k</sub> · ( 1 − 0,20 · P ) · ( 1 − 0,25 · s<sub>m</sub> ) ,  s<sub>m</sub> = mín( 1 ; Σ<sub>j=1..5</sub> 0,85<sup>j−1</sup> · R<sub>m,d−j</sub> / U<sub>naranja</sub> )<span class="eq">(1c)</span></div>
<ul>
<li><b>U<sub>k</sub>, umbrales del SMN.</b> Se aplica el método de la Nota Técnica SMN 2021-109: percentil 90 de la lluvia diaria del mes más lluvioso (amarilla), percentil 99 (naranja) y un valor próximo al extremo (roja), calculados por celda de 0,1° con ERA5-Land 1991–2020, sobre días con 1 mm o más y redondeados a múltiplos de 5 mm. Mediana nacional: {V["umbr"]}. Los valores son consistentes con los publicados por el SMN para la llanura chaco-pampeana (amarilla de 30 a 50 mm; roja de 70 a 100 mm).</li>
<li><b>f<sub>k</sub>, factor de calibración</b> contra las alertas del SMN (sección 5.5): 0,20 para la amarilla y 0,25 para la naranja; la roja no se calibra (f = 1,0).</li>
<li><b>P, propensión del terreno</b> (0 a 1, a partir del agua observada por satélite y del terreno bajo): reduce el umbral hasta un 20 %.</li>
<li><b>s<sub>m</sub>, humedad antecedente</b>: índice de precipitación antecedente de 5 días de cada miembro (factor de decaimiento 0,85), relativo al umbral naranja; reduce el umbral hasta un 25 %.</li>
<li><b>Tolerancia temporal.</b> Desde el día siguiente, un miembro se computa si supera el umbral en el día considerado, el anterior o el posterior; para el día en curso se exige coincidencia exacta.</li>
</ul>
<h3>Amenaza fluvial y alertas oficiales</h3>
<ul>
<li><b>Río.</b> En las 43 estaciones del INA con curva caudal-altura validada, los 51 miembros de GloFAS se convierten en altura (sección 5.2). El nivel es 1 si el 30 % de los miembros alcanza el nivel de alerta, 2 si el 30 % alcanza el de evacuación y 3 si lo alcanza el 70 %. Para el día en curso prevalece la altura medida, que se mantiene durante al menos 3 días. En otras 36 estaciones con medición y sin curva se mantiene el nivel medido durante 7 días. La amenaza se aplica a los centros poblados situados a 15 km o menos de la estación, con un nivel menos entre 15 y 30 km.</li>
<li><b>Alertas del SMN</b> (formato CAP, por tormentas o lluvias) vigentes sobre el lugar: severidad moderada = 1, severa = 2, extrema = 3.</li>
</ul>
<h3>Impacto</h3>
<div class="formula">I = mín( 4 ; 1 + [N ≥ 100] + [N ≥ 1.000] + [N ≥ 10.000] + [V ≥ 6 y N ≥ 1] )<span class="eq">(1d)</span></div>
<p>N representa los habitantes expuestos a inundaciones del día d. Para la lluvia y las alertas se obtiene con el mismo terreno que el simulador hidráulico: una tabla precalculada para cada radio censal, con el código del simulador y 800 m de terreno alrededor de cada círculo de cálculo, da la fracción de su superficie que queda con 10 cm de agua o más para 9 lluvias de 3 días (10 a 300 mm) y 3 humedades del suelo, mediante el método estático del capítulo 7 (número de curva, depresiones del relieve y capacidad de desagüe bienal). Cada día se interpola en esa tabla la lluvia de 3 días que supera el 30 % de los miembros del ensamble, con la humedad antecedente del índice de 5 días; con alerta del SMN, la lluvia mínima es el umbral de ese nivel. Para el río se mantiene la población a menos de 5 m sobre el drenaje (MERIT Hydro). Con alerta naranja el impacto no desciende de «menor» y con roja de «significativo», dado que el relieve de 30 m no representa el escurrimiento por calles en tormentas intensas. V es la vulnerabilidad de 0 a 10, promedio de los indicadores normalizados de hogares sin cloaca, hogares con NBI, viviendas con materiales deficientes y barrios populares por habitante, con los umbrales de la tabla 5.</p>
<div class="tabla-t">Tabla 5. Umbrales físicos de vulnerabilidad y propensión</div>
<table><thead><tr><th>Indicador</th><th class="num">Valor 0</th><th class="num">Valor 1</th><th>Fundamento</th></tr></thead><tbody>
<tr><td>Hogares sin cloaca · materiales deficientes</td><td class="num">0 %</td><td class="num">100 %</td><td>Rango natural de la variable</td></tr>
<tr><td>Hogares con NBI</td><td class="num">0 %</td><td class="num">25 %</td><td>Media nacional de 6,5 %; los municipios más desfavorecidos, 30 a 50 %</td></tr>
<tr><td>Barrios populares cada 10.000 habitantes</td><td class="num">0</td><td class="num">10</td><td>Valor extremo de referencia</td></tr>
<tr><td>Superficie con agua alguna vez (JRC) · agua nueva en eventos El Niño (Dynamic World)</td><td class="num">0 %</td><td class="num">10 % · 5 %</td><td>Planicie inundable · inundación regional</td></tr></tbody></table>
<h3>Escala espacial y coherencia</h3>
<p>El cálculo se realiza por gobierno local (2.282 gobiernos locales y 162 zonas rurales, que suman 1,02 millones de km² y 434.729 habitantes sin cobertura en la formulación anterior) y por celda de 0,1°. Un punto seleccionado adopta el valor de su celda, idéntico al representado en el mapa, y la población del área seleccionada se calcula del mismo modo en el panorama y en el simulador.</p>
<div class="tabla-t">Tabla 6. Parámetros adoptados, fundamento y alternativas evaluadas</div>
<table><thead><tr><th>Parámetro</th><th>Fundamento</th><th>Alternativa evaluada y motivo del descarte</th></tr></thead><tbody>
<tr><td>Matriz probabilidad × impacto</td><td>Representa lo que puede ocurrir y varía con el pronóstico; esquema de FGS, EFAS y SMN</td><td>∛(A·E·V) de INFORM: índice estructural; representaba las condiciones fijas y asignaba nivel alto sin lluvia</td></tr>
<tr><td>Umbrales del SMN (percentiles 90 y 99 y extremo, 24 h)</td><td>Coherencia con las alertas de difusión pública</td><td>Lluvia de 3 días de 2, 5 y 10 años de recurrencia: no comunicable y no coincidente con las alertas</td></tr>
<tr><td>Umbrales calculados con ERA5-Land</td><td>Consistencia con el pronóstico (mismo centro, ECMWF) y cobertura nacional</td><td>Estaciones del SMN: red rala; la comparación de un modelo con un pluviómetro sesga las probabilidades</td></tr>
<tr><td>Probabilidad mínima de 30 %</td><td>Criterio de aviso del EFAS; revisión semanal contra lo observado (sección 5.5)</td><td>10–20 %: exceso de falsas alarmas; 50 % o más: avisos tardíos</td></tr>
<tr><td>Tolerancia de ±1 día desde el día siguiente</td><td>Desfase temporal de los miembros a plazos mayores, criterio análogo al índice de extremos del ECMWF</td><td>Coincidencia exacta: los días 3 a 14 no registraban tormentas presentes en el ensamble</td></tr>
<tr><td>Calibración contra alertas del SMN</td><td>El ensamble atenúa las tormentas: sin calibración coincidía con 184 de 1.656 gobiernos locales alertados</td><td>Reducción de la probabilidad mínima a 10 %: no corrige la intensidad (184 coincidencias)</td></tr>
<tr><td>Nivel rojo sin calibrar</td><td>Ausencia de alertas rojas en la muestra</td><td>Calibración con el factor naranja: 1.110 gobiernos locales en rojo, resultado alarmista</td></tr>
<tr><td>Humedad antecedente (−25 % máx.), índice de 5 días</td><td>Criterio del sistema de guía de crecidas repentinas de la OMM (FFGS)</td><td>Modelo continuo de humedad (Sacramento): sin datos ni corridas propias</td></tr>
<tr><td>Propensión del terreno (−20 % máx.)</td><td>En la llanura la inundación se produce por anegamiento, no contemplado en las alertas por tormenta</td><td>Amenaza fija aditiva: asignaba riesgo sin evento</td></tr>
<tr><td>Zona inundable a &lt; 2 m (lluvia) y &lt; 5 m (río), proporcional</td><td>Superposición de amenaza y población (Manual de mapas de riesgo, Ministerio del Interior); 5 m capta los barrios ribereños de ciudades sobre barranca</td><td>Radio completo si más de la mitad es terreno bajo: La Paz y Diamante resultaban sin población expuesta</td></tr>
<tr><td>Cortes de impacto 100 · 1.000 · 10.000</td><td>Escala logarítmica de las matrices de impacto</td><td>Cortes relativos: un 25 % de los casos siempre «severo» con independencia de la población</td></tr>
<tr><td>Un nivel adicional con V ≥ 6</td><td>La vulnerabilidad agrava el daño de un mismo evento</td><td>Producto por V: reintroducía el componente estructural</td></tr>
<tr><td>Persistencia fluvial de 3 días</td><td>Un río de llanura no desciende de evacuación a alerta en un día</td><td>Solo GloFAS: discontinuidades diarias (Goya)</td></tr>
<tr><td>Horizonte de 14 días</td><td>El ensamble alcanza 360 h</td><td>15 días: último día incompleto</td></tr></tbody></table>
<h3>Indicadores del panorama</h3>
<table><thead><tr><th>Indicador</th><th>Cálculo</th><th>Finalidad</th></tr></thead><tbody>
<tr><td>Riesgo del lugar (0–10)</td><td>Ecuaciones 1 a 1d; máximo del período seleccionado</td><td>Respuesta principal, con el día de mayor riesgo</td></tr>
<tr><td>Habitantes en zona inundable</td><td>N de la ecuación 1d en el lugar o el área; con su porcentaje de la población</td><td>Población alcanzable si ocurre el evento</td></tr>
<tr><td>Gobiernos locales y radios en riesgo alto</td><td>Cantidad con riesgo ≥ 6 sobre el total</td><td>Extensión del problema</td></tr>
<tr><td>Ríos en alerta o evacuación</td><td>Estaciones del INA cercanas por estado</td><td>Amenaza de evolución lenta y mayor certeza</td></tr>
<tr><td>Alertas del SMN vigentes</td><td>Alertas por tormentas o lluvias sobre el lugar</td><td>Información oficial sin reinterpretación</td></tr>
<tr><td>Lluvia máx. 7 días · ráfaga máx. 72 h · temperatura máx. 7 días</td><td>Pronóstico de la grilla del tiempo en el lugar</td><td>Contexto de la amenaza</td></tr>
<tr><td>Día más crítico</td><td>Día de los próximos 14 con más población en riesgo alto (zona) o mayor riesgo (área)</td><td>Planificación de la preparación</td></tr>
<tr><td>Propensión a acumular agua</td><td>P de 0 a 10, fija</td><td>Sensibilidad del lugar aun sin amenaza pronosticada</td></tr></tbody></table>
<div class="nota"><b>Supuestos.</b> La lluvia de una celda de 10 km representa al lugar; el Censo registra el lugar de residencia y no el de trabajo; la zona inundable es un indicador topográfico y no un mapa de inundación modelado; las alertas del SMN se emplean sin modificación; el factor de calibración es único para todo el país.</div>
{alcance("Indica dónde y cuándo existe mayor riesgo en los próximos 14 días, con umbrales del SMN y niveles del INA, y se recalibra semanalmente contra lo observado. No reemplaza una alerta oficial ni estima daños.")}
<h2><span class="n">5.2</span>Modelo fluvial</h2>
<p>El caudal pronosticado por GloFAS se convierte en altura en cada estación mediante una curva caudal-altura ajustada a las mediciones del INA (regresión isotónica con desfase temporal y corrección del sesgo reciente). Se obtiene así la probabilidad de superar los niveles de alerta y de evacuación en cada uno de los próximos 14 días y en cada uno de los próximos 7 meses.</p>
<p>El error de la curva frente a lo medido se evalúa en los días pasados de cada corrida. El error de los últimos 2 días predomina al inicio y converge al de los últimos 15 con una escala temporal de 5 días:</p>
<div class="formula">sesgo(d) = e<sub>15</sub> + ( e<sub>2</sub> − e<sub>15</sub> ) · exp( −d / 5 )<span class="eq">(1e)</span></div>
<p>Cuando existe medición, el error inicial e<sub>2</sub> corresponde al del día en curso, de modo que el pronóstico parte de la altura observada. Esta corrección elimina las discontinuidades entre el estado medido y el primer día pronosticado, originadas por el desfase de alrededor de 10 días entre el caudal y la altura en el Paraná.</p>
<ul>
<li>De 91 estaciones evaluadas, 43 superaron un coeficiente de validación de 0,7 y son las que se emplean.</li>
<li>La verificación continua frente a lo medido arroja un error medio de {n2(V["verif"]["rio_error"])} m y un sesgo de {n2(V["verif"]["rio_sesgo"])} m sobre {V["verif"]["rio_pares"]} pares.</li>
<li>La misma curva convierte el reanálisis de GloFAS (desde 1997) en la altura diaria de cada evento para el simulador.</li>
</ul>
{alcance("Probabilidades de alerta y evacuación en 43 estaciones con curva validada. Fuera de ellas no se realiza estimación, condición que se informa. Los valores extremos de GloFAS se contrastan con el INA y se presentan como escenario.")}
<h2><span class="n">5.3</span>Reclamos por anegamiento en la Ciudad Autónoma de Buenos Aires</h2>
<p>A partir de los reclamos pluviales a la línea 147 (2011–2026) y de la lluvia diaria se ajustó un modelo por barrio:</p>
<ul>
<li>La correlación diaria con los reclamos observados es de 0,44, frente a −0,03 de la línea base.</li>
<li>La correlación de Spearman entre barrios, para el total del período, es de 0,87.</li>
<li>En los 58 días con 20 mm o más, el modelo reproduce 659 de los 1.165 reclamos observados, frente a 335 de la línea base: representa la distribución, pero subestima la magnitud.</li>
</ul>
<h2><span class="n">5.4</span>Verificación del pronóstico de precipitación</h2>
<p>Cada pronóstico de lluvia se archiva y se compara con lo observado. Sobre {V["verif"]["dias"]} días verificados, la correlación desciende de {n2(V["verif"]["c03"])} a 0–3 días a {n2(V["verif"]["c47"])} a 4–7 días y a {n2(V["verif"]["c815"])} a 8–15 días. Esta pérdida de habilidad con el plazo fundamenta el tratamiento del riesgo de cada día como un pronóstico de incertidumbre creciente y justificó el abandono del riesgo mensual. En el cálculo mensual de exposición y propensión que se conserva, dicha precisión define el peso del pronóstico frente a la climatología ({n2(V["verif"]["peso"])}).</p>
{fig(F["verif"], 3, "Verificación del pronóstico de lluvia por plazo.")}
<h2><span class="n">5.5</span>Verificación y calibración continuas</h2>
<p>Los parámetros del riesgo se contrastan periódicamente con lo observado y se ajustan de forma gradual, sin modificar el método. La frecuencia de cada proceso responde a la disponibilidad del dato observado y al número de eventos necesario para no ajustar al ruido (tabla 7).</p>
<div class="tabla-t">Tabla 7. Procesos de verificación y calibración</div>
<table><thead><tr><th>Frecuencia</th><th>Proceso</th><th>Fundamento de la frecuencia</th></tr></thead><tbody>
<tr><td>2 veces por día</td><td>Recálculo del riesgo a 14 días y archivo de la probabilidad de superación de cada umbral</td><td>Disponibilidad de las corridas del ECMWF (00 y 12 UTC)</td></tr>
<tr><td>Diaria</td><td>Registro de lo observado: lluvia del análisis de corto plazo del ECMWF frente a cada pronóstico archivado (0 a 13 días de anticipación); estado de cada estación del INA frente a lo pronosticado y a la persistencia</td><td>Dato observado diario y de bajo costo, que de otro modo se pierde</td></tr>
<tr><td>Semanal</td><td>Métricas de 8 semanas (aciertos, falsas alarmas, puntaje de Brier, confiabilidad) y ajuste de la probabilidad mínima (máximo ETS) y de la persistencia fluvial</td><td>Se requieren al menos 30 eventos en 21 días; cambio máximo de 0,05 o de 1 día por semana, dentro de límites</td></tr>
<tr><td>Semanal</td><td>Calibración de los umbrales contra las alertas del SMN de las últimas 8 semanas</td><td>Cambio máximo de 0,05 por semana, a fin de que una semana atípica no desbalancee el ajuste</td></tr>
<tr><td>Mensual (previsto)</td><td>Agua observada por Sentinel-1 frente a los lugares en nivel alto y frente al simulador</td><td>Revisita del satélite de 12 días</td></tr></tbody></table>
<p><b>Calibración contra el SMN.</b> Para cada día con alertas archivadas desde el 28 de septiembre se obtiene la lluvia diaria observada (ERA5-Land) en la grilla de 0,1° y se determina el factor f que maximiza la coincidencia entre «lluvia &gt; f × umbral» y «alerta vigente de ese nivel o superior». La métrica es el ETS (<i>equitable threat score</i>), estándar en la verificación de precipitación por descontar los aciertos atribuibles al azar. Sobre 43 días se obtuvo f = 0,20 para la amarilla (ETS 0,117) y f = 0,25 para la naranja (ETS 0,134). Un factor reducido no implica que el SMN alerte por 6 mm: sus alertas abarcan zonas extensas con posibilidad de tormentas intensas aisladas, que en el promedio de una celda de 10 km se manifiestan como lluvia moderada. Con la calibración, el 17 de noviembre el modelo coincidió con el SMN en 1.395 de 2.038 gobiernos locales alertados (184 de 1.656 sin calibración) y se eliminó la discontinuidad entre el día en curso, con alertas, y los días siguientes, sin ellas.</p>
<p>Cada ajuste automático queda registrado con su fecha y su motivo. Los parámetros que aún carecen de verificación propia (humedad antecedente y propensión del terreno) permanecen fijos hasta disponer del control mensual con radar.</p>
</section>''',

6: f'''<section><h1><span class="num">Capítulo 6</span>Modelo hidráulico y escenarios históricos</h1>
<p>El simulador responde a la pregunta: <i>con una tormenta y un nivel de río dados, ¿dónde se acumula el agua, hacia dónde escurre y qué vías quedan interrumpidas?</i> El cálculo se ejecuta en el navegador para un círculo de 0,5 a 20 km de radio y se representa sobre una maqueta tridimensional con imagen satelital. Dispone de dos modos: simulación de escenarios (eventos históricos o tormenta definida por el usuario) y simulación del pronóstico (sección 6.9). Ambos parten de las condiciones observadas del día: humedad actual del suelo, agua superficial detectada por el radar y nivel del río, que se toma como el mayor entre el del escenario y el actual.</p>
{fig(F["hidraulica"], 4, "Balance de agua de cada celda del modelo.")}
<h2><span class="n">6.1</span>Formulación</h2>
<p>El agua se transfiere entre celdas vecinas según la ecuación inercial local de Bates y otros (2010). El caudal por unidad de ancho q en cada cara se actualiza con el gradiente de la superficie libre η y la fricción de Manning:</p>
<div class="formula">q<sup>t+Δt</sup> = ( q<sup>t</sup> − g · h<sub>f</sub> · Δt · ∂η/∂x ) / ( 1 + g · Δt · n² · |q<sup>t</sup>| / h<sub>f</sub><sup>7/3</sup> )<span class="eq">(2)</span></div>
<p>donde q es el caudal por unidad de ancho (m²/s), g la aceleración de la gravedad (m/s²), h<sub>f</sub> la profundidad en la cara (m), n el coeficiente de Manning según la cobertura (s/m<sup>1/3</sup>) y Δt un paso adaptativo, Δt = α · Δx / √(g (h<sub>máx</sub> + 0,3)), con un máximo de 30 s. La lluvia horaria ingresa en 12 intervalos de 5 minutos. La infiltración sigue el modelo de Green-Ampt:</p>
<div class="formula">f = K<sub>s</sub> · ( 1 + ψ · Δθ / F )<span class="eq">(3)</span></div>
<p>donde K<sub>s</sub> es la conductividad hidráulica saturada (mm/h), ψ la succión en el frente de humedecimiento (mm), Δθ el déficit de humedad y F la lámina infiltrada acumulada (mm). Los parámetros se asignan por clase textural (SoilGrids 2.0, 0–30 cm). El balance de masa cierra con un error de 0,00 %.</p>
<h2><span class="n">6.2</span>Terreno, cuerpos de agua y condiciones de borde</h2>
<ul><li><b>Relieve.</b> FABDEM de 30 m, sin edificaciones ni vegetación, en las 20 ciudades con mayor población en riesgo; AWS Terrain Tiles en el resto del territorio.</li>
<li><b>Grilla.</b> Las celdas se alinean a una cuadrícula común y su tamaño se define por tramos de radio: alrededor de 32 m hasta 1,5 km, 63 m hasta 3 km, 127 m hasta 6 km y así sucesivamente, de modo que cada celda de un tramo equivale exactamente a 2 × 2 celdas del anterior. Dentro de un tramo, un mismo lugar corresponde siempre a la misma celda y el resultado no varía con el radio. Cada corrida demanda 9 s o menos.</li>
<li><b>Arroyos y canales.</b> Se graban en el terreno (1 m arroyos y zanjas; 2 m canales); su contenido no se computa como inundación.</li>
<li><b>Lagunas.</b> Su contorno se obtiene píxel a píxel de la combinación de los polígonos de agua de la cartografía base, la frecuencia histórica de agua (JRC, presencia en al menos el 10 % de las observaciones de 1984–2021), el agua y la vegetación inundada de Dynamic World del último año y el agua detectada por Sentinel-1 en su última pasada, depurada con un filtro de mayoría de 3 × 3. Cada laguna almacena agua con un nivel único y desborda por su cota más baja; las conectadas a un río forman parte de él.</li>
<li><b>Dominio de cálculo.</b> El círculo se modela con 800 m de terreno alrededor: el agua entra y sale según el relieve y una depresión cortada por el borde no desagota de forma artificial; resultados e indicadores se computan solo dentro del círculo.</li>
<li><b>Agua observada en los eventos con radar.</b> En los escenarios de 2015-16 y 2023-24, el agua detectada por Sentinel-1 en el mes de la tormenta (VV &lt; −16 dB, excluida el agua permanente) se incorpora al finalizar la lluvia como nivel mínimo de cada depresión: solo se agrega donde el modelo no alcanzó a cubrirla. En siete localidades del Litoral el aporte fue de 0 a 39 ha.</li>
<li><b>Ríos.</b> Nivel impuesto, referido al nivel de evacuación de la estación del INA más cercana (a menos de 15 km). En dicho nivel el agua alcanza la orilla correspondiente al cuantil 40 % de las cotas de orilla, y cada metro de diferencia se suma o se resta. Los bordes del dominio tienen condición de salida libre.</li></ul>
<h2><span class="n">6.3</span>Parámetros del escenario</h2>
<p>Cada parámetro varía entre el mínimo y el máximo registrados <b>en los eventos El Niño desde 1997–98 en el lugar</b>. En ausencia de registro de un evento se emplea el registro completo y, si este tampoco existe, un rango supuesto que se informa en pantalla. El viento no se incluye como parámetro, ya que no modifica el volumen acumulado; su efecto relevante, la sudestada, se representa a través del nivel del río o del mar.</p>
<div class="tabla-t">Tabla 8. Parámetros del escenario</div>
<table><thead><tr><th>Parámetro</th><th>Rango</th><th>Origen del rango</th></tr></thead><tbody>
<tr><td>Lluvia (mm) y duración (1 a 72 h)</td><td>0 al máximo de esa duración</td><td>Máximo registrado para esa duración en algún evento (IMERG). Se conocen la hora, el día y los 3 días más lluviosos de cada temporada; entre esos valores la lluvia crece como potencia de la duración, según la forma de las curvas intensidad-duración-frecuencia, y se adopta el mayor entre ese valor y el de las tormentas horarias</td></tr>
<tr><td>Humedad del suelo</td><td>Mínimo y máximo de los eventos</td><td>ERA5, 0–7 cm, en el punto</td></tr>
<tr><td>Lagunas</td><td>−1,5 m a colmadas</td><td>Sin registro: rango supuesto</td></tr>
<tr><td>Río (con estación)</td><td>Mínimo y máximo de los eventos, del día actual y de las tormentas</td><td>Alturas del INA y estimaciones de GloFAS</td></tr>
<tr><td>Desagüe</td><td>0 a 30 mm/h; por defecto, la lluvia horaria de recurrencia bienal</td><td>Sección 6.6</td></tr></tbody></table>
<h2><span class="n">6.4</span>Tormentas de los eventos El Niño</h2>
<p>Para cada evento desde 1997–98, la tormenta más severa del lugar se define como el período de 3 días consecutivos con mayor precipitación en su celda IMERG entre octubre y abril. Se registran su fecha de inicio, su total, su hora de mayor intensidad y, con fines comparativos, la lluvia estimada por ERA5 en las mismas fechas.</p>
<p>El hietograma horario se construye con la distribución temporal de ERA5, corregida para que el total T y la intensidad máxima M coincidan con los de IMERG, mediante una corrección de sesgo no lineal (Leander y Buishand, 2007):</p>
<div class="formula">p*<sub>t</sub> = M · ( p<sub>t</sub> / p<sub>máx</sub> )<sup>b</sup>,&nbsp;&nbsp;con b tal que Σ p*<sub>t</sub> = T<span class="eq">(4)</span></div>
<p>La función Σ (p<sub>t</sub>/p<sub>máx</sub>)<sup>b</sup> decrece monótonamente con b, desde el número de horas con lluvia (b = 0) hasta 1 (b → ∞), por lo que b se determina por bisección. Si ERA5 no registró la tormenta, se emplea un hietograma triangular del SCS con el mismo total e intensidad máxima. La humedad del suelo corresponde a la de ERA5 en la hora previa al inicio de la lluvia.</p>
<p>La simulación comprende 2 h sin lluvia, la tormenta y 36 h adicionales para completar el escurrimiento.</p>
<h2><span class="n">6.5</span>Nivel del río durante la tormenta</h2>
<p>Conforme a lo expuesto en la sección 2.3, la lluvia y el nivel del río deben corresponder al mismo período. La altura del escenario es la máxima entre el primer día de lluvia y tres días después del último:</p>
<div class="formula">h<sub>río</sub> = máx {{ h(d) : d<sub>inicio</sub> ≤ d ≤ d<sub>fin</sub> + 3 días }}<span class="eq">(5)</span></div>
<p>La ventana de tres días responde al tiempo durante el cual el escurrimiento urbano y periurbano continúa drenando hacia el río, lapso en el que un nivel alto impide su evacuación.</p>
<ul>
<li>Para cada día se emplea la altura medida por el INA o, en su ausencia, la estimada con GloFAS y la curva de la estación (sección 5.2), con indicación del origen en pantalla.</li>
<li>Si no existe dato para esas fechas, el escenario lo informa y el método del capítulo 7 no incorpora el aporte fluvial.</li>
<li>La crecida máxima de la temporada se presenta solo como información de contexto.</li>
</ul>
<h2><span class="n">6.6</span>Capacidad de desagüe</h2>
<p>Las redes pluviales urbanas se dimensionan habitualmente para recurrencias de 2 a 10 años; la Ciudad Autónoma de Buenos Aires adoptó 10 años en su Plan Director, y antes de las obras correspondientes el arroyo Maldonado no admitía siquiera la tormenta bienal. En ausencia de información sobre la red de cada ciudad, se adopta la recurrencia inferior como capacidad por defecto:</p>
<div class="formula">D = mediana de los máximos anuales de la lluvia horaria (IMERG, 2001–2025)<span class="eq">(6)</span></div>
<p>La mediana de los máximos anuales corresponde, por definición, al valor superado en promedio una vez cada dos años. Se calcula con la misma fuente que las tormentas, condición relevante porque IMERG atenúa los picos (sección 2.7): su hora de mayor intensidad se sitúa en torno a {V['desague']['p1_rango']} mm/h, mientras que un pluviómetro puede registrar 40 mm o más en una hora. La comparación entre tormenta y capacidad expresadas en la misma escala preserva la coherencia del balance.</p>
<p>La mediana nacional de D es de {V["desague"]["mediana"]} mm/h y en Zárate, de {V["desague"]["zarate"]} mm/h. El parámetro admite representar desagües obstruidos (0) o de mayor capacidad.</p>
<h2><span class="n">6.7</span>Resultados informados</h2>
<table><thead><tr><th>Resultado</th><th>Definición</th></tr></thead><tbody>
<tr><td>Superficie anegada y profundidad máxima</td><td>Celdas de tierra del círculo con 10 cm o más; profundidad máxima en la depresión más profunda, excluida el agua contenida en cauces</td></tr>
<tr><td>Habitantes</td><td>Población residente en el círculo (Censo 2022, radios con centroide interior), con el mismo cálculo que el panorama</td></tr>
<tr><td>Habitantes en zona inundable</td><td>Población a menos de 2 m sobre el drenaje (ecuación 1d), con el mismo cálculo que el panorama</td></tr>
<tr><td>Habitantes alcanzados por el agua</td><td>Población de las celdas con 10 cm o más en el instante de máxima acumulación. Puede superar a la población en zona inundable, dado que la tormenta también acumula agua en calles y depresiones urbanas alejadas de los cauces</td></tr>
<tr><td>Calles cortadas, habitantes aislados y centros de salud sin acceso</td><td>Calles con 30 cm o más (los puentes se consideran transitables); población que en condiciones secas accede al límite del área y con agua no; centros de salud anegados o con sus accesos cortados</td></tr>
</tbody></table>
<h2><span class="n">6.8</span>Visualización</h2>
<p>La maqueta emplea imagen satelital de alta resolución (hasta nivel de zoom 18, alrededor de 0,6 m por píxel en un círculo de 0,5 km) y representa las acumulaciones de 2 cm o más. El agua permanente se representa con su contorno real y la película de agua en los cauces se extiende hasta la orilla observada. Durante la lluvia, líneas de flujo siguen la pendiente de la superficie calculada; su dirección proviene del cálculo, mientras que su velocidad y longitud son ilustrativas.</p>
<p>La preparación solicita en paralelo el relieve y los datos del lugar, y el relieve tridimensional se carga solo si se abre esa vista. En consecuencia, el escenario más severo queda disponible en alrededor de 3,5 s.</p>
<h2><span class="n">6.9</span>Simulación del pronóstico</h2>
<p>El segundo modo responde a la pregunta: <i>con la lluvia ocurrida y la pronosticada, ¿dónde habrá agua en los próximos días?</i> La corrida parte de las condiciones actuales:</p>
<ul>
<li><b>Lluvia antecedente.</b> La precipitación horaria de los últimos 14 días en el punto (análisis de los modelos, Open-Meteo) humedece el suelo y llena las depresiones hasta su estado actual.</li>
<li><b>Agua observada por radar.</b> Donde Sentinel-1 detectó agua en su última pasada (hasta 12 días; VV &lt; −16 dB, excluida el agua permanente), cada depresión parte del nivel que cubre exactamente esas celdas en la hora de la pasada.</li>
<li><b>Lluvia pronosticada.</b> De 1 a 7 días, el pronóstico horario; de 8 a 15 días, uno de los 51 miembros del ensamble del ECMWF, seleccionado por su total: el probable (mediana) o el pesimista (percentil 90).</li>
<li><b>Río.</b> Hasta el día en curso, la altura medida por el INA; en adelante, la altura pronosticada (mediana de los 51 miembros de GloFAS convertidos a altura y anclados a la medición del día, ecuación 1e), interpolada horariamente. En estaciones sin curva validada se mantiene la altura actual.</li>
</ul>
<p>La interfaz distingue la lluvia observada de la pronosticada con confianza alta (0–2 días), media (3–6 días) y baja (7–15 días).</p>
{alcance(f"Representa la acumulación de agua para una tormenta y un nivel de río dados, en un círculo de hasta 20 km y con resolución horaria. En crecidas con estación cercana detecta el {pc(R['ahora']['pod'])} del agua observada por radar. No representa la red pluvial real (se supone uniforme) ni el aporte externo al círculo, y no fue posible validar el anegamiento urbano de pocas horas. Las tormentas son reales, aunque con una resolución de 11 km que atenúa los picos de minutos. La simulación del pronóstico hereda su incertidumbre, creciente con el plazo; el río sigue la mediana de GloFAS, sin su dispersión.")}</section>''',

7: f'''<section><h1><span class="num">Capítulo 7</span>Método estático de ordenamiento de escenarios</h1>
<p>El selector de eventos identifica el que afectó a mayor población dentro del círculo. La ejecución del modelo hidráulico para cada evento demanda varios minutos, por lo que se formuló un método físico estático que, con todas las variables del escenario y sin resolver la dinámica del flujo, se evalúa en milisegundos sobre la misma grilla del modelo.</p>
{fig(PEOR, 5, "Cadena de cálculo del método estático. Cada componente emplea datos del lugar o de la tormenta; ninguno constituye un factor de ajuste.")}
<h2><span class="n">7.1</span>Escurrimiento de superficies permeables</h2>
<p>La humedad relativa del lugar al inicio de la tormenta se expresa respecto de su propio rango en los eventos El Niño (ERA5), lo que evita depender de la porosidad, proveniente de otra fuente y causante de saturaciones superiores al 100 % en formulaciones previas:</p>
<div class="formula">w = ( θ − θ<sub>mín</sub> ) / ( θ<sub>máx</sub> − θ<sub>mín</sub> ),&nbsp;&nbsp;0 ≤ w ≤ 1<span class="eq">(7)</span></div>
<p>El CN medio (CN II) se asigna por textura: 49 en suelos arenosos, 61 en franco-arenosos, 69 en francos, 79 en franco-arcillosos y 84 en arcillosos, valores correspondientes a pastura en condición regular para los grupos hidrológicos A a D. Con las conversiones de Chow y otros (1988):</p>
<div class="formula">CN<sub>I</sub> = 4,2 CN / (10 − 0,058 CN) ;&nbsp;&nbsp;CN<sub>III</sub> = 23 CN / (10 + 0,13 CN) ;&nbsp;&nbsp;S = 25.400 / CN − 254 (mm)<span class="eq">(8)</span></div>
<p>S<sub>0,20</sub> se interpola linealmente con w entre S<sub>I</sub> (w = 0), S<sub>II</sub> (w = 0,5) y S<sub>III</sub> (w = 1), según Brocca y otros (2009), y se convierte a λ = 0,05 (Hawkins y otros, 2002):</p>
<div class="formula">S<sub>0,05</sub> = 25,4 · 1,33 · ( S<sub>0,20</sub> / 25,4 )<sup>1,15</sup> ;&nbsp;&nbsp;Q = ( P − 0,05 S )² / ( P + 0,95 S ) si P &gt; 0,05 S<span class="eq">(9)</span></div>
<h2><span class="n">7.2</span>Escurrimiento de superficies impermeables</h2>
<p>En techos y calzadas escurre la fracción de la lluvia horaria que excede la capacidad de desagüe, de modo que el resultado depende tanto del volumen como de su distribución temporal:</p>
<div class="formula">Q<sub>imp</sub> = Σ<sub>t</sub> máx( 0 ; i<sub>t</sub> − D ) (mm)<span class="eq">(10)</span></div>
<h2><span class="n">7.3</span>Acumulación en depresiones</h2>
<p>Sobre la grilla del modelo, el terreno se rellena con <i>priority-flood</i> (Barnes y otros, 2014) desde los bordes y los cuerpos de agua. Cada conjunto de celdas situado al menos 1 cm por debajo de la cota de llenado constituye una depresión k, con cota de desborde z<sub>k</sub><sup>tope</sup>. Cada celda de tierra drena según la máxima pendiente (D8) hacia una depresión o hacia el exterior. La depresión k recibe el volumen de su cuenca de aporte:</p>
<div class="formula">V<sub>k</sub> = ( A<sub>perm,k</sub> · Q + A<sub>imp,k</sub> · Q<sub>imp</sub> ) / 1.000 (m³)<span class="eq">(11)</span></div>
<p>y su nivel h<sub>k</sub> asciende hasta almacenarlo, de la celda de menor a la de mayor cota; el excedente desborda:</p>
<div class="formula">Σ<sub>z<sub>i</sub> &lt; h<sub>k</sub></sub> ( h<sub>k</sub> − z<sub>i</sub> ) · Δx² = mín( V<sub>k</sub> ; V<sub>k</sub><sup>máx</sup> ) ;&nbsp;&nbsp;d<sub>i</sub> = máx( 0 ; h<sub>k</sub> − z<sub>i</sub> )<span class="eq">(12)</span></div>
<p>Este procedimiento reemplazó una formulación previa que distribuía el agua en la fracción del círculo con HAND inferior a 2 m y la dividía por (1 + pendiente %), factor carente de fundamento y de calibración.</p>
<h2><span class="n">7.4</span>Aporte fluvial</h2>
<p>Con la altura del río durante la tormenta (ecuación 5), la superficie fluvial adopta la misma convención que el modelo hidráulico:</p>
<div class="formula">η = z<sub>base</sub> + b + ( h<sub>río</sub> − h<sub>evac</sub> )<span class="eq">(13)</span></div>
<p>donde z<sub>base</sub> es el nivel base del río en el relieve y b la altura de la orilla del cuantil 40 % sobre dicha base. El agua ocupa toda la tierra hidráulicamente conectada al río con cota inferior a η, sin límite de distancia, dado que el río no alcanza zonas separadas por terreno más alto. La limitación previa a 1 km de la orilla omitía, según la validación con radar (sección 8.3), tres cuartos del agua observada. En cada celda la profundidad es la mayor entre la de origen pluvial y la fluvial.</p>
<h2><span class="n">7.5</span>Resultado</h2>
<div class="formula">Personas = Σ<sub>c ∈ círculo</sub> pob<sub>c</sub> · [ d<sub>c</sub> ≥ 0,10 m ]<span class="eq">(14)</span></div>
<p>El evento más severo es el de mayor población afectada; en caso de empate, el de mayor volumen acumulado. La tabla de eventos de la aplicación informa, para cada uno desde 1997–98, su tormenta, el nivel del río y la población estimada; los eventos anteriores se presentan con carácter informativo.</p>
{alcance("Ordena los eventos de un lugar según su efecto estimado sobre la población, a partir de la física del suelo, el relieve y el río. No resuelve el movimiento del agua: no encadena desbordes entre depresiones ni considera el tiempo de drenaje. En el componente fluvial coincide con el modelo hidráulico en equilibrio (sección 8.3); el componente pluvial no pudo validarse contra registros de daños por la inexistencia de una base pública de afectados por barrio. Constituye una estimación comparativa y no un recuento.")}</section>''',

8: f'''<section><h1><span class="num">Capítulo 8</span>Validación</h1>
<p>La simulación de lluvia sobre un relieve tridimensional no equivale, por sí misma, a la simulación de una inundación real. En consecuencia, cada componente se contrastó con observaciones independientes: la física del motor, la precipitación, el nivel fluvial y el agua observada por satélite.</p>
<h2><span class="n">8.1</span>Pruebas numéricas</h2>
<p>El motor se contrastó con soluciones conocidas:</p>
<ul>
<li>En un recinto cerrado, el balance cierra exactamente y el nivel final es de 49,6 cm, frente a 49,8 cm teóricos.</li>
<li>En una ladera con lluvia constante, el caudal alcanza entre el 93 y el 95 % de la solución de Manning.</li>
<li>En casos reales (La Plata a 21 días, Corrientes a 3 meses), el balance de masa cierra con un error de 0,00 %.</li>
</ul>
<h2><span class="n">8.2</span>Precipitación: tres fuentes frente a pluviómetros</h2>
<p><b>Datos.</b> Se emplearon {L["pluviometros"]} pluviómetros: los de la red RHN-SAT del INA (temporadas 2019–20 a 2025–26, incluido el evento 2023–24) y las estaciones del SMN en GHCN-Daily (temporadas 2002–03 y 2004–05, las únicas completas).</p>
<p><b>Método.</b></p>
<ul>
<li>Para cada pluviómetro y temporada con al menos 90 % de días registrados se identificó la tormenta de 3 días más severa.</li>
<li>Se la comparó con ERA5-Land, IMERG y su promedio en la celda de 0,1°. Dado que el día pluviométrico se extiende de 9 a 9 h, equivale a 15 h de un día de las fuentes y 9 h del siguiente.</li>
<li><b>Control de calidad:</b> se descartaron {L["descartadas"]} tormentas en las que el pluviómetro difería en más de 10 veces, en el mismo sentido, de ambas fuentes, que son independientes entre sí. Correspondían a registros espurios, como 576 mm en las sierras de Córdoba frente a 10 mm satelitales, o a equipos obstruidos.</li>
<li>La muestra final comprendió {L["tormentas"]} tormentas.</li>
</ul>
{fig(F["lluvia"], 6, "Tormenta de 3 días más severa de cada temporada: lluvia de cada fuente frente a la del pluviómetro (izquierda; 100 % indica coincidencia) y error mediano (derecha), por magnitud de la tormenta observada.")}
<p><b>Resultados.</b></p>
<ul>
<li><b>Muestra completa:</b> el promedio de ambas fuentes presenta el menor error, {pc(L["promedio"]["error_mediano"])}.</li>
<li><b>Tormentas de 100 mm o más</b> ({L["imerg_100"]["n"]} casos), determinantes de la inundación: IMERG reproduce el {pc(L["imerg_100"]["mediana_cociente"])} de lo observado, con error {pc(L["imerg_100"]["error_mediano"])}; el promedio, el {pc(L["promedio_100"]["mediana_cociente"])} (error {pc(L["promedio_100"]["error_mediano"])}); ERA5, el {pc(L["era5_100"]["mediana_cociente"])} (error {pc(L["era5_100"]["error_mediano"])}).</li>
<li><b>Lluvias inferiores a 60 mm:</b> IMERG sobrestima, aunque estas no determinan el evento más severo.</li>
</ul>
<p>Sobre la base de estos resultados se adoptó IMERG como fuente de las tormentas históricas.</p>
<div class="decision"><b>Corrección evaluada y descartada</b>Se evaluó un mapeo de cuantiles (Piani y otros, 2010; Gudmundsson y otros, 2012) para llevar el producto a la escala del pluviómetro, mediante validación cruzada con exclusión de una temporada. El método no redujo el error: corrige el sesgo medio, pero no la subestimación de las tormentas intensas, que se distribuyen entre valores bajos y altos del producto. Su aplicación habría incorporado un parámetro adicional sin beneficio medido.</div>
<h2><span class="n">8.3</span>Crecida fluvial: Concordia frente al radar</h2>
<p><b>Caso.</b> El 26 de noviembre de 2023, durante el evento 2023–24, el INA registró 13,79 m en Concordia, con nivel de evacuación de 12,5 m. Sentinel-1 adquirió una imagen el día 28, con el río aún en {n2(R["altura"])} m.</p>
<p><b>Observación.</b> Agua detectada por el radar en esa fecha (VV &lt; −16 dB, filtro de mediana de 50 m), excluida el agua presente durante el estiaje de enero a marzo de 2023 y el agua permanente (JRC &gt; 80 %), remuestreada a la grilla del modelo.</p>
<p><b>Simulación.</b> Método estático del capítulo 7 y modelo hidráulico, sin lluvia y con el río a esa altura.</p>
{fig(F["rio"], 7, f"Crecida del río Uruguay en Concordia (28-nov-2023), {R['celdas_tierra']:,} celdas de tierra de {R['celda_m']} m en un círculo de 5 km. Con umbrales del radar de −15 y −18 dB el orden de los resultados se mantiene.".replace(",", "."))}
<p><b>Resultados.</b></p>
<ul>
<li>La formulación previa, limitada a 1 km de la orilla, detectaba el {pc(R["antes"]["pod"])} del agua observada (CSI {n2(R["antes"]["csi"])}).</li>
<li>Con el criterio de tierra conectada y de cota inferior al nivel del río, la detección asciende al {pc(R["ahora"]["pod"])} (CSI {n2(R["ahora"]["csi"])}), igual que el modelo hidráulico.</li>
<li>Parte de las falsas alarmas ({pc(R["ahora"]["far"])}) corresponde a barrios anegados no detectables por el radar, en los que la doble reflexión en las fachadas eleva la señal del agua.</li>
<li>La misma prueba permitió detectar y corregir un defecto del motor, que solo iniciaba el movimiento del agua ante lluvia o cambio de nivel del río.</li>
</ul>
<h2><span class="n">8.4</span>Anegamiento persistente frente a Dynamic World</h2>
<p><b>Método.</b></p>
<ul>
<li>Se simularon los eventos 2015–16 y 2023–24 y la sequía 2022–23, de noviembre a abril, en las 20 ciudades con relieve FABDEM, en un círculo de 5 km.</li>
<li>Se emplearon la lluvia horaria y la altura del río observadas.</li>
<li>El resultado se comparó celda a celda con el agua observada por Dynamic World (clase modal del mes, excluida el agua permanente). Una celda se considera con agua en el mes si mantiene 10 cm o más durante al menos la mitad de las horas.</li>
<li>La referencia trivial es la presencia histórica de agua (JRC): un modelo que no la supera no aporta información adicional al mapa histórico.</li>
</ul>
<p><b>Resultados.</b></p>
<ul>
<li>En la mayoría de los casos el satélite registró menos de 20 celdas con agua (alrededor de 0,5 km²), en particular en el conurbano, donde los anegamientos duran horas y no son registrados por los sensores ópticos.</li>
<li>En los {D["n"]} casos con superficie suficiente, el CSI mediano es de {n2(D["csi"])}, frente a {n2(D["jrc"])} de la referencia.</li>
<li>El modelo supera a la referencia en {D["gana"]} de {D["n"]} casos, principalmente donde predomina la crecida de un río con estación cercana.</li>
</ul>
{fig(F["val"], 8, "CSI del modelo y de la referencia en los casos con superficie observada suficiente.")}
<div class="nota"><b>Riesgo de sobreajuste.</b> El cuantil de orilla (40 %) se seleccionó entre tres valores evaluados sobre los mismos datos de validación. La crecida de Concordia (sección 8.3) no intervino en dicha selección y constituye una prueba independiente.</div>
<h2><span class="n">8.5</span>Síntesis</h2>
<table><thead><tr><th>Componente</th><th>Referencia</th><th>Resultado</th><th>Interpretación</th></tr></thead><tbody>
<tr><td>Motor hidráulico</td><td>Soluciones analíticas</td><td>Balance 0,00 %; recinto y ladera dentro de 1–7 %</td><td>Físicamente consistente</td></tr>
<tr><td>Precipitación de las tormentas</td><td>{L["tormentas"]} tormentas en pluviómetros</td><td>IMERG: {pc(L["imerg_100"]["mediana_cociente"])} de lo observado en tormentas de 100 mm o más (error {pc(L["imerg_100"]["error_mediano"])})</td><td>Adecuada para comparar eventos; atenúa los picos de minutos</td></tr>
<tr><td>Componente fluvial</td><td>Sentinel-1, Concordia 2023</td><td>POD {n2(R["ahora"]["pod"])}, CSI {n2(R["ahora"]["csi"])}</td><td>Buen desempeño en crecidas con estación cercana</td></tr>
<tr><td>Anegamiento persistente</td><td>Dynamic World, 20 ciudades</td><td>CSI {n2(D["csi"])} frente a {n2(D["jrc"])} de la referencia</td><td>Equivalente al mapa histórico</td></tr>
<tr><td>Anegamiento urbano de horas</td><td>Sin observación disponible</td><td>No validado</td><td>Orientativo</td></tr></tbody></table></section>''',

9: f'''<section><h1><span class="num">Capítulo 9</span>Especificación funcional</h1>
<div class="tabla-t">Tabla 9. Requerimientos funcionales implementados</div>
<table><thead><tr><th style="width:11mm">Código</th><th>Función</th><th>Descripción</th></tr></thead><tbody>
<tr><td>RF-01</td><td>Láminas</td><td>Tres láminas con solapas: Panorama y mapa · Simulador 3D · Análisis y validación</td></tr>
<tr><td>RF-02</td><td>Lectura del lugar</td><td>Nivel de riesgo con escala de aguja, radio del área (1 km por defecto), evolución en el período y condiciones meteorológicas del lugar</td></tr>
<tr><td>RF-03</td><td>Indicadores del área</td><td>Habitantes en zona inundable, radios en riesgo alto, ríos a 15 km o menos, alertas vigentes sobre el punto y día más crítico; método y fuente disponibles en cada indicador</td></tr>
<tr><td>RF-04</td><td>Buscador</td><td>Provincia, partido, localidad, dirección, barrio popular (RENABAP), establecimiento (TomTom y registro propio) y coordenadas, ordenados por relevancia; ante ausencia de coincidencia ofrece alternativas en lugar de un resultado aproximado</td></tr>
<tr><td>RF-05</td><td>Mapa</td><td>Riesgo, lluvia, viento y temperatura; capas superponibles (hidrografía, alertas del SMN, zonas inundadas históricamente, inundación observada del día, densidad, barrios, suelo, infraestructura, rutas); curvas de nivel acotadas</td></tr>
<tr><td>RF-06</td><td>Detalle del lugar</td><td>Recuadro asociado a la selección, con el punto y el área, que da acceso al simulador</td></tr>
<tr><td>RF-07</td><td>Situación y recomendaciones</td><td>Nivel, período, día más comprometido, causa, antecedentes y población; recomendaciones de prevención y de emergencia construidas con los datos del lugar; propensión a acumular agua</td></tr>
<tr><td>RF-08</td><td>Riesgo diario</td><td>Línea de tiempo de 14 días con reproducción; gráfico de riesgo diario vinculado al mapa; listado de zonas que aumentan, se mantienen o descienden de nivel</td></tr>
<tr><td>RF-09</td><td>Análisis y validación</td><td>Gráficos vinculados a los filtros y resultados de la validación del simulador</td></tr>
<tr><td>RF-10</td><td>Simulador: reproducción</td><td>Control de reproducción, hora, barra temporal, velocidad y gráfico de lluvia y agua; maqueta en condición seca al inicio de cada escenario</td></tr>
<tr><td>RF-11</td><td>Simulador: escenario</td><td>Parámetros de lluvia, duración (1–72 h), humedad, lagunas, río y desagüe con sus límites y fuentes; inicialización con el evento más severo del lugar</td></tr>
<tr><td>RF-12</td><td>Simulador: eventos</td><td>Selector de eventos desde 1997–98 con su tormenta, fecha y nivel del río; identificación del evento más severo; tabla informativa de los 27 eventos desde 1951</td></tr>
<tr><td>RF-13</td><td>Simulador: resultados</td><td>Superficie anegada y profundidad máxima, habitantes, habitantes en zona inundable, habitantes alcanzados, calles cortadas, habitantes aislados y centros de salud sin acceso</td></tr>
<tr><td>RF-14</td><td>Simulador: pronóstico</td><td>14 días observados, agua actual por radar y 15 días de pronóstico, probable o pesimista</td></tr>
<tr><td>RF-15</td><td>Fuentes y recorrido</td><td>Fuentes clasificadas por tipo de dato y recorrido guiado de 13 pasos</td></tr>
<tr><td>RF-16</td><td>Requerimientos transversales</td><td>Español e inglés; tema claro y oscuro; diseño específico para dispositivos móviles; separador de miles con punto</td></tr></tbody></table>
<h2><span class="n">9.1</span>Secuencia de uso</h2>
<ol><li><b>Panorama nacional.</b> La lámina 01 resume la situación del día y de los 14 siguientes e identifica las zonas que aumentan de nivel.</li><li><b>Selección del lugar.</b> Mediante el buscador o el mapa; el radio define el área de análisis.</li><li><b>Lectura del lugar.</b> Los indicadores describen el área; «Situación» explica el nivel y «Qué hacer» distingue prevención y emergencia.</li><li><b>Simulación.</b> Se selecciona un evento o se ajustan los parámetros y se reproduce la tormenta.</li></ol></section>''',

10: f'''<section><h1><span class="num">Capítulo 10</span>Aseguramiento de la calidad y trazabilidad</h1>
<h2><span class="n">10.1</span>Principios</h2>
<ul><li><b>Trazabilidad.</b> Cada cifra informa su fuente, su fecha y su método. Ante la falta de un dato se informa «Sin información», sin imputaciones ocultas.</li><li><b>Coherencia temporal.</b> Un escenario histórico emplea lluvia, humedad y nivel fluvial del mismo período.</li><li><b>Selección por medición.</b> Cada fuente y cada regla se seleccionan por comparación con observaciones, y la comparación se publica.</li><li><b>Explicitación de la incertidumbre.</b> La validación y sus límites se informan en la aplicación. Se evaluó un indicador de confianza por hora simulada y se lo descartó: sin una medición propia de cada lugar, no aportaba información.</li></ul>
<h2><span class="n">10.2</span>Pruebas</h2>
<p>La aplicación se verifica en un navegador Chrome sin interfaz gráfica, controlado mediante su protocolo de depuración, con guiones que devuelven mediciones numéricas en lugar de capturas, lo que los hace repetibles y de bajo costo. Cada conjunto de cambios se acompaña de una batería de pruebas específica y de un detector automático de superposiciones y desbordes a 1.440 y 390 px. Las validaciones del capítulo 8 se ejecutan con procedimientos del repositorio sobre la misma versión que se publica.</p>
<h2><span class="n">10.3</span>Defectos detectados y correcciones</h2>
<table><thead><tr><th>Defecto</th><th>Causa</th><th>Corrección</th></tr></thead><tbody>
<tr><td>Flujo de automatización inválido durante tres días</td><td>Nombre de paso con «: », sintaxis YAML inválida</td><td>Corrección y validación del YAML previa a cada cambio</td></tr>
<tr><td>Agua espuria en el modelo (balance de −109.724 %)</td><td>Ríos y lagunas inicializados por encima de su orilla</td><td>Nivel inicial bajo la orilla; balance de 0,00 %</td></tr>
<tr><td>Indicadores del punto con valores del gobierno local</td><td>Lectura del gobierno local en lugar del área</td><td>Cálculo con los radios censales interiores al área</td></tr>
<tr><td>Ordenamiento de eventos de varios minutos</td><td>Ejecución del modelo hidráulico para cada evento</td><td>Método estático (capítulo 7), en milisegundos</td></tr>
<tr><td>Aporte espurio de ríos lejanos</td><td>Distribución del agua fluvial en todas las depresiones del área</td><td>Criterio de tierra conectada y de cota inferior, validado con radar</td></tr>
<tr><td>Nivel fluvial no coincidente con la tormenta</td><td>Empleo de la crecida máxima de la temporada</td><td>Nivel de los días de la tormenta (ecuación 5)</td></tr>
<tr><td>Tormentas con la mitad de la lluvia observada</td><td>Atenuación de la convección en ERA5</td><td>Adopción de IMERG, sobre {L["tormentas"]} tormentas observadas</td></tr>
<tr><td>Ausencia de inundación con río alto y sin lluvia</td><td>Motor inicializado en reposo</td><td>Inicialización dinámica ante río o mar</td></tr>
<tr><td>Lagunas dependientes del radio del área</td><td>Grilla de tamaño fijo con origen en cada área</td><td>Grilla alineada y por tramos encajados (sección 6.2)</td></tr>
<tr><td>Tiempos de cálculo excesivos en radios grandes</td><td>Celda única de 32 m: 1,5 min a 3 km y 5 min a 5 km</td><td>Tramos de radio: 9 s o menos</td></tr>
<tr><td>Discontinuidad fluvial entre el estado medido y el pronóstico</td><td>Omisión del caudal de los 10 días previos y sesgo fijo de calibración</td><td>31 días previos y persistencia del error anclada a la medición del día (ecuación 1e)</td></tr>
<tr><td>Superación del cupo gratuito de Open-Meteo</td><td>Volumen del ensamble para 1.345 celdas</td><td>Datos abiertos del ECMWF, sin cupo</td></tr>
<tr><td>Agotamiento del cupo diario por red</td><td>Consulta de series diarias de décadas en cada apertura del simulador</td><td>Precálculo en Earth Engine (sección 4.3)</td></tr>
<tr><td>Riesgo alto sin evento pronosticado</td><td>Índice estructural aplicado a un horizonte de días</td><td>Matriz probabilidad × impacto (sección 5.1)</td></tr>
<tr><td>Discontinuidad del riesgo entre el día en curso y los siguientes</td><td>Atenuación de las tormentas en el ensamble frente a las alertas vigentes</td><td>Calibración contra el SMN y tolerancia de ±1 día</td></tr>
<tr><td>Lagunas no representadas o con contorno en bloques</td><td>Detección limitada al agua abierta y representación por celda del modelo</td><td>Máscara píxel a píxel con JRC, Dynamic World y radar (sección 6.2)</td></tr></tbody></table></section>''',

11: f'''<section><h1><span class="num">Capítulo 11</span>Metodología de desarrollo</h1>
<p>El proyecto se desarrolló entre el 27 de septiembre y el 17 de noviembre de 2026 mediante un proceso iterativo: cada ciclo comprendió la definición del requerimiento, la revisión de antecedentes, la implementación, la verificación automática y el registro de las decisiones en una bitácora fechada y en el historial de versiones. El código se escribió con asistencia de un modelo de lenguaje (Claude, de Anthropic) como herramienta de programación; la definición del alcance, la selección de los métodos, el diseño y la evaluación de los resultados constituyen el trabajo documentado.</p>
{fig(F["crono"], 9, "Etapas del desarrollo.")}
<div class="tabla-t">Tabla 10. Etapas y decisiones principales</div>
<table class="cronologia"><thead><tr><th>Etapa</th><th>Contenido</th></tr></thead><tbody>
<tr><td>1</td><td>Relevamiento de fuentes; definición del alcance (territorio argentino, 2.282 gobiernos locales y 66.515 radios); ingesta con reintentos; procesamiento en Earth Engine; restricción al riesgo de inundación; arquitectura medallón.</td></tr>
<tr><td>2</td><td>Análisis por zona; geocodificación; adaptación a dispositivos móviles; capas meteorológicas.</td></tr>
<tr><td>3</td><td>Diseño de la interfaz como sala de situación; publicación del sitio; primer simulador tridimensional.</td></tr>
<tr><td>4</td><td>Modelo hidráulico bidimensional; relieve FABDEM; validación frente a Dynamic World.</td></tr>
<tr><td>5</td><td>Revisión crítica externa: explicitación de la confianza, de los datos faltantes y de los límites; rediseño en láminas.</td></tr>
<tr><td>6</td><td>Umbrales físicos; indicadores por área; escenarios históricos; método estático de ordenamiento; restricción a eventos con datos completos.</td></tr>
<tr><td>7</td><td>Revisión bibliográfica de 17 trabajos; validación de la precipitación ({L["tormentas"]} tormentas) y adopción de IMERG; nivel fluvial de los días de la tormenta; validación fluvial con radar y corrección del motor; λ = 0,05, humedad relativa, depresiones del relieve y desagüe bienal; simulación del pronóstico; inundación observada por satélite.</td></tr>
<tr><td>8</td><td>Riesgo diario en sustitución del mensual, con ensamble del ECMWF, GloFAS corregido con el INA y alertas del SMN; grilla por tramos de radio; guía de diseño; diagnóstico de la automatización.</td></tr>
<tr><td>9</td><td>Matriz probabilidad × impacto con umbrales del SMN y niveles del INA; 162 zonas rurales; representación por celdas.</td></tr>
<tr><td>10</td><td>Calibración contra las alertas del SMN y verificación automática diaria y semanal; coherencia entre panorama y simulador; condiciones iniciales observadas en el simulador; lagunas con contorno real.</td></tr></tbody></table>
</section>''',

12: f'''<section><h1><span class="num">Capítulo 12</span>Conclusiones</h1>
<ol>
<li>Es factible construir, exclusivamente con datos públicos y servicios gratuitos, un sistema de pronóstico de riesgo de inundación de cobertura nacional, con actualización automática y resolución de gobierno local, celda de 0,1° y radio censal.</li>
<li>Para un horizonte de días, el esquema probabilidad × impacto resulta más adecuado que un índice estructural del tipo INFORM: el riesgo responde al pronóstico y se anula en ausencia de evento, en concordancia con las prácticas del EFAS, el <i>Flood Guidance Statement</i> y el SMN.</li>
<li>El ensamble del ECMWF, con celdas de 25 km, atenúa las tormentas convectivas. La calibración contra las alertas oficiales elevó la coincidencia con el SMN de 184 a 1.395 gobiernos locales alertados, con un acuerdo moderado (ETS de 0,12 a 0,13) que se reevalúa semanalmente.</li>
<li>La selección de la fuente de precipitación histórica debe basarse en mediciones: ERA5 reproduce el {pc(L["era5_100"]["mediana_cociente"])} de las tormentas de 100 mm o más e IMERG, el {pc(L["imerg_100"]["mediana_cociente"])}. La corrección por cuantiles no mejoró el resultado.</li>
<li>La coincidencia temporal entre lluvia y nivel fluvial es una condición necesaria de los escenarios de inundación compuesta; los escenarios con la crecida máxima de la temporada representan situaciones no ocurridas.</li>
<li>El modelo hidráulico inercial ejecutado en el navegador reproduce las crecidas fluviales con estación cercana (POD {pc(R["ahora"]["pod"])}, CSI {n2(R["ahora"]["csi"])} en Concordia) y alcanza en el anegamiento persistente un desempeño equivalente al mapa histórico (CSI {n2(D["csi"])} frente a {n2(D["jrc"])}).</li>
<li>El anegamiento urbano de pocas horas no puede validarse con los sensores satelitales disponibles; los resultados correspondientes deben interpretarse como orientativos.</li>
</ol></section>''',

13: f'''<section><h1><span class="num">Capítulo 13</span>Limitaciones, riesgos y trabajo futuro</h1>
<h2><span class="n">13.1</span>Limitaciones</h2>
<ul><li><b>Resolución de la precipitación.</b> IMERG (11 km) atenúa los picos de minutos: su hora de mayor intensidad se sitúa en torno a {V['desague']['p1_rango']} mm/h, frente a 40 mm o más en pluviómetro, y en tormentas de 150 mm o más reproduce en mediana el 73 % de lo observado. Sobrestima las lluvias leves. Para 1997–98 solo se dispone de ERA5-Land, que subestima.</li>
<li><b>Ventana fluvial.</b> Los tres días posteriores a la tormenta constituyen un criterio físico no calibrado. GloFAS convertido a altura presenta errores del orden de 1 m. La sudestada no se modela, limitación relevante en el Delta.</li>
<li><b>Método estático.</b> No encadena desbordes entre depresiones ni considera el tiempo de drenaje; depende de la precisión vertical del relieve satelital (1 a 3 m) y no se validó contra daños.</li>
<li><b>Simulador.</b> El desagüe se supone uniforme; no se representa el aporte externo al área; los cauces se graban con un ancho supuesto; la validación con Dynamic World empleó celdas de 150 m, frente a 32 m del simulador; la simulación del pronóstico emplea la mediana fluvial sin su dispersión.</li>
<li><b>Riesgo diario.</b> Depende de un pronóstico de 25 km; la calibración presenta un acuerdo moderado; los habitantes expuestos se derivan de la acumulación en depresiones y no incluyen el escurrimiento por calles, por lo que el anegamiento urbano breve puede estar subestimado (de allí el piso por alerta); el componente fluvial conserva el criterio topográfico de 5 m; el nivel rojo no pudo calibrarse por ausencia de alertas rojas en la muestra; no se estiman pérdidas ni daños.</li>
<li><b>Automatización.</b> La plataforma ejecuta las tareas programadas con demoras de varias horas.</li>
<li><b>Cobertura fluvial.</b> Los ríos sin estación con niveles de alerta (noroeste, Cuyo, Patagonia) carecen de estimación.</li></ul>
<h2><span class="n">13.2</span>Riesgos del proyecto</h2>
<table><thead><tr><th>Riesgo</th><th>Mitigación</th></tr></thead><tbody>
<tr><td>Inestabilidad de las fuentes (INA, SMN, Open-Meteo)</td><td>Reintentos, copias y avisos en pantalla; datos históricos precalculados</td></tr>
<tr><td>Interpretación alarmista o como producto oficial</td><td>Aviso permanente, lenguaje moderado, validación visible y fuentes clasificadas por tipo</td></tr>
<tr><td>Licencias y cupos</td><td>FABDEM CC BY-NC-SA; OpenStreetMap ODbL; Open-Meteo, Earth Engine y TomTom gratuitos para uso no comercial; clave de TomTom restringida al dominio; Cloudflare, 500 publicaciones mensuales</td></tr></tbody></table>
<h2><span class="n">13.3</span>Trabajo futuro</h2>
<ol>
<li>Control mensual con Sentinel-1 y calibración de los factores de humedad antecedente y propensión.</li>
<li>Incorporación del percentil 90 de GloFAS en la variante pesimista de la simulación del pronóstico.</li>
<li>Análisis de sensibilidad a la ventana fluvial (1, 3 y 7 días) con las crecidas de 2015–16.</li>
<li>Validación con radar en otras crecidas: Paraná 2015–16 y el propio evento 2026–27.</li>
<li>Incorporación de la sudestada (Servicio de Hidrografía Naval) en el Delta.</li>
<li>Contraste del método estático con registros de daños (Defensa Civil, noticias geolocalizadas).</li>
<li>Encadenamiento de desbordes entre depresiones, según Safer_RAIN.</li>
<li>Curvas intensidad-duración-frecuencia locales para el pasaje de la lluvia areal a la puntual.</li>
<li>Ejecución del modelo de datos en Databricks.</li>
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
<dt>Propensión a acumular agua</dt><dd>Cuánto tiende un lugar a acumular agua por su relieve, su historia de agua y sus quebradas, de 0 a 10, independiente del pronóstico.</dd>
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

"anexo": f'''<section><h1><span class="num">Anexo C</span>Parámetros del sistema</h1>
<div class="tabla-t">Tabla C.1. Parámetros principales y su origen</div>
<table><thead><tr><th>Parámetro</th><th class="num">Valor</th><th>Origen</th></tr></thead><tbody>
<tr><td>Probabilidad mínima de aviso</td><td class="num">30 %</td><td>Criterio EFAS; ajuste semanal por ETS</td></tr>
<tr><td>Factor de calibración amarilla · naranja · roja</td><td class="num">0,20 · 0,25 · 1,0</td><td>Calibración contra alertas del SMN</td></tr>
<tr><td>Reducción máxima por propensión · humedad antecedente</td><td class="num">20 % · 25 %</td><td>Criterio FFGS (OMM)</td></tr>
<tr><td>Decaimiento del índice antecedente (5 días)</td><td class="num">0,85</td><td>Índice de precipitación antecedente</td></tr>
<tr><td>Persistencia fluvial con curva · sin curva</td><td class="num">3 · 7 días</td><td>Ajuste semanal (con curva)</td></tr>
<tr><td>Distancia de influencia fluvial</td><td class="num">15 · 30 km</td><td>Criterio adoptado</td></tr>
<tr><td>Zona inundable lluvia · río (HAND)</td><td class="num">2 · 5 m</td><td>Manual de mapas de riesgo; barrios ribereños</td></tr>
<tr><td>Cortes de impacto</td><td class="num">100 · 1.000 · 10.000</td><td>Escala logarítmica</td></tr>
<tr><td>Abstracción inicial λ</td><td class="num">0,05</td><td>Hawkins y otros (2002)</td></tr>
<tr><td>Cuantil de orilla del río</td><td class="num">40 %</td><td>Validación frente a Dynamic World</td></tr>
<tr><td>Ventana fluvial posterior a la tormenta</td><td class="num">3 días</td><td>Tiempo de drenaje urbano</td></tr>
<tr><td>Capacidad de desagüe por defecto</td><td class="num">T = 2 años</td><td>Recurrencia mínima de diseño</td></tr>
<tr><td>Umbral de agua del radar (VV)</td><td class="num">−16 dB</td><td>Sensibilidad evaluada entre −15 y −18 dB</td></tr>
<tr><td>Frecuencia mínima de agua histórica (JRC)</td><td class="num">10 %</td><td>Lagunas permanentes y temporarias</td></tr>
<tr><td>Profundidad mínima de afectación · calle cortada</td><td class="num">10 · 30 cm</td><td>Criterio adoptado</td></tr></tbody></table></section>''',
}

"""Texto del documento funcional (HTML). Las figuras y los números de página entran como parámetros."""

LOGO = '''<svg viewBox="0 0 40 40" class="logo"><rect width="40" height="40" rx="10" fill="#0e7490"/><path d="M8 24c3 0 3-2 6-2s3 2 6 2 3-2 6-2 3 2 6 2" fill="none" stroke="#22d3ee" stroke-width="2.4" stroke-linecap="round"/><path d="M8 30c3 0 3-2 6-2s3 2 6 2 3-2 6-2 3 2 6 2" fill="none" stroke="#a5f3fc" stroke-width="2.4" stroke-linecap="round" opacity=".7"/><path d="M20 8c3 3.6 5 6.3 5 8.8a5 5 0 0 1-10 0c0-2.5 2-5.2 5-8.8Z" fill="#ecfeff"/></svg>'''

OLAS = '''<svg class="olas" viewBox="0 0 794 227" preserveAspectRatio="none"><path d="M0 120c60 0 80-30 140-30s80 30 140 30 80-30 140-30 80 30 140 30 80-30 140-30 60 30 94 30V227H0Z" fill="#0e7490" opacity=".28"/><path d="M0 160c60 0 80-30 140-30s80 30 140 30 80-30 140-30 80 30 140 30 80-30 140-30 60 30 94 30V227H0Z" fill="#0e7490" opacity=".45"/><path d="M0 200c60 0 80-26 140-26s80 26 140 26 80-26 140-26 80 26 140 26 80-26 140-26 60 26 94 26V227H0Z" fill="#22d3ee" opacity=".22"/></svg>'''

ARQUITECTURA = '''<svg viewBox="0 0 640 262" xmlns="http://www.w3.org/2000/svg" font-family="Avenir Next, Gill Sans, Helvetica Neue, Arial, sans-serif" font-size="9">
<defs><marker id="f" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#5b6675"/></marker></defs>
<g stroke="#5b6675" stroke-width="1.3" fill="none" marker-end="url(#f)"><path d="M118 118H140"/><path d="M262 118H284"/><path d="M404 118H426"/><path d="M526 118H548"/><path d="M345 168V196"/><path d="M478 150V196"/></g>
<g text-anchor="middle">
<rect x="6" y="44" width="112" height="148" rx="8" fill="#eef3f7" stroke="#c7d0da"/><text x="62" y="62" font-weight="700" fill="#0a1c28">FUENTES</text>
<text x="62" y="80" fill="#5b6675">SMN · INA · INDEC</text><text x="62" y="94" fill="#5b6675">Open-Meteo (ECMWF)</text><text x="62" y="108" fill="#5b6675">GloFAS · SEAS5</text><text x="62" y="122" fill="#5b6675">Earth Engine</text><text x="62" y="136" fill="#5b6675">(JRC, Dynamic World,</text><text x="62" y="148" fill="#5b6675">MapBiomas, DEM)</text><text x="62" y="162" fill="#5b6675">IGN · RENABAP · OSM</text><text x="62" y="176" fill="#5b6675">FABDEM · SoilGrids</text>
<rect x="140" y="44" width="122" height="148" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="201" y="62" font-weight="700" fill="#0a1c28">INGESTA</text><text x="201" y="80" fill="#0e7490">un script por fuente</text><text x="201" y="94" fill="#0e7490">reintentos y registro</text><text x="201" y="108" fill="#0e7490">(manifest.csv)</text><text x="201" y="128" fill="#5b6675">GitHub Actions:</text><text x="201" y="142" fill="#5b6675">cada 3 h · diario ·</text><text x="201" y="156" fill="#5b6675">2 veces al día ·</text><text x="201" y="170" fill="#5b6675">semanal · mensual</text>
<rect x="284" y="44" width="120" height="148" rx="8" fill="#eef3f7" stroke="#c7d0da"/><text x="344" y="62" font-weight="700" fill="#0a1c28">CAPAS DE DATOS</text><text x="344" y="84" fill="#5b6675">bronze (crudo)</text><text x="344" y="102" fill="#5b6675">silver (limpio,</text><text x="344" y="114" fill="#5b6675">claves comunes)</text><text x="344" y="134" fill="#5b6675">gold (índices)</text><text x="344" y="156" fill="#0e7490">SQL · DuckDB</text><text x="344" y="170" fill="#0e7490">Parquet</text>
<rect x="426" y="44" width="100" height="148" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="476" y="62" font-weight="700" fill="#0a1c28">MODELOS</text><text x="476" y="82" fill="#0e7490">índice INFORM</text><text x="476" y="96" fill="#0e7490">ríos (GloFAS→INA)</text><text x="476" y="110" fill="#0e7490">reclamos CABA</text><text x="476" y="124" fill="#0e7490">verificación</text><text x="476" y="146" fill="#5b6675">simulador 2D</text><text x="476" y="160" fill="#5b6675">(en el navegador)</text>
<rect x="548" y="44" width="86" height="148" rx="8" fill="#0a1c28"/><text x="591" y="62" font-weight="700" fill="#fff">WEB</text><text x="591" y="82" fill="#a5f3fc">MapLibre GL</text><text x="591" y="96" fill="#a5f3fc">tableros</text><text x="591" y="110" fill="#a5f3fc">análisis</text><text x="591" y="124" fill="#a5f3fc">simulador 3D</text><text x="591" y="146" fill="#7fa6b8">ES / EN</text><text x="591" y="160" fill="#7fa6b8">claro / oscuro</text>
<rect x="284" y="196" width="122" height="44" rx="8" fill="#fff" stroke="#c7d0da"/><text x="345" y="214" font-weight="600" fill="#0a1c28">Repositorio GitHub</text><text x="345" y="228" fill="#5b6675">código · datos · bitácora</text>
<rect x="418" y="196" width="130" height="44" rx="8" fill="#fff" stroke="#c7d0da"/><text x="483" y="214" font-weight="600" fill="#0a1c28">Cloudflare Workers</text><text x="483" y="228" fill="#5b6675">publica con cada push</text>
</g></svg>'''

INDICE = '''<svg viewBox="0 0 640 190" xmlns="http://www.w3.org/2000/svg" font-family="Avenir Next, Gill Sans, Helvetica Neue, Arial, sans-serif" font-size="9">
<defs><marker id="g" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#5b6675"/></marker></defs>
<g text-anchor="middle">
<rect x="6" y="8" width="150" height="48" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="81" y="26" font-weight="700" fill="#0a1c28">Agua en superficie</text><text x="81" y="40" fill="#0e7490">propensión histórica × lluvia</text>
<rect x="6" y="66" width="150" height="48" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="81" y="84" font-weight="700" fill="#0a1c28">Crecida de ríos</text><text x="81" y="98" fill="#0e7490">prob. de alerta / evacuación</text>
<rect x="6" y="124" width="150" height="48" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="81" y="142" font-weight="700" fill="#0a1c28">Quebradas</text><text x="81" y="156" fill="#0e7490">pendiente × arcilla × lluvia</text>
<g stroke="#5b6675" stroke-width="1.2" fill="none" marker-end="url(#g)"><path d="M156 32H184"/><path d="M156 90H184"/><path d="M156 148H184"/><path d="M304 90H330"/></g>
<rect x="184" y="56" width="120" height="68" rx="8" fill="#0a1c28"/><text x="244" y="80" font-weight="700" fill="#fff">AMENAZA</text><text x="244" y="94" fill="#a5f3fc">H = 10 − Π(10−Hᵢ)/100</text><text x="244" y="108" fill="#7fa6b8">por mes</text>
<rect x="330" y="8" width="120" height="48" rx="8" fill="#eef3f7" stroke="#c7d0da"/><text x="390" y="26" font-weight="700" fill="#0a1c28">EXPOSICIÓN</text><text x="390" y="40" fill="#5b6675">gente en terreno bajo</text>
<rect x="330" y="66" width="120" height="48" rx="8" fill="#0a1c28"/><text x="390" y="86" font-weight="700" fill="#fff">∛( H × E × V )</text><text x="390" y="101" fill="#a5f3fc">media geométrica</text>
<rect x="330" y="124" width="120" height="48" rx="8" fill="#eef3f7" stroke="#c7d0da"/><text x="390" y="142" font-weight="700" fill="#0a1c28">VULNERABILIDAD</text><text x="390" y="156" fill="#5b6675">cloacas · NBI · vivienda</text>
<g stroke="#5b6675" stroke-width="1.2" fill="none" marker-end="url(#g)"><path d="M390 56V66"/><path d="M390 124V114"/><path d="M450 90H486"/></g>
<rect x="486" y="52" width="148" height="76" rx="10" fill="#e6f3f6" stroke="#0e7490" stroke-width="1.4"/><text x="560" y="76" font-weight="700" fill="#0a1c28">RIESGO 0 – 10</text><text x="560" y="92" fill="#5b6675">5 niveles: muy bajo (verde)</text><text x="560" y="105" fill="#5b6675">a muy alto (rojo)</text><text x="560" y="118" fill="#5b6675">y su robustez (Monte Carlo)</text>
</g></svg>'''

HIDRAULICA = '''<svg viewBox="0 0 640 170" xmlns="http://www.w3.org/2000/svg" font-family="Avenir Next, Gill Sans, Helvetica Neue, Arial, sans-serif" font-size="9">
<defs><marker id="h" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#0e7490"/></marker></defs>
<g text-anchor="middle">
<rect x="6" y="10" width="100" height="42" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="56" y="28" font-weight="700" fill="#0a1c28">Lluvia horaria</text><text x="56" y="41" fill="#0e7490">real y pronóstico</text>
<rect x="6" y="118" width="100" height="42" rx="8" fill="#eef3f7" stroke="#c7d0da"/><text x="56" y="136" font-weight="700" fill="#0a1c28">Evaporación</text><text x="56" y="149" fill="#5b6675">ET₀ (Open-Meteo)</text>
<rect x="150" y="10" width="110" height="42" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="205" y="28" font-weight="700" fill="#0a1c28">Infiltración</text><text x="205" y="41" fill="#0e7490">Green-Ampt · suelo</text>
<rect x="150" y="64" width="110" height="42" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="205" y="82" font-weight="700" fill="#0a1c28">Desagüe pluvial</text><text x="205" y="95" fill="#0e7490">10 mm/h (supuesto)</text>
<rect x="304" y="30" width="150" height="76" rx="10" fill="#0a1c28"/><text x="379" y="54" font-weight="700" fill="#fff">Escurrimiento 2D</text><text x="379" y="69" fill="#a5f3fc">onda inercial (Bates 2010)</text><text x="379" y="83" fill="#a5f3fc">Manning por cobertura</text><text x="379" y="97" fill="#7fa6b8">paso adaptativo</text>
<rect x="498" y="10" width="136" height="42" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="566" y="28" font-weight="700" fill="#0a1c28">Acumulación</text><text x="566" y="41" fill="#0e7490">bajos, calles, lagunas</text>
<rect x="498" y="64" width="136" height="42" rx="8" fill="#e6f3f6" stroke="#9cc9d3"/><text x="566" y="82" font-weight="700" fill="#0a1c28">Ríos y bordes</text><text x="566" y="95" fill="#0e7490">nivel INA · salida libre</text>
<rect x="498" y="118" width="136" height="42" rx="8" fill="#fff" stroke="#0e7490"/><text x="566" y="136" font-weight="700" fill="#0a1c28">Balance de agua</text><text x="566" y="149" fill="#0e7490">cierra con error 0,00 %</text>
<g stroke="#0e7490" stroke-width="1.3" fill="none" marker-end="url(#h)"><path d="M106 31H150"/><path d="M106 139L304 100" stroke-dasharray="3 3"/><path d="M260 31L330 48"/><path d="M260 85L304 85"/><path d="M454 55L498 33"/><path d="M454 85H498"/><path d="M454 100L498 135"/></g>
</g></svg>'''


def fig(svg, num, texto, extra=""):
    return f'<figure>{svg}<figcaption><b>Figura {num}.</b> {texto}{extra}</figcaption></figure>'


def capitulos(F, P):
    """F: figuras (SVG), P: páginas de cada capítulo (para el índice)."""
    p = lambda k: P.get(k, "")
    return {
"portada": f'''<section class="portada"><div class="contenido">{LOGO}<div class="tipo">Documento funcional y registro del proceso</div>
<h1>Argentina frente a El Niño 2026–27</h1><div class="sub">Mapa de riesgo de inundación para los 2.282 gobiernos locales del país, con tablero de situación y simulador hidráulico 3D</div>
<div class="datos"><b>Autora:</b> Diamela, ingeniera química (UTN)<br><b>Desarrollo:</b> con la asistencia de Claude (Anthropic)<br><b>Versión:</b> 1.0 · <b>Fecha:</b> 12 de noviembre de 2026<br><b>Sitio:</b> mapa-de-riesgo-super-nino.diamedego.workers.dev<br><b>Repositorio:</b> github.com/diamedego/Mapa-de-riesgo-super-ni-o</div></div>{OLAS}
<div class="pie">Proyecto personal con datos públicos. No es un producto oficial: ante una emergencia, seguir a Defensa Civil, el SMN y el INA.</div></section>''',

"resumen": f'''<section class="resumen"><h1><span class="num">Resumen</span>Resumen ejecutivo</h1>
<p>Este documento describe el sistema <em>Argentina frente a El Niño 2026–27</em>: un tablero web que estima y muestra el riesgo de inundación en los 2.282 gobiernos locales y los 66.515 radios censales de la Argentina durante el evento El Niño 2026–27, y un simulador hidráulico 3D que permite ver dónde se acumularía el agua de una tormenta en un punto elegido. Todo se construyó con datos públicos y servicios gratuitos, se actualiza solo varias veces por día y se publica de forma automática.</p>
<p>El índice de riesgo sigue la estructura INFORM (amenaza × exposición × vulnerabilidad, media geométrica, escala de 0 a 10) y se calcula por mes, de octubre de 2026 a abril de 2027. La amenaza combina la propensión histórica a que haya agua en superficie (satélites Landsat y Sentinel-2), la lluvia pronosticada (ECMWF SEAS5), la probabilidad de crecida de los ríos mayores (GloFAS convertido a la altura que mide el INA) y las crecidas repentinas en quebradas. La robustez del ranking se mide con 1.000 simulaciones de pesos distintos.</p>
<p>El simulador resuelve las ecuaciones de aguas poco profundas en forma inercial (Bates y otros, 2010) sobre un modelo de terreno sin edificios ni árboles (FABDEM, 30 m), con infiltración de Green-Ampt según el suelo, rugosidad según la cobertura, evaporación, desagües supuestos, lagunas y ríos. Informa además calles cortadas, personas aisladas y centros de salud sin acceso, y una confianza alta, media o baja en cada resultado.</p>
<div class="caja-clave"><b>Resultado de la validación, dicho sin rodeos.</b> El simulador se contrastó con el agua que vieron los satélites en 20 ciudades durante El Niño 2015–16 y 2023–24, usando la lluvia y el nivel de río reales. En los 9 casos con agua observada suficiente obtuvo un CSI mediano de 0,36, contra 0,35 de la referencia «donde ya hubo agua»: <b>empata, no la supera</b>. Anda bien donde manda la crecida de un río con estación cercana (Corrientes, Rosario) y sigue corto en Santa Fe 2023–24 y en el delta de Tigre. Por eso el sitio lo presenta como <b>orientativo</b>.</div>
<div class="kpis"><div class="kpi"><b>2.282</b><span>gobiernos locales con índice mensual</span></div><div class="kpi"><b>66.515</b><span>radios censales (nivel barrio)</span></div><div class="kpi"><b>0,36</b><span>CSI del simulador contra 0,35 de la referencia</span></div><div class="kpi"><b>$ 0</b><span>costo: servicios y herramientas gratuitas</span></div></div>
<p class="palabras"><b>Palabras clave:</b> riesgo de inundación · El Niño · INFORM · modelo hidráulico 2D · datos abiertos · Argentina · visualización geoespacial.</p></section>''',

"indice": f'''<section class="indice"><h1><span class="num">Contenido</span>Índice</h1><ol>
<li><span class="n">1</span><span class="t">Introducción, objetivos y alcance</span><span class="p">{p(1)}</span></li>
<li><span class="n">2</span><span class="t">Marco conceptual</span><span class="p">{p(2)}</span></li>
<li><span class="n">3</span><span class="t">Datos: fuentes, cobertura y actualización</span><span class="p">{p(3)}</span></li>
<li><span class="n">4</span><span class="t">Arquitectura del sistema</span><span class="p">{p(4)}</span></li>
<li><span class="n">5</span><span class="t">Modelos analíticos</span><span class="p">{p(5)}</span></li>
<li><span class="n">6</span><span class="t">Simulador hidráulico y de inundación</span><span class="p">{p(6)}</span></li>
<li><span class="n">7</span><span class="t">Validación del simulador</span><span class="p">{p(7)}</span></li>
<li><span class="n">8</span><span class="t">Requerimientos funcionales y guía de uso</span><span class="p">{p(8)}</span></li>
<li><span class="n">9</span><span class="t">Calidad, pruebas y trazabilidad</span><span class="p">{p(9)}</span></li>
<li><span class="n">10</span><span class="t">Registro cronológico del proceso</span><span class="p">{p(10)}</span></li>
<li><span class="n">11</span><span class="t">Cumplimiento del pedido de noviembre</span><span class="p">{p(11)}</span></li>
<li><span class="n">12</span><span class="t">Limitaciones, riesgos y trabajo futuro</span><span class="p">{p(12)}</span></li>
<li><span class="n">A</span><span class="t">Glosario</span><span class="p">{p("glosario")}</span></li>
<li><span class="n">B</span><span class="t">Referencias</span><span class="p">{p("refs")}</span></li>
<li><span class="n">C</span><span class="t">Estructura del repositorio y comandos</span><span class="p">{p("anexo")}</span></li></ol>
<div class="caja-clave" style="margin-top:12mm"><b>Cómo leer este documento.</b> Los capítulos 1 a 4 explican qué es el sistema y cómo está armado; el 5 a 7, cómo se calcula y qué tan bien funciona; el 8 y 9, qué hace la aplicación y cómo se la controla; el 10 y 11 son el registro de lo hecho, con las decisiones y los errores; el 12, lo que falta.</div></section>''',

1: f'''<section><h1><span class="num">Capítulo 1</span>Introducción, objetivos y alcance</h1>
<h2><span class="n">1.1</span>Contexto</h2>
<p>El Niño es la fase cálida del ciclo El Niño–Oscilación del Sur. En la Argentina suele asociarse a lluvias por encima de lo normal en el Litoral y la región pampeana y a crecidas de los grandes ríos con semanas de retraso. En 2026 el fenómeno está en curso y el Servicio Meteorológico Nacional estima efectos al menos hasta abril de 2027, lo que vuelve útil una herramienta que muestre, para cada lugar, cuánto riesgo hay, por qué y qué conviene hacer.</p>
<p>La información pública para responder esa pregunta existe, pero está dispersa en decenas de fuentes con formatos, coberturas y frecuencias distintas: pronósticos meteorológicos, alturas de ríos, el Censo 2022, relieve, imágenes satelitales e infraestructura. El proyecto reúne esas fuentes en un solo modelo de datos, calcula un índice comparable entre municipios y lo ofrece en una interfaz que cualquier persona puede explorar.</p>
<h2><span class="n">1.2</span>Objetivos</h2>
<ul><li><b>General.</b> Estimar y comunicar el riesgo de inundación de cada gobierno local y cada radio censal del país durante El Niño 2026–27, de forma verificable y actualizada.</li>
<li><b>Específicos.</b> (a) Integrar las fuentes públicas en una arquitectura por capas reproducible. (b) Calcular un índice por mes con estructura estándar y medir su robustez. (c) Anticipar crecidas de ríos a partir de caudales pronosticados. (d) Ofrecer un simulador de lluvia y escurrimiento sobre relieve real. (e) Medir con datos reales qué tan bien funciona el simulador y decirlo en la propia aplicación. (f) Mantener todo gratuito, abierto y en dos idiomas.</li></ul>
<h2><span class="n">1.3</span>Alcance y exclusiones</h2>
<p>El alcance cubre solo la Argentina y solo el riesgo de <b>inundación</b>. Por decisión de la autora quedaron pospuestos el dengue (hay un modelo documentado, no incluido en el índice), el impacto agrícola y la capa social de respuesta (albergues, donaciones, comedores). Tampoco se pretende reemplazar a los sistemas de alerta oficiales: el sitio lo aclara en cada pantalla.</p>
<h2><span class="n">1.4</span>Usuarios previstos</h2>
<table><thead><tr><th>Usuario</th><th>Qué necesita</th><th>Cómo lo resuelve el sistema</th></tr></thead><tbody>
<tr><td>Vecina o vecino</td><td>Saber si su zona es riesgosa y qué hacer</td><td>Buscador de direcciones, panel «Situación» y «Qué hacer» con prevención y emergencia</td></tr>
<tr><td>Equipos municipales y de Defensa Civil</td><td>Priorizar zonas y personas expuestas</td><td>Rankings por nivel y por personas, calles cortadas y centros de salud sin acceso</td></tr>
<tr><td>Periodistas y público general</td><td>Entender el panorama del país</td><td>Situación del país, zonas de mayor riesgo, riesgo semana a semana, recorrido guiado</td></tr>
<tr><td>Reclutadores y colegas técnicos</td><td>Evaluar la metodología</td><td>Fuentes por tipo de dato, fórmulas, validación publicada y repositorio abierto</td></tr></tbody></table></section>''',

2: f'''<section><h1><span class="num">Capítulo 2</span>Marco conceptual</h1>
<h2><span class="n">2.1</span>Riesgo, amenaza, exposición y vulnerabilidad</h2>
<p>Se adopta la definición de riesgo de la gestión de desastres: el riesgo no depende solo de que ocurra un fenómeno (amenaza), sino de cuánta gente y bienes están en su camino (exposición) y de cuán capaces son de resistirlo y recuperarse (vulnerabilidad). El índice INFORM de la Comisión Europea (Marin-Ferrer y otros, 2017) formaliza esa idea con tres componentes en escala 0 a 10 combinados con una media geométrica, de modo que un componente muy bajo reduce el riesgo total y ninguno puede compensarse por completo con otro.</p>
<h2><span class="n">2.2</span>Tres maneras en que una zona se inunda</h2>
<table><thead><tr><th>Tipo</th><th>Qué ocurre</th><th>Dónde pesa más</th><th>Datos clave</th></tr></thead><tbody>
<tr><td>Pluvial o urbana</td><td>La lluvia supera lo que el suelo absorbe y los desagües evacúan; el agua se junta en los bajos</td><td>Áreas urbanas llanas: Gran Buenos Aires, La Plata, ciudades del Litoral</td><td>Relieve, suelo, impermeabilización, cloacas, lluvia</td></tr>
<tr><td>Fluvial</td><td>Un río grande crece y desborda con días o semanas de retraso respecto de la lluvia</td><td>Paraná, Paraguay, Uruguay y afluentes</td><td>Caudales (GloFAS), alturas (INA), niveles de alerta y evacuación</td></tr>
<tr><td>Repentina de quebrada</td><td>Una tormenta en la sierra genera una crecida en minutos aguas abajo</td><td>Noroeste y Cuyo</td><td>Pendiente, arcilla, lluvia</td></tr></tbody></table>
<h2><span class="n">2.3</span>Modelación hidráulica</h2>
<p>Las ecuaciones de aguas poco profundas (Saint-Venant en dos dimensiones) describen cómo se mueve una lámina de agua sobre el terreno. Resolverlas completas es costoso; la formulación inercial local propuesta por Bates y otros (2010) elimina el término de transporte de momento convectivo y mantiene la inercia, con lo que permite pasos de tiempo mucho mayores sin perder la dinámica principal de una inundación. Es la base de modelos de uso profesional como LISFLOOD-FP y está emparentada con la opción de onda difusa de HEC-RAS 2D. La infiltración se modela con la ecuación de Green y Ampt (1911), cuyos parámetros se estiman a partir de la textura del suelo con las tablas de Rawls y otros (1983).</p>
<div class="decision"><b>Decisión de diseño</b>Se eligió un modelo 2D inercial ejecutado en el navegador (sin servidor propio) antes que un modelo hidrodinámico completo. Permite recalcular en segundos para cualquier punto del país, a cambio de menor fidelidad que un modelo calibrado con datos locales de drenaje, que fuera de la Ciudad de Buenos Aires no están disponibles.</div></section>''',

3: f'''<section><h1><span class="num">Capítulo 3</span>Datos: fuentes, cobertura y actualización</h1>
<p>Todas las fuentes son públicas y gratuitas. Se clasifican en seis tipos que la interfaz muestra con etiquetas de color: <b>observado</b>, <b>pronóstico</b>, <b>histórico</b>, <b>estimación propia</b>, <b>simulación</b> y <b>referencia</b>. La regla de oro es que una estimación o una simulación nunca se presenta como una medición.</p>
<div class="tabla-t">Tabla 1. Fuentes principales por tipo de dato</div>
<table><thead><tr><th>Fuente</th><th>Aporta</th><th>Tipo</th><th>Actualización</th></tr></thead><tbody>
<tr><td>Open-Meteo (modelos ECMWF y otros)</td><td>Lluvia, viento, ráfagas y temperatura a 16 días, en una grilla de 0,5°</td><td>Pronóstico</td><td>2 veces por día</td></tr>
<tr><td>SMN (alertas CAP)</td><td>Alertas vigentes con nivel y vencimiento</td><td>Observado</td><td>Cada 3 horas</td></tr>
<tr><td>ECMWF SEAS5 vía Open-Meteo</td><td>Lluvia mensual esperada a 6 meses por municipio</td><td>Pronóstico</td><td>Mensual (día 6)</td></tr>
<tr><td>INA (sistema de alerta)</td><td>Altura de ríos en 175 estaciones, 1,25 millones de mediciones desde 2015, con niveles de alerta y evacuación</td><td>Observado</td><td>Diaria</td></tr>
<tr><td>GloFAS v4 (Copernicus)</td><td>Ensamble de caudales a 7 meses en 96 estaciones</td><td>Pronóstico</td><td>Semanal (lunes)</td></tr>
<tr><td>INDEC, Censo 2022</td><td>Población, cloacas, NBI y vivienda en 66.515 radios censales</td><td>Histórico</td><td>Fijo</td></tr>
<tr><td>MERIT Hydro y Copernicus DEM</td><td>Altura sobre el cauce (HAND) y pendiente</td><td>Histórico</td><td>Fijo</td></tr>
<tr><td>JRC Global Surface Water</td><td>Frecuencia de agua 1984–2021</td><td>Histórico</td><td>Fijo</td></tr>
<tr><td>Dynamic World (Sentinel-2)</td><td>Agua observada en los Niño 2015–16 y 2023–24 frente a la sequía 2022–23</td><td>Histórico</td><td>Fijo</td></tr>
<tr><td>MapBiomas Argentina</td><td>Superficie construida, humedales y cultivos</td><td>Histórico</td><td>Anual</td></tr>
<tr><td>FABDEM V1-2 (Univ. de Bristol)</td><td>Relieve de 30 m sin edificios ni árboles, 20 ciudades</td><td>Histórico</td><td>Fijo</td></tr>
<tr><td>SoilGrids 2.0 y OpenLandMap</td><td>Textura del suelo (infiltración) y arcilla</td><td>Histórico</td><td>Fijo</td></tr>
<tr><td>RENABAP, IGN, OpenStreetMap</td><td>Barrios populares, límites y localidades, infraestructura crítica y calles</td><td>Referencia</td><td>Fijo / descarga propia</td></tr>
<tr><td>Cálculo propio</td><td>Índice de riesgo, probabilidades de crecida, simulador</td><td>Estimación / simulación</td><td>Diaria / al usar</td></tr></tbody></table>
{fig(F["cobertura"], 1, "Cobertura de los datos principales sobre los 2.282 gobiernos locales. Los datos de ríos con niveles de alerta existen solo en el Litoral y el Área Metropolitana; el noroeste, Cuyo y la Patagonia no tienen estaciones con alerta definida.")}
<h2><span class="n">3.1</span>Datos que faltan y cómo se tratan</h2>
<p>No hay una red pluvial pública fuera de la Ciudad de Buenos Aires, ni la geometría de la red cloacal, ni un registro de conexiones irregulares, ni de napas freáticas. En lugar de inventar un valor, el sistema usa sustitutos explícitos (por ejemplo, terreno bajo más porcentaje de hogares sin cloaca) y muestra «Sin información» cuando no hay dato. Los desagües del simulador se suponen en 10 mm/h sobre superficies impermeables y esa cifra se informa en pantalla.</p>
<h2><span class="n">3.2</span>Actualización automática</h2>
<p>Una única automatización de GitHub Actions orquesta la ingesta: alertas del SMN cada 3 horas; alturas de ríos y pronóstico de 16 días a diario; la grilla del tiempo a las 05:20 y las 17:20 (hora argentina); GloFAS los lunes; SEAS5 el día 6 de cada mes. Después de cada ingesta se recalcula el índice y se regeneran los archivos que lee la web. Cada pronóstico se archiva y se verifica contra lo ocurrido; la precisión medida ajusta cuánto pesa el pronóstico frente a la historia (ver 5.4).</p></section>''',

4: f'''<section><h1><span class="num">Capítulo 4</span>Arquitectura del sistema</h1>
{fig(F["arquitectura"], 2, "Flujo de datos de punta a punta: de las fuentes públicas a la web publicada. Todo el procesamiento pesado ocurre fuera del navegador (Python, SQL y Earth Engine); el simulador es lo único que se calcula en el navegador.")}
<h2><span class="n">4.1</span>Capas de datos (medallón)</h2>
<p>El modelo de datos sigue una arquitectura de tres capas. <b>Bronze</b> guarda lo descargado tal cual; <b>silver</b> lo limpia y le asigna claves comunes (códigos de gobierno local y de radio censal); <b>gold</b> contiene los resultados finales: el índice por municipio y mes, las probabilidades de crecida y las verificaciones. Las capas se construyen con SQL y se validaron con DuckDB en forma local, con resultados idénticos a los de Python. La ejecución en Databricks quedó preparada y pendiente del inicio de sesión de la autora.</p>
<h2><span class="n">4.2</span>Aplicación web</h2>
<p>La interfaz es una aplicación estática con MapLibre GL como única librería de mapas (más maplibre-contour para curvas de nivel y three.js, cargado solo cuando se abre la maqueta 3D). Está organizada en módulos de responsabilidad única.</p>
<table><thead><tr><th>Módulo</th><th>Responsabilidad</th></tr></thead><tbody>
<tr><td><code>textos.js</code></td><td>Todos los textos en español e inglés; los que dependen de datos son funciones</td></tr>
<tr><td><code>utiles.js</code>, <code>graficos.js</code></td><td>Formatos, geometría, íconos y gráficos propios en SVG (barras, líneas, tortas, paneles, ranking) sin librerías</td></tr>
<tr><td><code>tiempo.js</code></td><td>Campos del tiempo (lluvia, viento, temperatura), partículas de viento y miniaturas</td></tr>
<tr><td><code>mapa.js</code>, <code>buscador.js</code></td><td>Mapa, capas, relieve y referencias; búsqueda por provincia, partido, localidad, dirección o coordenadas</td></tr>
<tr><td><code>tableros.js</code></td><td>Tablero de cada capa (situación, recomendaciones, ríos) y análisis por zona con filtros globales</td></tr>
<tr><td><code>guia.js</code></td><td>Encabezado, ventana de fuentes por tipo de dato y recorrido guiado de 13 pasos</td></tr>
<tr><td><code>app.js</code></td><td>Estado, indicadores, modos actual y futuro, línea de tiempo y reproducción</td></tr>
<tr><td><code>modelo_inundacion.js</code>, <code>hidraulica.js</code>, <code>simulador.js</code></td><td>Preparación de datos del simulador, motor hidráulico (en un Web Worker) y la interfaz 3D</td></tr></tbody></table>
<h2><span class="n">4.3</span>Publicación y costo</h2>
<p>El sitio público se publica automáticamente en Cloudflare Workers con cada cambio en el repositorio (aproximadamente 11 publicaciones por día frente a un cupo gratuito de 500 por mes). Los archivos de datos diarios los genera la automatización de GitHub. No hay base de datos ni servidor propios, y por eso el costo operativo es nulo.</p></section>''',

5: f'''<section><h1><span class="num">Capítulo 5</span>Modelos analíticos</h1>
<h2><span class="n">5.1</span>Índice de riesgo de inundación</h2>
{fig(F["indice"], 3, "Estructura del índice. Cada componente se expresa de 0 a 10; el riesgo es la raíz cúbica de su producto.")}
<div class="formula">Riesgo = ∛( Amenaza × Exposición × Vulnerabilidad )<span class="eq">(1)</span></div>
<p><b>Amenaza.</b> Para cada mes se combinan tres amenazas con la regla multi-amenaza de INFORM, H = 10 − Π(10 − Hᵢ) / 10², de modo que cualquiera que sea alta eleva el total sin pasar de 10.</p>
<ul><li><i>Agua en superficie</i> = 10 × P × f. P es la propensión histórica, promedio de los rangos entre municipios de la superficie con agua alguna vez (JRC 1984–2021), el agua extra observada en los Niño 2015–16 y 2023–24 (Dynamic World) y el porcentaje de superficie a menos de 2 m del cauce. El factor f = clip(r/2; 0; 1) usa r, la relación entre la lluvia pronosticada (SEAS5) y la normal: con lluvia normal la amenaza es la mitad de la propensión; con el doble, la propensión completa. Los meses sin pronóstico usan r = 1.</li>
<li><i>Crecida de ríos</i> = 10 × máx(P<sub>evac</sub>; ½ P<sub>alerta</sub>) de la estación del INA confiable más cercana, si está a 30 km o menos (ver 5.2).</li>
<li><i>Quebradas</i> = 10 × s × f × (½ + ½ arcilla), con s = clip((pendiente p90 − 5°) / 20°; 0; 1).</li></ul>
<p><b>Exposición</b> = 10 × promedio de los rangos de la población en terreno bajo y de su proporción. Terreno bajo es un radio censal con más de la mitad de su superficie a menos de 2 m sobre el curso de agua más cercano. <b>Vulnerabilidad</b> = 10 × promedio de los rangos de: hogares sin cloaca, necesidades básicas insatisfechas, materiales deficientes y barrios populares por habitante. En un círculo o un radio censal, el riesgo usa la amenaza del municipio con la exposición y la vulnerabilidad del propio radio.</p>
<h3>Sensibilidad de los pesos</h3>
<p>Para no depender de una elección arbitraria, se sortean 1.000 combinaciones de pesos (distribución de Dirichlet) entre los indicadores de exposición y vulnerabilidad y entre los exponentes de los tres componentes. La <i>robustez</i> de cada municipio es el porcentaje de simulaciones en que queda en el 10 % de mayor riesgo; se muestra junto a cada posición del ranking.</p>
<div class="decision"><b>Decisión metodológica</b>Se probó un modelo de aprendizaje automático para la amenaza: entrenado con El Niño 2015–16 y evaluado con 2023–24 no superó a la regla simple de propensión histórica, y al invertir los eventos el resultado fue igual. Con un solo evento de entrenamiento, aprender no agrega información que los 40 años de historia no tengan. La regla simple quedó como método oficial y el experimento, documentado.</div>
{fig(F["ml"], 4, "Correlación de Spearman entre el agua observada y la predicha en 2023–24 para distintos métodos entrenados con 2015–16.")}
<h2><span class="n">5.2</span>Modelo de ríos</h2>
<p>Para anticipar crecidas se convierte el caudal pronosticado por GloFAS en altura de agua en cada estación mediante una curva caudal-altura ajustada con las mediciones del INA y un sesgo reciente, y se obtiene la probabilidad mensual de superar el nivel de alerta y el de evacuación. De 91 estaciones evaluadas, 43 superaron un coeficiente de validación de 0,7 y son las que se muestran como escenario; el error medio mediano de estas es de 0,7 m. En la detección de días sobre el nivel de alerta se acertaron 963 de 2.037 días observados, con 424 falsas alarmas. Los valores extremos de GloFAS se contrastan con el INA antes de publicarlos y se presentan siempre como escenario.</p>
<h2><span class="n">5.3</span>Reclamos por anegamiento en la Ciudad de Buenos Aires</h2>
<p>Con los reclamos «pluviales» al 147 (2011–2026) y la lluvia diaria se ajustó un modelo por barrio. La correlación diaria con los reclamos observados es de 0,44 (la línea base sin modelo da −0,03) y la correlación de Spearman entre barrios para el total del período es de 0,87. En los 58 días con 20 mm o más, el modelo reproduce 659 de los 1.165 reclamos observados, frente a 335 de la línea base: capta la forma pero subestima la magnitud, y así se informa.</p>
<h2><span class="n">5.4</span>Verificación del pronóstico y retroalimentación</h2>
<p>Cada pronóstico de lluvia se archiva y se compara con lo ocurrido. Con 42 días verificados, la correlación cae de 0,71 en el plazo de 0 a 3 días a 0,45 en 4 a 7 días y a 0,11 en 8 a 15 días. Esa precisión medida define el peso que el índice le da al pronóstico frente a la historia (hoy 0,107), por lo que el índice se apoya más en la geografía que en una lluvia pronosticada que todavía no ha demostrado ser confiable.</p>
{fig(F["verif"], 5, "Verificación del pronóstico de lluvia por plazo. La detección de días con 20 mm o más baja de 56 % a 10 %.")}
</section>''',

6: f'''<section><h1><span class="num">Capítulo 6</span>Simulador hidráulico y de inundación</h1>
<p>El simulador responde a una pregunta concreta: <i>si cae una tormenta en este punto, ¿dónde se junta el agua, hacia dónde corre y qué queda cortado?</i> Se calcula en el navegador, para un círculo de 0,5 a 20 km alrededor del punto elegido, y se muestra en una maqueta 3D sobre la imagen satelital.</p>
{fig(F["hidraulica"], 6, "Balance de agua de cada celda del modelo. La lluvia entra en cada celda; una parte se infiltra o se evapora, otra se evacúa por los desagües y el resto escurre por la pendiente hasta acumularse en los bajos o salir por el borde.")}
<h2><span class="n">6.1</span>Formulación</h2>
<p>El agua se mueve entre celdas vecinas con la ecuación inercial local de Bates y otros (2010). El caudal por unidad de ancho q en una cara entre dos celdas se actualiza con el gradiente de la superficie libre η y la fricción de Manning:</p>
<div class="formula">q<sup>t+Δt</sup> = ( q<sup>t</sup> − g · h<sub>f</sub> · Δt · ∂η/∂x ) / ( 1 + g · Δt · n² · |q<sup>t</sup>| / h<sub>f</sub><sup>7/3</sup> )<span class="eq">(2)</span></div>
<p>con g la gravedad, h<sub>f</sub> la profundidad en la cara, n el coeficiente de rugosidad de Manning según la cobertura (calles, techos, vegetación) y Δt un paso adaptativo Δt = α · Δx / √(g (h<sub>máx</sub> + 0,3)), con tope de 30 s. La lluvia de cada hora entra en 12 tramos de 5 minutos para no concentrarla al principio. La infiltración sigue Green-Ampt,</p>
<div class="formula">f = K<sub>s</sub> · ( 1 + ψ · Δθ / F )<span class="eq">(3)</span></div>
<p>donde K<sub>s</sub> es la conductividad, ψ la succión del frente de mojado, Δθ el déficit de humedad y F la lámina ya infiltrada; los parámetros salen de la clase textural del suelo (SoilGrids 2.0, 0–30 cm). La humedad inicial es la que informa Open-Meteo, y evoluciona con la lluvia, el drenaje y la evaporación (ET₀). Las horas secas se saltean sin mover el agua, lo que permite corridas de meses.</p>
<h2><span class="n">6.2</span>Terreno, cuerpos de agua y condiciones de borde</h2>
<ul><li><b>Relieve.</b> FABDEM de 30 m (sin edificios ni árboles) en las 20 ciudades con más personas en riesgo (121 bloques de 0,25°, 89 MB); en el resto, el relieve satelital de AWS Terrain Tiles. El agua se lleva luego al relieve fino píxel a píxel para que el borde siga el terreno.</li>
<li><b>Arroyos y canales</b> se graban en el terreno (1 m los arroyos y zanjas; 2 m los canales). Su agua no se cuenta como inundación.</li>
<li><b>Lagunas</b> son almacenamientos con un único nivel que sube y baja; las conectadas a un río son parte del río.</li>
<li><b>Ríos</b> tienen nivel impuesto: con una estación del INA a menos de 15 km, arrancan con la altura de hoy medida respecto del nivel de evacuación; la barra permite sumar o restar metros. Los bordes tienen salida libre.</li></ul>
<h2><span class="n">6.3</span>Lluvia: real, pronosticada y de escenario</h2>
<p>La lluvia horaria proviene de Open-Meteo: 14 días de análisis (dato real), 16 días de pronóstico y, más allá, el total mensual de SEAS5 repartido en días de lluvia típicos del lugar, calculados con 21 años de archivo. La línea de tiempo distingue siempre las tres procedencias. Para la tormenta de prueba, el usuario elige milímetros (0 a 300) y duración (1, 3, 6, 12 o 24 horas); se suma a lo pronosticado, el modelo arranca 24 horas antes con la humedad real del suelo y calcula en unos 7 segundos con celdas de unos 60 m.</p>
<h2><span class="n">6.4</span>Resultados que informa</h2>
<table><thead><tr><th>Resultado</th><th>Definición</th></tr></thead><tbody>
<tr><td>Superficie con agua y personas cerca</td><td>Celdas de tierra del círculo con 10 cm o más; las personas se reparten por celda a partir de los radios censales</td></tr>
<tr><td>Profundidad máxima</td><td>Mayor lámina en el bajo más hondo, sin contar el agua dentro de arroyos o canales</td></tr>
<tr><td>Calles cortadas</td><td>Kilómetros de calles de OpenStreetMap con 30 cm de agua o más (los puentes siguen pasables); se dibujan en rojo</td></tr>
<tr><td>Personas aisladas</td><td>Quienes en seco llegaban por calle a la salida del área y con agua no, mediante una búsqueda en la red de calles transitables</td></tr>
<tr><td>Centros de salud sin acceso</td><td>Con agua en su celda o con sus calles cortadas</td></tr>
<tr><td>Confianza</td><td>Alta, media o baja: la menor entre la lluvia (dato real o pronóstico a menos de 3 días: alta; 3 a 7 días: media; más lejos o escenario: baja), el relieve (FABDEM: alta; satelital: media) y el modelo (según su validación en esa ciudad)</td></tr></tbody></table>
<h2><span class="n">6.5</span>Visualización y reproducción</h2>
<p>La maqueta muestra solo las acumulaciones netas de 2 cm o más, en celeste que se oscurece con la profundidad. Al apretar ▶ se reproduce la tormenta en cámara lenta (unos 12 segundos a velocidad ×1; se puede elegir ×0,5, ×1, ×2 o ×4): líneas blancas indican hacia dónde baja el agua, siguiendo la pendiente de la superficie calculada por el modelo, y un cartel dice «Lloviendo», «Escurriendo» o «Seco». El botón «Empezar de cero» reinicia la tormenta. Todo se muestra desde el momento actual hacia adelante; las dos semanas previas se calculan en silencio porque el suelo las necesita.</p>
<div class="nota"><b>Qué es real y qué es ilustrativo.</b> La dirección de las líneas blancas surge del cálculo; su velocidad y su largo son ilustrativos. Las profundidades dependen del relieve disponible (errores verticales de 1 a 3 m en el relieve satelital) y de la red de desagües, que se supone.</div></section>''',

7: f'''<section><h1><span class="num">Capítulo 7</span>Validación del simulador</h1>
<p>«Simular lluvia sobre un terreno 3D no equivale a simular una inundación real». Con esa premisa se diseñó una validación contra eventos reales, antes de presentar el simulador como confiable.</p>
<h2><span class="n">7.1</span>Pruebas numéricas</h2>
<p>El motor se probó primero contra soluciones conocidas. En un cuenco cerrado el balance de agua cierra exacto y el nivel final es de 49,6 cm contra 49,8 cm teóricos. En una ladera con lluvia constante, el caudal alcanza el 93 a 95 % de la solución de Manning. En casos reales (La Plata a 21 días, Corrientes a 3 meses) el balance de masa cierra con error de 0,00 %.</p>
<h2><span class="n">7.2</span>Contraste con el agua observada por satélite</h2>
<p>Se repitieron El Niño 2015–16 y 2023–24 y la sequía 2022–23 (noviembre a abril) en las 20 ciudades con relieve FABDEM, en un círculo de 5 km, con la lluvia real hora por hora (reanálisis ERA5, vía Open-Meteo) y la altura real del río medida por el INA en la estación a menos de 15 km. El resultado se comparó celda por celda con el agua que vio Dynamic World (clase más frecuente del mes, sin el agua permanente). Una celda tiene «agua en el mes» si mantiene 10 cm o más durante al menos la mitad de las horas del mes.</p>
<p>Las métricas son: aciertos (POD), falsas alarmas (FAR) y el índice crítico de éxito, CSI = aciertos / (aciertos + falsas alarmas + faltantes), de 0 a 1. Como referencia trivial se usó «donde el satélite vio agua alguna vez» (JRC): si el modelo no la supera, no aporta más que mirar el mapa histórico.</p>
<h2><span class="n">7.3</span>Resultados</h2>
<p>En 31 de los 40 casos de El Niño el satélite vio menos de 20 celdas con agua (unos 0,5 km²) en el círculo, sobre todo en el conurbano, donde los anegamientos duran horas y los satélites ópticos no los registran; allí no se puede medir el acierto. En los 9 casos restantes (Corrientes, Santa Fe, Formosa, Rosario y Tigre):</p>
<div class="kpis"><div class="kpi"><b>0,36</b><span>CSI mediano del modelo</span></div><div class="kpi"><b>0,35</b><span>CSI de la referencia «donde ya hubo agua»</span></div><div class="kpi"><b>5 de 9</b><span>casos en que el modelo supera a la referencia</span></div><div class="kpi"><b>0,54</b><span>correlación de la superficie con agua entre ciudades</span></div></div>
{fig(F["val"], 7, "CSI del modelo y de la referencia en los 9 casos con agua observada suficiente. El modelo supera a la referencia donde manda la crecida de un río con estación cercana.")}
<h2><span class="n">7.4</span>La primera versión y la mejora</h2>
<p>La primera corrida dio un CSI mediano de 0,20, claramente por debajo de la referencia (0,35). El análisis mostró que el río se imponía como la altura del INA menos su mediana, sobre la orilla más baja: Formosa 2015–16 se inundaba de más (15,8 % del círculo contra 4,9 % observado) y Santa Fe 2023–24 de menos. Se hicieron tres cambios, que además se llevaron al modelo del sitio:</p>
<ol><li>La altura del río se ata al nivel de evacuación oficial de cada estación: en ese nivel el agua llega a la orilla del cuantil 40 % y cada metro de más o de menos se suma o se resta.</li><li>Las lagunas conectadas al río (madrejones, la laguna Setúbal) son parte del río y suben con él.</li><li>El simulador del sitio arranca con la altura de hoy de la estación más cercana.</li></ol>
<div class="nota"><b>Advertencia de sobreajuste.</b> El cuantil se eligió entre tres valores probados (10, 25 y 40 %) sobre los mismos datos con que luego se mide. Conviene confirmarlo con otras temporadas (por ejemplo 2019, o la propia 2026–27 cuando termine).</div>
<h2><span class="n">7.5</span>Qué se concluye</h2>
<p>El modelo es físicamente coherente (balance exacto, casos teóricos) pero <b>no supera, en general, al mapa de dónde ya hubo agua</b> para predecir el agua que dura semanas. Sí lo supera donde manda un río con estación cercana. Sigue corto en Santa Fe 2023–24 y en el delta, y el anegamiento urbano de pocas horas no puede validarse con satélites ópticos. Por eso el simulador muestra la validación por ciudad, la presenta como «orientativa» y sugiere usar la capa «Zonas que ya se inundaron» para ver dónde el agua queda semanas. La confianza del modelo en cada hora depende del resultado de su ciudad: alta con CSI de 0,5 o más, media entre 0,3 y 0,5 o donde no se pudo validar, baja por debajo de 0,3.</p></section>''',

8: f'''<section><h1><span class="num">Capítulo 8</span>Requerimientos funcionales y guía de uso</h1>
<div class="tabla-t">Tabla 2. Requerimientos funcionales implementados</div>
<table><thead><tr><th style="width:11mm">Código</th><th>Función</th><th>Descripción</th></tr></thead><tbody>
<tr><td>RF-01</td><td>Encabezado del país</td><td>Explicación del tablero, situación del país (riesgo, personas en riesgo, ríos, alertas, mes pico), indicadores y fecha de actualización de cada fuente al final de la página</td></tr>
<tr><td>RF-02</td><td>Indicadores</td><td>Riesgo, personas en riesgo alto, municipios, alertas, ríos, lluvia, ráfaga y temperatura, cada uno con su método y su fuente al pasar el mouse</td></tr>
<tr><td>RF-03</td><td>Zonas de mayor riesgo</td><td>Las 5 mayores del país o de la zona elegida (municipios, o radios censales si se elige un municipio); no se muestra al elegir un punto</td></tr>
<tr><td>RF-04</td><td>Riesgo semana a semana</td><td>Barras con el color de cada nivel, de la zona elegida, a partir de la foto diaria del índice</td></tr>
<tr><td>RF-05</td><td>Buscador</td><td>Provincia, partido, localidad, dirección, empresa, club, hospital o coordenadas; sugerencias tipo mapa abierto; radio de 0,5 a 20 km con barra</td></tr>
<tr><td>RF-06</td><td>Condiciones actuales y futuras</td><td>Selector de mes (riesgo) o fecha (tiempo) limitado al horizonte del pronóstico, con «Dentro de X días»</td></tr>
<tr><td>RF-07</td><td>Mapas</td><td>Riesgo, lluvia, viento y temperatura (de a uno, con semáforo común); capas sumables: Hidrografía, Alertas, Zonas que ya se inundaron, Densidad, Barrios, Suelo, Infraestructura y Rutas; referencias útiles y líneas de relieve con altura</td></tr>
<tr><td>RF-08</td><td>Panel «Situación»</td><td>Viñetas con nivel, ahora, período, peor mes, motivo, antecedentes y población; tortas de riesgo, cloaca y terreno</td></tr>
<tr><td>RF-09</td><td>«Qué hacer»</td><td>Recomendaciones de prevención y de emergencia armadas con los datos del lugar (amenaza dominante, terreno, suelo, cloacas, antecedentes, ríos, alertas y horizonte)</td></tr>
<tr><td>RF-10</td><td>Análisis por zona</td><td>Tres gráficos por fila que siguen los filtros como en Power BI; clic para filtrar por zona o día; filtros activos con ✕ y «Borrar filtros» global</td></tr>
<tr><td>RF-11</td><td>Línea de tiempo</td><td>Reproducción semana a semana con hitos por mes, marcas semanales y cartel «Semana N, Mes»</td></tr>
<tr><td>RF-12</td><td>Fuentes y trazabilidad</td><td>Ventana con 20 fuentes en 7 grupos: qué aporta, de dónde sale, cada cuánto se actualiza y de qué tipo es</td></tr>
<tr><td>RF-13</td><td>Recorrido guiado</td><td>13 pasos que llevan la pantalla a cada parte y explican cómo usar la aplicación</td></tr>
<tr><td>RF-14</td><td>Simulador 3D</td><td>Maqueta sobre imagen satelital; lluvia a simular (mm y duración); reproducción con velocidad y «Empezar de cero»; gráfico de lluvia y agua con un solo eje de fechas; corte del terreno y mapa topográfico; calles cortadas, aislados y salud; confianza; validación y antecedentes</td></tr>
<tr><td>RF-15</td><td>Transversales</td><td>Español e inglés; tema claro y oscuro; adaptación a celular y tableta; separador de miles con punto; íconos «!» con explicación y fórmula (detalle en PDF a conectar)</td></tr></tbody></table>
<h2><span class="n">8.1</span>Guía rápida</h2>
<ol><li><b>Ver el país.</b> Al abrir, el encabezado resume la situación y los indicadores muestran el riesgo del mes en curso.</li><li><b>Elegir un lugar.</b> Escribir una dirección o elegir provincia, partido o localidad; o tocar un punto del mapa. La barra de radio define el círculo.</li><li><b>Cambiar de vista.</b> Con «Condiciones futuras» se elige un mes o una fecha dentro del horizonte; las pestañas cambian entre riesgo, lluvia, viento y temperatura.</li><li><b>Leer el panel.</b> «Situación» explica el nivel y sus causas; «Qué hacer» separa prevención y emergencia.</li><li><b>Simular.</b> «Simulador en 3D» abre la maqueta; la barra de milímetros y la duración definen la tormenta; ▶ la reproduce.</li></ol></section>''',

9: f'''<section><h1><span class="num">Capítulo 9</span>Calidad, pruebas y trazabilidad</h1>
<h2><span class="n">9.1</span>Principios</h2>
<ul><li><b>No inventar.</b> Cada cifra tiene fuente, fecha y método; cuando falta el dato se escribe «Sin información».</li><li><b>Distinguir.</b> Observado, pronóstico, histórico, estimación y simulación se identifican siempre con su etiqueta.</li><li><b>Contrastar lo extremo.</b> Antes de publicar un valor extremo (por ejemplo, de GloFAS) se compara con otra fuente y se presenta como escenario.</li><li><b>Decir lo que no se sabe.</b> La validación, sus límites y la confianza de cada corrida están en pantalla.</li></ul>
<h2><span class="n">9.2</span>Pruebas</h2>
<p>La aplicación se prueba en un Chrome sin ventana controlado por el protocolo de depuración, con guiones que devuelven datos y no imágenes: por tanto son repetibles y baratos. Hay una batería por cada tanda de cambios (selección, textos en dos idiomas con igualdad de claves, filtros combinados, recorrido, simulador) y pruebas numéricas del motor (cuenco, ladera, lagunas, períodos largos). En cada tanda se verificaron además el ancho de página en cinco tamaños de pantalla (de 390 a 1.920 px) y que la cámara y los filtros no se reinicien al cambiar de capa, período, idioma o tema.</p>
<h2><span class="n">9.3</span>Incidentes y correcciones</h2>
<table><thead><tr><th>Incidente</th><th>Causa</th><th>Corrección</th></tr></thead><tbody>
<tr><td>Correos «No jobs were run» del 5 al 8 de noviembre</td><td>El archivo de la automatización era inválido: un paso tenía «: » en su nombre</td><td>Corregido y se agregó la validación del YAML antes de subir cambios</td></tr>
<tr><td>Alertas del SMN que rompían el sitio</td><td>Geometrías inválidas y colecciones mixtas</td><td><code>make_valid</code>, solo polígonos y lectura robusta de cajas</td></tr>
<tr><td>Agua espuria en el modelo hidráulico (balance de −109.724 %)</td><td>Ríos y lagunas iniciaban sobre su orilla y «generaban» agua</td><td>Nivel inicial bajo la orilla y celdas secas salteadas: balance de 0,00 %</td></tr>
<tr><td>Simulador que «no hacía nada»</td><td>Umbral de 10 cm, reproducción de 12 horas por segundo y animación al calcular</td><td>Agua desde 2 cm, cámara lenta, controles bloqueados mientras calcula, lluvia a simular y reinicio</td></tr>
<tr><td>Maqueta 3D que no se veía en un navegador</td><td>No reproducible; posible WebGL o red</td><td>Diagnóstico visible, reintentos de WebGL, servidor de respaldo y tiempo límite en el satélite</td></tr></tbody></table></section>''',

10: f'''<section><h1><span class="num">Capítulo 10</span>Registro cronológico del proceso</h1>
<p>El proyecto se desarrolló entre el 27 de septiembre y el 12 de noviembre de 2026 en conversación continua entre la autora y el asistente. Cada paso quedó en una bitácora fechada del repositorio y en más de 270 commits. La autora tomó las decisiones de alcance, método y diseño; el asistente investigó, programó y verificó.</p>
{fig(F["crono"], 8, "Línea de tiempo de las etapas del proyecto (los bloques se solapan porque varias etapas avanzaron en paralelo).")}
<div class="tabla-t">Tabla 3. Cronología de hitos</div>
<table class="cronologia"><thead><tr><th>Fecha</th><th>Hito y decisiones</th></tr></thead><tbody>
<tr><td>27 sep</td><td>Investigación de fuentes. Se descubre que BA Data, el GeoServer del INDEC y el SMN «ws» fallan por momentos: la ingesta tendrá reintentos y copia de todo.</td></tr>
<tr><td>28 sep</td><td>Alcance: solo Argentina; unidad de análisis, los 2.282 gobiernos locales del INDEC y 66.515 radios censales. Repositorio en GitHub, caudales GloFAS, Google Earth Engine, automatización diaria, MapBiomas, históricos (dengue y desastres), suelo y deslizamientos, terreno por radio e inundación observada por satélite.</td></tr>
<tr><td>29 sep</td><td>Se descarta Sentinel-1 por falsos positivos en sequía y se usa Dynamic World. Diseño del índice con método híbrido (decisión de la autora). Un modelo de aprendizaje automático no supera a la propensión histórica. Foco solo en inundación. Modelos de ríos y de reclamos de CABA. Primera versión de la web.</td></tr>
<tr><td>30 sep</td><td>Arquitectura medallón en SQL validada en DuckDB; geometrías fijas y números diarios para la web.</td></tr>
<tr><td>8–15 oct</td><td>Consumo de IA como línea base; análisis por zona estilo Power BI; calles y tres buscadores; búsqueda por dirección con callejero propio; versión para celular; simulación mes a mes; capas del tiempo (lluvia, viento y temperatura) dibujadas en lienzo.</td></tr>
<tr><td>5–6 nov</td><td>Rediseño completo como «sala de situación». Sitio público en Cloudflare Workers. Primer simulador de lluvia en 3D (llenado de bajos) y relieve en el mapa principal.</td></tr>
<tr><td>8 nov</td><td>Maqueta 3D con lluvia animada. Se detecta y corrige la automatización inválida.</td></tr>
<tr><td>10 nov</td><td>Pedido de 28 puntos de la autora, con respaldo previo del código (etiqueta de Git). Modelo hidráulico 2D en un Web Worker, suelo real por lugar, terreno FABDEM en 20 ciudades (se descargan 6,3 GB y se conservan 89 MB).</td></tr>
<tr><td>10–11 nov</td><td>Tandas 1 a 9: colores de semáforo y sin dato punteado; capas y relieve con altura; filtros en una fila; condiciones futuras; panel «Situación» con tortas y recomendaciones; análisis con filtros globales; encabezado, fuentes por tipo y recorrido guiado; calles cortadas, aislados y confianza; validación contra el satélite y su mejora.</td></tr>
<tr><td>11–12 nov</td><td>Ajustes por indicaciones de la autora: línea de tiempo a escala de calendario; riesgo semana a semana; íconos «!» con fórmula; capas en dos grupos; separador de miles; diagnóstico de la maqueta; simulador solo en 3D; tormenta en cámara lenta con velocidad y reinicio; cálculo en segundos; se descarta un rediseño tipográfico no aprobado.</td></tr></tbody></table>
<h2><span class="n">10.1</span>Decisiones de la autora que moldearon el producto</h2>
<ul><li>Un único lanzamiento (LinkedIn, alrededor del 1 de diciembre de 2026): sitio, video y repositorio.</li><li>Todo gratuito; ningún dato sensible en el repositorio; no usar la computadora del trabajo.</li><li>Datos reales siempre, y decir qué es real y qué es pronóstico o escenario.</li><li>Gráficos en lugar de tablas; explicaciones al pasar el mouse en lugar de letra chica.</li><li>Modelo híbrido para el simulador (2D en el navegador y relieve de 30 m en las 20 ciudades de mayor riesgo) y validación contra «todas las inundaciones reales con datos».</li><li>Mostrar capturas solo cuando ella las pide.</li></ul></section>''',

11: f'''<section><h1><span class="num">Capítulo 11</span>Cumplimiento del pedido de noviembre</h1>
<p>El 10 de noviembre la autora entregó un pedido de 28 puntos. A continuación se indica el estado de cada uno con criterio estricto: «cumplido» significa implementado y probado; «parcial» significa que falta una parte.</p>
<table><thead><tr><th style="width:9mm">Nº</th><th>Pedido</th><th style="width:19mm">Estado</th><th>Observación</th></tr></thead><tbody>
<tr><td>1</td><td>Recorrido guiado que explique la aplicación</td><td class="ok">Cumplido</td><td>13 pasos que llevan la pantalla a cada parte</td></tr>
<tr><td>2</td><td>Encabezado con explicación, situación del país y fuentes</td><td class="ok">Cumplido</td><td>Más ventana de fuentes por tipo de dato</td></tr>
<tr><td>3</td><td>Colores de semáforo y sin dato</td><td class="ok">Cumplido</td><td>Temperatura de azul a rojo como excepción</td></tr>
<tr><td>4–6</td><td>Capas, referencias y paradas de colectivo</td><td class="ok">Cumplido</td><td>Capas fuera del mapa; sin paradas</td></tr>
<tr><td>7–8</td><td>Filtros en una fila y condiciones futuras limitadas</td><td class="ok">Cumplido</td><td>Horizonte del pronóstico</td></tr>
<tr><td>9</td><td>Mapa topográfico con agua y alturas</td><td class="ok">Cumplido</td><td>Curvas con separación adaptativa y altura</td></tr>
<tr><td>10</td><td>Línea de tiempo con hitos que se llena</td><td class="ok">Cumplido</td><td>A escala de calendario, con semanas</td></tr>
<tr><td>11 a–f</td><td>Panel izquierdo (radio, simulador, situación en viñetas)</td><td class="ok">Cumplido</td><td>Incluye simular un municipio completo (11c)</td></tr>
<tr><td>12–16</td><td>Lagunas, días secos, rutas, fecha de imagen y cámara</td><td class="ok">Cumplido</td><td>La maqueta es hoy la vista única del simulador</td></tr>
<tr><td>17, 20</td><td>Análisis sin tablas y filtros globales</td><td class="ok">Cumplido</td><td>Tres gráficos por fila; «Borrar filtros» global</td></tr>
<tr><td>18</td><td>Trazabilidad de cada indicador</td><td class="parcial">Parcial</td><td>Método y fuente en cada indicador y en la ventana de fuentes; falta el PDF de detalle por indicador</td></tr>
<tr><td>19</td><td>Validación del simulador</td><td class="ok">Cumplido</td><td>CSI 0,36 contra 0,35: orientativo</td></tr>
<tr><td>21</td><td>Comparación histórica</td><td class="parcial">Parcial</td><td>Antecedentes de los Niño 2015–16 y 2023–24; falta comparar contra inundaciones puntuales (p. ej. La Plata 2013)</td></tr>
<tr><td>22</td><td>Accesibilidad y aislamiento</td><td class="ok">Cumplido</td><td>Calles cortadas, personas aisladas y centros de salud sin acceso</td></tr>
<tr><td>23</td><td>Uso y permeabilidad del suelo</td><td class="parcial">Parcial</td><td>Porcentaje impermeable del círculo y capa de suelo urbano y verde; falta modelar la permeabilidad por tipo de cobertura en pantalla</td></tr>
<tr><td>24</td><td>Confianza alta, media o baja</td><td class="ok">Cumplido</td><td>Por hora simulada</td></tr>
<tr><td>25–28</td><td>Control de calidad integral y tres dimensiones</td><td class="parcial">Parcial</td><td>Se revisó punto por punto y se probó cada tanda; la revisión integral es continua</td></tr></tbody></table></section>''',

12: f'''<section><h1><span class="num">Capítulo 12</span>Limitaciones, riesgos y trabajo futuro</h1>
<h2><span class="n">12.1</span>Limitaciones conocidas</h2>
<ul><li><b>El simulador es orientativo.</b> Empata con la referencia histórica; no se validó el anegamiento urbano de pocas horas (los satélites ópticos no lo ven); el relieve tiene errores verticales; los desagües se suponen.</li><li><b>La lluvia pronosticada pierde confianza rápido.</b> La correlación baja de 0,71 a 0,11 entre los plazos de 0–3 y 8–15 días; más allá de 16 días solo hay escenario estacional.</li><li><b>Los ríos sin estación con alerta</b> (noroeste, Cuyo, Patagonia) dependen de GloFAS sin conversión a altura.</li><li><b>El índice es relativo.</b> Los rangos comparan municipios entre sí; no miden pérdidas ni daños.</li><li><b>Compatibilidad.</b> La maqueta requiere WebGL; si el navegador no puede, se vuelve al mapa 2D.</li></ul>
<h2><span class="n">12.2</span>Riesgos del proyecto</h2>
<table><thead><tr><th>Riesgo</th><th>Mitigación</th></tr></thead><tbody>
<tr><td>Fuentes inestables (INA, SMN, BA Data, Open-Meteo)</td><td>Reintentos, copia de lo descargado y avisos en pantalla; fecha de actualización de cada fuente</td></tr>
<tr><td>Interpretación alarmista o como producto oficial</td><td>Aviso permanente, lenguaje medido, confianza visible y fuentes por tipo</td></tr>
<tr><td>Licencias</td><td>FABDEM es CC BY-NC-SA (uso no comercial); OpenStreetMap exige atribución; Open-Meteo y Earth Engine son gratuitos para uso no comercial: aptos para un portfolio</td></tr>
<tr><td>Fecha de lanzamiento (antes del 30 de noviembre)</td><td>Lo que falta se muestra como faltante; el alcance no demora la publicación</td></tr></tbody></table>
<h2><span class="n">12.3</span>Trabajo futuro</h2>
<ol><li>Confirmar el ajuste del río con otras temporadas (2019 y la propia 2026–27) y cerrar la brecha en Santa Fe 2023–24 y el delta.</li><li>Incorporar la sudestada (Servicio de Hidrografía Naval) al índice y reintentar los suelos del INTA.</li><li>Conectar los íconos «!» con un PDF metodológico por indicador y comparar el escenario con inundaciones históricas puntuales.</li><li>Usar canales, alcantarillas y puentes de OpenStreetMap en el modelo hidráulico y probar relieve de 5 m (IGN, IDECOR) en ciudades puntuales.</li><li>Ejecutar el modelo en capas en Databricks (perfil preparado) y retomar dengue, impacto agrícola y la capa social.</li><li>Lanzamiento: video de 30 a 60 segundos, publicación bilingüe, README final y repositorio público con página en GitHub Pages; volver a medir el consumo de IA.</li></ol></section>''',

"glosario": f'''<section class="glosario"><h1><span class="num">Anexo A</span>Glosario</h1><dl>
<dt>Amenaza, exposición, vulnerabilidad</dt><dd>Los tres componentes del riesgo: qué tan probable es el fenómeno, cuánta gente está en su camino y cuánta capacidad tiene de resistirlo.</dd>
<dt>CSI (índice crítico de éxito)</dt><dd>Aciertos divididos por aciertos más falsas alarmas más faltantes; vale 1 si la predicción coincide con lo observado y 0 si no coincide en nada.</dd>
<dt>ET₀</dt><dd>Evapotranspiración de referencia: cuánta agua devolvería a la atmósfera un suelo con pasto en un día.</dd>
<dt>FABDEM</dt><dd>Modelo de elevación global de 30 m al que se le quitaron edificios y árboles con aprendizaje automático.</dd>
<dt>GloFAS</dt><dd>Sistema Global de Alerta de Inundaciones de Copernicus, que pronostica caudales de ríos.</dd>
<dt>Green-Ampt</dt><dd>Ecuación que describe cuánta agua se infiltra en un suelo según su textura y humedad.</dd>
<dt>HAND</dt><dd>Altura sobre el cauce más cercano: cuánto más alto que el río está cada punto del terreno.</dd>
<dt>INFORM</dt><dd>Índice de gestión de riesgo de la Comisión Europea; sirve de estructura al índice del proyecto.</dd>
<dt>Manning</dt><dd>Coeficiente de rugosidad que modela la fricción del agua contra la superficie.</dd>
<dt>NBI</dt><dd>Necesidades básicas insatisfechas, indicador del Censo.</dd>
<dt>POD, FAR</dt><dd>Proporción de aciertos y proporción de falsas alarmas.</dd>
<dt>Radio censal</dt><dd>Unidad mínima del Censo 2022: aproximadamente un barrio.</dd>
<dt>SEAS5</dt><dd>Sistema de pronóstico estacional del ECMWF, con lluvia mensual esperada a 6 meses.</dd>
<dt>Web Worker</dt><dd>Proceso del navegador que calcula en segundo plano sin congelar la pantalla; ahí corre el modelo hidráulico.</dd></dl></section>''',

"refs": f'''<section class="referencias"><h1><span class="num">Anexo B</span>Referencias</h1>
<p>Bates, P. D., Horritt, M. S. y Fewtrell, T. J. (2010). A simple inertial formulation of the shallow water equations for efficient two-dimensional flood inundation modelling. <i>Journal of Hydrology</i>, 387(1–2), 33–45.</p>
<p>Brown, C. F., Brumby, S. P., Guzder-Williams, B. y otros (2022). Dynamic World, near real-time global 10 m land use land cover mapping. <i>Scientific Data</i>, 9, 251.</p>
<p>Green, W. H. y Ampt, G. A. (1911). Studies on soil physics. <i>The Journal of Agricultural Science</i>, 4(1), 1–24.</p>
<p>Harrigan, S., Zsoter, E., Alfieri, L. y otros (2020). GloFAS-ERA5 operational global river discharge reanalysis 1979–present. <i>Earth System Science Data</i>, 12, 2043–2060.</p>
<p>Hawker, L., Uhe, P., Paulo, L. y otros (2022). A 30 m global map of elevation with forests and buildings removed. <i>Environmental Research Letters</i>, 17(2), 024016.</p>
<p>Hersbach, H., Bell, B., Berrisford, P. y otros (2020). The ERA5 global reanalysis. <i>Quarterly Journal of the Royal Meteorological Society</i>, 146(730), 1999–2049.</p>
<p>Instituto Nacional de Estadística y Censos (2023). <i>Censo Nacional de Población, Hogares y Viviendas 2022</i>. Buenos Aires: INDEC.</p>
<p>Johnson, S. J., Stockdale, T. N., Ferranti, L. y otros (2019). SEAS5: the new ECMWF seasonal forecast system. <i>Geoscientific Model Development</i>, 12, 1087–1117.</p>
<p>Marin-Ferrer, M., Vernaccini, L. y Poljansek, K. (2017). <i>Index for Risk Management INFORM: Concept and Methodology Report, Version 2017</i>. EUR 28655 EN. Luxemburgo: Oficina de Publicaciones de la Unión Europea.</p>
<p>Pekel, J.-F., Cottam, A., Gorelick, N. y Belward, A. S. (2016). High-resolution mapping of global surface water and its long-term changes. <i>Nature</i>, 540, 418–422.</p>
<p>Poggio, L., de Sousa, L. M., Batjes, N. H. y otros (2021). SoilGrids 2.0: producing soil information for the globe with quantified spatial uncertainty. <i>SOIL</i>, 7, 217–240.</p>
<p>Rawls, W. J., Brakensiek, D. L. y Miller, N. (1983). Green-Ampt infiltration parameters from soils data. <i>Journal of Hydraulic Engineering</i>, 109(1), 62–70.</p>
<p>Servicio Meteorológico Nacional (2026). Alertas meteorológicas (protocolo CAP). Instituto Nacional del Agua (2026). Sistema de alerta hidrológico. MapBiomas Argentina (2025). Colección 2. OpenStreetMap contributors (2026). Datos de OpenStreetMap, licencia ODbL.</p></section>''',

"anexo": f'''<section><h1><span class="num">Anexo C</span>Estructura del repositorio y comandos</h1>
<table><thead><tr><th>Carpeta</th><th>Contenido</th></tr></thead><tbody>
<tr><td><code>ingesta/</code></td><td>Un script por fuente (SMN, INA, Open-Meteo, IGN, INDEC, OSM, RENABAP, BA Data); sesión HTTP con reintentos y registro en <code>data/manifest.csv</code></td></tr>
<tr><td><code>earth_engine/</code></td><td>Terreno, agua histórica, MapBiomas, suelo, Dynamic World y lluvia ERA5</td></tr>
<tr><td><code>transformacion/</code>, <code>sql/</code></td><td>Capas silver y modelo medallón; ejecución local en DuckDB y preparada para Databricks</td></tr>
<tr><td><code>modelos/</code></td><td>Ríos, reclamos de CABA, índice de riesgo con Monte Carlo y verificación del pronóstico</td></tr>
<tr><td><code>web/</code></td><td>Aplicación web (12 módulos), scripts de preparación de datos fijos y diarios</td></tr>
<tr><td><code>herramientas/</code></td><td>Pruebas en Chrome sin ventana y la validación del simulador contra el satélite</td></tr>
<tr><td><code>.github/workflows/</code></td><td>Automatización de la ingesta y el recálculo</td></tr>
<tr><td><code>docs/</code></td><td>Bitácora, fuentes y cobertura, plan de cambios, validación y este documento</td></tr></tbody></table>
<div class="tabla-t">Comandos frecuentes</div>
<table><tbody>
<tr><td>Índice completo</td><td><code>modelos/rios.py pronostico</code> → <code>modelos/verificacion.py</code> → <code>modelos/indice_riesgo.py</code> → <code>web/actualizar_datos_web.py</code></td></tr>
<tr><td>Capa SQL</td><td><code>sql/exportar_bronze.py</code> → <code>sql/correr_duckdb.py</code></td></tr>
<tr><td>Web local</td><td><code>cd web &amp;&amp; python3 -m http.server 8765</code></td></tr>
<tr><td>Validación del simulador</td><td><code>herramientas/validacion/validar.py simular | observar | resumir</code></td></tr></tbody></table></section>''',
}

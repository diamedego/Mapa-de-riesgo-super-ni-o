// Mapa 3D de riesgo de inundación por El Niño 2026-27 (Argentina).
// Datos: web/datos/*.json|geojson, generados por web/preparar_datos.py a partir del pipeline.

const TEXTOS = {
  es: {
    saltar: "Ir a la tabla de datos",
    titulo: "Argentina frente a El Niño 2026-27",
    bajada: "Riesgo de inundación en los 2 282 gobiernos locales, mes a mes, con datos públicos que se actualizan solos.",
    kpi_personas: "Personas en terreno bajo, ponderadas por riesgo",
    kpi_municipios: "Municipios con riesgo alto (≥ 7 de 10)",
    kpi_estaciones: "Estaciones de río con ≥ 50 % de probabilidad de nivel de evacuación (escenario GloFAS)",
    leyenda_titulo: "Riesgo de inundación (0-10)",
    leyenda_altura: "Mostrar el riesgo también como altura",
    niveles: ["Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"], sin_datos: "Sin datos (zona rural sin gobierno local)",
    leyenda_estacion: "Estación de río: el tamaño es la probabilidad de superar el nivel de evacuación.",
    c1_t: "Un Niño de los más fuertes",
    c1_p: "NOAA da más del 90 % de probabilidad de un Niño muy fuerte. En Argentina eso significa más lluvia en el Litoral y la región pampeana, y ríos que crecen con semanas de retraso. Cada municipio se colorea según su riesgo; el relieve en 3D es el terreno real.",
    c2_t: "El Litoral concentra el riesgo más alto",
    c2_p: "Corrientes, Chaco y Santa Fe combinan terreno bajo, historia de inundaciones y ríos grandes. Sus municipios siguen en el 10 % más riesgoso en más del 90 % de las 1 000 simulaciones con pesos distintos.",
    c3_t: "Los ríos: un escenario, no una certeza",
    c3_p: "GloFAS pronostica caudales del Paraná comparables a El Niño 2015-16. El INA hoy informa aguas medias y no emite pronóstico estacional: por eso se muestra como escenario, y el modelo se corrige cada día con las alturas medidas.",
    c4_t: "Donde más gente hay en riesgo",
    c4_p: "En el conurbano el riesgo relativo es medio, pero la cantidad de personas en terreno bajo y sin cloaca lo vuelve prioritario: La Matanza, Lomas de Zamora, Lanús, Quilmes.",
    c5_t: "CABA: lluvia y sumideros",
    c5_p: "Con 13 años de reclamos al 147, el modelo anticipa el doble de reclamos por sumideros y calles anegadas que un promedio histórico en días de tormenta. Para diciembre y enero espera entre 3 % y 5 % más.",
    evolucion_t: "Riesgo y amenazas, mes a mes",
    evolucion_nota: "Promedio de los municipios de la zona, en la misma escala de 0 a 10. Pasá el mouse para ver también las personas en riesgo.",
    tabla_t: "Los 20 municipios prioritarios del mes",
    b_partido: "Partido o departamento", b_partido_ph: "Ej.: Campana", b_localidad: "Localidad o municipio",
    b_localidad_ph: "Ej.: Lomas del Río Luján", b_direccion: "Dirección exacta", b_direccion_ph: "Ej.: Mitre 500", b_buscar: "Buscar",
    dir_no_encontrada: "No encontramos esa dirección. Probá con calle y altura (ej.: Mitre 500) y elegí el partido.",
    dir_elegir_partido: "Para buscar una dirección, elegí primero el partido o la localidad.",
    ver_detalle: "Ver detalle ▴", ver_menos: "Ver menos ▾",
    dir_aprox: "Ubicación aproximada: el INDEC no tiene la numeración de esa cuadra, se muestra la más cercana de la calle.",
    t_riesgo: "Riesgo de inundación", t_amenaza: "Amenaza", t_expo: "Exposición", t_vuln: "Vulnerabilidad",
    t_agua: "Agua en superficie", t_rio: "Crecida de ríos", t_quebrada: "Quebradas", t_personas: "Personas en riesgo",
    t_bajo: "Población en terreno bajo", t_cloaca: "Hogares sin cloaca", t_nbi: "Hogares con NBI", t_materiales: "Viviendas con materiales deficientes",
    g_amenazas: "Amenazas del mes", g_social: "Exposición y vulnerabilidad", meta: "Meta", sin_meta: "Sin meta: cantidad",
    e_ok: "● En meta", e_atencion: "▲ Atención", e_critico: "✖ Crítico", radio_titulo: "Radio censal",
    radio_nota: "Detalle de manzanas alrededor de la dirección (radio censal del Censo 2022).",
    sin_resultados: "Sin resultados", quitar_filtro: "Quitar filtro", en: "en", pareto_acum: "Acumulado",
    pareto_t: "¿Dónde se concentra el riesgo?", calor_t: "Riesgo por zona, mes a mes",
    pareto_nota: "Barras: parte de las personas en riesgo de la zona que aporta cada una. Línea: porcentaje acumulado. Hacé clic en una barra para ver adentro.",
    calor_nota: "Riesgo promedio de cada zona, ponderado por población, con los mismos colores del mapa. Hacé clic en una fila para ver adentro.",
    niveles_zona: { prov: "provincias", depto: "partidos y departamentos", gl: "municipios" },
    pareto_hallazgo: (n, total, tipo, mes) => `<strong>${n} de ${total} ${tipo}</strong> concentran el 80 % de las personas en riesgo en ${mes}.`,
    resto: "Resto", mas_zonas: (n) => `y ${n} más con menos riesgo`,
    serie_riesgo: "Riesgo", serie_agua: "Agua en superficie", serie_rio: "Crecida de ríos", serie_quebrada: "Quebradas",
    tab_relativo: "Por riesgo relativo", tab_personas: "Por cantidad de personas",
    col_mun: "Municipio", col_prov: "Provincia", col_riesgo: "Riesgo", col_personas: "Personas en riesgo", col_robustez: "Robustez",
    robustez_nota: "Robustez: % de 1 000 simulaciones con pesos aleatorios en las que el municipio queda en el 10 % de mayor riesgo.",
    robustez_nota_grafico: "El color de cada barra es el nivel de riesgo del municipio. Pasá el mouse para ver su robustez: el % de 1 000 simulaciones con pesos distintos en las que sigue en el 10 % más riesgoso.",
    ver_tabla: "Ver los datos en tabla",
    pie_oficial: "<strong>No es un producto oficial.</strong> Ante una emergencia, seguí las indicaciones de Defensa Civil, el SMN y el INA.",
    pie_metodo: "Riesgo = (amenaza × exposición × vulnerabilidad)^⅓, estructura INFORM. Amenaza: agua en superficie, crecida de ríos y quebradas. Exposición: población en terreno bajo. Vulnerabilidad: falta de cloacas, NBI, materiales de la vivienda y barrios populares.",
    pie_fuentes: "Fuentes: INDEC (Censo 2022), IGN, INA, SMN, ECMWF SEAS5, GloFAS, ERA5, MapBiomas Argentina, JRC, Dynamic World, RENABAP, BA Data, OpenStreetMap (© colaboradores, ODbL). Relieve: AWS Terrain Tiles. Mapa base: OpenFreeMap.",
    pie_repo: "Código, datos y metodología en GitHub",
    actualizado: (c) => `Calculado el ${c}`,
    meses: { "01": "ene", "02": "feb", "03": "mar", "04": "abr", "05": "may", "06": "jun", "07": "jul", "08": "ago", "09": "sep", "10": "oct", "11": "nov", "12": "dic" },
    ficha_riesgo: "Riesgo", ficha_amenaza: "Amenaza", ficha_expo: "Exposición", ficha_vuln: "Vulnerabilidad",
    ficha_agua: "Agua en superficie", ficha_rio: "Crecida de ríos", ficha_quebrada: "Quebradas",
    ficha_bajo: "Personas en terreno bajo", ficha_robustez: "Robustez (top 10 %)", cerrar: "Cerrar",
    estacion_alerta: "Prob. nivel de alerta", estacion_evac: "Prob. nivel de evacuación", escenario: "escenario GloFAS",
    caba_esperado: "Reclamos pluviales esperados", caba_normal: "con lluvia normal",
    radio: "Radio censal", radio_bajo: "Superficie a < 2 m del cauce", radio_cloaca: "Hogares con cloaca", radio_poblacion: "Población",
    millones: "M", mil: "mil", personas: "personas",
  },
  en: {
    saltar: "Skip to data table",
    titulo: "Argentina facing El Niño 2026-27",
    bajada: "Flood risk across 2,282 local governments, month by month, built from public data that updates itself.",
    kpi_personas: "People on low-lying ground, weighted by risk",
    kpi_municipios: "Municipalities at high risk (≥ 7 out of 10)",
    kpi_estaciones: "River gauges with ≥ 50 % chance of evacuation level (GloFAS scenario)",
    leyenda_titulo: "Flood risk (0-10)",
    leyenda_altura: "Also show risk as height",
    niveles: ["Very low", "Low", "Medium", "High", "Very high"], sin_datos: "No data (rural area without local government)",
    leyenda_estacion: "River gauge: size is the chance of exceeding the evacuation level.",
    c1_t: "One of the strongest El Niños",
    c1_p: "NOAA gives a >90 % chance of a very strong El Niño. For Argentina that means more rain in the Litoral and the Pampas, and rivers that rise weeks later. Each municipality is colored by its risk; the 3D relief is the real terrain.",
    c2_t: "The Litoral carries the highest risk",
    c2_p: "Corrientes, Chaco and Santa Fe combine low ground, a history of floods and large rivers. Their municipalities stay in the riskiest 10 % in over 90 % of 1,000 simulations with different weights.",
    c3_t: "Rivers: a scenario, not a certainty",
    c3_p: "GloFAS forecasts Paraná flows comparable to El Niño 2015-16. Argentina's water institute (INA) currently reports medium water levels and issues no seasonal outlook, so this is shown as a scenario, and the model is corrected daily with measured levels.",
    c4_t: "Where the most people are at risk",
    c4_p: "Around Buenos Aires the relative risk is moderate, but the number of people on low ground without sewers makes it a priority: La Matanza, Lomas de Zamora, Lanús, Quilmes.",
    c5_t: "Buenos Aires City: rain and storm drains",
    c5_p: "Trained on 13 years of 147 citizen reports, the model anticipates twice as many clogged-drain and flooded-street reports as a historical average on stormy days. It expects 3-5 % more in December and January.",
    evolucion_t: "Risk and hazards, month by month",
    evolucion_nota: "Average across the area's municipalities, on the same 0-10 scale. Hover to also see people at risk.",
    tabla_t: "The 20 priority municipalities of the month",
    b_partido: "District", b_partido_ph: "E.g.: Campana", b_localidad: "Town or municipality",
    b_localidad_ph: "E.g.: Lomas del Río Luján", b_direccion: "Exact address", b_direccion_ph: "E.g.: Mitre 500", b_buscar: "Search",
    dir_no_encontrada: "Address not found. Try street and number (e.g.: Mitre 500) and pick the district.",
    dir_elegir_partido: "To search an address, first pick the district or town.",
    ver_detalle: "Show details ▴", ver_menos: "Show less ▾",
    dir_aprox: "Approximate location: INDEC has no house numbers for that block; showing the nearest point on the street.",
    t_riesgo: "Flood risk", t_amenaza: "Hazard", t_expo: "Exposure", t_vuln: "Vulnerability",
    t_agua: "Surface water", t_rio: "River flood", t_quebrada: "Flash floods", t_personas: "People at risk",
    t_bajo: "Population on low ground", t_cloaca: "Homes without sewer", t_nbi: "Homes with unmet basic needs", t_materiales: "Homes with poor materials",
    g_amenazas: "Hazards this month", g_social: "Exposure and vulnerability", meta: "Target", sin_meta: "No target: count",
    e_ok: "● On target", e_atencion: "▲ Watch", e_critico: "✖ Critical", radio_titulo: "Census tract",
    radio_nota: "Blocks around the address (2022 Census tract).",
    sin_resultados: "No results", quitar_filtro: "Clear filter", en: "in", pareto_acum: "Cumulative",
    pareto_t: "Where is the risk concentrated?", calor_t: "Risk by area, month by month",
    pareto_nota: "Bars: each area's share of the people at risk. Line: cumulative percentage. Click a bar to drill down.",
    calor_nota: "Population-weighted average risk of each area, with the map's colors. Click a row to drill down.",
    niveles_zona: { prov: "provinces", depto: "districts", gl: "municipalities" },
    pareto_hallazgo: (n, total, tipo, mes) => `<strong>${n} of ${total} ${tipo}</strong> hold 80 % of the people at risk in ${mes}.`,
    resto: "Rest", mas_zonas: (n) => `and ${n} more with lower risk`,
    serie_riesgo: "Risk", serie_agua: "Surface water", serie_rio: "River flood", serie_quebrada: "Flash floods",
    tab_relativo: "By relative risk", tab_personas: "By number of people",
    col_mun: "Municipality", col_prov: "Province", col_riesgo: "Risk", col_personas: "People at risk", col_robustez: "Robustness",
    robustez_nota: "Robustness: % of 1,000 random-weight simulations in which the municipality ranks in the riskiest 10 %.",
    robustez_nota_grafico: "Each bar is colored by the municipality's risk level. Hover to see its robustness: the % of 1,000 simulations with different weights in which it stays in the riskiest 10 %.",
    ver_tabla: "See the data as a table",
    pie_oficial: "<strong>Not an official product.</strong> In an emergency, follow Civil Defense, SMN and INA guidance.",
    pie_metodo: "Risk = (hazard × exposure × vulnerability)^⅓, INFORM framework. Hazard: surface water, river floods and flash floods. Exposure: population on low-lying ground. Vulnerability: lack of sewers, unmet basic needs, housing materials and informal settlements.",
    pie_fuentes: "Sources: INDEC (2022 Census), IGN, INA, SMN, ECMWF SEAS5, GloFAS, ERA5, MapBiomas Argentina, JRC, Dynamic World, RENABAP, BA Data, OpenStreetMap (© contributors, ODbL). Terrain: AWS Terrain Tiles. Basemap: OpenFreeMap.",
    pie_repo: "Code, data and methodology on GitHub",
    actualizado: (c) => `Computed on ${c}`,
    meses: { "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun", "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec" },
    ficha_riesgo: "Risk", ficha_amenaza: "Hazard", ficha_expo: "Exposure", ficha_vuln: "Vulnerability",
    ficha_agua: "Surface water", ficha_rio: "River flood", ficha_quebrada: "Flash floods",
    ficha_bajo: "People on low ground", ficha_robustez: "Robustness (top 10 %)", cerrar: "Close",
    estacion_alerta: "Chance of alert level", estacion_evac: "Chance of evacuation level", escenario: "GloFAS scenario",
    caba_esperado: "Expected storm-drain reports", caba_normal: "with normal rain",
    radio: "Census tract", radio_bajo: "Area < 2 m above the stream", radio_cloaca: "Homes with sewer", radio_poblacion: "Population",
    millones: "M", mil: "k", personas: "people",
  },
};

const VISTAS = {
  pais: { center: [-62.0, -36.8], zoom: 4.35, pitch: 50, bearing: -12 },
  litoral: { center: [-59.4, -28.8], zoom: 6.1, pitch: 60, bearing: -18 },
  rios: { center: [-60.5, -31.9], zoom: 7.3, pitch: 62, bearing: 22 },
  conurbano: { center: [-58.56, -34.7], zoom: 10.4, pitch: 58, bearing: -10 },
  caba: { center: [-58.44, -34.61], zoom: 11.3, pitch: 50, bearing: 0 },
};
// 5 niveles de riesgo (escala 0-10). Con el índice de feb-2027: muy alto ≈ 5 % de los municipios,
// alto ≈ 11 %, medio ≈ 28 %, bajo ≈ 42 %, muy bajo ≈ 14 %: lo más riesgoso se distingue de un vistazo.
const CORTES = [3, 4.5, 6, 7];
const RANGOS = ["< 3", "3 – 4,5", "4,5 – 6", "6 – 7", "≥ 7"];

// Altura: solo se levanta el riesgo por encima de 3, y la escala se achica al acercarse
// (si no, en el conurbano las columnas taparían todo)
function alturaRiesgo(campo) {
  if (!estado.altura) return 0;   // por defecto plano: el 3D es solo el relieve real del terreno
  const exceso = ["^", ["max", ["-", ["coalesce", ["get", campo], 0], 3], 0], 2];
  return ["interpolate", ["linear"], ["zoom"], 4, ["*", exceso, 2400], 7, ["*", exceso, 500],
          10, ["*", exceso, 60], 13, ["*", exceso, 8]];
}
const radioEstacion = (campo) => ["interpolate", ["linear"], ["coalesce", ["get", campo], 0], 0, 3, 1, 10];

const estado = { idioma: "es", mes: null, datos: {}, ranking: "top_relativo", seleccion: null, reproduciendo: null,
  radios: [], provinciasCargadas: new Set(), altura: false, zona: null, porCmu: new Map() };
const t = (clave) => TEXTOS[estado.idioma][clave];
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const temaOscuro = () => {
  const forzado = document.documentElement.dataset.theme;
  return forzado ? forzado === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};
const nombreMes = (m) => `${t("meses")[m.slice(5, 7)]} ${m.slice(2, 4)}`;
const formatoPersonas = (n) => {
  const loc = estado.idioma === "es" ? "es-AR" : "en-US";
  if (n >= 1e6) return `${(n / 1e6).toLocaleString(loc, { maximumFractionDigits: 1 })} ${t("millones")}`;
  if (n >= 1e4) return `${Math.round(n / 1e3).toLocaleString(loc)} ${t("mil")}`;
  return Math.round(n).toLocaleString(loc);
};

// ---------- Mapa ----------
let mapa;

// SIN_TESELAS: versión para entornos que bloquean servidores externos (vista privada en claude.ai):
// sin mapa base ni relieve, solo los datos propios sobre un fondo liso.
const SIN_TESELAS = window.SIN_TESELAS === true;

function estiloBase() {
  if (SIN_TESELAS) {
    return { version: 8, sources: {}, layers: [{ id: "fondo", type: "background",
      paint: { "background-color": css("--plano") } }] };
  }
  // Claro: estilo "liberty" (calles, ríos, puntos de interés: hospitales, escuelas, estaciones…)
  return `https://tiles.openfreemap.org/styles/${temaOscuro() ? "dark" : "liberty"}`;
}

function colorRiesgo(campo) {
  const c = [1, 2, 3, 4, 5].map((i) => css(`--r${i}`));
  const expr = ["step", ["coalesce", ["get", campo], 0], c[0]];
  CORTES.forEach((corte, i) => expr.push(corte, c[i + 1]));
  return expr;
}

function colorMapa(campo) {
  if (!estado.zona) return colorRiesgo(campo);
  return ["case", ["in", ["get", "cmu"], ["literal", estado.zona.cmus]], colorRiesgo(campo), css("--atenuado")];
}

function nombresEnEspanol() {
  // Etiquetas del mapa base con el nombre en español (p. ej. "Islas Malvinas", no "Falkland Islands")
  mapa.getStyle().layers.forEach((capa) => {
    if (capa.type === "symbol" && mapa.getLayoutProperty(capa.id, "text-field")) {
      mapa.setLayoutProperty(capa.id, "text-field", ["coalesce", ["get", "name:es"], ["get", "name"]]);
    }
  });
}

function agregarCapas() {
  const m = estado.mes;
  nombresEnEspanol();
  if (!SIN_TESELAS) agregarRelieve();
  agregarCapasDatos(m);
}

function agregarRelieve() {
  mapa.addSource("relieve", {
    type: "raster-dem", encoding: "terrarium", tileSize: 256, maxzoom: 14,
    tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
    attribution: "Relieve: AWS Terrain Tiles",
  });
  mapa.setTerrain({ source: "relieve", exaggeration: 1.6 });
  mapa.addLayer({ id: "sombreado", type: "hillshade", source: "relieve",
    paint: { "hillshade-exaggeration": 0.35, "hillshade-shadow-color": temaOscuro() ? "#000" : "#6b6a66" } });
}

function primeraCapaDelMapaBase() {
  // Las capas de datos van debajo de ríos, calles y nombres del mapa base: al acercarse se leen las calles
  const capa = mapa.getStyle().layers.find((l) => l.type === "line" || l.type === "symbol");
  return capa ? capa.id : undefined;
}

const opacidadRelleno = ["interpolate", ["linear"], ["zoom"], 4, 0.85, 10, 0.75, 13, 0.5, 16, 0.4];

function agregarCapasDatos(m) {
  const antes = SIN_TESELAS ? undefined : primeraCapaDelMapaBase();
  // Fondo gris: todo el país. Lo que queda gris es zona sin gobierno local (sin datos)
  mapa.addSource("provincias", { type: "geojson", data: estado.datos.provincias });
  mapa.addLayer({ id: "sin-datos", type: "fill", source: "provincias",
    paint: { "fill-color": css("--sin-datos"), "fill-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.9, 13, 0.35] } }, antes);

  mapa.addSource("municipios", { type: "geojson", data: estado.datos.municipios, promoteId: "cmu" });
  // Riesgo como relleno plano (por defecto). Hasta zoom 10 por municipio; después, por radio censal
  mapa.addLayer({ id: "municipios-3d", type: "fill", source: "municipios", maxzoom: 10.2,
    paint: { "fill-color": colorMapa(`r_${m}`), "fill-opacity": opacidadRelleno } }, antes);

  mapa.addSource("radios", { type: "geojson", data: { type: "FeatureCollection", features: estado.radios } });
  mapa.addLayer({ id: "radios-3d", type: "fill", source: "radios", minzoom: 9.6,
    paint: { "fill-color": colorMapa(`r_${m}`), "fill-opacity": opacidadRelleno } }, antes);

  mapa.addLayer({ id: "provincias-borde", type: "line", source: "provincias",
    paint: { "line-color": css("--tinta-3"), "line-width": 0.8, "line-opacity": 0.8 } }, antes);
  // Línea fina gris oscuro solo donde cambia el nivel de riesgo (o contra zonas sin datos)
  mapa.addSource("bordes", { type: "geojson", data: estado.datos.bordes });
  mapa.addLayer({ id: "bordes-riesgo", type: "line", source: "bordes", maxzoom: 10.2,
    filter: ["!=", ["get", `na_${m}`], ["get", `nb_${m}`]],
    paint: { "line-color": css("--borde-riesgo"),
             "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.4, 8, 0.9, 10, 1.2], "line-opacity": 0.9 } }, antes);

  // Opcional: riesgo también como altura (columnas 3D), arriba de todo
  mapa.addLayer({ id: "municipios-alto", type: "fill-extrusion", source: "municipios", maxzoom: 10.2,
    layout: { visibility: estado.altura ? "visible" : "none" },
    paint: { "fill-extrusion-color": colorMapa(`r_${m}`), "fill-extrusion-height": alturaRiesgo(`r_${m}`),
             "fill-extrusion-opacity": 0.88 } });
  mapa.addLayer({ id: "radios-alto", type: "fill-extrusion", source: "radios", minzoom: 9.6,
    layout: { visibility: estado.altura ? "visible" : "none" },
    paint: { "fill-extrusion-color": colorMapa(`r_${m}`), "fill-extrusion-height": alturaRiesgo(`r_${m}`),
             "fill-extrusion-opacity": 0.9 } });

  mapa.addLayer({ id: "zona-contorno", type: "line", source: "municipios",
    filter: ["in", ["get", "cmu"], ["literal", estado.zona ? estado.zona.cmus : []]],
    paint: { "line-color": css("--tinta-1"), "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1.5, 12, 3] } });
  mapa.addLayer({ id: "municipios-seleccion", type: "line", source: "municipios",
    filter: ["==", ["get", "cmu"], ""], paint: { "line-color": css("--tinta-1"), "line-width": 2.5 } });

  mapa.on("mousemove", "radios-3d", (e) => mostrarTooltipRadio(e));
  mapa.on("mouseleave", "radios-3d", () => ocultarTooltip());
  mapa.on("click", "radios-3d", (e) => abrirFichaRadio(e.features[0].properties));
  mapa.on("moveend", cargarRadiosVisibles);
  cargarRadiosVisibles();

  mapa.addSource("caba", { type: "geojson", data: estado.datos.caba });
  mapa.addLayer({ id: "caba-barrios", type: "fill", source: "caba", minzoom: 10.5,
    paint: { "fill-color": css("--tinta-1"), "fill-opacity": 0.01 } });
  mapa.addLayer({ id: "caba-contorno", type: "line", source: "caba", minzoom: 10.5,
    paint: { "line-color": css("--tinta-1"), "line-width": 1.2, "line-opacity": 0.6 } });

  mapa.addSource("estaciones", { type: "geojson", data: estado.datos.estaciones });
  mapa.addLayer({ id: "estaciones", type: "circle", source: "estaciones", minzoom: 5.5,
    paint: { "circle-radius": radioEstacion(`pe_${m}`), "circle-color": "rgba(0,0,0,0)",
             "circle-stroke-color": css("--estacion"), "circle-stroke-width": 1.5 } });

  // Dirección buscada
  mapa.addSource("direccion", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  mapa.addLayer({ id: "direccion", type: "circle", source: "direccion",
    paint: { "circle-radius": 9, "circle-color": css("--acento"), "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 } });

  mapa.on("mousemove", "municipios-3d", (e) => mostrarTooltipMunicipio(e));
  mapa.on("mouseleave", "municipios-3d", () => ocultarTooltip());
  mapa.on("click", "municipios-3d", (e) => {
    const p = e.features[0].properties;
    aplicarZona({ nombre: p.nam, tipo: "Municipio", provincia: p.jur, cmus: [p.cmu], nivel: "gl" }, false);
  });
  mapa.on("mousemove", "estaciones", (e) => mostrarTooltipEstacion(e));
  mapa.on("mouseleave", "estaciones", () => ocultarTooltip());
  mapa.on("mousemove", "caba-barrios", (e) => mostrarTooltipCaba(e));
  mapa.on("mouseleave", "caba-barrios", () => ocultarTooltip());
}

function actualizarMes() {
  const m = estado.mes;
  if (!mapa || !mapa.getLayer("municipios-3d")) return;
  for (const id of ["municipios-3d", "radios-3d"]) mapa.setPaintProperty(id, "fill-color", colorMapa(`r_${m}`));
  for (const id of ["municipios-alto", "radios-alto"]) {
    mapa.setLayoutProperty(id, "visibility", estado.altura ? "visible" : "none");
    mapa.setPaintProperty(id, "fill-extrusion-color", colorMapa(`r_${m}`));
    mapa.setPaintProperty(id, "fill-extrusion-height", alturaRiesgo(`r_${m}`));
  }
  mapa.setFilter("bordes-riesgo", ["!=", ["get", `na_${m}`], ["get", `nb_${m}`]]);
  mapa.setFilter("zona-contorno", ["in", ["get", "cmu"], ["literal", estado.zona ? estado.zona.cmus : []]]);
  mapa.setPaintProperty("estaciones", "circle-radius", radioEstacion(`pe_${m}`));
}

// ---------- Tooltips del mapa ----------
const tooltip = document.createElement("div");
tooltip.className = "tooltip";
tooltip.hidden = true;
document.addEventListener("DOMContentLoaded", () => document.querySelector(".escenario").appendChild(tooltip));

function ubicarTooltip(e, html) {
  tooltip.innerHTML = html;
  tooltip.hidden = false;
  const { x, y } = e.point;
  tooltip.style.left = `${x + 14}px`;
  tooltip.style.top = `${y + 14}px`;
  mapa.getCanvas().style.cursor = "pointer";
}
function ocultarTooltip() { tooltip.hidden = true; if (mapa) mapa.getCanvas().style.cursor = ""; }
function mostrarTooltipMunicipio(e) {
  const p = e.features[0].properties;
  ubicarTooltip(e, `<strong>${p.nam}</strong> · ${p.jur}<br>${t("ficha_riesgo")}: ${Number(p[`r_${estado.mes}`]).toFixed(1)} / 10`);
}
function mostrarTooltipRadio(e) {
  const p = e.features[0].properties;
  ubicarTooltip(e, `<strong>${t("radio")}</strong> ${p.cod_indec}<br>${t("ficha_riesgo")}: ${Number(p[`r_${estado.mes}`]).toFixed(1)} / 10` +
    `<br>${t("radio_bajo")}: ${Math.round(p.pct_area_hand_2m)} %<br>${t("radio_cloaca")}: ${Math.round(p.pct_cloaca)} %` +
    `<br>${t("radio_poblacion")}: ${Math.round(p.poblacion).toLocaleString(estado.idioma === "es" ? "es-AR" : "en-US")}`);
}

// Copia los números del día a cada municipio con los nombres que usan las capas: r_<mes>, p_<mes>, …
function unirBordes(bordes, riesgo) {
  const nivel = (cmu, i) => { const d = riesgo.cmu[cmu]; return d && d.r[i] != null ? nivelRiesgo(d.r[i]) : 0; };
  bordes.features.forEach((f) => {
    riesgo.meses.forEach((m, i) => {
      f.properties[`na_${m}`] = nivel(f.properties.a, i);
      f.properties[`nb_${m}`] = f.properties.b ? nivel(f.properties.b, i) : 0;
    });
  });
}

function unirRiesgo(geo, riesgo) {
  geo.features.forEach((f) => {
    estado.porCmu.set(f.properties.cmu, f.properties);
    const d = riesgo.cmu[f.properties.cmu];
    if (!d) return;
    riesgo.meses.forEach((m, i) => {
      Object.assign(f.properties, { [`r_${m}`]: d.r[i], [`p_${m}`]: d.p[i], [`h_${m}`]: d.h[i],
        [`ha_${m}`]: d.ha[i], [`hr_${m}`]: d.hr[i], [`hq_${m}`]: d.hq[i] });
    });
    Object.assign(f.properties, { E: d.E, V: d.V, robustez: d.rob });
  });
}

// Radio censal: riesgo = cbrt(amenaza del municipio en el mes × exposición del radio × vulnerabilidad del radio)
function riesgoRadios(features) {
  features.forEach((f) => {
    const d = estado.riesgo.cmu[f.properties.cmu];
    if (!d) return;
    estado.riesgo.meses.forEach((m, i) => {
      f.properties[`r_${m}`] = Math.round(Math.cbrt(d.h[i] * f.properties.E * f.properties.V) * 10) / 10;
    });
  });
}

// Carga los radios de las provincias visibles (una sola vez cada una)
async function cargarRadiosVisibles() {
  if (mapa.getZoom() < 9) return;
  const b = mapa.getBounds();
  const pendientes = Object.entries(estado.datos.cajas).filter(([prov, [x0, y0, x1, y1]]) =>
    !estado.provinciasCargadas.has(prov) && x0 < b.getEast() && x1 > b.getWest() && y0 < b.getNorth() && y1 > b.getSouth());
  for (const [prov] of pendientes) {
    estado.provinciasCargadas.add(prov);
    const geo = await fetch(`datos/radios/${prov}.geojson`).then((r) => r.json());
    riesgoRadios(geo.features);
    estado.radios.push(...geo.features);
  }
  if (pendientes.length) mapa.getSource("radios").setData({ type: "FeatureCollection", features: estado.radios });
}

function mostrarTooltipEstacion(e) {
  const p = e.features[0].properties;
  const pct = (v) => (v === undefined || v === null || v === "null" ? "–" : `${Math.round(Number(v) * 100)} %`);
  ubicarTooltip(e, `<strong>${p.estacion}</strong> · ${p.rio}<br>${t("estacion_alerta")}: ${pct(p[`pa_${estado.mes}`])}<br>` +
    `${t("estacion_evac")}: ${pct(p[`pe_${estado.mes}`])}<br><em>${t("escenario")}</em>`);
}
function mostrarTooltipCaba(e) {
  const p = e.features[0].properties;
  ubicarTooltip(e, `<strong>${p.nombre}</strong><br>${t("caba_esperado")}: ${Math.round(p[`c_${estado.mes}`] ?? 0)}` +
    `<br>${t("caba_normal")}: ${Math.round(p[`n_${estado.mes}`] ?? 0)}`);
}

// ---------- Ficha de municipio ----------
// Metas de cada indicador (semáforo): verde ≤ meta, amarillo hasta el segundo umbral, rojo arriba.
// Índices 0-10 alineados con los niveles del mapa (bajo < 4,5 · medio 4,5-6 · alto ≥ 6).
const METAS = {
  riesgo: [4.5, 6], amenaza: [4.5, 6], agua: [4.5, 6], rio: [4.5, 6], quebrada: [4.5, 6], expo: [4.5, 6], vuln: [4.5, 6],
  bajo: [20, 50],        // % de la población en terreno bajo
  cloaca: [20, 50],      // % de hogares sin desagüe a red cloacal
  nbi: [5, 10],          // % de hogares con NBI (promedio nacional ≈ 6,7 %)
  materiales: [10, 25],  // % de hogares con materiales deficientes (calidad III-IV)
};

function tarjeta(clave, valor, { pct = false, destacado = false } = {}) {
  if (valor == null || Number.isNaN(valor)) return "";
  const [verde, rojo] = METAS[clave];
  const estadoK = valor < verde ? "ok" : valor < rojo ? "atencion" : "critico";
  const loc = estado.idioma === "es" ? "es-AR" : "en-US";
  const num = pct ? `${valor.toLocaleString(loc, { maximumFractionDigits: 0 })}<small> %</small>`
                  : `${valor.toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<small> /10</small>`;
  const meta = pct ? `< ${verde} %` : `< ${String(verde).replace(".", estado.idioma === "es" ? "," : ".")}`;
  return `<div class="kpi-ficha ${estadoK}${destacado ? " destacado" : ""}">
    <span class="k-etq">${t("t_" + clave)}</span><span class="k-num">${num}</span>
    <span class="k-estado">${t("e_" + estadoK)}</span><span class="k-meta">${t("meta")}: ${meta}</span></div>`;
}

function tarjetaCantidad(clave, valor) {
  return `<div class="kpi-ficha"><span class="k-etq">${t("t_" + clave)}</span>
    <span class="k-num">${formatoPersonas(valor)}</span><span class="k-meta">${t("sin_meta")}</span></div>`;
}

// Valores de una zona (uno o varios municipios), ponderados por población
function valoresZona(cmus, i) {
  const items = cmus.map((c) => ({ d: estado.riesgo.cmu[c], p: estado.porCmu.get(c) || {} })).filter((x) => x.d);
  const pob = items.map((x) => Math.max(1, Number(x.p.poblacion) || 1));
  const tot = pob.reduce((a, b) => a + b, 0);
  const pond = (fn) => items.reduce((a, x, k) => a + (fn(x) ?? 0) * pob[k], 0) / tot;
  const pondDatos = (campo) => { const v = items.map((x, k) => [Number(x.p[campo]), pob[k]]).filter(([n]) => !Number.isNaN(n));
    const w = v.reduce((a, [, p]) => a + p, 0); return w ? v.reduce((a, [n, p]) => a + n * p, 0) / w : null; };
  const poblacion = items.reduce((a, x) => a + (Number(x.p.poblacion) || 0), 0);
  const bajo = items.reduce((a, x) => a + (Number(x.p.pob_terreno_bajo) || 0), 0);
  return {
    riesgo: pond((x) => x.d.r[i]), amenaza: pond((x) => x.d.h[i]), agua: pond((x) => x.d.ha[i]),
    rio: pond((x) => x.d.hr[i]), quebrada: pond((x) => x.d.hq[i]), expo: pond((x) => x.d.E), vuln: pond((x) => x.d.V),
    personas: items.reduce((a, x) => a + (x.d.p[i] ?? 0), 0), bajo: poblacion ? (100 * bajo) / poblacion : null,
    cloaca: (v => v == null ? null : 100 - v)(pondDatos("pct_cloaca")), nbi: pondDatos("pct_nbi"),
    materiales: pondDatos("pct_materiales_deficientes"),
  };
}

// En el celular la ficha es un panel inferior: arranca compacta (solo el riesgo) y se despliega con "Ver detalle"
function mostrarFicha(html) {
  const ficha = document.getElementById("ficha");
  ficha.hidden = false;
  ficha.classList.add("compacta");
  ficha.parentElement.classList.add("con-ficha");
  ficha.innerHTML = `<button class="boton-chico cerrar" aria-label="${t("cerrar")}">✕</button>${html}
    <button class="boton-chico expandir" aria-expanded="false">${t("ver_detalle")}</button>`;
  ficha.querySelector(".cerrar").onclick = cerrarFicha;
  const exp = ficha.querySelector(".expandir");
  exp.onclick = () => {
    const abierta = ficha.classList.toggle("compacta") === false;
    exp.setAttribute("aria-expanded", abierta);
    exp.textContent = t(abierta ? "ver_menos" : "ver_detalle");
  };
}

function cerrarFicha() {
  const ficha = document.getElementById("ficha");
  ficha.hidden = true;
  ficha.parentElement.classList.remove("con-ficha");
  if (mapa) mapa.setFilter("municipios-seleccion", ["==", ["get", "cmu"], ""]);
}

function abrirFicha() {
  const z = estado.zona;
  if (!z) return cerrarFicha();
  const i = estado.riesgo.meses.indexOf(estado.mes);
  const v = valoresZona(z.cmus, i);
  mostrarFicha(`
    <h3>${z.nombre}</h3><p class="provincia">${z.tipo} · ${z.provincia ?? ""} · ${nombreMes(estado.mes)}</p>
    <div class="tablero">
      ${tarjeta("riesgo", v.riesgo, { destacado: true })}
      ${tarjetaCantidad("personas", v.personas)}${tarjeta("amenaza", v.amenaza)}
      <p class="tablero-titulo">${t("g_amenazas")}</p>
      ${tarjeta("agua", v.agua)}${tarjeta("rio", v.rio)}${tarjeta("quebrada", v.quebrada)}
      <p class="tablero-titulo">${t("g_social")}</p>
      ${tarjeta("expo", v.expo)}${tarjeta("vuln", v.vuln)}
      ${tarjeta("bajo", v.bajo, { pct: true })}${tarjeta("cloaca", v.cloaca, { pct: true })}
      ${tarjeta("nbi", v.nbi, { pct: true })}${tarjeta("materiales", v.materiales, { pct: true })}
    </div>`);
}

// Radio censal (al buscar una dirección o tocar el mapa de cerca)
function abrirFichaRadio(p) {
  const i = estado.riesgo.meses.indexOf(estado.mes);
  const d = estado.riesgo.cmu[p.cmu];
  const muni = estado.porCmu.get(p.cmu) || {};
  mostrarFicha(`
    <h3>${estado.direccion ?? `${t("radio_titulo")} ${p.cod_indec}`}</h3>
    <p class="provincia">${muni.nam ?? ""} · ${muni.jur ?? ""} · ${nombreMes(estado.mes)}</p>
    <p class="nota">${t("radio_nota")}</p>
    <div class="tablero">
      ${tarjeta("riesgo", Number(p[`r_${estado.mes}`]), { destacado: true })}
      ${d ? tarjeta("amenaza", d.h[i]) : ""}${tarjeta("expo", Number(p.E))}
      ${tarjeta("vuln", Number(p.V))}${tarjeta("bajo", Number(p.pct_area_hand_2m), { pct: true })}
      ${tarjeta("cloaca", 100 - Number(p.pct_cloaca), { pct: true })}
      ${d ? `<p class="tablero-titulo">${t("g_amenazas")}</p>${tarjeta("agua", d.ha[i])}${tarjeta("rio", d.hr[i])}${tarjeta("quebrada", d.hq[i])}` : ""}
    </div>`);
}

// ---------- KPIs, meses, leyenda, tabla ----------
// Agregados de la zona elegida (o de todo el país) a partir de riesgo.json
function cmusZona() {
  return estado.zona ? estado.zona.cmus : Object.keys(estado.riesgo.cmu);
}

function agregado() {
  const meses = estado.riesgo.meses, cmus = cmusZona().filter((c) => estado.riesgo.cmu[c]);
  const serie = (clave, fn) => meses.map((_, i) => fn(cmus.map((c) => estado.riesgo.cmu[c][clave][i] ?? 0)));
  const prom = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
  const suma = (v) => v.reduce((a, b) => a + b, 0);
  return { meses, n: cmus.length,
    riesgo: serie("r", prom), agua: serie("ha", prom), rio: serie("hr", prom), quebrada: serie("hq", prom),
    personas: serie("p", suma), alto: serie("r", (v) => v.filter((x) => x >= 7).length) };
}

function pintarKpis() {
  const ag = agregado(), i = ag.meses.indexOf(estado.mes);
  document.getElementById("kpi-personas").textContent = formatoPersonas(ag.personas[i]);
  document.getElementById("kpi-municipios").textContent = estado.zona ? `${ag.alto[i]} / ${ag.n}` : ag.alto[i];
  // Estaciones de río dentro de la caja de la zona
  const [x0, y0, x1, y1] = estado.zona?.caja ?? [-180, -90, 180, 90];
  const est = estado.datos.estaciones.features.filter((f) => {
    const [x, y] = f.geometry.coordinates;
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  });
  const altas = est.filter((f) => (f.properties[`pe_${estado.mes}`] ?? 0) >= 0.5).length;
  document.getElementById("kpi-estaciones").textContent = est.length ? `${altas} / ${est.length}` : "–";
  document.querySelectorAll(".zona-titulo").forEach((el) => {
    el.textContent = estado.zona ? `· ${estado.zona.nombre}` : "";
  });
}

function pintarMeses() {
  const cont = document.getElementById("botones-mes");
  cont.innerHTML = "";
  estado.datos.resumen.meses.forEach((m) => {
    const b = document.createElement("button");
    b.role = "radio";
    b.textContent = nombreMes(m);
    b.setAttribute("aria-checked", String(m === estado.mes));
    b.onclick = () => elegirMes(m);
    cont.appendChild(b);
  });
  document.getElementById("actualizado").textContent = t("actualizado")(estado.datos.resumen.calculado);
}

function elegirMes(m) {
  estado.mes = m;
  pintarMeses();
  pintarKpis();
  actualizarMes();
  pintarPareto(); pintarCalor(); pintarGrafico(); pintarTabla();
  if (estado.zona) abrirFicha();
}

function pintarLeyenda() {
  const esc = document.getElementById("leyenda-escala");
  const filas = [5, 4, 3, 2, 1].map((i) => `<div class="leyenda-clase"><span class="muestra" style="background:var(--r${i})"></span>
      <span>${t("niveles")[i - 1]}</span><span class="rango">${RANGOS[i - 1]}</span></div>`);
  filas.push(`<div class="leyenda-clase"><span class="muestra" style="background:var(--sin-datos)"></span>
      <span>${t("sin_datos")}</span><span></span></div>`);
  esc.innerHTML = filas.join("");
  esc.nextElementSibling?.classList.contains("leyenda-rotulos") && esc.nextElementSibling.remove();
}

function nivelRiesgo(r) {   // 1..5, mismos cortes que el mapa
  return 1 + CORTES.filter((c) => r >= c).length;
}

function filasRanking() {
  const i = estado.riesgo.meses.indexOf(estado.mes);
  const clave = estado.ranking === "top_personas" ? "p" : "r";
  return cmusZona().filter((c) => estado.riesgo.cmu[c])
    .map((c) => { const d = estado.riesgo.cmu[c], p = estado.porCmu.get(c) || {};
      return { cmu: c, nam: p.nam, jur: p.jur, riesgo: d.r[i] ?? 0, personas_en_riesgo: d.p[i] ?? 0,
               pct_simulaciones_top10: d.rob, orden: d[clave][i] ?? 0 }; })
    .sort((a, b) => b.orden - a.orden).slice(0, 20);
}

function pintarRanking() {
  const filas = filasRanking();
  const porPersonas = estado.ranking === "top_personas";
  const max = porPersonas ? Math.max(1, ...filas.map((f) => f.personas_en_riesgo)) : 10;
  document.getElementById("grafico-ranking").innerHTML = filas.map((f) => {
    const v = porPersonas ? f.personas_en_riesgo : f.riesgo;
    const etiqueta = porPersonas ? formatoPersonas(v) : v.toFixed(1);
    const nivel = nivelRiesgo(f.riesgo);
    return `<div class="fila-ranking" title="${f.nam} · ${t("ficha_riesgo")} ${f.riesgo.toFixed(1)} · ${t("col_robustez")} ${Math.round(f.pct_simulaciones_top10)} %">
      <span class="nombre">${f.nam} <small>${f.jur}</small></span>
      <span class="pista"><span class="barra-r" style="width:${(100 * v) / max}%;background:var(--r${nivel})"></span></span>
      <span class="valor">${etiqueta}</span></div>`;
  }).join("");
}

function pintarTabla() {
  pintarRanking();
  const filas = filasRanking();
  const loc = estado.idioma === "es" ? "es-AR" : "en-US";
  document.getElementById("tabla-cuerpo").innerHTML = filas.map((f) => `
    <tr><td>${f.nam}</td><td>${f.jur}</td><td class="num">${f.riesgo.toFixed(1)}</td>
    <td class="num">${Math.round(f.personas_en_riesgo).toLocaleString(loc)}</td>
    <td class="num">${Math.round(f.pct_simulaciones_top10)} %</td></tr>`).join("");
}

// ---------- Gráfico: personas en riesgo por mes (una serie, un eje) ----------
function pintarGrafico() {
  const cont = document.getElementById("grafico-meses");
  const ag = agregado(), meses = ag.meses;
  const series = [
    { clave: "riesgo", color: "var(--s-riesgo)", ancho: 2.5 },
    { clave: "agua", color: "var(--s-agua)", ancho: 2 },
    { clave: "rio", color: "var(--s-rio)", ancho: 2 },
    { clave: "quebrada", color: "var(--s-quebrada)", ancho: 2 },
  ];
  const W = cont.clientWidth, H = cont.clientHeight, izq = 36, der = 150, arr = 12, aba = 28;
  const x = (i) => izq + (i * (W - izq - der)) / (meses.length - 1);
  const y = (v) => arr + ((10 - v) * (H - arr - aba)) / 10;
  const sel = meses.indexOf(estado.mes);
  // Etiquetas directas al final de cada línea, separadas para que no se pisen
  const finales = series.map((s) => ({ s, yy: y(ag[s.clave][meses.length - 1]) })).sort((a, b) => a.yy - b.yy);
  finales.forEach((f, k) => { if (k && f.yy - finales[k - 1].yy < 14) f.yy = finales[k - 1].yy + 14; });
  cont.innerHTML = `<svg width="${W}" height="${H}">
    ${[0, 2, 4, 6, 8, 10].map((v) => `<line x1="${izq}" x2="${W - der}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grilla)"/>
      <text x="${izq - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--tinta-3)" style="font-variant-numeric:tabular-nums">${v}</text>`).join("")}
    <line x1="${izq}" x2="${W - der}" y1="${y(0)}" y2="${y(0)}" stroke="var(--eje)"/>
    <line x1="${x(sel)}" x2="${x(sel)}" y1="${arr}" y2="${y(0)}" stroke="var(--eje)" stroke-dasharray="0"/>
    ${series.map((s) => `<path d="${ag[s.clave].map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("")}"
        fill="none" stroke="${s.color}" stroke-width="${s.ancho}" stroke-linejoin="round"/>
      <circle cx="${x(sel)}" cy="${y(ag[s.clave][sel])}" r="4.5" fill="${s.color}" stroke="var(--superficie)" stroke-width="2"/>`).join("")}
    ${finales.map((f) => `<text x="${W - der + 10}" y="${f.yy + 4}" font-size="12" fill="var(--tinta-2)">
        <tspan fill="${f.s.color}">●</tspan> ${t("serie_" + f.s.clave)}</text>`).join("")}
    ${meses.map((m, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--tinta-3)">${nombreMes(m)}</text>`).join("")}
    <line id="cruz" y1="${arr}" y2="${y(0)}" stroke="var(--tinta-3)" visibility="hidden"/>
    <rect x="${izq}" y="${arr}" width="${W - izq - der}" height="${H - arr - aba}" fill="transparent" id="zona"/>
  </svg><div class="tooltip" hidden></div>`;
  const zona = cont.querySelector("#zona"), cruz = cont.querySelector("#cruz"), tip = cont.querySelector(".tooltip");
  const indice = (ev) => { const r = zona.getBoundingClientRect();
    return Math.max(0, Math.min(meses.length - 1, Math.round(((ev.clientX - r.left) / r.width) * (meses.length - 1)))); };
  zona.addEventListener("mousemove", (ev) => {
    const i = indice(ev);
    cruz.setAttribute("x1", x(i)); cruz.setAttribute("x2", x(i)); cruz.setAttribute("visibility", "visible");
    tip.hidden = false;
    tip.innerHTML = `<strong>${nombreMes(meses[i])}</strong><br>` + series.map((s) =>
      `<span style="color:${s.color}">●</span> ${t("serie_" + s.clave)}: ${ag[s.clave][i].toFixed(1)}`).join("<br>") +
      `<br>${formatoPersonas(ag.personas[i])} ${t("personas")}`;
    tip.style.left = `${Math.min(x(i) + 12, W - 220)}px`; tip.style.top = `${arr}px`;
  });
  zona.addEventListener("mouseleave", () => { cruz.setAttribute("visibility", "hidden"); tip.hidden = true; });
  zona.addEventListener("click", (ev) => elegirMes(meses[indice(ev)]));
}

// ---------- Buscador y filtro por zona (como un segmentador de Power BI) ----------
const normalizar = (txt) => txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function prepararBuscador() {
  estado.lugares = estado.datos.buscador.map(([nombre, tipo, provincia, cmus, caja, nivel]) =>
    ({ nombre, tipo, provincia, cmus, caja, nivel, clave: normalizar(nombre) }));
  estado.filtros = { partido: null, localidad: null };
  const orden = { Provincia: 0, Partido: 1, Departamento: 1, Municipio: 2, Barrio: 3, Localidad: 4 };
  const candidatos = (nivel, q) => {
    let base = nivel === "partido"
      ? estado.lugares.filter((l) => l.nivel === "depto" || l.nivel === "prov")
      : estado.lugares.filter((l) => l.nivel === "gl" || l.nivel === "loc");
    const partido = estado.filtros.partido;
    if (nivel === "localidad" && partido) {   // localidades del partido elegido
      const dentro = new Set(partido.cmus);
      base = base.filter((l) => l.cmus.some((c) => dentro.has(c)));
    }
    return base.filter((l) => l.clave.includes(q))
      .sort((a, b) => (b.clave.startsWith(q) - a.clave.startsWith(q)) || (orden[a.tipo] ?? 3) - (orden[b.tipo] ?? 3)
        || a.clave.length - b.clave.length).slice(0, 10);
  };
  document.querySelectorAll(".buscador input[data-nivel]").forEach((input) => {
    const nivel = input.dataset.nivel, lista = input.nextElementSibling;
    let activos = [], pos = -1;
    const cerrar = () => { lista.hidden = true; };
    const pintar = () => {
      lista.innerHTML = activos.length ? activos.map((l, k) => `<li role="option" aria-selected="${k === pos}" data-k="${k}">
          <span>${l.nombre}</span><span class="tipo">${l.tipo} · ${l.provincia}</span></li>`).join("")
        : `<li aria-disabled="true"><span>${t("sin_resultados")}</span></li>`;
      lista.hidden = false;
    };
    const elegir = (l) => {
      input.value = l.nombre; cerrar();
      estado.filtros[nivel] = l;
      if (nivel === "partido") { estado.filtros.localidad = null; document.getElementById("buscar-localidad").value = ""; }
      aplicarZona(l, true);
    };
    input.addEventListener("input", () => {
      const q = normalizar(input.value);
      if (!q) { estado.filtros[nivel] = null; cerrar(); return; }
      if (q.length < 2) { cerrar(); return; }
      activos = candidatos(nivel, q); pos = activos.length ? 0 : -1; pintar();
    });
    input.addEventListener("keydown", (e) => {
      if (lista.hidden) return;
      if (e.key === "ArrowDown") { pos = Math.min(pos + 1, activos.length - 1); pintar(); e.preventDefault(); }
      if (e.key === "ArrowUp") { pos = Math.max(pos - 1, 0); pintar(); e.preventDefault(); }
      if (e.key === "Enter" && activos[pos]) { elegir(activos[pos]); e.preventDefault(); }
      if (e.key === "Escape") cerrar();
    });
    lista.addEventListener("mousedown", (e) => {
      const li = e.target.closest("li[data-k]");
      if (li) { elegir(activos[+li.dataset.k]); e.preventDefault(); }
    });
    input.addEventListener("blur", () => setTimeout(cerrar, 150));
  });
  // Botón Buscar: usa la dirección si hay; si no, lo más específico elegido (localidad > partido)
  document.getElementById("form-buscar").addEventListener("submit", (e) => {
    e.preventDefault();
    if (matchMedia("(max-width: 760px)").matches) {   // celular: cerrar el teclado y bajar hasta el mapa
      document.activeElement?.blur();
      document.querySelector(".escenario").scrollIntoView({ behavior: "smooth", block: "end" });
    }
    const dir = document.getElementById("buscar-direccion").value.trim();
    if (dir) return buscarDireccion(dir);
    const l = estado.filtros.localidad || estado.filtros.partido;
    if (l) aplicarZona(l, true);
  });
}

// Punto dentro de polígono (ray casting) para saber en qué municipio cae una dirección
function contiene(geom, [x, y]) {
  const anillo = (r) => { let d = false;
    for (let a = 0, b = r.length - 1; a < r.length; b = a++) {
      const [xa, ya] = r[a], [xb, yb] = r[b];
      if ((ya > y) !== (yb > y) && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) d = !d;
    } return d; };
  const pol = (p) => anillo(p[0]) && !p.slice(1).some(anillo);
  return geom.type === "Polygon" ? pol(geom.coordinates) : geom.coordinates.some(pol);
}

// ---------- Callejero propio (cuadras del INDEC), para cuando no hay conexión al servicio de direcciones ----------
const VACIAS = new Set(["AV", "AVDA", "AVENIDA", "CALLE", "BV", "BOULEVARD", "BULEVAR", "PJE", "PASAJE", "DR", "DOCTOR",
  "GRAL", "GENERAL", "ING", "INGENIERO", "PTE", "PRESIDENTE", "CNEL", "CORONEL", "DE", "DEL", "LA", "LAS", "LOS", "EL", "Y", "N"]);
const tokens = (txt) => normalizar(txt).toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/)
  .filter((w) => w && !VACIAS.has(w));

async function callejero() {
  estado.callejero ??= { indice: await fetch("datos/callejero/indice.json").then((r) => r.json()), cargados: {} };
  return estado.callejero;
}

async function buscarDireccionLocal(texto) {
  const m = texto.trim().match(/^(.*?)[\s,]+(\d{1,5})\s*$/);
  if (!m) return null;
  const palabras = tokens(m[1]), numero = Number(m[2]);
  if (!palabras.length) return null;
  const cj = await callejero();
  const zona = estado.filtros.localidad || estado.filtros.partido;
  if (!zona) return { error: "elegir_partido" };
  const deptos = [...new Set(zona.cmus.flatMap((c) => cj.indice.cmu_depto[c] || []))];
  let mejor = null;
  for (const d of deptos) {
    const archivo = cj.indice.depto_archivo[d];
    if (!archivo) continue;
    cj.cargados[archivo] ??= await fetch(`datos/callejero/${archivo}`).then((r) => r.json());
    const calles = cj.cargados[archivo][d] || {};
    for (const [nombre, cuadras] of Object.entries(calles)) {
      const t = nombre.split(" ");
      if (!palabras.every((p) => t.some((w) => w === p || (p.length >= 4 && w.startsWith(p))))) continue;
      const extra = t.length - palabras.length;
      // cuadra que contiene el número (o la más cercana)
      let cuadra = null, dist = Infinity;
      for (const c of cuadras) {
        const dd = c[1] === 0 ? 5000   // calle sin numeración en el INDEC: solo su punto central
          : numero < c[0] ? c[0] - numero : numero > c[1] ? numero - c[1] : 0;
        if (dd < dist) { dist = dd; cuadra = c; }
      }
      const puntaje = dist * 10 + extra;
      if (cuadra && (!mejor || puntaje < mejor.puntaje)) mejor = { puntaje, nombre, cuadra, depto: d, dist };
    }
  }
  if (!mejor) return { error: "no_encontrada" };
  const [desde, hasta, x1, y1, x2, y2] = mejor.cuadra;
  const f = hasta > desde ? Math.min(1, Math.max(0, (numero - desde) / (hasta - desde))) : 0.5;
  return { punto: [(x1 + (x2 - x1) * f) / 1e5, (y1 + (y2 - y1) * f) / 1e5],
           nombre: `${mejor.nombre} ${numero}`, aproximada: mejor.dist > 50 };
}

async function buscarDireccion(texto) {
  const aviso = document.getElementById("aviso-busqueda");
  aviso.hidden = true;
  const params = new URLSearchParams({ direccion: texto, max: "1" });
  const partido = estado.filtros.partido, localidad = estado.filtros.localidad;
  if (partido?.nivel === "depto") { params.set("departamento", partido.nombre); params.set("provincia", partido.provincia); }
  else if (partido?.nivel === "prov") params.set("provincia", partido.provincia);
  else if (localidad) params.set("provincia", localidad.provincia);
  let punto = null, nombre = null;
  try {   // 1) servicio oficial de direcciones (versión completa)
    const d = await fetch(`https://apis.datos.gob.ar/georef/api/direcciones?${params}`).then((r) => r.json());
    const r = d.direcciones?.[0];
    if (r) { punto = [r.ubicacion.lon, r.ubicacion.lat]; nombre = r.nomenclatura; }
  } catch (err) { /* sin conexión al servicio (p. ej. dentro de claude.ai): se usa el callejero propio */ }
  if (!punto) {   // 2) callejero propio (cuadras del INDEC publicadas con la web)
    const loc = await buscarDireccionLocal(texto).catch(() => null);
    if (loc?.punto) {
      punto = loc.punto; nombre = loc.nombre + (zonaTexto());
      if (loc.aproximada) { aviso.textContent = t("dir_aprox"); aviso.hidden = false; }
    }
    else {
      aviso.textContent = t(loc?.error === "elegir_partido" ? "dir_elegir_partido" : "dir_no_encontrada");
      aviso.hidden = false; return;
    }
  }
  const muni = estado.datos.municipios.features.find((f) => contiene(f.geometry, punto));
  estado.direccion = nombre;
  mapa.getSource("direccion").setData({ type: "FeatureCollection",
    features: [{ type: "Feature", geometry: { type: "Point", coordinates: punto }, properties: {} }] });
  if (muni) {
    aplicarZona({ nombre, tipo: t("b_direccion"), provincia: muni.properties.jur,
      cmus: [muni.properties.cmu], nivel: "gl", caja: [punto[0] - 0.004, punto[1] - 0.003, punto[0] + 0.004, punto[1] + 0.003] }, false);
  }
  mapa.flyTo({ center: punto, zoom: 15.5, pitch: 40, duration: 2200 });
  mapa.once("moveend", async () => {
    await cargarRadiosVisibles();
    const radio = estado.radios.find((f) => contiene(f.geometry, punto));
    if (radio) abrirFichaRadio(radio.properties);
  });
}

function zonaTexto() {
  const z = estado.filtros.localidad || estado.filtros.partido;
  return z ? `, ${z.nombre}` : "";
}

function aplicarZona(lugar, volar) {
  estado.zona = lugar;
  if (lugar && !lugar.caja) {   // municipio elegido con un clic: caja desde su geometría
    const f = estado.datos.municipios.features.find((x) => x.properties.cmu === lugar.cmus[0]);
    const xs = [], ys = [];
    JSON.stringify(f.geometry.coordinates).replace(/-?\d+\.?\d*,-?\d+\.?\d*/g, (par) => {
      const [a, b] = par.split(",").map(Number); xs.push(a); ys.push(b); return par; });
    lugar.caja = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  const chip = document.getElementById("filtro-activo");
  if (lugar) {
    chip.hidden = false;
    chip.innerHTML = `<span>${lugar.nombre} <small>(${lugar.tipo})</small></span>
      <button aria-label="${t("quitar_filtro")}" title="${t("quitar_filtro")}">✕</button>`;
    chip.querySelector("button").onclick = () => {
      estado.filtros = { partido: null, localidad: null }; estado.direccion = null;
      document.querySelectorAll(".buscador input").forEach((x) => { x.value = ""; });
      if (mapa?.getSource("direccion")) mapa.getSource("direccion").setData({ type: "FeatureCollection", features: [] });
      aplicarZona(null, false);
    };
    if (volar && mapa) {
      const [x0, y0, x1, y1] = lugar.caja;
      mapa.fitBounds([[x0, y0], [x1, y1]], { padding: 60, pitch: 45, duration: 1800, maxZoom: 12 });
    }
  } else {
    chip.hidden = true;
  }
  pintarTodo();
  if (lugar && lugar.tipo !== t("b_direccion")) abrirFicha(); else if (!lugar) cerrarFicha();
}

function pintarTodo() {
  actualizarMes(); pintarKpis(); pintarPareto(); pintarCalor(); pintarGrafico(); pintarTabla();
}

// ---------- Zonas "hijas" de la selección: país → provincias → partidos/departamentos → municipios ----------
function unidadesHijas() {
  const z = estado.zona;
  if (!z) return { nivel: "prov", unidades: estado.lugares.filter((l) => l.nivel === "prov") };
  if (z.nivel === "prov") {
    const dentro = new Set(z.cmus);
    const deptos = estado.lugares.filter((l) => l.nivel === "depto" && l.provincia === z.provincia
      && l.cmus.every((c) => dentro.has(c)));
    if (deptos.length > 1) return { nivel: "depto", unidades: deptos };
  }
  const gl = estado.lugares.filter((l) => l.nivel === "gl");
  const porCmu = new Map(gl.map((l) => [l.cmus[0], l]));
  return { nivel: "gl", unidades: z.cmus.map((c) => porCmu.get(c)).filter(Boolean) };
}

// Por unidad y mes: personas en riesgo (suma) y riesgo promedio ponderado por población
function resumenUnidad(u) {
  const meses = estado.riesgo.meses;
  const cmus = u.cmus.filter((c) => estado.riesgo.cmu[c]);
  const pob = cmus.map((c) => Math.max(1, Number(estado.porCmu.get(c)?.poblacion) || 1));
  const tot = pob.reduce((a, b) => a + b, 0);
  return { u, personas: meses.map((_, i) => cmus.reduce((a, c) => a + (estado.riesgo.cmu[c].p[i] ?? 0), 0)),
    riesgo: meses.map((_, i) => cmus.reduce((a, c, k) => a + (estado.riesgo.cmu[c].r[i] ?? 0) * pob[k], 0) / tot) };
}

function pintarPareto() {
  const cont = document.getElementById("grafico-pareto");
  const { nivel, unidades } = unidadesHijas();
  const i = estado.riesgo.meses.indexOf(estado.mes);
  let filas = unidades.map(resumenUnidad).filter((f) => f.personas[i] > 0).sort((a, b) => b.personas[i] - a.personas[i]);
  const total = filas.reduce((a, f) => a + f.personas[i], 0) || 1;
  let acum = 0, n80 = 0;
  filas.forEach((f) => { acum += f.personas[i]; f.acum = acum / total; if (f.acum - f.personas[i] / total < 0.8) n80 += 1; });
  const totalUnidades = filas.length;
  const MAX = 22;
  if (filas.length > MAX) {   // la cola larga se agrupa en "Resto"
    const resto = filas.slice(MAX - 1);
    filas = filas.slice(0, MAX - 1);
    filas.push({ resto: true, u: { nombre: `${t("resto")} (${resto.length})` }, personas: estado.riesgo.meses.map((_, k) =>
      resto.reduce((a, f) => a + f.personas[k], 0)), riesgo: resto[0].riesgo.map(() => 0), acum: 1 });
  }
  document.getElementById("pareto-hallazgo").innerHTML =
    t("pareto_hallazgo")(n80, totalUnidades, t("niveles_zona")[nivel], nombreMes(estado.mes));
  const W = cont.clientWidth, H = cont.clientHeight, izq = 44, der = 16, arr = 16, aba = 110;
  const ancho = (W - izq - der) / filas.length;
  const y = (v) => arr + (1 - v) * (H - arr - aba);       // un solo eje: porcentaje (0-100 %)
  const xc = (k) => izq + ancho * (k + 0.5);
  const linea = filas.map((f, k) => `${k ? "L" : "M"}${xc(k)},${y(f.acum)}`).join("");
  cont.innerHTML = `<svg width="${W}" height="${H}">
    ${[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => `<line x1="${izq}" x2="${W - der}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grilla)"/>
      <text x="${izq - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--tinta-3)">${v * 100} %</text>`).join("")}
    <line x1="${izq}" x2="${W - der}" y1="${y(0.8)}" y2="${y(0.8)}" stroke="var(--acento)" stroke-width="1"/>
    <text x="${W - der}" y="${y(0.8) - 6}" text-anchor="end" font-size="11" fill="var(--acento)">80 %</text>
    ${filas.map((f, k) => { const h = (f.personas[i] / total) * (H - arr - aba);
      const color = f.resto ? "var(--tinta-3)" : `var(--r${nivelRiesgo(f.riesgo[i])})`;
      return `<g class="barra-pareto" data-k="${k}" style="cursor:${f.resto ? "default" : "pointer"}">
        <rect x="${izq + ancho * k + 2}" y="${y(0) - h}" width="${Math.max(2, ancho - 4)}" height="${h}" rx="3" fill="${color}"/>
        <rect x="${izq + ancho * k}" y="${arr}" width="${ancho}" height="${H - arr - aba}" fill="transparent"/>
        <text transform="translate(${xc(k) + 4},${y(0) + 10}) rotate(-45)" text-anchor="end" font-size="11" fill="var(--tinta-2)">${f.u.nombre.length > 22 ? f.u.nombre.slice(0, 21) + "…" : f.u.nombre}</text></g>`; }).join("")}
    <path d="${linea}" fill="none" stroke="var(--tinta-1)" stroke-width="2" stroke-linejoin="round"/>
    ${filas.map((f, k) => `<circle cx="${xc(k)}" cy="${y(f.acum)}" r="3" fill="var(--tinta-1)" stroke="var(--superficie)" stroke-width="1.5"/>`).join("")}
    <line x1="${izq}" x2="${W - der}" y1="${y(0)}" y2="${y(0)}" stroke="var(--eje)"/>
  </svg><div class="tooltip" hidden></div>`;
  const tip = cont.querySelector(".tooltip");
  cont.querySelectorAll(".barra-pareto").forEach((g) => {
    const f = filas[+g.dataset.k];
    g.addEventListener("mousemove", (ev) => {
      const r = cont.getBoundingClientRect();
      tip.hidden = false;
      tip.innerHTML = `<strong>${f.u.nombre}</strong><br>${formatoPersonas(f.personas[i])} ${t("personas")} ·
        ${Math.round((100 * f.personas[i]) / total)} %<br>${t("pareto_acum")}: ${Math.round(100 * f.acum)} %` +
        (f.resto ? "" : `<br>${t("ficha_riesgo")}: ${f.riesgo[i].toFixed(1)} / 10`);
      tip.style.left = `${Math.min(ev.clientX - r.left + 12, W - 200)}px`; tip.style.top = `${ev.clientY - r.top - 10}px`;
    });
    g.addEventListener("mouseleave", () => { tip.hidden = true; });
    if (!f.resto) g.addEventListener("click", () => aplicarZona(f.u, true));
  });
}

function pintarCalor() {
  const cont = document.getElementById("grafico-calor");
  const { unidades } = unidadesHijas();
  const meses = estado.riesgo.meses, i = meses.indexOf(estado.mes);
  const pico = meses.indexOf(estado.datos.resumen.mes_pico);
  const filas = unidades.map(resumenUnidad).sort((a, b) => b.riesgo[pico] - a.riesgo[pico]);
  const MAX = 20, visibles = filas.slice(0, MAX);
  cont.innerHTML = `<div class="fila-calor encabezado"><span class="etq"></span>${meses.map((m, k) =>
      `<span class="mes${k === i ? " activo" : ""}">${nombreMes(m)}</span>`).join("")}</div>` +
    visibles.map((f, r) => `<div class="fila-calor" data-r="${r}"><span class="etq" title="${f.u.nombre}">${f.u.nombre}</span>${
      f.riesgo.map((v, k) => `<button class="celda n${nivelRiesgo(v)}${k === i ? " mes-activo" : ""}" data-k="${k}"
        style="background:var(--r${nivelRiesgo(v)})" title="${f.u.nombre} · ${nombreMes(meses[k])}: ${v.toFixed(1)} / 10 · ${formatoPersonas(f.personas[k])} ${t("personas")}">${v.toFixed(1)}</button>`).join("")}</div>`).join("") +
    (filas.length > MAX ? `<p class="nota">${t("mas_zonas")(filas.length - MAX)}</p>` : "");
  cont.querySelectorAll(".fila-calor[data-r]").forEach((fila) => {
    const f = visibles[+fila.dataset.r];
    fila.querySelectorAll(".celda").forEach((c) => c.addEventListener("click", () => {
      elegirMes(meses[+c.dataset.k]);   // celda: cambia el mes; nombre de la fila: entra a la zona
    }));
    fila.querySelector(".etq").addEventListener("click", () => aplicarZona(f.u, true));
    fila.querySelector(".etq").style.cursor = "pointer";
  });
}

// ---------- Relato con scroll ----------
function prepararRelato() {
  const caps = document.querySelectorAll(".capitulo");
  // El relato mueve el mapa solo cuando la persona lo scrollea (no al cargar: no pisa búsquedas ni links)
  let scrolleado = false;
  document.getElementById("relato").addEventListener("scroll", () => { scrolleado = true; }, { once: true, passive: true });
  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach((en) => {
      if (!en.isIntersecting) return;
      caps.forEach((c) => c.classList.toggle("activo", c === en.target));
      if (!scrolleado) return;
      const v = VISTAS[en.target.dataset.vista];
      if (mapa && v) mapa.flyTo({ ...v, duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 2600, essential: true });
    });
  }, { root: document.getElementById("relato"), threshold: 0.6 });
  caps.forEach((c) => obs.observe(c));
}

// ---------- Idioma y tema ----------
function aplicarIdioma() {
  document.documentElement.lang = estado.idioma;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = t(el.dataset.i18n);
    if (typeof v === "string") el.innerHTML = v;
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  const b = document.getElementById("btn-idioma");
  b.textContent = estado.idioma === "es" ? "EN" : "ES";
  b.setAttribute("aria-label", estado.idioma === "es" ? "Change language to English" : "Cambiar el idioma a español");
  document.title = t("titulo");
  pintarMeses(); pintarKpis(); pintarPareto(); pintarCalor(); pintarTabla(); pintarGrafico();
  if (estado.zona) abrirFicha();
}

function cambiarTema() {
  document.documentElement.dataset.theme = temaOscuro() ? "light" : "dark";
  try { localStorage.setItem("tema", document.documentElement.dataset.theme); } catch (e) { /* sin almacenamiento */ }
  const vista = { center: mapa.getCenter(), zoom: mapa.getZoom(), pitch: mapa.getPitch(), bearing: mapa.getBearing() };
  mapa.setStyle(estiloBase());
  mapa.once("style.load", () => { agregarCapas(); mapa.jumpTo(vista); });
  pintarLeyenda(); pintarGrafico();
}

// ---------- Inicio ----------
async function iniciar() {
  try { const tm = localStorage.getItem("tema"); if (tm) document.documentElement.dataset.theme = tm; } catch (e) { /* sin almacenamiento */ }
  // Links directos: #litoral, #caba… (útil para compartir y para grabar el video); ?tema=oscuro|claro
  const tema = new URLSearchParams(location.search).get("tema");
  if (tema) document.documentElement.dataset.theme = tema === "oscuro" ? "dark" : "light";
  // ?vista=lon,lat,zoom: link directo a un punto (útil para compartir una zona)
  const v = new URLSearchParams(location.search).get("vista")?.split(",").map(Number);
  const vistaInicial = v?.length === 3 ? { center: [v[0], v[1]], zoom: v[2], pitch: 40, bearing: 0 }
    : VISTAS[location.hash.slice(1)] ?? VISTAS.pais;
  // Geometrías fijas + números del día (riesgo.json lo reescribe GitHub Actions cada mañana)
  const [resumen, municipios, riesgo, estaciones, caba, cajas, provincias, bordes, buscador] = await Promise.all(
    ["resumen.json", "municipios_geo.geojson", "riesgo.json", "estaciones.geojson", "caba_barrios.geojson",
     "radios/indice.json", "provincias_geo.geojson", "bordes_geo.geojson", "buscador.json"].map((f) => fetch(`datos/${f}`, { cache: "no-cache" }).then((r) => r.json())));
  unirRiesgo(municipios, riesgo);
  unirBordes(bordes, riesgo);
  estado.riesgo = riesgo;
  estado.datos = { resumen, municipios, estaciones, caba, cajas, provincias, bordes, buscador };
  prepararBuscador();
  estado.mes = resumen.mes_pico;

  mapa = new maplibregl.Map({
    container: "mapa", style: estiloBase(), ...vistaInicial, maxPitch: 75,
    attributionControl: { compact: true },
  });
  mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  mapa.on("style.load", () => { if (!mapa.getSource("municipios")) agregarCapas(); });

  document.getElementById("btn-idioma").onclick = () => { estado.idioma = estado.idioma === "es" ? "en" : "es"; aplicarIdioma(); };
  document.getElementById("btn-tema").onclick = cambiarTema;
  document.getElementById("chk-altura").onchange = (e) => { estado.altura = e.target.checked; actualizarMes(); };
  document.getElementById("btn-play").onclick = () => {
    const btn = document.getElementById("btn-play");
    if (estado.reproduciendo) { clearInterval(estado.reproduciendo); estado.reproduciendo = null; btn.textContent = "▶"; return; }
    btn.textContent = "❚❚";
    const meses = resumen.meses;
    estado.reproduciendo = setInterval(() => elegirMes(meses[(meses.indexOf(estado.mes) + 1) % meses.length]), 1400);
  };
  document.querySelectorAll(".pestanas button").forEach((b) => b.onclick = () => {
    document.querySelectorAll(".pestanas button").forEach((o) => o.setAttribute("aria-selected", String(o === b)));
    estado.ranking = b.dataset.ranking; pintarTabla();
  });
  window.addEventListener("resize", () => { pintarGrafico(); pintarPareto(); });

  pintarLeyenda();
  aplicarIdioma();
  if (location.hash.slice(1) in VISTAS) {
    const cap = document.querySelector(`.capitulo[data-vista="${location.hash.slice(1)}"]`);
    if (cap) document.getElementById("relato").scrollTop = cap.offsetTop;
  }
  prepararRelato();
  const q = new URLSearchParams(location.search);
  if (q.get("partido") || q.get("dir") || q.get("lugar")) {
    const alCargar = (fn) => (mapa.loaded() ? fn() : mapa.once("load", fn));
    alCargar(() => {
      const buscar = (nombre, niveles) => estado.lugares.find((l) => niveles.includes(l.nivel) && l.clave === normalizar(nombre));
      if (q.get("partido")) { estado.filtros.partido = buscar(q.get("partido"), ["depto", "prov"]);
        document.getElementById("buscar-partido").value = q.get("partido"); }
      if (q.get("lugar")) { estado.filtros.localidad = buscar(q.get("lugar"), ["gl", "loc"]);
        document.getElementById("buscar-localidad").value = q.get("lugar"); }
      if (q.get("dir")) { document.getElementById("buscar-direccion").value = q.get("dir"); buscarDireccion(q.get("dir")); }
      else if (estado.filtros.localidad || estado.filtros.partido) aplicarZona(estado.filtros.localidad || estado.filtros.partido, true);
    });
  }
}

iniciar();

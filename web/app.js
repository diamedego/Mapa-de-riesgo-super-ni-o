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
    buscar_label: "Buscar un lugar", buscar_ph: "Buscar provincia, partido, municipio, localidad o barrio…",
    sin_resultados: "Sin resultados", quitar_filtro: "Quitar filtro", en: "en",
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
    buscar_label: "Search a place", buscar_ph: "Search a province, district, municipality, town or neighborhood…",
    sin_resultados: "No results", quitar_filtro: "Clear filter", en: "in",
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
  return `https://tiles.openfreemap.org/styles/${temaOscuro() ? "dark" : "positron"}`;
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

function agregarCapasDatos(m) {

  // Fondo gris: todo el país. Lo que queda gris es zona sin gobierno local (sin datos)
  mapa.addSource("provincias", { type: "geojson", data: estado.datos.provincias });
  mapa.addLayer({ id: "sin-datos", type: "fill", source: "provincias",
    paint: { "fill-color": css("--sin-datos"), "fill-opacity": 0.9 } });
  mapa.addLayer({ id: "provincias-borde", type: "line", source: "provincias",
    paint: { "line-color": css("--tinta-3"), "line-width": 0.8, "line-opacity": 0.8 } });

  mapa.addSource("municipios", { type: "geojson", data: estado.datos.municipios, promoteId: "cmu" });
  mapa.addLayer({ id: "municipios-3d", type: "fill-extrusion", source: "municipios",
    paint: {
      "fill-extrusion-color": colorMapa(`r_${m}`),
      "fill-extrusion-height": alturaRiesgo(`r_${m}`),
      "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 9.6, 0.88, 10.2, 0],
    } });
  mapa.addLayer({ id: "municipios-borde", type: "line", source: "municipios", minzoom: 6,
    paint: { "line-color": css("--superficie"), "line-width": 0.6, "line-opacity": 0.7 } });
  // Línea fina gris oscuro solo donde cambia el nivel de riesgo (o contra zonas sin datos)
  mapa.addSource("bordes", { type: "geojson", data: estado.datos.bordes });
  mapa.addLayer({ id: "bordes-riesgo", type: "line", source: "bordes", maxzoom: 10.2,
    filter: ["!=", ["get", `na_${m}`], ["get", `nb_${m}`]],
    paint: { "line-color": css("--borde-riesgo"),
             "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.4, 8, 0.9, 10, 1.2], "line-opacity": 0.9 } });
  mapa.addLayer({ id: "zona-contorno", type: "line", source: "municipios",
    filter: ["in", ["get", "cmu"], ["literal", estado.zona ? estado.zona.cmus : []]],
    paint: { "line-color": css("--tinta-1"), "line-width": 2 } });
  mapa.addLayer({ id: "municipios-seleccion", type: "line", source: "municipios",
    filter: ["==", ["get", "cmu"], ""],
    paint: { "line-color": css("--tinta-1"), "line-width": 2.5 } });

  // Nivel barrio: radios censales, cargados por provincia al acercarse (zoom ≥ 9)
  mapa.addSource("radios", { type: "geojson", data: { type: "FeatureCollection", features: estado.radios } });
  mapa.addLayer({ id: "radios-3d", type: "fill-extrusion", source: "radios", minzoom: 9,
    paint: {
      "fill-extrusion-color": colorMapa(`r_${m}`),
      "fill-extrusion-height": alturaRiesgo(`r_${m}`),
      "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 9.6, 0, 10.2, 0.9],
    } });
  mapa.on("mousemove", "radios-3d", (e) => mostrarTooltipRadio(e));
  mapa.on("mouseleave", "radios-3d", () => ocultarTooltip());
  mapa.on("moveend", cargarRadiosVisibles);
  cargarRadiosVisibles();

  mapa.addSource("caba", { type: "geojson", data: estado.datos.caba });
  // Barrios de CABA: solo contorno + zona sensible al mouse (el color lo dan los radios)
  mapa.addLayer({ id: "caba-barrios", type: "fill", source: "caba", minzoom: 10.5,
    paint: { "fill-color": css("--tinta-1"), "fill-opacity": 0.01 } });
  mapa.addLayer({ id: "caba-contorno", type: "line", source: "caba", minzoom: 10.5,
    paint: { "line-color": css("--tinta-1"), "line-width": 1.2, "line-opacity": 0.6 } });

  mapa.addSource("estaciones", { type: "geojson", data: estado.datos.estaciones });
  mapa.addLayer({ id: "estaciones", type: "circle", source: "estaciones", minzoom: 5.5,
    paint: {
      "circle-radius": radioEstacion(`pe_${m}`),
      "circle-color": "rgba(0,0,0,0)",
      "circle-stroke-color": css("--estacion"), "circle-stroke-width": 1.5,
    } });

  mapa.on("mousemove", "municipios-3d", (e) => mostrarTooltipMunicipio(e));
  mapa.on("mouseleave", "municipios-3d", () => ocultarTooltip());
  mapa.on("click", "municipios-3d", (e) => {
    const p = e.features[0].properties;
    seleccionar(p);
    aplicarZona({ nombre: p.nam, tipo: "Municipio", provincia: p.jur, cmus: [p.cmu] }, false);
  });
  mapa.on("mousemove", "estaciones", (e) => mostrarTooltipEstacion(e));
  mapa.on("mouseleave", "estaciones", () => ocultarTooltip());
  mapa.on("mousemove", "caba-barrios", (e) => mostrarTooltipCaba(e));
  mapa.on("mouseleave", "caba-barrios", () => ocultarTooltip());
}

function actualizarMes() {
  const m = estado.mes;
  if (!mapa || !mapa.getLayer("municipios-3d")) return;
  mapa.setPaintProperty("municipios-3d", "fill-extrusion-color", colorMapa(`r_${m}`));
  mapa.setFilter("bordes-riesgo", ["!=", ["get", `na_${m}`], ["get", `nb_${m}`]]);
  mapa.setFilter("zona-contorno", ["in", ["get", "cmu"], ["literal", estado.zona ? estado.zona.cmus : []]]);
  mapa.setPaintProperty("municipios-3d", "fill-extrusion-height", alturaRiesgo(`r_${m}`));
  mapa.setPaintProperty("radios-3d", "fill-extrusion-color", colorMapa(`r_${m}`));
  mapa.setPaintProperty("radios-3d", "fill-extrusion-height", alturaRiesgo(`r_${m}`));
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
function barra(etiqueta, valor) {
  const v = Math.max(0, Math.min(10, Number(valor) || 0));
  return `<div class="barra"><span>${etiqueta}</span><span class="pista"><span class="relleno" style="width:${v * 10}%"></span></span><span class="valor">${v.toFixed(1)}</span></div>`;
}
function seleccionar(p) {
  estado.seleccion = p;
  mapa.setFilter("municipios-seleccion", ["==", ["get", "cmu"], p.cmu]);
  const m = estado.mes;
  const ficha = document.getElementById("ficha");
  ficha.hidden = false;
  ficha.innerHTML = `
    <button class="boton-chico cerrar" aria-label="${t("cerrar")}">✕</button>
    <h3>${p.nam}</h3><p class="provincia">${p.jur} · ${nombreMes(m)}</p>
    ${barra(t("ficha_riesgo"), p[`r_${m}`])}
    ${barra(t("ficha_amenaza"), p[`h_${m}`])}
    ${barra(t("ficha_expo"), p.E)}
    ${barra(t("ficha_vuln"), p.V)}
    <hr style="border:0;border-top:1px solid var(--grilla)">
    ${barra(t("ficha_agua"), p[`ha_${m}`])}
    ${barra(t("ficha_rio"), p[`hr_${m}`])}
    ${barra(t("ficha_quebrada"), p[`hq_${m}`])}
    <p>${t("ficha_bajo")}: <strong>${formatoPersonas(Number(p.pob_terreno_bajo))}</strong><br>
    ${t("ficha_robustez")}: <strong>${Math.round(Number(p.robustez))} %</strong></p>`;
  ficha.querySelector(".cerrar").onclick = () => { ficha.hidden = true; mapa.setFilter("municipios-seleccion", ["==", ["get", "cmu"], ""]); };
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
  pintarGrafico();
  if (estado.seleccion) seleccionar(estado.seleccion);
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
  estado.lugares = estado.datos.buscador.map(([nombre, tipo, provincia, cmus, caja]) =>
    ({ nombre, tipo, provincia, cmus, caja, clave: normalizar(nombre) }));
  const input = document.getElementById("buscar"), lista = document.getElementById("resultados");
  let activos = [], pos = -1;
  const cerrar = () => { lista.hidden = true; input.setAttribute("aria-expanded", "false"); };
  const pintar = () => {
    lista.innerHTML = activos.length ? activos.map((l, k) => `<li role="option" aria-selected="${k === pos}" data-k="${k}">
        <span>${l.nombre}</span><span class="tipo">${l.tipo} · ${l.provincia}</span></li>`).join("")
      : `<li aria-disabled="true"><span>${t("sin_resultados")}</span></li>`;
    lista.hidden = false; input.setAttribute("aria-expanded", "true");
  };
  const orden = { Provincia: 0, Partido: 1, Departamento: 1, Municipio: 2, Barrio: 3, Localidad: 4 };
  input.addEventListener("input", () => {
    const q = normalizar(input.value);
    if (q.length < 2) { cerrar(); return; }
    const empieza = estado.lugares.filter((l) => l.clave.startsWith(q));
    const contiene = estado.lugares.filter((l) => !l.clave.startsWith(q) && l.clave.includes(q));
    activos = [...empieza, ...contiene]
      .sort((a, b) => (a.clave.startsWith(q) === b.clave.startsWith(q) ? 0 : a.clave.startsWith(q) ? -1 : 1)
        || (orden[a.tipo] ?? 3) - (orden[b.tipo] ?? 3) || a.clave.length - b.clave.length)
      .slice(0, 10);
    pos = activos.length ? 0 : -1;
    pintar();
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
  const elegir = (l) => { input.value = ""; cerrar(); aplicarZona(l, true); };
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
    chip.querySelector("button").onclick = () => aplicarZona(null, false);
    if (volar && mapa) {
      const [x0, y0, x1, y1] = lugar.caja;
      mapa.fitBounds([[x0, y0], [x1, y1]], { padding: 60, pitch: 45, duration: 1800, maxZoom: 12 });
    }
  } else {
    chip.hidden = true;
    document.getElementById("ficha").hidden = true;
    if (mapa) mapa.setFilter("municipios-seleccion", ["==", ["get", "cmu"], ""]);
  }
  actualizarMes(); pintarKpis(); pintarGrafico(); pintarTabla();
}

// ---------- Relato con scroll ----------
function prepararRelato() {
  const caps = document.querySelectorAll(".capitulo");
  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach((en) => {
      if (!en.isIntersecting) return;
      caps.forEach((c) => c.classList.toggle("activo", c === en.target));
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
  pintarMeses(); pintarKpis(); pintarTabla(); pintarGrafico();
  if (estado.seleccion) seleccionar(estado.seleccion);
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
  const vistaInicial = VISTAS[location.hash.slice(1)] ?? VISTAS.pais;
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
  window.addEventListener("resize", pintarGrafico);

  pintarLeyenda();
  aplicarIdioma();
  if (location.hash.slice(1) in VISTAS) {
    const cap = document.querySelector(`.capitulo[data-vista="${location.hash.slice(1)}"]`);
    if (cap) document.getElementById("relato").scrollTop = cap.offsetTop;
  }
  prepararRelato();
}

iniciar();

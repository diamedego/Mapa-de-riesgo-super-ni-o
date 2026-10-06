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
    leyenda_altura: "La altura de cada municipio también indica el riesgo.",
    leyenda_estacion: "Estación de río: el tamaño es la probabilidad de superar el nivel de evacuación.",
    leyenda_blanco: "En blanco: zonas rurales sin gobierno local (1 % de la población).",
    c1_t: "Un Niño de los más fuertes",
    c1_p: "NOAA da más del 90 % de probabilidad de un Niño muy fuerte. En Argentina eso significa más lluvia en el Litoral y la región pampeana, y ríos que crecen con semanas de retraso. Cada municipio se levanta según su riesgo.",
    c2_t: "El Litoral concentra el riesgo más alto",
    c2_p: "Corrientes, Chaco y Santa Fe combinan terreno bajo, historia de inundaciones y ríos grandes. Sus municipios siguen en el 10 % más riesgoso en más del 90 % de las 1 000 simulaciones con pesos distintos.",
    c3_t: "Los ríos: un escenario, no una certeza",
    c3_p: "GloFAS pronostica caudales del Paraná comparables a El Niño 2015-16. El INA hoy informa aguas medias y no emite pronóstico estacional: por eso se muestra como escenario, y el modelo se corrige cada día con las alturas medidas.",
    c4_t: "Donde más gente hay en riesgo",
    c4_p: "En el conurbano el riesgo relativo es medio, pero la cantidad de personas en terreno bajo y sin cloaca lo vuelve prioritario: La Matanza, Lomas de Zamora, Lanús, Quilmes.",
    c5_t: "CABA: lluvia y sumideros",
    c5_p: "Con 13 años de reclamos al 147, el modelo anticipa el doble de reclamos por sumideros y calles anegadas que un promedio histórico en días de tormenta. Para diciembre y enero espera entre 3 % y 5 % más.",
    evolucion_t: "Personas en riesgo, mes a mes",
    tabla_t: "Los 20 municipios prioritarios del mes pico",
    tab_relativo: "Por riesgo relativo", tab_personas: "Por cantidad de personas",
    col_mun: "Municipio", col_prov: "Provincia", col_riesgo: "Riesgo", col_personas: "Personas en riesgo", col_robustez: "Robustez",
    robustez_nota: "Robustez: % de 1 000 simulaciones con pesos aleatorios en las que el municipio queda en el 10 % de mayor riesgo.",
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
    leyenda_altura: "Each municipality's height also shows its risk.",
    leyenda_estacion: "River gauge: size is the chance of exceeding the evacuation level.",
    leyenda_blanco: "Blank: rural areas with no local government (1 % of the population).",
    c1_t: "One of the strongest El Niños",
    c1_p: "NOAA gives a >90 % chance of a very strong El Niño. For Argentina that means more rain in the Litoral and the Pampas, and rivers that rise weeks later. Each municipality rises with its risk.",
    c2_t: "The Litoral carries the highest risk",
    c2_p: "Corrientes, Chaco and Santa Fe combine low ground, a history of floods and large rivers. Their municipalities stay in the riskiest 10 % in over 90 % of 1,000 simulations with different weights.",
    c3_t: "Rivers: a scenario, not a certainty",
    c3_p: "GloFAS forecasts Paraná flows comparable to El Niño 2015-16. Argentina's water institute (INA) currently reports medium water levels and issues no seasonal outlook, so this is shown as a scenario, and the model is corrected daily with measured levels.",
    c4_t: "Where the most people are at risk",
    c4_p: "Around Buenos Aires the relative risk is moderate, but the number of people on low ground without sewers makes it a priority: La Matanza, Lomas de Zamora, Lanús, Quilmes.",
    c5_t: "Buenos Aires City: rain and storm drains",
    c5_p: "Trained on 13 years of 147 citizen reports, the model anticipates twice as many clogged-drain and flooded-street reports as a historical average on stormy days. It expects 3-5 % more in December and January.",
    evolucion_t: "People at risk, month by month",
    tabla_t: "The 20 priority municipalities in the peak month",
    tab_relativo: "By relative risk", tab_personas: "By number of people",
    col_mun: "Municipality", col_prov: "Province", col_riesgo: "Risk", col_personas: "People at risk", col_robustez: "Robustness",
    robustez_nota: "Robustness: % of 1,000 random-weight simulations in which the municipality ranks in the riskiest 10 %.",
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
const CORTES = [3, 4, 5, 6, 7, 8]; // 7 clases de riesgo: <3, 3-4, …, ≥8

// Altura: solo se levanta el riesgo por encima de 3, y la escala se achica al acercarse
// (si no, en el conurbano las columnas taparían todo)
function alturaRiesgo(campo) {
  const exceso = ["^", ["max", ["-", ["coalesce", ["get", campo], 0], 3], 0], 2];
  return ["interpolate", ["linear"], ["zoom"], 4, ["*", exceso, 2400], 7, ["*", exceso, 500],
          10, ["*", exceso, 60], 13, ["*", exceso, 8]];
}
const radioEstacion = (campo) => ["interpolate", ["linear"], ["coalesce", ["get", campo], 0], 0, 3, 1, 10];

const estado = { idioma: "es", mes: null, datos: {}, ranking: "top_relativo", seleccion: null, reproduciendo: null,
  radios: [], provinciasCargadas: new Set() };
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

function estiloBase() {
  return `https://tiles.openfreemap.org/styles/${temaOscuro() ? "dark" : "positron"}`;
}

function colorRiesgo(campo) {
  const c = [1, 2, 3, 4, 5, 6, 7].map((i) => css(`--r${i}`));
  const expr = ["step", ["coalesce", ["get", campo], 0], c[0]];
  CORTES.forEach((corte, i) => expr.push(corte, c[i + 1]));
  return expr;
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
  mapa.addSource("relieve", {
    type: "raster-dem", encoding: "terrarium", tileSize: 256, maxzoom: 14,
    tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
    attribution: "Relieve: AWS Terrain Tiles",
  });
  mapa.setTerrain({ source: "relieve", exaggeration: 1.6 });
  mapa.addLayer({ id: "sombreado", type: "hillshade", source: "relieve",
    paint: { "hillshade-exaggeration": 0.35, "hillshade-shadow-color": temaOscuro() ? "#000" : "#6b6a66" } });

  mapa.addSource("municipios", { type: "geojson", data: estado.datos.municipios, promoteId: "cmu" });
  mapa.addLayer({ id: "municipios-3d", type: "fill-extrusion", source: "municipios",
    paint: {
      "fill-extrusion-color": colorRiesgo(`r_${m}`),
      "fill-extrusion-height": alturaRiesgo(`r_${m}`),
      "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 9.6, 0.88, 10.2, 0],
    } });
  mapa.addLayer({ id: "municipios-borde", type: "line", source: "municipios", minzoom: 6,
    paint: { "line-color": css("--superficie"), "line-width": 0.6, "line-opacity": 0.7 } });
  mapa.addLayer({ id: "municipios-seleccion", type: "line", source: "municipios",
    filter: ["==", ["get", "cmu"], ""],
    paint: { "line-color": css("--tinta-1"), "line-width": 2.5 } });

  // Nivel barrio: radios censales, cargados por provincia al acercarse (zoom ≥ 9)
  mapa.addSource("radios", { type: "geojson", data: { type: "FeatureCollection", features: estado.radios } });
  mapa.addLayer({ id: "radios-3d", type: "fill-extrusion", source: "radios", minzoom: 9,
    paint: {
      "fill-extrusion-color": colorRiesgo(`r_${m}`),
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
  mapa.on("click", "municipios-3d", (e) => seleccionar(e.features[0].properties));
  mapa.on("mousemove", "estaciones", (e) => mostrarTooltipEstacion(e));
  mapa.on("mouseleave", "estaciones", () => ocultarTooltip());
  mapa.on("mousemove", "caba-barrios", (e) => mostrarTooltipCaba(e));
  mapa.on("mouseleave", "caba-barrios", () => ocultarTooltip());
}

function actualizarMes() {
  const m = estado.mes;
  if (!mapa || !mapa.getLayer("municipios-3d")) return;
  mapa.setPaintProperty("municipios-3d", "fill-extrusion-color", colorRiesgo(`r_${m}`));
  mapa.setPaintProperty("municipios-3d", "fill-extrusion-height", alturaRiesgo(`r_${m}`));
  mapa.setPaintProperty("radios-3d", "fill-extrusion-color", colorRiesgo(`r_${m}`));
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
function unirRiesgo(geo, riesgo) {
  geo.features.forEach((f) => {
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
function pintarKpis() {
  const r = estado.datos.resumen.por_mes[estado.mes];
  document.getElementById("kpi-personas").textContent = formatoPersonas(r.personas_en_riesgo);
  document.getElementById("kpi-municipios").textContent = Math.round(r.municipios_riesgo_alto);
  document.getElementById("kpi-estaciones").textContent =
    `${r.estaciones_prob_evacuacion_50} / ${estado.datos.resumen.estaciones_confiables}`;
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
  esc.innerHTML = [1, 2, 3, 4, 5, 6, 7].map((i) => `<span style="background:var(--r${i})"></span>`).join("");
  let rot = esc.nextElementSibling;
  if (!rot || !rot.classList.contains("leyenda-rotulos")) {
    rot = document.createElement("div");
    rot.className = "leyenda-rotulos";
    esc.after(rot);
  }
  rot.innerHTML = "<span>0</span><span>5</span><span>10</span>";
}

function pintarTabla() {
  const filas = estado.datos.resumen[estado.ranking];
  const loc = estado.idioma === "es" ? "es-AR" : "en-US";
  document.getElementById("tabla-cuerpo").innerHTML = filas.map((f) => `
    <tr><td>${f.nam}</td><td>${f.jur}</td><td class="num">${f.riesgo.toFixed(1)}</td>
    <td class="num">${Math.round(f.personas_en_riesgo).toLocaleString(loc)}</td>
    <td class="num">${Math.round(f.pct_simulaciones_top10)} %</td></tr>`).join("");
}

// ---------- Gráfico: personas en riesgo por mes (una serie, un eje) ----------
function pintarGrafico() {
  const cont = document.getElementById("grafico-meses");
  const meses = estado.datos.resumen.meses;
  const vals = meses.map((m) => estado.datos.resumen.por_mes[m].personas_en_riesgo);
  const W = cont.clientWidth, H = cont.clientHeight, izq = 64, der = 16, arr = 12, aba = 28;
  const max = Math.ceil(Math.max(...vals) / 1e6) * 1e6, min = Math.floor(Math.min(...vals) / 1e6) * 1e6 - 1e6;
  const x = (i) => izq + (i * (W - izq - der)) / (meses.length - 1);
  const y = (v) => arr + ((max - v) * (H - arr - aba)) / (max - min);
  const ticks = [];
  for (let v = min; v <= max; v += 1e6) ticks.push(v);
  const linea = vals.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("");
  const sel = meses.indexOf(estado.mes);
  cont.innerHTML = `<svg width="${W}" height="${H}">
    ${ticks.map((v) => `<line x1="${izq}" x2="${W - der}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grilla)"/>
      <text x="${izq - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--tinta-3)" style="font-variant-numeric:tabular-nums">${formatoPersonas(v)}</text>`).join("")}
    <line x1="${izq}" x2="${W - der}" y1="${y(min)}" y2="${y(min)}" stroke="var(--eje)"/>
    <path d="${linea}" fill="none" stroke="var(--acento)" stroke-width="2"/>
    ${meses.map((m, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--tinta-3)">${nombreMes(m)}</text>`).join("")}
    <circle cx="${x(sel)}" cy="${y(vals[sel])}" r="5" fill="var(--acento)" stroke="var(--superficie)" stroke-width="2"/>
    <text x="${x(sel)}" y="${y(vals[sel]) - 12}" text-anchor="middle" font-size="12" fill="var(--tinta-1)">${formatoPersonas(vals[sel])}</text>
    <line id="cruz" y1="${arr}" y2="${y(min)}" stroke="var(--eje)" visibility="hidden"/>
    <rect x="${izq}" y="${arr}" width="${W - izq - der}" height="${H - arr - aba}" fill="transparent" id="zona"/>
  </svg><div class="tooltip" hidden></div>`;
  const zona = cont.querySelector("#zona"), cruz = cont.querySelector("#cruz"), tip = cont.querySelector(".tooltip");
  zona.addEventListener("mousemove", (ev) => {
    const r = zona.getBoundingClientRect();
    const i = Math.max(0, Math.min(meses.length - 1, Math.round(((ev.clientX - r.left) / r.width) * (meses.length - 1))));
    cruz.setAttribute("x1", x(i)); cruz.setAttribute("x2", x(i)); cruz.setAttribute("visibility", "visible");
    tip.hidden = false;
    tip.innerHTML = `<strong>${nombreMes(meses[i])}</strong><br>${formatoPersonas(vals[i])} ${t("personas")}`;
    tip.style.left = `${Math.min(x(i) + 10, W - 140)}px`; tip.style.top = `${y(vals[i]) - 10}px`;
  });
  zona.addEventListener("mouseleave", () => { cruz.setAttribute("visibility", "hidden"); tip.hidden = true; });
  zona.addEventListener("click", (ev) => {
    const r = zona.getBoundingClientRect();
    elegirMes(meses[Math.round(((ev.clientX - r.left) / r.width) * (meses.length - 1))]);
  });
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
  const [resumen, municipios, riesgo, estaciones, caba, cajas] = await Promise.all(
    ["resumen.json", "municipios_geo.geojson", "riesgo.json", "estaciones.geojson", "caba_barrios.geojson",
     "radios/indice.json"].map((f) => fetch(`datos/${f}`, { cache: "no-cache" }).then((r) => r.json())));
  unirRiesgo(municipios, riesgo);
  estado.riesgo = riesgo;
  estado.datos = { resumen, municipios, estaciones, caba, cajas };
  estado.mes = resumen.mes_pico;

  mapa = new maplibregl.Map({
    container: "mapa", style: estiloBase(), ...vistaInicial, maxPitch: 75,
    attributionControl: { compact: true },
  });
  mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  mapa.on("style.load", () => { if (!mapa.getSource("relieve")) agregarCapas(); });

  document.getElementById("btn-idioma").onclick = () => { estado.idioma = estado.idioma === "es" ? "en" : "es"; aplicarIdioma(); };
  document.getElementById("btn-tema").onclick = cambiarTema;
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

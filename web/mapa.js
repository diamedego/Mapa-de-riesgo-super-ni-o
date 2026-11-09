// Mapa (MapLibre): mapa base, capas de riesgo y del tiempo, alertas del SMN, ríos, selección resaltada en cian
// (bordes de la zona o círculo alrededor de un punto) y la interacción: clic = elegir un punto, pasar = valores.

let mapa;
// SIN_TESELAS: versión para entornos que bloquean servidores externos (vista privada en claude.ai):
// sin mapa base ni relieve externos; calles, agua y nombres salen de archivos propios.
const SIN_TESELAS = window.SIN_TESELAS === true;
const fuenteMapa = (negrita = false) => (SIN_TESELAS ? ["noto"] : [negrita ? "Noto Sans Bold" : "Noto Sans Regular"]);
const CAPAS_RIESGO = ["sin-datos", "riesgo-mun", "riesgo-radio", "bordes-riesgo", "estaciones"];
const CAPAS_TIEMPO = ["atenuar", "tiempo-raster", "ciudades-punto", "ciudades-texto"];

function estiloBase() {
  if (SIN_TESELAS) {
    const base = document.baseURI.replace(/[^/]*([?#].*)?$/, "");
    return { version: 8, sources: {}, glyphs: `${base}datos/base/fuentes/{fontstack}/{range}.woff`,
      layers: [{ id: "fondo", type: "background", paint: { "background-color": css("--mapa-fondo") } }] };
  }
  return `https://tiles.openfreemap.org/styles/${temaOscuro() ? "dark" : "liberty"}`;
}

function nombresEnEspanol() {
  // Etiquetas del mapa base con el nombre en español (p. ej. "Islas Malvinas", no "Falkland Islands")
  mapa.getStyle().layers.forEach((capa) => {
    if (capa.type === "symbol" && mapa.getLayoutProperty(capa.id, "text-field")) {
      mapa.setLayoutProperty(capa.id, "text-field", ["coalesce", ["get", "name:es"], ["get", "name"]]);
    }
  });
}
const primeraCapa = (tipos) => mapa.getStyle().layers.find((l) => tipos.includes(l.type))?.id;

// ---------- Expresiones de riesgo para un conjunto de meses (el peor mes del período) ----------
function exprRiesgo(meses) {
  const v = meses.map((m) => ["coalesce", ["get", `r_${m}`], -1]);
  return v.length === 1 ? v[0] : ["max", ...v];
}
function colorRiesgoExpr(meses) {
  const c = [1, 2, 3, 4, 5].map((i) => css(`--r${i}`)), v = exprRiesgo(meses);
  return ["case", ["<", v, 0], css("--sin-datos"), ["step", v, c[0], CORTES[0], c[1], CORTES[1], c[2], CORTES[2], c[3], CORTES[3], c[4]]];
}
// Opacidad del relleno según el zoom; con una zona elegida, lo de afuera queda más tenue (el zoom va arriba de todo)
const OPAC_RELLENO = [[4, 0.86], [10, 0.78], [13, 0.55], [16, 0.42]];
function opacidadRiesgo(paradas) {
  const cmus = estado.sel?.tipo === "zona" ? estado.sel.lugar.cmus : null;
  const f = estado.relieve ? 0.5 : 1;   // con el relieve prendido, el riesgo se vuelve más transparente para ver el terreno
  const valor = (v) => (cmus ? ["case", ["in", ["get", "cmu"], ["literal", cmus]], v * f, v * f * 0.38] : v * f);
  return ["interpolate", ["linear"], ["zoom"], ...paradas.flatMap(([z, v]) => [z, valor(v)])];
}

// ---------- Capas ----------
function agregarCapas() {
  nombresEnEspanol();
  if (!SIN_TESELAS) agregarRelieve();
  const antesLineas = SIN_TESELAS ? undefined : primeraCapa(["line", "symbol"]);
  const antesNombres = SIN_TESELAS ? undefined : primeraCapa(["symbol"]);
  const meses = mesesVista();
  const D = estado.datos;

  mapa.addSource("provincias", { type: "geojson", data: D.provincias });
  mapa.addLayer({ id: "sin-datos", type: "fill", source: "provincias",
    paint: { "fill-color": css("--sin-datos"), "fill-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.9, 13, 0.35] } }, antesLineas);
  mapa.addSource("municipios", { type: "geojson", data: D.municipios, promoteId: "cmu" });
  mapa.addLayer({ id: "riesgo-mun", type: "fill", source: "municipios", maxzoom: 10.2,
    paint: { "fill-color": colorRiesgoExpr(meses), "fill-opacity": opacidadRiesgo(OPAC_RELLENO) } }, antesLineas);
  mapa.addSource("radios", { type: "geojson", data: { type: "FeatureCollection", features: estado.radios } });
  mapa.addLayer({ id: "riesgo-radio", type: "fill", source: "radios", minzoom: 9.6,
    paint: { "fill-color": colorRiesgoExpr(meses), "fill-opacity": opacidadRiesgo(OPAC_RELLENO) } }, antesLineas);
  for (const [id, fuente, zoom] of [["riesgo-mun-3d", "municipios", { maxzoom: 10.2 }], ["riesgo-radio-3d", "radios", { minzoom: 9.6 }]]) {
    mapa.addLayer({ id, type: "fill-extrusion", source: fuente, ...zoom, layout: { visibility: "none" },
      paint: { "fill-extrusion-color": colorRiesgoExpr(meses), "fill-extrusion-height": alturaRiesgo(meses), "fill-extrusion-opacity": 0.9 } });
  }

  // Tiempo: velo sobre el mapa base (para que resalten los colores) y el lienzo del campo
  mapa.addLayer({ id: "atenuar", type: "background", layout: { visibility: "none" },
    paint: { "background-color": css("--velo"), "background-opacity": 0.42 } }, antesNombres);
  if (estado.tiempo) {
    const L = lienzoTiempo(), T = estado.tiempo;
    mapa.addSource("tiempo-img", { type: "canvas", canvas: L.cv, animate: true,
      coordinates: [[T.lon0, T.lat0], [T.lon1, T.lat0], [T.lon1, T.latS], [T.lon0, T.latS]] });
    mapa.getSource("tiempo-img").pause();
    mapa.addLayer({ id: "tiempo-raster", type: "raster", source: "tiempo-img", layout: { visibility: "none" },
      paint: { "raster-opacity": 0.92, "raster-resampling": "linear", "raster-fade-duration": 0 } }, antesNombres);
  }

  if (SIN_TESELAS) agregarMapaBasePropio();

  mapa.addSource("bordes", { type: "geojson", data: D.bordes });
  mapa.addLayer({ id: "bordes-riesgo", type: "line", source: "bordes", maxzoom: 10.2, filter: filtroBordes(meses),
    paint: { "line-color": css("--borde-riesgo"), "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.35, 8, 0.8, 10, 1.1], "line-opacity": 0.85 } });
  mapa.addLayer({ id: "provincias-borde", type: "line", source: "provincias",
    paint: { "line-color": css("--borde-prov"), "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.7, 10, 1.4] } });

  // Alertas vigentes del SMN (condiciones actuales)
  mapa.addSource("alertas", { type: "geojson", data: D.alertas });
  const colorAlerta = ["match", ["get", "nivel"], "roja", css("--alerta-roja"), "naranja", css("--alerta-naranja"), css("--alerta-amarilla")];
  mapa.addLayer({ id: "alertas-relleno", type: "fill", source: "alertas", layout: { visibility: "none" },
    paint: { "fill-color": colorAlerta, "fill-opacity": 0.14 } });
  mapa.addLayer({ id: "alertas-borde", type: "line", source: "alertas", layout: { visibility: "none", "line-join": "round" },
    paint: { "line-color": colorAlerta, "line-width": 1.6, "line-dasharray": [2, 1.5] } });

  agregarReferencias();

  // Selección: zona (bordes exteriores en cian) o círculo alrededor de un punto
  mapa.addLayer({ id: "sel-zona-halo", type: "line", source: "bordes", filter: ["==", "a", "-"],
    layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": css("--halo"), "line-width": 6.5, "line-opacity": 0.55, "line-blur": 1 } });
  mapa.addLayer({ id: "sel-zona", type: "line", source: "bordes", filter: ["==", "a", "-"],
    layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": css("--cian-vivo"), "line-width": 2.8 } });
  mapa.addLayer({ id: "sel-prov-halo", type: "line", source: "provincias", filter: ["==", "nam", "-"],
    layout: { "line-join": "round" }, paint: { "line-color": css("--halo"), "line-width": 6.5, "line-opacity": 0.55, "line-blur": 1 } });
  mapa.addLayer({ id: "sel-prov", type: "line", source: "provincias", filter: ["==", "nam", "-"],
    layout: { "line-join": "round" }, paint: { "line-color": css("--cian-vivo"), "line-width": 2.8 } });
  mapa.addSource("circulo", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  mapa.addLayer({ id: "circulo-relleno", type: "fill", source: "circulo", filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "fill-color": css("--cian-vivo"), "fill-opacity": 0.1 } });
  mapa.addLayer({ id: "circulo-halo", type: "line", source: "circulo", filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "line-color": css("--halo"), "line-width": 6, "line-opacity": 0.5, "line-blur": 1 } });
  mapa.addLayer({ id: "circulo-borde", type: "line", source: "circulo", filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "line-color": css("--cian-vivo"), "line-width": 2.6 } });

  // Ríos (INA): estado medido hoy o probabilidad de evacuación del escenario
  mapa.addSource("estaciones", { type: "geojson", data: D.estaciones });
  mapa.addLayer({ id: "estaciones", type: "circle", source: "estaciones", ...estiloEstaciones() });

  // Valores del tiempo en ciudades
  mapa.addSource("ciudades", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  mapa.addLayer({ id: "ciudades-punto", type: "circle", source: "ciudades", layout: { visibility: "none" },
    paint: { "circle-radius": 4.5, "circle-color": ["get", "color"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5 } });
  mapa.addLayer({ id: "ciudades-texto", type: "symbol", source: "ciudades", layout: { visibility: "none",
    "text-field": ["format", ["get", "texto"], { "font-scale": 1.08 }, "\n", {}, ["get", "nombre"], { "font-scale": 0.78 }],
    "text-font": fuenteMapa(true), "text-size": 12.5, "text-anchor": "bottom", "text-offset": [0, -0.55], "text-line-height": 1.1,
    "text-padding": 4, "symbol-sort-key": ["-", 0, ["to-number", ["get", "orden"], 0]] },
    paint: { "text-color": css("--mapa-texto"), "text-halo-color": css("--mapa-halo-texto"), "text-halo-width": 1.6 } });

  if (SIN_TESELAS) agregarNombresPropios();

  // Punto elegido (arriba de todo)
  mapa.addLayer({ id: "punto-halo", type: "circle", source: "circulo", filter: ["==", ["geometry-type"], "Point"],
    paint: { "circle-radius": 13, "circle-color": css("--cian-vivo"), "circle-opacity": 0.25 } });
  mapa.addLayer({ id: "punto", type: "circle", source: "circulo", filter: ["==", ["geometry-type"], "Point"],
    paint: { "circle-radius": 6.5, "circle-color": css("--cian-vivo"), "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 } });

  if (!estado.mapaEnlazado) enlazarEventosMapa();
  aplicarSeleccionEnMapa();
  aplicarCapaEnMapa();
  cargarRadiosVisibles();
}

// Relieve del mapa principal (botón "Relieve", apagado por defecto): sombreado, colores por altura ajustados a la zona
// visible y curvas de nivel de cerca. Con el botón 3D, además, el terreno se levanta.
const DEM_TERRARIUM = { type: "raster-dem", encoding: "terrarium", tileSize: 256, maxzoom: 14,
  tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"] };
const COLORES_RELIEVE = ["rgb(38,120,120)", "rgb(92,160,110)", "rgb(180,196,120)", "rgb(205,170,110)", "rgb(170,120,80)"];
let demCurvas = null;
function agregarRelieve() {
  mapa.addSource("relieve", { ...DEM_TERRARIUM, attribution: "Relieve: AWS Terrain Tiles" });
  mapa.addSource("relieve-sombra", DEM_TERRARIUM);   // una fuente por uso: MapLibre dibuja mejor el sombreado y los colores así
  mapa.addSource("relieve-color", DEM_TERRARIUM);
  const antes = primeraCapa(["line", "symbol"]), visible = estado.relieve ? "visible" : "none";
  mapa.addLayer({ id: "relieve-colores", type: "color-relief", source: "relieve-color", layout: { visibility: visible },
    paint: { "color-relief-color": coloresRelieve(0, 200), "color-relief-opacity": 0.55 } }, antes);
  mapa.addLayer({ id: "sombreado", type: "hillshade", source: "relieve-sombra", layout: { visibility: estado.relieve || estado.relieve3d ? "visible" : "none" },
    paint: { "hillshade-exaggeration": 0.35, "hillshade-shadow-color": temaOscuro() ? "#000" : "#4a5562" } }, antes);
  if (window.mlcontour) {
    if (!demCurvas) {
      demCurvas = new mlcontour.DemSource({ url: DEM_TERRARIUM.tiles[0], encoding: "terrarium", maxzoom: 13, worker: true, cacheSize: 100, timeoutMs: 10000 });
      demCurvas.setupMaplibre(maplibregl);
    }
    mapa.addSource("curvas", { type: "vector", maxzoom: 15, tiles: [demCurvas.contourProtocolUrl({ multiplier: 1, contourLayer: "contours", elevationKey: "ele", levelKey: "level",
      thresholds: { 11: [20, 100], 12: [10, 50], 13: [5, 25], 14: [2, 10] } })] });
    mapa.addLayer({ id: "curvas", type: "line", source: "curvas", "source-layer": "contours", minzoom: 11, layout: { visibility: visible },
      paint: { "line-color": temaOscuro() ? "rgba(230,215,190,0.5)" : "rgba(90,70,50,0.55)", "line-width": ["match", ["get", "level"], 1, 1.1, 0.5] } }, antes);
    mapa.addLayer({ id: "curvas-texto", type: "symbol", source: "curvas", "source-layer": "contours", minzoom: 12, filter: [">", ["get", "level"], 0],
      layout: { visibility: visible, "symbol-placement": "line", "text-field": ["concat", ["number-format", ["get", "ele"], {}], " m"], "text-font": fuenteMapa(), "text-size": 10 },
      paint: { "text-color": temaOscuro() ? "#e8dcc6" : "#5a4632", "text-halo-color": temaOscuro() ? "#000" : "#fff", "text-halo-width": 1.2 } });
  }
  terrenoMapa();
  claveRelieve = "";
  if (!agregarRelieve.escuchando) { mapa.on("idle", ajustarColoresRelieve); agregarRelieve.escuchando = true; }
}
// Terreno: exageración 1,5 con el botón 3D; escala real con solo el relieve (hace falta para medir alturas)
function terrenoMapa() {
  if (SIN_TESELAS || !mapa.getSource("relieve")) return;
  mapa.setTerrain(estado.relieve3d ? { source: "relieve", exaggeration: 1.5 } : estado.relieve ? { source: "relieve", exaggeration: 1 } : null);
}
function coloresRelieve(a, b) {
  if (!(b > a + 1)) b = a + 2;
  return ["interpolate", ["linear"], ["elevation"], ...COLORES_RELIEVE.flatMap((c, i) => [a + ((b - a) * i) / (COLORES_RELIEVE.length - 1), c])];
}
// Colores por altura con la escala de la zona visible (percentiles 2 y 98 de una grilla de 16 × 16 puntos)
let claveRelieve = "";
function ajustarColoresRelieve() {
  if (!estado.relieve || !mapa.getLayer("relieve-colores") || !mapa.getTerrain()) return;
  const c = mapa.getCanvas(), clave = `${mapa.getCenter().lng.toFixed(4)},${mapa.getCenter().lat.toFixed(4)},${mapa.getZoom().toFixed(2)},${c.clientWidth}`;
  if (clave === claveRelieve) return;
  const ex = mapa.getTerrain().exaggeration || 1, alturas = [];
  for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
    const h = mapa.queryTerrainElevation(mapa.unproject([((i + 0.5) / 16) * c.clientWidth, ((j + 0.5) / 16) * c.clientHeight]));
    if (h != null && Number.isFinite(h)) alturas.push(Math.max(0, h / ex));
  }
  if (alturas.length < 40) return;   // las teselas todavía no llegaron: se vuelve a intentar en el próximo "idle"
  claveRelieve = clave;
  alturas.sort((x, y) => x - y);
  const a = Math.floor(alturas[Math.floor((alturas.length - 1) * 0.02)]), b = Math.ceil(alturas[Math.floor((alturas.length - 1) * 0.98)]);
  mapa.setPaintProperty("relieve-colores", "color-relief-color", coloresRelieve(a, b));
  const ley = document.getElementById("ley-relieve");
  ley.innerHTML = `<span>${t("relieve_ley")(fmt(a), fmt(b))}</span><span class="sim-degradado"></span>`;
}
function alternarRelieve() {
  estado.relieve = !estado.relieve;
  claveRelieve = "";
  document.getElementById("btn-relieve").setAttribute("aria-pressed", String(estado.relieve));
  document.getElementById("ley-relieve").hidden = !estado.relieve;
  if (!estado.relieve) document.getElementById("ley-relieve").innerHTML = "";
  if (!mapa.getSource("relieve")) return;
  const vis = estado.relieve ? "visible" : "none";
  for (const id of ["relieve-colores", "curvas", "curvas-texto"]) if (mapa.getLayer(id)) mapa.setLayoutProperty(id, "visibility", vis);
  mapa.setLayoutProperty("sombreado", "visibility", estado.relieve || estado.relieve3d ? "visible" : "none");
  terrenoMapa();
  for (const id of ["riesgo-mun", "riesgo-radio"]) mapa.setPaintProperty(id, "fill-opacity", opacidadRiesgo(OPAC_RELLENO));
  mapa.triggerRepaint();
}

// ---------- Referencias para ubicarse ----------
// Nombres de los municipios (de lejos), plantas y parques industriales (OpenStreetMap, preparar_referencias.py) y, del mapa
// base, hospitales, universidades, clubes, estaciones, municipalidades, escuelas y empresas desde antes de que el mapa base
// los muestre (z 15); desde ahí siguen los íconos propios del mapa base.
const GRUPOS_REF = {
  salud: "#c0392b", educacion: "#2f6ea8", deporte: "#2e8b57", gobierno: "#7a5c99", transporte: "#56707c", empresa: "#9a6b2f", industria: "#6d5a46",
};
const nombreRef = ["coalesce", ["get", "name:es"], ["get", "name"]];
const textoRef = (tam) => ({ "text-field": nombreRef, "text-font": fuenteMapa(), "text-size": tam, "text-anchor": "top", "text-offset": [0, 0.45],
  "text-max-width": 9, "text-padding": 3, "text-optional": true });
const pintaRef = (color) => ({ "text-color": color, "text-halo-color": css("--mapa-halo-texto"), "text-halo-width": 1.4 });
function agregarReferencias() {
  const vis = estado.verReferencias === false ? "none" : "visible";
  const antes = primeraCapa(["symbol"]);
  // Municipios: nombre en mayúsculas, de lejos (después los nombres de las localidades del mapa base toman el relevo)
  mapa.addSource("ref-municipios", { type: "geojson", data: "datos/municipios_etiquetas.geojson" });
  mapa.addLayer({ id: "ref-municipios", type: "symbol", source: "ref-municipios", minzoom: 6.6, maxzoom: 10.5,
    layout: { visibility: vis, "text-field": ["get", "n"], "text-font": fuenteMapa(true), "text-transform": "uppercase", "text-letter-spacing": 0.06,
      "text-size": ["interpolate", ["linear"], ["zoom"], 7, 9, 10, 11.5], "text-max-width": 8, "text-padding": 6 },
    paint: { "text-color": css("--tinta-2"), "text-opacity": 0.85, "text-halo-color": css("--mapa-halo-texto"), "text-halo-width": 1.5 } });
  // Plantas y parques industriales: los grandes y los parques desde z 9,5; el resto desde z 12
  mapa.addSource("ref-industrias", { type: "geojson", data: "datos/industrias.geojson" });
  const grande = ["any", ["==", ["get", "t"], "parque"], [">=", ["get", "ha"], 30]];
  for (const [id, filtro, minzoom] of [["ref-ind-grandes", grande, 9.5], ["ref-ind-resto", ["!", grande], 12]]) {
    mapa.addLayer({ id: `${id}-punto`, type: "circle", source: "ref-industrias", minzoom, filter: filtro, layout: { visibility: vis },
      paint: { "circle-radius": 3.6, "circle-color": GRUPOS_REF.industria, "circle-stroke-color": css("--mapa-halo-texto"), "circle-stroke-width": 1.2 } });
    mapa.addLayer({ id, type: "symbol", source: "ref-industrias", minzoom, filter: filtro,
      layout: { visibility: vis, ...textoRef(11), "text-field": ["get", "n"], "symbol-sort-key": ["-", 0, ["get", "ha"]] }, paint: pintaRef(GRUPOS_REF.industria) });
  }
  // Lugares del mapa base (OpenMapTiles: capa "poi"); en la versión sin teselas externas no están
  const fuentes = Object.entries(mapa.getStyle().sources);
  const base = (fuentes.find(([k, f]) => k === "openmaptiles" && f.type === "vector") ?? fuentes.find(([k, f]) => f.type === "vector" && !["curvas", "ref-industrias"].includes(k)))?.[0];
  if (SIN_TESELAS || !base) return;
  const c = (v) => ["==", ["get", "class"], v], sc = (v) => ["==", ["get", "subclass"], v];
  const grupo = ["case", c("hospital"), GRUPOS_REF.salud, ["any", c("college"), c("school")], GRUPOS_REF.educacion,
    ["any", c("stadium"), c("sports_centre"), c("pitch"), c("swimming_pool")], GRUPOS_REF.deporte,
    ["any", c("town_hall"), c("police"), c("fire_station")], GRUPOS_REF.gobierno, ["any", c("railway"), c("bus")], GRUPOS_REF.transporte, GRUPOS_REF.empresa];
  const conNombre = ["has", "name"];
  const principales = ["all", conNombre, ["any", ["all", c("hospital"), sc("hospital")], ["all", c("college"), sc("university")], c("stadium"), c("town_hall"),
    ["all", c("railway"), sc("station")], ["all", c("bus"), sc("bus_station")], ["all", c("shop"), sc("mall")]]];
  const secundarios = ["all", conNombre, ["!", principales], ["any", c("sports_centre"), c("pitch"), c("school"), c("college"), c("police"),
    c("fire_station"), c("office"), c("hospital")]];
  for (const [id, filtro, minzoom, tam] of [["ref-poi-principales", principales, 12, 11.5], ["ref-poi-secundarios", secundarios, 13.5, 10.5]]) {
    mapa.addLayer({ id: `${id}-punto`, type: "circle", source: base, "source-layer": "poi", minzoom, maxzoom: 15, filter: filtro, layout: { visibility: vis },
      paint: { "circle-radius": 3.4, "circle-color": grupo, "circle-stroke-color": css("--mapa-halo-texto"), "circle-stroke-width": 1.1 } }, antes);
    mapa.addLayer({ id, type: "symbol", source: base, "source-layer": "poi", minzoom, maxzoom: 15, filter: filtro,
      layout: { visibility: vis, ...textoRef(tam), "symbol-sort-key": ["get", "rank"] }, paint: { ...pintaRef(css("--mapa-texto")), "text-color": grupo } }, antes);
  }
}
const CAPAS_REFERENCIAS = ["ref-municipios", "ref-ind-grandes", "ref-ind-grandes-punto", "ref-ind-resto", "ref-ind-resto-punto",
  "ref-poi-principales", "ref-poi-principales-punto", "ref-poi-secundarios", "ref-poi-secundarios-punto"];

function alturaRiesgo(meses) {
  const exceso = ["^", ["max", ["-", exprRiesgo(meses), 3], 0], 2];
  return ["interpolate", ["linear"], ["zoom"], 4, ["*", exceso, 2400], 7, ["*", exceso, 500], 10, ["*", exceso, 60], 13, ["*", exceso, 8]];
}
function filtroBordes(meses) {
  const nivel = (lado) => (meses.length === 1 ? ["get", `${lado}_${meses[0]}`] : ["max", ...meses.map((m) => ["get", `${lado}_${m}`])]);
  return ["!=", nivel("na"), nivel("nb")];
}
function estiloEstaciones() {
  if (estado.modo === "actual") {
    return { paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, ["match", ["get", "estado"], "normal", 2.2, 4], 8, 6.5, 12, 9],
      "circle-color": ["match", ["get", "estado"], "evacuacion", css("--critico"), "alerta", css("--serio"), "normal", css("--rio-normal"), "#9aa6b2"],
      "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5 } };
  }
  const pe = ["max", ...mesesVista().map((m) => ["coalesce", ["get", `pe_${m}`], 0])];
  return { filter: ["==", ["get", "conf"], true], paint: {
    "circle-radius": ["interpolate", ["linear"], pe, 0, 3, 1, 11],
    "circle-color": ["interpolate", ["linear"], pe, 0, css("--rio-normal"), 0.5, css("--serio"), 0.8, css("--critico")],
    "circle-opacity": 0.85, "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.2 } };
}

// Actualiza colores y visibilidad según capa, modo y período
function aplicarCapaEnMapa() {
  if (!mapa?.getLayer("riesgo-mun")) return;
  const riesgo = estado.capa === "riesgo", meses = mesesVista();
  const vis = (id, v) => mapa.getLayer(id) && mapa.setLayoutProperty(id, "visibility", v ? "visible" : "none");
  for (const id of ["riesgo-mun", "riesgo-radio"]) {
    mapa.setPaintProperty(id, "fill-color-transition", { duration: movimientoReducido() ? 0 : 700, delay: 0 });
    mapa.setPaintProperty(id, "fill-color", colorRiesgoExpr(meses));
    mapa.setPaintProperty(id, "fill-opacity", opacidadRiesgo(OPAC_RELLENO));
  }
  for (const id of ["riesgo-mun-3d", "riesgo-radio-3d"]) {
    mapa.setPaintProperty(id, "fill-extrusion-color", colorRiesgoExpr(meses));
    mapa.setPaintProperty(id, "fill-extrusion-height", alturaRiesgo(meses));
    vis(id, riesgo && estado.riesgo3d);
  }
  mapa.setFilter("bordes-riesgo", filtroBordes(meses));
  CAPAS_RIESGO.forEach((id) => vis(id, riesgo));
  vis("estaciones", riesgo && estado.verRios);
  for (const id of CAPAS_REFERENCIAS) vis(id, estado.verReferencias !== false);
  const est = estiloEstaciones();
  mapa.setFilter("estaciones", est.filter ?? null);
  Object.entries(est.paint).forEach(([k, v]) => mapa.setPaintProperty("estaciones", k, v));
  // Alertas: solo en condiciones actuales; en el tiempo, las del mismo fenómeno
  const tipos = { lluvia: ["tormentas", "lluvias"], viento: ["viento", "zonda"], temp: ["calor", "frio"] }[estado.capa];
  const filtroAlertas = tipos ? ["in", ["get", "tipo"], ["literal", tipos]] : null;
  for (const id of ["alertas-relleno", "alertas-borde"]) {
    vis(id, estado.modo === "actual" && estado.verAlertas);
    mapa.setFilter(id, filtroAlertas);
  }
  mapa.setPaintProperty("alertas-relleno", "fill-opacity", riesgo ? 0.06 : 0.16);
  // Tiempo
  const tiempo = !riesgo && estado.tiempo;
  CAPAS_TIEMPO.forEach((id) => vis(id, tiempo));
  mapa.setPaintProperty("atenuar", "background-color", css("--velo"));
  if (tiempo) {
    const campo = campoTiempo(estado.capa);
    estado.campo = campo;
    dibujarCampoEnMapa(campo);
    const ciudades = datosCiudades(campo);
    ciudades.features.forEach((f, i) => { f.properties.orden = i < 12 ? 2 : 1; });
    mapa.getSource("ciudades").setData(ciudades);
    if (estado.capa === "viento" && !movimientoReducido()) Particulas.iniciar(campo); else Particulas.detener();
  } else {
    Particulas.detener();
  }
}

// ---------- Selección en el mapa ----------
function aplicarSeleccionEnMapa() {
  if (!mapa?.getLayer("sel-zona")) return;
  const s = estado.sel;
  const nada = ["==", "a", "-"];
  let filtroZona = nada, filtroProv = ["==", "nam", "-"], circulo = [];
  if (s?.tipo === "zona" && s.lugar.nivel === "prov") filtroProv = ["==", ["get", "nam"], s.lugar.nombre];
  else if (s?.tipo === "zona") {
    const S = ["literal", s.lugar.cmus];
    const dentroA = ["in", ["get", "a"], S], dentroB = ["in", ["get", "b"], S];
    filtroZona = ["any", ["all", dentroA, ["!", dentroB]], ["all", ["!", dentroA], dentroB]];
  } else if (s?.tipo === "punto") {
    circulo = [{ type: "Feature", geometry: circuloGeo(s.punto, s.km), properties: {} },
               { type: "Feature", geometry: { type: "Point", coordinates: s.punto }, properties: {} }];
  }
  for (const id of ["sel-zona", "sel-zona-halo"]) mapa.setFilter(id, filtroZona);
  for (const id of ["sel-prov", "sel-prov-halo"]) mapa.setFilter(id, filtroProv);
  mapa.getSource("circulo").setData({ type: "FeatureCollection", features: circulo });
  for (const id of ["riesgo-mun", "riesgo-radio"]) mapa.setPaintProperty(id, "fill-opacity", opacidadRiesgo(OPAC_RELLENO));
}

function volarAZona(lugar) {
  const [x0, y0, x1, y1] = lugar.caja;
  mapa.fitBounds([[x0, y0], [x1, y1]], { padding: esMovil() ? 30 : 60, duration: movimientoReducido() ? 0 : 1600, maxZoom: 12 });
}
function volarAPunto(punto, km) {
  const [x0, y0, x1, y1] = cajaCirculo(punto, km * 1.35);
  mapa.fitBounds([[x0, y0], [x1, y1]], { padding: 24, duration: movimientoReducido() ? 0 : 1800, maxZoom: 15.5 });
}

// ---------- Eventos ----------
function enlazarEventosMapa() {
  estado.mapaEnlazado = true;
  mapa.on("moveend", () => { cargarRadiosVisibles(); if (SIN_TESELAS) cargarMapaBaseVisible(); });
  mapa.on("click", (e) => {
    const est = mapa.getLayer("estaciones") && mapa.queryRenderedFeatures(e.point, { layers: ["estaciones"] })[0];
    if (est) return;   // la estación muestra su detalle al pasar
    seleccionarPunto([e.lngLat.lng, e.lngLat.lat], { origen: "mapa", volar: mapa.getZoom() < 8.5 });
  });
  mapa.on("mousemove", porCuadro((e) => {
    const capas = ["estaciones", "alertas-relleno", "riesgo-radio", "riesgo-mun"].filter((id) => mapa.getLayer(id)
      && mapa.getLayoutProperty(id, "visibility") !== "none");
    const f = capas.length ? mapa.queryRenderedFeatures(e.point, { layers: capas })[0] : null;
    const html = f ? tooltipCapa(f) : estado.capa !== "riesgo" ? tooltipTiempo(e.lngLat) : null;
    mapa.getCanvas().style.cursor = f?.layer.id === "estaciones" ? "help" : "crosshair";
    if (html) Tip.mostrar(html, e.originalEvent); else Tip.ocultar();
  }));
  mapa.getCanvas().addEventListener("pointerleave", () => Tip.ocultar());
}

function tooltipCapa(f) {
  const p = f.properties, meses = mesesVista();
  if (f.layer.id === "estaciones") {
    const estadoTxt = p.estado && p.estado !== "null" ? t(`rio_${p.estado}`) : t("sin_dato");
    const peor = Math.max(...meses.map((m) => Number(p[`pe_${m}`]) || 0));
    return `<span class="tip-titulo">${escapar(p.estacion)}${nombreRio(p.rio) ? ` · ${escapar(nombreRio(p.rio))}` : ""}</span>
      ${p.h != null && p.h !== "null" ? `<span class="tip-fila"><b>${fmt(Number(p.h), 2)} m</b> ${estadoTxt} · ${fmtDia(String(p.hf).slice(0, 10))} ${fmtHora(p.hf)}</span>
      <span class="tip-fila">${t("nivel_alerta")} ${fmt(Number(p.nivel_alerta), 2)} m · ${t("nivel_evac")} ${fmt(Number(p.nivel_evacuacion), 2)} m</span>
      ${p.dh != null && p.dh !== "null" ? `<span class="tip-fila">${t("cambio_24h")}: ${Number(p.dh) > 0 ? "+" : ""}${fmt(Number(p.dh), 2)} m</span>` : ""}` : ""}
      ${p.conf === true || p.conf === "true" ? `<span class="tip-fila">${t("prob_evac_periodo")}: <b>${fmt(peor * 100)} %</b> <em>${t("escenario_glofas")}</em></span>` : ""}`;
  }
  if (f.layer.id === "alertas-relleno") {
    return `<span class="tip-titulo">${t("alerta")} ${t(`nivel_${p.nivel}`)} · ${t(`alerta_${p.tipo}`)}</span>
      <span class="tip-fila">${escapar(p.titulo)}</span><span class="tip-fila">${t("vigente_hasta")} ${fmtDia(p.vence.slice(0, 10))} ${fmtHora(p.vence)}</span>`;
  }
  const r = Math.max(...meses.map((m) => { const v = Number(p[`r_${m}`]); return Number.isNaN(v) ? -1 : v; }));
  if (f.layer.id === "riesgo-radio") {
    return `<span class="tip-titulo">${t("radio_censal")} ${escapar(p.cod_indec)}</span>
      <span class="tip-fila"><i style="background:${colorNivel(r)}"></i><b>${fmtRiesgo(r)}</b> ${nombreNivel(r)}</span>
      <span class="tip-fila">${t("poblacion")}: ${fmt(Number(p.poblacion))} · ${t("sin_cloaca")}: ${fmt(100 - Number(p.pct_cloaca))} %</span>`;
  }
  return `<span class="tip-titulo">${escapar(p.nam)} · ${escapar(p.jur)}</span>
    <span class="tip-fila"><i style="background:${colorNivel(r)}"></i><b>${fmtRiesgo(r)}</b> ${nombreNivel(r)} · ${textoPeriodoCorto()}</span>
    <span class="tip-fila tip-ayuda">${t("tip_clic_punto")}</span>`;
}

function tooltipTiempo(lngLat) {
  const c = estado.campo, T = estado.tiempo;
  if (!c || !T) return null;
  const v = valorEnGrilla(T, c.valores, lngLat.lng, lngLat.lat);
  if (Number.isNaN(v)) return null;
  let extra = "";
  if (c.capa === "viento" && c.u) {
    const u = valorEnGrilla(T, c.u, lngLat.lng, lngLat.lat), w = valorEnGrilla(T, c.v, lngLat.lng, lngLat.lat);
    const dir = ((Math.atan2(-u, -w) * 180) / Math.PI + 360) % 360;
    extra = ` · ${t("del")} ${t("puntos")[sectorViento(dir)]} · ${t("beaufort")[beaufort(v)]}`;
  }
  return `<span class="tip-fila"><b>${textoValor(c.capa, v)}${c.capa === "temp" ? "" : ` ${c.unidad}`}</b>${extra}</span>`;
}

// ---------- Radios censales (se cargan por provincia, una sola vez) ----------
function cargarRadiosProv(prov) {
  if (!estado.cargasRadios.has(prov)) {
    estado.cargasRadios.set(prov, fetch(`datos/radios/${prov}.geojson`).then((r) => r.json()).then((geo) => {
      riesgoRadios(geo.features);
      estado.radios.push(...geo.features);
      mapa.getSource("radios")?.setData({ type: "FeatureCollection", features: estado.radios });
    }));
  }
  return estado.cargasRadios.get(prov);
}
async function cargarRadiosEn(caja) {
  const provs = Object.entries(estado.datos.cajas).filter(([, c]) => cajasSeTocan(c, caja)).map(([p]) => p);
  await Promise.all(provs.map(cargarRadiosProv));
}
async function cargarRadiosVisibles() {
  if (!mapa || mapa.getZoom() < 9) return;
  const b = mapa.getBounds();
  await cargarRadiosEn([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
}
// Radio censal: riesgo = cbrt(amenaza del municipio en el mes × exposición del radio × vulnerabilidad del radio)
function riesgoRadios(features) {
  features.forEach((f) => {
    const d = estado.riesgo.cmu[f.properties.cmu];
    f.properties._c = centroDe(f.geometry);
    if (!d) return;
    estado.riesgo.meses.forEach((m, i) => {
      f.properties[`r_${m}`] = Math.round(Math.cbrt(d.h[i] * f.properties.E * f.properties.V) * 10) / 10;
    });
  });
}

// ---------- Mapa base propio (versión dentro de claude.ai) ----------
function agregarMapaBasePropio() {
  estado.base ??= { indice: null, cargados: new Set(), agua: [], calles: [] };
  const fc = (features) => ({ type: "FeatureCollection", features });
  mapa.addSource("base-agua", { type: "geojson", data: fc(estado.base.agua), attribution: "Agua: © colaboradores de OpenStreetMap" });
  mapa.addSource("base-calles", { type: "geojson", data: fc(estado.base.calles), attribution: "Calles: INDEC (Georef)" });
  mapa.addLayer({ id: "agua-areas", type: "fill", source: "base-agua", filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "fill-color": css("--agua") } });
  mapa.addLayer({ id: "agua-lineas", type: "line", source: "base-agua", filter: ["==", ["geometry-type"], "LineString"],
    minzoom: 7, layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": css("--agua"), "line-width": ["interpolate", ["linear"], ["zoom"],
      7, ["match", ["get", "c"], 1, 1, 0.4], 14, ["match", ["get", "c"], 1, 5, 2]] } });
  mapa.addLayer({ id: "calles", type: "line", source: "base-calles", minzoom: 11.5,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": ["match", ["get", "c"], 3, css("--tinta-3"), css("--calle")],
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 11.5, 0.35, 14, 0.9],
      "line-width": ["interpolate", ["exponential", 1.6], ["zoom"],
        12, ["match", ["get", "c"], 2, 2, 1, 1.4, 0.6], 17, ["match", ["get", "c"], 2, 12, 1, 10, 6]] } });
  cargarMapaBaseVisible();
}

function agregarNombresPropios() {
  const texto = { "text-font": fuenteMapa(), "text-field": ["get", "n"], "text-max-angle": 30 };
  const halo = { "text-color": css("--tinta-2"), "text-halo-color": css("--mapa-halo-texto"), "text-halo-width": 1.5 };
  mapa.addLayer({ id: "calles-nombre", type: "symbol", source: "base-calles", minzoom: 14,
    filter: ["all", ["!=", ["get", "n"], ""], ["!=", ["get", "c"], 3]],
    layout: { ...texto, "symbol-placement": "line", "text-size": ["interpolate", ["linear"], ["zoom"], 14, 10, 18, 13] }, paint: halo });
  const aguaTexto = { ...halo, "text-color": css("--agua-texto") };
  mapa.addLayer({ id: "agua-nombre-rios", type: "symbol", source: "base-agua", minzoom: 8,
    filter: ["all", ["==", ["geometry-type"], "LineString"], ["!=", ["get", "n"], ""], ["any", ["==", ["get", "c"], 1], [">=", ["zoom"], 12]]],
    layout: { ...texto, "symbol-placement": "line", "text-size": 12, "text-letter-spacing": 0.05 }, paint: aguaTexto });
  mapa.addLayer({ id: "agua-nombre-lagos", type: "symbol", source: "base-agua", minzoom: 9,
    filter: ["all", ["==", ["geometry-type"], "Polygon"], ["!=", ["get", "n"], ""]],
    layout: { ...texto, "text-size": 12 }, paint: aguaTexto });
}

function decodificarBase(d) {
  const linea = (a, k) => { const c = []; let x = 0, y = 0;
    for (; k < a.length; k += 2) { x += a[k]; y += a[k + 1]; c.push([x / 1e5, y / 1e5]); } return c; };
  const props = (f, c) => ({ n: d.n[f[0]] ?? "", c });
  return [
    ...d.p.map((f) => ({ type: "Feature", properties: props(f, -1), geometry: { type: "Polygon", coordinates: f.slice(1).map((r) => linea(r, 0)) } })),
    ...d.l.map((f) => ({ type: "Feature", properties: props(f, f[1]), geometry: { type: "LineString", coordinates: linea(f, 2) } })),
  ];
}

async function cargarMapaBaseVisible() {
  if (!estado.base) return;
  const z = mapa.getZoom(), b = mapa.getBounds(), base = estado.base;
  base.indice ??= await fetch("datos/base/indice.json").then((r) => r.json()).catch(() => ({ agua: [], calles: [] }));
  const visibles = (lista) => lista.filter(([archivo, c]) => !base.cargados.has(archivo)
    && cajasSeTocan(c, [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])).map(([a]) => a);
  for (const [capa, desde] of [["agua", 6.5], ["calles", 11.5]]) {
    if (z < desde) continue;
    const nuevos = visibles(base.indice[capa]);
    if (!nuevos.length) continue;
    nuevos.forEach((a) => base.cargados.add(a));
    const datos = await Promise.all(nuevos.map((a) => fetch(`datos/base/${a}`).then((r) => r.json())));
    datos.forEach((d) => base[capa].push(...decodificarBase(d)));
    mapa.getSource(`base-${capa}`)?.setData({ type: "FeatureCollection", features: base[capa] });
  }
}

// ---------- Unión de los números del día a las geometrías ----------
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
    riesgo.meses.forEach((m, i) => { f.properties[`r_${m}`] = d.r[i]; });
  });
}

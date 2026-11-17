// Buscador tipo GPS: provincia, partido, localidad y dirección en un renglón, con sugerencias desde la primera letra
// (ordenadas por coincidencia y población), filtros en cascada y autocompletado de calles del callejero del INDEC.

const NIVELES_CAMPO = { provincia: ["prov"], partido: ["depto"], localidad: ["gl", "loc"] };
const ORDEN_NIVEL = { prov: 0, depto: 1, gl: 2, loc: 3 };

function prepararBuscador() {
  estado.lugares = estado.datos.buscador.map(([nombre, tipo, provincia, cmus, caja, nivel]) => {
    const clave = normalizar(nombre);
    const pob = sumar(cmus.map((c) => Number(estado.porCmu.get(c)?.poblacion) || 0));
    return { nombre, tipo, provincia, cmus, caja, nivel, clave, palabras: clave.split(/[\s\-.,()]+/).filter(Boolean), pob };
  });
  estado.regiones = armarRegiones();
  estado.filtros = { provincia: null, partido: null, localidad: null };
  for (const nivel of ["provincia", "partido", "localidad"]) autocompletar(document.getElementById(`b-${nivel}`), nivel);
  autocompletarDireccion(document.getElementById("b-direccion"));
  document.querySelectorAll(".buscador input").forEach((x) => x.addEventListener("input", actualizarBorrar));
  // El recuadro de avisos y opciones se cierra al volver a escribir, al tocar fuera de él o con Escape
  const aviso = document.getElementById("aviso-busqueda");
  document.querySelectorAll(".buscador input").forEach((x) => x.addEventListener("input", () => { aviso.hidden = true; }));
  document.addEventListener("pointerdown", (e) => { if (!aviso.hidden && !aviso.contains(e.target) && !e.target.closest(".buscador")) aviso.hidden = true; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") aviso.hidden = true; });
  document.getElementById("form-buscar").addEventListener("submit", (e) => { e.preventDefault(); buscar(); });
  document.getElementById("btn-borrar").onclick = borrarTodo;
  // Radio: barra; el número cambia al deslizar y el análisis se recalcula al soltar
  const barra = document.getElementById("b-radio"), num = document.getElementById("b-radio-v");
  barra.oninput = () => { num.textContent = `${fmt(+barra.value, +barra.value % 1 ? 1 : 0)} km`; };
  barra.onchange = () => cambiarRadio(Number(barra.value));
}

// Candidatos para un campo: coincidencia (exacta, empieza, palabras, contiene) y luego los más poblados
function candidatos(nivel, texto) {
  const q = normalizar(texto), fichas = q.split(/[\s\-.,]+/).filter(Boolean);
  if (!q) return [];
  let base = estado.lugares.filter((l) => NIVELES_CAMPO[nivel].includes(l.nivel));
  const prov = estado.filtros.provincia, partido = estado.filtros.partido;
  if (nivel !== "provincia" && prov) base = base.filter((l) => l.provincia === prov.nombre);
  if (nivel === "localidad" && partido) { const S = new Set(partido.cmus); base = base.filter((l) => l.cmus.some((c) => S.has(c))); }
  const puntaje = (l) => {
    if (l.clave === q) return 0;
    if (l.clave.startsWith(q)) return 1;
    if (fichas.every((f) => l.palabras.some((p) => p.startsWith(f)))) return 2;
    if (l.clave.includes(q)) return 3;
    return 9;
  };
  const vistos = new Set();   // el mismo lugar como municipio, localidad y barrio aparece una sola vez
  return base.map((l) => [puntaje(l), l]).filter(([p]) => p < 9)
    .sort((a, b) => a[0] - b[0] || ORDEN_NIVEL[a[1].nivel] - ORDEN_NIVEL[b[1].nivel] || b[1].pob - a[1].pob || a[1].clave.length - b[1].clave.length)
    .filter(([, l]) => { const k = `${l.clave}|${l.provincia}|${l.cmus[0]}`; if (vistos.has(k)) return false; vistos.add(k); return true; })
    .slice(0, 8).map(([, l]) => l);
}
function mejorLugar(nivel, texto) {
  const c = candidatos(nivel, texto), q = normalizar(texto);
  return c.find((l) => l.clave === q) ?? c[0] ?? null;
}
function resaltar(nombre, texto) {
  const q = normalizar(texto).split(/\s+/)[0];
  if (!q) return escapar(nombre);
  const i = normalizar(nombre).indexOf(q);
  return i < 0 ? escapar(nombre) : `${escapar(nombre.slice(0, i))}<mark>${escapar(nombre.slice(i, i + q.length))}</mark>${escapar(nombre.slice(i + q.length))}`;
}

// Lista desplegable accesible y con teclado (compartida por los cuatro campos)
function listaSugerencias(input, { buscarItems, pintarItem, elegir }) {
  const lista = input.parentElement.querySelector(".sugerencias");
  let items = [], pos = -1, version = 0;
  const cerrar = () => { lista.hidden = true; input.setAttribute("aria-expanded", "false"); };
  const pintar = () => {
    if (!items.length) { cerrar(); return; }
    lista.innerHTML = items.map((it, k) => `<li role="option" id="${input.id}-op${k}" aria-selected="${k === pos}" data-k="${k}">${pintarItem(it)}</li>`).join("");
    lista.hidden = false;
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-activedescendant", pos >= 0 ? `${input.id}-op${pos}` : "");
  };
  const actualizar = async () => {
    const v = ++version, res = await buscarItems(input.value);
    if (v !== version) return;
    items = res; pos = items.length ? 0 : -1; pintar();
  };
  input.addEventListener("input", actualizar);
  input.addEventListener("focus", () => { if (input.value.trim()) actualizar(); });
  input.addEventListener("keydown", (e) => {
    if (lista.hidden) return;
    if (e.key === "ArrowDown") { pos = Math.min(pos + 1, items.length - 1); pintar(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { pos = Math.max(pos - 1, 0); pintar(); e.preventDefault(); }
    else if (e.key === "Enter" && items[pos]) { e.preventDefault(); const it = items[pos]; cerrar(); elegir(it); }
    else if (e.key === "Escape") cerrar();
  });
  // Con el mouse se elige al apretar (antes de que el campo pierda el foco). Con el dedo, al soltar sin haber deslizado:
  // si no, al querer recorrer la lista se elegía el primer lugar que se tocaba.
  const elegirLi = (e) => {
    const li = e.target.closest("li[data-k]");
    if (!li) return;
    e.preventDefault();
    const it = items[+li.dataset.k]; cerrar(); elegir(it);
  };
  lista.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") elegirLi(e); });
  lista.addEventListener("click", (e) => { if (!lista.hidden) elegirLi(e); });
  input.addEventListener("blur", () => setTimeout(cerrar, 120));
  return { cerrar };
}

function autocompletar(input, nivel) {
  listaSugerencias(input, {
    buscarItems: async (texto) => candidatos(nivel, texto),
    pintarItem: (l) => `<span class="sug-nombre"><span>${resaltar(l.nombre, input.value)}</span></span>
      <span class="sug-tipo">${escapar(l.tipo)}${l.nivel === "prov" ? "" : ` · ${escapar(l.provincia)}`}</span>`,
    elegir: (l) => elegirLugar(nivel, l),
  });
  input.addEventListener("input", () => { if (!input.value.trim()) estado.filtros[nivel] = null; });
}

function elegirLugar(nivel, l, { volar = true } = {}) {
  const campo = (n) => document.getElementById(`b-${n}`);
  estado.filtros[nivel] = l;
  campo(nivel).value = l.nombre;
  // Cascada: lo de abajo se borra; la provincia se completa sola
  if (nivel === "provincia") for (const n of ["partido", "localidad"]) {
    if (estado.filtros[n] && estado.filtros[n].provincia !== l.nombre) { estado.filtros[n] = null; campo(n).value = ""; }
  }
  if (nivel === "partido") { estado.filtros.localidad = null; campo("localidad").value = ""; }
  if (nivel !== "provincia") {
    const prov = estado.lugares.find((x) => x.nivel === "prov" && x.nombre === l.provincia);
    if (prov) { estado.filtros.provincia = prov; campo("provincia").value = prov.nombre; }
  }
  const dir = campo("direccion").value.trim();
  if (estado.dirPendiente && dir) return buscarDireccion(dir);   // la dirección esperaba este dato: se busca sola
  seleccionarZona(l, { volar, origen: "buscador" });
}

// ---------- Dirección: calles del callejero propio ----------
const VACIAS = new Set(["AV", "AVDA", "AVENIDA", "CALLE", "BV", "BOULEVARD", "BULEVAR", "PJE", "PASAJE", "DR", "DOCTOR",
  "GRAL", "GENERAL", "ING", "INGENIERO", "PTE", "PRESIDENTE", "CNEL", "CORONEL", "DE", "DEL", "LA", "LAS", "LOS", "EL", "Y", "N"]);
const fichasCalle = (txt) => normalizar(txt).toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !VACIAS.has(w));
const nombreCalle = (n) => n.toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase());

async function callejero() {
  estado.callejero ??= { indice: await fetch("datos/callejero/indice.json").then((r) => r.json()), cargados: {} };
  return estado.callejero;
}
async function callesDeZona(zona) {
  const cj = await callejero();
  const deptos = [...new Set(zona.cmus.flatMap((c) => cj.indice.cmu_depto[c] || []))];
  const out = [];
  for (const d of deptos) {
    const archivo = cj.indice.depto_archivo[d];
    if (!archivo) continue;
    cj.cargados[archivo] ??= await fetch(`datos/callejero/${archivo}`).then((r) => r.json());
    out.push([d, cj.cargados[archivo][d] || {}]);
  }
  return out;
}
const zonaDireccion = () => estado.filtros.localidad || estado.filtros.partido;

// ---------- Búsqueda libre (como en Google Maps): sugerencias mientras se escribe ----------
// Mezcla, en este orden: coordenadas, localidades y partidos propios, calles del callejero (si hay zona elegida) y
// resultados de Photon (buscador gratuito sobre OpenStreetMap: empresas, plantas, clubes, hospitales, comercios y calles).
const PHOTON = "https://photon.komoot.io/api/";
const CATEGORIAS_OSM = [
  [/^(man_made:works|landuse:industrial|industrial:|office:company|craft:)/, "cat_industria"],
  [/^(leisure:(sports_centre|stadium|pitch|sports_hall|swimming_pool)|club:sport)/, "cat_club"],
  [/^amenity:(hospital|clinic|doctors)|^healthcare:/, "cat_salud"],
  [/^amenity:(university|college|school|kindergarten)/, "cat_educacion"],
  [/^amenity:(townhall|police|fire_station|courthouse)|^office:government/, "cat_gobierno"],
  [/^(railway:(station|halt)|amenity:bus_station|aeroway:aerodrome|public_transport:station)/, "cat_transporte"],
  [/^amenity:fuel$/, "cat_combustible"],
  [/^(shop:|amenity:(restaurant|cafe|fast_food|bank|pharmacy|bar))/, "cat_comercio"],
  [/^highway:(bus_stop|platform)/, "cat_parada"],
  [/^highway:/, "cat_calle"],
  [/^place:(city|town|village|hamlet|suburb|neighbourhood|quarter|locality)/, "cat_lugar"],
  [/^(building:|office:)/, "cat_edificio"],
  [/^(leisure:park|tourism:|historic:)/, "cat_paseo"],
];
const categoriaOSM = (p) => (CATEGORIAS_OSM.find(([re]) => re.test(`${p.osm_key}:${p.osm_value}`))?.[1]) ?? "cat_lugar_osm";
let photonVersion = 0;
// Lugares cargados a mano: empresas importantes que OpenStreetMap no tiene o tiene en un solo sitio. Se encuentran aunque el
// nombre esté mal escrito (hasta 2 letras de diferencia). Con el lugar en el texto («… zárate»), primero el de ese lugar.
const LUGARES_PROPIOS = [
  // Zárate: RN 9, Colectora Sur km 87,5. Ubicada con la captura de Google Maps que pasó la usuaria (14-nov): al sur de la ruta,
  // en la esquina noreste del barrio Los Mirtillos, sobre el trazado de la RN 9 de OpenStreetMap
  { alias: ["masterbus", "master bus"], nombre: "MasterBus · terminal de micros", detalle: "Ruta Nacional 9, Colectora Sur km 87,5 · Zárate · Buenos Aires", cat: "cat_transporte", punto: [-59.077632, -34.128394], lugar: "zarate" },
  { alias: ["masterbus", "master bus"], nombre: "MasterBus · oficina", detalle: "Doctor Salk 243 · Campana · Buenos Aires", cat: "cat_transporte", punto: [-58.948364, -34.1869741], lugar: "campana" },
  // Zárate: planta de Toyota Argentina (Ruta 12 km 81, en el cruce con la RN 9). Centro del polígono de OpenStreetMap («Toyota», man_made=works)
  { alias: ["toyota", "toyota argentina", "planta toyota", "toyota zarate", "toyota planta zarate"], nombre: "Toyota Argentina · Planta Zárate",
    detalle: "Ruta 12 km 81 · Zárate · Buenos Aires", cat: "cat_industria", punto: [-59.0414729, -34.1368842], lugar: "zarate" },
  // Campana: Camino 014-04 a Capilla del Señor, a 500 m de la RN 9 km 80. Punto del lugar cargado en Waze (no está en OpenStreetMap ni en TomTom)
  { alias: ["toyota boshoku", "boshoku"], nombre: "Toyota Boshoku Argentina", detalle: "Camino a Capilla del Señor (014-04), a 500 m de la RN 9 km 80 · Campana · Buenos Aires", cat: "cat_industria", punto: [-59.002897, -34.169283], lugar: "campana" },
  // Campana: RN 9 km 79,5, Camino Morejón 10. Punto del lugar publicado en near-place.com (ficha de Google del negocio); el punto de la
  // dirección está a 250 m. No está en OpenStreetMap ni en TomTom
  { alias: ["padilla logistica", "transportes padilla", "padilla"], nombre: "Transportes Padilla (Padilla Logística)", detalle: "RN 9 km 79,5, Camino Morejón 10 · Campana · Buenos Aires", cat: "cat_industria", punto: [-58.997509, -34.169397], lugar: "campana" },
  // Campana: la portería 1 (Dr. Simini 250), punto de Waze. El centro del polígono de OpenStreetMap cae unos 770 m al norte, dentro de la planta
  { alias: ["tenaris siderca", "siderca", "tenaris"], nombre: "Tenaris Siderca", detalle: "Portería 1 · Dr. Jorge A. Simini 250 · Campana · Buenos Aires", cat: "cat_industria", punto: [-58.977242, -34.159136], lugar: "campana" },
  // Petroleras: con su nombre se buscan las refinerías y las sedes, no las estaciones de servicio (que quedan como referencias del mapa).
  // Puntos: polígonos de OpenStreetMap (refinerías) y Waze (Dock Sud)
  { alias: ["pan american energy", "pan american", "pae", "axion", "axion energy", "refineria axion", "refineria campana", "refineria pan american", "esso campana"],
    nombre: "Pan American Energy · Refinería Campana", detalle: "Refinería de la marca Axion · Campana · Buenos Aires", cat: "cat_industria", punto: [-58.94571, -34.16072], lugar: "campana" },
  { alias: ["pan american energy", "pan american", "pae", "pae sede", "pan american energy sede"], nombre: "Pan American Energy · Sede", detalle: "Av. Leandro N. Alem 1180 · Ciudad de Buenos Aires",
    cat: "cat_edificio", punto: [-58.373868, -34.593942], lugar: "buenos aires" },
  { alias: ["ypf", "refineria ypf", "refineria la plata", "destileria ypf", "ypf ensenada", "ypf la plata", "complejo industrial la plata"],
    nombre: "YPF · Complejo Industrial La Plata (refinería)", detalle: "Ensenada · Buenos Aires", cat: "cat_industria", punto: [-57.91305, -34.88611], lugar: "ensenada" },
  { alias: ["ypf", "refineria ypf", "refineria lujan de cuyo", "ypf lujan de cuyo", "complejo industrial lujan de cuyo"],
    nombre: "YPF · Complejo Industrial Luján de Cuyo (refinería)", detalle: "Luján de Cuyo · Mendoza", cat: "cat_industria", punto: [-68.97394, -33.06319], lugar: "lujan de cuyo" },
  { alias: ["ypf", "refineria ypf", "refineria plaza huincul", "ypf plaza huincul"],
    nombre: "YPF · Refinería Plaza Huincul", detalle: "Plaza Huincul · Neuquén", cat: "cat_industria", punto: [-69.14691, -38.93095], lugar: "plaza huincul" },
  { alias: ["ypf", "torre ypf", "ypf sede", "ypf oficinas"], nombre: "YPF · Torre YPF (sede)", detalle: "Macacha Güemes 515 · Puerto Madero · Ciudad de Buenos Aires", cat: "cat_edificio", punto: [-58.36222, -34.60547], lugar: "buenos aires" },
  { alias: ["shell", "raizen", "refineria shell", "refineria dock sud", "refineria raizen", "shell dock sud"],
    nombre: "Refinería Shell Dock Sud", detalle: "Dock Sud · Avellaneda · Buenos Aires", cat: "cat_industria", punto: [-58.327617, -34.654459], lugar: "avellaneda" },
  { alias: ["puma", "puma energy", "trafigura", "refineria bahia blanca", "refineria puma"],
    nombre: "Refinería Ricardo Elicabe (Puma Energy / Trafigura)", detalle: "Bahía Blanca · Buenos Aires", cat: "cat_industria", punto: [-62.29814, -38.74641], lugar: "bahia blanca" },
  { alias: ["refinor", "refineria campo duran", "campo duran"], nombre: "Refinor · Complejo Campo Durán", detalle: "Aguaray · Salta", cat: "cat_industria", punto: [-63.66472, -22.20316], lugar: "aguaray" },
];
// Estaciones de servicio: solo si se las pide («estación», «nafta», «GNC»…); con el nombre de una petrolera se busca la planta o la sede
const pideEstacion = (q) => /estaci[oó]n|servicentro|nafta|combustible|gnc|surtidor|gasolinera/i.test(q);
// Barrios populares del RENABAP (6.467, con su localidad): «barrio San Cayetano zárate», «san cayetano, zarate». Con un lugar
// en el texto, los barrios a menos de 25 km de ese lugar (algunos figuran en la localidad vecina); el nombre admite errores.
let indiceBarrios = null;
async function buscarBarrios(texto) {
  const { nombre, lugar } = separarLugar(texto), q = normalizar(nombre ?? texto).replace(/^(barrio|bo\.?|b°)\s+/, "").trim();
  if (q.length < 3) return [];
  indiceBarrios ??= await fetch("datos/barrios_buscador.json").then((r) => (r.ok ? r.json() : [])).catch(() => []);
  const centro = lugar?.caja ? [(lugar.caja[0] + lugar.caja[2]) / 2, (lugar.caja[1] + lugar.caja[3]) / 2] : null, tol = q.length >= 6 ? 2 : 1;
  return indiceBarrios.map(([n, loc, lo, la, viv]) => ({ n, loc, punto: [lo, la], viv, nn: normalizar(n), km: centro ? distanciaKm(centro, [lo, la]) : 0 }))
    .filter((b) => (b.nn === q || b.nn.startsWith(q) || b.nn.includes(` ${q}`) || distanciaEdicion(q, b.nn) <= tol) && (!centro || b.km <= 25))
    .sort((a, b) => (a.nn === q ? 0 : 1) - (b.nn === q ? 0 : 1) || a.km - b.km || b.viv - a.viv).slice(0, 4)
    .map((b) => ({ tipo: "osm", nombre: `${t("barrio")} ${b.n}`, detalle: [b.loc, b.viv ? t("viviendas_n")(fmt(b.viv)) : ""].filter(Boolean).join(" · "), cat: "cat_barrio", punto: b.punto }));
}
function lugaresPropios(texto) {
  const { nombre, lugar } = separarLugar(texto), q = normalizar(nombre ?? texto).replace(/(\p{L})\1+/gu, "$1").replace(/[^\p{L}\p{N}]/gu, "");
  if (q.length < 3) return [];
  const pegado = (a) => a.replace(/[^\p{L}\p{N}]/gu, "").replace(/(\p{L})\1+/gu, "$1");
  return LUGARES_PROPIOS.filter((x) => x.alias.some((a) => { const b = pegado(a); if (q.length < 4) return b === q;   // «YPF», «PAE»: enteros
    return (b.startsWith(q) && q.length >= 0.6 * b.length) || (b.length >= 4 && distanciaEdicion(q, b) <= 2) || (b.length >= 5 && q.length > b.length && distanciaEdicion(q.slice(0, b.length + 1), b) <= 2); }))
    .map((x) => ({ tipo: "osm", nombre: x.nombre, detalle: x.detalle, cat: x.cat, punto: x.punto, orden: lugar && lugar.clave.includes(x.lugar) ? -1 : 0, alias: x.alias, propio: true }))
    .sort((a, b) => a.orden - b.orden);
}
// "Master Bus, Zárate" o "masterbus zarate": separa el nombre buscado del lugar (localidad o partido conocido) que lo acompaña
// Distancia de edición (cuántas letras hay que cambiar, agregar o quitar): «zarata» → «zarate» = 1
function distanciaEdicion(a, b) {
  const v = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = v[0]; v[0] = i;
    for (let j = 1; j <= b.length; j++) { const t0 = v[j]; v[j] = Math.min(v[j] + 1, v[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t0; }
  }
  return v[b.length];
}
// Localidad o partido con el nombre mal escrito (hasta 1 letra en nombres cortos, 2 en los de 6 letras o más)
function lugarParecido(texto) {
  const q = normalizar(texto);
  if (q.length < 4) return null;
  let mejor = null, dm = q.length >= 6 ? 2 : 1;
  for (const l of estado.lugares) {
    if (l.nivel !== "gl" && l.nivel !== "loc" && l.nivel !== "depto" || Math.abs(l.clave.length - q.length) > dm) continue;
    const d = distanciaEdicion(q, l.clave);
    if (d < dm || (d === dm && !mejor)) { mejor = l; dm = d; }
  }
  return mejor;
}
function separarLugar(texto) {
  const partes = texto.split(",").map((x) => x.trim()).filter(Boolean);
  const exacto = (q) => lugarExacto("localidad", q) ?? lugarExacto("partido", q) ?? lugarParecido(q);
  if (partes.length > 1) { const l = exacto(partes.at(-1)); if (l) return { nombre: partes.slice(0, -1).join(" "), lugar: l }; }
  // «Masterbus en Zárate», «… de Zárate», «… cerca de Zárate»: el conector no es parte del nombre
  const m = texto.match(/^(.+?)\s+(?:en|de|del|cerca de)\s+(.+)$/i);
  if (m) { const l = exacto(m[2]); if (l) return { nombre: m[1], lugar: l }; }
  const pal = texto.replace(/,/g, " ").split(/\s+/).filter(Boolean);
  for (const n of [2, 1]) if (pal.length > n) { const l = exacto(pal.slice(-n).join(" ")); if (l) return { nombre: pal.slice(0, -n).join(" "), lugar: l }; }
  return { nombre: partes[0] ?? texto, lugar: null };
}
async function consultaPhoton(texto, centro, limite, escala = "0.3") {
  const params = new URLSearchParams({ q: texto, limit: String(limite), bbox: "-74,-56,-53,-21.5" });
  if (centro) { params.set("lon", centro[0].toFixed(4)); params.set("lat", centro[1].toFixed(4)); params.set("location_bias_scale", escala); }
  const d = await fetch(`${PHOTON}?${params}`).then((r) => (r.ok ? r.json() : { features: [] }));
  return d.features.filter((f) => (f.properties.countrycode ?? "AR") === "AR");
}
// TomTom Search (plan gratuito, 2.500 búsquedas por día; clave en web/claves.js): empresas e industrias que OpenStreetMap no tiene.
// Devuelve resultados con la misma forma que Photon para ordenarlos juntos
async function consultaTomTom(texto, centro, cerca) {
  const k = window.CLAVES?.tomtom;
  if (!k || !texto) return [];
  const p = new URLSearchParams({ key: k, countrySet: "AR", language: "es-419", limit: "6", typeahead: "false" });
  if (centro) { p.set("lat", centro[1].toFixed(4)); p.set("lon", centro[0].toFixed(4)); if (cerca) p.set("radius", "40000"); }
  const d = await fetch(`https://api.tomtom.com/search/2/search/${encodeURIComponent(texto)}.json?${p}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return (d?.results ?? []).filter((r) => r.position).map((r) => {
    const cat = (r.poi?.categories ?? []).join(" "), a = r.address ?? {};
    const [key, value] = /petrol|gas station|fuel/i.test(cat) ? ["amenity", "fuel"]   // estación de servicio
      : /industr|factor|manufact|compan|business|warehouse|logist|transport/i.test(cat) ? ["office", "company"]
      : r.type === "Street" ? ["highway", "residential"] : r.type === "Geography" ? ["place", "town"] : ["tomtom", cat.split(" ")[0] ?? ""];
    return { geometry: { coordinates: [r.position.lon, r.position.lat] }, properties: { name: r.poi?.name ?? a.freeformAddress, osm_key: key, osm_value: value,
      street: a.streetName, housenumber: a.streetNumber, city: a.municipality, state: a.countrySubdivision, countrycode: "AR" } };
  });
}
async function buscarPhoton(texto, { limite = 8 } = {}) {
  const { nombre, lugar } = separarLugar(texto);
  const zona = lugar ?? zonaDireccion() ?? estado.filtros.provincia;
  const centro = zona?.caja ? [(zona.caja[0] + zona.caja[2]) / 2, (zona.caja[1] + zona.caja[3]) / 2] : mapa ? mapa.getCenter().toArray() : null;
  // Con un lugar en el texto se busca también solo el nombre, cerca de ese lugar (una empresa de Zárate puede figurar en Campana)
  const [todo, solo, tt] = await Promise.all([consultaPhoton(texto, centro, limite * 2).catch(() => []),
    lugar && nombre ? consultaPhoton(nombre, centro, limite * 2, "0.6").catch(() => []) : [],
    consultaTomTom(lugar && nombre ? nombre : texto, centro, !!lugar).catch(() => [])]);
  solo.unshift(...tt);   // TomTom primero: es la fuente con más empresas
  // Error de tipeo con letras repetidas («Maasterbus»): si nada se parece al nombre, se prueba sin las letras de más
  const simple = (x) => normalizar(x).replace(/(\p{L})\1+/gu, "$1");
  const sinRepetir = nombre && simple(nombre) !== normalizar(nombre) ? simple(nombre) : null;
  const parece = (f) => { const x = simple(f.properties.name ?? "").replace(/[\s\-.]/g, ""), q = simple(nombre ?? "").replace(/[\s\-.]/g, ""); return q && x.includes(q); };
  if (sinRepetir && ![...todo, ...solo].some(parece)) solo.push(...await consultaPhoton(sinRepetir, centro, limite * 2, lugar ? "0.6" : "0.3").catch(() => []));
  // Si Photon no responde o no encuentra nada, Nominatim cerca del lugar (también con las palabras juntas: "Master Bus" → "MasterBus")
  if (![...todo, ...solo].some(parece) && lugar && nombre) for (const v of [...new Set([nombre, nombre.replace(/\s+/g, ""), sinRepetir].filter(Boolean))]) {
    const m = 0.45, q = new URLSearchParams({ q: v, format: "geojson", countrycodes: "ar", limit: "5", addressdetails: "1", "accept-language": "es",
      viewbox: `${centro[0] - m},${centro[1] + m},${centro[0] + m},${centro[1] - m}`, bounded: "1" });
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${q}`).then((x) => (x.ok ? x.json() : { features: [] })).catch(() => ({ features: [] }));
    solo.push(...r.features.map((f) => { const ad = f.properties.address ?? {}; return { geometry: f.geometry, properties: { name: f.properties.name, osm_key: f.properties.category, osm_value: f.properties.type,
      street: ad.road, housenumber: ad.house_number, city: ad.city || ad.town || ad.village, county: ad.county, state: ad.state, countrycode: "AR" } }; }));
    if (solo.length) break;
  }
  // Último recurso, con un lugar: OpenStreetMap (Overpass) busca nombres parecidos a 30 km del lugar, aunque falten o sobren
  // letras («mster bus» → MasterBus): cada letra puede tener otra en el medio
  if (![...todo, ...solo].some(parece) && lugar && nombre) {
    const letras = simple(nombre).replace(/[^\p{L}\p{N}]/gu, "");
    if (letras.length >= 4) {
      const re = [...letras].map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".?.?"), [lo, la] = centro;
      const q = `[out:json][timeout:8];nw(around:25000,${la.toFixed(4)},${lo.toFixed(4)})["name"~"${re}",i];out center 8;`;
      // Servidores públicos de Overpass (a veces saturados): se prueba uno tras otro, con 9 s cada uno
      let r = { elements: [] };
      for (const h of ["https://overpass-api.de", "https://overpass.private.coffee", "https://maps.mail.ru/osm/tools/overpass"]) {
        const ctl = new AbortController(), reloj = setTimeout(() => ctl.abort(), 9000);
        const x = await fetch(`${h}/api/interpreter?data=${encodeURIComponent(q)}`, { signal: ctl.signal }).then((y) => (y.ok ? y.json() : null)).catch(() => null).finally(() => clearTimeout(reloj));
        if (x?.elements) { r = x; break; }
      }
      solo.push(...r.elements.map((e) => ({ geometry: { coordinates: [e.lon ?? e.center?.lon, e.lat ?? e.center?.lat] },
        properties: { name: e.tags.name, osm_key: Object.keys(e.tags).find((k) => ["amenity", "office", "shop", "industrial", "craft", "man_made", "landuse"].includes(k)) ?? "place",
          osm_value: e.tags.amenity ?? e.tags.office ?? e.tags.shop ?? "", street: e.tags["addr:street"], housenumber: e.tags["addr:housenumber"], city: e.tags["addr:city"] ?? lugar.nombre, countrycode: "AR" } }))
        .filter((f) => f.geometry.coordinates[0] != null));
    }
  }
  const cerca = (f) => !lugar || distanciaKm(centro, f.geometry.coordinates) <= 60;
  const fichas = normalizar(nombre).split(/[\s\-.,]+/).filter((f) => f.length > 1), junto = fichas.join("");
  // Primero lo que coincide con el nombre buscado (no el lugar que lo acompaña), después lo más cercano
  const parecido = (n) => { const x = simple(n).replace(/[\s\-.]/g, ""), j = simple(junto); return !fichas.length ? 0 : x.includes(j) ? 1 : fichas.filter((f) => x.includes(simple(f))).length / fichas.length; };
  const vistos = new Set();
  return [...solo.filter(cerca), ...todo].map((f) => {
    const p = f.properties, cat = categoriaOSM(p);
    const lugarP = p.city || p.town || p.village || p.district || p.county || "";
    const calle = p.street ? `${p.street}${p.housenumber ? ` ${p.housenumber}` : ""}` : "";
    const nom = p.name || calle || lugarP;
    return { tipo: "osm", nombre: nom, cat, punto: f.geometry.coordinates,
      detalle: [p.name ? calle : "", lugarP && lugarP[0].toUpperCase() + lugarP.slice(1), p.state].filter(Boolean).filter((v, k, a) => a.indexOf(v) === k).join(" · "),
      orden: cat === "cat_parada" ? 2 : 0, parecido: parecido(nom), km: centro ? distanciaKm(centro, f.geometry.coordinates) : 0 };
  }).filter((x) => x.nombre && (x.cat !== "cat_combustible" || pideEstacion(texto)) && !vistos.has(`${normalizar(x.nombre)}|${x.detalle}`) && vistos.add(`${normalizar(x.nombre)}|${x.detalle}`))
    .sort((a, b) => (b.parecido >= 0.5) - (a.parecido >= 0.5) || b.parecido - a.parecido || a.orden - b.orden || (lugar ? a.km - b.km : 0)).slice(0, limite);
}

// Regiones de la Argentina (las que se usan en los pronósticos y en los medios): unión de provincias, o de partidos para el AMBA
const REGIONES = [
  { nombre: "Litoral", alias: ["litoral", "region litoral", "litoral argentino"], provs: ["Santa Fe", "Entre Ríos", "Corrientes", "Misiones", "Chaco", "Formosa"] },
  { nombre: "Noreste (NEA)", alias: ["nea", "noreste", "noreste argentino", "nordeste"], provs: ["Chaco", "Corrientes", "Formosa", "Misiones"] },
  { nombre: "Noroeste (NOA)", alias: ["noa", "noroeste", "noroeste argentino"], provs: ["Jujuy", "Salta", "Tucumán", "Catamarca", "Santiago del Estero", "La Rioja"] },
  { nombre: "Cuyo", alias: ["cuyo", "region de cuyo"], provs: ["Mendoza", "San Juan", "San Luis", "La Rioja"] },
  { nombre: "Centro", alias: ["centro", "region centro"], provs: ["Córdoba", "Santa Fe", "Entre Ríos"] },
  { nombre: "Región pampeana", alias: ["pampeana", "region pampeana", "pampa humeda", "llanura pampeana"], provs: ["Buenos Aires", "Córdoba", "Santa Fe", "Entre Ríos", "La Pampa"] },
  { nombre: "Patagonia", alias: ["patagonia", "sur", "region patagonica"], provs: ["Neuquén", "Río Negro", "Chubut", "Santa Cruz", "Tierra del Fuego, Antártida e Islas del Atlántico Sur"] },
  { nombre: "Gran Chaco", alias: ["gran chaco", "chaco salteño", "impenetrable"], provs: ["Chaco", "Formosa", "Santiago del Estero", "Salta"] },
  { nombre: "AMBA (Ciudad y conurbano)", alias: ["amba", "gba", "gran buenos aires", "conurbano", "area metropolitana"], provs: ["CABA"],
    partidos: ["Almirante Brown", "Avellaneda", "Berazategui", "Esteban Echeverría", "Ezeiza", "Florencio Varela", "General San Martín", "Hurlingham", "Ituzaingó",
      "José C. Paz", "La Matanza", "Lanús", "Lomas de Zamora", "Malvinas Argentinas", "Merlo", "Moreno", "Morón", "Quilmes", "San Fernando", "San Isidro",
      "San Miguel", "Tigre", "Tres de Febrero", "Vicente López"] },
];
function armarRegiones() {
  const prov = (n) => estado.lugares.find((l) => l.nivel === "prov" && l.nombre === n);
  const part = (n) => estado.lugares.find((l) => l.nivel === "depto" && l.provincia === "Buenos Aires" && normalizar(l.nombre) === normalizar(n));
  return REGIONES.map((r) => {
    const partes = [...r.provs.map(prov), ...(r.partidos ?? []).map(part)].filter(Boolean);
    const caja = partes.reduce((c, l) => [Math.min(c[0], l.caja[0]), Math.min(c[1], l.caja[1]), Math.max(c[2], l.caja[2]), Math.max(c[3], l.caja[3])], [180, 90, -180, -90]);
    return { nombre: r.nombre, tipo: "Región", provincia: "", cmus: [...new Set(partes.flatMap((l) => l.cmus))], caja, nivel: "region", clave: normalizar(r.nombre), alias: r.alias.map(normalizar),
      pob: sumar(partes.map((l) => l.pob || 0)) };
  });
}

// Orden por relevancia, para cualquier búsqueda: (1) cuánto coincide el nombre con lo escrito (exacto, empieza igual, tiene todas las
// palabras, las tiene sumando el detalle —«san cayetano zarate»—, las contiene) y (2) la importancia del tipo (país y provincias,
// municipios y plantas o sedes cargadas, localidades, calles, barrios, comercios). Los que solo se parecen por las letras (p. ej.
// «Loyola» para «toyota») se descartan si hay alguna coincidencia real. Sin lugar ni número escrito, fuera las calles de otras
// ciudades y los puntos de OpenStreetMap con el mismo nombre que un lugar ya listado.
function ordenarSugerencias(items, q) {
  const qn = normalizar(q), pal = qn.split(/\s+/).filter(Boolean), conNumero = /\d/.test(q);
  const palabrasDe = (txt) => normalizar(txt ?? "").split(/[\s,·\-\/().]+/).filter(Boolean);
  const coincide = (x) => {
    if (["pais", "coords", "buscar", "region"].includes(x.tipo)) return -1;
    const n = normalizar(x.nombre ?? ""), pn = palabrasDe(x.nombre), pd = [...pn, ...palabrasDe(x.detalle)];
    const prefijo = (lista) => pal.every((w) => lista.some((p) => p.startsWith(w)));
    if (x.propio && (x.alias ?? []).some((al) => normalizar(al) === qn)) return 0;   // cargados a mano: por su nombre
    return n === qn || n.startsWith(qn) ? 0 : prefijo(pn) ? 2 : prefijo(pd) ? 3 : n.includes(qn) ? 4 : 9;
  };
  const peso = (x) => x.propio ? 0 : x.tipo === "lugar" ? ({ prov: 0.5, depto: 2, gl: 1, loc: 3 }[x.lugar?.nivel] ?? 2) : x.tipo === "calle" ? 3
    : x.cat === "cat_industria" || x.cat === "cat_edificio" || x.cat === "cat_transporte" && x.lugar ? 1 : x.cat === "cat_barrio" ? 4 : x.cat === "cat_lugar" ? 4 : x.cat === "cat_calle" ? 5 : 5;
  const conPuntaje = items.map((x, i) => ({ x, i, c: coincide(x), p: peso(x) }));
  const hayReal = conPuntaje.some((o) => o.c >= 0 && o.c < 9), hayLugar = items.some((x) => x.tipo === "lugar");
  const mismoLugar = (o) => items.some((x) => x.tipo === "lugar" && normalizar(x.nombre) === normalizar(o.nombre ?? ""));
  return conPuntaje
    .filter((o) => !(hayReal && o.c === 9))
    .filter((o) => conNumero || !hayLugar || o.x.tipo !== "osm" || (o.x.cat !== "cat_calle" && !(/^cat_lugar/.test(o.x.cat ?? "") && mismoLugar(o.x))))
    .sort((a, b) => a.c - b.c || a.p - b.p || a.i - b.i).map((o) => o.x);
}
async function sugerenciasLibres(texto) {
  const q = texto.trim(), items = [];
  if (q.length < 2) return items;
  const c = coordenadasDe(q);
  if (c?.punto) return [{ tipo: "coords", nombre: t("sug_coords"), detalle: `${c.punto[1].toFixed(5)}, ${c.punto[0].toFixed(5)}`, punto: c.punto }];
  if (/[,;]/.test(q) && q.length > 12) items.push({ tipo: "buscar", nombre: t("sug_buscar")(q), detalle: t("sug_buscar_sub") });   // dirección completa pegada
  // Regiones (Litoral, NEA, NOA, Cuyo, Patagonia, AMBA…)
  const qr = normalizar(q);
  if (qr.length >= 3) for (const r of estado.regiones ?? []) if (r.alias.some((a) => a.startsWith(qr) || qr.startsWith(a)))
    items.push({ tipo: "region", nombre: r.nombre, detalle: t("sug_region"), lugar: r });
  // El país entero: «Argentina», «país», «todo el país»
  const qn = normalizar(q);
  if (qn.length >= 3 && ["argentina", "pais", "todo el pais", "republica argentina"].some((x) => x.startsWith(qn))) items.push({ tipo: "pais", nombre: "Argentina", detalle: t("sug_pais") });
  // Localidades, partidos y provincias propios (solo si el texto no parece una dirección con número)
  if (!/\d/.test(q) && !q.includes(",")) {
    for (const nivel of ["localidad", "partido", "provincia"]) for (const l of candidatos(nivel, q).slice(0, nivel === "localidad" ? 2 : 1)) {
      if (!items.some((x) => x.lugar?.clave === l.clave && x.lugar?.provincia === l.provincia && x.lugar?.nivel === l.nivel)) items.push({ tipo: "lugar", nivel, lugar: l, nombre: l.nombre, detalle: `${l.tipo}${l.nivel === "prov" ? "" : ` · ${l.provincia}`}` });
    }
  }
  // Calles del callejero propio, si ya hay localidad o partido elegido
  const m = q.match(/^(.*?)(?:[\s,]+(\d{1,5}))?\s*$/), fichas = fichasCalle(m?.[1] ?? q), zona = zonaDireccion();
  if (zona && fichas.length && !q.includes(",")) {
    const vistos = new Map();
    for (const [, calles] of await callesDeZona(zona)) for (const [nombre, cuadras] of Object.entries(calles)) {
      const pal = nombre.split(" ");
      if (fichas.every((f) => pal.some((p) => p.startsWith(f)))) vistos.set(nombre, (vistos.get(nombre) ?? 0) + cuadras.length);
    }
    for (const [nombre] of [...vistos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3))
      items.push({ tipo: "calle", nombre: `${nombreCalle(nombre)} ${m?.[2] ?? ""}`.trim(), numero: m?.[2] ?? "", detalle: `${t("calle")} · ${zona.nombre}` });
  }
  const propios = [...lugaresPropios(q), ...await buscarBarrios(q).catch(() => [])];
  items.push(...propios);
  // Photon, con una pausa corta para no consultar en cada letra
  if (!SIN_TESELAS && q.length >= 3) {
    const v = ++photonVersion;
    await demora(260);
    if (v === photonVersion) items.push(...(await buscarPhoton(q).catch(() => [])).filter((o) => !propios.some((p) => distanciaKm(p.punto, o.punto) < 0.2)));
  }
  return ordenarSugerencias(items, q).slice(0, 10);
}

function autocompletarDireccion(input) {
  listaSugerencias(input, {
    buscarItems: sugerenciasLibres,
    pintarItem: (it) => {
      const ic = it.tipo === "pais" || it.tipo === "region" ? "objetivo" : it.tipo === "lugar" ? "pin" : it.tipo === "coords" ? "objetivo" : it.tipo === "buscar" ? "buscar" : "pin";
      const etiqueta = it.tipo === "osm" ? t(it.cat) : it.tipo === "lugar" ? "" : "";
      return `<span class="sug-nombre">${icono(ic, "ico ico-sug")}<span>${resaltar(it.nombre, input.value)}</span></span>
        <span class="sug-tipo">${etiqueta ? `<b class="sug-cat">${escapar(etiqueta)}</b> · ` : ""}${escapar(it.detalle ?? "")}</span>`;
    },
    elegir: (it) => elegirSugerencia(input, it),
  });
}

function elegirSugerencia(input, it) {
  const aviso = document.getElementById("aviso-busqueda");
  aviso.hidden = true;
  if (it.tipo === "buscar") return buscarDireccion(input.value.trim());
  if (it.tipo === "region") { input.value = ""; return seleccionarZona(it.lugar, { volar: true, origen: "buscador" }); }
  if (it.tipo === "pais") {   // vuelve a todo el país: sin filtros ni punto elegido
    input.value = "";
    for (const n of ["provincia", "partido", "localidad"]) { estado.filtros[n] = null; document.getElementById(`b-${n}`).value = ""; }
    return seleccionar(null, { volar: true, origen: "buscador" });
  }
  if (it.tipo === "lugar") { input.value = ""; return elegirLugar(it.nivel, it.lugar); }
  if (it.tipo === "calle") {
    input.value = `${it.nombre}${it.numero ? "" : " "}`;
    if (it.numero) buscar(); else input.focus();
    return;
  }
  input.value = it.tipo === "osm" ? `${it.nombre}${it.detalle ? `, ${it.detalle.split(" · ").slice(-2).join(", ")}` : ""}` : it.detalle;
  seleccionarPunto(it.punto, { nombre: it.tipo === "osm" ? it.nombre : t("punto_coords")(it.punto[1].toFixed(5), it.punto[0].toFixed(5)), origen: "direccion", volar: true });
}

// ---------- Buscar ----------
function resolverEscritos() {
  const aviso = document.getElementById("aviso-busqueda");
  for (const nivel of ["provincia", "partido", "localidad"]) {
    const input = document.getElementById(`b-${nivel}`), txt = input.value.trim();
    if (!txt) { estado.filtros[nivel] = null; continue; }
    const actual = estado.filtros[nivel];
    if (actual && normalizar(actual.nombre) === normalizar(txt)) continue;
    const l = mejorLugar(nivel, txt);
    if (!l) { aviso.textContent = t("lugar_no_encontrado")(txt); aviso.hidden = false; return false; }
    estado.filtros[nivel] = l; input.value = l.nombre;
  }
  return true;
}

function buscar() {
  const aviso = document.getElementById("aviso-busqueda");
  aviso.hidden = true;
  if (esMovil()) document.activeElement?.blur();
  // Texto pegado en cualquier campo (dirección completa de Google Maps, coordenadas o un link): se interpreta entero
  for (const nivel of ["localidad", "partido", "provincia"]) {
    const input = document.getElementById(`b-${nivel}`), v = input.value.trim();
    if (v && (v.includes(",") || coordenadasDe(v))) { input.value = ""; estado.filtros[nivel] = null; return buscarDireccion(v); }
  }
  if (!resolverEscritos()) return;
  const dir = document.getElementById("b-direccion").value.trim();
  if (dir) return buscarDireccion(dir);
  const l = estado.filtros.localidad || estado.filtros.partido || estado.filtros.provincia;
  if (l) seleccionarZona(l, { volar: true, origen: "buscador" });
}

// ---------- Texto libre: coordenadas, links de Google Maps y direcciones completas ----------
// Coordenadas en los formatos que se copian de Google Maps u otros GPS:
//   "-34.1345, -59.0621" · "-34,1345 -59,0621" · "34.13 S, 59.06 O" · 34°08'04.4"S 59°03'43.5"W · links con @lat,lon o !3d…!4d…
function coordenadasDe(texto) {
  let s = texto.trim();
  try { s = decodeURIComponent(s); } catch (e) { /* texto con % suelto */ }
  s = s.replace(/\s+/g, " ");
  const n = (v) => Number(String(v).replace(",", "."));
  let m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) ?? s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
    ?? s.match(/[?&](?:q|ll|query|destination|center|sll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i);
  if (m) return enArgentina(n(m[1]), n(m[2]));
  const gms = [...s.matchAll(/(\d{1,3}(?:[.,]\d+)?)\s*[°º˚]\s*(?:(\d{1,2}(?:[.,]\d+)?)\s*['′’´]\s*)?(?:(\d{1,2}(?:[.,]\d+)?)\s*(?:"|″|”|''|′′)\s*)?([NSEOW])?/gi)];
  if (gms.length === 2) {
    const v = gms.map(([, g, mi, se, h]) => (/[SOW]/i.test(h ?? "") ? -1 : 1) * (n(g) + n(mi ?? 0) / 60 + n(se ?? 0) / 3600));
    return enArgentina(v[0], v[1], gms.some((x) => x[4]));
  }
  m = s.match(/^(-?\d{1,3}\.\d+)\s*°?\s*([NS])?\s*[,; ]\s*(-?\d{1,3}\.\d+)\s*°?\s*([EOW])?$/i)
    ?? s.match(/^(-?\d{1,3},\d+)\s*°?\s*([NS])?\s*[; ]\s*(-?\d{1,3},\d+)\s*°?\s*([EOW])?$/i);
  if (m) {
    const lat = n(m[1]) * (/S/i.test(m[2] ?? "") ? -1 : 1), lon = n(m[3]) * (/[OW]/i.test(m[4] ?? "") ? -1 : 1);
    return enArgentina(lat, lon, !!(m[2] || m[4]));
  }
  return null;
}
// Ordena latitud y longitud (si vinieron al revés) y acepta valores sin signo, porque la Argentina está al sur y al oeste
function enArgentina(a, b, conHemisferio = true) {
  if (!conHemisferio && a > 0 && b > 0) { a = -a; b = -b; }
  const lat = (v) => v >= -56 && v <= -21, lon = (v) => v >= -75 && v <= -53;
  if (lat(a) && lon(b)) return { punto: [b, a] };
  if (lat(b) && lon(a)) return { punto: [a, b] };
  return { fuera: true };
}

const ALIAS_PROV = { "ciudad autonoma de buenos aires": "CABA", "capital federal": "CABA", "ciudad de buenos aires": "CABA",
  "c.a.b.a.": "CABA", "caba": "CABA", "tierra del fuego": "Tierra del Fuego, Antártida e Islas del Atlántico Sur" };
const sinPrefijo = (p) => p.replace(/^(provincia|pcia\.?|prov\.?|partido|pdo\.?|departamento|dpto\.?|depto\.?|municipio|municipalidad|localidad)\s+(de(l)?\s+)?/i, "").trim();
function lugarExacto(nivel, texto) {
  const q = normalizar(texto);
  if (!q) return null;
  return candidatos(nivel, texto).find((l) => l.clave === q) ?? null;
}
// "Ruta Nacional 9, Colectora Sur Km 87.5, B2800 Zárate, Provincia de Buenos Aires" → lugares en los campos + "Ruta Nacional 9, Colectora Sur Km 87.5"
function interpretarTexto(texto) {
  let partes = texto.split(/[,;\n]+/).map((p) => p.trim())
    .map((p) => p.replace(/^[A-Z]?\d{4}(?:[A-Z]{3})?\s+(?=\D)/i, "").trim())   // código postal delante de la localidad (B2800, 2800, B2800ABC)
    .filter((p) => p && !/^[A-Z]?\d{4}(?:[A-Z]{3})?$/i.test(p) && !/^(rep[uú]blica\s+)?argentina$/i.test(p));
  const hallados = {};
  const anteriores = { ...estado.filtros };
  estado.filtros = { provincia: null, partido: null, localidad: null };
  let fin = partes.length;
  for (let i = partes.length - 1; i >= 0 && i > 0; i--) {   // de atrás hacia adelante; la primera parte siempre es la calle
    const q = sinPrefijo(partes[i]), alias = ALIAS_PROV[normalizar(q)];
    let l;
    if (!hallados.provincia && (l = lugarExacto("provincia", alias ?? q))) { hallados.provincia = l; estado.filtros.provincia = l; fin = i; continue; }
    if (!hallados.localidad && (l = lugarExacto("localidad", q))) { hallados.localidad = l; fin = i; continue; }
    if (!hallados.partido && (l = lugarExacto("partido", q))) { hallados.partido = l; fin = i; continue; }
    break;
  }
  if (partes.length === 1) {   // una sola parte: puede ser solo un lugar ("Zárate") o solo una calle
    const q = sinPrefijo(partes[0]), l = lugarExacto("localidad", q) ?? lugarExacto("partido", q) ?? lugarExacto("provincia", ALIAS_PROV[normalizar(q)] ?? q);
    if (l && !/\d/.test(q)) { hallados[l.nivel === "prov" ? "provincia" : l.nivel === "depto" ? "partido" : "localidad"] = l; fin = 0; }
  }
  if (Object.keys(hallados).length) {
    Object.assign(estado.filtros, hallados);
    for (const nivel of ["provincia", "partido", "localidad"]) document.getElementById(`b-${nivel}`).value = estado.filtros[nivel]?.nombre ?? "";
  } else estado.filtros = anteriores;
  return { calle: partes.slice(0, fin).join(", "), hallados };
}

// OpenStreetMap (Nominatim, gratis): encuentra rutas, colectoras y calles que el servicio oficial no tiene.
// Se prueban variantes cada vez más simples (sin "Km 87,5" ni "Colectora") y solo vale un resultado dentro de la zona.
async function buscarEnOSM(calle, zona) {
  const prov = estado.filtros.provincia, area = zona ?? prov;
  const limpia = calle.replace(/\b(km|kil[oó]metro)\s*\d+([.,]\d+)?/gi, " ").replace(/\b(colectora|lateral|calle\s+colectora)\s*(sur|norte|este|oeste)?\b/gi, " ")
    .replace(/\bs\/n\b/gi, " ").replace(/\s{2,}/g, " ").replace(/\s*,\s*,/g, ",").replace(/^[\s,]+|[\s,]+$/g, "");
  const variantes = [...new Set([calle, limpia, limpia.split(",")[0].trim()].filter((v) => v.length > 2))];
  for (const [k, v] of variantes.entries()) {
    if (k) await demora(1100);   // política de uso de Nominatim: hasta una consulta por segundo
    const params = new URLSearchParams({ q: [v, zona?.nombre, prov?.nombre ?? zona?.provincia].filter(Boolean).join(", "),
      format: "jsonv2", countrycodes: "ar", limit: "5", addressdetails: "1", "accept-language": "es" });
    if (area?.caja) { const [x0, y0, x1, y1] = area.caja, m = 0.03; params.set("viewbox", `${x0 - m},${y1 + m},${x1 + m},${y0 - m}`); params.set("bounded", "1"); }
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`).then((x) => (x.ok ? x.json() : []));
    // Con una localidad elegida, el resultado tiene que ser de esa localidad (o de su partido, si es la cabecera)
    const esLocalidad = zona && (zona.nivel === "gl" || zona.nivel === "loc");
    const deLaZona = (e) => !esLocalidad || ["city", "town", "village", "municipality", "county", "city_district"]
      .some((k) => e.address?.[k] && normalizar(e.address[k]).replace(/^(partido|departamento) de /, "") === zona.clave);
    const x = r.find((e) => e.lat && e.lon && deLaZona(e));
    if (x) return { punto: [Number(x.lon), Number(x.lat)], nombre: calle.split(",")[0], aproximada: k > 0 || /\bkm\b/i.test(calle) };
  }
  return null;
}
const demora = (ms) => new Promise((ok) => setTimeout(ok, ms));

// "¿Era otro?": las demás opciones encontradas, para elegir con un toque
function mostrarOpciones(op, titulo = t("sug_otras")) {
  const aviso = document.getElementById("aviso-busqueda");
  aviso.innerHTML = `<button type="button" class="aviso-cerrar" aria-label="${t("cerrar")}">✕</button><span>${escapar(titulo)}</span> ` + op.slice(1).map((o, k) => `<button type="button" class="btn-texto" data-k="${k + 1}">${escapar(o.nombre)}${o.detalle ? ` <small>(${escapar(o.detalle.split(" · ").slice(-2).join(", "))})</small>` : ""}</button>`).join(" · ");
  aviso.hidden = false;
  aviso.querySelector(".aviso-cerrar").onclick = () => { aviso.hidden = true; };
  // Al elegir una opción el recuadro se cierra (elegirSugerencia lo oculta)
  aviso.querySelectorAll("button[data-k]").forEach((b) => { b.onclick = () => elegirSugerencia(document.getElementById("b-direccion"), op[+b.dataset.k]); });
}

async function buscarDireccionLocal(texto) {
  const m = texto.trim().match(/^(.*?)[\s,]+(\d{1,5})\s*$/);
  if (!m) return null;
  const fichas = fichasCalle(m[1]), numero = Number(m[2]);
  if (!fichas.length) return null;
  const zona = zonaDireccion();
  if (!zona) return { error: "elegir_partido" };
  let mejor = null;
  for (const [, calles] of await callesDeZona(zona)) {
    for (const [nombre, cuadras] of Object.entries(calles)) {
      const pal = nombre.split(" ");
      if (!fichas.every((p) => pal.some((w) => w === p || (p.length >= 4 && w.startsWith(p))))) continue;
      const extra = pal.length - fichas.length;
      let cuadra = null, dist = Infinity;
      for (const c of cuadras) {   // cuadra que contiene el número (o la más cercana)
        const dd = c[1] === 0 ? 5000 : numero < c[0] ? c[0] - numero : numero > c[1] ? numero - c[1] : 0;
        if (dd < dist) { dist = dd; cuadra = c; }
      }
      const puntaje = dist * 10 + extra;
      if (cuadra && (!mejor || puntaje < mejor.puntaje)) mejor = { puntaje, nombre, cuadra, dist };
    }
  }
  if (!mejor) return { error: "no_encontrada" };
  const [desde, hasta, x1, y1, x2, y2] = mejor.cuadra;
  const f = hasta > desde ? limitar((numero - desde) / (hasta - desde), 0, 1) : 0.5;
  return { punto: [(x1 + (x2 - x1) * f) / 1e5, (y1 + (y2 - y1) * f) / 1e5], nombre: `${nombreCalle(mejor.nombre)} ${numero}`, aproximada: mejor.dist > 50 };
}

async function buscarDireccion(texto) {
  const aviso = document.getElementById("aviso-busqueda");
  const avisar = (msj) => { aviso.textContent = msj; aviso.hidden = false; };
  aviso.hidden = true;
  // 0) Coordenadas o link de un mapa
  const c = coordenadasDe(texto);
  if (c?.fuera) return avisar(t("coords_fuera"));
  if (c) {
    const [lon, lat] = c.punto;
    document.getElementById("b-direccion").value = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    return seleccionarPunto(c.punto, { nombre: t("punto_coords")(lat.toFixed(5), lon.toFixed(5)), origen: "direccion", volar: true });
  }
  const { calle } = interpretarTexto(texto);
  document.getElementById("b-direccion").value = calle;
  const zona = zonaDireccion();
  if (!calle) {   // solo lugares: se muestra la zona
    const l = estado.filtros.localidad || estado.filtros.partido || estado.filtros.provincia;
    return l ? seleccionarZona(l, { volar: true, origen: "buscador" }) : avisar(t("dir_no_encontrada"));
  }
  let punto = null, nombre = null, aproximada = false;
  // Empresas cargadas a mano (refinerías, plantas): antes que el servicio de calles, que con un nombre parecido lleva a una calle
  // («axion» → calle Arión)
  if (!/\d/.test(calle)) {
    const propios = lugaresPropios([calle, zona?.nombre].filter(Boolean).join(" "));
    if (propios.length) {
      elegirSugerencia(document.getElementById("b-direccion"), propios[0]);
      if (propios.length > 1) mostrarOpciones(propios);
      return;
    }
  }
  if (!SIN_TESELAS) {
    try {   // 1) servicio oficial de direcciones (versión completa)
      const params = new URLSearchParams({ direccion: calle, max: "10" });
      const p = estado.filtros.partido, prov = estado.filtros.provincia ?? (zona && { nombre: zona.provincia });
      // Partido o departamento: el elegido, o el que contiene a la localidad elegida
      const depto = p?.nivel === "depto" ? p : zona && estado.lugares.find((l) => l.nivel === "depto" && l.provincia === zona.provincia && l.cmus.includes(zona.cmus[0]));
      if (depto) params.set("departamento", depto.nombre);
      if (prov) params.set("provincia", prov.nombre);
      const georef = (extra = {}) => fetch(`https://apis.datos.gob.ar/georef/api/direcciones?${new URLSearchParams({ ...Object.fromEntries(params), ...extra })}`).then((x) => x.json());
      // El servicio puede devolver la misma calle en otro pueblo del partido: con una localidad elegida, solo vale esa localidad
      const enZona = (r) => { if (!zona) return true; const [x0, y0, x1, y1] = zona.caja, m = 0.02;
        return r.ubicacion.lon >= x0 - m && r.ubicacion.lon <= x1 + m && r.ubicacion.lat >= y0 - m && r.ubicacion.lat <= y1 + m; };
      const esLocalidad = zona && (zona.nivel === "gl" || zona.nivel === "loc");
      const mismoPueblo = (x) => [x.localidad_censal?.nombre, x.localidad?.nombre].some((n) => n && normalizar(n) === zona.clave);
      let d = esLocalidad ? await georef({ localidad_censal: zona.nombre }) : null;
      if (!d?.direcciones?.length) d = await georef();
      const r = (d.direcciones ?? []).find((x) => x.ubicacion?.lon != null && enZona(x) && (!esLocalidad || mismoPueblo(x)));
      if (r) { punto = [r.ubicacion.lon, r.ubicacion.lat]; nombre = nombreCalle(r.nomenclatura.split(",")[0]); }
    } catch (err) { /* sin conexión al servicio */ }
    if (!punto && !/\d/.test(calle)) {   // 2) nombres de lugares (empresas, clubes, hospitales…): Photon con opciones para elegir
      const propios = [...lugaresPropios([calle, zona?.nombre].filter(Boolean).join(" ")), ...await buscarBarrios([calle, zona?.nombre].filter(Boolean).join(", ")).catch(() => [])];
      const op = [...propios, ...(await buscarPhoton([calle, zona?.nombre].filter(Boolean).join(" "), { limite: 6 }).catch(() => []))
        .filter((o) => !propios.some((p) => distanciaKm(p.punto, o.punto) < 0.2))];
      if (op.length && (op[0].parecido ?? 1) < 0.75) {   // nada se llama como lo buscado: no llevar a un lugar parecido (p. ej. otro «Toyota»)
        mostrarOpciones([{ nombre: "" }, ...op], t("sug_no_exacto")(calle));
        return;
      }
      if (op.length) {
        elegirSugerencia(document.getElementById("b-direccion"), op[0]);
        if (op.length > 1) mostrarOpciones(op);
        return;
      }
    }
    if (!punto) {   // 2) OpenStreetMap: rutas, colectoras, kilómetros y calles que el servicio oficial no tiene
      const o = await buscarEnOSM(calle, zona).catch(() => null);
      // Un kilómetro de ruta («RN 9 km 80») que OpenStreetMap no ubica: devuelve un punto cualquiera de la ruta, que puede estar
      // a decenas de km. Mejor avisar que llevar a cualquier lado
      if (o?.aproximada && /\bkm\b|kil[oó]metro/i.test(texto)) return avisar(t("dir_km_no"));
      if (o) ({ punto, nombre, aproximada } = o);
    }
  }
  if (!punto) {   // 3) callejero propio (cuadras del INDEC publicadas con la web)
    const loc = await buscarDireccionLocal(calle).catch(() => null);
    if (loc?.punto) { punto = loc.punto; nombre = loc.nombre; if (loc.aproximada) avisar(t("dir_aprox")); }
    else if (zona || estado.filtros.provincia) {   // 4) no se encontró la calle: se muestra el lugar, avisando
      const l = zona || estado.filtros.provincia;
      avisar(t("dir_solo_lugar")(calle, l.nombre));
      return seleccionarZona(l, { volar: true, origen: "buscador" });
    } else {
      estado.dirPendiente = loc?.error === "elegir_partido";   // al elegir el lugar, la búsqueda sigue sola
      return avisar(t(estado.dirPendiente ? "dir_elegir_partido" : "dir_no_encontrada"));
    }
  }
  if (aproximada) avisar(t("dir_aprox_osm"));
  estado.dirPendiente = false;
  seleccionarPunto(punto, { nombre: zona ? `${nombre}, ${zona.nombre}` : nombre, origen: "direccion", volar: true });
}

// Al elegir un punto en el mapa, los campos muestran dónde cae (como un GPS)
function completarCamposDesdePunto(cmu) {
  const m = estado.porCmu.get(cmu);
  if (!m) return;
  const prov = estado.lugares.find((x) => x.nivel === "prov" && x.nombre === m.jur);
  const muni = estado.lugares.find((x) => x.nivel === "gl" && x.cmus[0] === cmu);
  estado.filtros = { provincia: prov ?? null, partido: null, localidad: muni ?? null };
  document.getElementById("b-provincia").value = prov?.nombre ?? "";
  document.getElementById("b-partido").value = "";
  document.getElementById("b-localidad").value = muni?.nombre ?? "";
  actualizarBorrar();
}

function borrarFiltros() {
  estado.filtros = { provincia: null, partido: null, localidad: null };
  estado.dirPendiente = false;
  document.querySelectorAll(".buscador input").forEach((x) => { x.value = ""; });
  document.getElementById("aviso-busqueda").hidden = true;
  seleccionar(null, { volar: true });
}
// Todos los filtros: lugar, búsqueda y período (vuelve a condiciones actuales)
function borrarTodo() {
  borrarFiltros();
  if (estado.modo !== "actual") elegirModo("actual");
}
// "Borrar filtros" visible si hay algún filtro; los casilleros con un filtro activo se marcan con el color de acento
function actualizarBorrar() {
  const campos = [...document.querySelectorAll(".buscador .campo")];
  campos.forEach((c) => { const x = c.querySelector("input"); c.classList.toggle("activo", !!x?.value.trim()); });
  document.querySelector(".campo-radio")?.classList.toggle("activo", estado.sel?.tipo === "punto");
  document.getElementById("periodo-futuro")?.classList.toggle("activo", estado.modo === "futuro");
  const hay = estado.sel || estado.modo !== "actual" || campos.some((c) => c.classList.contains("activo"));
  document.getElementById("btn-borrar").hidden = !hay;
}

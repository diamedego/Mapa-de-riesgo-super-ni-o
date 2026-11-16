// Láminas: la página está armada como un juego de planos. Un riel de solapas a la izquierda cambia la hoja del marco:
// 01 panorama y mapa, 02 simulador 3D, 03 análisis y validación. (La lámina de alertas y ríos se quitó el 15-nov: repetía lo que
// ya muestran las capas y los indicadores de la 01.)

const N_LAMINAS = 3;
let laminaActual = 1;
const dosCifras = (n) => String(n).padStart(2, "0");

// Solo cambia lo que se ve (hojas, solapa marcada, título de la franja y cajetín); no toca la selección ni las capas
function mostrarLamina(n) {
  n = limitar(Number(n) || 1, 1, N_LAMINAS);
  const cambia = n !== laminaActual;
  laminaActual = n;
  document.body.dataset.lamina = String(n);
  document.getElementById("hoja-mapa").hidden = n !== 1;
  document.getElementById("hoja-sim").hidden = n !== 2;
  document.getElementById("hoja-analisis").hidden = n !== 3;
  document.querySelectorAll(".solapa").forEach((b) => b.setAttribute("aria-selected", String(+b.dataset.lamina === n)));
  document.getElementById("lamina-titulo").textContent = `${t("lamina")} ${dosCifras(n)} · ${t(`lam${n}`)}`;
  document.getElementById("caj-lamina").textContent = `${dosCifras(n)} / ${dosCifras(N_LAMINAS)}`;
  document.getElementById("rotulo-movil").textContent = `${dosCifras(n)} · ${t(`lam${n}`)}`;
  if (location.hash !== "#fuentes") history.replaceState(null, "", n === 1 ? location.pathname + location.search : `#lamina-${n}`);
  if (!cambia) return;
  // Los mapas y los gráficos se miden al dibujarse: al volver a verse hay que avisarles el tamaño nuevo
  if (typeof mapa !== "undefined") mapa?.resize();
  SIM.mapa?.resize();
  dispatchEvent(new Event("resize"));
  if (esMovil()) { cerrarBusquedaMovil(); scrollTo({ top: 0 }); }   // celular: cada lámina arranca arriba, debajo de la barra
  else if (!matchMedia("(min-width: 1101px)").matches) document.querySelector(".marco").scrollIntoView({ block: "start" });
}

// ---------- Celular: barra de arriba con la lupa, navegación de abajo e indicadores principales ----------
// La lupa despliega el buscador debajo de la barra; al elegir un lugar se cierra y la página baja hasta el mapa.
function abrirBusquedaMovil(abrir = true) {
  const btn = document.getElementById("btn-lupa");
  document.body.classList.toggle("buscando", abrir);
  btn.setAttribute("aria-expanded", String(abrir));
  btn.setAttribute("aria-label", t(abrir ? "buscar_cerrar" : "buscar_abrir"));
  if (abrir) document.getElementById("b-direccion").focus();
}
const cerrarBusquedaMovil = () => { if (document.body.classList.contains("buscando")) abrirBusquedaMovil(false); };
function irAlMapaMovil() {
  cerrarBusquedaMovil();
  document.activeElement?.blur();
  if (laminaActual !== 1) mostrarLamina(1);
  const vista = document.querySelector(".hoja-mapa .vista"), barra = document.querySelector(".franja").offsetHeight;
  requestAnimationFrame(() => scrollTo({ top: vista.getBoundingClientRect().top + scrollY - barra - 8, behavior: movimientoReducido() ? "auto" : "smooth" }));
}
function pintarVerTodos() {
  const todos = document.getElementById("kpis").classList.contains("todos"), btn = document.getElementById("kpis-todos");
  btn.textContent = t(todos ? "ver_menos" : "ver_todos");
  btn.setAttribute("aria-expanded", String(todos));
}

// Elegir una lámina desde las solapas o un indicador: además de mostrarla, prepara lo que necesita
function irALamina(n) {
  n = limitar(Number(n) || 1, 1, N_LAMINAS);
  mostrarLamina(n);
  if (n === 2) {
    const s = estado.sel, clave = s?.tipo === "punto" ? JSON.stringify([s.punto, s.km]) : null;
    const abierto = !document.getElementById("sim").hidden;
    if (abierto && clave && clave !== SIM.clave) cerrarSimulador();   // se eligió otro punto: se vuelve a simular
    if (document.getElementById("sim").hidden && (s?.tipo === "punto" || s?.tipo === "zona")) usarSimulador();
  }
  if (n === 3) pintarValidacionLamina();
}
function salirSimulador() { cerrarSimulador(); mostrarLamina(1); }

// ---------- Lámina 03: validación del simulador contra el satélite (herramientas/validacion/validar.py) ----------
async function pintarValidacionLamina() {
  const cont = document.getElementById("lam-validacion"), V = await validacion();
  if (!V?.nino) { cont.hidden = true; return; }
  const N = V.nino, filas = [], sinAgua = [];
  for (const [cmu, fs] of Object.entries(V.por_ciudad)) {
    const casos = fs.filter((f) => f.temporada !== "referencia_2022_23" && f.csi != null && f.celdas_obs >= V.min_celdas_obs);
    if (!casos.length) { sinAgua.push(fs[0].ciudad); continue; }
    const prom = (k) => casos.reduce((a, f) => a + (f[k] ?? 0), 0) / casos.length;
    filas.push({ ciudad: fs[0].ciudad, cmu, csi: prom("csi"), jrc: prom("csi_jrc") });
  }
  filas.sort((a, b) => b.csi - a.csi);
  const x = (c) => `${(100 * limitar(c, 0, 1)).toFixed(1)}%`;
  cont.hidden = false;
  cont.innerHTML = `<h3>${t("lam_val_t")}</h3>
    <p>${t("sim_validez_res")(V.ciudades, N.casos, fmt(100 * N.pod_mediana), fmt(100 * N.far_mediana), fmt(N.csi_mediana, 2), fmt(N.csi_jrc_mediana, 2),
      N.mejor_que_jrc, N.spearman_superficie == null ? "–" : fmt(N.spearman_superficie, 2), N.csi_mediana > N.csi_jrc_mediana)}</p>
    <div class="leyenda-lineas"><span><i style="background:var(--s-1)"></i>${t("sim_val_modelo")}</span><span><i style="background:var(--tinta-3)"></i>${t("sim_val_jrc")}</span></div>
    <ul class="lam-val-grilla">${filas.map((f) => `<li><span>${escapar(f.ciudad)}</span>
      <span class="val-pista"><i class="val-jrc" style="left:${x(f.jrc)}" data-tip="${escapar(`<b>${escapar(f.ciudad)}</b><span>${t("sim_val_jrc")}: CSI ${fmt(f.jrc, 2)}</span>`)}"></i>
        <i class="val-mod" style="left:${x(f.csi)}" data-tip="${escapar(`<b>${escapar(f.ciudad)}</b><span>${t("sim_val_modelo")}: CSI ${fmt(f.csi, 2)}</span>`)}"></i></span>
      <b>${fmt(f.csi, 2)}</b></li>`).join("")}</ul>
    ${sinAgua.length ? `<p>${t("sim_val_sin_agua")(sinAgua.map(escapar).join(", "))}</p>` : ""}
    <p>${t("sim_val_nota")}</p><p>${t("sim_limites")}</p>`;
  tipsEn(cont);
}

// Lo que depende del idioma o de los datos: título de la franja, fecha del cajetín y las láminas 03 y 04 si están a la vista
function refrescarLaminas() {
  mostrarLamina(laminaActual);
  pintarVerTodos();
  const cal = String(estado.datos.resumen?.calculado ?? "");
  document.getElementById("caj-fecha").textContent = /^\d{4}-\d{2}-\d{2}/.test(cal) ? `${cal.slice(8, 10)}-${cal.slice(5, 7)}-${cal.slice(2, 4)}` : "–";
  if (laminaActual === 3) pintarValidacionLamina();
  if (laminaActual === 2 && SIM.datos) { pintarPanelSimulador(SIM.datos); if (SIM.modelo?.frames.length) { mostrarHora(); pintarPieSim(); } }   // textos del simulador en el idioma nuevo
}

function iniciarLaminas() {
  document.querySelectorAll(".solapa").forEach((b) => { b.onclick = () => irALamina(+b.dataset.lamina); });
  document.getElementById("sim-ir-mapa").onclick = () => mostrarLamina(1);
  document.getElementById("btn-lupa").onclick = () => abrirBusquedaMovil(!document.body.classList.contains("buscando"));
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") cerrarBusquedaMovil(); });
  document.getElementById("kpis-todos").onclick = () => { document.getElementById("kpis").classList.toggle("todos"); pintarVerTodos(); };
  document.getElementById("detalle-sim").onclick = () => irALamina(2);   // igual que la solapa «Simulador 3D»
  document.getElementById("detalle-lienzo").addEventListener("click", (ev) => {   // también un clic en cualquier parte del círculo
    const k = detalleCirculo, r = ev.currentTarget.getBoundingClientRect();
    if (k && Math.hypot(ev.clientX - r.left - k.x, ev.clientY - r.top - k.y) <= Math.max(k.r, 24)) irALamina(2);
  });
  const deHash = (hash = location.hash) => { const m = /^#lamina-(\d)$/.exec(hash); if (m) irALamina(+m[1]); };
  addEventListener("hashchange", () => deHash());
  const inicial = location.hash;   // se guarda ahora: al pintar la lámina 01 el enlace queda sin ancla
  return () => deHash(inicial);
}

// ---------- Plano de la lámina 01: retícula con grados, recuadro «A», escala gráfica y detalle del Litoral ----------
const CAJA_A = [-63, -31.6, -53.4, -24];   // oeste, sur, este, norte
let cargaTopo = null;
const cargarTopojson = () => (cargaTopo ??= window.topojson ? Promise.resolve() : new Promise((ok, mal) => {
  const sc = document.createElement("script"); sc.src = "https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js"; sc.onload = ok; sc.onerror = mal; document.head.appendChild(sc);
}));
function iniciarPlano() {
  if (mapa.getSource("reticula")) return;
  const [o, s, e, n] = CAJA_A;
  // Retícula idéntica a la lámina aprobada: cada 5°, petróleo al 30 %, 0,6 px, rayas de 3 px y huecos de 3 px (MapLibre mide las
  // rayas en anchos de línea: 5 × 0,6 = 3 px); debajo de la Argentina (no la cruza). Las líneas se recortan en actualizarReticula
  mapa.addSource("reticula", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  mapa.addLayer({ id: "reticula", type: "line", source: "reticula", paint: { "line-color": css("--cian"), "line-opacity": 0.3, "line-width": 0.6, "line-dasharray": [5, 5] } },
    mapa.getLayer("sin-datos") ? "sin-datos" : undefined);
  // Continentes con fondo liso (Natural Earth 1:50 M, del color de la hoja), encima de la retícula y debajo de la Argentina:
  // la cuadrícula y la retícula quedan solo en el océano. Los países vecinos, bordeados con un filete gris fino (límites y costas)
  Promise.all([fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json").then((r) => r.json()), cargarTopojson()]).then(([tp]) => {
    if (mapa.getSource("tierra")) return;
    const debajo = mapa.getLayer("sin-datos") ? "sin-datos" : undefined;
    mapa.addSource("tierra", { type: "geojson", data: topojson.feature(tp, tp.objects.land) });
    mapa.addLayer({ id: "tierra", type: "fill", source: "tierra", paint: { "fill-color": css("--superficie") } }, debajo);
    mapa.addSource("limites-paises", { type: "geojson", data: topojson.mesh(tp, tp.objects.countries) });
    mapa.addLayer({ id: "limites-paises", type: "line", source: "limites-paises", paint: { "line-color": css("--tinta-3"), "line-opacity": 0.85,
      "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 8, 1] } }, debajo);
  }).catch((e) => console.warn("tierra", e));
  mapa.addSource("caja-a", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: [[o, n], [e, n], [e, s], [o, s], [o, n]] }, properties: {} } });
  mapa.addLayer({ id: "caja-a", type: "line", source: "caja-a", paint: { "line-color": css("--tinta-1"), "line-width": 1.2, "line-dasharray": [4, 2.5] } });
  mapa.on("move", actualizarReticula);
  mapa.on("moveend", dibujarDetalle);
  mapa.on("resize", () => { actualizarReticula(); dibujarDetalle(); });
  actualizarReticula();
}
function actualizarReticula() {
  const cont = document.getElementById("reticula");
  if (!cont || typeof mapa === "undefined" || !mapa.getSource?.("reticula")) return;
  const W = cont.clientWidth, H = cont.clientHeight, c = mapa.getCenter(), vis = verPlanoNacional();
  let html = "";
  const lineas = [];
  if (vis) {
    // Como la lámina: meridianos desde 14 px del borde de arriba (arriba, el rótulo, solo a la izquierda del cuadro de
    // referencias) y paralelos desde 30 px del borde izquierdo (ahí, el rótulo)
    const refs = document.getElementById("refs"), limRot = refs && !refs.hidden ? refs.getBoundingClientRect().left - cont.getBoundingClientRect().left : W;
    const geo = (x, y) => mapa.unproject([x, y]).toArray();
    let ultimoRot = -Infinity;   // un rótulo cada 44 px como mínimo (en el celular, 5° ocupan menos que el texto)
    for (let lon = -80; lon <= -30; lon += 5) {
      const x = mapa.project([lon, c.lat]).x;
      if (x < 30 || x > W - 4) continue;
      lineas.push([[lon, geo(x, 14)[1]], [lon, geo(x, H)[1]]]);
      if (x < limRot && x - ultimoRot >= 44 && (ultimoRot = x)) html += `<span class="ret-lon" style="left:${x.toFixed(1)}px">${-lon}° ${t("oeste_corto")}</span>`;
    }
    for (let lat = -20; lat >= -60; lat -= 5) {
      const y = mapa.project([c.lng, lat]).y;
      if (y < 16 || y > H - 4) continue;
      lineas.push([[geo(30, y)[0], lat], [geo(W, y)[0], lat]]);
      html += `<span class="ret-lat" style="top:${y.toFixed(1)}px">${-lat}° S</span>`;
    }
    const p = mapa.project([CAJA_A[2], CAJA_A[3]]);
    if (estado.capa === "riesgo") html += `<b class="ret-a" style="left:${p.x.toFixed(0)}px;top:${p.y.toFixed(0)}px">A</b>`;
  }
  cont.innerHTML = html;
  mapa.getSource("reticula").setData({ type: "FeatureCollection", features: lineas.map((co) => ({ type: "Feature", geometry: { type: "LineString", coordinates: co }, properties: {} })) });
  for (const id of ["reticula", "caja-a"]) if (mapa.getLayer(id)) mapa.setLayoutProperty(id, "visibility", vis && (id === "reticula" || estado.capa === "riesgo") ? "visible" : "none");
  // Escala gráfica de 500 km (o 50 km de cerca) en la leyenda
  const km = document.getElementById("ley-km");
  if (km) {
    const a = mapa.project([c.lng, c.lat]), b = mapa.project([c.lng + 1, c.lat]), pxKm = Math.abs(b.x - a.x) / (111.32 * Math.cos((c.lat * Math.PI) / 180));
    const largo = [500, 200, 100, 50, 20, 10, 5, 2, 1].find((k) => k * pxKm <= 120) ?? 1;
    km.querySelector("i").style.width = `${(largo * pxKm).toFixed(0)}px`; km.querySelector("span").textContent = `${largo} km`;
  }
}
// La retícula y el detalle se ven con el país entero en pantalla (sin zona elegida y con poco zoom)
const verPlanoNacional = () => !estado.sel && mapa.getZoom() < 5.6;

let detalleCirculo = null;   // círculo elegido en el lienzo del detalle (para abrir el simulador con un clic adentro)
function dibujarDetalle() {
  const caja = document.getElementById("detalle"), cv = document.getElementById("detalle-lienzo");
  if (!caja || typeof mapa === "undefined" || !estado.riesgo) return;
  // Sin selección: el Litoral (recuadro A). Con un punto, una localidad, un partido o una provincia: lo elegido
  const sel = estado.sel, ver = estado.capa === "riesgo" && (sel || verPlanoNacional());   // también en el celular (debajo del mapa)
  caja.hidden = !ver;
  if (!ver) return;
  let cajaD = CAJA_A, titulo = t("detalle_litoral");
  if (sel?.tipo === "punto") { cajaD = cajaCirculo(sel.punto, sel.km * 1.4); titulo = sel.nombre ?? estado.porCmu.get(sel.cmu)?.nam ?? t("punto_en_mapa"); }
  else if (sel?.tipo === "zona") { const [a, b, c2, d] = sel.lugar.caja, m = Math.max(c2 - a, d - b) * 0.08; cajaD = [a - m, b - m, c2 + m, d + m]; titulo = sel.lugar.nombre; }
  document.getElementById("detalle-tit").textContent = titulo;
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  if (!r.width) return;
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  const c = cv.getContext("2d"); c.scale(dpr, dpr);
  const [o, s, e, n] = cajaD, k = Math.cos(((s + n) / 2) * Math.PI / 180);
  const esc = Math.max(r.width / ((e - o) * k), r.height / (n - s)), ox = (r.width - (e - o) * k * esc) / 2, oy = (r.height - (n - s) * esc) / 2;
  const X = (lon) => ox + (lon - o) * k * esc, Y = (lat) => oy + (n - lat) * esc;
  const traza = (anillo) => { anillo.forEach(([lon, lat], i) => (i ? c.lineTo(X(lon), Y(lat)) : c.moveTo(X(lon), Y(lat)))); c.closePath(); };
  const poligonos = (g) => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
  c.clearRect(0, 0, r.width, r.height);   // fondo liso de la hoja, sin cuadrícula (como la lámina aprobada)
  // Retícula idéntica a la lámina: petróleo al 30 %, 0,6 px, rayas de 3 px; cada 2° en el Litoral
  c.strokeStyle = "rgba(12,90,105,.3)"; c.lineWidth = 0.6; c.setLineDash([3, 3]);
  const paso = [5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01].find((p) => (e - o) / p >= 3) ?? 0.01;   // unas 4 líneas por lado
  for (let lon = Math.ceil(o / paso) * paso; lon <= e; lon += paso) { c.beginPath(); c.moveTo(X(lon), 0); c.lineTo(X(lon), r.height); c.stroke(); }
  for (let lat = Math.ceil(s / paso) * paso; lat <= n; lat += paso) { c.beginPath(); c.moveTo(0, Y(lat)); c.lineTo(r.width, Y(lat)); c.stroke(); }
  c.setLineDash([]); c.globalAlpha = 1;
  const idx = indicesVista(), cortes = CORTES, colores = [1, 2, 3, 4, 5].map((i) => css(`--r${i}`));
  for (const f of estado.datos.municipios.features) {
    const cj = cajaDe(f.geometry);
    if (cj[2] < o || cj[0] > e || cj[3] < s || cj[1] > n) continue;
    const reg = estado.riesgo.cmu[f.properties.cmu], v = reg ? Math.max(...idx.map((i) => reg.r[i] ?? -1)) : -1;
    c.beginPath(); poligonos(f.geometry).forEach((p) => p.forEach(traza));
    c.fillStyle = v < 0 ? css("--sin-datos") : colores[cortes.filter((x) => v >= x).length]; c.fill("evenodd");
  }
  // De cerca (menos de ~0,6°): radios censales con su riesgo, si ya están cargados
  if (e - o < 0.6) for (const f of estado.radios ?? []) {
    const cj = cajaDe(f.geometry), M = estado.riesgo.dias;
    if (cj[2] < o || cj[0] > e || cj[3] < s || cj[1] > n || f.properties[`r_${M[0]}`] == null) continue;
    const v = Math.max(...idx.map((i) => Number(f.properties[`r_${M[i]}`]) || 0));
    c.beginPath(); poligonos(f.geometry).forEach((p) => p.forEach(traza)); c.fillStyle = colores[cortes.filter((x) => v >= x).length]; c.fill("evenodd");
    c.strokeStyle = "rgba(255,255,255,0.6)"; c.lineWidth = 0.5; c.stroke();
  }
  // Lo elegido: el círculo o el borde de la zona
  c.strokeStyle = css("--cian"); c.lineWidth = 2;
  const irSim = document.getElementById("detalle-sim");
  irSim.hidden = sel?.tipo !== "punto";
  detalleCirculo = null;
  if (sel?.tipo === "punto") {
    const R = (sel.km / 111.32) * esc, px = X(sel.punto[0]), py = Y(sel.punto[1]);
    // El círculo, velado en gris: es la zona que se simula; todo el círculo lleva al simulador 3D
    c.beginPath(); c.arc(px, py, R, 0, 7); c.fillStyle = "rgba(38, 44, 43, 0.28)"; c.fill(); c.stroke();
    detalleCirculo = { x: px, y: py, r: R };
    // El punto elegido (con un pulso en CSS) y, debajo, el llamado al simulador 3D (igual que la solapa 02)
    c.beginPath(); c.arc(px, py, 4, 0, 7); c.fillStyle = css("--cian"); c.fill(); c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.stroke();
    irSim.style.left = `${px.toFixed(0)}px`; irSim.style.top = `${(cv.offsetTop + py).toFixed(0)}px`;
  }
  else if (sel?.tipo === "zona") for (const f of estado.datos.municipios.features) if (sel.lugar.cmus.includes(f.properties.cmu)) { c.beginPath(); poligonos(f.geometry).forEach((p) => p.forEach(traza)); c.stroke(); }
  cv.style.cursor = detalleCirculo ? "pointer" : "";
  c.strokeStyle = css("--tinta-1"); c.globalAlpha = 0.55; c.lineWidth = 0.9; c.lineJoin = "round";
  for (const f of estado.datos.provincias.features) { c.beginPath(); poligonos(f.geometry).forEach((p) => p.forEach(traza)); c.stroke(); }
  c.globalAlpha = 1;
  const tono = { evacuacion: css("--critico"), alerta: css("--serio") };
  for (const f of estado.datos.estaciones.features) {
    const [lon, lat] = f.geometry.coordinates, q = f.properties.estado;
    if (lon < o || lon > e || lat < s || lat > n || !q) continue;
    c.beginPath(); c.arc(X(lon), Y(lat), q === "normal" ? 3.2 : 4.6, 0, 7); c.fillStyle = tono[q] ?? css("--rio-normal"); c.fill();
    c.strokeStyle = "#fff"; c.lineWidth = 1; c.stroke();
  }
}

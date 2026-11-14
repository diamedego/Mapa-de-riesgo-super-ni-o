// Láminas: la página está armada como un juego de planos. Un riel de solapas a la izquierda cambia la hoja del marco:
// 01 panorama y mapa, 02 simulador 3D, 03 alertas y ríos (el mismo mapa con otra lectura al costado), 04 análisis y validación.

const N_LAMINAS = 4;
let laminaActual = 1;
const dosCifras = (n) => String(n).padStart(2, "0");

// Solo cambia lo que se ve (hojas, solapa marcada, título de la franja y cajetín); no toca la selección ni las capas
function mostrarLamina(n) {
  n = limitar(Number(n) || 1, 1, N_LAMINAS);
  const cambia = n !== laminaActual;
  laminaActual = n;
  document.body.dataset.lamina = String(n);
  document.getElementById("hoja-mapa").hidden = n !== 1 && n !== 3;
  document.getElementById("hoja-sim").hidden = n !== 2;
  document.getElementById("hoja-analisis").hidden = n !== 4;
  document.querySelectorAll(".solapa").forEach((b) => b.setAttribute("aria-selected", String(+b.dataset.lamina === n)));
  document.getElementById("lamina-titulo").textContent = `${t("lamina")} ${dosCifras(n)} · ${t(`lam${n}`)}`;
  document.getElementById("caj-lamina").textContent = `${dosCifras(n)} / ${dosCifras(N_LAMINAS)}`;
  if (location.hash !== "#fuentes") history.replaceState(null, "", n === 1 ? location.pathname + location.search : `#lamina-${n}`);
  if (!cambia) return;
  if (n === 3) pintarLamina3();
  // Los mapas y los gráficos se miden al dibujarse: al volver a verse hay que avisarles el tamaño nuevo
  if (typeof mapa !== "undefined") mapa?.resize();
  SIM.mapa?.resize();
  dispatchEvent(new Event("resize"));
  if (!matchMedia("(min-width: 1101px)").matches) document.querySelector(".marco").scrollIntoView({ block: "start" });
}

// Elegir una lámina desde las solapas o un indicador: además de mostrarla, prepara lo que necesita
function irALamina(n) {
  n = limitar(Number(n) || 1, 1, N_LAMINAS);
  mostrarLamina(n);
  if (n === 2) {
    const s = estado.sel, clave = s?.tipo === "punto" ? JSON.stringify([s.punto, s.km]) : null;
    const abierto = !document.getElementById("sim").hidden;
    if (abierto && clave && clave !== SIM.clave) cerrarSimulador();   // se eligió otro punto: se vuelve a simular
    if (document.getElementById("sim").hidden && (s?.tipo === "punto" || (s?.tipo === "zona" && s.lugar.nivel !== "prov"))) usarSimulador();
  }
  // La lámina 03 enciende las alertas del SMN; al salir vuelven a como estaban (por defecto, apagadas)
  if (n === 3) { estado.alertasAntes ??= estado.verAlertas; estado.verAlertas = true; estado.verRios = true; estado.capa = "riesgo"; elegirModo("actual"); }
  else if (estado.alertasAntes != null) { estado.verAlertas = estado.alertasAntes; estado.alertasAntes = null; actualizarTodo(); }
  if (n === 4) pintarValidacionLamina();
}
function salirSimulador() { cerrarSimulador(); mostrarLamina(1); }

// ---------- Lámina 03: alertas del SMN y ríos del INA de lo que esté elegido ----------
function pintarLamina3() {
  const cont = document.getElementById("lamina-3");
  if (!cont || !estado.riesgo) return;
  const alertas = alertasSel(), lugar = alcanceKpis().nombre;
  const ests = estacionesSel().filter((e) => e.estado && e.estado !== "null")
    .sort((a, b) => (pesoEstado[b.estado] ?? 0) - (pesoEstado[a.estado] ?? 0) || (a.km ?? 0) - (b.km ?? 0) || b.h / (b.nivel_alerta || 1) - a.h / (a.nivel_alerta || 1));
  const cuenta = (k) => ests.filter((e) => e.estado === k).length, ev = cuenta("evacuacion"), al = cuenta("alerta"), no = cuenta("normal");
  const NIVELES = ["amarilla", "naranja", "roja"];
  const peor = NIVELES.slice().reverse().find((n) => alertas.some((a) => a.nivel === n));
  const kpi = (etq, valor, sev, extra = "") => `<div class="kpi" data-sev="${sev}"${extra}><span class="kpi-cab">${etq}</span><span class="kpi-valor">${fmt(valor)}</span></div>`;
  // Alertas por tipo, con el nivel en el color oficial del SMN
  const tipos = [...new Set(alertas.map((a) => a.tipo))].map((tipo) => ({ tipo, n: NIVELES.map((n) => alertas.filter((a) => a.tipo === tipo && a.nivel === n).length) }))
    .sort((a, b) => sumar(b.n) - sumar(a.n));
  const tope = Math.max(1, ...tipos.map((x) => sumar(x.n)));
  const barras = tipos.map((x) => `<li><span>${escapar(t(`alerta_${x.tipo}`))}</span>
    <span class="l3-pista" style="width:${(100 * sumar(x.n)) / tope}%">${x.n.map((v, i) => (v ? `<i style="flex:${v};background:var(--alerta-${NIVELES[i]})"
      data-tip="${escapar(`<b>${escapar(t(`alerta_${x.tipo}`))}</b><span>${capitalizar(t(`nivel_alerta_${NIVELES[i]}`))}: ${fmt(v)} ${t("l3_areas")}</span>`)}"></i>` : "")).join("")}</span>
    <b>${fmt(sumar(x.n))}</b></li>`).join("");
  const rios = ests.map((e, i) => {
    const max = Math.max(e.nivel_evacuacion ?? e.nivel_alerta, e.h) * 1.12, pos = (v) => `${limitar((100 * v) / max, 0, 100)}%`;
    return `<li class="rio" tabindex="0" role="button" data-i="${i}"><div class="rio-cab"><b>${escapar(e.estacion)}</b> <span>${escapar(nombreRio(e.rio))}${e.km != null ? ` · ${fmt(e.km)} km` : ""}</span>
      <span class="pill sem-${e.estado === "evacuacion" ? "critico" : e.estado === "alerta" ? "atencion" : "ok"}">${t(`rio_${e.estado}`)}</span></div>
      <div class="rio-barra"><span class="rio-nivel" style="width:${pos(e.h)}"></span><i class="umbral al" style="left:${pos(e.nivel_alerta)}"></i>${e.nivel_evacuacion ? `<i class="umbral ev" style="left:${pos(e.nivel_evacuacion)}"></i>` : ""}</div>
      <div class="rio-pie"><span>${fmt(e.h, 2)} m ${e.dh != null ? `(${e.dh > 0 ? "+" : ""}${fmt(e.dh, 2)} m 24 h)` : ""}</span><span>${t("alerta_m")} ${fmt(e.nivel_alerta, 1)} · ${t("evac_m")} ${fmt(e.nivel_evacuacion, 1)}</span></div></li>`;
  }).join("");
  const act = actualizaciones();
  cont.innerHTML = `<div class="lec-cabeza">
      <h2 class="titular">${t("l3_titular")(ev, al, alertas.length)}</h2>
      <p class="bajada">${t("l3_bajada")(escapar(lugar))}</p>
      <div class="kpis l3-kpis">${kpi(t("l3_k_alertas"), alertas.length, peor === "roja" || peor === "naranja" ? "critico" : peor ? "atencion" : "ok", peor ? ` data-alerta="${peor}"` : "")}
        ${kpi(t("l3_k_evac"), ev, ev ? "critico" : "ok")}${kpi(t("l3_k_alerta"), al, al ? "atencion" : "ok")}${kpi(t("l3_k_normal"), no, "ok")}</div>
    </div>
    <section class="l3-bloque"><h3 class="l3-tit">${t("l3_alertas_t")}<small>SMN${act.alertas ? ` · ${act.alertas}` : ""}</small></h3>
      ${tipos.length ? `<ul class="l3-barras">${barras}</ul>
        <div class="l3-ley">${NIVELES.map((n) => `<span><i style="background:var(--alerta-${n})"></i>${capitalizar(t(`nivel_alerta_${n}`))}</span>`).join("")}</div>
        <p class="l3-nota">${t("l3_nota_alertas")}</p>` : `<p class="l3-nota">${t("sin_alertas")}</p>`}</section>
    <section class="l3-bloque"><h3 class="l3-tit">${t("l3_rios_t")}<small>INA${act.ina ? ` · ${act.ina}` : ""} · ${fmt(ests.length)}</small></h3>
      ${ests.length ? `<ul class="rios">${rios}</ul><p class="l3-nota">${t("fuente_ina")}</p>` : `<p class="l3-nota">${t("l3_sin_rios")}</p>`}</section>`;
  tipsEn(cont);
  cont.querySelectorAll(".rio").forEach((li) => {
    const ir = () => {
      mapa.flyTo({ center: ests[+li.dataset.i].c, zoom: Math.max(mapa.getZoom(), 8.5), essential: true });
      if (!matchMedia("(min-width: 1101px)").matches) document.getElementById("mapa").scrollIntoView({ behavior: "smooth", block: "center" });
    };
    li.onclick = ir;
    li.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ir(); } };
  });
}

// ---------- Lámina 04: validación del simulador contra el satélite (herramientas/validacion/validar.py) ----------
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
  const cal = String(estado.datos.resumen?.calculado ?? "");
  document.getElementById("caj-fecha").textContent = /^\d{4}-\d{2}-\d{2}/.test(cal) ? `${cal.slice(8, 10)}-${cal.slice(5, 7)}-${cal.slice(2, 4)}` : "–";
  if (laminaActual === 4) pintarValidacionLamina();
  if (laminaActual === 2 && SIM.datos) { pintarPanelSimulador(SIM.datos); if (SIM.modelo?.frames.length) { mostrarHora(); pintarPieSim(); } }   // textos del simulador en el idioma nuevo
}

function iniciarLaminas() {
  document.querySelectorAll(".solapa").forEach((b) => { b.onclick = () => irALamina(+b.dataset.lamina); });
  document.getElementById("sim-ir-mapa").onclick = () => mostrarLamina(1);
  const deHash = (hash = location.hash) => { const m = /^#lamina-(\d)$/.exec(hash); if (m) irALamina(+m[1]); };
  addEventListener("hashchange", () => deHash());
  const inicial = location.hash;   // se guarda ahora: al pintar la lámina 01 el enlace queda sin ancla
  return () => deHash(inicial);
}

// ---------- Plano de la lámina 01: retícula con grados, recuadro «A», escala gráfica y detalle del Litoral ----------
const CAJA_A = [-63, -31.6, -53.4, -24];   // oeste, sur, este, norte
function iniciarPlano() {
  if (mapa.getSource("reticula")) return;
  const lineas = [];
  for (let lon = -75; lon <= -50; lon += 5) lineas.push([[lon, -58], [lon, -18]]);
  for (let lat = -20; lat >= -55; lat -= 5) lineas.push([[-78, lat], [-48, lat]]);
  const [o, s, e, n] = CAJA_A;
  mapa.addSource("reticula", { type: "geojson", data: { type: "FeatureCollection", features: lineas.map((c) => ({ type: "Feature", geometry: { type: "LineString", coordinates: c }, properties: {} })) } });
  mapa.addLayer({ id: "reticula", type: "line", source: "reticula", paint: { "line-color": css("--cian"), "line-opacity": 0.3, "line-width": 0.6, "line-dasharray": [3, 3] } });
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
  if (vis) {
    for (let lon = -75; lon <= -50; lon += 5) { const x = mapa.project([lon, c.lat]).x; if (x > 40 && x < W - 30) html += `<span class="ret-lon" style="left:${x.toFixed(0)}px">${-lon}° ${t("oeste_corto")}</span>`; }
    for (let lat = -20; lat >= -55; lat -= 5) { const y = mapa.project([c.lng, lat]).y; if (y > 50 && y < H - 20) html += `<span class="ret-lat" style="top:${y.toFixed(0)}px">${-lat}° S</span>`; }
    const p = mapa.project([CAJA_A[2], CAJA_A[3]]);
    if (estado.capa === "riesgo") html += `<b class="ret-a" style="left:${p.x.toFixed(0)}px;top:${p.y.toFixed(0)}px">A</b>`;
  }
  cont.innerHTML = html;
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

function dibujarDetalle() {
  const caja = document.getElementById("detalle"), cv = document.getElementById("detalle-lienzo");
  if (!caja || typeof mapa === "undefined" || !estado.riesgo) return;
  // Sin selección: el Litoral (recuadro A). Con un punto, una localidad, un partido o una provincia: lo elegido
  const sel = estado.sel, ver = estado.capa === "riesgo" && innerWidth > 1100 && (sel || verPlanoNacional());
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
  c.fillStyle = css("--superficie"); c.fillRect(0, 0, r.width, r.height);
  // Retícula cada 2°
  c.strokeStyle = css("--cian"); c.globalAlpha = 0.3; c.lineWidth = 0.6; c.setLineDash([3, 3]);
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
    const cj = cajaDe(f.geometry), M = estado.riesgo.meses;
    if (cj[2] < o || cj[0] > e || cj[3] < s || cj[1] > n || f.properties[`r_${M[0]}`] == null) continue;
    const v = Math.max(...idx.map((i) => Number(f.properties[`r_${M[i]}`]) || 0));
    c.beginPath(); poligonos(f.geometry).forEach((p) => p.forEach(traza)); c.fillStyle = colores[cortes.filter((x) => v >= x).length]; c.fill("evenodd");
    c.strokeStyle = "rgba(255,255,255,0.6)"; c.lineWidth = 0.5; c.stroke();
  }
  // Lo elegido: el círculo o el borde de la zona
  c.strokeStyle = css("--cian"); c.lineWidth = 2;
  if (sel?.tipo === "punto") { const R = (sel.km / 111.32) * esc; c.beginPath(); c.arc(X(sel.punto[0]), Y(sel.punto[1]), R, 0, 7); c.stroke(); }
  else if (sel?.tipo === "zona") for (const f of estado.datos.municipios.features) if (sel.lugar.cmus.includes(f.properties.cmu)) { c.beginPath(); poligonos(f.geometry).forEach((p) => p.forEach(traza)); c.stroke(); }
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

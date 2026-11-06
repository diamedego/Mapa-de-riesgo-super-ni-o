// Simulador de lluvia en 3D: dentro del círculo elegido, con el relieve real (sin exagerar), muestra hasta dónde
// llegaría el agua según los milímetros de lluvia. Modelo de llenado de bajos (orientativo):
//   1. Relieve: teselas de elevación (AWS Terrain Tiles, SRTM ~30 m), suavizado 5 × 5. Ríos y lagunas (del mapa
//      base) quedan fuera: la lluvia que cae ahí se la lleva el río y no son "bajos" que se llenan.
//   2. Altura relativa: cuánto está cada lugar de tierra por encima del bajo más cercano (a 500 m y a 2,5 km).
//   3. Agua: la lluvia que escurre (se descuentan 10 mm que absorbe el suelo y se toma un coeficiente de
//      escorrentía de 0,5) llena primero los lugares más bajos; el nivel se busca conservando el volumen.
//   4. Personas: población de cada radio censal × fracción de su superficie con agua de 10 cm o más.
// Solo en la versión completa (las teselas de relieve vienen de un servidor externo).

const SIM = { mapa: null, mm: 0, reproduciendo: 0, datos: null };
const PERDIDA_MM = 10, ESCORRENTIA = 0.5, AGUA_MIN = 0.1, PROF_MAX = 1.5;   // ningún bajo junta más de 1,5 m: el resto desborda

function abrirSimulador() {
  const s = estado.sel;
  if (s?.tipo !== "punto") return;
  const caja = document.getElementById("sim");
  caja.hidden = false;
  document.body.classList.add("sim-abierto");
  document.getElementById("sim-titulo").textContent = s.nombre ?? t("punto_en_mapa");
  document.getElementById("sim-sub").textContent = `${t("sel_circulo")(s.km)} · ${estado.porCmu.get(s.cmu)?.nam ?? ""}`;
  document.getElementById("sim-cerrar").onclick = cerrarSimulador;
  caja.onkeydown = (e) => { if (e.key === "Escape") cerrarSimulador(); };
  document.getElementById("sim-cerrar").focus();
  if (SIN_TESELAS) {
    document.getElementById("sim-panel").innerHTML = `<p class="sim-aviso">${t("sim_sin_relieve")}</p>
      <a class="btn-primario" href="https://mapa-de-riesgo-super-nino.diamedego.workers.dev/" target="_blank" rel="noopener">${t("version_completa")} ↗</a>`;
    return;
  }
  SIM.mm = 0;
  pintarPanelSimulador(null);
  prepararSimulacion(s).catch((e) => {
    document.getElementById("sim-estado").textContent = t("sim_error");
    console.error(e);
  });
}

function cerrarSimulador() {
  cancelAnimationFrame(SIM.reproduciendo); SIM.reproduciendo = 0;
  document.getElementById("sim").hidden = true;
  document.body.classList.remove("sim-abierto");
  SIM.mapa?.remove(); SIM.mapa = null; SIM.datos = null;
}

// ---------- Relieve: mosaico de teselas Terrarium ----------
const lonDeX = (x, z) => (x / 2 ** z) * 360 - 180;
const latDeY = (y, z) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;
const xDeLon = (lon, z) => ((lon + 180) / 360) * 2 ** z;
const yDeLat = (lat, z) => ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z;

async function relieveDe(caja) {
  const [x0, y0, x1, y1] = caja;
  let z = 13;   // ~15 m por píxel en la Argentina; se baja si el área necesitaría más de 5 × 5 teselas
  while (z > 9 && (Math.floor(xDeLon(x1, z)) - Math.floor(xDeLon(x0, z)) > 4 || Math.floor(yDeLat(y0, z)) - Math.floor(yDeLat(y1, z)) > 4)) z--;
  const tx0 = Math.floor(xDeLon(x0, z)), tx1 = Math.floor(xDeLon(x1, z)), ty0 = Math.floor(yDeLat(y1, z)), ty1 = Math.floor(yDeLat(y0, z));
  const W = (tx1 - tx0 + 1) * 256, H = (ty1 - ty0 + 1) * 256;
  const cv = new OffscreenCanvas(W, H), ctx = cv.getContext("2d", { willReadFrequently: true });
  const teselas = [];
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) teselas.push([tx, ty]);
  await Promise.all(teselas.map(async ([tx, ty]) => {
    const r = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${tx}/${ty}.png`);
    if (!r.ok) throw new Error(`relieve ${r.status}`);
    ctx.drawImage(await createImageBitmap(await r.blob()), (tx - tx0) * 256, (ty - ty0) * 256);
  }));
  const px = ctx.getImageData(0, 0, W, H).data, h = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) h[i] = px[4 * i] * 256 + px[4 * i + 1] + px[4 * i + 2] / 256 - 32768;
  return { h, W, H, z, tx0, ty0, oeste: lonDeX(tx0, z), este: lonDeX(tx1 + 1, z), norte: latDeY(ty0, z), sur: latDeY(ty1 + 1, z) };
}

// Mínimo móvil (ventana de 2r + 1) por filas y columnas
function minimoLocal(a, W, H, r) {
  const tmp = new Float32Array(a.length), out = new Float32Array(a.length);
  const pasada = (src, dst, n, largo, idx) => {
    for (let k = 0; k < n; k++) {
      const cola = [];
      for (let i = 0; i < largo + r; i++) {
        if (i < largo) {
          const v = src[idx(k, i)];
          while (cola.length && src[idx(k, cola[cola.length - 1])] >= v) cola.pop();
          cola.push(i);
        }
        const c = i - r;
        if (c >= 0) {
          while (cola[0] < c - r) cola.shift();
          dst[idx(k, c)] = src[idx(k, cola[0])];
        }
      }
    }
  };
  pasada(a, tmp, H, W, (f, c) => f * W + c);
  pasada(tmp, out, W, H, (c, f) => f * W + c);
  return out;
}

async function prepararSimulacion(s) {
  const est = document.getElementById("sim-estado");
  est.textContent = t("sim_cargando");
  const margen = s.km * 1.25;
  const [cx0, cy0, cx1, cy1] = cajaCirculo(s.punto, margen);
  const mapaListo = crearMapaSimulador(s);
  const [D] = await Promise.all([relieveDe([cx0, cy0, cx1, cy1]), cargarRadiosEn(cajaCirculo(s.punto, s.km)), mapaListo]);
  if (estado.sel !== s || document.getElementById("sim").hidden) return;
  const { W, H } = D;
  const aPx = (lon, lat) => [(xDeLon(lon, D.z) - D.tx0) * 256, (yDeLat(lat, D.z) - D.ty0) * 256];
  const agua = mascaraAgua(D, aPx);
  // Coordenadas de cada píxel y máscara del círculo
  const lonP = new Float64Array(W), latP = new Float64Array(H);
  for (let x = 0; x < W; x++) lonP[x] = lonDeX(D.tx0 + (x + 0.5) / 256, D.z);
  for (let y = 0; y < H; y++) latP[y] = latDeY(D.ty0 + (y + 0.5) / 256, D.z);
  const dentro = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (distanciaKm(s.punto, [lonP[x], latP[y]]) <= s.km) dentro[y * W + x] = 1;
  // Suavizado y altura relativa (dos escalas: el bajo del barrio y el de la zona)
  const hs = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (agua[y * W + x]) { hs[y * W + x] = Infinity; continue; }   // el agua no cuenta como bajo
    let a = 0, n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {   // 5 × 5 (~75 m): baja el ruido de edificios y árboles
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && !agua[yy * W + xx]) { a += D.h[yy * W + xx]; n++; }
    }
    hs[y * W + x] = n ? a / n : Infinity;
  }
  const metrosPx = (40075016 * Math.cos((s.punto[1] * Math.PI) / 180)) / (256 * 2 ** D.z);
  const m500 = minimoLocal(hs, W, H, Math.max(2, Math.round(500 / metrosPx)));
  const m2500 = minimoLocal(hs, W, H, Math.max(4, Math.round(2500 / metrosPx)));
  const celdas = [];
  for (let i = 0; i < W * H; i++) if (dentro[i] && !agua[i]) celdas.push(i);
  const rel = new Float32Array(celdas.length);
  celdas.forEach((i, k) => { rel[k] = Math.max(0, hs[i] - m500[i]) + 0.5 * Math.max(0, hs[i] - m2500[i]); });
  const orden = Float32Array.from(rel).sort(), acum = new Float64Array(orden.length + 1);
  for (let k = 0; k < orden.length; k++) acum[k + 1] = acum[k] + orden[k];
  // Radios censales rasterizados (para estimar personas con agua)
  const cvR = new OffscreenCanvas(W, H), cR = cvR.getContext("2d", { willReadFrequently: true });
  const radios = estado.radios.filter((f) => distanciaKm(s.punto, f.properties._c) <= s.km * 1.6);
  radios.forEach((f, k) => {
    const id = k + 1;
    cR.fillStyle = `rgb(${id & 255},${(id >> 8) & 255},0)`;
    cR.beginPath();
    const pols = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const p of pols) for (const anillo of p) { anillo.forEach(([lo, la], j) => { const [px, py] = aPx(lo, la); j ? cR.lineTo(px, py) : cR.moveTo(px, py); }); cR.closePath(); }
    cR.fill("evenodd");
  });
  const pr = cR.getImageData(0, 0, W, H).data, radioDe = new Uint16Array(celdas.length), celdasRadio = new Float64Array(radios.length + 1);
  celdas.forEach((i, k) => { radioDe[k] = pr[4 * i] + pr[4 * i + 1] * 256; });
  for (let i = 0; i < W * H; i++) celdasRadio[pr[4 * i] + pr[4 * i + 1] * 256]++;   // superficie total de cada radio (dentro y fuera)
  SIM.datos = { D, s, celdas, rel, orden, acum, radios, radioDe, celdasRadio, areaCelda: metrosPx ** 2, metrosPx };
  est.textContent = "";
  agregarAguaAlMapa(D);
  pintarPanelSimulador(SIM.datos);
}

// Nivel del agua (en altura relativa) que guarda el volumen escurrido. Volumen guardado con nivel L:
// V(L) = f(L) − f(L − PROF_MAX), con f(x) = Σ (x − h) sobre las celdas con h < x (sumas acumuladas + búsqueda binaria)
function volumenHasta(d, x) {
  let lo = 0, hi = d.orden.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (d.orden[m] < x) lo = m + 1; else hi = m; }
  return lo * x - d.acum[lo];
}
function nivelAgua(d, mm) {
  const lamina = Math.max(0, mm - PERDIDA_MM) / 1000 * ESCORRENTIA;   // m de agua repartidos sobre todo el círculo
  if (lamina <= 0) return -Infinity;
  const V = lamina * d.orden.length;
  let lo = d.orden[0], hi = d.orden[d.orden.length - 1] + PROF_MAX + V / d.orden.length + 1;
  for (let i = 0; i < 60; i++) {
    const L = (lo + hi) / 2;
    if (volumenHasta(d, L) - volumenHasta(d, L - PROF_MAX) < V) lo = L; else hi = L;
  }
  return (lo + hi) / 2;
}
const profundidad = (L, h) => Math.min(PROF_MAX, L - h);

function resultadoSim(d, mm) {
  const L = nivelAgua(d, mm);
  let celdasAgua = 0, maxProf = 0;
  const conAgua = new Float64Array(d.radios.length + 1);
  for (let k = 0; k < d.rel.length; k++) {
    const p = profundidad(L, d.rel[k]);
    if (p >= AGUA_MIN) { celdasAgua++; conAgua[d.radioDe[k]]++; if (p > maxProf) maxProf = p; }
  }
  let personas = 0;
  d.radios.forEach((f, j) => { const id = j + 1; if (d.celdasRadio[id]) personas += (Number(f.properties.poblacion) || 0) * (conAgua[id] / d.celdasRadio[id]); });
  return { L, pct: (100 * celdasAgua) / d.rel.length, km2: (celdasAgua * d.areaCelda) / 1e6, maxProf, personas };
}

// ---------- Mapa 3D del simulador ----------
function crearMapaSimulador(s) {
  SIM.mapa?.remove();
  const m = new maplibregl.Map({ container: "sim-mapa", style: estiloBase(), center: s.punto, zoom: 13, pitch: 62, bearing: -20,
    maxPitch: 80, attributionControl: { compact: true } });
  SIM.mapa = m;
  m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  return new Promise((listo) => {
    m.on("style.load", () => {
      m.addSource("relieve-sim", { type: "raster-dem", encoding: "terrarium", tileSize: 256, maxzoom: 14,
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], attribution: "Relieve: AWS Terrain Tiles" });
      m.setTerrain({ source: "relieve-sim", exaggeration: 1 });   // escala real
      const antes = m.getStyle().layers.find((l) => l.type === "symbol")?.id;
      m.addLayer({ id: "sombra-sim", type: "hillshade", source: "relieve-sim", paint: { "hillshade-exaggeration": 0.45, "hillshade-shadow-color": "#3d4652" } }, antes);
      m.addSource("circulo-sim", { type: "geojson", data: { type: "Feature", geometry: circuloGeo(s.punto, s.km), properties: {} } });
      m.addLayer({ id: "circulo-sim", type: "line", source: "circulo-sim", paint: { "line-color": css("--cian-vivo"), "line-width": 2.5 } });
      const [x0, y0, x1, y1] = cajaCirculo(s.punto, s.km * 1.05);
      m.fitBounds([[x0, y0], [x1, y1]], { pitch: 62, bearing: -20, padding: 20, duration: 0 });
      const fin = setTimeout(listo, 8000);   // si el mapa base tarda, se sigue sin ríos
      m.once("idle", () => { clearTimeout(fin); listo(); });
    });
  });
}

// Ríos, lagunas y embalses del mapa base, rasterizados a la grilla del relieve
function mascaraAgua(D, aPx) {
  const cv = new OffscreenCanvas(D.W, D.H), c = cv.getContext("2d", { willReadFrequently: true });
  const fuente = Object.entries(SIM.mapa?.getStyle()?.sources ?? {}).find(([, f]) => f.type === "vector")?.[0];
  if (fuente) {
    c.fillStyle = "#fff";
    for (const f of SIM.mapa.querySourceFeatures(fuente, { sourceLayer: "water" })) {
      const g = f.geometry, pols = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
      c.beginPath();
      for (const p of pols) for (const anillo of p) { anillo.forEach(([lo, la], j) => { const [px, py] = aPx(lo, la); j ? c.lineTo(px, py) : c.moveTo(px, py); }); c.closePath(); }
      c.fill("evenodd");
    }
  }
  const px = c.getImageData(0, 0, D.W, D.H).data, base = new Uint8Array(D.W * D.H);
  for (let i = 0; i < base.length; i++) base[i] = px[4 * i + 3] > 127 ? 1 : 0;
  // Margen de 2 píxeles (~30 m): las orillas del relieve satelital suelen tener la altura del agua
  const out = new Uint8Array(base.length);
  for (let y = 0; y < D.H; y++) for (let x = 0; x < D.W; x++) {
    if (!base[y * D.W + x]) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < D.W && yy < D.H) out[yy * D.W + xx] = 1;
    }
  }
  return out;
}

function agregarAguaAlMapa(D) {
  const m = SIM.mapa, cv = document.createElement("canvas");
  cv.width = D.W; cv.height = D.H;
  SIM.lienzo = cv;
  const antes = m.getStyle().layers.find((l) => l.type === "symbol")?.id;
  m.addSource("agua-sim", { type: "canvas", canvas: cv, animate: true,
    coordinates: [[D.oeste, D.norte], [D.este, D.norte], [D.este, D.sur], [D.oeste, D.sur]] });
  m.getSource("agua-sim").pause();
  m.addLayer({ id: "agua-sim", type: "raster", source: "agua-sim", paint: { "raster-opacity": 0.9, "raster-fade-duration": 0, "raster-resampling": "linear" } }, antes);
  dibujarAgua();
}

// Colores por profundidad (agua: de celeste translúcido a azul profundo)
const COLOR_AGUA = [[0.1, [125, 211, 252, 0.45]], [0.3, [56, 170, 235, 0.6]], [0.6, [30, 120, 210, 0.72]], [1, [22, 82, 180, 0.8]], [1.5, [14, 50, 130, 0.88]]];
function dibujarAgua() {
  const d = SIM.datos, cv = SIM.lienzo;
  if (!d || !cv || !SIM.mapa?.getSource("agua-sim")) return;
  const ctx = cv.getContext("2d"), img = ctx.createImageData(cv.width, cv.height), px = img.data;
  const L = nivelAgua(d, SIM.mm);
  for (let k = 0; k < d.celdas.length; k++) {
    const p = profundidad(L, d.rel[k]);
    if (p < AGUA_MIN) continue;
    const c = colorEscala(COLOR_AGUA, p), o = d.celdas[k] * 4;
    px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = c[3] * 255;
  }
  ctx.putImageData(img, 0, 0);
  const f = SIM.mapa.getSource("agua-sim");
  f.play(); SIM.mapa.triggerRepaint();
  requestAnimationFrame(() => requestAnimationFrame(() => f.pause()));
}

// ---------- Panel de control y resultados ----------
function presetsSimulador() {
  const p = [];
  const T = estado.tiempo, s = estado.sel;
  if (T && s) {
    const serie = seriePunto(T, T.diario.lluvia, T.dias.length, s.punto[0], s.punto[1]), h = diaHoy(T);
    const suma = (n) => Math.round(sumar(serie.slice(h, h + n).filter((v) => v != null)));
    p.push([t("sim_pron_3"), suma(3)], [t("sim_pron_7"), suma(7)]);
  }
  p.push([t("sim_50"), 50], [t("sim_150"), 150], [t("sim_laplata"), 392]);
  return p;
}

function pintarPanelSimulador(d) {
  const panel = document.getElementById("sim-panel");
  const R = d ? resultadoSim(d, SIM.mm) : null;
  const ps = presetsSimulador();
  panel.innerHTML = `
    <div class="sim-mm"><span class="sim-mm-valor" id="sim-mm-valor">${fmt(SIM.mm)}</span><span class="sim-mm-u">mm</span>
      <span class="sim-mm-etq">${t("sim_lluvia_caida")}</span></div>
    <div class="sim-control">
      <button type="button" class="lt-play" id="sim-play" aria-label="${t("sim_reproducir")}">${icono(SIM.reproduciendo ? "pausa" : "play")}</button>
      <input type="range" id="sim-barra" min="0" max="400" step="5" value="${SIM.mm}" aria-label="${t("sim_lluvia_caida")}"${d ? "" : " disabled"}>
    </div>
    <div class="sim-presets">${ps.map(([e, v], i) => `<button type="button" class="chip" data-i="${i}"${d ? "" : " disabled"}>${e} · ${fmt(v)} mm</button>`).join("")}</div>
    <div class="tb-datos sim-datos">
      ${dato(t("sim_area"), R ? `${fmt(R.pct, R.pct < 10 ? 1 : 0)} %` : "–", R ? `${fmt(R.km2, 2)} km²` : "")}
      ${dato(t("sim_prof"), R && R.maxProf > 0 ? `${fmt(R.maxProf, 1)} m` : "–", t("sim_prof_sub"))}
      ${dato(t("sim_personas"), R ? fmtPersonas(R.personas) : "–", t("sim_personas_sub"))}
      ${dato(t("sim_radios"), d ? fmt(d.radios.length) : "–", t("sim_radios_sub"))}
    </div>
    <div class="sim-leyenda">${COLOR_AGUA.map(([v, c]) => `<span><i style="background:${rgba(c, 0.6)}"></i>${v < 1 ? `${fmt(v * 100)} cm` : `${fmt(v)} m`}</span>`).join("")}</div>
    <h3 class="sim-h3">${t("sim_curva")}</h3><div id="sim-curva" class="graf-cont"></div>
    <details class="sim-metodo"><summary>${t("sim_como")}</summary><p>${t("sim_metodo")}</p></details>`;
  const barra = document.getElementById("sim-barra");
  barra.oninput = () => { SIM.mm = Number(barra.value); actualizarSimulador(); };
  document.getElementById("sim-play").onclick = () => reproducirSimulador();
  panel.querySelectorAll(".sim-presets .chip").forEach((b) => { b.onclick = () => reproducirSimulador(ps[+b.dataset.i][1]); });
  if (d) {
    const mms = Array.from({ length: 41 }, (_, i) => i * 10);
    grafLineas(document.getElementById("sim-curva"), {
      etiquetas: mms.map((v) => `${v}`), alto: 150, min: 0, max: 100, marcas: [0, 25, 50, 75, 100], formatoEje: (v) => `${v} %`,
      formato: (v) => `${fmt(v, 1)} %`, series: [{ nombre: t("sim_area"), valores: mms.map((v) => resultadoSim(d, v).pct), color: "var(--s-1)", ancho: 2.2, area: true }],
      marca: Math.round(SIM.mm / 10), extraTip: (i) => `<span class="tip-fila">${mms[i]} mm</span>`,
      onClick: (i) => { SIM.mm = mms[i]; actualizarSimulador(); },
    });
  }
}

function actualizarSimulador() {
  const d = SIM.datos;
  if (!d) return;
  const R = resultadoSim(d, SIM.mm);
  document.getElementById("sim-mm-valor").textContent = fmt(SIM.mm);
  document.getElementById("sim-barra").value = SIM.mm;
  const vals = document.querySelectorAll(".sim-datos .tb-dato-valor"), ext = document.querySelectorAll(".sim-datos .tb-dato-extra");
  vals[0].textContent = `${fmt(R.pct, R.pct < 10 ? 1 : 0)} %`; ext[0].textContent = `${fmt(R.km2, 2)} km²`;
  vals[1].textContent = R.maxProf > 0 ? `${fmt(R.maxProf, 1)} m` : "–";
  vals[2].textContent = fmtPersonas(R.personas);
  dibujarAgua();
}

// Llena de 0 hasta el valor elegido en unos 4 segundos (por tiempo, igual en cualquier equipo)
function reproducirSimulador(objetivo = null) {
  const btn = document.getElementById("sim-play");
  if (SIM.reproduciendo && objetivo == null) { cancelAnimationFrame(SIM.reproduciendo); SIM.reproduciendo = 0; btn.innerHTML = icono("play"); return; }
  cancelAnimationFrame(SIM.reproduciendo);
  const meta = objetivo ?? (SIM.mm > 0 && SIM.mm < 400 ? SIM.mm : 200), t0 = performance.now(), dur = movimientoReducido() ? 0 : 4000;
  btn.innerHTML = icono("pausa");
  const cuadro = (ahora) => {
    const f = dur ? Math.min(1, (ahora - t0) / dur) : 1;
    SIM.mm = Math.round(meta * f);
    actualizarSimulador();
    if (f < 1) SIM.reproduciendo = requestAnimationFrame(cuadro);
    else { SIM.reproduciendo = 0; btn.innerHTML = icono("repetir"); }
  };
  SIM.reproduciendo = requestAnimationFrame(cuadro);
}

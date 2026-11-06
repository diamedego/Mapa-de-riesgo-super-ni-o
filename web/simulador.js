// Simulador de lluvia en 3D: dentro del círculo elegido, con el relieve real, muestra hasta dónde llegaría el agua
// según los milímetros de lluvia, con colores por altura, curvas de nivel, líneas de drenaje y un corte del terreno.
// Modelo de llenado de bajos (orientativo):
//   1. Relieve: teselas de elevación (AWS Terrain Tiles, SRTM ~30 m), suavizado 5 × 5 (incluye edificios y árboles).
//      Ríos y lagunas del mapa base (y 30 m de orilla) quedan fuera: la lluvia que cae ahí se la lleva el río.
//   2. Altura relativa: cuánto está cada lugar de tierra por encima del bajo más cercano (a 500 m y a 2,5 km).
//   3. Agua: la lluvia que escurre (se descuentan 10 mm que absorbe el suelo y se toma un coeficiente de
//      escorrentía de 0,5) llena primero los lugares más bajos; ningún bajo junta más de 1,5 m (el resto desborda).
//   4. Drenaje: dirección de máxima pendiente (D8) sobre el relieve muy suavizado (~200 m) y área que desagua en cada lugar.
//   5. Personas: población de cada radio censal × fracción de su superficie con agua de 10 cm o más.
// Solo en la versión completa (las teselas de relieve vienen de un servidor externo).

const SIM = { mapa: null, mm: 0, reproduciendo: 0, datos: null,
  capas: { colores: true, curvas: true, drenaje: true, corte: true, x5: false } };
const PERDIDA_MM = 10, ESCORRENTIA = 0.5, AGUA_MIN = 0.1, PROF_MAX = 1.5;   // ningún bajo junta más de 1,5 m: el resto desborda
const TERRARIUM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
// Agua: de celeste translúcido a azul profundo. Altura: del verde azulado de los bajos al marrón de las lomas.
const COLOR_AGUA = [[0.1, [125, 211, 252, 0.5]], [0.3, [56, 170, 235, 0.65]], [0.6, [30, 120, 210, 0.76]], [1, [22, 82, 180, 0.84]], [1.5, [14, 50, 130, 0.9]]];
const COLOR_ALTURA = [[0, [38, 120, 120, 0.6]], [0.25, [92, 160, 110, 0.6]], [0.5, [180, 196, 120, 0.6]], [0.75, [205, 170, 110, 0.6]], [1, [170, 120, 80, 0.6]]];
const CAPAS_SIM = ["colores", "curvas", "drenaje", "corte"];

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
  document.querySelector(".sim-leyenda-mapa")?.remove();
  Tip.ocultar();
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
    const r = await fetch(TERRARIUM.replace("{z}", z).replace("{x}", tx).replace("{y}", ty));
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
// Promedio móvil (ventana de 2r + 1) que no cuenta los valores no finitos (el agua); sin vecinos válidos queda Infinity
function promedioLocal(a, W, H, r) {
  const tmp = new Float32Array(a.length), out = new Float32Array(a.length);
  const pasada = (src, dst, n, largo, idx) => {
    for (let k = 0; k < n; k++) {
      let s = 0, c = 0;
      for (let i = -r; i < largo; i++) {
        const entra = i + r, sale = i - r - 1;
        if (entra < largo) { const v = src[idx(k, entra)]; if (Number.isFinite(v)) { s += v; c++; } }
        if (sale >= 0) { const v = src[idx(k, sale)]; if (Number.isFinite(v)) { s -= v; c--; } }
        if (i >= 0) dst[idx(k, i)] = c ? s / c : Infinity;
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
  const mapaListo = crearMapaSimulador(s);
  const [D] = await Promise.all([relieveDe(cajaCirculo(s.punto, s.km * 1.25)), cargarRadiosEn(cajaCirculo(s.punto, s.km)), mapaListo]);
  if (estado.sel !== s || document.getElementById("sim").hidden) return;
  const { W, H } = D, N = W * H;
  const aPx = (lon, lat) => [(xDeLon(lon, D.z) - D.tx0) * 256, (yDeLat(lat, D.z) - D.ty0) * 256];
  const agua = mascaraAgua(D, aPx);
  // Coordenadas de cada píxel y máscara del círculo (sin ríos ni lagunas)
  const lonP = new Float64Array(W), latP = new Float64Array(H);
  for (let x = 0; x < W; x++) lonP[x] = lonDeX(D.tx0 + (x + 0.5) / 256, D.z);
  for (let y = 0; y < H; y++) latP[y] = latDeY(D.ty0 + (y + 0.5) / 256, D.z);
  const dentro = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!agua[y * W + x] && distanciaKm(s.punto, [lonP[x], latP[y]]) <= s.km) dentro[y * W + x] = 1;
  // Suavizado 5 × 5 (~75 m: baja el ruido de edificios y árboles); el agua no cuenta como bajo
  const hs = promedioLocal(Float32Array.from(D.h, (v, i) => (agua[i] ? Infinity : v)), W, H, 2);
  for (let i = 0; i < N; i++) if (agua[i]) hs[i] = Infinity;
  // Altura relativa (dos escalas: el bajo del barrio y el de la zona)
  const metrosPx = (40075016 * Math.cos((s.punto[1] * Math.PI) / 180)) / (256 * 2 ** D.z);
  const m500 = minimoLocal(hs, W, H, Math.max(2, Math.round(500 / metrosPx)));
  const m2500 = minimoLocal(hs, W, H, Math.max(4, Math.round(2500 / metrosPx)));
  const celdas = [];
  for (let i = 0; i < N; i++) if (dentro[i]) celdas.push(i);
  const rel = new Float32Array(celdas.length), relGrilla = new Float32Array(N);
  celdas.forEach((i, k) => { rel[k] = Math.max(0, hs[i] - m500[i]) + 0.5 * Math.max(0, hs[i] - m2500[i]); relGrilla[i] = rel[k]; });
  const orden = Float32Array.from(rel).sort(), acum = new Float64Array(orden.length + 1);
  for (let k = 0; k < orden.length; k++) acum[k + 1] = acum[k] + orden[k];
  // Colores por altura: escala entre los percentiles 2 y 98 del círculo (un pico aislado no aplana el resto)
  const alturas = Float32Array.from(celdas, (i) => hs[i]).sort();
  const hMin = alturas[Math.floor((alturas.length - 1) * 0.02)], hMax = alturas[Math.floor((alturas.length - 1) * 0.98)];
  // Curvas de nivel cada 2 m: borde entre píxeles vecinos de distinta franja
  const curva = new Uint8Array(N);
  for (const i of celdas) {
    const b = Math.floor(hs[i] / 2), x = i % W;
    if ((x + 1 < W && dentro[i + 1] && Math.floor(hs[i + 1] / 2) !== b) || (i + W < N && dentro[i + W] && Math.floor(hs[i + W] / 2) !== b)) curva[i] = 1;
  }
  // Drenaje: D8 sobre el relieve muy suavizado (~200 m) y área que desagua en cada lugar (de lo más alto a lo más bajo)
  const hd = promedioLocal(hs, W, H, Math.max(3, Math.round(105 / metrosPx)));
  const acc = new Float32Array(N);
  const porAltura = Uint32Array.from(celdas).sort((a, b) => hd[b] - hd[a]);
  for (const i of porAltura) acc[i] = 1;
  for (const i of porAltura) {
    const x = i % W, y = (i / W) | 0;
    let mejor = -1, bajada = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if ((!dx && !dy) || xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const j = yy * W + xx;
      if (!dentro[j]) continue;
      const pend = (hd[i] - hd[j]) / Math.hypot(dx, dy);
      if (pend > bajada) { bajada = pend; mejor = j; }
    }
    if (mejor >= 0) acc[mejor] += acc[i];
  }
  const umbral = Math.max(150, Math.round(100000 / metrosPx ** 2));   // cauces que juntan el agua de ~10 ha o más
  const cauce = new Uint8Array(N), orilla = new Uint8Array(N);
  const vecinos = (i, fn) => { const x = i % W, y = (i / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) fn(yy * W + xx); } };
  for (const i of celdas) if (acc[i] > umbral) vecinos(i, (j) => { cauce[j] = 1; });    // línea de 3 px
  for (const i of celdas) if (cauce[i]) vecinos(i, (j) => { if (!cauce[j]) orilla[j] = 1; });   // borde oscuro fino
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
  for (let i = 0; i < N; i++) celdasRadio[pr[4 * i] + pr[4 * i + 1] * 256]++;   // superficie total de cada radio (dentro y fuera)
  // Corte: por defecto, de oeste a este por el centro del círculo (tocando el mapa se elige otra latitud)
  const filaCorte = limitar(Math.round((yDeLat(s.punto[1], D.z) - D.ty0) * 256), 0, H - 1);
  SIM.datos = { D, s, celdas, rel, relGrilla, orden, acum, radios, radioDe, celdasRadio, areaCelda: metrosPx ** 2, metrosPx,
    hs, dentro, hMin, hMax, curva, cauce, orilla, lonP, latP, filaCorte };
  est.textContent = "";
  agregarAguaAlMapa(D);
  pintarPanelSimulador(SIM.datos);
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
  let lo = d.orden[0], hi = d.orden[d.orden.length - 1] + PROF_MAX + lamina + 1;
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
      const dem = { type: "raster-dem", encoding: "terrarium", tileSize: 256, maxzoom: 14, tiles: [TERRARIUM] };
      m.addSource("relieve-sim", { ...dem, attribution: "Relieve: AWS Terrain Tiles" });
      m.addSource("sombra-fuente-sim", dem);   // fuente aparte para el sombreado: MapLibre lo dibuja mejor así
      m.setTerrain({ source: "relieve-sim", exaggeration: SIM.capas.x5 ? 5 : 1 });   // escala real salvo que se pida ×5
      const antes = m.getStyle().layers.find((l) => l.type === "symbol")?.id;
      m.addLayer({ id: "sombra-sim", type: "hillshade", source: "sombra-fuente-sim", paint: { "hillshade-exaggeration": 0.45, "hillshade-shadow-color": "#3d4652" } }, antes);
      m.addSource("circulo-sim", { type: "geojson", data: { type: "Feature", geometry: circuloGeo(s.punto, s.km), properties: {} } });
      m.addLayer({ id: "circulo-sim", type: "line", source: "circulo-sim", paint: { "line-color": css("--cian-vivo"), "line-width": 2.5 } });
      m.addSource("corte-sim", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "corte-sim", type: "line", source: "corte-sim", paint: { "line-color": "#0e1726", "line-width": 2.5, "line-dasharray": [2, 1.5] } });
      const [x0, y0, x1, y1] = cajaCirculo(s.punto, s.km * 1.05);
      m.fitBounds([[x0, y0], [x1, y1]], { pitch: 62, bearing: -20, padding: 20, duration: 0 });
      m.setZoom(m.getZoom() + 0.4);   // con la inclinación, el ajuste deja el círculo chico
      m.on("mousemove", tooltipSimulador);
      m.on("mouseout", () => Tip.ocultar());
      m.on("click", (e) => { moverCorte(e.lngLat); if (e.originalEvent.pointerType !== "mouse") tooltipSimulador(e); });
      const fin = setTimeout(listo, 8000);   // si el mapa base tarda, se sigue sin ríos
      m.once("idle", () => { clearTimeout(fin); listo(); });
    });
  });
}

function agregarAguaAlMapa(D) {
  const m = SIM.mapa, cv = document.createElement("canvas");
  cv.width = D.W; cv.height = D.H;
  SIM.lienzo = cv;
  const antes = m.getStyle().layers.find((l) => l.type === "symbol")?.id;
  m.addSource("agua-sim", { type: "canvas", canvas: cv, animate: true,
    coordinates: [[D.oeste, D.norte], [D.este, D.norte], [D.este, D.sur], [D.oeste, D.sur]] });
  m.getSource("agua-sim").pause();
  m.addLayer({ id: "agua-sim", type: "raster", source: "agua-sim", paint: { "raster-opacity": 0.95, "raster-fade-duration": 0, "raster-resampling": "linear" } }, antes);
  m.moveLayer("corte-sim");
  agregarLeyendaSimulador();
  actualizarCorteEnMapa();
  dibujarAgua();
}

// Una sola imagen por cuadro, de abajo hacia arriba: colores por altura → curvas → agua → drenaje
function dibujarAgua() {
  const d = SIM.datos, cv = SIM.lienzo, C = SIM.capas;
  if (!d || !cv || !SIM.mapa?.getSource("agua-sim")) return;
  const ctx = cv.getContext("2d"), img = ctx.createImageData(cv.width, cv.height), px = img.data;
  const L = nivelAgua(d, SIM.mm), rango = d.hMax - d.hMin || 1;
  for (let k = 0; k < d.celdas.length; k++) {
    const i = d.celdas[k];
    let c = null;
    if (C.colores) c = colorEscala(COLOR_ALTURA, limitar((d.hs[i] - d.hMin) / rango, 0, 1));
    if (C.curvas && d.curva[i]) c = c ? [c[0] * 0.55, c[1] * 0.55, c[2] * 0.5, 0.8] : [70, 60, 50, 0.55];
    const p = profundidad(L, d.rel[k]);
    if (p >= AGUA_MIN) c = colorEscala(COLOR_AGUA, p);
    if (C.drenaje) { if (d.cauce[i]) c = [224, 250, 255, 0.98]; else if (d.orilla[i]) c = [14, 70, 90, 0.8]; }
    if (!c) continue;
    const o = i * 4;
    px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = c[3] * 255;
  }
  ctx.putImageData(img, 0, 0);
  const f = SIM.mapa.getSource("agua-sim");
  f.play(); SIM.mapa.triggerRepaint();
  requestAnimationFrame(() => requestAnimationFrame(() => f.pause()));
}

// ---------- Corte del terreno ----------
function moverCorte(lngLat) {
  const d = SIM.datos;
  if (!d || !SIM.capas.corte) return;
  const y = Math.round((yDeLat(lngLat.lat, d.D.z) - d.D.ty0) * 256);
  if (y < 0 || y >= d.D.H) return;
  d.filaCorte = y;
  actualizarCorteEnMapa();
  pintarCorte();
}
function filaCorte(d) {
  const xs = [];
  for (let x = 0; x < d.D.W; x++) if (d.dentro[d.filaCorte * d.D.W + x]) xs.push(x);
  return xs;
}
function actualizarCorteEnMapa() {
  const d = SIM.datos, f = SIM.mapa?.getSource("corte-sim");
  if (!d || !f) return;
  const xs = filaCorte(d), lat = d.latP[d.filaCorte];
  f.setData(SIM.capas.corte && xs.length > 1
    ? { type: "Feature", geometry: { type: "LineString", coordinates: [[d.lonP[xs[0]], lat], [d.lonP[xs[xs.length - 1]], lat]] }, properties: {} }
    : { type: "FeatureCollection", features: [] });
}
function pintarCorte() {
  const cont = document.getElementById("sim-corte"), d = SIM.datos;
  if (!cont) return;
  cont.hidden = !SIM.capas.corte || !d;
  if (cont.hidden) return;
  const L = nivelAgua(d, SIM.mm), perfil = filaCorte(d).map((x) => {
    const i = d.filaCorte * d.D.W + x;
    return [d.hs[i], Math.max(0, profundidad(L, d.relGrilla[i]))];
  });
  if (perfil.length < 4) { cont.innerHTML = `<p class="sim-corte-titulo">${t("sim_corte_ayuda")}</p>`; return; }
  const ancho = Math.max(240, cont.clientWidth), alto = 130, n = perfil.length, izq = 44, der = 6, base = alto - 20;
  const lo = Math.floor(Math.min(...perfil.map((p) => p[0])) - 1), hi = Math.ceil(Math.max(...perfil.map((p) => p[0] + p[1])) + 1);
  const paso = (ancho - izq - der) / n;
  const sx = (k) => izq + (k + 0.5) * paso, sy = (v) => 8 + (1 - (v - lo) / (hi - lo)) * (base - 8);
  const suelo = perfil.map((p, k) => `${k ? "L" : "M"}${sx(k).toFixed(1)},${sy(p[0]).toFixed(1)}`).join("") + `L${sx(n - 1).toFixed(1)},${base}L${sx(0).toFixed(1)},${base}Z`;
  const agua = perfil.map((p, k) => (p[1] >= AGUA_MIN
    ? `<rect x="${(sx(k) - paso / 2).toFixed(1)}" y="${sy(p[0] + p[1]).toFixed(1)}" width="${(paso + 0.6).toFixed(2)}" height="${(sy(p[0]) - sy(p[0] + p[1])).toFixed(1)}"/>` : "")).join("");
  const km = (n * d.metrosPx) / 1000;
  cont.innerHTML = `<p class="sim-corte-titulo"><b>${t("sim_corte")}</b> · ${t("sim_corte_ayuda")}</p>
    <svg width="${ancho}" height="${alto}" class="sim-corte-svg" role="img" aria-label="${t("sim_corte")}">
      <line class="grilla" x1="${izq}" x2="${ancho - der}" y1="${sy(hi)}" y2="${sy(hi)}"/><line class="grilla" x1="${izq}" x2="${ancho - der}" y1="${sy(lo)}" y2="${sy(lo)}"/>
      <path d="${suelo}" class="sim-suelo"/><g class="sim-agua-corte">${agua}</g>
      <text class="eje" x="${izq - 4}" y="${sy(hi) + 4}" text-anchor="end">${fmt(hi)} m</text>
      <text class="eje" x="${izq - 4}" y="${sy(lo) + 4}" text-anchor="end">${fmt(lo)} m</text>
      <text class="eje" x="${izq}" y="${alto - 4}">${t("sim_oeste")}</text>
      <text class="eje" x="${ancho - der}" y="${alto - 4}" text-anchor="end">${t("sim_este")} · ${fmt(km, 1)} km</text></svg>`;
}

// ---------- Leyenda sobre el mapa y altura al pasar ----------
function agregarLeyendaSimulador() {
  const marco = document.querySelector(".sim-mapa-marco"), d = SIM.datos, C = SIM.capas;
  marco.querySelector(".sim-leyenda-mapa")?.remove();
  const el = document.createElement("div");
  el.className = "sim-leyenda-mapa";
  el.hidden = !(C.colores || C.curvas || C.drenaje);
  el.innerHTML = `${C.colores ? `<b>${t("sim_ley_altura")}</b><span class="sim-degradado"></span>
    <span class="sim-deg-rot"><span>${fmt(d.hMin)} m</span><span>${fmt(d.hMax)} m</span></span>` : ""}
    ${C.drenaje ? `<span class="sim-ley-fila"><i class="ley-drenaje"></i>${t("sim_ley_drenaje")}</span>` : ""}
    ${C.curvas ? `<span class="sim-ley-fila"><i class="ley-curva"></i>${t("sim_ley_curva")}</span>` : ""}`;
  marco.appendChild(el);
}
function tooltipSimulador(e) {
  const d = SIM.datos;
  if (!d) return;
  const x = Math.floor((xDeLon(e.lngLat.lng, d.D.z) - d.D.tx0) * 256), y = Math.floor((yDeLat(e.lngLat.lat, d.D.z) - d.D.ty0) * 256);
  const i = y * d.D.W + x;
  if (x < 0 || y < 0 || x >= d.D.W || y >= d.D.H || !d.dentro[i]) { Tip.ocultar(); return; }
  const p = profundidad(nivelAgua(d, SIM.mm), d.relGrilla[i]);
  Tip.mostrar(`<span class="tip-fila"><b>${fmt(d.hs[i], 1)} m</b> ${t("sim_snm")}</span>
    <span class="tip-fila"><b>${fmt(d.relGrilla[i], 1)} m</b> ${t("sim_sobre_bajo")}</span>
    ${p >= AGUA_MIN ? `<span class="tip-fila"><b>${fmt(p * 100)} cm</b> ${t("sim_de_agua")}</span>` : ""}`, e.originalEvent);
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

// Filtros: "Todos" prende o apaga las cuatro capas; Relieve ×5 es aparte (la escala real es la de siempre)
function pintarFiltrosSimulador() {
  const cont = document.getElementById("sim-filtros"), C = SIM.capas;
  if (!cont) return;
  const todas = CAPAS_SIM.every((k) => C[k]);
  cont.innerHTML = `<button type="button" class="chip" aria-pressed="${todas}" data-k="todos">${t("sim_f_todos")}</button>` +
    CAPAS_SIM.map((k) => `<button type="button" class="chip" aria-pressed="${C[k]}" data-k="${k}">${t(`sim_f_${k}`)}</button>`).join("") +
    `<button type="button" class="chip chip-x5" aria-pressed="${C.x5}" data-k="x5" title="${t("sim_f_x5_ayuda")}">${t("sim_f_x5")}</button>`;
  cont.querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.k;
      if (k === "todos") CAPAS_SIM.forEach((c) => { C[c] = !todas; });
      else C[k] = !C[k];
      if (k === "x5") SIM.mapa?.setTerrain({ source: "relieve-sim", exaggeration: C.x5 ? 5 : 1 });
      pintarFiltrosSimulador();
      if (SIM.datos) { agregarLeyendaSimulador(); actualizarCorteEnMapa(); pintarCorte(); dibujarAgua(); }
    };
  });
}

function pintarPanelSimulador(d) {
  const panel = document.getElementById("sim-panel");
  const R = d ? resultadoSim(d, SIM.mm) : null;
  const ps = presetsSimulador();
  panel.innerHTML = `
    <div class="sim-filtros" id="sim-filtros" role="group" aria-label="${t("sim_capas")}"></div>
    <div class="sim-corte" id="sim-corte" hidden></div>
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
  pintarFiltrosSimulador();
  if (d) {
    pintarCorte();
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
  pintarCorte();
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

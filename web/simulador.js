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
  capas: { colores: true, curvas: true, drenaje: true, corte: true, x5: false }, vista: "mapa", maqueta: null,
  modelo: null, desague: 10, crecida: 0 };   // desagües pluviales supuestos: 10 mm/h en superficies impermeables (no hay datos)
const AGUA_MIN = 0.1;   // desde 10 cm se cuenta como zona con agua
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
  SIM.modelo?.worker?.terminate(); SIM.modelo = null;
  cerrarMaqueta(); SIM.vista = "mapa"; SIM.corte3d = false;
  document.querySelectorAll(".sim-leyenda-mapa, .sim-vistas").forEach((el) => el.remove());
  Tip.ocultar();
}

// ---------- Relieve: mosaico de teselas Terrarium ----------
const lonDeX = (x, z) => (x / 2 ** z) * 360 - 180;
const latDeY = (y, z) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;
const xDeLon = (lon, z) => ((lon + 180) / 360) * 2 ** z;
const yDeLat = (lat, z) => ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z;

async function relieveDe(caja) {
  const [x0, y0, x1, y1] = caja;
  let z = 15;   // hasta ~4 m por píxel en radios chicos (el relieve de base es de ~30 m, pero así las líneas quedan finas);
  // se baja de a un nivel mientras el área necesite más de 5 × 5 teselas (radio de 1 km: z 15; 2 km: z 14; 5 km o más: z 13 o menos)
  while (z > 9 && (Math.floor(xDeLon(x1, z)) - Math.floor(xDeLon(x0, z)) > 4 || Math.floor(yDeLat(y0, z)) - Math.floor(yDeLat(y1, z)) > 4)) z--;
  const tx0 = Math.floor(xDeLon(x0, z)), tx1 = Math.floor(xDeLon(x1, z)), ty0 = Math.floor(yDeLat(y1, z)), ty1 = Math.floor(yDeLat(y0, z));
  const W = (tx1 - tx0 + 1) * 256, H = (ty1 - ty0 + 1) * 256;
  const marco = { W, H, z, tx0, ty0, oeste: lonDeX(tx0, z), este: lonDeX(tx1 + 1, z), norte: latDeY(ty0, z), sur: latDeY(ty1 + 1, z) };
  // En las 20 ciudades prioritarias: terreno sin edificios ni árboles (FABDEM), si cubre toda el área
  const fab = await terrenoFabdem(marco).catch((e) => { console.warn(e); return null; });
  if (fab) return { ...marco, h: fab, fuente: "fabdem" };
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
  return { ...marco, h, fuente: "aws" };
}

// Terreno FABDEM (bloques de 0,25° preparados con preparar_terreno_fabdem.py): alturas en la grilla de teselas del simulador,
// interpoladas (bilineal) desde los puntos cada 1 segundo de arco. null si algún bloque necesario no existe.
let indiceFabdem = null;
async function terrenoFabdem(m) {
  indiceFabdem ??= await fetch("datos/terreno/indice.json").then((r) => (r.ok ? r.json() : { bloques: [] })).catch(() => ({ bloques: [] }));
  const B = indiceFabdem.bloque, PXB = indiceFabdem.px, hay = new Map((indiceFabdem.bloques ?? []).map((b) => [`${Math.round(b.lon0 / B)}_${Math.round(b.lat0 / B)}`, b]));
  if (!hay.size) return null;
  const necesarios = [];
  for (let bx = Math.floor(m.oeste / B); bx <= Math.floor(m.este / B); bx++)
    for (let by = Math.floor(m.sur / B); by <= Math.floor(m.norte / B); by++) {
      const b = hay.get(`${bx}_${by}`);
      if (!b) return null;
      necesarios.push([bx, by, b]);
    }
  const alturas = new Map();
  await Promise.all(necesarios.map(async ([bx, by, b]) => {
    const img = await createImageBitmap(await fetch(`datos/terreno/${b.archivo}`).then((r) => r.blob()));
    const cv = new OffscreenCanvas(PXB, PXB), c = cv.getContext("2d", { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    const px = c.getImageData(0, 0, PXB, PXB).data, a = new Float32Array(PXB * PXB);
    for (let i = 0; i < a.length; i++) a[i] = px[4 * i] * 256 + px[4 * i + 1] + px[4 * i + 2] / 256 - 32768;
    alturas.set(`${bx}_${by}`, a);
  }));
  const muestra = (lon, lat) => {   // valor en un punto (bilineal dentro del bloque)
    const bx = Math.floor(lon / B), by = Math.floor(lat / B), a = alturas.get(`${bx}_${by}`);
    if (!a) return 0;
    const fx = (lon - bx * B) * 3600 - 0.5, fy = ((by + 1) * B - lat) * 3600 - 0.5;
    const x0 = limitar(Math.floor(fx), 0, PXB - 2), y0 = limitar(Math.floor(fy), 0, PXB - 2), ax = limitar(fx - x0, 0, 1), ay = limitar(fy - y0, 0, 1);
    const i = y0 * PXB + x0;
    return (a[i] * (1 - ax) + a[i + 1] * ax) * (1 - ay) + (a[i + PXB] * (1 - ax) + a[i + PXB + 1] * ax) * ay;
  };
  const h = new Float32Array(m.W * m.H), lon = new Float64Array(m.W);
  for (let x = 0; x < m.W; x++) lon[x] = lonDeX(m.tx0 + (x + 0.5) / 256, m.z);
  for (let y = 0; y < m.H; y++) { const lat = latDeY(m.ty0 + (y + 0.5) / 256, m.z); for (let x = 0; x < m.W; x++) h[y * m.W + x] = muestra(lon[x], lat); }
  return h;
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
  const mPx0 = (40075016 * Math.cos((s.punto[1] * Math.PI) / 180)) / (256 * 2 ** D.z);
  const agua = mascaraAgua(D, aPx, Math.max(1, Math.round(30 / mPx0)));   // ~30 m de orilla
  // Coordenadas de cada píxel y máscara del círculo (sin ríos ni lagunas)
  const lonP = new Float64Array(W), latP = new Float64Array(H);
  for (let x = 0; x < W; x++) lonP[x] = lonDeX(D.tx0 + (x + 0.5) / 256, D.z);
  for (let y = 0; y < H; y++) latP[y] = latDeY(D.ty0 + (y + 0.5) / 256, D.z);
  const dentro = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!agua[y * W + x] && distanciaKm(s.punto, [lonP[x], latP[y]]) <= s.km) dentro[y * W + x] = 1;
  // Suavizado de ~75 m (baja el ruido de edificios y árboles; igual en metros con cualquier resolución); el agua no cuenta como bajo
  const metrosPx = (40075016 * Math.cos((s.punto[1] * Math.PI) / 180)) / (256 * 2 ** D.z);
  const hs = promedioLocal(Float32Array.from(D.h, (v, i) => (agua[i] ? Infinity : v)), W, H, Math.max(1, Math.round(37 / metrosPx)));
  for (let i = 0; i < N; i++) if (agua[i]) hs[i] = Infinity;
  const celdas = [];
  for (let i = 0; i < N; i++) if (dentro[i]) celdas.push(i);
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
  // Maqueta: todo el círculo (con ríos y lagunas, al nivel de la tierra más baja que los rodea)
  const circulo = new Uint8Array(N), hLago = minimoLocal(hs, W, H, 6);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (distanciaKm(s.punto, [lonP[x], latP[y]]) <= s.km) circulo[y * W + x] = 1;
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
  SIM.datos = { D, s, celdas, radios, radioDe, celdasRadio, areaCelda: metrosPx ** 2, metrosPx,
    hs, dentro, hMin, hMax, curva, cauce, orilla, lonP, latP, filaCorte, circulo, hLago };
  est.textContent = "";
  agregarAguaAlMapa(D);
  pintarPanelSimulador(SIM.datos);
  simularPeriodo(sumarDias(limitesPeriodo().hoy, 6));   // al abrir: la semana que viene, desde la lluvia real de las últimas dos semanas
}

// Ríos, lagunas y embalses del mapa base, rasterizados a la grilla del relieve
function mascaraAgua(D, aPx, r = 2) {
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
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < D.W && yy < D.H) out[yy * D.W + xx] = 1;
    }
  }
  return out;
}

// ---------- Corrida del modelo hidráulico ----------
// Corre desde hace 14 días (dato real: el suelo y las lagunas llegan a hoy como están) hasta la fecha elegida. Cada hora
// calculada se guarda (profundidad en mm por celda) y la línea de tiempo permite recorrerlas.
const COLOR_TIPO = ["#7b8794", "#0e7490", "#8e6bbf"];   // dato real · pronóstico · escenario estacional
function avisoProgreso(txt) { const p = document.getElementById("sim-progreso"); if (p) { p.textContent = txt; p.hidden = !txt; } }

async function simularPeriodo(hastaISO, tormentaMm = 0) {
  const d = SIM.datos;
  if (!d) return;
  detenerAnimaciones();
  SIM.modelo?.worker?.terminate();
  const M = (SIM.modelo = { frames: [], lagos: [], stats: [], hora: 0, corriendo: true, siguiendo: true, hasta: hastaISO, tormenta: tormentaMm });
  avisoProgreso(t("sim_bajando"));
  let met;
  try { met = await lluviaDelPunto(d.s.punto, hastaISO); } catch (e) { console.error(e); avisoProgreso(t("sim_error_meteo")); return; }
  if (SIM.modelo !== M) return;
  const fin = Date.parse(`${hastaISO}T23:59:00-03:00`);
  let n = met.horas.findIndex((x) => x > fin);
  if (n < 0) n = met.horas.length;
  for (const k of ["horas", "lluvia", "et0", "tipo"]) met[k] = met[k].slice(0, n);
  M.hoy = Math.max(0, met.tipo.indexOf(1));
  if (tormentaMm) [0.4, 0.4, 0.2].forEach((f, j) => { if (M.hoy + j < n) met.lluvia[M.hoy + j] += tormentaMm * f; });   // tormenta de prueba: ahora, en 3 h
  const g = grillaModelo(d, n);
  g.celdaFina = new Int32Array(d.D.W * d.D.H);
  for (let i = 0; i < g.celdaFina.length; i++) g.celdaFina[i] = g.celdaDe(i);
  g.nDentro = g.dentroC.reduce((a, b) => a + b, 0);
  M.met = met; M.g = g;
  M.suelo = (await sueloEn(d.s.punto).catch(() => null)) ?? { ...TEXTURAS.franco, nombre: "franco", supuesto: true };
  if (SIM.modelo !== M) return;
  const w = (M.worker = new Worker("hidraulica.js"));
  w.onmessage = (e) => recibirHora(M, e.data);
  w.onerror = (e) => { avisoProgreso(t("sim_error")); console.error(e); };
  w.postMessage({ tipo: "iniciar", nx: g.nx, ny: g.ny, dx: g.dx, z: g.z, tipo2: g.tipo2, lago: g.lago, nMan: g.nMan, imp: g.imp,
    suelo: M.suelo, theta0: met.theta0, desague: SIM.desague, crecida: SIM.crecida, lluvia: Float32Array.from(met.lluvia), et0: Float32Array.from(met.et0) });
  pintarLineaSim();
}

function recibirHora(M, m) {
  if (SIM.modelo !== M) return;
  if (m.tipo === "hora") {
    const f = new Uint16Array(m.h.length);
    for (let i = 0; i < f.length; i++) f[i] = Math.min(65535, Math.round(m.h[i] * 1000));
    M.frames.push(f); M.lagos.push(Float32Array.from(m.lagos)); M.stats.push(estadisticaHora(M, m.h));
    const dia = Math.floor(m.k / 24) + 1, total = Math.ceil(m.horas / 24);
    avisoProgreso(t("sim_calculando")(dia, total, t(`sim_tipo_${TIPO_DATO[M.met.tipo[m.k]]}`)));
    if (M.siguiendo && (m.k % 3 === 0 || m.k === m.horas - 1)) { M.hora = M.frames.length - 1; mostrarHora(); }
    else if (m.k % 6 === 0) pintarLineaSim();
  } else if (m.tipo === "fin") {
    M.corriendo = false; M.cuenta = m.cuenta;
    // Al terminar: la hora con más agua desde hoy
    let pico = M.hoy;
    for (let k = M.hoy; k < M.stats.length; k++) if (M.stats[k].pct > M.stats[pico].pct) pico = k;
    M.pico = pico; M.hora = pico; M.siguiendo = false;
    avisoProgreso("");
    mostrarHora();
  }
}

function estadisticaHora(M, h) {
  const g = M.g;
  let n = 0, maxP = 0, pers = 0;
  for (let c = 0; c < g.N; c++) {
    if (!g.dentroC[c] || g.tipo2[c] !== 1) continue;
    const p = h[c] - g.cauce[c];   // el agua dentro de un arroyo o canal no es inundación
    if (p >= AGUA_MIN) { n++; pers += g.pob[c]; }
    if (p > maxP) maxP = p;
  }
  return { pct: (100 * n) / Math.max(1, g.nDentro), km2: (n * g.dx * g.dx) / 1e6, maxProf: maxP, personas: pers };
}

// Profundidad del agua en un píxel del relieve: el nivel del agua de su celda del modelo contra la altura fina del píxel
// (así el borde del agua sigue el terreno con más detalle que la celda)
function aguaFina(i) {
  const M = SIM.modelo, d = SIM.datos;
  if (!M?.frames.length) return 0;
  const g = M.g, c = g.celdaFina[i];
  if (c < 0) return 0;
  if (g.tipo2[c] === 2) { const sube = M.lagos[M.hora]?.[g.lago[c]] ?? 0; return sube > 0.05 ? sube : 0; }
  if (g.tipo2[c] !== 1) return 0;
  const h = M.frames[M.hora][c] / 1000;
  if (h < 0.01) return 0;
  const zf = Number.isFinite(d.hs[i]) ? d.hs[i] : g.z[c];
  return Math.max(0, Math.min(g.z[c] + h - zf, h * 3));
}

function mostrarHora() {
  if (!SIM.datos || !SIM.modelo?.frames.length) return;
  actualizarNumeros();
  pintarLineaSim();
  if (SIM.vista === "maqueta") { SIM.mapaSucio = true; actualizarMaqueta(); } else dibujarAgua();
}

// Línea de tiempo: arriba la lluvia de cada día (gris = dato real, cian = pronóstico, violeta = escenario estacional);
// abajo, el % del círculo con agua de 10 cm o más; la marca es la hora que se ve; se puede tocar para ir a otra hora.
function pintarLineaSim() {
  const cont = document.getElementById("sim-linea"), M = SIM.modelo;
  if (!cont || !M?.met) return;
  const met = M.met, n = met.horas.length, ancho = Math.max(240, cont.clientWidth), alto = 120, iz = 4, de = 4;
  const x = (k) => iz + (k / Math.max(1, n - 1)) * (ancho - iz - de);
  const dias = [];
  for (let k = 0; k < n; k += 24) { let s = 0, tp = met.tipo[k]; for (let j = k; j < Math.min(n, k + 24); j++) s += met.lluvia[j]; dias.push([k, s, tp]); }
  const maxL = Math.max(10, ...dias.map((v) => v[1])), maxP = Math.max(1, ...M.stats.map((s) => s.pct));
  const barras = dias.map(([k, s, tp]) => `<rect x="${x(k).toFixed(1)}" y="${(52 - (s / maxL) * 46).toFixed(1)}" width="${Math.max(1, x(k + 24) - x(k) - 1).toFixed(1)}" height="${((s / maxL) * 46).toFixed(1)}" fill="${COLOR_TIPO[tp]}"/>`).join("");
  const linea = M.stats.map((s, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${(112 - (s.pct / maxP) * 46).toFixed(1)}`).join("");
  const hito = (k, txt) => (k >= 0 && k < n ? `<line x1="${x(k)}" x2="${x(k)}" y1="2" y2="114" class="sim-hito"/><text x="${x(k) + 3}" y="${k > n * 0.8 ? 64 : 64}" class="sim-hito-txt"${k > n * 0.8 ? ` text-anchor="end" dx="-6"` : ""}>${txt}</text>` : "");
  const finPron = met.tipo.indexOf(2);
  cont.innerHTML = `<svg width="${ancho}" height="${alto}" class="sim-linea-svg" role="img" aria-label="${t("sim_linea")}">
    <rect x="${x(M.frames.length - 1)}" y="0" width="${Math.max(0, x(n - 1) - x(M.frames.length - 1))}" height="${alto}" class="sim-pendiente"/>
    ${barras}<path d="${linea}" class="sim-linea-area"/>
    ${hito(M.hoy, t("sim_hito_hoy"))}${finPron > 0 ? hito(finPron, t("sim_hito_fin_pron")) : ""}${M.pico != null ? hito(M.pico, t("sim_hito_pico")) : ""}
    <line x1="${x(M.hora)}" x2="${x(M.hora)}" y1="0" y2="${alto}" class="sim-marca"/></svg>
    <div class="sim-linea-ley"><span><i style="background:${COLOR_TIPO[0]}"></i>${t("sim_tipo_real")}</span><span><i style="background:${COLOR_TIPO[1]}"></i>${t("sim_tipo_pronostico")}</span>${finPron > 0 ? `<span><i style="background:${COLOR_TIPO[2]}"></i>${t("sim_tipo_escenario")}</span>` : ""}<span><i class="sim-ley-linea"></i>${t("sim_area")}</span></div>`;
  const svg = cont.querySelector("svg");
  const ir = (ev) => {
    const r = svg.getBoundingClientRect(), k = Math.round(((ev.clientX - r.left - iz) / (ancho - iz - de)) * (n - 1));
    M.siguiendo = false; M.hora = limitar(k, 0, M.frames.length - 1); detenerAnimaciones(); mostrarHora();
  };
  svg.onpointerdown = (ev) => { ir(ev); svg.setPointerCapture(ev.pointerId); svg.onpointermove = (e2) => { if (e2.buttons) ir(e2); }; };
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
      SIM.zoomAjuste = m.getZoom();   // referencia para pasar la distancia de la cámara a la maqueta
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
  agregarBotonesVista();
  actualizarCorteEnMapa();
  dibujarAgua();
}

// Una sola imagen por cuadro, de abajo hacia arriba: colores por altura → curvas → agua → drenaje
function dibujarAgua() {
  const d = SIM.datos, cv = SIM.lienzo, C = SIM.capas;
  if (!d || !cv || !SIM.mapa?.getSource("agua-sim")) return;
  const ctx = cv.getContext("2d"), img = ctx.createImageData(cv.width, cv.height), px = img.data;
  const rango = d.hMax - d.hMin || 1;
  for (let k = 0; k < d.celdas.length; k++) {
    const i = d.celdas[k];
    let c = null;
    if (C.colores) c = colorEscala(COLOR_ALTURA, limitar((d.hs[i] - d.hMin) / rango, 0, 1));
    if (C.curvas && d.curva[i]) c = c ? [c[0] * 0.55, c[1] * 0.55, c[2] * 0.5, 0.8] : [70, 60, 50, 0.55];
    const p = aguaFina(i);
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
  SIM.mapaSucio = false;
}

// ---------- Maqueta 3D: el círculo recortado, con imagen satelital y lluvia animada ----------
// three.js se carga solo la primera vez que se pide la maqueta. Arrastrar gira la cámara alrededor de la maqueta;
// la rueda o el pellizco acercan. Al tocar ▶ llueve: el terreno se moja, líneas blancas bajan siguiendo la pendiente
// y se juntan donde se descarga el agua, y los bajos se llenan.
//   - Las líneas y la película de agua salen de un modelo de escurrimiento (cada celda le pasa agua a sus vecinas más
//     bajas según la diferencia de nivel, sobre el relieve suavizado ~120 m para no seguir cada edificio).
//   - Los bajos llenos y las cifras del panel salen del mismo cálculo de llenado que el mapa (así todo coincide).
const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js";
const SATELITE = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg";   // mosaico sin nubes de 2025 (el más nuevo)
const FPS_LLUVIA = 24, CUADROS_LLUVIA = 170, CUADROS_ESCURRE = 130, SUBPASOS = 6, LARGO_COLA = 10;
let cargaThree = null;
const cargarThree = () => (cargaThree ??= new Promise((ok, mal) => {
  const sc = document.createElement("script"); sc.src = THREE_URL; sc.onload = ok; sc.onerror = () => { cargaThree = null; mal(new Error("three")); };
  document.head.appendChild(sc);
}));

function agregarBotonesVista() {
  const marco = document.querySelector(".sim-mapa-marco");
  marco.querySelector(".sim-vistas")?.remove();
  const el = document.createElement("div");
  el.className = "sim-vistas"; el.setAttribute("role", "group"); el.setAttribute("aria-label", t("sim_vista"));
  el.innerHTML = ["mapa", "maqueta"].map((v) => `<button type="button" data-v="${v}" aria-pressed="${SIM.vista === v}">${t(`sim_vista_${v}`)}</button>`).join("");
  el.querySelectorAll("button").forEach((b) => { b.onclick = () => elegirVistaSimulador(b.dataset.v); });
  marco.appendChild(el);
  // Relieve ×5 también sobre el mapa: en el celular el panel con los filtros queda debajo y no se ve
  marco.querySelector(".sim-x5")?.remove();
  const x5 = document.createElement("button");
  x5.type = "button"; x5.className = "sim-x5"; x5.textContent = t("sim_f_x5"); x5.title = t("sim_f_x5_ayuda");
  x5.setAttribute("aria-pressed", String(SIM.capas.x5));
  x5.onclick = () => document.querySelector('#sim-filtros [data-k="x5"]')?.click();
  marco.appendChild(x5);
}

async function elegirVistaSimulador(v) {
  if (SIM.vista === v && (v === "mapa" || SIM.maqueta)) return;
  detenerAnimaciones();
  pasarCamara(SIM.vista, v);
  SIM.vista = v;
  document.querySelectorAll(".sim-vistas button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
  document.querySelector(".sim-leyenda-mapa")?.classList.toggle("oculta-maqueta", v === "maqueta");
  pintarFiltrosSimulador();
  if (v === "mapa") {
    if (SIM.maqueta) SIM.maqueta.capa.hidden = true;
    if (SIM.mapaSucio) dibujarAgua();
    return;
  }
  const est = document.getElementById("sim-estado");
  try {
    if (!SIM.maqueta) est.textContent = t("sim_cargando_maqueta");
    await cargarThree();
    if (SIM.vista !== "maqueta" || !SIM.datos) return;
    if (!SIM.maqueta) await crearMaqueta();
  } catch (e) { est.textContent = t("sim_error"); console.error(e); return; }
  est.textContent = "";
  if (SIM.vista !== "maqueta" || !SIM.maqueta) return;
  if (SIM.camaraPendiente) { Object.assign(SIM.maqueta, SIM.camaraPendiente); SIM.camaraPendiente = null; }
  SIM.maqueta.capa.hidden = false;
  SIM.maqueta.redimensionar();
  actualizarMaqueta(true);
}

// Al cambiar de vista se conserva la cámara: rumbo del mapa ↔ giro de la maqueta, inclinación ↔ elevación, zoom ↔ distancia
function pasarCamara(de, a) {
  const m = SIM.mapa, M = SIM.maqueta;
  if (!m || de === a) return;
  if (a === "maqueta") {
    const cam = { azimut: (-m.getBearing() * Math.PI) / 180, elevacion: limitar(((90 - m.getPitch()) * Math.PI) / 180, 0.08, 1.45),
      distancia: limitar(2 ** ((SIM.zoomAjuste ?? m.getZoom()) - m.getZoom()) * 0.85, 0.3, 2.5) };
    if (M) Object.assign(M, cam); else SIM.camaraPendiente = cam;
  } else if (M) {
    m.jumpTo({ bearing: (-M.azimut * 180) / Math.PI, pitch: limitar(90 - (M.elevacion * 180) / Math.PI, 0, 80),
      zoom: (SIM.zoomAjuste ?? m.getZoom()) - Math.log2(M.distancia / 0.85), center: SIM.datos?.s.punto });
  }
}

// Imagen satelital (Sentinel-2 sin nubes, EOX) del recuadro del círculo, a `S` píxeles por píxel de relieve
async function sateliteDe(D, x0, y0, bw, bh, S) {
  const cv = document.createElement("canvas");
  cv.width = Math.round(bw * S); cv.height = Math.round(bh * S);
  const c = cv.getContext("2d");
  c.fillStyle = "rgb(150,140,110)"; c.fillRect(0, 0, cv.width, cv.height);
  const k = Math.min(Math.ceil(Math.log2(S)), 15 - D.z), z = D.z + k, f = 2 ** k;   // la imagen llega hasta z 15 (detalle real ~10 m)
  const gx0 = D.tx0 * 256 + x0, gy0 = D.ty0 * 256 + y0;   // píxeles globales del relieve en el zoom D.z
  const tiles = [];
  for (let tx = Math.floor((gx0 * f) / 256); tx <= Math.floor(((gx0 + bw) * f) / 256); tx++)
    for (let ty = Math.floor((gy0 * f) / 256); ty <= Math.floor(((gy0 + bh) * f) / 256); ty++) tiles.push([tx, ty]);
  const bajar = async ([tx, ty]) => {
    for (let intento = 0; intento < 3; intento++) {
      try {
        const r = await fetch(SATELITE.replace("{z}", z).replace("{x}", tx).replace("{y}", ty));
        if (!r.ok) throw new Error(r.status);
        const lado = (256 / f) * S;
        c.drawImage(await createImageBitmap(await r.blob()), ((tx * 256) / f - gx0) * S, ((ty * 256) / f - gy0) * S, lado, lado);
        return;
      } catch (e) { await new Promise((ok) => setTimeout(ok, 400 * (intento + 1))); }
    }
  };
  for (let i = 0; i < tiles.length; i += 6) await Promise.all(tiles.slice(i, i + 6).map(bajar));   // de a 6 para no saturar el servidor
  return cv;
}

async function crearMaqueta() {
  const d = SIM.datos, D = d.D, W = D.W, H = D.H, m = d.metrosPx;
  // Recuadro del círculo, en píxeles del relieve
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let i = 0; i < d.circulo.length; i++) if (d.circulo[i]) { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, S = Math.min(2, 1024 / Math.max(bw, bh));
  const sat = await sateliteDe(D, x0, y0, bw, bh, S);
  if (SIM.datos !== d) return;
  const marco = document.querySelector(".sim-mapa-marco");
  const capa = document.createElement("div");
  capa.className = "sim-maqueta";
  capa.innerHTML = `<p class="sim-maqueta-ayuda">${t("sim_maqueta_ayuda")}</p><p class="sim-lluvia-estado" hidden></p>
    <p class="sim-credito-sat"><a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless 2025 · EOX</a> (${t("sim_credito_sat")})</p>`;
  marco.appendChild(capa);
  const ren = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  ren.setPixelRatio(Math.min(2, devicePixelRatio));
  ren.localClippingEnabled = true;   // para cortar la maqueta por la línea del corte
  capa.prepend(ren.domElement);
  // Malla: un vértice cada `paso` píxeles del relieve dentro del círculo (~260 por lado como máximo)
  const cx = (x0 + x1 + 1) / 2, cy = (y0 + y1 + 1) / 2, R = bw / 2;
  const paso = Math.max(1, Math.ceil(bw / 260)), celdas = [], pos = [], uv = [], idx = [], id = new Map();
  for (let y = y0; y <= y1; y += paso) for (let x = x0; x <= x1; x += paso) {
    const i = y * W + x;
    if (!d.circulo[i]) continue;
    id.set(i, celdas.length); celdas.push(i);
    pos.push((x + 0.5 - cx) * m, 0, (y + 0.5 - cy) * m);
    uv.push((x - x0 + 0.5) / bw, 1 - (y - y0 + 0.5) / bh);
  }
  for (let y = y0; y + paso <= y1; y += paso) for (let x = x0; x + paso <= x1; x += paso) {
    const a = id.get(y * W + x), b = id.get(y * W + x + paso), c = id.get((y + paso) * W + x), e = id.get((y + paso) * W + x + paso);
    if (a != null && b != null && c != null) idx.push(a, c, b);
    if (b != null && c != null && e != null) idx.push(b, c, e);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const textura = document.createElement("canvas");
  textura.width = sat.width; textura.height = sat.height;
  const tex = new THREE.CanvasTexture(textura);
  tex.anisotropy = 4;
  const escena = new THREE.Scene();
  const matTerreno = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
  escena.add(new THREE.Mesh(geo, matTerreno));
  // Paredes con capas de tierra y base
  const N = 360, borde = [];
  for (let k = 0; k <= N; k++) {
    const an = (k / N) * Math.PI * 2;
    let i = -1;
    for (let f = 0.995; f > 0.9 && i < 0; f -= 0.005) {
      const j = Math.round(cy - 0.5 + Math.sin(an) * R * f) * W + Math.round(cx - 0.5 + Math.cos(an) * R * f);
      if (d.circulo[j]) i = j;
    }
    borde.push({ x: Math.cos(an) * R * m, z: Math.sin(an) * R * m, i });
  }
  const pared = new THREE.BufferGeometry(), capas = [[0, [150, 120, 85]], [0.3, [122, 94, 64]], [0.65, [98, 76, 53]], [1, [78, 60, 44]]];
  const pi = [];
  for (let k = 0; k < N; k++) for (let j = 0; j < 3; j++) { const a = k * 4 + j, b = a + 4; pi.push(a, a + 1, b, b, a + 1, b + 1); }
  pared.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array((N + 1) * 4 * 3), 3));
  pared.setAttribute("color", new THREE.Float32BufferAttribute(borde.flatMap(() => capas.flatMap(([, c]) => c.map((v) => v / 255))), 3));
  pared.setIndex(pi);
  const matPared = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  escena.add(new THREE.Mesh(pared, matPared));
  const matBase = new THREE.MeshLambertMaterial({ color: 0x4f3e2c, side: THREE.DoubleSide });
  const base = new THREE.Mesh(new THREE.CircleGeometry(R * m, 128), matBase);
  base.rotation.x = Math.PI / 2; escena.add(base);
  const sombra = new THREE.Mesh(new THREE.CircleGeometry(R * m * 1.07, 96), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 }));
  sombra.rotation.x = -Math.PI / 2; escena.add(sombra);
  escena.add(new THREE.AmbientLight(0xffffff, 0.62));
  const sol = new THREE.DirectionalLight(0xffffff, 0.75); sol.position.set(-1, 1.4, -0.6); escena.add(sol);
  const cam = new THREE.PerspectiveCamera(32, 1, 10, 1e7);
  const M = { capa, ren, escena, cam, geo, pared, base, sombra, tex, textura, sat, celdas, borde, R: R * m,
    x0, y0, bw, bh, S, cx, cy, materiales: [matTerreno, matPared, matBase], plano: new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), tapa: new THREE.Group(),
    azimut: 0.9, elevacion: 0.42, distancia: 0.7, dibujar: 0, mmCharcos: null };
  escena.add(M.tapa);
  M.part = crearParticulas();
  M.charcos = document.createElement("canvas"); M.charcos.width = bw; M.charcos.height = bh;
  M.pelicula = document.createElement("canvas");
  // Cámara orbital: arrastrar gira (azimut y elevación), rueda o pellizco acercan
  const lienzo = ren.domElement, toques = new Map();
  let previo = null;
  lienzo.style.touchAction = "none";
  lienzo.addEventListener("pointerdown", (e) => { lienzo.setPointerCapture(e.pointerId); toques.set(e.pointerId, [e.clientX, e.clientY]); previo = null; });
  lienzo.addEventListener("pointermove", (e) => {
    if (!toques.has(e.pointerId)) return;
    const ant = toques.get(e.pointerId);
    toques.set(e.pointerId, [e.clientX, e.clientY]);
    if (toques.size === 1) {
      M.azimut -= (e.clientX - ant[0]) * 0.008;
      M.elevacion = limitar(M.elevacion + (e.clientY - ant[1]) * 0.006, 0.08, 1.45);
    } else {
      const [p, q] = [...toques.values()], dist = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (previo) M.distancia = limitar(M.distancia * (previo / dist), 0.3, 2.5);
      previo = dist;
    }
    pedirCuadroMaqueta();
  });
  const soltar = (e) => { toques.delete(e.pointerId); previo = null; };
  lienzo.addEventListener("pointerup", soltar); lienzo.addEventListener("pointercancel", soltar);
  lienzo.addEventListener("wheel", (e) => { e.preventDefault(); M.distancia = limitar(M.distancia * Math.exp(e.deltaY * 0.001), 0.3, 2.5); pedirCuadroMaqueta(); }, { passive: false });
  M.redimensionar = () => {
    const w = capa.clientWidth, h = capa.clientHeight;
    if (!w || !h) return;
    ren.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    pedirCuadroMaqueta();
  };
  M.observador = new ResizeObserver(() => M.redimensionar());
  M.observador.observe(capa);
  SIM.maqueta = M;
}

// ---------- Líneas blancas que bajan con el agua (siguen la pendiente de la superficie del agua del modelo) ----------
function crearParticulas() {
  const NP = innerWidth < 700 ? 1500 : 2600;
  return { NP, px: new Float32Array(NP), py: new Float32Array(NP), vida: new Int16Array(NP), cola: new Float32Array(NP * LARGO_COLA * 2),
    cnt: new Uint8Array(NP), semilla: 11, activa: false };
}
function moverLineas(P) {
  const Mo = SIM.modelo, g = Mo?.g, fr = Mo?.frames[Mo.hora];
  if (!fr) return;
  const T = LARGO_COLA, azar = () => ((P.semilla = (P.semilla * 16807) % 2147483647) / 2147483647);
  const eta = (c) => (g.tipo2[c] === 1 ? g.z[c] + fr[c] / 1000 : g.tipo2[c] === 2 ? g.z[c] : g.z[c] - 2);
  for (let n = 0; n < P.NP; n++) {
    const cx = Math.floor((P.px[n] - g.bx0) / g.f), cy = Math.floor((P.py[n] - g.by0) / g.f), c = cy * g.nx + cx;
    P.vida[n]--;
    const fuera = cx < 1 || cy < 1 || cx >= g.nx - 1 || cy >= g.ny - 1;
    if (fuera || P.vida[n] <= 0 || g.tipo2[c] !== 1 || fr[c] < 3) {   // nace otra en una celda con agua, dentro del círculo
      for (let k = 0; k < 20; k++) {
        const c2 = Math.floor(azar() * g.N);
        if (g.dentroC[c2] && g.tipo2[c2] === 1 && fr[c2] >= 3) { P.px[n] = g.bx0 + ((c2 % g.nx) + azar()) * g.f; P.py[n] = g.by0 + (Math.floor(c2 / g.nx) + azar()) * g.f; break; }
      }
      P.vida[n] = 20 + azar() * 50; P.cnt[n] = 0;
      continue;
    }
    const gx = eta(c + 1) - eta(c - 1), gy = eta(c + g.nx) - eta(c - g.nx), m = Math.hypot(gx, gy);
    if (m > 1e-5) { const paso = g.f * 0.45; P.px[n] -= (gx / m) * paso; P.py[n] -= (gy / m) * paso; }
    const b = n * T * 2;
    if (P.cnt[n] === T) P.cola.copyWithin(b, b + 2, b + T * 2); else P.cnt[n]++;
    P.cola[b + (P.cnt[n] - 1) * 2] = P.px[n]; P.cola[b + (P.cnt[n] - 1) * 2 + 1] = P.py[n];
  }
}

// ---------- Dibujo de la maqueta ----------
// Alturas (terreno + bajos llenos, ×5 si está prendido)
function alturasMaqueta() {
  const M = SIM.maqueta, d = SIM.datos;
  const ex = SIM.capas.x5 ? 5 : 1, piso = d.hMin - 2;
  const fondo = -Math.max(10, (d.hMax - d.hMin) * 0.35) * ex;   // base de tierra: un tercio del desnivel (mínimo 10 m)
  const altura = (i) => {
    if (i < 0) return 0;
    if (!d.dentro[i]) return ((Number.isFinite(d.hLago[i]) ? d.hLago[i] - 0.3 : d.hMin) - piso) * ex;   // ríos y lagunas: a la altura de la orilla
    const p = aguaFina(i);
    return (d.hs[i] + (p >= AGUA_MIN ? p : 0) - piso) * ex;
  };
  const P = M.geo.attributes.position;
  M.celdas.forEach((i, k) => P.setY(k, altura(i)));
  P.needsUpdate = true; M.geo.computeVertexNormals();
  const Q = M.pared.attributes.position;
  M.borde.forEach((b, k) => {
    const arriba = altura(b.i);
    [0, 0.3, 0.65, 1].forEach((f, j) => Q.setXYZ(k * 4 + j, b.x, arriba + (fondo - arriba) * f, b.z));
  });
  Q.needsUpdate = true; M.pared.computeVertexNormals();
  M.base.position.y = fondo; M.sombra.position.y = fondo - 1;
  M.fondo = fondo; M.alto = (d.hMax - piso) * ex;
}

// Bajos llenos (mismo cálculo y colores que el mapa), en el recuadro del círculo
function pintarCharcos() {
  const M = SIM.maqueta, d = SIM.datos, W = d.D.W, clave = `${SIM.modelo?.frames.length ? SIM.modelo.hora : -1}|${SIM.modelo?.hasta}`;
  if (M.claveCharcos === clave) return;
  M.claveCharcos = clave;
  const c = M.charcos.getContext("2d"), img = c.createImageData(M.bw, M.bh), px = img.data;
  for (let y = 0; y < M.bh; y++) for (let x = 0; x < M.bw; x++) {
    const i = (M.y0 + y) * W + M.x0 + x;
    if (!d.circulo[i]) continue;
    const p = aguaFina(i);
    if (p < AGUA_MIN) continue;
    const col = colorEscala(COLOR_AGUA, p), o = 4 * (y * M.bw + x);
    px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = col[3] * 255;
  }
  c.putImageData(img, 0, 0);
}

// Textura: satélite → película de agua que corre → bajos llenos → líneas blancas
function texturaMaqueta() {
  const M = SIM.maqueta, P = M.part, S = M.S, ct = M.textura.getContext("2d"), Mo = SIM.modelo, g = Mo?.g, fr = Mo?.frames[Mo.hora];
  ct.drawImage(M.sat, 0, 0);
  ct.imageSmoothingEnabled = true;
  if (fr) {   // película de agua que corre (de 2 mm a 10 cm), a la resolución del modelo
    if (M.pelicula.width !== g.nx || M.pelicula.height !== g.ny) { M.pelicula.width = g.nx; M.pelicula.height = g.ny; }
    const cp = M.pelicula.getContext("2d"), img = cp.createImageData(g.nx, g.ny), px = img.data;
    for (let c = 0; c < g.N; c++) {
      const h = g.tipo2[c] === 1 ? fr[c] : 0;
      if (h < 2 || h >= AGUA_MIN * 1000) continue;
      const f = Math.min(1, Math.log10(h / 2) / Math.log10(50)), o = 4 * c;
      px[o] = 150 - 40 * f; px[o + 1] = 215 - 30 * f; px[o + 2] = 250 - 10 * f; px[o + 3] = (0.28 + 0.3 * f) * 255;
    }
    cp.putImageData(img, 0, 0);
    ct.drawImage(M.pelicula, 0, 0, g.nx, g.ny, (g.bx0 - M.x0) * S, (g.by0 - M.y0) * S, g.nx * g.f * S, g.ny * g.f * S);
  }
  pintarCharcos();
  ct.drawImage(M.charcos, 0, 0, M.bw * S, M.bh * S);
  if (P.activa) {   // líneas: una pasada por tramo de cola (el más nuevo, más blanco y grueso)
    const T = LARGO_COLA, aX = (v) => (v - M.x0) * S, aY = (v) => (v - M.y0) * S;
    ct.lineCap = "round";
    for (let r = 0; r < T - 1; r++) {
      const f = 1 - r / (T - 1);
      ct.strokeStyle = `rgba(${Math.round(190 + 65 * f)},${Math.round(225 + 30 * f)},255,${(0.9 * f).toFixed(2)})`;
      ct.lineWidth = (0.4 + 0.8 * f) * S;
      ct.beginPath();
      for (let n = 0; n < P.NP; n++) {
        const a = P.cnt[n] - 2 - r;
        if (a < 0) continue;
        const b = n * T * 2;
        ct.moveTo(aX(P.cola[b + a * 2]), aY(P.cola[b + a * 2 + 1])); ct.lineTo(aX(P.cola[b + a * 2 + 2]), aY(P.cola[b + a * 2 + 3]));
      }
      ct.stroke();
    }
  }
  M.tex.needsUpdate = true;
}

function actualizarMaqueta(alturas = false) {
  const M = SIM.maqueta;
  if (!M || !SIM.datos) return;
  // Las alturas (con los bajos llenos) se recalculan cada 4 mm mientras llueve, para no frenar la animación
  const clave = `${SIM.modelo?.hora}|${SIM.modelo?.hasta}`, salto = SIM.modelo ? Math.abs((M.horaAlturas ?? -99) - SIM.modelo.hora) : 99;
  if (alturas || (M.claveAlturas !== clave && (salto >= 3 || !SIM.reproduciendo))) { alturasMaqueta(); M.claveAlturas = clave; M.horaAlturas = SIM.modelo?.hora; if (SIM.corte3d) tapaCorte(); }
  texturaMaqueta();
  pedirCuadroMaqueta();
}

function pedirCuadroMaqueta() {
  const M = SIM.maqueta;
  if (!M || M.dibujar) return;
  M.dibujar = requestAnimationFrame(() => {
    M.dibujar = 0;
    const r = M.R, aspecto = M.cam.aspect;
    // Distancia para que entre el círculo entero (en pantallas angostas, por el ancho)
    const fovV = (M.cam.fov * Math.PI) / 180, fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspecto);
    const dist = (r * 1.25 / Math.sin(Math.min(fovV, fovH) / 2)) * M.distancia;
    const ce = Math.cos(M.elevacion);
    M.cam.position.set(Math.sin(M.azimut) * ce * dist, Math.sin(M.elevacion) * dist + (M.fondo ?? 0) * 0.3, Math.cos(M.azimut) * ce * dist);
    M.cam.lookAt(0, ((M.fondo ?? 0) + (M.alto ?? 0)) * 0.3, 0);
    M.ren.render(M.escena, M.cam);
  });
}

// Reproducción: avanza hora por hora (12 horas por segundo); en la maqueta, además, corren las líneas blancas
function detenerAnimaciones() {
  if (SIM.reproduciendo) { cancelAnimationFrame(SIM.reproduciendo); SIM.reproduciendo = 0; }
  if (SIM.maqueta) SIM.maqueta.part.activa = false;
  const btn = document.getElementById("sim-play");
  if (btn) btn.innerHTML = icono("play");
}

// ---------- El corte en 3D ----------
// Mapa: la cámara se pone al sur de la línea del corte, mirando hacia el norte. Maqueta: además se corta el terreno por
// esa línea y se ve la "tajada" de frente (suelo marrón y agua azul), igual que el gráfico del corte.
function verCorteEn3D() {
  const d = SIM.datos;
  if (!d) return;
  SIM.corte3d = !SIM.corte3d;
  const xs = filaCorte(d), lat = d.latP[d.filaCorte];
  if (SIM.vista === "mapa" && xs.length > 1 && SIM.corte3d) {
    const lon0 = d.lonP[xs[0]], lon1 = d.lonP[xs[xs.length - 1]], dLat = (lon1 - lon0) * 0.12;
    SIM.mapa.fitBounds([[lon0, lat - dLat], [lon1, lat + dLat]], { pitch: 72, bearing: 0, padding: 30, duration: movimientoReducido() ? 0 : 1200 });
  } else if (SIM.vista === "mapa") {   // de vuelta al círculo entero
    const [x0, y0, x1, y1] = cajaCirculo(d.s.punto, d.s.km * 1.05);
    SIM.mapa.fitBounds([[x0, y0], [x1, y1]], { pitch: 62, bearing: -20, padding: 20, duration: movimientoReducido() ? 0 : 1200 });
  }
  const M = SIM.maqueta;
  if (M) {
    for (const mat of M.materiales) mat.clippingPlanes = SIM.corte3d ? [M.plano] : [];
    if (SIM.corte3d) { M.antes = { azimut: M.azimut, elevacion: M.elevacion, distancia: M.distancia }; Object.assign(M, { azimut: 0, elevacion: 0.08, distancia: 0.64 }); }
    else if (M.antes) Object.assign(M, M.antes);
    tapaCorte();
    pedirCuadroMaqueta();
  }
  pintarCorte();
}

function tapaCorte() {
  const M = SIM.maqueta, d = SIM.datos;
  if (!M || !d) return;
  for (const h of [...M.tapa.children]) { h.geometry.dispose(); M.tapa.remove(h); }
  if (!SIM.corte3d) return;
  const W = d.D.W, m = d.metrosPx, ex = SIM.capas.x5 ? 5 : 1, piso = d.hMin - 2;
  const fondo = M.fondo ?? -40 * ex, zc = (d.filaCorte + 0.5 - M.cy) * m;
  M.plano.constant = zc;   // se ve lo que queda al norte de la línea (z ≤ zc)
  const puntos = [];
  for (let x = 0; x < W; x++) {
    const i = d.filaCorte * W + x;
    if (!d.circulo[i]) continue;
    const lago = !d.dentro[i], suelo = lago ? (Number.isFinite(d.hLago[i]) ? d.hLago[i] - 0.6 : d.hMin - 0.3) : d.hs[i];
    const agua = lago ? 0.3 + aguaFina(i) : aguaFina(i);
    puntos.push({ X: (x + 0.5 - M.cx) * m, suelo: (suelo - piso) * ex, agua: agua >= AGUA_MIN || lago ? (suelo + agua - piso) * ex : null });
  }
  if (puntos.length < 2) return;
  const forma = new THREE.Shape();
  forma.moveTo(puntos[0].X, fondo);
  for (const q of puntos) forma.lineTo(q.X, q.suelo);
  forma.lineTo(puntos.at(-1).X, fondo);
  const agregar = (sh, color, opacidad = 1) => {
    const g = new THREE.ShapeGeometry(sh), malla = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: opacidad < 1, opacity: opacidad, side: THREE.DoubleSide }));
    malla.position.z = zc + 0.5; M.tapa.add(malla);
  };
  agregar(forma, 0x8a6a48);
  // Agua: un polígono por tramo con agua, entre el suelo y la superficie
  let tramo = [];
  const cerrar = () => {
    if (tramo.length > 1) {
      const w = new THREE.Shape();
      w.moveTo(tramo[0].X, tramo[0].agua);
      for (const q of tramo) w.lineTo(q.X, q.agua);
      for (const q of [...tramo].reverse()) w.lineTo(q.X, q.suelo);
      agregar(w, 0x1f74c9, 0.9);
    }
    tramo = [];
  };
  for (const q of puntos) { if (q.agua != null) tramo.push(q); else cerrar(); }
  cerrar();
}

function cerrarMaqueta() {
  const M = SIM.maqueta;
  if (!M) return;
  cancelAnimationFrame(M.dibujar); M.observador.disconnect();
  M.ren.dispose(); M.geo.dispose(); M.pared.dispose(); M.tex.dispose();
  M.capa.remove();
  SIM.maqueta = null;
}

// ---------- Corte del terreno ----------
function moverCorte(lngLat) {
  const d = SIM.datos;
  if (!d || !SIM.capas.corte) return;
  const y = Math.round((yDeLat(lngLat.lat, d.D.z) - d.D.ty0) * 256);
  if (y < 0 || y >= d.D.H) return;
  d.filaCorte = y;
  actualizarCorteEnMapa();
  if (SIM.corte3d) { tapaCorte(); pedirCuadroMaqueta(); }
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
  const perfil = filaCorte(d).map((x) => {
    const i = d.filaCorte * d.D.W + x;
    return [d.hs[i], aguaFina(i)];
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
  cont.innerHTML = `<p class="sim-corte-titulo"><b>${t("sim_corte")}</b> · ${t("sim_corte_ayuda")}
      <button type="button" class="btn-corte3d" id="sim-ver-corte" aria-pressed="${!!SIM.corte3d}">${t(SIM.corte3d ? "sim_corte3d_salir" : "sim_corte3d")}</button></p>
    <svg width="${ancho}" height="${alto}" class="sim-corte-svg" role="img" aria-label="${t("sim_corte")}">
      <line class="grilla" x1="${izq}" x2="${ancho - der}" y1="${sy(hi)}" y2="${sy(hi)}"/><line class="grilla" x1="${izq}" x2="${ancho - der}" y1="${sy(lo)}" y2="${sy(lo)}"/>
      <path d="${suelo}" class="sim-suelo"/><g class="sim-agua-corte">${agua}</g>
      <text class="eje" x="${izq - 4}" y="${sy(hi) + 4}" text-anchor="end">${fmt(hi)} m</text>
      <text class="eje" x="${izq - 4}" y="${sy(lo) + 4}" text-anchor="end">${fmt(lo)} m</text>
      <text class="eje" x="${izq}" y="${alto - 4}">${t("sim_oeste")}</text>
      <text class="eje" x="${ancho - der}" y="${alto - 4}" text-anchor="end">${t("sim_este")} · ${fmt(km, 1)} km</text></svg>`;
  document.getElementById("sim-ver-corte").onclick = verCorteEn3D;
}

// ---------- Leyenda sobre el mapa y altura al pasar ----------
function agregarLeyendaSimulador() {
  const marco = document.querySelector(".sim-mapa-marco"), d = SIM.datos, C = SIM.capas;
  marco.querySelector(".sim-leyenda-mapa")?.remove();
  const el = document.createElement("div");
  el.className = "sim-leyenda-mapa" + (SIM.vista === "maqueta" ? " oculta-maqueta" : "");
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
  const p = aguaFina(i);
  Tip.mostrar(`<span class="tip-fila"><b>${fmt(d.hs[i], 1)} m</b> ${t("sim_snm")}</span>
    ${p >= 0.01 ? `<span class="tip-fila"><b>${fmt(p * 100)} cm</b> ${t("sim_de_agua")}</span>` : ""}`, e.originalEvent);
}

// ---------- Panel de control y resultados ----------
function presetsSimulador() {   // tormentas de prueba: caen ahora, en 3 horas, sobre el suelo como está hoy
  return [[t("sim_50"), 50], [t("sim_150"), 150], [t("sim_laplata"), 392]];
}

// ---------- Lluvia pronosticada en un período ----------
// Días dentro del pronóstico diario (16 días, por punto): suma del pronóstico. Días más lejanos: lluvia media mensual del
// pronóstico estacional (SEAS5) del municipio, repartida por día. Se simula como si toda esa lluvia cayera junta.
let lluviaEstacional = null;
const fechaISO = (d) => d.toISOString().slice(0, 10);
const sumarDias = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return fechaISO(d); };
function limitesPeriodo() {
  const T = estado.tiempo, hoy = T ? T.dias[diaHoy(T)] : hoyLocal();
  const ultimoMes = lluviaEstacional?.meses.at(-1);
  const fin = ultimoMes ? fechaISO(new Date(Date.UTC(+ultimoMes.slice(0, 4), +ultimoMes.slice(5, 7), 0, 12))) : T?.dias.at(-1) ?? hoy;
  return { hoy, fin };
}
function lluviaPeriodo(desde, hasta) {
  const T = estado.tiempo, s = estado.sel, E = lluviaEstacional;
  if (!s || desde > hasta) return null;
  const serie = T ? seriePunto(T, T.diario.lluvia, T.dias.length, s.punto[0], s.punto[1]) : [];
  const mensual = E?.cmu[s.cmu] ?? null;
  let diario = 0, estacional = 0, diasDiario = 0, diasEst = 0, sinDato = 0, hastaDiario = null;
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) {
    const k = T ? T.dias.indexOf(d) : -1;
    if (k >= 0 && serie[k] != null) { diario += serie[k]; diasDiario++; hastaDiario = d; continue; }
    const m = E ? E.meses.indexOf(d.slice(0, 7)) : -1;
    if (m >= 0 && mensual?.[m] != null) {
      const diasMes = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 0)).getUTCDate();
      estacional += mensual[m] / diasMes; diasEst++;
    } else sinDato++;
  }
  return { total: Math.round(diario + estacional), diario: Math.round(diario), estacional: Math.round(estacional), diasDiario, diasEst, sinDato, hastaDiario };
}
async function prepararPeriodo() {
  const cont = document.getElementById("sim-periodo");
  if (!cont) return;
  if (!lluviaEstacional) lluviaEstacional = await fetch("datos/lluvia_estacional.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const { hoy, fin } = limitesPeriodo(), desde = document.getElementById("sim-desde"), hasta = document.getElementById("sim-hasta");
  for (const x of [desde, hasta]) { x.min = hoy; x.max = fin; }
  if (!desde.value) desde.value = hoy;
  if (!hasta.value) hasta.value = sumarDias(hoy, 6);
  const calcular = () => {
    if (hasta.value < desde.value) hasta.value = desde.value;
    const r = lluviaPeriodo(desde.value, hasta.value), res = document.getElementById("sim-periodo-res"), btn = document.getElementById("sim-periodo-ir");
    if (!r) { res.textContent = "–"; btn.disabled = true; return; }
    btn.disabled = !SIM.datos;
    if (SIM.modelo?.hasta) hasta.value = SIM.modelo.hasta;
    const partes = [];
    if (r.diasDiario) partes.push(t("sim_per_diario")(fmt(r.diario), fmtDia(r.hastaDiario)));
    if (r.diasEst) partes.push(t("sim_per_estacional")(fmt(r.estacional)));
    if (r.sinDato) partes.push(t("sim_per_sindato")(r.sinDato));
    res.innerHTML = `<b>${fmt(r.total)} mm</b> ${t("sim_per_en")(r.diasDiario + r.diasEst + r.sinDato)}<br><small>${partes.join(" + ")}</small>`;
    btn.dataset.mm = r.total;
  };
  desde.onchange = calcular; hasta.onchange = calcular;
  cont.querySelectorAll("[data-dias]").forEach((b) => { b.onclick = () => { desde.value = hoy; hasta.value = [sumarDias(hoy, +b.dataset.dias - 1), fin].sort()[0]; calcular(); }; });
  document.getElementById("sim-periodo-ir").onclick = () => simularPeriodo(hasta.value);
  calcular();
}

// Filtros: "Todos" prende o apaga las cuatro capas; Relieve ×5 es aparte (la escala real es la de siempre)
function pintarFiltrosSimulador() {
  const cont = document.getElementById("sim-filtros"), C = SIM.capas;
  if (!cont) return;
  const todas = CAPAS_SIM.every((k) => C[k]), maqueta = SIM.vista === "maqueta";
  // En la maqueta se ve la imagen satelital: colores, curvas y drenaje son solo de la vista Mapa
  const soloMapa = (k) => (maqueta && k !== "corte" ? ` disabled title="${t("sim_solo_mapa")}"` : "");
  cont.innerHTML = `<button type="button" class="chip" aria-pressed="${todas}" data-k="todos"${soloMapa("todos")}>${t("sim_f_todos")}</button>` +
    CAPAS_SIM.map((k) => `<button type="button" class="chip" aria-pressed="${C[k]}" data-k="${k}"${soloMapa(k)}>${t(`sim_f_${k}`)}</button>`).join("") +
    `<button type="button" class="chip chip-x5" aria-pressed="${C.x5}" data-k="x5" title="${t("sim_f_x5_ayuda")}">${t("sim_f_x5")}</button>`;
  document.querySelector(".sim-x5")?.setAttribute("aria-pressed", String(C.x5));
  cont.querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.k;
      if (k === "todos") CAPAS_SIM.forEach((c) => { C[c] = !todas; });
      else C[k] = !C[k];
      if (k === "x5") { SIM.mapa?.setTerrain({ source: "relieve-sim", exaggeration: C.x5 ? 5 : 1 }); actualizarMaqueta(true); }
      pintarFiltrosSimulador();
      if (SIM.datos) { agregarLeyendaSimulador(); actualizarCorteEnMapa(); pintarCorte(); if (SIM.vista === "mapa") dibujarAgua(); else SIM.mapaSucio = true; }
    };
  });
}

function pintarPanelSimulador(d) {
  const panel = document.getElementById("sim-panel");
  const ps = presetsSimulador();
  panel.innerHTML = `
    <div class="sim-filtros" id="sim-filtros" role="group" aria-label="${t("sim_capas")}"></div>
    <div class="sim-corte" id="sim-corte" hidden></div>
    <p class="sim-progreso" id="sim-progreso" role="status" hidden></p>
    <div class="sim-ahora"><span class="sim-ahora-fecha" id="sim-fecha">–</span><span class="sim-ahora-tipo" id="sim-tipo"></span>
      <span class="sim-ahora-lluvia" id="sim-acum"></span></div>
    <div class="sim-control">
      <button type="button" class="lt-play" id="sim-play" aria-label="${t("sim_reproducir")}">${icono("play")}</button>
      <input type="range" id="sim-barra" min="0" max="0" step="1" value="0" aria-label="${t("sim_linea")}">
    </div>
    <div class="sim-linea" id="sim-linea"></div>
    <div class="tb-datos sim-datos">
      ${dato(t("sim_area"), "–", "")}
      ${dato(t("sim_prof"), "–", t("sim_prof_sub"))}
      ${dato(t("sim_personas"), "–", t("sim_personas_sub"))}
      ${dato(t("sim_radios"), d ? fmt(d.radios.length) : "–", t("sim_radios_sub"))}
    </div>
    <div class="sim-leyenda">${COLOR_AGUA.map(([v, c]) => `<span><i style="background:${rgba(c, 0.6)}"></i>${v < 1 ? `${fmt(v * 100)} cm` : `${fmt(v)} m`}</span>`).join("")}</div>
    <div class="sim-periodo" id="sim-periodo">
      <h3 class="sim-h3">${t("sim_periodo")}</h3>
      <div class="sim-fechas"><label>${t("sim_desde")}<input type="date" id="sim-desde"></label><label>${t("sim_hasta")}<input type="date" id="sim-hasta"></label></div>
      <div class="sim-presets">${[[3, "sim_per_3d"], [7, "sim_per_1s"], [14, "sim_per_2s"], [21, "sim_per_3s"], [30, "sim_per_1m"], [90, "sim_per_3m"]]
        .map(([n, k]) => `<button type="button" class="chip" data-dias="${n}">${t(k)}</button>`).join("")}</div>
      <p class="sim-periodo-res" id="sim-periodo-res"></p>
      <button type="button" class="btn-primario" id="sim-periodo-ir" disabled>${t("sim_per_ir")}</button>
      <p class="sim-periodo-nota">${t("sim_per_nota")}</p>
    </div>
    <div class="sim-rio" id="sim-rio" hidden>
      <h3 class="sim-h3">${t("sim_rio")}</h3>
      <div class="sim-control"><input type="range" id="sim-crecida" min="-1" max="6" step="0.25" value="${SIM.crecida}" aria-label="${t("sim_rio")}"><b id="sim-crecida-v"></b></div>
      <p class="sim-periodo-nota">${t("sim_rio_nota")}</p>
    </div>
    <h3 class="sim-h3">${t("sim_tormentas")}</h3>
    <div class="sim-presets">${ps.map(([e, v], i) => `<button type="button" class="chip" data-i="${i}"${d ? "" : " disabled"}>${e} · ${fmt(v)} mm</button>`).join("")}</div>
    <details class="sim-metodo"><summary>${t("sim_como")}</summary><p>${t("sim_metodo")}</p><p id="sim-supuestos"></p></details>`;
  const barra = document.getElementById("sim-barra");
  barra.oninput = () => { const Mo = SIM.modelo; if (!Mo?.frames.length) return; detenerAnimaciones(); Mo.siguiendo = false; Mo.hora = Math.min(Number(barra.value), Mo.frames.length - 1); mostrarHora(); };
  document.getElementById("sim-play").onclick = () => reproducirSimulador();
  panel.querySelectorAll(".sim-presets .chip[data-i]").forEach((b) => { b.onclick = () => simularPeriodo(sumarDias(limitesPeriodo().hoy, 2), ps[+b.dataset.i][1]); });
  const cre = document.getElementById("sim-crecida"), creV = document.getElementById("sim-crecida-v");
  const pintarCre = () => { creV.textContent = `${SIM.crecida > 0 ? "+" : ""}${fmt(SIM.crecida, 2)} m`; };
  cre.oninput = () => { SIM.crecida = Number(cre.value); pintarCre(); };
  cre.onchange = () => { if (SIM.modelo?.hasta) simularPeriodo(SIM.modelo.hasta, SIM.modelo.tormenta); };
  pintarCre();
  pintarFiltrosSimulador();
  prepararPeriodo();
  if (d) pintarCorte();
}

// Cifras de la hora que se ve, fecha y tipo de dato, lluvia acumulada y supuestos
function actualizarNumeros() {
  const Mo = SIM.modelo, d = SIM.datos;
  if (!d || !Mo?.frames.length) return;
  const k = Mo.hora, R = Mo.stats[k], met = Mo.met, tp = TIPO_DATO[met.tipo[k]];
  const fecha = new Date(met.horas[k]);
  document.getElementById("sim-fecha").textContent = fecha.toLocaleString(estado.idioma === "en" ? "en-GB" : "es-AR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const etq = document.getElementById("sim-tipo");
  etq.textContent = t(`sim_tipo_${tp}`); etq.style.background = COLOR_TIPO[met.tipo[k]];
  let real = 0, pron = 0, esc = 0;
  for (let j = 0; j <= k; j++) { const v = met.lluvia[j]; if (met.tipo[j] === 0) real += v; else if (met.tipo[j] === 1) pron += v; else esc += v; }
  document.getElementById("sim-acum").innerHTML = t("sim_acum")(fmt(real), fmt(pron), fmt(esc));
  const barra = document.getElementById("sim-barra");
  barra.max = String(met.horas.length - 1); barra.value = String(k);
  const vals = document.querySelectorAll(".sim-datos .tb-dato-valor"), ext = document.querySelectorAll(".sim-datos .tb-dato-extra");
  vals[0].textContent = `${fmt(R.pct, R.pct < 10 ? 1 : 0)} %`; ext[0].textContent = `${fmt(R.km2, 2)} km²`;
  vals[1].textContent = R.maxProf >= 0.01 ? `${fmt(R.maxProf, 2)} m` : "–";
  vals[2].textContent = fmtPersonas(R.personas);
  const rio = document.getElementById("sim-rio");
  if (rio) rio.hidden = !Mo.g.tipo2.some((v) => v === 3);
  const sup = document.getElementById("sim-supuestos");
  if (sup) sup.textContent = `${t(d.D.fuente === "fabdem" ? "sim_terreno_fabdem" : "sim_terreno_aws")} ` + t("sim_supuestos")(Mo.suelo.nombre, Mo.suelo.supuesto, SIM.desague, fmt(Mo.g.dx), Mo.cuenta ? fmt(100 * Mo.cuenta.infiltrada / Math.max(1, Mo.cuenta.lluvia)) : "…");
  pintarCorte();
}
function actualizarSimulador() { mostrarHora(); }

// ▶: recorre las horas calculadas (12 por segundo); en la maqueta, además, corren las líneas blancas
function reproducirSimulador() {
  const Mo = SIM.modelo, btn = document.getElementById("sim-play");
  if (!Mo?.frames.length) return;
  if (SIM.reproduciendo) { detenerAnimaciones(); return; }
  if (Mo.hora >= Mo.frames.length - 1) Mo.hora = Mo.hoy;
  Mo.siguiendo = false;
  btn.innerHTML = icono("pausa");
  if (SIM.maqueta) SIM.maqueta.part.activa = true;
  let t0 = performance.now(), hora0 = Mo.hora;
  const cuadro = (ahora) => {
    const k = Math.min(Mo.frames.length - 1, hora0 + Math.floor(((ahora - t0) / 1000) * 12));
    if (k !== Mo.hora) { Mo.hora = k; actualizarNumeros(); pintarLineaSim(); if (SIM.vista === "mapa") dibujarAgua(); }
    if (SIM.vista === "maqueta" && SIM.maqueta) { moverLineas(SIM.maqueta.part); actualizarMaqueta(); }
    if (k >= Mo.frames.length - 1 && !Mo.corriendo) { detenerAnimaciones(); btn.innerHTML = icono("repetir"); return; }
    SIM.reproduciendo = requestAnimationFrame(cuadro);
  };
  SIM.reproduciendo = requestAnimationFrame(cuadro);
}

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
  capas: { colores: true, curvas: true, drenaje: true, cortes: true, flujo: true, corte: true, x5: false, refs3d: true }, vista: "mapa", maqueta: null,
  modelo: null, desague: 10, crecida: 0, tormenta: { mm: 0, horas: 3 }, velocidad: 1 };   // desagües pluviales supuestos: 10 mm/h en superficies impermeables (no hay datos)
const AGUA_MIN = 0.1;   // desde 10 cm se cuenta como zona con agua (superficie, personas)
const AGUA_VER = 0.02;  // se dibuja desde 2 cm, en celeste claro: así se ve dónde se junta el agua antes de ser profunda
const CORTE = 0.3;      // desde 30 cm una calle queda cortada para un auto (el agua en movimiento lo puede arrastrar)
const TERRARIUM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
// Agua: de celeste translúcido a azul profundo. Altura: del verde azulado de los bajos al marrón de las lomas.
const COLOR_AGUA = [[0.02, [110, 198, 252, 0.58]], [0.05, [78, 178, 248, 0.66]], [0.1, [54, 158, 242, 0.74]], [0.3, [56, 170, 235, 0.65]], [0.6, [30, 120, 210, 0.76]], [1, [22, 82, 180, 0.84]], [1.5, [14, 50, 130, 0.9]]];
const COLOR_ALTURA = [[0, [38, 120, 120, 0.6]], [0.25, [92, 160, 110, 0.6]], [0.5, [180, 196, 120, 0.6]], [0.75, [205, 170, 110, 0.6]], [1, [170, 120, 80, 0.6]]];
const CAPAS_SIM = ["cortes", "flujo", "corte"];

// Tormenta de prueba (barra de mm y duración): se suma a la lluvia real y pronosticada y se calcula de nuevo desde las últimas dos semanas
function correrTormenta(cambio) {
  Object.assign(SIM.tormenta, cambio);
  const T = SIM.tormenta, mm = document.getElementById("sim-mm");
  if (mm) { mm.value = T.mm; document.getElementById("sim-mm-valor").textContent = fmt(T.mm); }
  document.querySelectorAll("#sim-dur .chip").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.h === T.horas)));
  const hoy = limitesPeriodo().hoy;
  if (T.mm > 0) simularPeriodo(sumarDias(hoy, 1 + Math.ceil(T.horas / 24)), { ...T }, true);
  else simularPeriodo(sumarDias(hoy, 2), 0, true);
}

// Resultado de la validación contra el satélite (herramientas/validacion/validar.py); null si todavía no existe
let cargaValidacion = null;
const validacion = () => (cargaValidacion ??= fetch("datos/validacion.json").then((r) => (r.ok ? r.json() : null)).catch(() => null));

function abrirSimulador() {
  const s = estado.sel;
  if (s?.tipo !== "punto") return;
  SIM.tormenta = { mm: 80, horas: 3 };   // al abrir se ve una tormenta fuerte de prueba (80 mm en 3 h) para que haya agua acumulada; con 0 mm queda solo la lluvia real y pronosticada
  validacion().then((V) => { SIM.validacion = V; pintarValidez(); });
  const caja = document.getElementById("sim");
  caja.hidden = false;
  document.querySelector(".sim-mapa-marco").classList.add("sim-armando");   // el mapa con relieve queda oculto: se ve directo la maqueta 3D cuando está lista
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
  SIM.modelo?.worker?.terminate(); SIM.modelo = null; SIM.industrias = null;
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
  // Curvas de nivel con intervalo según el desnivel: borde entre píxeles vecinos de distinta franja
  const intervalo = intervaloCurvas(hMax - hMin);
  const curva = new Uint8Array(N);
  for (const i of celdas) {
    const b = Math.floor(hs[i] / intervalo), x = i % W;
    if ((x + 1 < W && dentro[i + 1] && Math.floor(hs[i + 1] / intervalo) !== b) || (i + W < N && dentro[i + W] && Math.floor(hs[i + W] / intervalo) !== b)) curva[i] = 1;
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
    hs, dentro, hMin, hMax, intervalo, curva, cauce, orilla, lonP, latP, filaCorte, circulo, hLago };
  est.textContent = "";
  agregarAguaAlMapa(D);
  pintarPanelSimulador(SIM.datos);
  elegirVistaSimulador("maqueta");   // solo maqueta 3D (el mapa 2D queda debajo y es el respaldo si el navegador no puede con WebGL)
  correrTormenta({});   // al abrir: la tormenta de prueba sobre la lluvia real de las últimas dos semanas
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

// Reparto de una tormenta de prueba hora a hora: 3 h con picos al comienzo (40-40-20 %), el resto parejo
const repartoTormenta = (h) => (h === 3 ? [0.4, 0.4, 0.2] : Array(h).fill(1 / h));
async function simularPeriodo(hastaISO, tormenta = 0, corto = false) {
  const tor = typeof tormenta === "number" ? { mm: tormenta, horas: 3 } : tormenta, tormentaMm = tor.mm;
  const d = SIM.datos;
  if (!d) return;
  detenerAnimaciones();
  SIM.modelo?.worker?.terminate();
  const M = (SIM.modelo = { frames: [], lagos: [], stats: [], hora: 0, corriendo: true, siguiendo: true, hasta: hastaISO, tormenta: tor, corto });
  bloquearControles(true);
  avisoProgreso(t("sim_bajando"));
  let met;
  try { met = await lluviaDelPunto(d.s.punto, hastaISO); } catch (e) { console.error(e); avisoProgreso(t("sim_error_meteo")); return; }
  if (SIM.modelo !== M) return;
  const fin = Date.parse(`${hastaISO}T23:59:00-03:00`);
  let n = met.horas.findIndex((x) => x > fin);
  if (n < 0) n = met.horas.length;
  // Tormenta de prueba: no hace falta recorrer las 2 semanas anteriores; se arranca 24 h antes de ahora con la humedad del suelo que informa
  // Open-Meteo a esa hora (así calcula en unos segundos y no en un minuto)
  const a = corto ? Math.max(0, met.tipo.indexOf(1) - 24) : 0;
  if (corto && met.theta?.[a] != null) met.theta0 = met.theta[a];
  for (const k of ["horas", "lluvia", "et0", "tipo"]) met[k] = met[k].slice(a, n);
  n -= a;
  M.hoy = Math.max(0, met.tipo.indexOf(1));
  if (tormentaMm) repartoTormenta(tor.horas).forEach((f, j) => { if (M.hoy + j < n) met.lluvia[M.hoy + j] += tormentaMm * f; });   // tormenta de prueba: desde ahora, en 1 a 24 h
  const g = grillaModelo(d, n, corto ? 100 : null);   // tormenta de prueba: celdas de ~60 m (el agua se dibuja igual sobre el relieve fino)
  g.celdaFina = new Int32Array(d.D.W * d.D.H);
  for (let i = 0; i < g.celdaFina.length; i++) g.celdaFina[i] = g.celdaDe(i);
  g.nDentro = g.dentroC.reduce((a, b) => a + b, 0);
  g.nRuta = 0;
  for (let c = 0; c < g.N; c++) if (g.ruta[c] === 1 && g.dentroC[c]) g.nRuta++;
  M.met = met; M.g = g;
  // Centros de salud del círculo (OpenStreetMap), con su celda del modelo
  const D = d.D, celdaPunto = ([lo, la]) => { const x = Math.floor((xDeLon(lo, D.z) - D.tx0) * 256), y = Math.floor((yDeLat(la, D.z) - D.ty0) * 256);
    return x >= 0 && y >= 0 && x < D.W && y < D.H ? g.celdaDe(y * D.W + x) : -1; };
  M.salud = ((await infraCriticaLista()) ?? []).filter((x) => x.g === "salud" && distanciaKm(d.s.punto, x.p) <= d.s.km)
    .map((x) => ({ n: x.n, c: celdaPunto(x.p) })).filter((x) => x.c >= 0);
  if (SIM.modelo !== M) return;
  M.suelo = (await sueloEn(d.s.punto).catch(() => null)) ?? { ...TEXTURAS.franco, nombre: "franco", supuesto: true };
  M.estacion = estado.datos.estaciones.features.map((f) => ({ ...f.properties, km: distanciaKm(d.s.punto, f.geometry.coordinates) }))
    .filter((e) => e.km <= 15 && e.h != null && (e.nivel_evacuacion != null || e.nivel_alerta != null))
    .map((e) => ({ ...e, ref: e.nivel_evacuacion ?? e.nivel_alerta + 0.5 })).sort((a, b) => a.km - b.km)[0] ?? null;
  if (SIM.modelo !== M) return;
  const w = (M.worker = new Worker("hidraulica.js"));
  w.onmessage = (e) => recibirHora(M, e.data);
  w.onerror = (e) => { avisoProgreso(t("sim_error")); console.error(e); };
  w.postMessage({ tipo: "iniciar", nx: g.nx, ny: g.ny, dx: g.dx, z: g.z, tipo2: g.tipo2, lago: g.lago, nMan: g.nMan, imp: g.imp,
    suelo: M.suelo, theta0: met.theta0, desague: SIM.desague, crecida: SIM.crecida, lluvia: Float32Array.from(met.lluvia), et0: Float32Array.from(met.et0),
    // Río: con una estación del INA a menos de 15 km, arranca con su altura de hoy respecto del nivel de evacuación (el mismo método
    // validado); la barra suma o resta metros sobre esa altura
    ...(M.estacion ? { relEvac: new Float32Array(n).fill(M.estacion.h - M.estacion.ref + SIM.crecida) } : {}) });
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
    if (m.k % 6 === 0) pintarLineaSim();   // mientras calcula no se anima nada: se muestra el resultado al terminar
  } else if (m.tipo === "fin") {
    M.corriendo = false; M.cuenta = m.cuenta;
    // Al terminar: la hora con más agua desde hoy
    let pico = M.hoy;
    for (let k = M.hoy; k < M.stats.length; k++) if (M.stats[k].pct > M.stats[pico].pct) pico = k;
    M.pico = pico; M.hora = pico; M.siguiendo = false;
    avisoProgreso("");
    bloquearControles(false);
    const hint = document.getElementById("sim-hint");
    if (hint) hint.hidden = !(M.stats[pico].pct < 0.05 && !(M.tormenta?.mm > 0));
    mostrarHora();
  }
}

function estadisticaHora(M, h) {
  const g = M.g;
  let n = 0, maxP = 0, pers = 0, cortes = 0, n3 = 0;
  for (let c = 0; c < g.N; c++) {
    if (!g.dentroC[c] || g.tipo2[c] !== 1) continue;
    if (h[c] >= 0.003) n3++;
    const p = h[c] - g.cauce[c];   // el agua dentro de un arroyo o canal no es inundación
    if (p >= AGUA_MIN) { n++; pers += g.pob[c]; }
    if (p > maxP) maxP = p;
    if (g.ruta[c] === 1 && p >= CORTE) cortes++;
  }
  return { pct: (100 * n) / Math.max(1, g.nDentro), km2: (n * g.dx * g.dx) / 1e6, maxProf: maxP, personas: pers, cortesKm: (cortes * g.dx) / 1000, pct3: (100 * n3) / Math.max(1, g.nDentro) };
}

// Profundidad del agua en un píxel del relieve: el nivel del agua de su celda del modelo contra la altura fina del píxel
// (así el borde del agua sigue el terreno con más detalle que la celda)
// Fotograma que se ve: entre dos horas calculadas se mezcla el agua (Mo.frac de 0 a 1) para que la reproducción en cámara lenta sea continua
function frameVista(M) {
  const k = M.hora, F = M.frames[k], f = M.frac || 0;
  if (!f || k >= M.frames.length - 1) return F;
  if (M.bufK !== k || M.bufF !== f) {
    const G = M.frames[k + 1], B = (M.bufVista ??= new Uint16Array(F.length));
    for (let i = 0; i < F.length; i++) B[i] = F[i] + (G[i] - F[i]) * f;
    M.bufK = k; M.bufF = f;
  }
  return M.bufVista;
}
function aguaFina(i) {
  const M = SIM.modelo, d = SIM.datos;
  if (!M?.frames.length) return 0;
  const g = M.g, c = g.celdaFina[i];
  if (c < 0) return 0;
  if (g.tipo2[c] === 2) { const sube = M.lagos[M.hora]?.[g.lago[c]] ?? 0; return sube > 0.05 ? sube : 0; }
  if (g.tipo2[c] !== 1) return 0;
  const h = frameVista(M)[c] / 1000;
  if (h < 0.01) return 0;
  const zf = Number.isFinite(d.hs[i]) ? d.hs[i] : g.z[c];
  return Math.max(0, Math.min(g.z[c] + h - zf, h * 3));
}

// Calle cortada en el píxel: su celda tiene calle (no puente) y 30 cm de agua o más en la hora que se ve
function calleCortada(i) {
  const M = SIM.modelo;
  if (!M?.frames.length) return false;
  const c = M.g.celdaFina[i];
  return c >= 0 && M.g.ruta[c] === 1 && M.g.tipo2[c] === 1 && frameVista(M)[c] / 1000 - M.g.cauce[c] >= CORTE;
}

// Acceso: desde las calles del borde (la salida del área) se recorren las calles transitables (menos de 30 cm de agua, o
// puentes). Quedan aisladas las personas que en seco llegaban a una calle conectada y ahora no; un centro de salud queda
// sin acceso si tiene agua en su celda o sus calles quedaron cortadas.
function alcanzables(g, F) {
  const { nx, ny, ruta } = g, vis = new Uint8Array(g.N), pila = [];
  const pasa = (c) => ruta[c] === 2 || (ruta[c] === 1 && g.tipo2[c] === 1 && (!F || F[c] / 1000 - g.cauce[c] < CORTE));
  const sumar = (c) => { if (!vis[c] && ruta[c] && pasa(c)) { vis[c] = 1; pila.push(c); } };
  for (let x = 0; x < nx; x++) { sumar(x); sumar((ny - 1) * nx + x); }
  for (let y = 0; y < ny; y++) { sumar(y * nx); sumar(y * nx + nx - 1); }
  while (pila.length) {
    const c = pila.pop(), x = c % nx, y = (c / nx) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const vx = x + dx, vy = y + dy;
      if (vx >= 0 && vy >= 0 && vx < nx && vy < ny) sumar(vy * nx + vx);
    }
  }
  return vis;
}
function llegaACalle(g, vis, c) {   // ¿hay una calle alcanzable a 2 celdas o menos?
  const x = c % g.nx, y = (c / g.nx) | 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const vx = x + dx, vy = y + dy;
    if (vx >= 0 && vy >= 0 && vx < g.nx && vy < g.ny && vis[vy * g.nx + vx]) return true;
  }
  return false;
}
function accesoHora(M) {
  const g = M.g, F = M.frames[M.hora];
  if (!g.nRuta) return null;
  M.visSeco ??= alcanzables(g, null);
  const vis = alcanzables(g, F), conAgua = (c) => F[c] / 1000 - g.cauce[c] >= CORTE;
  let aisladas = 0;
  for (let c = 0; c < g.N; c++) {
    if (g.dentroC[c] && g.pob[c] > 0 && !conAgua(c) && llegaACalle(g, M.visSeco, c) && !llegaACalle(g, vis, c)) aisladas += g.pob[c];
  }
  const sinAcceso = (M.salud ?? []).filter((x) => conAgua(x.c) || (llegaACalle(g, M.visSeco, x.c) && !llegaACalle(g, vis, x.c))).length;
  return { aisladas, sinAcceso, salud: (M.salud ?? []).length };
}

// Confianza de la hora que se ve: la menor entre la lluvia (dato real o pronóstico a menos de 3 días: alta; a 3-7 días: media;
// más lejos o escenario estacional: baja), el relieve (FABDEM: alta; satelital con edificios y árboles: media) y el modelo
// (probado con casos teóricos, todavía sin comparar con inundaciones reales: media)
const NIVELES_CONF = ["", "baja", "media", "alta"];
function confianzaHora(M, k, d) {
  const tp = M.met.tipo[k], adelante = k - M.hoy;
  const lluvia = tp === 0 ? 3 : tp === 2 ? 1 : adelante <= 72 ? 3 : adelante <= 168 ? 2 : 1;
  const terreno = d.D.fuente === "fabdem" ? 3 : 2, v = validacionCiudad(d);
  const modelo = v?.csi != null ? (v.csi >= 0.5 ? 3 : v.csi >= 0.3 ? 2 : 1) : 2;
  return { nivel: Math.min(lluvia, terreno, modelo), lluvia, terreno, modelo, v };
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
  // Un solo gráfico con un solo eje de fechas: barras de lluvia (eje izquierdo, mm por día) y línea del agua (eje derecho, % del círculo)
  const met = M.met, n = met.horas.length, k0 = M.hoy, ancho = Math.max(240, cont.clientWidth), alto = 190, iz = 36, de = 38, yB = 146, hB = 112;
  const x = (k) => iz + (Math.max(0, k - k0) / Math.max(1, n - 1 - k0)) * (ancho - iz - de);   // el eje arranca ahora: lo pasado no se muestra
  const dias = [];
  for (let k = k0; k < n; k += 24) { let s = 0, tp = met.tipo[k]; for (let j = k; j < Math.min(n, k + 24); j++) s += met.lluvia[j]; dias.push([k, s, tp]); }
  const maxL = Math.max(10, ...dias.map((v) => v[1])), maxP = Math.max(1, ...M.stats.map((s) => s.pct));
  const barras = dias.map(([k, s, tp]) => `<rect x="${x(k).toFixed(1)}" y="${(yB - (s / maxL) * hB).toFixed(1)}" width="${Math.max(1, x(k + 24) - x(k) - 1).toFixed(1)}" height="${((s / maxL) * hB).toFixed(1)}" fill="${COLOR_TIPO[tp]}"/>`).join("");
  const linea = M.stats.map((s, k) => (k < k0 ? "" : `${k > k0 ? "L" : "M"}${x(k).toFixed(1)},${(yB - (s.pct / maxP) * hB).toFixed(1)}`)).join("");
  const hito = (k, txt, dy = 12) => (k >= 0 && k < n ? `<line x1="${x(k)}" x2="${x(k)}" y1="${yB - hB}" y2="${yB + 2}" class="sim-hito"/><text x="${x(k) + 3}" y="${yB - hB + dy}" class="sim-hito-txt"${k > n * 0.8 ? ` text-anchor="end" dx="-6"` : ""}>${txt}</text>` : "");
  const finPron = met.tipo.indexOf(2);
  // Eje de fechas: una marca por lunes (semana); si el período es corto, una por día
  const art = (k) => new Date(met.horas[k] - 3 * 3600e3), lunes = [];
  for (let k = k0; k < n; k++) if (art(k).getUTCDay() === 1 && art(k).getUTCHours() === 0) lunes.push(k);
  const porDia = ((n - k0) / 24) <= 14, marcas = porDia ? Array.from({ length: Math.floor((n - k0) / 24) + 1 }, (_, d) => Math.min(n - 1, k0 + d * 24 + (24 - art(k0).getUTCHours()) % 24)) : lunes;
  const sep = Math.max(1, Math.ceil(36 / Math.max(1, (x(Math.min(n - 1, 24 * (porDia ? 1 : 7))) - x(0))))), fechaEje = (k) => `${art(k).getUTCDate()}/${art(k).getUTCMonth() + 1}`;
  const eje = marcas.map((k, i) => `<line x1="${x(k)}" x2="${x(k)}" y1="${yB}" y2="${yB + 5}" class="sim-tick"/>${i % sep === 0 ? `<text x="${x(k)}" y="${yB + 17}" class="sim-tick-txt" text-anchor="middle">${fechaEje(k)}</text>` : ""}`).join("");
  const ejes = `<line x1="${iz}" x2="${ancho - de}" y1="${yB}" y2="${yB}" class="sim-eje-base"/><line x1="${iz}" x2="${iz}" y1="${yB - hB}" y2="${yB}" class="sim-eje-base"/><line x1="${ancho - de}" x2="${ancho - de}" y1="${yB - hB}" y2="${yB}" class="sim-eje-base sim-eje-der"/>
    <text x="${iz - 4}" y="${yB + 3}" class="sim-tick-txt" text-anchor="end">0</text><text x="${iz - 4}" y="${yB - hB + 8}" class="sim-tick-txt" text-anchor="end">${fmt(maxL, maxL < 10 ? 1 : 0)}</text>
    <text x="${ancho - de + 4}" y="${yB + 3}" class="sim-tick-txt sim-tick-der">0</text><text x="${ancho - de + 4}" y="${yB - hB + 8}" class="sim-tick-txt sim-tick-der">${fmt(maxP, maxP < 10 ? 1 : 0)} %</text>
    <text x="${iz}" y="${yB - hB - 8}" class="sim-eje-tit">${t("sim_eje_mm")}</text><text x="${ancho - de}" y="${yB - hB - 8}" class="sim-eje-tit sim-tick-der" text-anchor="end">${t("sim_eje_pct")}</text>`;
  cont.innerHTML = `<svg width="${ancho}" height="${alto}" class="sim-linea-svg" role="img" aria-label="${t("sim_linea")}">
    <rect x="${x(M.frames.length - 1)}" y="0" width="${Math.max(0, x(n - 1) - x(M.frames.length - 1))}" height="${alto}" class="sim-pendiente"/>
    ${ejes}${eje}${barras}<path d="${linea}" class="sim-linea-area"/>
    ${hito(M.hoy, t("sim_hito_hoy"))}${finPron > 0 ? hito(finPron, t("sim_hito_fin_pron")) : ""}${M.pico != null ? hito(M.pico, t("sim_hito_pico"), 25) : ""}
    <line x1="${x(M.hora)}" x2="${x(M.hora)}" y1="0" y2="${alto}" class="sim-marca"/></svg>
    <div class="sim-linea-ley"><span><i style="background:${COLOR_TIPO[0]}"></i>${t("sim_tipo_real")}</span><span><i style="background:${COLOR_TIPO[1]}"></i>${t("sim_tipo_pronostico")}</span>${finPron > 0 ? `<span><i style="background:${COLOR_TIPO[2]}"></i>${t("sim_tipo_escenario")}</span>` : ""}<span><i class="sim-ley-linea"></i>${t("sim_area")}</span><span class="sim-eje-nota">${t(porDia ? "eje_dias" : "eje_semanas")}</span></div>`;
  const svg = cont.querySelector("svg");
  const ir = (ev) => {
    const r = svg.getBoundingClientRect(), k = k0 + Math.round(((ev.clientX - r.left - iz) / (ancho - iz - de)) * (n - 1 - k0));
    M.siguiendo = false; M.hora = limitar(k, k0, M.frames.length - 1); detenerAnimaciones(); mostrarHora();
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
    if (p >= AGUA_VER) c = colorEscala(COLOR_AGUA, p);
    if (C.cortes && calleCortada(i)) c = [214, 40, 40, 0.92];
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
const THREE_RESPALDO = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r147/three.min.js";
const cargarThree = () => (cargaThree ??= new Promise((ok, mal) => {
  const cargar = (url, siFalla) => {
    const sc = document.createElement("script"); sc.src = url; sc.onload = () => { DIAG.three = url; ok(); };
    sc.onerror = () => { sc.remove(); if (siFalla) cargar(siFalla); else { cargaThree = null; mal(new Error("no se pudo bajar three.js (¿red, bloqueador de anuncios o firewall?)")); } };
    document.head.appendChild(sc);
  };
  cargar(THREE_URL, THREE_RESPALDO);
}));
// Datos para entender por qué una maqueta no se ve en otro navegador (se muestran con el enlace «Diagnóstico»)
const DIAG = { errores: [] };
function textoDiagnostico() {
  const M = SIM.maqueta, gl = M?.ren?.getContext?.(), ext = gl?.getExtension?.("WEBGL_debug_renderer_info");
  return [`Navegador: ${navigator.userAgent}`, `Pantalla: ${innerWidth}x${innerHeight} · pixel ${devicePixelRatio}`, `three.js: ${DIAG.three ?? "no cargó"}`,
    `WebGL: ${gl ? (gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "?") : "no disponible"}${gl?.isContextLost?.() ? " (CONTEXTO PERDIDO)" : ""}`,
    `Intento de WebGL: ${DIAG.intentoGL ?? "-"}`, `Imagen satelital: ${DIAG.sat ? `${DIAG.sat.ok}/${DIAG.sat.total} teselas (${DIAG.sat.fallas} fallaron)` : "-"}`,
    `Malla: ${M ? `${M.celdas?.length ?? "?"} vértices` : "-"}`, `Modelo: ${SIM.modelo?.frames?.length ?? 0} horas calculadas`,
    `Errores: ${DIAG.errores.length ? DIAG.errores.join(" | ") : "ninguno"}`].join("\n");
}
window.addEventListener("error", (e) => { if (/three|WebGL|maqueta/i.test(`${e.message} ${e.filename}`)) DIAG.errores.push(e.message); });

function agregarBotonesVista() {
  // Solo la maqueta 3D: sin selector Mapa/Maqueta ni «Relieve ×5». Queda el botón de referencias.
  const marco = document.querySelector(".sim-mapa-marco");
  marco.querySelector(".sim-vistas")?.remove();
  marco.querySelector(".sim-x5:not(.sim-refs3d)")?.remove();
  marco.querySelector(".sim-refs3d")?.remove();
  const rf = document.createElement("button");
  rf.type = "button"; rf.className = "sim-x5 sim-refs3d"; rf.textContent = t("sim_refs3d"); rf.dataset.ayuda = t("sim_refs3d_ayuda");
  rf.setAttribute("aria-pressed", String(SIM.capas.refs3d)); rf.hidden = SIM.vista !== "maqueta";
  rf.onclick = () => { SIM.capas.refs3d = !SIM.capas.refs3d; rf.setAttribute("aria-pressed", String(SIM.capas.refs3d)); actualizarMaqueta(); };
  marco.appendChild(rf);
}

async function elegirVistaSimulador(v) {
  if (SIM.vista === v && (v === "mapa" || SIM.maqueta)) return;
  detenerAnimaciones();
  pasarCamara(SIM.vista, v);
  SIM.vista = v;
  document.querySelectorAll(".sim-vistas button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
  document.querySelector(".sim-leyenda-mapa")?.classList.toggle("oculta-maqueta", v === "maqueta");
  pintarFiltrosSimulador();
  const rf = document.querySelector(".sim-refs3d");
  if (rf) rf.hidden = v !== "maqueta";
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
  } catch (e) {
    console.error(e); DIAG.errores.push(e.message);
    est.innerHTML = `${t("sim_error_maqueta")}<br><small>${escapar(e.message)}</small><br><button type="button" class="chip" id="sim-diag-ver">${t("sim_diag")}</button>`;
    document.getElementById("sim-diag-ver").onclick = mostrarDiagnostico;
    SIM.maqueta?.capa?.remove(); SIM.maqueta = null;
    document.querySelector(".sim-mapa-marco")?.classList.remove("sim-armando");
    setTimeout(() => { if (SIM.vista === "maqueta") elegirVistaSimulador("mapa"); }, 600);   // se deja el mapa 2D con el agua en celeste
    return;
  }
  est.textContent = "";
  if (SIM.vista !== "maqueta" || !SIM.maqueta) return;
  if (SIM.camaraPendiente) { Object.assign(SIM.maqueta, SIM.camaraPendiente); SIM.camaraPendiente = null; }
  SIM.maqueta.capa.hidden = false;
  document.querySelector(".sim-mapa-marco")?.classList.remove("sim-armando");
  SIM.maqueta.redimensionar();
  actualizarMaqueta(true);
  setTimeout(verificarMaqueta, 1800);
}
// Si después de dibujar el centro de la maqueta sigue vacío, se avisa y se ofrece el diagnóstico
function verificarMaqueta() {
  const M = SIM.maqueta;
  if (!M || SIM.vista !== "maqueta") return;
  try {
    const gl = M.ren.getContext(), px = new Uint8Array(4 * 16 * 16), cv = M.ren.domElement;
    M.ren.render(M.escena, M.cam);
    gl.readPixels(Math.floor(cv.width / 2) - 8, Math.floor(cv.height / 2) - 8, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let alfa = 0; for (let i = 3; i < px.length; i += 4) alfa += px[i];
    if (alfa > 0) return;
    DIAG.errores.push("el centro de la maqueta salió vacío");
  } catch (e) { DIAG.errores.push(`verificación: ${e.message}`); }
  const est = document.getElementById("sim-estado");
  est.innerHTML = `${t("sim_error_maqueta")}<br><button type="button" class="chip" id="sim-diag-ver">${t("sim_diag")}</button>`;
  document.getElementById("sim-diag-ver").onclick = mostrarDiagnostico;
}
function mostrarDiagnostico() {
  let caja = document.getElementById("sim-diag");
  if (!caja) {
    caja = document.createElement("div"); caja.id = "sim-diag"; caja.className = "sim-diag";
    document.querySelector(".sim-mapa-marco").appendChild(caja);
  }
  caja.innerHTML = `<pre>${escapar(textoDiagnostico())}</pre><button type="button" class="chip" id="sim-diag-copiar">${t("sim_diag_copiar")}</button> <button type="button" class="chip" id="sim-diag-cerrar">${t("cerrar")}</button>`;
  document.getElementById("sim-diag-cerrar").onclick = () => caja.remove();
  document.getElementById("sim-diag-copiar").onclick = () => navigator.clipboard?.writeText(textoDiagnostico()).catch(() => {});
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
  DIAG.sat = { total: tiles.length, ok: 0, fallas: 0 };
  const bajar = async ([tx, ty]) => {
    for (let intento = 0; intento < 3; intento++) {
      try {
        const ctl = new AbortController(), reloj = setTimeout(() => ctl.abort(), 15000);   // una tesela colgada no deja la maqueta esperando
        const r = await fetch(SATELITE.replace("{z}", z).replace("{x}", tx).replace("{y}", ty), { signal: ctl.signal }).finally(() => clearTimeout(reloj));
        if (!r.ok) throw new Error(r.status);
        const lado = (256 / f) * S;
        c.drawImage(await createImageBitmap(await r.blob()), ((tx * 256) / f - gx0) * S, ((ty * 256) / f - gy0) * S, lado, lado);
        DIAG.sat.ok++;
        return;
      } catch (e) { await new Promise((ok) => setTimeout(ok, 400 * (intento + 1))); }
    }
    DIAG.sat.fallas++;
  };
  for (let i = 0; i < tiles.length; i += 6) await Promise.all(tiles.slice(i, i + 6).map(bajar));   // de a 6 para no saturar el servidor
  return cv;
}

// WebGL con varios intentos, de más a menos exigente (algunas placas o navegadores rechazan el antialias o el buffer persistente)
function crearRenderer() {
  const intentos = [{ antialias: true, alpha: true, preserveDrawingBuffer: true }, { antialias: false, alpha: true, preserveDrawingBuffer: true },
    { antialias: false, alpha: true, powerPreference: "low-power" }, { antialias: false, alpha: false, powerPreference: "low-power", failIfMajorPerformanceCaveat: false }];
  let ultimo;
  for (let i = 0; i < intentos.length; i++) {
    try { const r = new THREE.WebGLRenderer(intentos[i]); DIAG.intentoGL = `${i + 1} de ${intentos.length}`; return r; }
    catch (e) { ultimo = e; DIAG.errores.push(`WebGL intento ${i + 1}: ${e.message}`); }
  }
  throw new Error(`este navegador no pudo iniciar WebGL (${ultimo?.message ?? "sin detalle"}); revisá que esté activada la aceleración por hardware`);
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
    <button type="button" class="sim-diag-link" id="sim-diag-link">${t("sim_diag")}</button>
    <p class="sim-credito-sat">${t("sim_fecha_sat")} · <a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless · EOX</a> (${t("sim_credito_sat")})</p>`;
  marco.appendChild(capa);
  capa.querySelector("#sim-diag-link").onclick = mostrarDiagnostico;
  const ren = crearRenderer();
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
  if (!SIM.industrias) SIM.industrias = await fetch("datos/industrias.geojson").then((r) => r.json()).then((g) => g.features.filter((f) => distanciaKm(d.s.punto, f.geometry.coordinates) <= d.s.km)).catch(() => []);
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

// Rutas y calles principales en blanco (con borde oscuro, para que se vean sobre la imagen satelital) y nombres de
// hospitales, escuelas, clubes, estaciones, municipalidades e industrias del mapa base y de las referencias del sitio
function capaReferencias3D() {
  const M = SIM.maqueta, d = SIM.datos, D = d.D, S = M.S, cv = document.createElement("canvas");
  cv.width = M.textura.width; cv.height = M.textura.height;
  const c = cv.getContext("2d");
  const aT = (lon, lat) => [((xDeLon(lon, D.z) - D.tx0) * 256 - M.x0) * S, ((yDeLat(lat, D.z) - D.ty0) * 256 - M.y0) * S];
  const ancho = { motorway: 4, trunk: 4, primary: 3.2, secondary: 2.6, tertiary: 2, minor: 1.2 };
  const rutas = rasgosBase("transportation", (f) => ancho[f.properties.class]).sort((a, b) => ancho[a.properties.class] - ancho[b.properties.class]);
  c.lineCap = c.lineJoin = "round";
  for (const pasada of [0, 1]) for (const f of rutas) {
    const w = ancho[f.properties.class] * Math.max(1, S * 0.8), g = f.geometry, lineas = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
    c.beginPath();
    for (const l of lineas) l.forEach(([lo, la], j) => { const [x, y] = aT(lo, la); j ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.strokeStyle = pasada ? "rgba(255,255,255,0.92)" : "rgba(20,30,40,0.55)"; c.lineWidth = pasada ? w : w + 2; c.stroke();
  }
  // Nombres (los más importantes primero, sin pisarse)
  const clases = { hospital: 1, college: 1, stadium: 1, town_hall: 1, railway: 2, bus: 3, school: 3, sports_centre: 3, police: 3, fire_station: 3 };
  const pois = rasgosBase("poi", (f) => clases[f.properties.class] && f.properties.name && f.geometry.type === "Point")
    .sort((a, b) => clases[a.properties.class] - clases[b.properties.class] || (a.properties.rank ?? 99) - (b.properties.rank ?? 99));
  const puestos = [], tam = Math.max(10, 6 * S);
  c.font = `600 ${tam}px 'IBM Plex Sans', sans-serif`; c.textAlign = "center";
  const poner = (nombre, lon, lat, color) => {
    const [x, y] = aT(lon, lat);
    if (x < 0 || y < 0 || x > cv.width || y > cv.height || puestos.some(([px, py]) => Math.abs(px - x) < tam * 7 && Math.abs(py - y) < tam * 1.8)) return;
    puestos.push([x, y]);
    c.fillStyle = color; c.beginPath(); c.arc(x, y, tam * 0.3, 0, 7); c.fill();
    c.lineWidth = tam * 0.3; c.strokeStyle = "rgba(255,255,255,0.95)"; c.strokeText(nombre, x, y - tam * 0.6);
    c.fillStyle = "#1b2a35"; c.fillText(nombre, x, y - tam * 0.6);
  };
  for (const f of pois.slice(0, 60)) poner(f.properties["name:es"] ?? f.properties.name, ...f.geometry.coordinates, "#2f6ea8");
  for (const f of (SIM.industrias ?? []).filter(Boolean)) poner(f.properties.n, ...f.geometry.coordinates, "#6d5a46");
  return cv;
}

// ---------- Líneas blancas que bajan con el agua (siguen la pendiente de la superficie del agua del modelo) ----------
function crearParticulas() {
  const NP = innerWidth < 700 ? 1500 : 2600;
  return { NP, px: new Float32Array(NP), py: new Float32Array(NP), vida: new Int16Array(NP), cola: new Float32Array(NP * LARGO_COLA * 2),
    cnt: new Uint8Array(NP), semilla: 11, activa: false };
}
function moverLineas(P) {
  const Mo = SIM.modelo, g = Mo?.g, fr = Mo?.frames.length ? frameVista(Mo) : null;
  if (!fr) return;
  const T = LARGO_COLA, azar = () => ((P.semilla = (P.semilla * 16807) % 2147483647) / 2147483647);
  const eta = (c) => (g.tipo2[c] === 1 ? g.z[c] + fr[c] / 1000 : g.tipo2[c] === 2 ? g.z[c] : g.z[c] - 2);
  for (let n = 0; n < P.NP; n++) {
    const cx = Math.floor((P.px[n] - g.bx0) / g.f), cy = Math.floor((P.py[n] - g.by0) / g.f), c = cy * g.nx + cx;
    P.vida[n]--;
    const fuera = cx < 1 || cy < 1 || cx >= g.nx - 1 || cy >= g.ny - 1;
    if (fuera || P.vida[n] <= 0 || g.tipo2[c] !== 1 || fr[c] < 1) {   // nace otra en una celda con agua, dentro del círculo
      for (let k = 0; k < 20; k++) {
        const c2 = Math.floor(azar() * g.N);
        if (g.dentroC[c2] && g.tipo2[c2] === 1 && fr[c2] >= 1) { P.px[n] = g.bx0 + ((c2 % g.nx) + azar()) * g.f; P.py[n] = g.by0 + (Math.floor(c2 / g.nx) + azar()) * g.f; break; }
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
  const M = SIM.maqueta, d = SIM.datos, W = d.D.W, clave = `${SIM.modelo?.frames.length ? SIM.modelo.hora : -1}.${Math.floor((SIM.modelo?.frac || 0) * 4)}|${SIM.modelo?.hasta}|${SIM.capas.cortes}`;
  if (M.claveCharcos === clave) return;
  M.claveCharcos = clave;
  const c = M.charcos.getContext("2d"), img = c.createImageData(M.bw, M.bh), px = img.data;
  for (let y = 0; y < M.bh; y++) for (let x = 0; x < M.bw; x++) {
    const i = (M.y0 + y) * W + M.x0 + x;
    if (!d.circulo[i]) continue;
    const p = aguaFina(i);
    if (p < AGUA_VER) continue;
    const col = colorEscala(COLOR_AGUA, p), o = 4 * (y * M.bw + x);
    px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = col[3] * 255;
  }
  if (SIM.capas.cortes) for (let y = 0; y < M.bh; y++) for (let x = 0; x < M.bw; x++) {   // calles cortadas (30 cm de agua o más), en rojo
    const i = (M.y0 + y) * W + M.x0 + x;
    if (!d.circulo[i] || !calleCortada(i)) continue;
    const o = 4 * (y * M.bw + x);
    px[o] = 214; px[o + 1] = 40; px[o + 2] = 40; px[o + 3] = 235;
  }
  c.putImageData(img, 0, 0);
}

// Textura: satélite → película de agua que corre → bajos llenos → líneas blancas
function texturaMaqueta() {
  const M = SIM.maqueta, P = M.part, S = M.S, ct = M.textura.getContext("2d"), Mo = SIM.modelo, g = Mo?.g, fr = Mo?.frames.length ? frameVista(Mo) : null;
  ct.drawImage(M.sat, 0, 0);
  ct.imageSmoothingEnabled = true;
  if (false && fr) {   // película de agua que corre: eliminada (hacía titilar toda la maqueta); quedan los charcos y las líneas de escurrimiento
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
  if (SIM.capas.refs3d) { M.refs ??= capaReferencias3D(); ct.drawImage(M.refs, 0, 0); }
  if (P.activa && SIM.capas.flujo) {   // líneas: una pasada por tramo de cola (el más nuevo, más blanco y grueso); solo con «Escurrimiento»
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
  const clave = `${SIM.modelo?.hora}.${Math.floor((SIM.modelo?.frac || 0) * 2)}|${SIM.modelo?.hasta}`, salto = SIM.modelo ? Math.abs((M.horaAlturas ?? -99) - SIM.modelo.hora) : 99;
  if (alturas || (M.claveAlturas !== clave && (salto >= 1 || !SIM.reproduciendo))) { alturasMaqueta(); M.claveAlturas = clave; M.horaAlturas = SIM.modelo?.hora; if (SIM.corte3d) tapaCorte(); }
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
  if (SIM.modelo) SIM.modelo.frac = 0;
  const hud = SIM.maqueta?.capa.querySelector(".sim-lluvia-estado"); if (hud) hud.hidden = true;
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
  pintarTopografico(cont);
}

// ---------- Mapa topográfico chico (curvas con su altura, el agua de la hora y la línea del corte) ----------
const intervaloCurvas = (desnivel) => (desnivel <= 8 ? 0.5 : desnivel <= 20 ? 1 : desnivel <= 50 ? 2 : desnivel <= 120 ? 5 : desnivel <= 300 ? 10 : 20);
function curvasTopo(d) {   // marching squares sobre una grilla de ~150 celdas; se calcula una vez por lugar
  if (d.topo) return d.topo;
  const W = d.D.W;
  let x0 = W, x1 = 0, y0 = d.D.H, y1 = 0;
  for (const i of d.celdas) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const p = Math.max(1, Math.ceil((x1 - x0) / 150)), nx = Math.floor((x1 - x0) / p) + 1, ny = Math.floor((y1 - y0) / p) + 1;
  const v = new Float32Array(nx * ny);
  for (let gy = 0; gy < ny; gy++) for (let gx = 0; gx < nx; gx++) { const h = d.hs[(y0 + gy * p) * W + x0 + gx * p]; v[gy * nx + gx] = Number.isFinite(h) ? h : NaN; }
  const iv = d.intervalo, segs = [];
  for (let L = Math.ceil(d.hMin / iv) * iv; L <= d.hMax; L += iv) {
    const mayor = Math.round(L / iv) % 5 === 0, lista = [];
    for (let gy = 0; gy < ny - 1; gy++) for (let gx = 0; gx < nx - 1; gx++) {
      const a = v[gy * nx + gx], b = v[gy * nx + gx + 1], c = v[(gy + 1) * nx + gx + 1], e = v[(gy + 1) * nx + gx];
      if (!(a === a && b === b && c === c && e === e)) continue;
      const pts = [];
      const cruce = (va, vb, xa, ya, xb, yb) => { if ((va < L) !== (vb < L)) { const f = (L - va) / (vb - va); pts.push([xa + (xb - xa) * f, ya + (yb - ya) * f]); } };
      cruce(a, b, gx, gy, gx + 1, gy); cruce(b, c, gx + 1, gy, gx + 1, gy + 1); cruce(e, c, gx, gy + 1, gx + 1, gy + 1); cruce(a, e, gx, gy, gx, gy + 1);
      if (pts.length >= 2) lista.push(pts[0], pts[1]);
      if (pts.length === 4) lista.push(pts[2], pts[3]);
    }
    if (lista.length) segs.push({ L, mayor, lista });
  }
  return (d.topo = { x0, y0, p, nx, ny, segs });
}
function pintarTopografico(cont) {
  const d = SIM.datos;
  if (!d) return;
  const T = curvasTopo(d), lado = Math.min(cont.clientWidth || 300, 360), esc = lado / Math.max(T.nx, T.ny);
  const cv = document.createElement("canvas");
  cv.width = lado * devicePixelRatio; cv.height = lado * devicePixelRatio; cv.style.width = cv.style.height = `${lado}px`;
  cv.className = "sim-topo"; cv.setAttribute("role", "img"); cv.setAttribute("aria-label", t("sim_topo")(d.intervalo));
  const c = cv.getContext("2d"), oscuro = temaOscuro();
  c.scale(devicePixelRatio, devicePixelRatio);
  c.fillStyle = oscuro ? "#141c22" : "#fbfaf6"; c.fillRect(0, 0, lado, lado);
  // Agua de la hora (en cada celda de la grilla, la profundidad en su centro)
  for (let gy = 0; gy < T.ny; gy++) for (let gx = 0; gx < T.nx; gx++) {
    const i = (T.y0 + gy * T.p) * d.D.W + T.x0 + gx * T.p;
    if (!d.circulo[i]) continue;
    const prof = d.dentro[i] ? aguaFina(i) : 1;   // ríos y lagunas, siempre agua
    if (prof < AGUA_MIN) continue;
    c.fillStyle = rgba(colorEscala(COLOR_AGUA, prof), d.dentro[i] ? 0.9 : 0.55);
    c.fillRect(gx * esc, gy * esc, esc + 0.5, esc + 0.5);
  }
  // Curvas: finas cada intervalo, gruesas cada cinco (con su altura)
  const etiquetas = [];
  for (const { L, mayor, lista } of T.segs) {
    c.beginPath();
    for (let k = 0; k < lista.length; k += 2) { c.moveTo(lista[k][0] * esc, lista[k][1] * esc); c.lineTo(lista[k + 1][0] * esc, lista[k + 1][1] * esc); }
    c.strokeStyle = oscuro ? (mayor ? "#d9b98a" : "#8a7356") : (mayor ? "#7a4f1d" : "#b38b5d"); c.lineWidth = mayor ? 1.6 : 0.7; c.stroke();
    if (mayor) for (let k = 0; k < lista.length; k += 2 * 40) {   // una etiqueta cada ~40 tramos, sin pisarse
      const [a, b] = [lista[k], lista[k + 1]], x = ((a[0] + b[0]) / 2) * esc, y = ((a[1] + b[1]) / 2) * esc;
      if (etiquetas.some(([ex, ey]) => Math.hypot(ex - x, ey - y) < 48) || x < 14 || y < 10 || x > lado - 14 || y > lado - 10) continue;
      etiquetas.push([x, y]);
      let an = Math.atan2(b[1] - a[1], b[0] - a[0]); if (an > Math.PI / 2) an -= Math.PI; if (an < -Math.PI / 2) an += Math.PI;
      c.save(); c.translate(x, y); c.rotate(an);
      c.font = "600 9.5px 'IBM Plex Mono', monospace"; c.textAlign = "center"; c.textBaseline = "middle";
      const txt = `${fmt(L, L % 1 ? 1 : 0)}`;
      c.lineWidth = 3; c.strokeStyle = oscuro ? "#141c22" : "#fbfaf6"; c.strokeText(txt, 0, 0);
      c.fillStyle = oscuro ? "#f1dfc0" : "#5b3a12"; c.fillText(txt, 0, 0); c.restore();
    }
  }
  // Línea del corte y borde del círculo
  const yCorte = (d.filaCorte - T.y0) / T.p * esc;
  c.setLineDash([5, 4]); c.strokeStyle = oscuro ? "#e6eef3" : "#0e1726"; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(0, yCorte); c.lineTo(lado, yCorte); c.stroke(); c.setLineDash([]);
  c.font = "600 10px 'IBM Plex Sans', sans-serif"; c.fillStyle = oscuro ? "#e6eef3" : "#0e1726"; c.fillText("N ↑", lado - 30, 14);
  const tit = document.createElement("p");
  tit.className = "sim-corte-titulo"; tit.innerHTML = `<b>${t("sim_topo")(fmt(d.intervalo, d.intervalo % 1 ? 1 : 0))}</b>`;
  cont.append(tit, cv);
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
    ${C.curvas ? `<span class="sim-ley-fila"><i class="ley-curva"></i>${t("sim_ley_curva")(fmt(d.intervalo, d.intervalo % 1 ? 1 : 0))}</span>` : ""}`;
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
  cont.innerHTML = CAPAS_SIM.map((k) => `<button type="button" class="chip" aria-pressed="${C[k]}" data-k="${k}">${t(`sim_f_${k}`)}</button>`).join("");
  cont.querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.k;
      if (k === "todos") CAPAS_SIM.forEach((c) => { C[c] = !todas; });
      else C[k] = !C[k];
      pintarFiltrosSimulador();
      if (SIM.datos) { agregarLeyendaSimulador(); actualizarCorteEnMapa(); pintarCorte(); if (SIM.vista === "mapa") dibujarAgua(); else { SIM.mapaSucio = true; if (SIM.maqueta) { SIM.maqueta.claveCharcos = ""; actualizarMaqueta(true); } } }
    };
  });
}

function pintarPanelSimulador(d) {
  const panel = document.getElementById("sim-panel");
  const ps = presetsSimulador();
  panel.innerHTML = `
    <p class="sim-progreso" id="sim-progreso" role="status" hidden></p>
    <div class="sim-ahora"><span class="sim-ahora-fecha" id="sim-fecha">–</span><span class="sim-ahora-tipo" id="sim-tipo"></span>
      <span class="pill" id="sim-conf" tabindex="0"></span><span class="sim-ahora-lluvia" id="sim-acum"></span></div>
    <div class="sim-control">
      <button type="button" class="btn-icono sim-reiniciar" id="sim-reiniciar" aria-label="${t("sim_reiniciar")}" title="${t("sim_reiniciar")}">${icono("repetir")}</button>
      <button type="button" class="lt-play" id="sim-play" aria-label="${t("sim_reproducir")}">${icono("play")}</button>
      <input type="range" id="sim-barra" min="0" max="0" step="1" value="0" aria-label="${t("sim_linea")}">
    </div>
    <div class="sim-vel" id="sim-vel" role="group" aria-label="${t("sim_velocidad")}"><span class="sim-dur-etq">${t("sim_velocidad")}</span>${[0.5, 1, 2, 4].map((v) => `<button type="button" class="chip" data-v="${v}" aria-pressed="${SIM.velocidad === v}">×${String(v).replace(".", ",")}</button>`).join("")}</div>
    <div class="sim-linea" id="sim-linea"></div>
    <div class="sim-corte" id="sim-corte" hidden></div>
    <div class="sim-lluvia">
      <div class="sim-mm"><span class="sim-mm-valor" id="sim-mm-valor">${fmt(SIM.tormenta.mm)}</span><span class="sim-mm-u">mm</span><span class="sim-mm-etq">${t("sim_mm_etq")}</span></div>
      <input type="range" id="sim-mm" min="0" max="300" step="10" value="${SIM.tormenta.mm}" aria-label="${t("sim_mm_etq")}"${d ? "" : " disabled"}>
      <div class="sim-presets" id="sim-dur" role="group" aria-label="${t("sim_dur")}"><span class="sim-dur-etq">${t("sim_dur")}</span>${[1, 3, 6, 12, 24].map((h) => `<button type="button" class="chip" data-h="${h}" aria-pressed="${SIM.tormenta.horas === h}">${h} h</button>`).join("")}</div>
      <p class="sim-hint" id="sim-hint" hidden>${t("sim_hint")}</p>
    </div>
    <div class="sim-filtros" id="sim-filtros" role="group" aria-label="${t("sim_capas")}"></div>
    <div class="tb-datos sim-datos">
      ${dato(t("sim_area"), "–", "&nbsp;")}
      ${dato(t("sim_prof"), "–", t("sim_prof_sub"))}
      ${dato(t("sim_personas"), "–", t("sim_personas_sub"))}
      ${dato(t("sim_cortes"), "–", "&nbsp;")}
      ${dato(t("sim_aisladas"), "–", t("sim_aisladas_sub"))}
      ${dato(t("sim_salud"), "–", t("sim_salud_sub"))}
    </div>
    <div class="sim-leyenda">${COLOR_AGUA.map(([v, c]) => `<span><i style="background:${rgba(c, 0.6)}"></i>${v < 1 ? `${fmt(v * 100)} cm` : `${fmt(v)} m`}</span>`).join("")}
      <span><i style="background:rgb(214, 40, 40)"></i>${t("sim_f_cortes")}</span></div>
    <div class="sim-validez" id="sim-validez">${t("sim_validez")}</div>
    <div class="sim-ant" id="sim-ant"></div>
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
  barra.oninput = () => { const Mo = SIM.modelo; if (!Mo?.frames.length) return; detenerAnimaciones(); Mo.siguiendo = false; Mo.hora = limitar(Number(barra.value), Mo.hoy, Mo.frames.length - 1); mostrarHora(); };
  document.getElementById("sim-play").onclick = () => reproducirSimulador();
  document.getElementById("sim-reiniciar").onclick = reiniciarSimulador;
  panel.querySelectorAll("#sim-vel .chip").forEach((b) => { b.onclick = () => { SIM.velocidad = +b.dataset.v; panel.querySelectorAll("#sim-vel .chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }; });
  const mmEl = document.getElementById("sim-mm");
  mmEl.oninput = () => { document.getElementById("sim-mm-valor").textContent = fmt(+mmEl.value); };
  mmEl.onchange = () => correrTormenta({ mm: +mmEl.value });
  panel.querySelectorAll("#sim-dur .chip").forEach((b) => { b.onclick = () => correrTormenta({ horas: +b.dataset.h }); });
  panel.querySelectorAll(".sim-presets .chip[data-i]").forEach((b) => { b.onclick = () => correrTormenta({ mm: ps[+b.dataset.i][1] }); });
  const cre = document.getElementById("sim-crecida"), creV = document.getElementById("sim-crecida-v");
  const pintarCre = () => {
    creV.textContent = `${SIM.crecida > 0 ? "+" : ""}${fmt(SIM.crecida, 2)} m`;
    const e = SIM.modelo?.estacion, nota = document.querySelector("#sim-rio .sim-periodo-nota");
    if (nota) nota.textContent = e ? t("sim_rio_ina")(e.estacion, fmt(e.h, 2), fmt(e.ref, 2)) : t("sim_rio_nota");
  };
  cre.oninput = () => { SIM.crecida = Number(cre.value); pintarCre(); };
  cre.onchange = () => { if (SIM.modelo?.hasta) simularPeriodo(SIM.modelo.hasta, SIM.modelo.tormenta, SIM.modelo.corto); };
  pintarCre();
  pintarFiltrosSimulador();
  prepararPeriodo();
  pintarValidez();
  if (d) pintarCorte();
}

// Validación: cómo le fue al modelo en esta ciudad (si está entre las validadas) y en todas
function validacionCiudad(d) {
  const V = SIM.validacion, filas = V?.por_ciudad?.[d?.s?.cmu];
  if (!filas) return null;
  const casos = filas.filter((f) => f.temporada !== "referencia_2022_23" && f.csi != null && f.celdas_obs >= V.min_celdas_obs);
  if (!casos.length) return { ciudad: filas[0].ciudad, csi: null, sinAgua: true, filas: [] };
  return { ciudad: filas[0].ciudad, csi: casos.reduce((a, f) => a + f.csi, 0) / casos.length, filas: casos };
}
const textoModelo = (v) => (v?.csi != null ? t("sim_modelo_ciudad")(escapar(v.ciudad), fmt(v.csi, 2)) : v?.sinAgua ? t("sim_modelo_sin_agua")(escapar(v.ciudad))
  : SIM.validacion ? t("sim_modelo_otras")(SIM.validacion.ciudades) : t("sim_modelo_teorico"));
function pintarValidez() {
  const cont = document.getElementById("sim-validez"), V = SIM.validacion;
  if (!cont) return;
  if (!V?.nino) { cont.innerHTML = t("sim_validez"); return; }
  const N = V.nino, v = validacionCiudad(SIM.datos), mejor = N.csi_mediana > N.csi_jrc_mediana;
  const filas = [], sinAgua = [];
  for (const [cmu, fs] of Object.entries(V.por_ciudad)) {
    const casos = fs.filter((f) => f.temporada !== "referencia_2022_23" && f.csi != null && f.celdas_obs >= V.min_celdas_obs);
    if (!casos.length) { sinAgua.push(fs[0].ciudad); continue; }
    const prom = (k) => casos.reduce((a, f) => a + (f[k] ?? 0), 0) / casos.length;
    filas.push({ ciudad: fs[0].ciudad, cmu, csi: prom("csi"), jrc: prom("csi_jrc") });
  }
  filas.sort((a, b) => b.csi - a.csi);
  const x = (c) => `${(100 * limitar(c, 0, 1)).toFixed(1)}%`;
  cont.innerHTML = `<p>${t("sim_validez_res")(V.ciudades, N.casos, fmt(100 * N.pod_mediana), fmt(100 * N.far_mediana), fmt(N.csi_mediana, 2), fmt(N.csi_jrc_mediana, 2),
      N.mejor_que_jrc, N.spearman_superficie == null ? "–" : fmt(N.spearman_superficie, 2), mejor)}</p>
    ${v ? `<p>${v.csi != null ? t("sim_validez_ciudad")(escapar(v.ciudad), v.filas.map((f) => `${f.temporada.slice(5).replace("_", "-")}: ${fmt(f.csi, 2)}`).join(" · "))
      : capitalizar(t("sim_modelo_sin_agua")(escapar(v.ciudad)))}.</p>` : ""}
    <details class="sim-val-det"><summary>${t("sim_val_ver")}</summary>
      <div class="leyenda-lineas"><span><i style="background:var(--s-1)"></i>${t("sim_val_modelo")}</span><span><i style="background:var(--tinta-3)"></i>${t("sim_val_jrc")}</span></div>
      <ul class="val-puntos">${filas.map((f) => `<li${f.cmu === SIM.datos?.s?.cmu ? ' class="actual"' : ""}><span>${escapar(f.ciudad)}</span>
        <span class="val-pista"><i class="val-jrc" style="left:${x(f.jrc)}" data-tip="${escapar(`<b>${escapar(f.ciudad)}</b><span>${t("sim_val_jrc")}: CSI ${fmt(f.jrc, 2)}</span>`)}"></i>
          <i class="val-mod" style="left:${x(f.csi)}" data-tip="${escapar(`<b>${escapar(f.ciudad)}</b><span>${t("sim_val_modelo")}: CSI ${fmt(f.csi, 2)}</span>`)}"></i></span>
        <b>${fmt(f.csi, 2)}</b></li>`).join("")}</ul>
      ${sinAgua.length ? `<p class="sim-periodo-nota">${t("sim_val_sin_agua")(sinAgua.map(escapar).join(", "))}</p>` : ""}
      <p class="sim-periodo-nota">${t("sim_val_nota")}</p></details>`;
  tipsEn(cont);
}

// Antecedentes de la zona frente a esta corrida: agua extra vista por satélite en los Niño 2015-16 y 2023-24 (municipio),
// agua alguna vez 1984-2021 (radios del círculo) y el peor momento de la corrida. Es contexto, no una validación.
function pintarAntecedentesSim(Mo, d) {
  const cont = document.getElementById("sim-ant");
  if (!cont) return;
  const m = estado.porCmu.get(d.s.cmu), filas = [];
  for (const [anio, k] of [["2015-16", "agua_extra_nino_2015_16_pct"], ["2023-24", "agua_extra_nino_2023_24_pct"]]) {
    const v = numero(m?.[k]);
    if (v != null) filas.push(t("sim_ant_nino")(anio, fmt(v, v < 10 ? 1 : 0), escapar(m.nam)));
  }
  let s = 0, w = 0;
  for (const f of d.radios) { const p = f.properties, a = (numero(p.poblacion) ?? 0) / Math.max(0.01, numero(p.dens) ?? 0.01), v = numero(p.agua); if (v != null) { s += v * a; w += a; } }
  if (w) filas.push(t("sim_ant_jrc")(fmt(s / w)));
  const pico = Mo.pico != null ? Mo.stats[Mo.pico] : null;
  if (pico) filas.push(t("sim_ant_corrida")(fmt(pico.pct, pico.pct < 10 ? 1 : 0)));
  cont.innerHTML = filas.length ? `<h3 class="sim-h3">${t("sim_ant_t")}</h3><ul>${filas.map((x) => `<li>${x}</li>`).join("")}</ul><p class="sim-periodo-nota">${t("sim_ant_nota")}</p>` : "";
}
// Superficie impermeable (techos y pavimento), con vegetación o tierra, y agua, dentro del círculo
function usoDelSuelo(g) {
  let n = 0, imp = 0, agua = 0;
  for (let c = 0; c < g.N; c++) { if (!g.dentroC[c]) continue; n++; if (g.tipo2[c] !== 1) agua++; else imp += g.imp[c]; }
  if (!n) return "";
  const pi = (100 * imp) / n, pa = (100 * agua) / n;
  return t("sim_uso_suelo")(fmt(pi), fmt(Math.max(0, 100 - pi - pa)), fmt(pa));
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
  // Solo desde ahora: lo que ya pasó no se muestra (el modelo lo usa en silencio para saber qué tan mojado está el suelo)
  let pron = 0, esc = 0, test = 0;
  const reparto = repartoTormenta((Mo.tormenta?.horas) || 3);
  for (let j = Mo.hoy; j <= k; j++) { const v = met.lluvia[j]; if (met.tipo[j] === 2) esc += v; else pron += v; }
  if (Mo.tormenta?.mm) for (let j = 0; j < reparto.length && Mo.hoy + j <= k; j++) test += Mo.tormenta.mm * reparto[j];
  document.getElementById("sim-acum").innerHTML = t("sim_acum_ahora")(fmt(Math.max(0, pron - test)), fmt(test), fmt(esc));
  const barra = document.getElementById("sim-barra");
  barra.min = String(Mo.hoy); barra.max = String(met.horas.length - 1); barra.value = String(k);
  const vals = document.querySelectorAll(".sim-datos .tb-dato-valor"), ext = document.querySelectorAll(".sim-datos .tb-dato-extra");
  vals[0].textContent = `${fmt(R.pct, R.pct < 10 ? 1 : 0)} %`; ext[0].textContent = `${fmt(R.km2, 2)} km²`;
  vals[1].textContent = R.maxProf >= 0.01 ? `${fmt(R.maxProf, 2)} m` : "–";
  vals[2].textContent = fmtPersonas(R.personas);
  const g = Mo.g, ac = accesoHora(Mo);
  vals[3].textContent = g.nRuta ? `${fmt(R.cortesKm, R.cortesKm < 10 ? 1 : 0)} km` : t("sin_informacion");
  ext[3].textContent = g.nRuta ? t("sim_cortes_de")(fmt((g.nRuta * g.dx) / 1000)) : "";
  vals[4].textContent = ac ? fmtPersonas(ac.aisladas) : t("sin_informacion");
  vals[5].textContent = ac && ac.salud ? `${ac.sinAcceso} / ${ac.salud}` : t("sin_informacion");
  const cf = confianzaHora(Mo, k, d), pc = document.getElementById("sim-conf");
  pc.className = `pill sem-${cf.nivel === 3 ? "ok" : cf.nivel === 2 ? "atencion" : "critico"}`;
  pc.textContent = t("sim_conf")(NIVELES_CONF[cf.nivel]);
  pc.dataset.ayuda = t("sim_conf_ayuda")(t(`conf_${NIVELES_CONF[cf.lluvia]}`), t(`conf_${NIVELES_CONF[cf.terreno]}`), t(`conf_${NIVELES_CONF[cf.modelo]}`) + ` · ${textoModelo(cf.v)}`,
    t(`sim_conf_lluvia_${tp}`)(Math.max(0, Math.round((k - Mo.hoy) / 24))), d.D.fuente === "fabdem");
  pintarAntecedentesSim(Mo, d);
  const rio = document.getElementById("sim-rio");
  if (rio) { rio.hidden = !Mo.g.tipo2.some((v) => v === 3); document.getElementById("sim-crecida")?.dispatchEvent(new Event("input")); }
  const sup = document.getElementById("sim-supuestos");
  if (sup) sup.textContent = `${t(d.D.fuente === "fabdem" ? "sim_terreno_fabdem" : "sim_terreno_aws")} ` + t("sim_supuestos")(Mo.suelo.nombre, Mo.suelo.supuesto, SIM.desague, fmt(Mo.g.dx), Mo.cuenta ? fmt(100 * Mo.cuenta.infiltrada / Math.max(1, Mo.cuenta.lluvia)) : "…")
    + ` ${usoDelSuelo(Mo.g)}`;
  pintarCorte();
}
function actualizarSimulador() { mostrarHora(); }

// ▶: recorre las horas calculadas (12 por segundo); en la maqueta, además, corren las líneas blancas
// Mientras el modelo calcula no se puede reproducir ni reiniciar
function bloquearControles(si) {
  for (const id of ["sim-play", "sim-reiniciar"]) { const b = document.getElementById(id); if (b) b.disabled = si; }
}
// ▶: reproduce la tormenta en cámara lenta. Mientras llueve o el agua corre (lámina de 3 mm o más en el 3 % del círculo, o lluvia) cada hora dura
// 0,6 s y se mezclan los fotogramas (0,18 s si el agua ya casi se fue); las horas secas pasan casi de golpe. En la maqueta, las líneas blancas muestran hacia dónde baja
// el agua y los charcos se llenan donde queda.
function planReproduccion(Mo) {
  const n = Mo.frames.length, fuerte = (k) => (Mo.stats[k]?.pct3 ?? 0) >= 3 || (Mo.met.lluvia[k] ?? 0) > 0.1, act = (k) => fuerte(k) || (Mo.stats[k]?.pct3 ?? 0) >= 0.5;
  let ini = Math.min(Mo.hoy, n - 1);
  for (let k = Mo.hoy; k < n; k++) if (act(k)) { ini = Math.max(Mo.hoy, k - 1); break; }
  const ts = [0];
  const dur = [];
  for (let k = ini; k < n - 1; k++) dur.push(fuerte(k) || fuerte(k + 1) ? 0.6 : act(k) || act(k + 1) ? 0.18 : 0.012);
  const activo = dur.reduce((a, d) => a + (d > 0.1 ? d : 0), 0), f = activo ? limitar(12 / activo, 0.3, 1.6) : 1;   // la parte con agua dura unos 12 s a ×1
  dur.forEach((d) => ts.push(ts.at(-1) + (d > 0.1 ? d * f : d)));
  return { ini, ts };
}
function hudReproduccion(Mo) {
  const hud = SIM.maqueta?.capa.querySelector(".sim-lluvia-estado");
  if (!hud) return;
  const k = Mo.hora, mm = Mo.met.lluvia[k] ?? 0, pct3 = Mo.stats[k]?.pct3 ?? 0;
  let acum = 0; for (let j = Mo.hoy; j <= k; j++) acum += Mo.met.lluvia[j] ?? 0;
  hud.hidden = false;
  hud.textContent = mm > 0.1 ? t("sim_hud_llueve")(fmt(mm, 1), fmt(acum)) : pct3 >= 0.5 ? t("sim_hud_escurre") : t("sim_hud_seco");
}
// ⏮: vuelve al comienzo de la tormenta y la reproduce de nuevo
function reiniciarSimulador() {
  const Mo = SIM.modelo;
  if (!Mo?.frames.length) return;
  detenerAnimaciones();
  Mo.hora = planReproduccion(Mo).ini; Mo.frac = 0; Mo.siguiendo = false;
  reproducirSimulador(true);
}
function reproducirSimulador(desdeCero = false) {
  const Mo = SIM.modelo, btn = document.getElementById("sim-play");
  if (!Mo?.frames.length) return;
  if (SIM.reproduciendo) { detenerAnimaciones(); return; }
  const { ini, ts } = planReproduccion(Mo), ultimo = ts.length - 1;
  let j0 = Mo.hora - ini;
  if (desdeCero || j0 < 0 || j0 >= ultimo || Mo.hora === Mo.pico) j0 = 0;   // desde el pico o el final, arranca la tormenta de nuevo
  Mo.siguiendo = false;
  btn.innerHTML = icono("pausa");
  if (SIM.maqueta) SIM.maqueta.part.activa = true;
  let seg = ts[j0], antes = null;
  const cuadro = (ahora) => {
    seg += antes == null ? 0 : ((ahora - antes) / 1000) * SIM.velocidad;   // la velocidad se puede cambiar en pleno juego
    antes = ahora;
    let j = j0; while (j < ultimo && ts[j + 1] <= seg) j++;
    const lento = j < ultimo && ts[j + 1] - ts[j] > 0.1;
    Mo.frac = lento ? (seg - ts[j]) / (ts[j + 1] - ts[j]) : 0;
    const hora = ini + j;
    if (hora !== Mo.hora) { Mo.hora = hora; actualizarNumeros(); pintarLineaSim(); }
    if (SIM.vista === "mapa") dibujarAgua();
    if (SIM.vista === "maqueta" && SIM.maqueta) { moverLineas(SIM.maqueta.part); actualizarMaqueta(); hudReproduccion(Mo); }
    if (j >= ultimo && !Mo.corriendo) { detenerAnimaciones(); btn.innerHTML = icono("repetir"); return; }
    SIM.reproduciendo = requestAnimationFrame(cuadro);
  };
  SIM.reproduciendo = requestAnimationFrame(cuadro);
}

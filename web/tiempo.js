// Capas del tiempo: lluvia, viento y temperatura sobre el mapa, separadas del riesgo.
// Datos: datos/tiempo.json (ingesta/tiempo_grilla.py, Open-Meteo): grilla de 0,5° con 48 h cada 3 h y 16 días.
// Se dibuja como una imagen suave (interpolación bicúbica) recortada al contorno del país; el viento, además,
// con partículas animadas que siguen el campo de viento.

// Escalas semánticas con leyenda: [valor, [r, g, b, alfa]]. Lluvia en franjas (como un radar), el resto continuo.
const ESCALAS = {   // semáforo de bien a mal (verde → amarillo → rojo), igual que el riesgo; temperatura de azul (frío) a rojo (calor)
  lluvia3h: [[0.2, [26, 152, 80, 0]], [0.5, [26, 152, 80, 0.45]], [2, [102, 189, 99, 0.62]], [5, [166, 217, 106, 0.72]], [10, [254, 224, 139, 0.8]], [20, [253, 174, 97, 0.84]], [35, [244, 109, 67, 0.86]], [60, [215, 48, 39, 0.88]], [90, [165, 0, 38, 0.9]]],
  lluviaDia: [[0.5, [26, 152, 80, 0]], [1, [26, 152, 80, 0.45]], [5, [102, 189, 99, 0.62]], [10, [166, 217, 106, 0.72]], [20, [254, 224, 139, 0.8]], [35, [253, 174, 97, 0.84]], [60, [244, 109, 67, 0.86]], [90, [215, 48, 39, 0.88]], [130, [165, 0, 38, 0.9]]],
  lluviaAcum: [[1, [26, 152, 80, 0]], [5, [26, 152, 80, 0.45]], [15, [102, 189, 99, 0.62]], [30, [166, 217, 106, 0.72]], [50, [254, 224, 139, 0.8]], [80, [253, 174, 97, 0.84]], [120, [244, 109, 67, 0.86]], [180, [215, 48, 39, 0.88]], [250, [165, 0, 38, 0.9]]],
  viento: [[0, [26, 152, 80, 0.35]], [10, [26, 152, 80, 0.45]], [20, [102, 189, 99, 0.62]], [30, [166, 217, 106, 0.72]], [40, [254, 224, 139, 0.8]], [55, [253, 174, 97, 0.84]], [70, [244, 109, 67, 0.86]], [90, [215, 48, 39, 0.88]], [120, [165, 0, 38, 0.9]]],
  temp: [[-10, [49, 54, 149, 0.72]], [-5, [69, 117, 180, 0.72]], [0, [116, 173, 209, 0.72]], [5, [171, 217, 233, 0.72]],
    [10, [224, 243, 248, 0.72]], [15, [255, 255, 191, 0.72]], [20, [254, 224, 144, 0.72]], [25, [253, 174, 97, 0.74]],
    [30, [244, 109, 67, 0.76]], [35, [215, 48, 39, 0.78]], [40, [165, 0, 38, 0.8]], [45, [110, 0, 30, 0.82]]],
};

// Ciudades de referencia para los valores sobre el mapa (capitales y ciudades grandes)
const CIUDADES = [["Buenos Aires", -58.38, -34.6], ["Córdoba", -64.18, -31.42], ["Rosario", -60.64, -32.95], ["Mendoza", -68.84, -32.89],
  ["Tucumán", -65.22, -26.82], ["Salta", -65.41, -24.79], ["Santa Fe", -60.7, -31.63], ["Corrientes", -58.83, -27.47],
  ["Posadas", -55.9, -27.37], ["Resistencia", -58.99, -27.45], ["Formosa", -58.18, -26.18], ["Santiago del Estero", -64.26, -27.8],
  ["San Juan", -68.53, -31.54], ["San Luis", -66.34, -33.3], ["La Rioja", -66.85, -29.41], ["Catamarca", -65.78, -28.47],
  ["Jujuy", -65.3, -24.19], ["Neuquén", -68.06, -38.95], ["Santa Rosa", -64.29, -36.62], ["Viedma", -62.99, -40.81],
  ["Rawson", -65.1, -43.3], ["Río Gallegos", -69.22, -51.62], ["Ushuaia", -68.3, -54.8], ["Mar del Plata", -57.55, -38.0],
  ["Bahía Blanca", -62.27, -38.72], ["Comodoro Rivadavia", -67.48, -45.86], ["Bariloche", -71.31, -41.13], ["Paraná", -60.52, -31.73],
  ["Concordia", -58.02, -31.39], ["Río Cuarto", -64.35, -33.12], ["La Plata", -57.95, -34.92], ["Puerto Madryn", -65.04, -42.77],
  ["Esquel", -71.31, -42.91]];

// ---------- Datos ----------
function decodificarTiempo(raw) {
  const n = raw.puntos.length, celdas = raw.nx * raw.ny;
  const mapa = new Int32Array(celdas).fill(-1);
  raw.puntos.forEach((g, p) => { mapa[g] = p; });
  const dentro = new Uint8Array(celdas);
  raw.dentro.forEach((g) => { dentro[g] = 1; });
  const bloque = (b) => Object.fromEntries(Object.entries(b).map(([nombre, v]) => {
    const bytes = Uint8Array.from(atob(v.b64), (c) => c.charCodeAt(0));
    const crudo = v.tipo === "u8" ? bytes : new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
    const nulo = v.tipo === "u8" ? 255 : 65535;
    const out = new Float32Array(crudo.length);
    for (let i = 0; i < crudo.length; i++) out[i] = crudo[i] === nulo ? NaN : crudo[i] * v.escala + v.desplaz;
    return [nombre, out];
  }));
  return { ...raw, n, mapa, dentro, dentroLista: raw.dentro, diario: bloque(raw.diario), horario: bloque(raw.horario),
    horasMs: raw.horas.map((h) => fechaIso(h).getTime()), lon1: raw.lon0 + (raw.nx - 1) * raw.paso, latS: raw.lat0 - (raw.ny - 1) * raw.paso };
}

async function cargarTiempo() {
  if (estado.tiempo) return estado.tiempo;
  estado.cargaTiempo ??= fetch("datos/tiempo.json", { cache: "no-cache" }).then((r) => r.json()).then((raw) => {
    estado.tiempo = decodificarTiempo(raw);
    return estado.tiempo;
  });
  return estado.cargaTiempo;
}

// Paso de 3 h más cercano a ahora (si el pronóstico quedó viejo, el primero)
function pasoAhora(T = estado.tiempo) {
  const ahora = Date.now();
  let k = 0, d = Infinity;
  T.horasMs.forEach((ms, i) => { if (Math.abs(ms - ahora) < d) { d = Math.abs(ms - ahora); k = i; } });
  return k;
}
// Día del pronóstico que corresponde a hoy
function diaHoy(T = estado.tiempo) { return Math.max(0, T.dias.indexOf(hoyLocal())); }

// Grilla completa (nx × ny) de una variable en un paso; NaN donde no hay punto
function grillaPaso(T, arr, k) {
  const out = new Float32Array(T.nx * T.ny).fill(NaN);
  for (let g = 0; g < out.length; g++) { const p = T.mapa[g]; if (p >= 0) out[g] = arr[k * T.n + p]; }
  return out;
}
function grillaAgregada(T, arr, a, b, modo) {
  const out = new Float32Array(T.nx * T.ny).fill(NaN);
  for (let g = 0; g < out.length; g++) {
    const p = T.mapa[g];
    if (p < 0) continue;
    let acc = modo === "max" ? -Infinity : modo === "min" ? Infinity : 0, ok = false;
    for (let k = a; k <= b; k++) {
      const v = arr[k * T.n + p];
      if (Number.isNaN(v)) continue;
      ok = true;
      acc = modo === "max" ? Math.max(acc, v) : modo === "min" ? Math.min(acc, v) : acc + v;
    }
    if (ok) out[g] = acc;
  }
  return out;
}
// Viento medio de varios días como vector (u, v en km/h, hacia donde sopla)
function grillaVientoMedio(T, a, b) {
  const u = new Float32Array(T.nx * T.ny).fill(NaN), v = new Float32Array(T.nx * T.ny).fill(NaN);
  for (let g = 0; g < u.length; g++) {
    const p = T.mapa[g];
    if (p < 0) continue;
    let su = 0, sv = 0, n = 0;
    for (let k = a; k <= b; k++) {
      const vel = T.diario.viento[k * T.n + p], dir = T.diario.dir[k * T.n + p];
      if (Number.isNaN(vel) || Number.isNaN(dir)) continue;
      const r = (dir * Math.PI) / 180;
      su += -vel * Math.sin(r); sv += -vel * Math.cos(r); n++;
    }
    if (n) { u[g] = su / n; v[g] = sv / n; }
  }
  return { u, v };
}
function vientoUV(vel, dir) {
  const u = new Float32Array(vel.length), v = new Float32Array(vel.length);
  for (let g = 0; g < vel.length; g++) {
    const r = (dir[g] * Math.PI) / 180;
    u[g] = -vel[g] * Math.sin(r); v[g] = -vel[g] * Math.cos(r);
  }
  return { u, v };
}

// Valor interpolado (bilineal, ignora los vecinos sin dato) en un punto de una grilla completa
function valorEnGrilla(T, grilla, lon, lat) {
  const fx = (lon - T.lon0) / T.paso, fy = (T.lat0 - lat) / T.paso;
  if (fx < 0 || fy < 0 || fx > T.nx - 1 || fy > T.ny - 1) return NaN;
  const i0 = Math.min(Math.floor(fx), T.nx - 2), j0 = Math.min(Math.floor(fy), T.ny - 2), ax = fx - i0, ay = fy - j0;
  let s = 0, w = 0;
  for (const [di, dj, p] of [[0, 0, (1 - ax) * (1 - ay)], [1, 0, ax * (1 - ay)], [0, 1, (1 - ax) * ay], [1, 1, ax * ay]]) {
    const v = grilla[(j0 + dj) * T.nx + i0 + di];
    if (!Number.isNaN(v) && p > 0) { s += v * p; w += p; }
  }
  return w > 0.2 ? s / w : NaN;
}
// Serie de una variable en un punto (todos los pasos de un bloque)
function seriePunto(T, arr, pasos, lon, lat) {
  const fx = (lon - T.lon0) / T.paso, fy = (T.lat0 - lat) / T.paso;
  const i0 = limitar(Math.floor(fx), 0, T.nx - 2), j0 = limitar(Math.floor(fy), 0, T.ny - 2), ax = fx - i0, ay = fy - j0;
  const vecinos = [[0, 0, (1 - ax) * (1 - ay)], [1, 0, ax * (1 - ay)], [0, 1, (1 - ax) * ay], [1, 1, ax * ay]]
    .map(([di, dj, w]) => [T.mapa[(j0 + dj) * T.nx + i0 + di], w]).filter(([p, w]) => p >= 0 && w > 0);
  const out = [];
  for (let k = 0; k < pasos; k++) {
    let s = 0, w = 0;
    for (const [p, wp] of vecinos) { const v = arr[k * T.n + p]; if (!Number.isNaN(v)) { s += v * wp; w += wp; } }
    out.push(w > 0.2 ? s / w : null);
  }
  return out;
}
// Dirección media de varias series diarias (promedio vectorial, ponderado por la velocidad)
function direccionMedia(dirs, vels) {
  let su = 0, sv = 0;
  dirs.forEach((d, i) => { if (d == null || vels[i] == null) return; const r = (d * Math.PI) / 180; su += vels[i] * Math.sin(r); sv += vels[i] * Math.cos(r); });
  return ((Math.atan2(su, sv) * 180) / Math.PI + 360) % 360;
}

// ---------- Período de la vista del tiempo ----------
// Condiciones actuales: un paso de 3 h. Condiciones futuras: un rango de días (o un día mientras se reproduce).
function periodoTiempo() {
  const T = estado.tiempo;
  if (estado.modo === "actual") return { tipo: "hora", k: estado.paso3h ?? pasoAhora(T) };
  if (estado.diaReproduciendo != null) return { tipo: "dias", a: estado.diaReproduciendo, b: estado.diaReproduciendo };
  const [a, b] = estado.rangoDias;
  return { tipo: "dias", a, b };
}

// Campo de la capa en el período elegido: valores en la grilla, escala y textos
function campoTiempo(capa, P = periodoTiempo()) {
  const T = estado.tiempo;
  if (!T) return null;
  const hora = P.tipo === "hora";
  if (capa === "lluvia") {
    const valores = hora ? grillaPaso(T, T.horario.lluvia, P.k) : grillaAgregada(T, T.diario.lluvia, P.a, P.b, "suma");
    const escala = hora ? ESCALAS.lluvia3h : P.a === P.b ? ESCALAS.lluviaDia : ESCALAS.lluviaAcum;
    return { capa, valores, escala, escalonada: true, unidad: "mm", P,
      titulo: hora ? t("ley_lluvia_3h") : P.a === P.b ? t("ley_lluvia_dia") : t("ley_lluvia_acum") };
  }
  if (capa === "viento") {
    const valores = hora ? grillaPaso(T, T.horario.viento, P.k) : grillaAgregada(T, T.diario.viento, P.a, P.b, "max");
    const uv = hora ? vientoUV(valores, grillaPaso(T, T.horario.dir, P.k)) : grillaVientoMedio(T, P.a, P.b);
    return { capa, valores, ...uv, escala: ESCALAS.viento, unidad: "km/h", P,
      titulo: hora ? t("ley_viento_ahora") : t("ley_viento_max") };
  }
  const valores = hora ? grillaPaso(T, T.horario.temp, P.k) : grillaAgregada(T, T.diario.tmax, P.a, P.b, "max");
  return { capa, valores, escala: ESCALAS.temp, unidad: "°C", P, titulo: hora ? t("ley_temp_ahora") : t("ley_temp_max") };
}

// ---------- Dibujo del campo en un lienzo recortado al país ----------
const LIENZO_PX = 24;   // píxeles por grado de longitud

function geometriaLienzo(T) {
  const W = Math.round((T.lon1 - T.lon0) * LIENZO_PX);
  const yTop = mercY(T.lat0), yBot = mercY(T.latS);
  const H = Math.round((W * (yTop - yBot)) / (((T.lon1 - T.lon0) * Math.PI) / 180));
  return { W, H, yTop, yBot };
}

// Pesos de Catmull-Rom (interpolación bicúbica): bordes suaves y redondeados
function pesosCubicos(f) {
  const f2 = f * f, f3 = f2 * f;
  return [(-f3 + 2 * f2 - f) / 2, (3 * f3 - 5 * f2 + 2) / 2, (-3 * f3 + 4 * f2 + f) / 2, (f3 - f2) / 2];
}

// Pinta el campo en un ImageData de W × H que cubre la caja [oeste, norte, este, sur] (Mercator en Y)
function rasterizarCampo(T, campo, W, H, caja = [T.lon0, T.lat0, T.lon1, T.latS]) {
  const img = new ImageData(W, H), d = img.data, g = campo.valores, nx = T.nx, ny = T.ny;
  const [x0, yN, x1, yS] = caja, mTop = mercY(yN), mBot = mercY(yS);
  const lut = new Map();
  const colorDe = (v) => {
    const clave = campo.escalonada ? v : Math.round(v * 4) / 4;
    let c = lut.get(clave);
    if (c === undefined) { c = colorEscala(campo.escala, clave, campo.escalonada); if (!campo.escalonada) lut.set(clave, c); }
    return c;
  };
  const cols = [], filas = [];
  for (let px = 0; px < W; px++) {
    const fx = (x0 + ((x1 - x0) * (px + 0.5)) / W - T.lon0) / T.paso, i = Math.floor(fx);
    cols.push([i, fx - i, pesosCubicos(fx - i)]);
  }
  for (let py = 0; py < H; py++) {
    const lat = latDeMercY(mTop - ((mTop - mBot) * (py + 0.5)) / H);
    const fy = (T.lat0 - lat) / T.paso, j = Math.floor(fy);
    filas.push([j, fy - j, pesosCubicos(fy - j)]);
  }
  const val = (i, j) => (i < 0 || j < 0 || i >= nx || j >= ny ? NaN : g[j * nx + i]);
  for (let py = 0; py < H; py++) {
    const [j, ay, wy] = filas[py];
    if (j < -1 || j > ny) continue;
    for (let px = 0; px < W; px++) {
      const [i, ax, wx] = cols[px];
      if (i < -1 || i > nx) continue;
      let s = 0, ok = true;
      for (let b = 0; b < 4 && ok; b++) {
        let fila = 0;
        for (let a = 0; a < 4; a++) {
          const v = val(i - 1 + a, j - 1 + b);
          if (Number.isNaN(v)) { ok = false; break; }
          fila += v * wx[a];
        }
        s += fila * wy[b];
      }
      if (!ok) {   // cerca del borde de la grilla: bilineal con los vecinos que haya
        let sw = 0; s = 0;
        for (const [di, dj, w] of [[0, 0, (1 - ax) * (1 - ay)], [1, 0, ax * (1 - ay)], [0, 1, (1 - ax) * ay], [1, 1, ax * ay]]) {
          const v = val(i + di, j + dj);
          if (!Number.isNaN(v) && w > 0) { s += v * w; sw += w; }
        }
        if (sw < 0.25) continue;
        s /= sw;
      }
      const c = colorDe(s);
      if (!c || c[3] <= 0) continue;
      const o = (py * W + px) * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = c[3] * 255;
    }
  }
  return img;
}

// Silueta del país (provincias): máscara para recortar el campo al territorio
function trazarGeo(ctx, geom, proyectar) {
  const pols = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const p of pols) for (const anillo of p) {
    anillo.forEach(([x, y], k) => { const [px, py] = proyectar(x, y); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.closePath();
  }
}
function mascaraPais(W, H, proyectar) {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.beginPath();
  estado.datos.provincias.features.forEach((f) => trazarGeo(ctx, f.geometry, proyectar));
  ctx.fill("evenodd");
  return cv;
}

function lienzoTiempo() {
  const T = estado.tiempo;
  if (!estado.lienzo) {
    const { W, H, yTop, yBot } = geometriaLienzo(T);
    const nuevo = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
    const proyectar = (x, y) => [((x - T.lon0) / (T.lon1 - T.lon0)) * W, ((yTop - mercY(y)) / (yTop - yBot)) * H];
    estado.lienzo = { cv: nuevo(), aux: nuevo(), W, H, mascara: mascaraPais(W, H, proyectar) };
  }
  return estado.lienzo;
}

function dibujarCampoEnMapa(campo) {
  const T = estado.tiempo, L = lienzoTiempo();
  const ax = L.aux.getContext("2d");
  ax.clearRect(0, 0, L.W, L.H);
  ax.putImageData(rasterizarCampo(T, campo, L.W, L.H), 0, 0);
  ax.globalCompositeOperation = "destination-in";
  ax.drawImage(L.mascara, 0, 0);
  ax.globalCompositeOperation = "source-over";
  const ctx = L.cv.getContext("2d");
  ctx.clearRect(0, 0, L.W, L.H);
  ctx.drawImage(L.aux, 0, 0);
  const fuente = mapa.getSource("tiempo-img");
  if (!fuente) return;
  fuente.play(); mapa.triggerRepaint();   // el lienzo se sube a la tarjeta gráfica unos cuadros y se pausa
  requestAnimationFrame(() => requestAnimationFrame(() => fuente.pause()));
}

// ---------- Valores en ciudades (etiquetas sobre el mapa) ----------
function textoValor(capa, v) {
  if (v == null || Number.isNaN(v)) return "–";
  if (capa === "temp") return `${fmt(v)}°`;
  if (capa === "lluvia") return v < 0.5 ? "0" : fmt(v, v < 10 ? 1 : 0);
  return fmt(v);
}
function datosCiudades(campo) {
  const T = estado.tiempo;
  const feats = CIUDADES.map(([nombre, lon, lat]) => {
    const v = valorEnGrilla(T, campo.valores, lon, lat);
    if (Number.isNaN(v)) return null;
    const c = colorEscala(campo.escala, v, campo.escalonada);
    return { type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] },
      properties: { nombre, texto: textoValor(campo.capa, v), color: c && c[3] > 0.05 ? rgba([...c.slice(0, 3), 1]) : "#9aa6b2" } };
  }).filter(Boolean);
  return { type: "FeatureCollection", features: feats };
}

// ---------- Dónde está el extremo (para titulares) ----------
function extremoCampo(campo, signo = 1) {
  const T = estado.tiempo;
  let mejor = null;
  for (const g of T.dentroLista) {
    const v = campo.valores[g];
    if (Number.isNaN(v)) continue;
    if (!mejor || v * signo > mejor.v * signo) mejor = { v, g };
  }
  if (!mejor) return null;
  const lon = T.lon0 + (mejor.g % T.nx) * T.paso, lat = T.lat0 - Math.floor(mejor.g / T.nx) * T.paso;
  return { v: mejor.v, lon, lat, lugar: lugarCercano([lon, lat]) };
}
function lugarCercano(punto) {
  let mejor = null, dmin = Infinity;
  for (const [cmu, d] of Object.entries(estado.riesgo.cmu)) {
    if (!d.c) continue;
    const dd = distanciaKm(punto, d.c);
    if (dd < dmin) { dmin = dd; mejor = cmu; }
  }
  const m = estado.porCmu.get(mejor);
  return m ? { nombre: m.nam, provincia: m.jur, cmu: mejor, km: dmin } : null;
}

// ---------- Partículas de viento ----------
const Particulas = {
  activo: false, parts: [], raf: 0, movido: true,
  iniciar(campo) {
    this.campo = campo;
    this.cv ??= document.getElementById("particulas");
    if (!this.cv) return;
    this.ctx ??= this.cv.getContext("2d");
    if (!this.enlazado) {
      this.enlazado = true;
      mapa.on("move", () => { this.movido = true; });
      mapa.on("resize", () => this.ajustar());
      document.addEventListener("visibilitychange", () => {
        this.pausa = document.hidden;
        if (!this.pausa && this.activo) this.bucle();
      });
    }
    this.cv.hidden = false;
    if (this.activo) return;
    this.ajustar();
    this.activo = true;
    this.sembrar();
    this.bucle();
  },
  detener() {
    this.activo = false;
    cancelAnimationFrame(this.raf);
    if (this.ctx) this.ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    if (this.cv) this.cv.hidden = true;
  },
  ajustar() {
    if (!this.cv) return;
    const r = mapa.getContainer().getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    this.dpr = dpr;
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    this.cv.style.width = `${r.width}px`; this.cv.style.height = `${r.height}px`;
    this.cantidad = Math.round(limitar((r.width * r.height) / 240, 700, 3800));
    this.movido = true;
  },
  nueva() {
    const T = estado.tiempo;
    for (let intento = 0; intento < 6; intento++) {   // un punto al azar de la pantalla que caiga sobre el país
      const ll = mapa.unproject([Math.random() * this.cv.width / this.dpr, Math.random() * this.cv.height / this.dpr]);
      const gx = Math.round((ll.lng - T.lon0) / T.paso), gy = Math.round((T.lat0 - ll.lat) / T.paso);
      if (gx >= 0 && gy >= 0 && gx < T.nx && gy < T.ny && T.dentro[gy * T.nx + gx]) return { lon: ll.lng, lat: ll.lat, edad: (Math.random() * 80) | 0, x: null, y: null };
    }
    const lista = T.dentroLista, g = lista[(Math.random() * lista.length) | 0];
    return { lon: T.lon0 + ((g % T.nx) + Math.random() - 0.5) * T.paso, lat: T.lat0 - (Math.floor(g / T.nx) + Math.random() - 0.5) * T.paso,
      edad: (Math.random() * 80) | 0, x: null, y: null };
  },
  sembrar() { this.parts = Array.from({ length: this.cantidad }, () => this.nueva()); },
  bucle() {
    if (!this.activo || this.pausa) return;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.bucle());
    const T = estado.tiempo, c = this.campo, ctx = this.ctx, dpr = this.dpr;
    if (!c?.u) return;
    if (this.parts.length !== this.cantidad) this.sembrar();
    if (this.movido) {
      ctx.clearRect(0, 0, this.cv.width, this.cv.height);
      this.parts.forEach((p) => { p.x = null; });
      this.movido = false;
    } else {
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = "rgba(0,0,0,0.92)";
      ctx.fillRect(0, 0, this.cv.width, this.cv.height);
      ctx.globalCompositeOperation = "source-over";
    }
    const pxGrado = (512 * 2 ** mapa.getZoom()) / 360, k = 0.055 * 0.7;   // velocidad de las líneas de viento al 70 % (antes ~1,6 px por cuadro con 30 km/h; ahora ~1,1), a cualquier zoom
    ctx.lineWidth = 1.25 * dpr;
    ctx.strokeStyle = "rgba(255,255,255,0.88)";
    ctx.beginPath();
    for (const p of this.parts) {
      const gx = Math.round((p.lon - T.lon0) / T.paso), gy = Math.round((T.lat0 - p.lat) / T.paso);
      if (p.edad++ > 90 || gx < 0 || gy < 0 || gx >= T.nx || gy >= T.ny || !T.dentro[gy * T.nx + gx]) { Object.assign(p, this.nueva(), { edad: 0 }); continue; }
      const u = valorEnGrilla(T, c.u, p.lon, p.lat), v = valorEnGrilla(T, c.v, p.lon, p.lat);
      if (Number.isNaN(u) || Number.isNaN(v)) { Object.assign(p, this.nueva(), { edad: 0 }); continue; }
      p.lon += (u * k) / pxGrado;
      p.lat += (v * k * Math.cos((p.lat * Math.PI) / 180)) / pxGrado;
      const s = mapa.project([p.lon, p.lat]), x = s.x * dpr, y = s.y * dpr;
      if (p.x != null && Math.abs(x - p.x) < 40 * dpr && Math.abs(y - p.y) < 40 * dpr) { ctx.moveTo(p.x, p.y); ctx.lineTo(x, y); }
      p.x = x; p.y = y;
    }
    ctx.stroke();
  },
};

// ---------- Miniaturas (mapas chicos de las otras capas) ----------
const CAJA_PAIS = [-73.6, -21.7, -53.5, -55.2];   // oeste, norte, este, sur
function proyeccionMini(W, H, pad = 6) {
  const [x0, yN, x1, yS] = CAJA_PAIS, mN = mercY(yN), mS = mercY(yS);
  const ancho = ((x1 - x0) * Math.PI) / 180, alto = mN - mS;
  const esc = Math.min((W - 2 * pad) / ancho, (H - 2 * pad) / alto);
  const ox = (W - ancho * esc) / 2, oy = (H - alto * esc) / 2;
  return (x, y) => [ox + (((x - x0) * Math.PI) / 180) * esc, oy + (mN - mercY(y)) * esc];
}

function pintarMini(canvas, capa) {
  const dpr = Math.min(2, devicePixelRatio || 1), r = canvas.getBoundingClientRect();
  if (!r.width) return;
  const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d"), proyectar = proyeccionMini(W, H);
  const silueta = () => { ctx.beginPath(); estado.datos.provincias.features.forEach((f) => trazarGeo(ctx, f.geometry, proyectar)); };
  ctx.clearRect(0, 0, W, H);
  silueta();
  ctx.fillStyle = css("--mini-tierra");
  ctx.fill("evenodd");
  if (capa === "riesgo") {
    const valores = valoresRiesgoVista();
    for (const f of estado.datos.municipios.features) {
      const v = valores.get(f.properties.cmu);
      if (v == null) continue;
      ctx.beginPath();
      trazarGeo(ctx, f.geometry, proyectar);
      ctx.fillStyle = css(`--r${nivelRiesgo(v)}`);
      ctx.fill("evenodd");
    }
  } else if (estado.tiempo) {
    const campo = campoTiempo(capa);
    const a = proyectar(CAJA_PAIS[0], CAJA_PAIS[1]), b = proyectar(CAJA_PAIS[2], CAJA_PAIS[3]);
    const w = Math.max(1, Math.round(b[0] - a[0])), h = Math.max(1, Math.round(b[1] - a[1]));
    const aux = document.createElement("canvas");
    aux.width = w; aux.height = h;
    aux.getContext("2d").putImageData(rasterizarCampo(estado.tiempo, campo, w, h, CAJA_PAIS), 0, 0);
    ctx.save();
    silueta();
    ctx.clip("evenodd");
    ctx.drawImage(aux, a[0], a[1]);
    ctx.restore();
    if (capa === "viento" && campo.u) {   // flechas cada ~2°
      const T = estado.tiempo;
      ctx.strokeStyle = css("--tinta-1"); ctx.lineWidth = dpr; ctx.globalAlpha = 0.5;
      for (let j = 2; j < T.ny; j += 4) for (let i = 2; i < T.nx; i += 4) {
        const g = j * T.nx + i;
        if (!T.dentro[g] || Number.isNaN(campo.u[g])) continue;
        const [px, py] = proyectar(T.lon0 + i * T.paso, T.lat0 - j * T.paso);
        const vel = Math.hypot(campo.u[g], campo.v[g]) || 1, l = 5 * dpr;
        const dx = (campo.u[g] / vel) * l, dy = (-campo.v[g] / vel) * l;
        ctx.beginPath(); ctx.moveTo(px - dx, py - dy); ctx.lineTo(px + dx, py + dy);
        ctx.lineTo(px + dx * 0.4 - dy * 0.5, py + dy * 0.4 + dx * 0.5); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
  silueta();
  ctx.strokeStyle = css("--mini-borde"); ctx.lineWidth = 0.6 * dpr;
  ctx.stroke();
}

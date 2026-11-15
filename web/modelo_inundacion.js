// Datos reales del punto y armado del modelo hidráulico (hidraulica.js corre el cálculo en un Web Worker).
//
// Lluvia y evaporación, hora por hora (Open-Meteo, gratis, sin clave):
//   - últimos 14 días: análisis de lo que llovió (DATO REAL): sirve para que el suelo y las lagunas arranquen como están hoy;
//   - próximos 16 días: PRONÓSTICO (mejor modelo disponible para el punto);
//   - más allá: ESCENARIO ESTACIONAL: lluvia mensual pronosticada por SEAS5 para el municipio, repartida en los días de lluvia
//     típicos de ese mes en ese lugar (21 años de registros de Open-Meteo) y en tormentas de 6 horas.
// Terreno: relieve del simulador promediado a celdas de 20 a 60 m. Arroyos y canales del mapa base se "graban" en el
// terreno (1 a 2 m) porque el relieve satelital no ve cauces angostos. Lagunas: guardan agua. Ríos y mar: nivel fijo.
// Cobertura: edificios, calles y zonas urbanas (impermeables) del mapa base; el resto, suelo según su textura.
const TIPO_DATO = ["real", "pronostico", "escenario"];
const TEXTURAS = {   // Green-Ampt (Rawls, Brakensiek y Miller 1983): conductividad (mm/h), succión (mm), porosidad
  arenoso: { ks: 117.8, psi: 49.5, thetaS: 0.437 }, "franco arenoso": { ks: 10.9, psi: 110.1, thetaS: 0.453 },
  franco: { ks: 3.4, psi: 88.9, thetaS: 0.463 }, "franco limoso": { ks: 6.5, psi: 166.8, thetaS: 0.501 },
  "franco arcilloso": { ks: 1.0, psi: 208.8, thetaS: 0.464 }, "arcilloso limoso": { ks: 0.5, psi: 292.2, thetaS: 0.479 },
  arcilloso: { ks: 0.3, psi: 316.3, thetaS: 0.475 },
};

// ---------- Suelo del lugar (SoilGrids → clase USDA → Green-Ampt; preparar_suelos.py) ----------
let mapaSuelo = null;
async function sueloEn(punto) {
  if (!mapaSuelo) {
    const [ind, img] = await Promise.all([fetch("datos/suelo/indice.json").then((r) => r.json()), fetch("datos/suelo/textura.png").then((r) => r.blob()).then(createImageBitmap)]);
    const cv = new OffscreenCanvas(img.width, img.height), c = cv.getContext("2d", { willReadFrequently: true });
    c.drawImage(img, 0, 0);
    mapaSuelo = { ind, w: img.width, h: img.height, px: c.getImageData(0, 0, img.width, img.height).data };
  }
  const { ind, w, h, px } = mapaSuelo;
  const col = Math.floor((punto[0] - ind.oeste) / ind.paso), fila = Math.floor((ind.norte - punto[1]) / ind.paso);
  // La clase más frecuente en ~6 km alrededor (evita caer justo en un píxel sin dato, como un río)
  const cuenta = new Map();
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = col + dx, y = fila + dy;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const k = px[4 * (y * w + x)];
    if (k) cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
  }
  const k = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const cl = k ? ind.clases[k] : null;
  return cl?.ks ? { ks: cl.ks, psi: cl.psi, thetaS: cl.thetaS, nombre: cl.nombre, supuesto: false } : null;
}

// ---------- Lluvia hora por hora ----------
async function lluviaDelPunto(punto, hastaISO) {
  const [lon, lat] = punto.map((v) => v.toFixed(3));
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation,et0_fao_evapotranspiration,soil_moisture_3_to_9cm&past_days=14&forecast_days=16&timezone=America%2FArgentina%2FBuenos_Aires`;
  const d = await fetch(u).then((r) => { if (!r.ok) throw new Error(`Open-Meteo ${r.status}`); return r.json(); });
  const h = d.hourly, ahora = Date.now();
  const horas = h.time.map((t) => Date.parse(`${t}:00-03:00`));
  const tipo = horas.map((t) => (t <= ahora ? 0 : 1));
  const met = { horas, lluvia: h.precipitation.map((v) => v ?? 0), et0: h.et0_fao_evapotranspiration.map((v) => v ?? 0), tipo,
    theta0: h.soil_moisture_3_to_9cm.find((v) => v != null) ?? 0.25, theta: h.soil_moisture_3_to_9cm };
  if (hastaISO && Date.parse(`${hastaISO}T23:00:00-03:00`) > horas.at(-1)) await extenderEscenario(met, punto, hastaISO);
  return met;
}

// Más allá de los 16 días: total mensual del pronóstico estacional, repartido como llueve habitualmente en ese lugar y mes
async function extenderEscenario(met, punto, hastaISO) {
  const fin = Date.parse(`${hastaISO}T23:00:00-03:00`), cmu = estado.sel?.cmu;
  if (!lluviaEstacional) lluviaEstacional = await fetch("datos/lluvia_estacional.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const mensual = lluviaEstacional?.cmu[cmu];
  const clima = await climatologia(punto);
  let t = met.horas.at(-1) + 3600e3;
  const dias = [];
  for (let d = new Date(t); d.getTime() <= fin; d = new Date(d.getTime() + 86400e3)) dias.push(d);
  // Por mes: cuántos días de lluvia típicos caen en los días del escenario y cuánta lluvia les toca
  const porMes = new Map();
  for (const d of dias) { const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; porMes.set(m, (porMes.get(m) ?? 0) + 1); }
  const lluviaDia = new Map();
  for (const [m, n] of porMes) {
    const mes = +m.slice(5) - 1, diasMes = new Date(+m.slice(0, 4), mes + 1, 0).getDate();
    const k = lluviaEstacional?.meses.indexOf(m) ?? -1;
    const total = (k >= 0 && mensual?.[k] != null ? mensual[k] : clima.media[mes]) * (n / diasMes);
    const nLluvia = Math.max(1, Math.round(clima.pDia[mes] * n));
    const reparto = clima.reparto[mes];   // fracciones típicas de cada día de lluvia (de mayor a menor), suman 1
    const diasDelMes = dias.filter((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === m);
    for (let j = 0; j < nLluvia; j++) {
      const d = diasDelMes[Math.floor(((j + 0.5) * diasDelMes.length) / nLluvia)];
      const frac = reparto.length ? (reparto[Math.min(j, reparto.length - 1)] / reparto.slice(0, nLluvia).reduce((a, b) => a + b, 0)) : 1 / nLluvia;
      lluviaDia.set(d.toDateString(), total * frac);
    }
  }
  for (const d of dias) {
    const mm = lluviaDia.get(d.toDateString()) ?? 0, mes = d.getMonth();
    for (let hh = 0; hh < 24; hh++) {
      met.horas.push(t); met.tipo.push(2);
      met.lluvia.push(hh >= 15 && hh < 21 ? (mm * [0.1, 0.25, 0.3, 0.2, 0.1, 0.05][hh - 15]) : 0);   // tormenta de 6 h a la tarde
      met.et0.push(clima.et0[mes] / 24);
      t += 3600e3;
    }
  }
}

// 21 años de lluvia y evaporación diarias del punto: probabilidad de día de lluvia, reparto típico y media por mes
async function climatologia(punto) {
  const [lon, lat] = punto.map((v) => v.toFixed(2));
  const d = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=2005-01-01&end_date=2025-12-31&daily=precipitation_sum,et0_fao_evapotranspiration`)
    .then((r) => r.json());
  const pDia = [], reparto = [], media = [], et0 = [];
  for (let m = 0; m < 12; m++) {
    const idx = d.daily.time.map((t, i) => (+t.slice(5, 7) === m + 1 ? i : -1)).filter((i) => i >= 0);
    const ll = idx.map((i) => d.daily.precipitation_sum[i] ?? 0), anos = new Set(idx.map((i) => d.daily.time[i].slice(0, 4))).size;
    const humedos = ll.filter((v) => v >= 1).sort((a, b) => b - a);
    pDia[m] = humedos.length / ll.length;
    media[m] = ll.reduce((a, b) => a + b, 0) / anos;
    const nTip = Math.max(1, Math.round(pDia[m] * 30)), tot = humedos.reduce((a, b) => a + b, 0) || 1;
    reparto[m] = Array.from({ length: nTip }, (_, j) => humedos.slice(Math.floor((j * humedos.length) / nTip), Math.floor(((j + 1) * humedos.length) / nTip))
      .reduce((a, b) => a + b, 0) / tot);
    et0[m] = idx.reduce((a, i) => a + (d.daily.et0_fao_evapotranspiration[i] ?? 0), 0) / idx.length;
  }
  return { pDia, reparto, media, et0 };
}

// ---------- Los Niños en el punto: base de datos de tormentas y el peor estimado con una fórmula ----------
// Todas las temporadas Niño desde 1950 según el ONI de NOAA, con su intensidad (clasificación de Golden Gate Weather Services),
// de octubre a abril. Lluvia de las tormentas:
//  · Niños desde 1997-98 (los del selector y del cálculo del peor): precalculada para cada celda de 0,1° (~11 km) con el
//    satélite IMERG (earth_engine/lluvia_ninos.py). Contra 482 tormentas medidas en pluviómetros del INA y del SMN, en las de
//    100 mm o más IMERG da el 82 % de lo medido (error mediano 24 %) y el reanálisis ERA5 solo el 60 % (error 40 %). En 1997-98
//    todavía no había IMERG: solo ERA5. La hora a hora sale de ERA5 (cuándo llovió) corregida para que el total y la hora más
//    lluviosa sean los de IMERG.
//  · Niños anteriores (solo el cuadro informativo): lluvia diaria de ERA5 (Open-Meteo, 1951 → 2024), que subestima.
// La humedad del suelo antes de cada tormenta es la de ERA5 (Open-Meteo). El peor para la población se estima en simulador.js
// (indiceNino) con una fórmula, sin simular el agua.
const NINOS = [
  [1951, "moderado"], [1952, "debil"], [1953, "debil"], [1957, "fuerte"], [1958, "debil"], [1963, "moderado"], [1965, "fuerte"], [1968, "moderado"],
  [1969, "debil"], [1972, "fuerte"], [1976, "debil"], [1977, "debil"], [1979, "debil"], [1982, "muy_fuerte"], [1986, "moderado"], [1987, "fuerte"],
  [1991, "fuerte"], [1994, "moderado"], [1997, "muy_fuerte"], [2002, "moderado"], [2004, "debil"], [2006, "debil"], [2009, "moderado"], [2014, "debil"],
  [2015, "muy_fuerte"], [2018, "debil"], [2023, "fuerte"],
];
const DUR_MAX = 72, DESDE_COMPLETO = 1997;   // desde 1997-98 hay todo: lluvia (IMERG desde 2000, antes ERA5) y caudal de ríos (GloFAS)
const ARCHIVO = "https://archive-api.open-meteo.com/v1/archive", ZONA = "&timezone=America%2FArgentina%2FBuenos_Aires";
const sumarDiasISO = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diasEntreISO = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5);

// Tormentas precalculadas de la celda del punto (teselas de 2° × 2°, Int16: temporada × banda × celda, en décimas de mm; al
// final, la capacidad de los desagües: lluvia de 1 h que se supera una vez cada 2 años en promedio, 2001-2025)
let cargaIndiceLluvia = null;
const teselasLluvia = new Map();
async function lluviaNinosEn(punto) {
  const I = await (cargaIndiceLluvia ??= fetch("datos/lluvia_ninos/indice.json").then((r) => (r.ok ? r.json() : null)).catch(() => null));
  if (!I) return null;
  const col = Math.floor((punto[0] - I.oeste) / I.paso), fila = Math.floor((I.norte - punto[1]) / I.paso);
  if (col < 0 || fila < 0 || col >= I.ancho || fila >= I.alto) return null;
  const n = I.tesela, nombre = `${Math.floor(col / n)}_${Math.floor(fila / n)}`;
  if (!I.teselas.includes(nombre)) return null;
  if (!teselasLluvia.has(nombre)) teselasLluvia.set(nombre, fetch(`datos/lluvia_ninos/${nombre}.bin`).then((r) => (r.ok ? r.arrayBuffer() : null)).then((b) => (b ? new Int16Array(b) : null)).catch(() => null));
  const A = await teselasLluvia.get(nombre);
  if (!A) return null;
  const c = (fila % n) * n + (col % n), nb = I.bandas.length, celdas = n * n, v = (s, b) => A[(s * nb + I.bandas.indexOf(b)) * celdas + c];
  const out = { desague: A[I.temporadas.length * nb * celdas + c] / I.escala, temporadas: {} };
  I.temporadas.forEach((anio, s) => {
    out.temporadas[anio] = { d0: v(s, "d0"), total: v(s, "t3") / I.escala, era5: v(s, "e3") / I.escala, imerg: v(s, "i3") < 0 ? null : v(s, "i3") / I.escala,
      pico: v(s, "p1") / I.escala, picoTemporada: v(s, "p1s") / I.escala, diaTemporada: v(s, "p24s") / I.escala };
  });
  return out;
}

// Lluvia hora por hora de unos días (con un reintento: el archivo limita las consultas por minuto)
async function lluviaHoraria(lat, lon, desde, hasta) {
  const u = `${ARCHIVO}?latitude=${lat}&longitude=${lon}&start_date=${desde}&end_date=${hasta}&hourly=precipitation,soil_moisture_0_to_7cm${ZONA}`;
  for (let k = 0; k < 2; k++) {
    const d = await fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (d?.hourly) return d.hourly;
    await new Promise((ok) => setTimeout(ok, 1500));
  }
  return null;
}
// Corrección de sesgo no lineal del perfil horario (Leander y Buishand 2007): p* = a · p^b, con a y b tales que el total y la
// hora más lluviosa sean los de IMERG; se conserva cuándo llovió según ERA5. Si ERA5 no vio la tormenta,
// hietograma triangular (SCS) con ese total y ese pico, centrado en los 3 días.
function corregirPerfil(p, T, M) {
  if (!(T > 0)) return p.map(() => 0);
  M = Math.min(Math.max(M, T / p.length), T);
  const pm = Math.max(...p), x = p.map((v) => (v > 0.05 ? v / pm : 0)), mojadas = x.filter((v) => v > 0).length;
  if (!(pm > 0.05)) {
    const D = Math.min(p.length, Math.max(1, Math.round((2 * T) / M))), a0 = Math.floor((p.length - D) / 2), out = p.map(() => 0);
    for (let j = 0; j < D; j++) out[a0 + j] = 1 - Math.abs(((j + 0.5) / D) * 2 - 1);
    const s = out.reduce((a, v) => a + v, 0);
    return out.map((v) => (v * T) / s);
  }
  const r = T / M;
  if (r >= mojadas) return x.map((v) => (v > 0 ? T / mojadas : 0));
  const suma = (b) => x.reduce((a, v) => a + (v > 0 ? v ** b : 0), 0);   // baja con b: de «mojadas» (b = 0) a 1 (b → ∞)
  let lo = 0, hi = 40;
  for (let k = 0; k < 60; k++) { const b = (lo + hi) / 2; if (suma(b) > r) lo = b; else hi = b; }
  return x.map((v) => (v > 0 ? M * v ** ((lo + hi) / 2) : 0));
}
// La tormenta ya corregida, sin las horas secas de los bordes, y la humedad del suelo justo antes
function recortarTormenta(p, h) {
  let a = 0, b = p.length - 1;
  while (a < b && p[a] < 0.1) a++;
  while (b > a && p[b] < 0.1) b--;
  const ll = p.slice(a, b + 1), sm = h.soil_moisture_0_to_7cm ?? [];
  return { lluvia: ll, total: ll.reduce((x, y) => x + y, 0), dur: ll.length, pico: Math.max(...ll), ini: h.time[a], fin: h.time[b], theta: sm[Math.max(0, a - 1)] ?? sm[a] ?? null };
}
// Sin dato precalculado (fuera de la grilla): la peor ventana de hasta 72 h de ERA5, tal cual
function tormentaHoraria(h) {
  const p = h.precipitation.map((v) => v ?? 0);
  let s = 0, mejor = -1, fin = 0;
  for (let i = 0; i < p.length; i++) { s += p[i] - (i >= DUR_MAX ? p[i - DUR_MAX] : 0); if (s > mejor) { mejor = s; fin = i; } }
  const a = Math.max(0, fin - DUR_MAX + 1);
  return recortarTormenta(p.map((v, i) => (i >= a && i <= fin ? v : 0)), h);
}
const tormentaDe = (n, h) => (n.evento.fuente === "era5" ? tormentaHoraria(h)
  : recortarTormenta(corregirPerfil(h.precipitation.map((v) => v ?? 0), n.evento.total, n.evento.pico), h));
// Sin la hora a hora de ERA5 (sin conexión o sin cupo del día): total y hora más lluviosa reales de IMERG con la forma triangular
// del SCS, avisado como forma supuesta. Una tormenta solo de ERA5 (sin dato precalculado) no se puede rearmar: queda sin hora a hora
function sinForma(n) {
  if (n.evento.fuente === "era5") return null;
  const d0 = n.evento.dias[0], h = { time: Array.from({ length: DUR_MAX }, (_, k) => `${sumarDiasISO(d0, Math.floor(k / 24))}T${String(k % 24).padStart(2, "0")}:00`), soil_moisture_0_to_7cm: [] };
  return { ...recortarTormenta(corregirPerfil(new Array(DUR_MAX).fill(0), n.evento.total, n.evento.pico), h), formaSupuesta: true };
}
const tramoDe = (n) => (n.evento.fuente === "era5" ? [sumarDiasISO(n.evento.dias[0], -1), sumarDiasISO(n.evento.dias[1], 1)] : n.evento.dias);

// Máximos de la barra de lluvia para cada duración w (1 a 72 h): lo más que llovió en w horas en algún Niño. Con el dato
// precalculado se conocen la hora, el día y los 3 días más lluviosos de cada temporada; entre esos puntos, la lluvia crece como
// una potencia de la duración (como las curvas intensidad-duración-frecuencia).
function maximosPorDuracion(anclas) {
  const out = Array.from({ length: DUR_MAX + 1 }, () => ({ max: 0, temporada: null }));
  for (const { temporada, p1, p24, p72 } of anclas) {
    for (let w = 1; w <= DUR_MAX; w++) {
      const [w0, v0, w1, v1] = w <= 24 ? [1, p1, 24, p24] : [24, p24, 72, p72];
      if (!(v0 > 0 && v1 > 0)) continue;   // sin la hora más lluviosa (sin dato precalculado): solo lo que dan las tormentas hora por hora
      const v = v0 * (w / w0) ** (Math.log(v1 / v0) / Math.log(w1 / w0));
      if (v > out[w].max) out[w] = { max: v, temporada };
    }
  }
  return out;
}

const cacheHistorico = new Map();
function historicoNino(punto) {
  const [lon, lat] = punto.map((v) => v.toFixed(2)), clave = `${lon},${lat}`;
  if (!cacheHistorico.has(clave)) cacheHistorico.set(clave, (async () => {
    // Dos consultas livianas: la lluvia diaria de 1951 a 2024 (para el cuadro de todos los Niños) y la humedad del suelo y la
    // evaporación desde 1997; y las tormentas precalculadas de la celda
    const pedirDiario = (desde, vars) => {
      const u = `${ARCHIVO}?latitude=${lat}&longitude=${lon}&start_date=${desde}&end_date=2024-04-30&daily=${vars}${ZONA}`;
      return fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null)
        .then(async (x) => x ?? (await new Promise((ok) => setTimeout(ok, 2000)), await fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null)));   // un reintento
    };
    const [d, d2, sat] = await Promise.all([pedirDiario("1951-10-01", "precipitation_sum"), pedirDiario(`${DESDE_COMPLETO}-10-01`, "soil_moisture_0_to_7cm_mean,et0_fao_evapotranspiration_sum"),
      lluviaNinosEn(punto)]);
    if (d?.daily && d2?.daily) {   // humedad y evaporación en la misma línea de tiempo (vacías antes de 1997)
      const off = d.daily.time.indexOf(d2.daily.time[0]);
      for (const k of ["soil_moisture_0_to_7cm_mean", "et0_fao_evapotranspiration_sum"]) d.daily[k] = d.daily.time.map((_, i) => (i >= off ? d2.daily[k][i - off] : null));
    } else if (d?.daily) for (const k of ["soil_moisture_0_to_7cm_mean", "et0_fao_evapotranspiration_sum"]) d.daily[k] = d.daily.time.map(() => null);
    // Sin el archivo de Open-Meteo (sin conexión o sin cupo del día) igual quedan los Niños desde 1997-98, que vienen precalculados
    const D = d?.daily?.time?.length ? d.daily : null;
    if (!D && !sat) { cacheHistorico.delete(clave); return null; }
    const idx = new Map((D?.time ?? []).map((t, i) => [t, i])), ninos = [], hum = [];
    let sEt = 0, nEt = 0;
    for (const [anio, intensidad] of NINOS) {
      const a = idx.get(`${anio}-10-01`), b = idx.get(`${anio + 1}-04-30`);
      const completo = anio >= DESDE_COMPLETO, S = completo ? sat?.temporadas[anio] : null;
      if (D && (a == null || b == null)) continue;
      let evento = null;
      if (S && S.total > 0) {
        const d0 = sumarDiasISO(`${anio}-10-01`, S.d0);
        evento = { total: S.total, dias: [d0, sumarDiasISO(d0, 2)], era5: S.era5, imerg: S.imerg, pico: S.pico, fuente: S.imerg != null ? "imerg" : "era5_sat" };
      } else if (D) {
        const p = D.precipitation_sum.slice(a, b + 1).map((v) => v ?? 0);
        let mejor = -1, k0 = 0;
        for (let k = 0; k + 2 < p.length; k++) { const s3 = p[k] + p[k + 1] + p[k + 2]; if (s3 > mejor) { mejor = s3; k0 = k; } }
        if (mejor > 0) evento = { total: mejor, dias: [D.time[a + k0], D.time[a + k0 + 2]], era5: mejor, imerg: null, fuente: "era5" };
      }
      if (completo && D) for (let i = a; i <= b; i++) { const v = D.soil_moisture_0_to_7cm_mean[i]; if (v != null) hum.push(v); const e = D.et0_fao_evapotranspiration_sum[i]; if (e != null) { sEt += e; nEt++; } }
      ninos.push({ temporada: `${anio}-${String(anio + 1).slice(2)}`, anio, intensidad, completo, evento });
    }
    // Máximos provisorios de la barra de lluvia (se afinan con las tormentas hora por hora apenas llegan)
    const completos = ninos.filter((x) => x.completo && x.evento);
    const anclas = completos.map((n) => {
      const S = sat?.temporadas[n.anio];
      if (S) return { temporada: n.temporada, p1: S.picoTemporada, p24: S.diaTemporada, p72: S.total };
      const a = idx.get(`${n.anio}-10-01`), b = idx.get(`${n.anio + 1}-04-30`), p = D ? D.precipitation_sum.slice(a, b + 1).map((v) => v ?? 0) : [0];
      return { temporada: n.temporada, p1: 0, p24: Math.max(...p), p72: n.evento.total };
    });
    const R = { temporadas: ninos.length, ninos, lluvia: maximosPorDuracion(anclas), humedad: hum.length ? { min: Math.min(...hum), max: Math.max(...hum) } : null,
      et0h: nEt ? sEt / nEt / 24 : 0.15, lat, lon, desague: sat?.desague > 0 ? sat.desague : null, fuenteLluvia: sat ? "imerg" : "era5" };
    // En segundo plano: la peor tormenta de cada Niño hora por hora (de a 9 consultas chicas)
    R.horarias = (async () => {
      const horarias = [];
      for (let i = 0; i < completos.length; i += 9) horarias.push(...await Promise.all(completos.slice(i, i + 9).map((n) => lluviaHoraria(lat, lon, ...tramoDe(n)))));
      completos.forEach((n, k) => { n.evento.horaria = horarias[k]?.precipitation ? tormentaDe(n, horarias[k]) : sinForma(n); });
      // Con las tormentas hora por hora: lo más que llovió en w horas dentro de cada una (y las anclas de la temporada)
      const fino = maximosPorDuracion(anclas);
      for (const n of completos) {
        const p = n.evento.horaria?.lluvia;
        if (!p) continue;
        for (let w = 1; w <= DUR_MAX; w++) {
          let s2 = 0, m = 0;
          for (let i = 0; i < p.length; i++) { s2 += p[i] - (i >= w ? p[i - w] : 0); if (s2 > m) m = s2; }
          if (m > fino[w].max) fino[w] = { max: m, temporada: n.temporada };
        }
      }
      R.lluvia = fino;
      R.horariasListas = true;
    })();
    return R;
  })());
  return cacheHistorico.get(clave);
}
// La peor tormenta de un Niño hora por hora (se baja solo cuando se la elige)
async function eventoHorario(H, n) {
  if (!n?.evento) return null;
  n.evento.horaria ??= await lluviaHoraria(H.lat, H.lon, ...tramoDe(n)).then((h) => (h?.precipitation ? tormentaDe(n, h) : sinForma(n)));
  return n.evento.horaria;
}
// Humedad del suelo de ahora en el punto (Open-Meteo, 3-9 cm), para el botón «Condiciones de hoy»
async function humedadHoy(punto) {
  const [lon, lat] = punto.map((v) => v.toFixed(3));
  const d = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=soil_moisture_3_to_9cm&past_days=1&forecast_days=1&timezone=America%2FArgentina%2FBuenos_Aires`)
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const v = d?.hourly?.soil_moisture_3_to_9cm, t0 = Date.now();
  if (!v) return null;
  const k = d.hourly.time.findIndex((x) => Date.parse(`${x}:00-03:00`) > t0);
  return v.slice(0, k < 0 ? v.length : k).filter((x) => x != null).at(-1) ?? null;
}

// ---------- Grilla del modelo ----------
// Celdas de 20 a 60 m según el tamaño del área y la duración (más días → celdas más grandes, para que el cálculo dure poco).
function grillaModelo(d, horas, nMaxForzado = null) {
  const D = d.D, W = D.W, s = d.s;
  const aPx = (lon, lat) => [(xDeLon(lon, D.z) - D.tx0) * 256, (yDeLat(lat, D.z) - D.ty0) * 256];
  const [cx0, cy0, cx1, cy1] = cajaCirculo(s.punto, s.km * 1.3);   // un poco más que el círculo: el agua que baja de afuera entra
  const [px0, py1] = aPx(cx0, cy0), [px1, py0] = aPx(cx1, cy1);
  const bx0 = Math.max(0, Math.floor(px0)), by0 = Math.max(0, Math.floor(py0)), bx1 = Math.min(W, Math.ceil(px1)), by1 = Math.min(D.H, Math.ceil(py1));
  const ancho = (bx1 - bx0) * d.metrosPx, nMax = nMaxForzado ?? (horas <= 96 ? 200 : horas <= 500 ? 150 : horas <= 1500 ? 110 : 85);
  const tam = Math.max(20, ancho / nMax), f = Math.max(1, Math.round(tam / d.metrosPx)), dx = f * d.metrosPx;
  const nx = Math.floor((bx1 - bx0) / f), ny = Math.floor((by1 - by0) / f), N = nx * ny;
  const z = new Float32Array(N), tipo2 = new Uint8Array(N).fill(1), lago = new Int32Array(N).fill(-1), cauce = new Float32Array(N);
  const celdaDe = (i) => { const x = Math.floor(((i % W) - bx0) / f), y = Math.floor((((i / W) | 0) - by0) / f); return x >= 0 && y >= 0 && x < nx && y < ny ? y * nx + x : -1; };
  // Agua del mapa base separada en lagunas (guardan) y ríos/mar (nivel fijo)
  const capa = rasterizarAgua(d, aPx, bx0, by0, f, nx, ny);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    let suma = 0, n = 0;
    for (let yy = 0; yy < f; yy++) for (let xx = 0; xx < f; xx++) { suma += D.h[(by0 + y * f + yy) * W + bx0 + x * f + xx]; n++; }
    const c = y * nx + x;
    z[c] = suma / n;
    if (capa.rio[c] > 0.5) tipo2[c] = 3; else if (capa.lago[c] > 0.5) tipo2[c] = 2;
    if (tipo2[c] === 1 && capa.cauce[c] > 0) { z[c] -= capa.cauce[c]; cauce[c] = capa.cauce[c]; }   // arroyos y canales grabados en el terreno
  }
  // Lagunas pegadas al río (madrejones, lagunas del valle de inundación): son parte del río y suben con su crecida
  const pila0 = [];
  for (let c = 0; c < N; c++) if (tipo2[c] === 3) pila0.push(c);
  while (pila0.length) {
    const k = pila0.pop(), x = k % nx, y = (k / nx) | 0;
    for (const [vx, vy] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const v = vy * nx + vx;
      if (vx >= 0 && vy >= 0 && vx < nx && vy < ny && tipo2[v] === 2) { tipo2[v] = 3; pila0.push(v); }
    }
  }
  // Lagunas: cada grupo de celdas conectadas es una laguna con un único nivel
  let nl = 0;
  for (let c = 0; c < N; c++) {
    if (tipo2[c] !== 2 || lago[c] >= 0) continue;
    const pila = [c]; lago[c] = nl;
    while (pila.length) {
      const k = pila.pop(), x = k % nx, y = (k / nx) | 0;
      for (const [vx, vy] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const v = vy * nx + vx;
        if (vx >= 0 && vy >= 0 && vx < nx && vy < ny && tipo2[v] === 2 && lago[v] < 0) { lago[v] = nl; pila.push(v); }
      }
    }
    nl++;
  }
  const cob = rasterizarCobertura(d, aPx, bx0, by0, f, nx, ny);
  // Personas por celda (de los radios censales) y celdas dentro del círculo
  const pob = new Float32Array(N), dentroC = new Uint8Array(N);
  const totalRadio = d.celdasRadio;
  d.celdas.forEach((i, k) => {
    const c = celdaDe(i);
    if (c < 0) return;
    dentroC[c] = 1;
    const r = d.radioDe[k];
    if (r && totalRadio[r]) pob[c] += (Number(d.radios[r - 1].properties.poblacion) || 0) / totalRadio[r];
  });
  const ruta = rasterizarRutas(aPx, bx0, by0, f, nx, ny);
  return { nx, ny, dx, f, bx0, by0, N, z, tipo2, lago, cauce, nLagos: nl, nMan: cob.n, imp: cob.imp, pob, dentroC, celdaDe, ruta };
}

// Calles y rutas del mapa base (OpenStreetMap): 1 = calle, 2 = puente (sigue pasable aunque abajo haya agua)
const CLASES_RUTA = new Set(["motorway", "trunk", "primary", "secondary", "tertiary", "minor", "service"]);
function rasterizarRutas(aPx, bx0, by0, f, nx, ny) {
  const aCel = (lo, la) => { const [x, y] = aPx(lo, la); return [(x - bx0) / f, (y - by0) / f]; };
  const calle = lienzoGrilla(nx, ny), puente = lienzoGrilla(nx, ny);
  for (const l of [calle, puente]) { l.c.strokeStyle = "#000"; l.c.lineCap = "round"; }
  for (const ft of rasgosBase("transportation", (x) => CLASES_RUTA.has(x.properties.class))) trazar((ft.properties.brunnel === "bridge" ? puente : calle).c, ft.geometry, aCel, 1);
  const c = calle.leer(), pu = puente.leer(), out = new Uint8Array(nx * ny);
  for (let i = 0; i < out.length; i++) out[i] = pu[i] > 0.3 ? 2 : c[i] > 0.3 ? 1 : 0;
  return out;
}

// Polígonos y líneas del mapa base dibujados a la grilla del modelo (fracción de cada celda)
function lienzoGrilla(nx, ny) {
  const cv = new OffscreenCanvas(nx, ny), c = cv.getContext("2d", { willReadFrequently: true });
  return { cv, c, leer: () => { const p = c.getImageData(0, 0, nx, ny).data, out = new Float32Array(nx * ny); for (let i = 0; i < out.length; i++) out[i] = p[4 * i + 3] / 255; return out; } };
}
function trazar(c, geom, aCel, ancho = 0) {
  const tipo = geom.type, cs = geom.coordinates;
  const anillos = tipo === "Polygon" ? cs : tipo === "MultiPolygon" ? cs.flat() : tipo === "LineString" ? [cs] : tipo === "MultiLineString" ? cs : [];
  c.beginPath();
  for (const a of anillos) { a.forEach(([lo, la], j) => { const [x, y] = aCel(lo, la); j ? c.lineTo(x, y) : c.moveTo(x, y); }); if (!ancho) c.closePath(); }
  if (ancho) { c.lineWidth = ancho; c.stroke(); } else c.fill("evenodd");
}
function rasgosBase(capa, filtro = () => true) {
  const fuente = Object.entries(SIM.mapa?.getStyle()?.sources ?? {}).find(([k, f]) => f.type === "vector" && k === "openmaptiles")?.[0]
    ?? Object.entries(SIM.mapa?.getStyle()?.sources ?? {}).find(([, f]) => f.type === "vector")?.[0];
  return fuente ? SIM.mapa.querySourceFeatures(fuente, { sourceLayer: capa }).filter(filtro) : [];
}
function rasterizarAgua(d, aPx, bx0, by0, f, nx, ny) {
  const aCel = (lo, la) => { const [x, y] = aPx(lo, la); return [(x - bx0) / f, (y - by0) / f]; };
  const rio = lienzoGrilla(nx, ny), lago = lienzoGrilla(nx, ny), cauce = lienzoGrilla(nx, ny);
  for (const ft of rasgosBase("water")) {
    const cl = ft.properties.class;
    (cl === "river" || cl === "ocean" ? rio : lago).c.fillStyle = "#000";
    trazar((cl === "river" || cl === "ocean" ? rio : lago).c, ft.geometry, aCel);
  }
  // Cauces: arroyos y zanjas 1 m; canales y ríos chicos (líneas) 2 m
  cauce.c.lineCap = "round";
  for (const ft of rasgosBase("waterway")) {
    const cl = ft.properties.class, prof = cl === "canal" || cl === "river" ? 1 : 0.5;
    cauce.c.strokeStyle = `rgba(0,0,0,${prof})`;
    trazar(cauce.c, ft.geometry, aCel, Math.max(1, 10 / (f * d.metrosPx)));
  }
  const cz = cauce.leer().map((v) => (v > 0.15 ? Math.round(v * 2 * 2) / 2 : 0));
  return { rio: rio.leer(), lago: lago.leer(), cauce: cz };
}
// Impermeable (0 a 1) y rugosidad de Manning por celda
function rasterizarCobertura(d, aPx, bx0, by0, f, nx, ny) {
  const aCel = (lo, la) => { const [x, y] = aPx(lo, la); return [(x - bx0) / f, (y - by0) / f]; };
  const imp = lienzoGrilla(nx, ny), monte = lienzoGrilla(nx, ny);
  const urbano = { residential: 0.5, commercial: 0.75, retail: 0.75, industrial: 0.7, railway: 0.4, hospital: 0.55, school: 0.45 };
  for (const ft of rasgosBase("landuse")) {
    const v = urbano[ft.properties.class];
    if (v) { imp.c.fillStyle = `rgba(0,0,0,${v})`; trazar(imp.c, ft.geometry, aCel); }
  }
  imp.c.fillStyle = "rgba(0,0,0,0.9)";
  for (const ft of rasgosBase("building")) trazar(imp.c, ft.geometry, aCel);
  imp.c.strokeStyle = "rgba(0,0,0,0.95)";
  for (const ft of rasgosBase("transportation", (x) => ["motorway", "trunk", "primary", "secondary", "tertiary", "minor"].includes(x.properties.class)))
    trazar(imp.c, ft.geometry, aCel, Math.max(0.4, 9 / (f * d.metrosPx)));
  monte.c.fillStyle = "#000";
  for (const ft of rasgosBase("landcover", (x) => x.properties.class === "wood")) trazar(monte.c, ft.geometry, aCel);
  const fi = imp.leer(), fm = monte.leer(), n = new Float32Array(nx * ny);
  for (let i = 0; i < n.length; i++) n[i] = 0.035 + 0.045 * fi[i] + 0.065 * fm[i];   // pasto 0,035 · urbano ~0,08 · monte ~0,10
  return { imp: fi, n };
}

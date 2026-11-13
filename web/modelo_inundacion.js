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

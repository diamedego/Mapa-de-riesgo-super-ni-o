// Modelo hidráulico 2D del simulador (corre en un Web Worker, para no trabar la página).
//
// Ecuaciones: aproximación inercial local de las ecuaciones de aguas poco profundas (Bates, Horritt y Fewtrell 2010;
// de Almeida y otros 2012), la misma familia que LISFLOOD-FP y que la "onda difusa" de HEC-RAS 2D. Por cada cara entre
// dos celdas se calcula el caudal por unidad de ancho a partir del desnivel del agua y la fricción de Manning; con esos
// caudales se actualiza la profundidad. Paso de tiempo adaptativo (condición de Courant).
//
// Balance de agua en cada celda de tierra, hora por hora:
//   lluvia (dato real, pronóstico o escenario) − infiltración (Green-Ampt con humedad del suelo que evoluciona)
//   − desagües en superficies impermeables (supuesto, no hay datos) − evaporación del agua estancada.
// Lagunas: guardan el agua (nivel único por laguna que sube y baja). Ríos: borde con nivel fijo (actual + crecida elegida):
// reciben el agua o la desbordan sobre la costa. Bordes del área: el agua sale libremente.
// Las horas secas con el agua quieta no mueven el agua (solo infiltración y evaporación): así un período largo es viable.
// Asimilación (pronóstico): en la hora de la pasada del radar, las celdas donde el satélite vio agua y el modelo tiene menos
// suben a lo observado (m.asimilar = { k, h }); el agua agregada se cuenta aparte en el balance (cuenta.asimilada).
"use strict";
const G = 9.81, ALFA = 0.7, H_MIN = 0.002;
let S = null, cortar = false;

onmessage = (e) => {
  const m = e.data;
  if (m.tipo === "iniciar") { cortar = false; iniciar(m); correr(); }
  else if (m.tipo === "parar") cortar = true;
};

function iniciar(m) {
  const { nx, ny, dx } = m, N = nx * ny;
  S = { ...m, par: m.suelo, N, h: new Float32Array(N), qx: new Float32Array((nx + 1) * ny), qy: new Float32Array(nx * (ny + 1)),
    hMax: new Float32Array(N), suelo: new Float32Array(N), fEvento: new Float32Array(N), secas: new Uint16Array(N) };
  // Lagunas: nivel inicial = superficie del agua en el relieve; área para pasar volumen a nivel
  S.nLagos = 0;
  for (let i = 0; i < N; i++) if (m.tipo2[i] === 2) S.nLagos = Math.max(S.nLagos, m.lago[i] + 1);
  S.nivelLago = new Float64Array(S.nLagos).fill(Infinity); S.areaLago = new Float64Array(S.nLagos);
  // Nivel inicial de cada laguna: su superficie en el relieve, pero nunca por encima de la orilla más baja (el relieve satelital
  // a veces deja la orilla más baja que el agua; así la laguna solo desborda si sube de verdad)
  const orilla = (i, fn) => { const x = i % nx, y = (i / nx) | 0; for (const [vx, vy] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (vx >= 0 && vy >= 0 && vx < nx && vy < ny) fn(vy * nx + vx); };
  for (let i = 0; i < N; i++) if (m.tipo2[i] === 2) {
    const l = m.lago[i]; S.nivelLago[l] = Math.min(S.nivelLago[l], m.z[i]); S.areaLago[l] += dx * dx;
    orilla(i, (v) => { if (m.tipo2[v] === 1) S.nivelLago[l] = Math.min(S.nivelLago[l], m.z[v] - 0.05); });
  }
  // Ríos y mar: mismo criterio con un nivel base único (el más bajo entre su superficie y su orilla) + la crecida elegida
  S.baseRio = Infinity;
  for (let i = 0; i < N; i++) if (m.tipo2[i] === 3) { S.baseRio = Math.min(S.baseRio, m.z[i]); orilla(i, (v) => { if (m.tipo2[v] === 1) S.baseRio = Math.min(S.baseRio, m.z[v] - 0.05); }); }
  // Altura del río relativa al nivel de evacuación de la estación (validación con alturas del INA): en el nivel de evacuación el
  // agua llega a la orilla del cuartil más bajo; cada metro de más o de menos se suma o se resta
  if (m.relEvac && Number.isFinite(S.baseRio)) {
    const bordes = [];
    for (let i = 0; i < N; i++) if (m.tipo2[i] === 3) orilla(i, (v) => { if (m.tipo2[v] === 1 && m.z[v] < 900) bordes.push(m.z[v]); });   // sin la pared del borde del círculo
    bordes.sort((a, b) => a - b);
    const bordo = bordes.length ? bordes[Math.floor(bordes.length * (m.cuantilOrilla ?? 0.4))] - S.baseRio : 0;
    // Por debajo del nivel de evacuación: en la altura mediana del río el agua queda en su cauce (superficie del relieve) y sube en
    // proporción hasta la orilla del cuantil 40 % en evacuación; por encima, cada metro de más se suma (validado con radar en Concordia).
    // Antes bajaba metro por metro también por debajo de evacuación y un río normal desbordaba sobre las orillas más bajas (islas del delta)
    const rm = m.relMed;   // mediana del río respecto de evacuación (m, negativa); sin dato, la regla anterior
    S.crecidaHora = Float32Array.from(m.relEvac, (r) => (r >= 0 || !(rm < 0) ? Math.max(-1, bordo + r) : bordo * Math.min(1, Math.max(0, (r - rm) / -rm))));
    S.crecida = S.crecidaHora[0]; S.bordo = bordo;
  }
  // Escenario: lagunas más bajas que la orilla (en metros, ≤ 0): guardan más agua antes de desbordar
  if (m.lagoOffset) for (let l = 0; l < S.nLagos; l++) S.nivelLago[l] += m.lagoOffset;
  S.nivel0 = Float64Array.from(S.nivelLago);
  S.cuenta = { lluvia: 0, infiltrada: 0, desague: 0, evaporada: 0, salida: 0, lagos: 0, rio: 0 };   // m³, para verificar que no se crea ni se pierde agua
  // Humedad inicial del suelo (fracción del espacio poroso ocupada) → agua guardada en la capa de 30 cm
  for (let i = 0; i < N; i++) S.suelo[i] = Math.min(m.suelo.thetaS, m.theta0) * 300;   // mm
}

// Nivel del agua (m) y fondo de cada celda para el cálculo de caras
function eta(i) {
  const t = S.tipo2[i];
  if (t === 1) return S.z[i] + S.h[i];
  if (t === 2) return S.nivelLago[S.lago[i]];
  if (t === 3) return S.baseRio + S.crecida;
  return NaN;
}
const fondo = (i) => (S.tipo2[i] === 1 ? S.z[i] : Math.min(S.z[i], S.tipo2[i] === 3 ? S.baseRio : S.nivel0[S.lago[i]]) - 5);   // lagunas y ríos: fondo bajo la superficie del relieve

// Caudal por una cara (inercial local con fricción semi-implícita)
function caudal(qViejo, a, b, dt, n) {
  const ea = eta(a), eb = eta(b);
  const hf = Math.max(ea, eb) - Math.max(fondo(a), fondo(b));
  if (!(hf > H_MIN)) return 0;
  let q = (qViejo - G * hf * dt * (eb - ea) / S.dx) / (1 + G * dt * n * n * Math.abs(qViejo) / Math.pow(hf, 7 / 3));
  // Limitador: no sacar de una celda de tierra más agua de la que tiene
  const lim = (i) => (S.tipo2[i] === 1 ? S.h[i] * S.dx / (4 * dt) : Infinity);
  if (q > 0) q = Math.min(q, lim(a)); else q = Math.max(q, -lim(b));
  return q;
}

function pasoHidraulico(dt) {
  const { nx, ny, dx, h, qx, qy, tipo2, nMan } = S;
  // Caras verticales (entre columnas)
  for (let y = 0; y < ny; y++) for (let x = 1; x < nx; x++) {
    const a = y * nx + x - 1, b = a + 1, f = y * (nx + 1) + x;
    if ((tipo2[a] !== 1 && tipo2[b] !== 1) || (tipo2[a] === 1 && tipo2[b] === 1 && h[a] < H_MIN && h[b] < H_MIN)) { qx[f] = 0; continue; }
    qx[f] = caudal(qx[f], a, b, dt, 0.5 * (nMan[a] + nMan[b]));
  }
  for (let y = 1; y < ny; y++) for (let x = 0; x < nx; x++) {
    const a = (y - 1) * nx + x, b = a + nx, f = y * nx + x;
    if ((tipo2[a] !== 1 && tipo2[b] !== 1) || (tipo2[a] === 1 && tipo2[b] === 1 && h[a] < H_MIN && h[b] < H_MIN)) { qy[f] = 0; continue; }
    qy[f] = caudal(qy[f], a, b, dt, 0.5 * (nMan[a] + nMan[b]));
  }
  // Bordes: salida libre (caudal de Manning con pendiente 0,1 %)
  const salida = (i) => (tipo2[i] === 1 && h[i] > H_MIN ? Math.min(Math.pow(h[i], 5 / 3) * 0.0316 / nMan[i], h[i] * dx / (4 * dt)) : 0);
  for (let y = 0; y < ny; y++) { qx[y * (nx + 1)] = -salida(y * nx); qx[y * (nx + 1) + nx] = salida(y * nx + nx - 1); }
  for (let x = 0; x < nx; x++) { qy[x] = -salida(x); qy[ny * nx + x] = salida((ny - 1) * nx + x); }
  let sal = 0;
  for (let y = 0; y < ny; y++) sal += qx[y * (nx + 1) + nx] - qx[y * (nx + 1)];
  for (let x = 0; x < nx; x++) sal += qy[ny * nx + x] - qy[x];
  S.cuenta.salida += sal * dt * dx;
  // Continuidad
  const dV = S.nLagos ? new Float64Array(S.nLagos) : null;
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const i = y * nx + x, neto = qx[y * (nx + 1) + x] - qx[y * (nx + 1) + x + 1] + qy[y * nx + x] - qy[(y + 1) * nx + x];
    if (tipo2[i] === 1) h[i] = Math.max(0, h[i] + dt * neto / dx);
    else if (tipo2[i] === 2) dV[S.lago[i]] += dt * neto * dx;
    else if (tipo2[i] === 3) S.cuenta.rio += dt * neto * dx;   // agua que entra al río (o sale, si es negativa)
  }
  if (dV) for (let l = 0; l < S.nLagos; l++) S.nivelLago[l] += dV[l] / S.areaLago[l];
}

// Pérdidas y aportes de una hora (o fracción): lluvia, infiltración, desagües, evaporación y humedad del suelo
function balance(horas, lluviaMm, et0Mm) {
  const { N, h, tipo2, imp, suelo, fEvento, secas } = S, P = S.par;   // P: parámetros del suelo; suelo: agua guardada (mm)
  for (let i = 0; i < N; i++) {
    if (tipo2[i] !== 1) continue;
    let agua = h[i] * 1000 + lluviaMm;   // mm disponibles en superficie
    const a2 = S.dx * S.dx / 1000, antes = agua;
    S.cuenta.lluvia += lluviaMm * a2;
    // Infiltración Green-Ampt en la parte permeable, limitada por la capacidad que queda en la capa de suelo
    const theta = suelo[i] / 300, hueco = Math.max(0, P.thetaS - theta);
    const fcap = P.ks * (1 + P.psi * hueco / Math.max(fEvento[i], 5)) * horas;
    const inf = Math.min(agua * (1 - imp[i]), fcap * (1 - imp[i]), hueco * 300);
    agua -= inf; suelo[i] += inf; fEvento[i] += inf; S.cuenta.infiltrada += inf * a2;
    // Desagües pluviales en superficies impermeables (capacidad supuesta)
    const des = Math.min(agua, S.desague * imp[i] * horas); agua -= des; S.cuenta.desague += des * a2;
    // Evaporación del agua estancada; si no hay, del suelo (según su humedad)
    if (agua > 0) { const ev = Math.min(agua, et0Mm); agua -= ev; S.cuenta.evaporada += ev * a2; }
    else suelo[i] = Math.max(0, suelo[i] - et0Mm * 0.7 * (theta / P.thetaS));
    // Drenaje profundo de la capa de suelo
    suelo[i] = Math.max(0, suelo[i] - P.ks * 0.1 * Math.pow(theta / P.thetaS, 4) * horas);
    // Sin lluvia ni charco por 24 h, termina el "evento" de infiltración
    if (lluviaMm > 0.01 || agua > 1) secas[i] = 0; else if ((secas[i] += horas >= 1 ? 1 : 0) > 24) fEvento[i] = 0;
    h[i] = agua / 1000;
  }
  for (let l = 0; l < S.nLagos; l++) { S.nivelLago[l] += (lluviaMm - et0Mm) / 1000; S.cuenta.lluvia += lluviaMm * S.areaLago[l] / 1000; S.cuenta.evaporada += et0Mm * S.areaLago[l] / 1000; }
}

function correr() {
  const { lluvia, et0, nx, N } = S, horas = lluvia.length;
  // Con río (o mar) el agua arranca en movimiento: un río alto inunda la orilla aunque no llueva (antes quedaba quieta)
  let quietas = Number.isFinite(S.baseRio) ? 0 : 99;
  const t0 = performance.now();
  for (let k = 0; k < horas; k++) {
    if (cortar) { postMessage({ tipo: "cortado" }); return; }
    const r = lluvia[k], e = et0[k];
    for (const As of Array.isArray(S.asimilar) ? S.asimilar : S.asimilar ? [S.asimilar] : []) {   // puede haber varias (radar de hoy, agua vista en el Niño)
      if (k !== As.k) continue;
      const H = As.h, a = S.dx * S.dx;
      for (let i = 0; i < N; i++) if (S.tipo2[i] === 1 && H[i] > S.h[i]) { S.cuenta.asimilada = (S.cuenta.asimilada ?? 0) + (H[i] - S.h[i]) * a; S.h[i] = H[i]; }
      quietas = 0;
    }
    // Nivel del río hora por hora (para repetir crecidas reales con las alturas del INA); si cambia, el agua se mueve
    if (S.crecidaHora && Math.abs(S.crecidaHora[k] - S.crecida) > 0.005) { S.crecida = S.crecidaHora[k]; quietas = 0; }
    let hAntes = null;
    const mover = r > 0.05 || quietas < 12;   // con lluvia o hasta 12 h después de que el agua se aquietó
    if (mover) {
      hAntes = Float32Array.from(S.h);
      // La lluvia entra de a poco: 12 tramos de 5 minutos (en cada uno, infiltración y desagüe; lo demás escurre)
      for (let tramo = 0; tramo < 12; tramo++) {
        balance(1 / 12, r / 12, e / 12);
        let t = 0;
        while (t < 300) {
          let hm = 0.05;
          for (let i = 0; i < N; i++) if (S.h[i] > hm) hm = S.h[i];
          const dt = Math.min(300 - t, 30, ALFA * S.dx / Math.sqrt(G * (hm + 0.3)));
          pasoHidraulico(dt);
          t += dt;
        }
      }
    } else {
      S.qx.fill(0); S.qy.fill(0);
      balance(1, r, e);
    }
    // ¿El agua se aquietó? (cambio máximo de profundidad en la hora menor a 2 mm)
    if (hAntes) {
      let dmax = 0;
      for (let i = 0; i < N; i++) { const d = Math.abs(S.h[i] - hAntes[i]); if (d > dmax) dmax = d; }
      quietas = r > 0.05 ? 0 : dmax < 0.002 ? quietas + 1 : 0;
    } else quietas++;
    for (let i = 0; i < N; i++) if (S.h[i] > S.hMax[i]) S.hMax[i] = S.h[i];
    // Una foto por hora (la página arma la línea de tiempo); el nivel de las lagunas va aparte
    postMessage({ tipo: "hora", k, horas, h: Float32Array.from(S.h), lagos: Array.from(S.nivelLago, (v, l) => v - S.nivel0[l]), movio: mover,
      seg: (performance.now() - t0) / 1000 });
  }
  let sup = 0;
  for (let i = 0; i < N; i++) if (S.tipo2[i] === 1) sup += S.h[i] * S.dx * S.dx;
  for (let l = 0; l < S.nLagos; l++) S.cuenta.lagos += (S.nivelLago[l] - S.nivel0[l]) * S.areaLago[l];
  postMessage({ tipo: "fin", hMax: S.hMax, suelo: Float32Array.from(S.suelo), cuenta: { ...S.cuenta, superficie: sup } });
}

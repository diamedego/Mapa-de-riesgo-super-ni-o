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
  capas: { colores: true, curvas: true, drenaje: true, cortes: false, flujo: true, corte: true, x5: false, refs3d: true }, vista: "mapa", maqueta: null,
  modelo: null, desague: 10, crecida: 0, tormenta: { mm: 0, horas: 3 }, velocidad: 1 };   // desagües pluviales supuestos: 10 mm/h en superficies impermeables (no hay datos)
const AGUA_MIN = 0.1;   // desde 10 cm se cuenta como zona con agua (superficie, personas)
const AGUA_VER = 0.05;  // se dibuja desde 5 cm (menos es solo suelo mojado)
const CORTE = 0.3;      // desde 30 cm una calle queda cortada para un auto (el agua en movimiento lo puede arrastrar)
const TERRARIUM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
// Agua: de celeste translúcido a azul profundo. Altura: del verde azulado de los bajos al marrón de las lomas.
// Escala del agua: cada escalón más oscuro y más opaco que el anterior (de celeste a azul marino)
const COLOR_AGUA = [[0.05, [158, 207, 240, 0.6]], [0.15, [110, 176, 230, 0.68]], [0.3, [70, 145, 215, 0.74]], [0.6, [40, 110, 195, 0.8]], [1, [25, 75, 165, 0.86]], [2, [14, 45, 120, 0.92]]];
const COLOR_ALTURA = [[0, [38, 120, 120, 0.6]], [0.25, [92, 160, 110, 0.6]], [0.5, [180, 196, 120, 0.6]], [0.75, [205, 170, 110, 0.6]], [1, [170, 120, 80, 0.6]]];
const CAPAS_SIM = ["flujo", "corte"];

// ---------- Escenario: los factores que cambian cuánto se inunda con una lluvia ----------
// Lluvia y duración, humedad del suelo, nivel de las lagunas, altura del río (o del mar) y capacidad de los desagües. Cada barra
// va del mínimo al máximo registrado en los Niños en este lugar (si no hay registro de un Niño, el de todo el registro; si no
// hay ningún registro, un rango supuesto, avisado). El viento no está: no cambia cuánta agua se junta con la lluvia; solo
// importaría como sudestada, que ya es la altura del río o del mar.
// Selector de Niño: cada temporada desde 1997-98 con su peor tormenta en el lugar; al elegirla, las barras toman lo que pasó de
// verdad EN ESA TORMENTA: lluvia hora por hora (satélite IMERG), humedad del suelo justo antes y la altura del río de
// esos mismos días (INA medido o GloFAS). El Niño que dejó a más personas con agua (según la fórmula) queda marcado.
function cambiarEscenario(cambio, correr = true) {
  const E = SIM.esc;
  if (cambio.horas != null && cambio.horas !== E.horas && E.perfil) E.perfil = remuestrear(E.perfil, cambio.horas);
  if (E.nino && ("mm" in cambio || "horas" in cambio)) E.nino = null;   // deja de ser la tormenta real, pero conserva su forma
  Object.assign(E, cambio);
  const L = limitesEscenario();
  if (L) E.mm = limitar(E.mm, 0, L.lluvia.max);   // al cambiar la duración, la lluvia no puede pasar el máximo de esa duración
  pintarEscenario();
  if (correr) simularEscenario();
}
// Forma de una tormenta (fracciones que suman 1) llevada a otra cantidad de horas, interpolando la lluvia acumulada
function remuestrear(perfil, n) {
  const m = perfil.length, acum = [0];
  perfil.forEach((v) => acum.push(acum.at(-1) + v));
  const out = [];
  let prev = 0;
  for (let j = 1; j <= n; j++) {
    const x = (j * m) / n, i = Math.floor(x), a = i >= m ? acum[m] : acum[i] + (acum[i + 1] - acum[i]) * (x - i);
    out.push(a - prev); prev = a;
  }
  return out;
}

// Estación del INA a menos de 15 km con niveles oficiales (la misma regla que el período con pronóstico)
function estacionCercana(d) {
  return estado.datos.estaciones.features.map((f) => ({ ...f.properties, km: distanciaKm(d.s.punto, f.geometry.coordinates) }))
    .filter((e) => e.km <= 15 && e.h != null && (e.nivel_evacuacion != null || e.nivel_alerta != null))
    .map((e) => ({ ...e, ref: e.nivel_evacuacion ?? e.nivel_alerta + 0.5 })).sort((a, b) => a.km - b.km)[0] ?? null;
}
let cargaRiosExtremos = null, cargaRiosResumen = null;
const cargasRioDia = new Map(), DIAS_DRENAJE = 3;
const riosResumen = () => (cargaRiosResumen ??= fetch("datos/rios_ninos_resumen.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
const riosExtremos = () => (cargaRiosExtremos ??= fetch("datos/rios_extremos.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
// Altura de cada día de las temporadas Niño en una estación (preparar_rios_ninos.py): medida por el INA (m) o estimada con GloFAS (g)
const rioDiario = (id) => { if (!cargasRioDia.has(id)) cargasRioDia.set(id, fetch(`datos/rios_ninos/${id}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null)); return cargasRioDia.get(id); };
// Crecida máxima de toda la temporada (solo como contexto en el cuadro: el escenario usa la de los días de la tormenta)
const rioTemporada = (tp) => (SIM.hist?.est ? SIM.hist.rioTemp?.[tp] ?? null : null);
// Altura del río en los días de la tormenta de un Niño: del primer día con lluvia a 3 días después del último, porque el agua de
// la tormenta sigue bajando hacia el río y un río alto no la deja salir (inundación compuesta: Ward et al. 2018, Couasnon et al.
// 2020). Lluvia y río tienen que ser del mismo momento: si esos días no hay dato del río, no se inventa.
function rioTormenta(n) {
  const S = SIM.hist?.rioDia?.[n?.temporada], ev = n?.evento;
  if (!SIM.hist?.est || !S || !ev) return null;
  const ini = (ev.horaria?.ini ?? ev.dias[0]).slice(0, 10), fin = (ev.horaria?.fin ?? ev.dias[1]).slice(0, 10);
  let max = null, k = -1, medidos = 0, estimados = 0;
  for (let i = Math.max(0, diasEntreISO(S.d0, ini)), i1 = diasEntreISO(S.d0, fin) + DIAS_DRENAJE; i <= i1; i++) {
    const m = S.m?.[i], v = m ?? S.g?.[i];
    if (v == null) continue;
    if (m != null) medidos++; else estimados++;
    if (max == null || v > max) { max = v; k = i; }
  }
  return max == null ? null : { max: max / 100, fecha: sumarDiasISO(S.d0, k), desde: ini, hasta: sumarDiasISO(fin, DIAS_DRENAJE),
    fuente: !estimados ? "INA" : medidos ? "INA + GloFAS" : "GloFAS" };
}

// Datos del lugar que no dependen del relieve: se piden apenas se abre el simulador. La humedad de hoy (solo para «condiciones de
// hoy») no frena nada: si tarda más de 2 s, se completa cuando llega.
function pedirDatosZona(s) {
  const est = estacionCercana({ s });
  const hoy = humedadHoy(s.punto).catch(() => null);
  SIM.zona = { s, est, hoy, todo: Promise.all([historicoNino(s.punto), riosExtremos(), riosResumen(), est ? rioDiario(String(est.estacion_id)) : null,
    Promise.race([hoy, new Promise((ok) => setTimeout(() => ok(null), 2000))]),
    sueloEn(s.punto).catch(() => null).then((x) => x ?? { ...TEXTURAS.franco, nombre: "franco", supuesto: true })]) };
  return SIM.zona;
}
// Al abrir: busca los Niños en el lugar y deja las barras en las condiciones de hoy, sin lluvia (terreno seco)
async function iniciarEscenario() {
  const d = SIM.datos;
  avisoProgreso(t("sim_hist_cargando"));
  const Zp = SIM.zona?.s === d.s ? SIM.zona : pedirDatosZona(d.s), est = Zp.est;
  const [H, X, RR, RD, hoy, suelo] = await Zp.todo;
  if (SIM.datos !== d) return;
  SIM.hist = { H, est, rio: est ? X[String(est.estacion_id)] ?? null : null, rioDia: RD, rioTemp: est ? RR[String(est.estacion_id)] ?? null : null, humedadHoy: hoy, suelo, peor: null };
  if (hoy == null) Zp.hoy.then((v) => { if (SIM.hist?.H === H && v != null) SIM.hist.humedadHoy = v; });
  H?.antiguos?.then(() => { if (SIM.hist?.H === H) pintarTablaNinos(); });   // los Niños de 1951 a 1996, cuando llegan
  // Desagües: la lluvia de 1 h que el lugar recibe una vez cada 2 años (la red pluvial se diseña para 2 a 10 años)
  SIM.esc = { horas: 3, mm: 0, theta: 0.3, lagos: 0, rio: est?.h ?? 0, crecida: 0, desague: Math.round(H?.desague ?? 10), nino: null, perfil: null, forma: null };
  aplicarCondicionesHoy(false);
  // Sin lluvia: la maqueta queda seca, tal como se ve en la imagen satelital (no hay agua de hoy medida por satélite para el
  // lugar). El modelo recién calcula cuando se mueve una barra o se elige un botón
  SIM.esc.mm = 0;
  avisoProgreso("");
  pintarEscenario();
  // Con las tormentas hora por hora se conoce el peor Niño: las barras toman sus valores solas (si todavía no se tocó nada). La
  // corrida queda hecha pero la maqueta sigue seca, en la hora 0, hasta que se toca ▶
  H?.horarias?.then(() => {
    if (SIM.hist?.H !== H) return;
    pintarEscenario();
    if (!SIM.esc.tocado && (SIM.modoSim ?? "escenario") === "escenario") aplicarPeorNino(true);
  });
}
function aplicarCondicionesHoy(correr = true) {
  const E = SIM.esc, L = limitesEscenario();
  E.theta = limitar(SIM.hist.humedadHoy ?? (L.humedad.min + L.humedad.max) / 2, L.humedad.min, L.humedad.max);
  E.rio = SIM.hist.est ? limitar(SIM.hist.est.h, L.rio.min, L.rio.max) : 0;
  E.crecida = 0; E.lagos = 0; E.nino = null; E.perfil = null; E.forma = null;
  if (correr) cambiarEscenario({});
}
// Elegir un Niño: su peor tormenta, tal como cayó, con la humedad del suelo de ese momento y el río de esos mismos días
async function aplicarNino(temporada, alInicio = false) {
  const n = SIM.hist?.H?.ninos.find((x) => x.temporada === temporada);
  avisoProgreso(t("sim_bajando_tormenta"));
  await SIM.hist.H.horarias;
  const ev = await eventoHorario(SIM.hist.H, n);
  avisoProgreso("");
  if (!ev) return;
  // Todo es de ese Niño; lo que no tiene dato en esa tormenta queda en un valor supuesto y avisado, nunca el de hoy ni el de otro
  // año: humedad media del lugar en los Niños y río en su nivel mediano del registro
  const E = SIM.esc, rt = rioTormenta(n), Lh = limitesEscenario().humedad, mediana = SIM.hist.rio?.todo?.mediana;
  Object.assign(E, { nino: temporada, forma: temporada, horas: ev.dur, perfil: ev.lluvia.map((v) => v / ev.total), lagos: 0,
    theta: ev.theta ?? (Lh.min + Lh.max) / 2, ...(rt ? { rio: rt.max } : mediana != null ? { rio: mediana } : {}) });
  E.mm = Math.round(ev.total);
  // El río nunca por debajo de lo que mide hoy el INA: un escenario del peor Niño no puede quedar mejor que la situación actual
  // (por ejemplo Goya, 16-nov-2026: el Niño 2023-24 tuvo el río a 4,05 m y hoy está a 5,81 m, sobre evacuación)
  const hoyRio = SIM.hist.est?.h;
  E.rioHoy = hoyRio != null && E.rio < hoyRio;
  if (E.rioHoy) E.rio = hoyRio;
  pintarEscenario();
  simularEscenario(true);   // al abrir o al elegir otro Niño: la maqueta vuelve a la imagen de hoy (seca) y la tormenta se ve con ▶
}
function aplicarPeorNino(alInicio = false) {
  const H = SIM.hist?.H;
  if (!H?.ninos.length) return;
  const tp = calcularPeor()?.temporada;   // el que deja a más personas con agua (indiceNino)
  if (tp) aplicarNino(tp, alInicio);
}

// ---------- El peor Niño para la población, estimado con una fórmula (sin simular el agua) ----------
// Rasgos fijos del lugar (una vez), de la grilla del modelo: parte impermeable de cada celda (edificios, calles y usos urbanos),
// los bajos del terreno con el volumen que guardan y el nivel de la orilla del río (o del mar).
function rasgosLugar() {
  const h = SIM.hist, d = SIM.datos;
  if (h.lugar || !d) return h.lugar;
  const g = SIM.modelo?.g ?? grillaModelo(d);
  let sImp = 0, nImp = 0;
  for (let c = 0; c < g.N; c++) if (g.dentroC[c] && g.tipo2[c] === 1) { sImp += g.imp[c]; nImp++; }
  // Nivel del río igual que en el modelo 3D (hidraulica.js): base = lo más bajo entre su superficie y su orilla; en el nivel de
  // evacuación de la estación el agua llega a la orilla del 40 % más bajo
  let base = Infinity;
  const orillas = [];
  for (let c = 0; c < g.N; c++) if (g.tipo2[c] === 3) {
    base = Math.min(base, g.z[c]);
    const x = c % g.nx, y = (c / g.nx) | 0;
    for (const [vx, vy] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const v = vy * g.nx + vx;
      if (vx >= 0 && vy >= 0 && vx < g.nx && vy < g.ny && g.tipo2[v] === 1) { base = Math.min(base, g.z[v] - 0.05); orillas.push(g.z[v]); }
    }
  }
  orillas.sort((a, b) => a - b);
  const rio = orillas.length ? { base, bordo: orillas[Math.floor(orillas.length * 0.4)] - base } : null;
  return (h.lugar = { g, imp: nImp ? sImp / nImp : 0, rio, bajos: bajosDelLugar(g) });
}
// Bajos del terreno: se «llena» el relieve desde los bordes de la grilla y desde el agua (ríos y lagunas), siempre por el punto
// más bajo (priority-flood, Barnes, Lehman y Mulla 2014); cada hueco que queda es un bajo, que guarda agua hasta el nivel por
// donde desborda (como Safer_RAIN, Samela et al. 2020). Cada celda de tierra desagua por la máxima pendiente (D8) hacia un bajo
// o hacia afuera (río, laguna, borde). Reemplaza al factor de pendiente 1/(1 + p %), que no estaba calibrado.
const VECINOS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function bajosDelLugar(g) {
  const { nx, ny, N, z, tipo2, imp } = g, F = new Float64Array(N), listo = new Uint8Array(N);
  const hv = new Float64Array(N), hc = new Int32Array(N);   // montículo binario por altura
  let n = 0;
  const poner = (c, v) => { let i = n++; while (i > 0) { const p = (i - 1) >> 1; if (hv[p] <= v) break; hv[i] = hv[p]; hc[i] = hc[p]; i = p; } hv[i] = v; hc[i] = c; };
  const sacar = () => {
    const c = hc[0], v = hv[--n], cc = hc[n];
    let i = 0;
    for (;;) { let k = 2 * i + 1; if (k >= n) break; if (k + 1 < n && hv[k + 1] < hv[k]) k++; if (hv[k] >= v) break; hv[i] = hv[k]; hc[i] = hc[k]; i = k; }
    hv[i] = v; hc[i] = cc;
    return c;
  };
  const vecinos = (c, fn) => { const x = c % nx, y = (c / nx) | 0; for (const [ax, ay] of VECINOS8) { const vx = x + ax, vy = y + ay; if (vx >= 0 && vy >= 0 && vx < nx && vy < ny) fn(vy * nx + vx, ax, ay); } };
  for (let c = 0; c < N; c++) {
    const x = c % nx, y = (c / nx) | 0;
    if (tipo2[c] !== 1 || x === 0 || y === 0 || x === nx - 1 || y === ny - 1) { F[c] = z[c]; listo[c] = 1; poner(c, z[c]); }
  }
  while (n) { const c = sacar(); vecinos(c, (v) => { if (!listo[v]) { listo[v] = 1; F[v] = Math.max(z[v], F[c]); poner(v, F[v]); } }); }
  // Cada grupo de celdas conectadas que quedaron bajo el nivel de llenado (1 cm o más) es un bajo
  const bajo = new Int32Array(N).fill(-1), B = [];
  for (let c = 0; c < N; c++) {
    if (tipo2[c] !== 1 || bajo[c] >= 0 || F[c] - z[c] < 0.01) continue;
    const k = B.length, celdas = [c];
    bajo[c] = k;
    for (let q = 0; q < celdas.length; q++) vecinos(celdas[q], (v) => { if (tipo2[v] === 1 && bajo[v] < 0 && F[v] - z[v] >= 0.01) { bajo[v] = k; celdas.push(v); } });
    B.push({ zs: Float64Array.from(celdas, (i) => z[i]).sort(), tope: celdas.reduce((m, i) => Math.max(m, F[i]), -Infinity), perm: 0, imp: 0, nivel: 0 });
  }
  // A dónde va el agua de cada celda: −1 afuera, k el bajo k
  const destino = new Int32Array(N).fill(-2), camino = [];
  for (let c = 0; c < N; c++) destino[c] = tipo2[c] !== 1 ? -1 : bajo[c] >= 0 ? bajo[c] : -2;
  for (let c0 = 0; c0 < N; c0++) {
    let c = c0;
    while (destino[c] === -2) {
      camino.push(c);
      let mejor = -1, bajada = 0;
      vecinos(c, (v, ax, ay) => { const p = (z[c] - z[v]) / Math.hypot(ax, ay); if (p > bajada) { bajada = p; mejor = v; } });
      if (mejor < 0) { destino[c] = -1; break; }   // borde o llano sin bajada: el agua sigue de largo
      c = mejor;
    }
    for (const i of camino) destino[i] = destino[c];
    camino.length = 0;
  }
  for (let c = 0; c < N; c++) { const k = destino[c]; if (k >= 0) { B[k].imp += imp[c]; B[k].perm += 1 - imp[c]; } }
  return { bajo, B };
}
// Agua que deja una tormenta: cada bajo recibe la escorrentía de las celdas que desaguan en él y sube su nivel hasta guardarla
// (lo que no entra desborda y sale); la crecida del río entra en toda la tierra conectada al río que está por debajo de su nivel
// (como el modelo 3D en equilibrio). Un río no llega a donde hay terreno más alto en el medio, esté cerca o lejos. Validado contra
// el radar Sentinel-1 en la crecida de Concordia de nov-2023 (herramientas/validacion/validar_rio_radar.py): acierta el 76 % del
// agua vista; con un límite fijo de 1 km de ribera acertaba solo el 24 %.
// Nivel del río sobre su base (m), la misma regla del modelo 3D (hidraulica.js): en la mediana queda en el cauce, sube en proporción
// hasta la orilla del cuantil 40 % en evacuación y, por encima, metro por metro
function nivelRio(bordo, dRio, relMed) {
  return dRio >= 0 || !(relMed < 0) ? bordo + dRio : bordo * limitar((dRio - relMed) / -relMed, 0, 1);
}
const relMedRio = () => { const m = SIM.hist?.rio?.todo?.mediana, e = SIM.hist?.est; return m != null && e ? m - e.ref : null; };
function aguaEvento(L, qPerm, qImp, dRio) {
  const g = L.g, a = g.dx * g.dx, prof = new Float32Array(g.N);
  for (const b of L.bajos.B) {
    let V = ((b.perm * qPerm + b.imp * qImp) / 1000) * a, h = b.zs[0], i = 0;   // m³ que llegan al bajo
    while (V > 0 && h < b.tope) {
      const sig = Math.min(i + 1 < b.zs.length ? b.zs[i + 1] : b.tope, b.tope), cap = (sig - h) * (i + 1) * a;
      if (cap >= V) { h += V / ((i + 1) * a); break; }
      V -= cap; h = sig; i++;
    }
    b.nivel = h;
  }
  for (let c = 0; c < g.N; c++) { const k = L.bajos.bajo[c]; if (k >= 0) prof[c] = Math.max(0, L.bajos.B[k].nivel - g.z[c]); }
  const contar = () => { let p = 0, ar = 0, v = 0; for (let c = 0; c < g.N; c++) if (g.dentroC[c] && g.tipo2[c] === 1) { v += prof[c] * a; if (prof[c] >= AGUA_MIN) { p += g.pob[c]; ar += a; } } return [p, ar, v]; };
  const [personasLluvia] = contar();
  if (dRio != null && L.rio) {
    const eta = L.rio.base + nivelRio(L.rio.bordo, dRio, relMedRio()), visto = new Uint8Array(g.N), cola = [];
    for (let c = 0; c < g.N; c++) if (g.tipo2[c] === 3) { visto[c] = 1; cola.push(c); }
    for (let q = 0; q < cola.length; q++) {
      const c = cola[q], x = c % g.nx, y = (c / g.nx) | 0;
      for (const [vx, vy] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const v = vy * g.nx + vx;
        if (vx < 0 || vy < 0 || vx >= g.nx || vy >= g.ny || visto[v] || g.tipo2[v] !== 1 || g.z[v] >= eta) continue;
        visto[v] = 1; prof[v] = Math.max(prof[v], eta - g.z[v]); cola.push(v);
      }
    }
  }
  const [personas, area, vol] = contar();
  return { personas, personasLluvia, area, vol, prof };
}
// Número de Curva (SCS) del suelo del lugar con humedad media (grupo hidrológico según la textura, pastura en estado regular)
const cnTextura = (nombre = "") => (/^arcill/.test(nombre) ? 84 : /arcill/.test(nombre) ? 79 : /^arenos/.test(nombre) ? 49 : /arenos/.test(nombre) ? 61 : 69);
// Personas con agua de 10 cm o más que dejaría la peor tormenta de un Niño, con todo lo que se sabe del lugar y de la tormenta:
//  · suelo permeable: escorrentía del Número de Curva con abstracción inicial λ = 0,05 (Hawkins et al. 2002: 134 cuencas, mediana
//    0,048), Q = (P − 0,05 S)² / (P + 0,95 S), S₀,₀₅ = 1,33 · S₀,₂₀^1,15 (en pulgadas). S₀,₂₀ sale del CN de la textura llevado a
//    la humedad del suelo justo antes: humedad relativa del lugar w = (θ − θmín) / (θmáx − θmín) con su propio rango en los Niños
//    (ERA5), y S lineal con w (Brocca et al. 2009) entre el suelo seco (CN I, w = 0), medio (CN II, w = 0,5) y saturado (CN III);
//  · superficie impermeable: lo que llueve en cada hora por encima de la capacidad de los desagües;
//  · relieve: esa agua llena los bajos (bajosDelLugar);
//  · río: su altura en los días de la tormenta respecto del nivel de evacuación, en la tierra conectada al río y más baja.
function indiceNino(n) {
  const ev = n?.evento?.horaria, L = rasgosLugar(), E = SIM.esc, suelo = SIM.modelo?.suelo ?? SIM.hist.suelo, hu = SIM.hist.H?.humedad;
  if (!ev || !L) return null;
  const cn2 = cnTextura(suelo?.nombre), cn1 = (4.2 * cn2) / (10 - 0.058 * cn2), cn3 = (23 * cn2) / (10 + 0.13 * cn2), S20 = (cn) => 25400 / cn - 254;
  const w = ev.theta != null && hu && hu.max > hu.min ? limitar((ev.theta - hu.min) / (hu.max - hu.min), 0, 1) : 0.5;
  const s20 = w <= 0.5 ? S20(cn1) + (S20(cn2) - S20(cn1)) * (w / 0.5) : S20(cn2) + (S20(cn3) - S20(cn2)) * ((w - 0.5) / 0.5);
  const S = 25.4 * 1.33 * (s20 / 25.4) ** 1.15, P = ev.total, qPerm = P > 0.05 * S ? (P - 0.05 * S) ** 2 / (P + 0.95 * S) : 0;
  const qImp = ev.lluvia.reduce((a, v) => a + Math.max(0, v - E.desague), 0);
  const rt = rioTormenta(n), dRio = rt ? rt.max - SIM.hist.est.ref : null;
  return { ...aguaEvento(L, qPerm, qImp, dRio), qPerm, qImp, cn: 25400 / (s20 + 254), w, rio: rt };
}
function calcularPeor() {
  const H = SIM.hist?.H;
  if (!H?.ninos.length || !SIM.datos) return null;
  let peor = null;
  for (const n of H.ninos.filter((x) => x.completo)) {
    const ix = (n.indice = indiceNino(n));
    if (ix && (!peor || ix.personas > peor.personas || (ix.personas === peor.personas && ix.vol > peor.vol))) peor = { temporada: n.temporada, ...ix };
  }
  return (SIM.hist.peor = peor);
}

// Opciones del selector y la línea del peor (se actualizan sin rearmar las barras)
function opcionesNino() {
  const H = SIM.hist?.H, E = SIM.esc, peor = SIM.hist?.peor?.temporada;
  if (!H?.ninos.length) return "";
  const fecha = (iso) => new Date(`${iso}T12:00:00-03:00`).toLocaleDateString(loc(), { day: "numeric", month: "short", year: "numeric" });
  // Mientras no se elige nada, el desplegable invita a elegir (el Niño cargado se dice abajo, en la línea del peor)
  return `<option value="">${E.tocado ? t(E.forma && !E.nino ? "sim_nino_forma" : "sim_nino_propio")(E.forma ?? "") : t("sim_nino_elegir")}</option>` + H.ninos.filter((x) => x.completo).reverse().map((n) => {
    const ev = n.evento, rt = rioTormenta(n), rio = SIM.hist.est ? ` · ${rt ? t("sim_rio_tormenta_c")(fmt(rt.max, 2), rt.max >= SIM.hist.est.ref) : t("sim_rio_sin_dato_c")}` : "";
    const txt = ev ? `${n.temporada} · ${t(`int_${n.intensidad}`)} · ${t("sim_mm_en_3d")(fmt(ev.horaria?.total ?? ev.total))} · ${fecha(ev.dias[0])}${rio}` : `${n.temporada} · ${t("sin_dato")}`;
    return `<option value="${n.temporada}"${E.tocado && E.nino === n.temporada ? " selected" : ""}${ev ? "" : " disabled"}${n.temporada === peor ? ' class="peor"' : ""}>${n.temporada === peor ? "▲ " : ""}${txt}</option>`;
  }).join("");
}
function pintarPeorLinea() {
  const el = document.getElementById("esc-peor-linea"), sel = document.getElementById("esc-nino");
  if (!el) return;
  const h = SIM.hist;
  calcularPeor();   // depende también de la barra de desagües
  const p = h?.peor;
  el.innerHTML = h && !h.H ? t("sim_peor_sin_datos") : !h?.H?.horariasListas ? t("sim_peor_estimando") : !p ? "" : p.personas >= 1 ? t("sim_peor_res")(p.temporada, fmtPersonas(p.personas), fmt(p.area / 1e4)) : t("sim_peor_res0")(p.temporada);
  el.dataset.ayuda = t("sim_peor_ayuda");
  el.classList.toggle("listo", !!p);
  el.classList.toggle("estimando", !!h?.H && !h.H.horariasListas);
  actualizarCarga();
  if (sel) sel.innerHTML = opcionesNino();
}

// Límites de cada barra y de dónde salen
function limitesEscenario() {
  const Hh = SIM.hist, E = SIM.esc;
  if (!Hh || !E) return null;
  const H = Hh.H, ts = SIM.modelo?.suelo?.thetaS ?? 0.46;
  const ll = H?.lluvia?.[E.horas], ev = E.nino ? H.ninos.find((n) => n.temporada === E.nino)?.evento?.horaria : null;
  const lluvia = ll?.max > 0 ? { max: Math.max(5, Math.ceil(ll.max), ev ? Math.ceil(ev.total) : 0), fuente: ev ? t(ev.formaSupuesta ? "sim_r_evento_forma" : "sim_r_evento")(E.nino) : t("sim_r_nino")(ll.temporada) } : { max: 300, fuente: t("sim_r_supuesto") };
  const hu = H?.humedad;
  const humedad = hu ? { min: Math.min(hu.min, ts - 0.02), max: Math.min(hu.max, ts),
    fuente: ev ? (ev.theta != null ? t("sim_r_humedad_antes")(E.nino) : t("sim_r_supuesto_medio")) : t("sim_r_nino_todas")(H.temporadas) }
    : { min: 0.1, max: ts, fuente: t("sim_r_supuesto") };
  const R = Hh.rio, e = Hh.est, nino = E.nino ? H.ninos.find((n) => n.temporada === E.nino) : null, rt = nino ? rioTormenta(nino) : null;
  const altos = H?.ninos.filter((n) => n.completo).map((n) => rioTormenta(n)?.max).filter((v) => v != null) ?? [];
  let rio;
  if (e && (R || altos.length)) {
    const r = R ? R.nino ?? R.todo : { min: Math.min(...altos), max: Math.max(...altos) };
    rio = { min: Math.min(r.min, e.h, ...altos), max: Math.max(r.max, e.h, ...altos), estacion: e,
      fuente: ev ? (rt ? t("sim_r_rio_tormenta")(rt.fecha.split("-").reverse().join("-"), rt.fuente) : t("sim_rio_sin_dato_tormenta"))
        : R?.nino ? t("sim_r_nino")(R.nino.temporada_max) : R ? t("sim_r_registro")(R.todo.desde.slice(0, 4)) : t("sim_r_nino_todas")() };
  } else rio = { min: -1, max: 6, fuente: t("sim_r_supuesto"), estacion: null };
  return { lluvia, humedad, rio, horas: { fuente: ev ? t("sim_r_evento")(E.nino) : E.forma ? t("sim_nino_forma")(E.forma) : "" },
    lagos: { min: -1.5, max: 0, fuente: t("sim_r_supuesto") }, desague: { min: 0, max: 30, fuente: H?.desague ? t("sim_r_desague")(fmt(H.desague)) : t("sim_r_supuesto") } };
}

// Barras del escenario (en la cabeza de la lámina 02)
function pintarEscenario() {
  const cont = document.getElementById("sim-esc"), L = limitesEscenario(), E = SIM.esc;
  if (!cont) return;
  SIM.kpisEl?.remove();   // se vuelve a colocar después de rearmar las barras
  if (!L) { cont.innerHTML = `<p class="sim-hint">${t("sim_hist_cargando")}</p>`; return; }
  // Cada valor dentro de su barra (por ejemplo, al saber la porosidad del suelo del lugar o al cambiar la duración)
  E.mm = limitar(E.mm, 0, L.lluvia.max); E.theta = limitar(E.theta, L.humedad.min, L.humedad.max); E.lagos = limitar(E.lagos, L.lagos.min, L.lagos.max);
  E.rio = limitar(E.rio, L.rio.min, L.rio.max); E.crecida = limitar(E.crecida, L.rio.min, L.rio.max); E.desague = limitar(E.desague, L.desague.min, L.desague.max);
  const g = SIM.modelo?.g, hayLagos = !g || g.nLagos > 0, hayRio = !g || g.tipo2.some((v) => v === 3) || !!L.rio.estacion;
  const sat = (v) => Math.round((100 * v) / (SIM.modelo?.suelo?.thetaS ?? 0.46));
  const texto = (k, v) => k === "mm" ? `${fmt(v)} mm` : k === "horas" ? `${fmt(v)} h` : k === "theta" ? t("sim_v_humedad")(sat(v)) : k === "lagos" ? (v === 0 ? t("sim_r_llenas") : t("sim_v_lagos")(fmt(-v, 1)))
    : k === "rio" ? `${fmt(v, 2)} m <small>${t("sim_v_evac")(fmt(L.rio.estacion.ref, 2))}</small>` : k === "crecida" ? `${v > 0 ? "+" : ""}${fmt(v, 2)} m` : `${fmt(v)} mm/h`;
  const fila = (k, etq, v, min, max, paso, extremos, fuente) => `<div class="esc-fila" data-k="${k}">
      <div class="esc-cab"><span class="etq">${etq}${infoIcono(`sim_b_${k}`, t(`info_b_${k}`))}</span><b class="esc-v">${texto(k, v)}</b></div>
      <input type="range" min="${min}" max="${max}" step="${paso}" value="${v}" aria-label="${etq}">
      <div class="esc-pie"><span>${extremos[0]}</span><span class="esc-fuente">${fuente}</span><span>${extremos[1]}</span></div></div>`;
  cont.innerHTML = `${SIM.modelo?.alInicio && E.nino && !E.tocado ? `<p class="sim-hint">${t("sim_peor_cargado")(E.nino)}</p>` : SIM.modelo?.escenario ? "" : `<p class="sim-hint">${t("sim_seco_inicio")}</p>`}
    <div class="esc-nino"><span class="etq">${t("sim_f_nino")}${infoIcono("sim_nino", t("sim_peor_ayuda"))}</span><select id="esc-nino" aria-label="${t("sim_f_nino")}">${opcionesNino()}</select>
      <p class="esc-peor" id="esc-peor-linea"></p></div>
    <div id="sim-kpis-lugar"></div>
    ${fila("mm", t("sim_f_lluvia"), E.mm, 0, L.lluvia.max, 1, ["0", `${fmt(L.lluvia.max)} mm`], L.lluvia.fuente)}
    ${fila("horas", t("sim_f_dur"), E.horas, 1, DUR_MAX, 1, ["1 h", `${DUR_MAX} h`], L.horas.fuente)}
    ${fila("theta", t("sim_f_humedad"), E.theta, L.humedad.min.toFixed(3), L.humedad.max.toFixed(3), 0.005, [t("sim_r_seco"), t("sim_r_saturado")], L.humedad.fuente)}
    ${hayLagos ? fila("lagos", t("sim_f_lagunas"), E.lagos, L.lagos.min, L.lagos.max, 0.1, [t("sim_r_bajas"), t("sim_r_llenas")], L.lagos.fuente) : ""}
    ${hayRio ? (L.rio.estacion
      ? fila("rio", t("sim_f_rio_en")(L.rio.estacion.estacion), E.rio, L.rio.min, L.rio.max, 0.05, [`${fmt(L.rio.min, 2)} m`, `${fmt(L.rio.max, 2)} m`], E.rioHoy ? t("sim_rio_hoy") : L.rio.fuente)
      : fila("crecida", t("sim_f_rio"), E.crecida, L.rio.min, L.rio.max, 0.25, [`${fmt(L.rio.min)} m`, `+${fmt(L.rio.max)} m`], L.rio.fuente)) : ""}
    ${fila("desague", t("sim_f_desague"), E.desague, L.desague.min, L.desague.max, 1, [t("sim_r_tapados"), "30 mm/h"], L.desague.fuente)}`;
  enlazarInfo(cont);
  if (SIM.kpisEl && (SIM.modoSim ?? "escenario") === "escenario") document.getElementById("sim-kpis-lugar")?.replaceWith(SIM.kpisEl);
  cont.querySelectorAll(".esc-fila").forEach((f) => {
    const k = f.dataset.k, inp = f.querySelector("input");
    inp.oninput = () => { f.querySelector(".esc-v").innerHTML = texto(k, Number(inp.value)); };   // al mover: solo el número
    inp.onchange = () => { E.tocado = true; cambiarEscenario({ [k]: Number(inp.value) }); };   // al soltar: se calcula de nuevo
  });
  document.getElementById("esc-nino").onchange = (e) => { E.tocado = true; if (e.target.value) aplicarNino(e.target.value); };
  pintarPeorLinea();
  pintarTablaNinos();
}

// Cuadro informativo al pie del simulador: los 27 Niños desde 1951, con su peor tormenta, el río de esos días y las personas con
// agua estimadas; solo los de datos completos (desde 1997-98) se usan en el selector y en el cálculo del peor
function pintarTablaNinos() {
  const cont = document.getElementById("sim-ninos"), H = SIM.hist?.H;
  if (!cont) return;
  if (!H?.ninos.length) { cont.innerHTML = ""; return; }
  const total = (n) => n.evento?.horaria?.total ?? n.evento?.total ?? 0, max = Math.max(...H.ninos.map(total)), peor = SIM.hist.peor?.temporada;
  const datos = (n) => (n.evento?.fuente === "imerg" ? t("sim_tabla_completo") : n.completo ? t("sim_tabla_sin_imerg") : n.anio >= 1979 ? t("sim_tabla_sin_rio") : t("sim_tabla_sin_sat"));
  const ayuda = (ev) => (ev?.fuente === "imerg" ? ` title="${t("sim_tabla_fuentes")(fmt(ev.imerg), fmt(ev.era5))}"` : "");
  cont.innerHTML = `<h3 class="sim-h3">${t("sim_tabla_t")}</h3><p class="sim-periodo-nota">${t("sim_tabla_sub")}</p>
    <div class="tabla-ninos"><table><thead><tr><th>${t("sim_f_nino")}</th><th>${t("sim_tabla_int")}</th><th>${t("sim_tabla_lluvia")}</th><th>${t("sim_tabla_rio")}</th><th>${t("sim_tabla_pers")}</th><th>${t("sim_tabla_datos")}</th></tr></thead><tbody>
    ${[...H.ninos].reverse().map((n) => { const ev = n.evento, rt = n.completo ? rioTormenta(n) : null, ix = n.completo ? n.indice : null;
      return `<tr class="${n.completo ? "" : "incompleto"}${n.temporada === peor ? " peor" : ""}"><td>${n.temporada === peor ? "▲ " : ""}${n.temporada}</td><td>${t(`int_${n.intensidad}`)}</td>
        <td${ayuda(ev)}><span class="barrita"><i style="width:${ev ? (100 * total(n) / max).toFixed(0) : 0}%"></i></span>${ev ? `${fmt(total(n))} mm` : "–"}</td>
        <td>${!SIM.hist.est || !n.completo ? "–" : rt ? `${fmt(rt.max, 2)} m${rt.max >= SIM.hist.est.ref ? ` · ${t("sim_evac_corto")}` : ""}` : t("sim_rio_sin_dato_c")}</td>
        <td>${ix ? fmtPersonas(ix.personas) : "–"}</td><td>${datos(n)}</td></tr>`; }).join("")}
    </tbody></table></div>`;
}

// Resultado de la validación contra el satélite (herramientas/validacion/validar.py); null si todavía no existe
let cargaValidacion = null;
const validacion = () => (cargaValidacion ??= fetch("datos/validacion.json").then((r) => (r.ok ? r.json() : null)).catch(() => null));

function abrirSimulador() {
  const s = estado.sel;
  if (s?.tipo !== "punto") return;
  SIM.tormenta = { mm: 0, horas: 3 }; SIM.esc = null; SIM.hist = null; SIM.modoSim = "escenario"; SIM.modelosModo = {}; SIM.pron = null;   // el escenario se arma al terminar de preparar el lugar (iniciarEscenario)
  validacion().then((V) => { SIM.validacion = V; pintarValidez(); });
  const caja = document.getElementById("sim");
  caja.hidden = false;
  SIM.clave = JSON.stringify([s.punto, s.km]);
  mostrarLamina(2);   // el simulador ocupa la lámina 02
  document.querySelector(".sim-mapa-marco").classList.add("sim-armando");   // el mapa con relieve queda oculto: se ve directo la maqueta 3D cuando está lista
  document.getElementById("sim-titulo").textContent = s.nombre ?? t("punto_en_mapa");
  document.getElementById("sim-sub").textContent = `${t("sel_circulo")(s.km)} · ${estado.porCmu.get(s.cmu)?.nam ?? ""}`;
  document.getElementById("sim-cerrar").onclick = salirSimulador;
  caja.onkeydown = (e) => { if (e.key === "Escape") salirSimulador(); };
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

// Tramos de radio: hasta 1,5 km, celdas de ~32 m (relieve z 14); hasta 3 km, ~64 m (z 13); hasta 6 km, ~128 m (z 12); y así.
// Dentro de un tramo, la grilla es la misma para cualquier radio (las lagunas coinciden); entre tramos, cada celda gruesa es
// exactamente 2 × 2 de las finas (grillas encajadas). El cálculo queda en ~80-125 celdas por lado: unos segundos.
const tramoRadio = (km) => Math.max(0, Math.ceil(Math.log2(km / 1.5) - 1e-9));
async function relieveDe(caja, km) {
  const [x0, y0, x1, y1] = caja;
  let z = Math.max(9, 14 - tramoRadio(km));   // solo si igual hacen falta más de 8 × 8 teselas, baja otro zoom
  while (z > 9 && (Math.floor(xDeLon(x1, z)) - Math.floor(xDeLon(x0, z)) > 7 || Math.floor(yDeLat(y0, z)) - Math.floor(yDeLat(y1, z)) > 7)) z--;
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
  pedirDatosZona(s);   // Niños, ríos, humedad y suelo del lugar: en paralelo con el relieve
  const [D] = await Promise.all([relieveDe(cajaCirculo(s.punto, s.km * 1.25), s.km), cargarRadiosEn(cajaCirculo(s.punto, s.km)), mapaListo]);
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
  iniciarEscenario();   // al abrir: condiciones de hoy y sin lluvia (la maqueta queda seca, como en la imagen satelital)
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
function avisoProgreso(txt) { const p = document.getElementById("sim-progreso"); if (p) { p.textContent = txt; p.hidden = !txt; } actualizarCarga(); }
// Cartel arriba de la maqueta mientras algo tarda: el aviso de progreso del panel o la estimación del peor Niño
function actualizarCarga() {
  const el = document.getElementById("sim-carga");
  if (!el) return;
  const p = document.getElementById("sim-progreso"), cargando = document.getElementById("sim-estado")?.textContent;
  const txt = cargando ? "" : p && !p.hidden && p.textContent ? p.textContent : SIM.hist?.H && !SIM.hist.H.horariasListas ? t("sim_peor_estimando") : "";
  el.textContent = txt; el.hidden = !txt;
}

// Reparto de una tormenta de prueba hora a hora: 3 h con picos al comienzo (40-40-20 %), el resto parejo
const repartoTormenta = (h) => (h === 3 ? [0.4, 0.4, 0.2] : Array(h).fill(1 / h));
// Corrida del escenario: 2 horas secas, la tormenta elegida y 36 horas más para que el agua escurra y se junte. Arranca con la
// humedad del suelo, las lagunas y el río de las barras (no con la lluvia real de los días anteriores).
// alInicio: la maqueta queda seca (la imagen satelital de hoy) mientras calcula y al terminar, hasta que se toca ▶
async function simularEscenario(alInicio = false) {
  const d = SIM.datos, E = SIM.esc;
  if (!d || !E) return;
  detenerAnimaciones();
  SIM.modelo?.worker?.terminate();
  const tor = { mm: E.mm, horas: E.horas }, suelo0 = SIM.modelo?.suelo ?? SIM.hist?.suelo;
  SIM.tormenta = { ...tor }; SIM.desague = E.desague;
  const M = (SIM.modelo = { frames: [], lagos: [], stats: [], hora: 0, corriendo: true, siguiendo: true, hasta: null, tormenta: tor, corto: true, escenario: true, suelo: suelo0, alInicio });
  bloquearControles(true);
  avisoProgreso(t("sim_calculando_esc"));
  const n = 2 + E.horas + 36, t0 = Math.floor(Date.now() / 3600e3) * 3600e3, et0 = SIM.hist?.H?.et0h ?? 0.15;
  const met = { horas: Array.from({ length: n }, (_, k) => t0 + k * 3600e3), lluvia: new Array(n).fill(0), et0: new Array(n).fill(et0), tipo: new Array(n).fill(2), theta0: E.theta };
  (E.perfil?.length === E.horas ? E.perfil : repartoTormenta(E.horas)).forEach((f, j) => { met.lluvia[2 + j] = E.mm * f; });   // la tormenta real (o su forma) o pareja
  M.hoy = 0;
  const g = grillaModelo(d);   // celdas de ~30 m, las mismas para cualquier radio (el agua se dibuja sobre el relieve fino)
  await prepararCorrida(M, d, g, met);
  if (SIM.modelo !== M) return;
  if (alInicio) {   // sin las lagunas de la corrida anterior: se vuelve enseguida a la maqueta seca
    M.seco = true; M.vacio = new Uint16Array(g.N);
    if (SIM.vista === "maqueta") { SIM.mapaSucio = true; actualizarMaqueta(true); } else dibujarAgua();
  }
  pintarEscenario();   // con el suelo y la grilla del lugar ya se sabe dónde se satura y si hay lagunas o río en el círculo
  const w = (M.worker = new Worker("hidraulica.js"));
  w.onmessage = (e) => recibirHora(M, e.data);
  w.onerror = (e) => { avisoProgreso(t("sim_error")); console.error(e); };
  const est = M.estacion && SIM.hist?.est ? M.estacion : null;
  w.postMessage({ tipo: "iniciar", nx: g.nx, ny: g.ny, dx: g.dx, z: g.z, tipo2: g.tipo2, lago: g.lago, nMan: g.nMan, imp: g.imp,
    suelo: M.suelo, theta0: E.theta, desague: E.desague, crecida: est ? 0 : E.crecida, lagoOffset: E.lagos,
    lluvia: Float32Array.from(met.lluvia), et0: Float32Array.from(met.et0),
    ...(est ? { relEvac: new Float32Array(n).fill(E.rio - est.ref), relMed: relMedRio() } : {}) });
  pintarLineaSim();
}

// Lo que comparten el escenario y el período con pronóstico: grilla, centros de salud, suelo del lugar y estación del río
async function prepararCorrida(M, d, g, met) {
  g.celdaFina = new Int32Array(d.D.W * d.D.H);
  for (let i = 0; i < g.celdaFina.length; i++) g.celdaFina[i] = g.celdaDe(i);
  g.nDentro = g.dentroC.reduce((a, b) => a + b, 0);
  g.nRuta = 0;
  for (let c = 0; c < g.N; c++) if (g.ruta[c] === 1 && g.dentroC[c]) g.nRuta++;
  M.met = met; M.g = g;
  const D = d.D, celdaPunto = ([lo, la]) => { const x = Math.floor((xDeLon(lo, D.z) - D.tx0) * 256), y = Math.floor((yDeLat(la, D.z) - D.ty0) * 256);
    return x >= 0 && y >= 0 && x < D.W && y < D.H ? g.celdaDe(y * D.W + x) : -1; };
  M.salud = ((await infraCriticaLista()) ?? []).filter((x) => x.g === "salud" && distanciaKm(d.s.punto, x.p) <= d.s.km)
    .map((x) => ({ n: x.n, c: celdaPunto(x.p) })).filter((x) => x.c >= 0);
  M.suelo ??= (await sueloEn(d.s.punto).catch(() => null)) ?? { ...TEXTURAS.franco, nombre: "franco", supuesto: true };
  M.estacion = estacionCercana(d);
}

function recibirHora(M, m) {
  if (SIM.modelo !== M) return;
  if (m.tipo === "hora") {
    const f = new Uint16Array(m.h.length);
    for (let i = 0; i < f.length; i++) f[i] = Math.min(65535, Math.round(m.h[i] * 1000));
    M.frames.push(f); M.lagos.push(Float32Array.from(m.lagos)); M.stats.push(estadisticaHora(M, m.h));
    const dia = Math.floor(m.k / 24) + 1, total = Math.ceil(m.horas / 24);
    avisoProgreso(M.escenario ? t("sim_calculando_esc_h")(m.k + 1, m.horas) : t("sim_calculando")(dia, total, t(`sim_tipo_${TIPO_DATO[M.met.tipo[m.k]]}`)));
    if (m.k % 6 === 0) pintarLineaSim();   // mientras calcula no se anima nada: se muestra el resultado al terminar
  } else if (m.tipo === "fin") {
    M.corriendo = false; M.cuenta = m.cuenta;
    // Al terminar: la hora con más agua desde hoy
    let pico = M.hoy;
    for (let k = M.hoy; k < M.stats.length; k++) if (M.stats[k].pct > M.stats[pico].pct) pico = k;
    M.pico = pico; M.hora = M.alInicio || M.verHoy ? M.hoy : pico; M.siguiendo = false; M.seco = !!M.alInicio;   // peor Niño al abrir: seco hasta ▶; pronóstico: hoy
    avisoProgreso("");
    bloquearControles(false);
    const hint = document.getElementById("sim-hint");
    if (hint) hint.hidden = !(M.stats[pico].pct < 0.05 && !(M.tormenta?.mm > 0));
    mostrarHora();
  }
}

function estadisticaHora(M, h) {
  const g = M.g;
  let n = 0, maxP = 0, pers = 0, cortes = 0, n3 = 0, act = 0;
  for (let c = 0; c < g.N; c++) {
    if (!g.dentroC[c] || g.tipo2[c] !== 1) continue;
    if (h[c] >= 0.003) n3++;
    const p = h[c] - g.cauce[c];   // el agua dentro de un arroyo o canal no es inundación
    if (p >= AGUA_MIN) { n++; pers += g.pob[c]; act += g.act?.[c] ?? 0; }
    if (p > maxP) maxP = p;
    if (g.ruta[c] === 1 && p >= CORTE) cortes++;
  }
  return { pct: (100 * n) / Math.max(1, g.nDentro), km2: (n * g.dx * g.dx) / 1e6, maxProf: maxP, personas: pers, cortesKm: (cortes * g.dx) / 1000, pct3: (100 * n3) / Math.max(1, g.nDentro),
    actHa: (act * g.dx * g.dx) / 1e4 };
}

// Profundidad del agua en un píxel del relieve: el nivel del agua de su celda del modelo contra la altura fina del píxel
// (así el borde del agua sigue el terreno con más detalle que la celda)
// Fotograma que se ve: entre dos horas calculadas se mezcla el agua (Mo.frac de 0 a 1) para que la reproducción en cámara lenta sea continua
// Con el peor Niño cargado solo al abrir, la maqueta se ve seca (como la imagen satelital) hasta que se toca ▶ o la línea de
// tiempo: el río del modelo ya mueve agua desde la primera hora y no tiene que aparecer antes de que se pida ver la tormenta
const seco = (M) => (M.vacio ??= new Uint16Array(M.frames[0].length));
const STAT_SECO = { pct: 0, km2: 0, maxProf: 0, personas: 0, cortesKm: 0, pct3: 0, actHa: 0 };
const statHora = (M, k = M.hora) => (M.seco ? STAT_SECO : M.stats[k]);
function frameVista(M) {
  if (M.seco) return seco(M);
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
  if (g.tipo2[c] === 2) { const sube = M.seco ? 0 : M.lagos[M.hora]?.[g.lago[c]] ?? 0; return sube > 0.05 ? sube : 0; }
  if (g.tipo2[c] !== 1) return 0;
  // Nivel del agua interpolado entre los centros de las 4 celdas vecinas (no un bloque por celda): el borde del charco sigue el
  // relieve fino y se redondea en vez de verse en escalones de 30-120 m. Hacia las celdas secas el agua se afina hasta 0.
  const F = frameVista(M), W = d.D.W, fx = ((i % W) - g.bx0) / g.f - 0.5, fy = (((i / W) | 0) - g.by0) / g.f - 0.5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  let sl = 0, sw = 0, hMax = 0;
  for (let k = 0; k < 4; k++) {
    const x = x0 + (k & 1), y = y0 + (k >> 1);
    if (x < 0 || y < 0 || x >= g.nx || y >= g.ny) continue;
    const v = y * g.nx + x, w = (k & 1 ? tx : 1 - tx) * (k >> 1 ? ty : 1 - ty);
    if (g.tipo2[v] !== 1 || w <= 0) continue;
    const h = F[v] / 1000;
    if (h < 0.01) continue;
    sl += w * (g.z[v] + h); sw += w; if (h > hMax) hMax = h;
  }
  if (sw < 0.2) return 0;
  const zf = Number.isFinite(d.hs[i]) ? d.hs[i] : g.z[c], borde = Math.min(1, (sw - 0.2) / 0.5);
  return Math.max(0, Math.min(sl / sw - zf, hMax * 3)) * borde;
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
function accesoHora(M, F = frameVista(M)) {
  const g = M.g;
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
// (según el CSI validado en esa ciudad; sin validación: baja)

function mostrarHora() {
  if (!SIM.datos || !SIM.modelo?.frames.length) return;
  actualizarNumeros();
  pintarLineaSim();
  if (SIM.vista === "maqueta") { SIM.mapaSucio = true; actualizarMaqueta(); } else dibujarAgua();
}

// Línea de tiempo: arriba la lluvia de cada día (gris = dato real, cian = pronóstico, violeta = escenario estacional);
// abajo, el % del círculo con agua de 10 cm o más; la marca es la hora que se ve; se puede tocar para ir a otra hora.
// Curva suave que no se pasa de los puntos (interpolación monótona de Fritsch-Carlson): no inventa picos ni valores negativos
function trazoSuave(P) {
  const n = P.length;
  if (n < 2) return n ? `M${P[0][0]},${P[0][1]}` : "";
  const dx = [], m = [], tg = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = P[i + 1][0] - P[i][0]; m[i] = (P[i + 1][1] - P[i][1]) / (dx[i] || 1); }
  tg[0] = m[0]; tg[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) tg[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { tg[i] = tg[i + 1] = 0; continue; }
    const a = tg[i] / m[i], b = tg[i + 1] / m[i], h = Math.hypot(a, b);
    if (h > 3) { tg[i] = (3 * a * m[i]) / h; tg[i + 1] = (3 * b * m[i]) / h; }
  }
  let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) d += `C${(P[i][0] + dx[i] / 3).toFixed(1)},${(P[i][1] + (tg[i] * dx[i]) / 3).toFixed(1)} ${(P[i + 1][0] - dx[i] / 3).toFixed(1)},${(P[i + 1][1] - (tg[i + 1] * dx[i]) / 3).toFixed(1)} ${P[i + 1][0].toFixed(1)},${P[i + 1][1].toFixed(1)}`;
  return d;
}

// Línea de tiempo en áreas suaves: celeste = lluvia (mm por día), azul = superficie con agua (% del círculo). Lo ya simulado va
// con color pleno y lo que falta, más claro; el globo marca la hora que se ve. Una franja sobre el eje indica si la lluvia
// es dato real (gris), pronóstico (cian) o escenario estacional (violeta). Se puede tocar o arrastrar para ir a otra hora.
function pintarLineaSim() {
  const cont = document.getElementById("sim-linea"), M = SIM.modelo;
  if (!cont || !M?.met) return;
  const met = M.met, n = met.horas.length, k0 = M.hoy, ancho = Math.max(240, cont.clientWidth), alto = 206, iz = 54, de = 38, yB = 150, hB = 100;
  const x = (k) => iz + (Math.max(0, k - k0) / Math.max(1, n - 1 - k0)) * (ancho - iz - de);   // el eje arranca ahora: lo pasado no se muestra
  const art = (k) => new Date(met.horas[k] - 3 * 3600e3), ci = estado.idioma === "en" ? "en-GB" : "es-AR";
  const porDia = ((n - k0) / 24) <= 14, bloque = porDia ? 6 : 24;
  // Lluvia por bloque (6 h en períodos cortos, un día en los largos), llevada a mm por día para leerla con el mismo eje
  const lluv = [];
  for (let k = k0; k < n; k += bloque) { let sum = 0; const f = Math.min(n, k + bloque); for (let j = k; j < f; j++) sum += met.lluvia[j]; lluv.push([k + (f - k) / 2, (sum * 24) / (f - k), met.tipo[k]]); }
  const maxL = Math.max(10, ...lluv.map((v) => v[1])), maxP = Math.max(1, ...M.stats.map((s) => s.pct));
  const yL = (v) => yB - (v / maxL) * hB, yP = (v) => yB - (v / maxP) * hB;
  const paso = Math.max(1, Math.ceil((n - k0) / 140)), agua = [];
  for (let k = k0; k < n; k += paso) agua.push([x(k), yP(M.stats[k]?.pct ?? 0)]);
  if (agua.length && agua.at(-1)[0] < x(n - 1) - 1) agua.push([x(n - 1), yP(M.stats[n - 1]?.pct ?? 0)]);
  const lluvPts = [[x(k0), yL(lluv[0]?.[1] ?? 0)], ...lluv.map(([k, v]) => [x(k), yL(v)]), [x(n - 1), yL(lluv.at(-1)?.[1] ?? 0)]];
  const area = (P) => `${trazoSuave(P)}L${P.at(-1)[0].toFixed(1)},${yB}L${P[0][0].toFixed(1)},${yB}Z`;
  const dL = area(lluvPts), dP = area(agua), tL = trazoSuave(lluvPts), tP = trazoSuave(agua);
  const xh = x(M.hora), xf = x(M.frames.length - 1);
  // Franja de tipo de dato sobre el eje
  const franja = lluv.map(([k, , tp]) => `<rect x="${x(k - bloque / 2 < k0 ? k0 : k - bloque / 2).toFixed(1)}" y="${yB}" width="${Math.max(1, x(Math.min(n - 1, k + bloque / 2)) - x(Math.max(k0, k - bloque / 2)) + 0.5).toFixed(1)}" height="3" fill="${COLOR_TIPO[tp]}"/>`).join("");
  // Eje: marcas por día (o por lunes si el período es largo); día en grande y mes abajo; el de la hora que se ve, resaltado
  const lunes = [];
  for (let k = k0; k < n; k++) if (art(k).getUTCDay() === 1 && art(k).getUTCHours() === 0) lunes.push(k);
  const marcas = porDia ? Array.from({ length: Math.floor((n - k0) / 24) + 1 }, (_, d) => Math.min(n - 1, k0 + d * 24 + (24 - art(k0).getUTCHours()) % 24)) : lunes;
  const sep = Math.max(1, Math.ceil(34 / Math.max(1, x(Math.min(n - 1, 24 * (porDia ? 1 : 7))) - x(0))));
  const mes = (k) => art(k).toLocaleString(ci, { month: "short", timeZone: "UTC" }).replace(".", "");
  const etiqueta = (k, fuerte) => `<text x="${x(k)}" y="${yB + 20}" class="sim-eje-dia${fuerte ? " fuerte" : ""}" text-anchor="middle">${art(k).getUTCDate()}</text><text x="${x(k)}" y="${yB + 31}" class="sim-eje-mes${fuerte ? " fuerte" : ""}" text-anchor="middle">${mes(k)}</text>`;
  const eje = marcas.map((k, i) => `<line x1="${x(k)}" x2="${x(k)}" y1="${yB + 4}" y2="${yB + 9}" class="sim-tick"/>${i % sep === 0 && Math.abs(x(k) - xh) > 20 ? etiqueta(k, false) : ""}`).join("");
  const R = statHora(M) ?? { pct: 0 }, yD = yP(R.pct);   // al empezar todavía no hay horas calculadas
  const txt = `${fmt(R.pct, R.pct < 10 ? 1 : 0)} %`, bw = Math.max(46, txt.length * 8 + 16), bx = limitar(xh, iz + bw / 2, ancho - de - bw / 2), by = Math.max(14, yD - 36);
  const globo = `<line x1="${xh}" x2="${xh}" y1="${yD}" y2="${yB + 9}" class="sim-marca"/>
    <g class="sim-globo"><rect x="${bx - bw / 2}" y="${by}" width="${bw}" height="24" rx="6"/><path d="M${xh - 5},${by + 24}L${xh},${by + 30}L${xh + 5},${by + 24}Z"/><text x="${bx}" y="${by + 16}" text-anchor="middle">${txt}</text></g>
    <circle cx="${xh}" cy="${yD}" r="4.5" class="sim-punto"/>${etiqueta(M.hora, true)}`;
  const hito = (k, texto) => (k > k0 && k < n ? `<line x1="${x(k)}" x2="${x(k)}" y1="${yB - hB}" y2="${yB}" class="sim-hito"/><text x="${x(k) + 3}" y="${yB - hB + 10}" class="sim-hito-txt"${k > n * 0.8 ? ` text-anchor="end" dx="-6"` : ""}>${texto}</text>` : "");
  const finPron = met.tipo.indexOf(2);
  const ejes = `<text x="${iz - 4}" y="${yB + 3}" class="sim-tick-txt" text-anchor="end">0</text><text x="${iz - 4}" y="${yB - hB + 8}" class="sim-tick-txt" text-anchor="end">${fmt(maxL, maxL < 10 ? 1 : 0)} mm</text>
    <text x="${ancho - de + 4}" y="${yB + 3}" class="sim-tick-txt sim-tick-der">0</text><text x="${ancho - de + 4}" y="${yB - hB + 8}" class="sim-tick-txt sim-tick-der">${fmt(maxP, maxP < 10 ? 1 : 0)} %</text>
    <text x="${iz}" y="10" class="sim-eje-tit">${t("sim_eje_mm")}</text><text x="${ancho - de}" y="10" class="sim-eje-tit sim-tick-der" text-anchor="end">${t("sim_eje_pct")}</text>`;
  const capa = (cls) => `<path d="${dL}" class="sim-ar-lluvia"/><path d="${tL}" class="sim-tr-lluvia"/><path d="${dP}" class="sim-ar-agua"/><path d="${tP}" class="sim-tr-agua"/>`;
  cont.innerHTML = `<svg width="${ancho}" height="${alto}" class="sim-linea-svg" role="img" aria-label="${t("sim_linea")}">
    <defs><clipPath id="sim-clip-ya"><rect x="0" y="0" width="${Math.max(0, xh)}" height="${alto}"/></clipPath><clipPath id="sim-clip-falta"><rect x="${xh}" y="0" width="${ancho}" height="${alto}"/></clipPath></defs>
    <rect x="${xf}" y="${yB - hB}" width="${Math.max(0, x(n - 1) - xf)}" height="${hB}" class="sim-pendiente"/>
    <g clip-path="url(#sim-clip-falta)" class="sim-futuro">${capa()}</g><g clip-path="url(#sim-clip-ya)">${capa()}</g>
    <line x1="${iz}" x2="${ancho - de}" y1="${yB}" y2="${yB}" class="sim-eje-base"/>${franja}${ejes}${eje}
    ${finPron > 0 ? hito(finPron, t("sim_hito_fin_pron")) : ""}${M.pico != null ? hito(M.pico, t("sim_hito_pico")) : ""}${globo}</svg>
    <div class="sim-linea-ley"><span><i class="sim-ley-lluvia"></i>${t("sim_ley_lluvia")}</span><span><i class="sim-ley-agua"></i>${t("sim_area")}</span>${[0, 1, 2].filter((k) => met.tipo.includes(k))
      .map((k) => `<span><i style="background:${COLOR_TIPO[k]}"></i>${t(k === 2 && M.escenario ? "sim_tipo_tormenta" : ["sim_tipo_real", "sim_tipo_pronostico", "sim_tipo_escenario"][k])}</span>`).join("")}</div>`;
  const svg = cont.querySelector("svg");
  const ir = (ev) => {
    const r = svg.getBoundingClientRect(), k = k0 + Math.round(((ev.clientX - r.left - iz) / (ancho - iz - de)) * (n - 1 - k0));
    M.siguiendo = false; M.seco = false; M.hora = limitar(k, k0, M.frames.length - 1); detenerAnimaciones(); mostrarHora();
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
      const fin = setTimeout(listo, 4000);   // si el mapa base tarda, se sigue sin ríos
      m.once("idle", () => { clearTimeout(fin); listo(); });
    });
  });
}
// El mapa 2D queda debajo de la maqueta (respaldo si el navegador no puede con WebGL): su relieve en 3D y el sombreado se piden
// recién cuando se lo muestra. Antes se bajaban siempre y la preparación esperaba esas teselas (unos 9 s de más)
function relieveMapaSim() {
  const m = SIM.mapa;
  if (!m || !m.isStyleLoaded() || m.getSource("relieve-sim")) return;
  const dem = { type: "raster-dem", encoding: "terrarium", tileSize: 256, maxzoom: 14, tiles: [TERRARIUM] };
  m.addSource("relieve-sim", { ...dem, attribution: "Relieve: AWS Terrain Tiles" });
  m.addSource("sombra-fuente-sim", dem);   // fuente aparte para el sombreado: MapLibre lo dibuja mejor así
  m.setTerrain({ source: "relieve-sim", exaggeration: SIM.capas.x5 ? 5 : 1 });   // escala real salvo que se pida ×5
  const antes = m.getStyle().layers.find((l) => l.type === "symbol")?.id;
  m.addLayer({ id: "sombra-sim", type: "hillshade", source: "sombra-fuente-sim", paint: { "hillshade-exaggeration": 0.45, "hillshade-shadow-color": "#3d4652" } }, antes);
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
    relieveMapaSim();
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
  actualizarCarga();
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
// Imagen de la maqueta: Esri World Imagery (fotos aéreas y satelitales de hasta ~0,5 m en ciudades) hasta z 18; donde Esri no
// tiene ese zoom devuelve una tesela «sin datos» de ~2,5 KB y se usa la de un zoom menor recortada. Si Esri no responde,
// el mosaico Sentinel-2 de EOX (~10 m, hasta z 15).
const SATELITE_ALTA = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const TESELA_VACIA = 3000;
async function sateliteDe(D, x0, y0, bw, bh, S) {
  const cv = document.createElement("canvas");
  cv.width = Math.round(bw * S); cv.height = Math.round(bh * S);
  const c = cv.getContext("2d");
  c.fillStyle = "rgb(150,140,110)"; c.fillRect(0, 0, cv.width, cv.height);
  const k = Math.max(0, Math.min(Math.ceil(Math.log2(S)), 18 - D.z)), z = D.z + k, f = 2 ** k;
  const gx0 = D.tx0 * 256 + x0, gy0 = D.ty0 * 256 + y0;   // píxeles globales del relieve en el zoom D.z
  const tiles = [];
  for (let tx = Math.floor((gx0 * f) / 256); tx <= Math.floor(((gx0 + bw) * f) / 256); tx++)
    for (let ty = Math.floor((gy0 * f) / 256); ty <= Math.floor(((gy0 + bh) * f) / 256); ty++) tiles.push([tx, ty]);
  DIAG.sat = { total: tiles.length, ok: 0, fallas: 0, zoom: z };
  const pedir = async (url) => {
    const ctl = new AbortController(), reloj = setTimeout(() => ctl.abort(), 15000);   // una tesela colgada no deja la maqueta esperando
    const r = await fetch(url, { signal: ctl.signal }).finally(() => clearTimeout(reloj));
    if (!r.ok) throw new Error(r.status);
    return r.blob();
  };
  // Fuentes en orden: Esri en el zoom pedido y hasta 3 niveles menos; después EOX (como mucho z 15)
  const fuentes = [0, 1, 2, 3].filter((d) => z - d >= 10).map((d) => [SATELITE_ALTA, d]).concat([[SATELITE, Math.max(0, z - 15)]]);
  const bajar = async ([tx, ty]) => {
    const lado = (256 / f) * S, dx = ((tx * 256) / f - gx0) * S, dy = ((ty * 256) / f - gy0) * S;
    for (const [url, d] of fuentes) {
      const q = 2 ** d, zz = z - d, px = Math.floor(tx / q), py = Math.floor(ty / q), sub = 256 / q;
      for (let intento = 0; intento < 2; intento++) {
        try {
          const b = await pedir(url.replace("{z}", zz).replace("{x}", px).replace("{y}", py));
          if (url === SATELITE_ALTA && b.size < TESELA_VACIA) break;   // Esri no tiene ese zoom acá: se prueba uno menor
          c.drawImage(await createImageBitmap(b), (tx % q) * sub, (ty % q) * sub, sub, sub, dx, dy, lado, lado);
          DIAG.sat.ok++;
          return;
        } catch (e) { await new Promise((ok) => setTimeout(ok, 400 * (intento + 1))); }
      }
    }
    DIAG.sat.fallas++;
  };
  for (let i = 0; i < tiles.length; i += 8) await Promise.all(tiles.slice(i, i + 8).map(bajar));   // de a 8 para no saturar el servidor
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
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, S = Math.min(8, (innerWidth < 700 ? 1536 : 2048) / Math.max(bw, bh));   // textura de hasta 2048 px: en un radio de 0,5 km, ~0,5 m por píxel
  const sat = await sateliteDe(D, x0, y0, bw, bh, S);
  if (SIM.datos !== d) return;
  const marco = document.querySelector(".sim-mapa-marco");
  const capa = document.createElement("div");
  capa.className = "sim-maqueta";
  capa.innerHTML = `<p class="sim-maqueta-ayuda">${t("sim_maqueta_ayuda")}</p><p class="sim-lluvia-estado" hidden></p>
    <div class="sim-pie-maqueta"><button type="button" class="sim-diag-link" id="sim-diag-link">${t("sim_diag")}</button>
    <p class="sim-credito-sat">${t("sim_fecha_sat")} · <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank" rel="noopener">Esri World Imagery</a> (${t("sim_credito_sat")})</p></div>`;
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
  // Terrón: el círculo parece arrancado de la tierra. Debajo del borde, un cono de tierra irregular que se afina hasta
  // una punta (anillos con ruido en el radio y en la profundidad, caras planas para que se vea rugoso). Es decorativo.
  const J = TERRON_ANILLOS, terron = terronForma(N, J, R * m), pared = new THREE.BufferGeometry(), pi = [];
  for (let k = 0; k < N; k++) for (let j = 0; j < J; j++) { const a = k * (J + 1) + j, b = a + J + 1; pi.push(a, a + 1, b, b, a + 1, b + 1); }
  pared.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array((N + 1) * (J + 1) * 3), 3));
  pared.setAttribute("color", new THREE.Float32BufferAttribute(terron.color, 3));
  pared.setIndex(pi);
  const matPared = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const mallaPared = new THREE.Mesh(pared, matPared);
  mallaPared.frustumCulled = false;   // la forma cambia con cada hora: que no quede afuera por una esfera vieja
  escena.add(mallaPared);
  const matBase = new THREE.MeshLambertMaterial({ color: 0x4f3e2c, side: THREE.DoubleSide });
  const base = new THREE.Mesh(new THREE.CircleGeometry(R * m, 128), matBase);
  base.rotation.x = Math.PI / 2; base.visible = false; escena.add(base);
  const sombra = new THREE.Mesh(new THREE.CircleGeometry(R * m * 0.75, 96), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.07 }));
  sombra.rotation.x = -Math.PI / 2; escena.add(sombra);
  escena.add(new THREE.AmbientLight(0xffffff, 0.62));
  const sol = new THREE.DirectionalLight(0xffffff, 0.75); sol.position.set(-1, 1.4, -0.6); escena.add(sol);
  const cam = new THREE.PerspectiveCamera(32, 1, 10, 1e7);
  const M = { capa, ren, escena, cam, geo, pared, base, sombra, tex, textura, sat, celdas, borde, terron, R: R * m,
    x0, y0, bw, bh, S, cx, cy, materiales: [matTerreno, matPared, matBase], plano: new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), tapa: new THREE.Group(),
    azimut: 0.9, elevacion: 0.34, distancia: 0.7, dibujar: 0, mmCharcos: null };
  escena.add(M.tapa);
  M.lluvia = prepararLluvia(d, x0, y0, bw, bh);
  if (!SIM.industrias) SIM.industrias = await fetch("datos/industrias.geojson").then((r) => r.json()).then((g) => g.features.filter((f) => distanciaKm(d.s.punto, f.geometry.coordinates) <= d.s.km)).catch(() => []);
  M.charcos = document.createElement("canvas"); M.charcos.width = bw; M.charcos.height = bh;
  M.pelicula = document.createElement("canvas"); M.pelicula.width = M.lluvia.nx; M.pelicula.height = M.lluvia.ny;
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

// ---------- Animación de desagües en la maqueta (la misma de la versión del 10-nov) ----------
// Es solo una animación: un modelo de "caños virtuales" propio de la maqueta (cada celda le pasa agua a sus vecinas más
// bajas según la diferencia de nivel, sobre el relieve suavizado ~120 m) moja el terreno y mueve las líneas blancas que
// bajan y se juntan. Los bajos llenos (charcos) y todas las cifras siguen saliendo del modelo de inundación.
const PERDIDA_ANIM = 10, ESCORRENTIA_ANIM = 0.5;   // mm que absorbe el suelo y parte de la lluvia que escurre (solo para la animación)
function prepararLluvia(d, x0, y0, bw, bh) {
  const D = d.D, W = D.W, H = D.H;
  const hSuave = promedioLocal(d.hs, W, H, Math.max(1, Math.round(60 / d.metrosPx)));   // ~120 m: sin el ruido de los edificios
  const p = Math.max(1, Math.ceil(bw / 220)), nx = Math.floor((bw - 1) / p) + 1, ny = Math.floor((bh - 1) / p) + 1, N = nx * ny;
  const z = new Float32Array(N), tipo = new Uint8Array(N);   // 0 afuera (pared), 1 tierra, 2 río o laguna (se lleva el agua)
  for (let gy = 0; gy < ny; gy++) for (let gx = 0; gx < nx; gx++) {
    const i = (y0 + gy * p) * W + x0 + gx * p, k = gy * nx + gx;
    if (!d.circulo[i]) continue;
    if (d.dentro[i] && Number.isFinite(hSuave[i])) { tipo[k] = 1; z[k] = hSuave[i]; }
    else { tipo[k] = 2; z[k] = Number.isFinite(d.hLago[i]) ? d.hLago[i] - 0.3 : d.hMin; }
  }
  // La primera y la última fila y columna quedan como pared (así los vecinos siempre existen)
  for (let gx = 0; gx < nx; gx++) { tipo[gx] = 0; tipo[(ny - 1) * nx + gx] = 0; }
  for (let gy = 0; gy < ny; gy++) { tipo[gy * nx] = 0; tipo[gy * nx + nx - 1] = 0; }
  const tierra = [];
  for (let k = 0; k < N; k++) if (tipo[k] === 1) tierra.push(k);
  const NP = innerWidth < 700 ? 1500 : 2600;
  return { p, nx, ny, N, z, tipo, tierra: Uint32Array.from(tierra), w: new Float32Array(N), fx: new Float32Array(N), fy: new Float32Array(N),
    sale: new Float32Array(N * 4), NP, px: new Float32Array(NP), py: new Float32Array(NP), vida: new Int16Array(NP),
    cola: new Float32Array(NP * LARGO_COLA * 2), cnt: new Uint8Array(NP), mojadura: 0, cuadro: 0, activa: false, semilla: 11, deuda: 0 };
}

function reiniciarLluvia(L) {
  L.w.fill(0); L.fx.fill(0); L.fy.fill(0); L.cnt.fill(0); L.vida.fill(0);
  L.mojadura = 0; L.cuadro = 0;
}

// Un paso del modelo de "caños virtuales": cada celda le pasa agua a sus vecinas más bajas según la diferencia de nivel
function pasoAgua(L, lluvia) {
  const { tierra, w, z, tipo, sale, fx, fy, nx } = L, vec = [1, -1, nx, -nx];
  if (lluvia > 0) for (let n = 0; n < tierra.length; n++) w[tierra[n]] += lluvia;
  for (let n = 0; n < tierra.length; n++) {
    const k = tierra[n], o = 4 * k;
    if (w[k] <= 1e-6) { sale[o] = sale[o + 1] = sale[o + 2] = sale[o + 3] = 0; continue; }
    const Hk = z[k] + w[k];
    let tot = 0;
    for (let j = 0; j < 4; j++) {
      const v = k + vec[j], f = tipo[v] ? Math.max(0, Hk - z[v] - w[v]) * 0.24 : 0;
      sale[o + j] = f; tot += f;
    }
    if (tot > w[k]) { const e = w[k] / tot; for (let j = 0; j < 4; j++) sale[o + j] *= e; }
  }
  fx.fill(0); fy.fill(0);
  for (let n = 0; n < tierra.length; n++) {
    const k = tierra[n], o = 4 * k;
    for (let j = 0; j < 4; j++) {
      const f = sale[o + j];
      if (!f) continue;
      const v = k + vec[j];
      w[k] -= f;
      if (tipo[v] === 1) w[v] += f;   // lo que llega a un río o laguna se va
      if (j < 2) fx[k] += j === 0 ? f : -f; else fy[k] += j === 2 ? f : -f;
    }
  }
}

function moverLineas(L) {
  const { nx, tipo, w, fx, fy, tierra, px, py, vida, cola, cnt, NP } = L, T = LARGO_COLA;
  const azar = () => ((L.semilla = (L.semilla * 16807) % 2147483647) / 2147483647);
  for (let n = 0; n < NP; n++) {
    const k = Math.floor(py[n]) * nx + Math.floor(px[n]);
    vida[n]--;
    if (vida[n] <= 0 || tipo[k] !== 1 || w[k] + L.mojadura < 0.002) {   // nace otra en un lugar mojado al azar
      const nk = tierra[Math.floor(azar() * tierra.length)];
      px[n] = (nk % nx) + azar(); py[n] = Math.floor(nk / nx) + azar(); vida[n] = 20 + azar() * 60; cnt[n] = 0;
      continue;
    }
    const m = Math.hypot(fx[k], fy[k]);
    if (m > 2e-6) { const paso = Math.min(0.9, 0.25 + m * 400); px[n] += (fx[k] / m) * paso; py[n] += (fy[k] / m) * paso; }
    const b = n * T * 2;
    if (cnt[n] === T) cola.copyWithin(b, b + 2, b + T * 2); else cnt[n]++;
    cola[b + (cnt[n] - 1) * 2] = px[n]; cola[b + (cnt[n] - 1) * 2 + 1] = py[n];
  }
}

// Pasos de la animación: tantos como correspondan a 24 por segundo (hasta 3 por cuadro), con la lluvia de ese rato
function avanzarLluvia(L, lamina, segundos) {
  L.deuda += segundos * FPS_LLUVIA;
  let n = Math.min(3, Math.floor(L.deuda));
  if (n <= 0) return;
  L.deuda -= n; if (L.deuda > 3) L.deuda = 0;
  const llueve = lamina > 0, porPaso = lamina / (n * SUBPASOS);
  while (n-- > 0) {
    for (let k = 0; k < SUBPASOS; k++) pasoAgua(L, porPaso);
    L.mojadura = llueve ? Math.min(0.006, L.mojadura + 0.0004) : L.mojadura * 0.97;   // película que moja todo y se seca de a poco
    moverLineas(L);
    L.cuadro++;
  }
}

// Forma del terrón (fija para cada lugar): factor de radio, corrimientos y profundidad de cada vértice, y su color de tierra
const TERRON_ANILLOS = 16;
function terronForma(N, J, Rm) {
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  const ondas = (n) => Array.from({ length: n }, (_, i) => ({ f: 2 + i * 2 + Math.floor(azar() * 3), fase: azar() * 6.283, a: 1 / (1 + i * 0.8) }));
  const oR = ondas(6), oY = ondas(5), oC = ondas(4);
  const ruido = (o, a, t) => o.reduce((s, w) => s + w.a * Math.sin(w.f * a + w.fase + t * (2 + w.f * 0.7)), 0) / o.reduce((s, w) => s + w.a, 0);
  const prof = Rm * 0.75, punta = [(azar() - 0.5) * Rm * 0.18, (azar() - 0.5) * Rm * 0.18];
  const n = (N + 1) * (J + 1), rf = new Float32Array(n), dx = new Float32Array(n), dy = new Float32Array(n), dz = new Float32Array(n), color = new Float32Array(n * 3);
  for (let k = 0; k <= N; k++) {
    const a = ((k % N) / N) * Math.PI * 2;
    for (let j = 0; j <= J; j++) {
      const v = k * (J + 1) + j, t = j <= 1 ? 0 : (j - 1) / (J - 1), grano = azar();
      // Anillo 0: borde del terreno; anillo 1: capa de suelo vertical; después el cono se cierra hacia la punta
      const perfil = j <= 1 ? 1 : Math.pow(1 - t, 0.75) * (1 + 0.16 * ruido(oR, a, t) * Math.sin(Math.PI * Math.min(1, t * 1.6)) + (grano - 0.5) * 0.05 * (1 - t));
      rf[v] = Math.max(0.015, perfil);
      dx[v] = punta[0] * Math.pow(t, 2); dz[v] = punta[1] * Math.pow(t, 2);
      dy[v] = j === 0 ? 0 : j === 1 ? prof * 0.035 : prof * (0.035 + 0.965 * Math.pow(t, 0.9) * (1 + 0.22 * ruido(oY, a, 0.3) * t) + (grano - 0.5) * 0.02);
      // Color: suelo oscuro arriba (con raíces), tierra más clara y veteada abajo
      const veta = 0.5 + 0.5 * ruido(oC, a, t * 3), c = j <= 1 ? [62, 46, 31] : [
        118 + 38 * veta - 26 * t, 92 + 28 * veta - 22 * t, 62 + 20 * veta - 16 * t];
      const luz = 0.86 + grano * 0.28;
      for (let q = 0; q < 3; q++) color[v * 3 + q] = Math.min(255, c[q] * luz) / 255;
    }
  }
  return { rf, dx, dy, dz, color, prof };
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
  const Q = M.pared.attributes.position, T = M.terron, J = TERRON_ANILLOS;
  M.borde.forEach((b, k) => {
    const arriba = altura(b.i);
    for (let j = 0; j <= J; j++) {
      const v = k * (J + 1) + j, rf = T.rf[v];
      Q.setXYZ(v, b.x * rf + T.dx[v], j === 0 ? arriba : fondo - T.dy[v], b.z * rf + T.dz[v]);
    }
  });
  Q.needsUpdate = true; M.pared.computeVertexNormals(); M.pared.computeBoundingSphere();
  M.base.position.y = fondo; M.sombra.position.y = fondo - T.prof * 1.25;
  M.fondo = fondo; M.alto = (d.hMax - piso) * ex;
}

// Bajos llenos (mismo cálculo y colores que el mapa), en el recuadro del círculo
function pintarCharcos() {
  const M = SIM.maqueta, d = SIM.datos, W = d.D.W, clave = `${SIM.modelo?.frames.length ? SIM.modelo.hora : -1}.${Math.floor((SIM.modelo?.frac || 0) * 4)}|${SIM.modelo?.hasta}|${SIM.capas.cortes}|${SIM.modelo?.seco ? 1 : 0}`;
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
  c.putImageData(img, 0, 0);
}

// Textura: satélite → película de agua que corre → bajos llenos → líneas blancas
function texturaMaqueta() {
  const M = SIM.maqueta, L = M.lluvia, S = M.S, ct = M.textura.getContext("2d");
  ct.drawImage(M.sat, 0, 0);
  ct.imageSmoothingEnabled = true;
  if (L.activa || L.cuadro) {   // película de agua que moja el terreno y corre
    const cp = M.pelicula.getContext("2d"), img = cp.createImageData(L.nx, L.ny), px = img.data;
    for (let k = 0; k < L.N; k++) {
      const h = L.tipo[k] === 1 ? L.w[k] + L.mojadura : 0;
      if (h < 0.0015) continue;
      const f = Math.min(1, Math.log10(h / 0.0015) / Math.log10(0.05 / 0.0015)), o = 4 * k;   // 1,5 mm (moja) → 5 cm (corre)
      px[o] = 150 - 40 * f; px[o + 1] = 215 - 30 * f; px[o + 2] = 250 - 10 * f; px[o + 3] = (0.32 + 0.3 * f) * 255;
    }
    cp.putImageData(img, 0, 0);
    ct.drawImage(M.pelicula, 0, 0, L.nx, L.ny, 0, 0, L.nx * L.p * S, L.ny * L.p * S);
  }
  pintarCharcos();
  ct.drawImage(M.charcos, 0, 0, M.bw * S, M.bh * S);
  if (SIM.capas.refs3d) { M.refs ??= capaReferencias3D(); ct.drawImage(M.refs, 0, 0); }
  if (L.activa && SIM.capas.flujo) {   // líneas: una pasada por tramo de cola (el más nuevo, más blanco y grueso); solo con «Escurrimiento»
    const T = LARGO_COLA, e = L.p * S, aT = (v) => (v + 0.5 / L.p) * e;
    ct.lineCap = "round";
    for (let r = 0; r < T - 1; r++) {
      const f = 1 - r / (T - 1);
      ct.strokeStyle = `rgba(${Math.round(190 + 65 * f)},${Math.round(225 + 30 * f)},255,${(0.9 * f).toFixed(2)})`;
      ct.lineWidth = (0.4 + 0.8 * f) * S;
      ct.beginPath();
      for (let n = 0; n < L.NP; n++) {
        const a = L.cnt[n] - 2 - r;
        if (a < 0) continue;
        const b = n * T * 2;
        ct.moveTo(aT(L.cola[b + a * 2]), aT(L.cola[b + a * 2 + 1])); ct.lineTo(aT(L.cola[b + a * 2 + 2]), aT(L.cola[b + a * 2 + 3]));
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
    const dist = (r * 1.38 / Math.sin(Math.min(fovV, fovH) / 2)) * M.distancia, bajar = SIM.corte3d ? 0 : (M.terron?.prof ?? 0) * 0.32;
    const ce = Math.cos(M.elevacion);
    M.cam.position.set(Math.sin(M.azimut) * ce * dist, Math.sin(M.elevacion) * dist + (M.fondo ?? 0) * 0.3 - bajar, Math.cos(M.azimut) * ce * dist);
    M.cam.lookAt(0, ((M.fondo ?? 0) + (M.alto ?? 0)) * 0.3 - bajar, 0);
    M.ren.render(M.escena, M.cam);
  });
}

// Reproducción: avanza hora por hora (12 horas por segundo); en la maqueta, además, corren las líneas blancas
function detenerAnimaciones() {
  if (SIM.reproduciendo) { cancelAnimationFrame(SIM.reproduciendo); SIM.reproduciendo = 0; }
  if (SIM.modelo) SIM.modelo.frac = 0;
  const hud = SIM.maqueta?.capa.querySelector(".sim-lluvia-estado"); if (hud) hud.hidden = true;
  if (SIM.maqueta) { const L = SIM.maqueta.lluvia; L.activa = false; L.cuadro = 0; actualizarMaqueta(); }   // al parar, la película se seca y quedan los charcos del cálculo
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
  const xs = filaCorte(d), perfil = xs.map((x) => {
    const i = d.filaCorte * d.D.W + x;
    return [d.hs[i], aguaFina(i)];
  });
  if (perfil.length < 4) { cont.innerHTML = `<p class="sim-corte-titulo">${t("sim_corte_ayuda")}</p>`; return; }
  // Misma escala horizontal y mismo ancho que el mapa topográfico de abajo: cada punto del corte queda arriba del mismo punto del mapa
  const T = curvasTopo(d), ancho = Math.min(cont.clientWidth || 300, 360), esc = ancho / Math.max(T.nx, T.ny);
  const alto = 130, n = perfil.length, base = alto - 20, izq = 0, der = 0;
  // Exageración vertical fija (×50): antes el desnivel se estiraba hasta llenar el alto y una llanura parecía una sierra
  const EXAG = 50, mPx = (d.metrosPx * T.p) / esc, span = Math.max(4, ((base - 16) * mPx) / EXAG);
  const zMin = Math.min(...perfil.map((p) => p[0])), zMax = Math.max(...perfil.map((p) => p[0] + p[1]));
  const lo = Math.floor(zMin - 1), hi = Math.max(Math.ceil(zMax + 1), Math.ceil(lo + span));
  const paso = esc / T.p;
  const sx = (k) => ((xs[k] - T.x0 + 0.5) / T.p) * esc, sy = (v) => 16 + (1 - (v - lo) / (hi - lo)) * (base - 16);
  const suelo = perfil.map((p, k) => `${k ? "L" : "M"}${sx(k).toFixed(1)},${sy(p[0]).toFixed(1)}`).join("") + `L${sx(n - 1).toFixed(1)},${base}L${sx(0).toFixed(1)},${base}Z`;
  const agua = perfil.map((p, k) => (p[1] >= AGUA_MIN
    ? `<rect x="${(sx(k) - paso / 2).toFixed(1)}" y="${sy(p[0] + p[1]).toFixed(1)}" width="${(paso + 0.6).toFixed(2)}" height="${(sy(p[0]) - sy(p[0] + p[1])).toFixed(1)}"/>` : "")).join("");
  const km = (n * d.metrosPx) / 1000;
  cont.innerHTML = `<p class="sim-corte-titulo"><b>${t("sim_corte")}</b> · ${t("sim_corte_ayuda")}
      <button type="button" class="btn-corte3d" id="sim-ver-corte" aria-pressed="${!!SIM.corte3d}">${t(SIM.corte3d ? "sim_corte3d_salir" : "sim_corte3d")}</button></p>
    <svg width="${ancho}" height="${alto}" class="sim-corte-svg" role="img" aria-label="${t("sim_corte")}">
      <line class="grilla" x1="0" x2="${ancho}" y1="${sy(hi)}" y2="${sy(hi)}"/><line class="grilla" x1="0" x2="${ancho}" y1="${sy(lo)}" y2="${sy(lo)}"/>
      <path d="${suelo}" class="sim-suelo"/><g class="sim-agua-corte">${agua}</g>
      <text class="eje" x="2" y="${sy(hi) - 4}">${fmt(hi)} m</text>
      <text class="eje" x="2" y="${sy(lo) + 12}">${fmt(lo)} m</text>
      <text class="eje" x="${ancho - 2}" y="${sy(hi) - 4}" text-anchor="end">${t("sim_exag")(hi - lo > ((base - 16) * mPx) / EXAG + 0.5 ? fmt(((base - 16) * mPx) / (hi - lo)) : EXAG)}</text>
      <text class="eje" x="${sx(0)}" y="${alto - 4}">${t("sim_oeste")}</text>
      <text class="eje" x="${sx(n - 1)}" y="${alto - 4}" text-anchor="end">${t("sim_este")} · ${fmt(km, 1)} km</text></svg>`;
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
  // (se pinta en una imagen chica, una celda por píxel, y se agranda con suavizado: bordes redondeados, sin cuadraditos)
  const chica = new OffscreenCanvas(T.nx, T.ny), cc = chica.getContext("2d"), im = cc.createImageData(T.nx, T.ny);
  for (let gy = 0; gy < T.ny; gy++) for (let gx = 0; gx < T.nx; gx++) {
    const i = (T.y0 + gy * T.p) * d.D.W + T.x0 + gx * T.p;
    if (!d.circulo[i]) continue;
    const prof = d.dentro[i] ? aguaFina(i) : 1;   // ríos y lagunas, siempre agua
    if (prof < AGUA_VER) continue;
    const col = colorEscala(COLOR_AGUA, prof), o = 4 * (gy * T.nx + gx);
    im.data[o] = col[0]; im.data[o + 1] = col[1]; im.data[o + 2] = col[2]; im.data[o + 3] = (d.dentro[i] ? 0.9 : 0.55) * 255;
  }
  cc.putImageData(im, 0, 0);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
  c.drawImage(chica, 0, 0, T.nx * esc, T.ny * esc);
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

// ---------- Lluvia pronosticada en un período ----------
// Días dentro del pronóstico diario (16 días, por punto): suma del pronóstico. Días más lejanos: lluvia media mensual del
// pronóstico estacional (SEAS5) del municipio, repartida por día. Se simula como si toda esa lluvia cayera junta.
let lluviaEstacional = null;
const fechaISO = (d) => d.toISOString().slice(0, 10);
const sumarDias = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return fechaISO(d); };
// ---------- Simular pronóstico: desde hoy, con lo que ya llovió ----------
// La corrida arranca 14 días atrás con la lluvia real (así el suelo, los bajos y las lagunas llegan a hoy como están), incorpora el
// agua vista por el radar el día de su pasada y sigue con el pronóstico hasta 15 días: hora a hora en los días 1 a 7 y, en los días
// 8 a 15, un miembro entero del ensamble de 51 pronósticos del ECMWF (probable: el del medio; pesimista: el del 10 % más lluvioso).
// Más allá de 15 días no se simula el agua (nadie sabe en qué día lloverá): solo la tendencia de cada mes.
const DIAS_PRON = 15;
function elegirModoSim(modo) {
  const ant = SIM.modoSim ?? "escenario";
  if (ant === modo) return;
  SIM.modelosModo ??= {};
  if (SIM.modelo?.corriendo) { SIM.modelo.worker?.terminate(); SIM.modelosModo[ant] = null; } else SIM.modelosModo[ant] = SIM.modelo;   // para volver sin recalcular
  SIM.modoSim = modo;
  document.querySelectorAll(".sim-modo").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.modo === modo)));
  document.getElementById("sim-modo-escenario").hidden = modo !== "escenario";
  document.getElementById("sim-modo-pronostico").hidden = modo !== "pronostico";
  detenerAnimaciones();
  avisoProgreso("");
  const guardado = SIM.modelosModo[modo];
  if (modo === "escenario" && SIM.esc) pintarEscenario();
  if (guardado) { SIM.modelo = guardado; bloquearControles(false); mostrarHora(); if (modo === "pronostico") pintarPronostico(); }
  else if (modo === "pronostico") prepararPronostico();
  else if (SIM.esc?.nino) aplicarNino(SIM.esc.nino, !SIM.esc.tocado);
  else if (SIM.esc && !SIM.esc.tocado && SIM.hist?.H?.horariasListas) aplicarPeorNino(true);
  else if (SIM.esc) cambiarEscenario({});
}
// Agua del radar en la zona del relieve (mismas teselas y zoom, píxel a píxel): rojo = agua, verde = días desde la pasada × 20
let cargaRadarAgua = null;
async function aguaRadar(d) {
  const R = await (cargaRadarAgua ??= fetch("datos/radar_agua.json").then((r) => (r.ok ? r.json() : null)).catch(() => null));
  if (!R?.url) return null;
  const D = d.D, nTx = Math.ceil(D.W / 256), nTy = Math.ceil(D.H / 256);
  const cv = new OffscreenCanvas(nTx * 256, nTy * 256), c = cv.getContext("2d", { willReadFrequently: true });
  let ok = 0;
  await Promise.all(Array.from({ length: nTx * nTy }, async (_, k) => {
    const tx = D.tx0 + (k % nTx), ty = D.ty0 + Math.floor(k / nTx);
    const b = await fetch(R.url.replace("{z}", D.z).replace("{x}", tx).replace("{y}", ty)).then((r) => (r.ok ? r.blob() : null)).catch(() => null);
    if (!b) return;
    c.drawImage(await createImageBitmap(b), (k % nTx) * 256, Math.floor(k / nTx) * 256);
    ok++;
  }));
  return ok ? { px: c.getImageData(0, 0, D.W, D.H).data, W: D.W, generado: R.generado } : null;
}
// Por celda del modelo: fracción con agua y días desde la pasada (mediana del círculo)
function radarEnGrilla(rad, g) {
  const fr = new Float32Array(g.N), dias = [];
  let cubiertas = 0, total = 0;
  for (let y = 0; y < g.ny; y++) for (let x = 0; x < g.nx; x++) {
    let cub = 0, agua = 0;
    for (let yy = 0; yy < g.f; yy++) for (let xx = 0; xx < g.f; xx++) {
      const o = 4 * ((g.by0 + y * g.f + yy) * rad.W + g.bx0 + x * g.f + xx);
      if (rad.px[o + 3] > 0) { cub++; if (rad.px[o] > 127) agua++; }
    }
    const c = y * g.nx + x;
    fr[c] = cub ? agua / cub : 0;
    if (g.dentroC[c]) { total++; if (cub) { cubiertas++; const o = 4 * ((g.by0 + y * g.f) * rad.W + g.bx0 + x * g.f); dias.push(Math.round(rad.px[o + 1] / 20)); } }
  }
  dias.sort((a, b) => a - b);
  return { fr, cobertura: total ? cubiertas / total : 0, dias: dias.length ? dias[dias.length >> 1] : null };
}
// Profundidad inicial donde el radar vio agua: en cada bajo, el nivel que cubre exactamente las celdas con agua vistas (el borde
// del agua vista se toma con 10 cm). El agua vista fuera de un bajo (terreno llano o en pendiente) no se agrega
function profundidadRadar(g, fr) {
  const { bajo, B } = bajosDelLugar(g), vistas = new Array(B.length).fill(0), h = new Float32Array(g.N), a = g.dx * g.dx;
  let haVista = 0, haAsignada = 0;
  for (let c = 0; c < g.N; c++) if (g.tipo2[c] === 1 && fr[c] >= 0.5) { if (g.dentroC[c]) haVista += a / 1e4; if (bajo[c] >= 0) vistas[bajo[c]]++; }
  B.forEach((b, k) => { if (vistas[k]) b.nivelRadar = Math.min(b.tope, b.zs[Math.min(vistas[k], b.zs.length) - 1] + AGUA_MIN); });
  for (let c = 0; c < g.N; c++) {
    const k = bajo[c];
    if (k >= 0 && B[k].nivelRadar != null && B[k].nivelRadar > g.z[c]) { h[c] = B[k].nivelRadar - g.z[c]; if (g.dentroC[c] && h[c] >= AGUA_MIN) haAsignada += a / 1e4; }
  }
  return { h, haVista, haAsignada };
}
function elegirMiembro(E, met, hoy, variante) {
  if (!E) return null;
  const desde = met.horas[hoy] + 168 * 3600e3;
  const tot = E.miembros.map((m, i) => [m.reduce((s2, v, j) => s2 + (E.horas[j] > desde ? v : 0), 0), i]).sort((x, y) => x[0] - y[0]);
  return E.miembros[tot[Math.round((variante === "pesimista" ? 0.9 : 0.5) * (tot.length - 1))][1]];
}
async function prepararPronostico() {
  const d = SIM.datos, cont = document.getElementById("sim-modo-pronostico");
  if (!d || !cont) return;
  if (SIM.pron?.clave !== SIM.clave) {
    const Rl = estado.riesgo.cmu[d.s.cmu], alto = Rl && Math.max(...Rl.r) >= CORTES[2];
    SIM.pron = { clave: SIM.clave, variante: alto ? "pesimista" : "probable" };   // con riesgo alto, el escenario que usa el mapa para avisar
    cont.innerHTML = `<p class="sim-hint">${t("pron_cargando")}</p>`;
    avisoProgreso(t("pron_cargando"));
    const [met, ens, rad, clima] = await Promise.all([lluviaDelPunto(d.s.punto, sumarDias(hoyLocal(), DIAS_PRON)).catch(() => null), ensambleLluvia(d.s.punto),
      aguaRadar(d).catch(() => null), climatologia(d.s.punto).catch(() => null)]);
    if (SIM.datos !== d) return;
    if (!lluviaEstacional) lluviaEstacional = await fetch("datos/lluvia_estacional.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    Object.assign(SIM.pron, { met, ens, rad, clima });
    avisoProgreso("");
  }
  pintarPronostico();
  if (SIM.pron.met && SIM.modoSim === "pronostico") simularPronostico(SIM.pron.variante);
}
// Río de la simulación del pronóstico, hora por hora (metros sobre el nivel de evacuación): hasta hoy, la altura medida por el INA;
// después, la altura pronosticada de cada día (GloFAS en altura, anclado a lo medido hoy; modelos/riesgo_diario.py), interpolada
// entre los mediodías. Sin pronóstico para la estación, la altura de hoy se mantiene los 15 días.
function rioPronosticado(e, met) {
  const rel = new Float32Array(met.horas.length).fill(e.h - e.ref);
  const P = estado.riesgo?.est?.[String(e.estacion_id)]?.h, D = estado.riesgo?.dias;
  if (!P?.length || P.some((v) => v == null) || !D?.length) return { rel, pronostico: false };
  const t0 = Date.parse(`${D[0]}T12:00:00-03:00`);
  met.horas.forEach((ms, k) => {
    const x = (ms - t0) / 864e5;
    if (x <= 0) return;
    const i = Math.min(Math.floor(x), P.length - 1), j = Math.min(i + 1, P.length - 1), f = Math.min(1, x - Math.floor(x));
    rel[k] = P[i] + (P[j] - P[i]) * f - e.ref;
  });
  const hMax = Math.max(...P.slice(1)), iMax = P.indexOf(hMax, 1);
  return { rel, pronostico: true, hMax, diaMax: D[iMax] };
}
async function simularPronostico(variante) {
  const d = SIM.datos, P = SIM.pron;
  if (!d || !P?.met) return;
  detenerAnimaciones();
  SIM.modelo?.worker?.terminate();
  P.variante = variante;
  const met0 = P.met, fin = Date.parse(`${sumarDias(hoyLocal(), DIAS_PRON)}T23:59:00-03:00`);
  let n = met0.horas.findIndex((x) => x > fin);
  if (n < 0) n = met0.horas.length;
  const met = { horas: met0.horas.slice(0, n), lluvia: met0.lluvia.slice(0, n), et0: met0.et0.slice(0, n), tipo: met0.tipo.slice(0, n), theta0: met0.theta0 };
  const hoy = Math.max(0, met.tipo.indexOf(1)), miembro = elegirMiembro(P.ens, met, hoy, variante);
  if (miembro) met.horas.forEach((ms, k) => { if (k - hoy > 168) { const j = P.ens.horas.indexOf(ms); if (j >= 0) met.lluvia[k] = miembro[j]; } });
  const M = (SIM.modelo = { frames: [], lagos: [], stats: [], hora: 0, corriendo: true, siguiendo: true, hasta: sumarDias(hoyLocal(), DIAS_PRON), tormenta: { mm: 0, horas: 3 }, corto: false, pronostico: true, verHoy: true });
  P.rio = null;
  bloquearControles(true);
  avisoProgreso(t("pron_calculando"));
  M.hoy = hoy;
  const g = grillaModelo(d);
  await prepararCorrida(M, d, g, met);
  if (SIM.modelo !== M) return;
  // El agua que vio el radar entra el día de su pasada (si el modelo tenía menos ahí)
  let asimilar = null;
  P.radarHoy = null;
  if (P.rad) {
    const R = radarEnGrilla(P.rad, g), H = profundidadRadar(g, R.fr);
    P.radarHoy = { cobertura: R.cobertura, dias: R.dias, haVista: H.haVista, haAsignada: H.haAsignada };
    if (R.dias != null && H.haAsignada > 0) asimilar = { k: Math.max(0, hoy - R.dias * 24), h: H.h };
  }
  if (M.estacion) P.rio = rioPronosticado(M.estacion, met);
  pintarPronostico();
  const w = (M.worker = new Worker("hidraulica.js"));
  w.onmessage = (e) => recibirHora(M, e.data);
  w.onerror = (e) => { avisoProgreso(t("sim_error")); console.error(e); };
  w.postMessage({ tipo: "iniciar", nx: g.nx, ny: g.ny, dx: g.dx, z: g.z, tipo2: g.tipo2, lago: g.lago, nMan: g.nMan, imp: g.imp,
    suelo: M.suelo, theta0: met.theta0, desague: Math.round(SIM.hist?.H?.desague ?? SIM.desague), crecida: 0, lluvia: Float32Array.from(met.lluvia), et0: Float32Array.from(met.et0),
    ...(P.rio ? { relEvac: P.rio.rel, relMed: relMedRio() } : {}), ...(asimilar ? { asimilar } : {}) });
  pintarLineaSim();
}
// Lluvia de cada día (hora argentina): real, pronóstico de 1 a 7 días y, de 8 a 15, el probable y el pesimista del ensamble
function diasPronostico(P) {
  const met = P.met, hoy = Math.max(0, met.tipo.indexOf(1)), dia = (ms) => new Date(ms - 3 * 3600e3).toISOString().slice(0, 10);
  const prob = elegirMiembro(P.ens, met, hoy, "probable"), pes = elegirMiembro(P.ens, met, hoy, "pesimista"), hoyISO = dia(met.horas[hoy]), out = new Map();
  met.horas.forEach((ms, k) => {
    const iso = dia(ms), off = Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${hoyISO}T12:00:00Z`)) / 864e5);
    if (off < -14 || off > DIAS_PRON) return;
    const x = out.get(iso) ?? { iso, off, real: 0, pron: 0, prob: 0, pes: 0, tramo: off < 0 || (off === 0 && met.tipo[k] === 0) ? "pasado" : off <= 2 ? "alta" : off <= 6 ? "media" : "baja" };
    if (met.tipo[k] === 0) x.real += met.lluvia[k];
    else if (k - hoy > 168 && P.ens) { const j = P.ens.horas.indexOf(ms); if (j >= 0) { x.prob += prob[j]; x.pes += pes[j]; } }
    else x.pron += met.lluvia[k];
    out.set(iso, x);
  });
  return [...out.values()].sort((a, b) => a.off - b.off);
}
// Gráfico de la lluvia de cada día: lo que pasó (14 días) y lo pronosticado (15), con los umbrales del SMN de este lugar (lluvia
// diaria de alerta amarilla, naranja y roja: método de la Nota Técnica SMN 2021-109, ver earth_engine/umbrales_smn.py)
function graficoPronostico(dias, umb, diaPico) {
  const W = 640, Hh = 200, iz = 40, de = 72, ar = 16, ab = 32, n = dias.length;
  const val = (x) => (x.tramo === "pasado" ? x.real : x.tramo === "baja" ? (SIM.pron.variante === "pesimista" ? x.pes : x.prob) : x.real + x.pron);
  const lim = umb ? umb.filter((v) => v > 0) : [];
  const max = Math.max(10, ...dias.map((x) => Math.max(val(x), x.pes)), ...(lim.length ? [lim[1] ?? lim[0]] : [])) * 1.08;
  const bw = (W - iz - de) / n, y = (v) => ar + (Hh - ar - ab) * (1 - Math.min(v, max) / max);
  const iHoy = dias.findIndex((x) => x.off === 0), xh = iz + iHoy * bw;
  const barras = dias.map((x, i) => {
    const x0 = iz + i * bw + 1, w = Math.max(1, bw - 2), v = val(x), pico = x.iso === diaPico ? " pico" : "";
    const rango = x.tramo === "baja" && x.pes > x.prob ? `<rect x="${x0}" y="${y(x.pes)}" width="${w}" height="${Math.max(0, y(x.prob) - y(x.pes))}" class="pron-pes"/>` : "";
    return `${rango}<rect x="${x0}" y="${y(v)}" width="${w}" height="${Math.max(0, Hh - ab - y(v))}" class="pron-b ${x.tramo}${pico}"><title>${fmtDia(x.iso)}: ${fmt(v)} mm${x.tramo === "baja" ? ` (${t("pron_var_probable").toLowerCase()} ${fmt(x.prob)} · ${t("pron_var_pesimista").toLowerCase()} ${fmt(x.pes)})` : ""}</title></rect>`;
  }).join("");
  const nivUmb = ["amarilla", "naranja", "roja"];
  const lineas = (umb ?? []).map((v, k) => v > 0 && v <= max ? `<line x1="${iz}" x2="${W - de}" y1="${y(v)}" y2="${y(v)}" class="pron-umb ${nivUmb[k]}"/><text x="${W - de + 4}" y="${y(v) + 3}" class="pron-umb-t ${nivUmb[k]}">${t(`pron_umb_${nivUmb[k]}`)} ${fmt(v)}</text>` : "").join("");
  const eje = [0, max / 2, max].map((v) => `<line x1="${iz}" x2="${W - de}" y1="${y(v)}" y2="${y(v)}" class="pron-grilla"/><text x="${iz - 6}" y="${y(v) + 3}" text-anchor="end" class="pron-eje">${fmt(v)}</text>`).join("") + `<text x="0" y="10" class="pron-eje">mm</text>`;
  const etq = dias.map((x, i) => (x.off % 7 === 0 || i === n - 1) ? `<text x="${iz + i * bw + bw / 2}" y="${Hh - ab + 14}" text-anchor="middle" class="pron-eje${x.off === 0 ? " fuerte" : ""}">${x.off === 0 ? t("pr_hoy") : fmtDia(x.iso, { day: "numeric", month: "short" }).replace(".", "")}</text>` : "").join("");
  const tramos = [["pasado", -14, -1], ["alta", 0, 2], ["media", 3, 6], ["baja", 7, DIAS_PRON]].map(([c, a, b]) => {
    const i0 = dias.findIndex((x) => x.off >= a), i1 = dias.findLastIndex((x) => x.off <= b);
    return i0 >= 0 && i1 >= i0 ? `<rect x="${iz + i0 * bw}" y="${Hh - 10}" width="${(i1 - i0 + 1) * bw - 2}" height="4" class="pron-tramo-b ${c}"/>` : "";
  }).join("");
  return `<svg viewBox="0 0 ${W} ${Hh}" class="pron-graf" role="img" aria-label="${t("pron_graf_aria")}">${eje}<line x1="${xh}" x2="${xh}" y1="${ar - 6}" y2="${Hh - ab}" class="pron-hoy"/>${barras}${lineas}${etq}${tramos}</svg>`;
}
// Barrita de 0 a 1 (con marcas opcionales, p. ej. alerta y evacuación del río)
const barrita = (f, marcas = []) => `<span class="pr-barra"><i style="width:${(100 * limitar(f, 0, 1)).toFixed(1)}%"></i>${marcas.map(([m, c]) => `<b class="${c}" style="left:${(100 * limitar(m, 0, 1)).toFixed(1)}%"></b>`).join("")}</span>`;
function pintarPronostico() {
  const cont = document.getElementById("sim-modo-pronostico"), P = SIM.pron, d = SIM.datos;
  if (!cont || !P || !d) return;
  if (!P.met) { cont.innerHTML = `<p class="sim-aviso">${t("pron_sin_datos")}</p>`; return; }
  const met = P.met, hoy = Math.max(0, met.tipo.indexOf(1)), Vp = estado.datos.resumen?.verificacion_plazos, pp = Vp?.por_plazo ?? {};
  const ultimo = (arr) => { for (let k = hoy; k >= 0; k--) if (arr?.[k] != null) return arr[k]; return null; };
  const suelo = SIM.modelo?.suelo ?? SIM.hist?.suelo, ts = suelo?.thetaS ?? 0.46, tSup = ultimo(met.theta), tProf = ultimo(met.thetaProf);
  const lluvia14 = met.lluvia.slice(0, hoy).reduce((a, b) => a + b, 0), est = estacionCercana(d), R = P.radarHoy;
  // Hogares sin red cloacal en el círculo (Censo 2022, pesado por población de cada radio dentro del círculo)
  const cuenta = new Map();
  d.celdas.forEach((i, k) => { if (d.radioDe[k]) cuenta.set(d.radioDe[k], (cuenta.get(d.radioDe[k]) ?? 0) + 1); });
  let pTot = 0, pSin = 0;
  for (const [r, nC] of cuenta) { const pr = d.radios[r - 1]?.properties; if (!pr) continue; const pob = ((Number(pr.poblacion) || 0) * nC) / Math.max(1, d.celdasRadio[r]); pTot += pob; pSin += (pob * (100 - (Number(pr.pct_cloaca) || 0))) / 100; }
  const alertas = [...new Set((estado.datos.alertas?.features ?? []).filter((f) => contiene(f.geometry, d.s.punto)).map((f) => `${f.properties.evento}|${f.properties.nivel}`))].map((x) => x.split("|"));
  // Resumen: lluvia de los próximos 7 días, de los días 8 a 15 (probable y pesimista) y el riesgo del lugar en el mapa
  const dias = diasPronostico(P), suma = (f) => dias.reduce((a, x) => a + f(x), 0);
  const l7 = suma((x) => (x.off >= 0 && x.off <= 6 ? (x.off === 0 ? x.real + x.pron : x.pron) : 0));
  const l15p = suma((x) => (x.off >= 7 ? x.prob || x.pron : 0)), l15s = suma((x) => (x.off >= 7 ? x.pes || x.pron : 0));
  const Rl = estado.riesgo.cmu[d.s.cmu], Dr = estado.riesgo.dias;
  let kMax = 0;
  if (Rl) Rl.r.forEach((v, k) => { if (v > Rl.r[kMax]) kMax = k; });
  const nivMax = Rl ? nivelRiesgo(Rl.r[kMax]) : 0, diaPico = Rl ? Dr[kMax] : null;
  const tarjeta = (etq, valor, sub, extra = "") => `<div class="pr-kpi">${extra}<span class="pr-kpi-v">${valor}</span><span class="pr-kpi-l">${etq}</span>${sub ? `<span class="pr-kpi-s">${sub}</span>` : ""}</div>`;
  const resumen = `<div class="pr-resumen">
    ${tarjeta(t("pron_k_7"), `${fmt(l7)}<small>mm</small>`, t("pron_k_7_s"))}
    ${tarjeta(t("pron_k_15"), `${fmt(l15p)}–${fmt(l15s)}<small>mm</small>`, t("pron_k_15_s"))}
    ${tarjeta(t("pron_k_riesgo"), Rl ? `${fmtRiesgo(Rl.r[kMax])}<small>/ 10</small>` : "–", Rl ? `${nombreNivel(Rl.r[kMax])} · ${kMax ? fmtDiaFrase(diaPico, { weekday: "short", day: "numeric", month: "short" }) : t("pr_hoy").toLowerCase()}` : "", Rl ? `<i class="pr-sem" style="background:var(--r${nivMax})"></i>` : "")}
  </div>`;
  // Escenario de lluvia: probable o pesimista (el que usa el mapa de riesgo para avisar)
  const varBtn = (v) => `<button type="button" role="radio" data-var="${v}" aria-checked="${P.variante === v}"${P.ens ? "" : " disabled"}><b>${t(`pron_var_${v}`)}</b><small>${t(`pron_var_${v}_s`)}</small></button>`;
  const variante = `<div class="pr-var" role="radiogroup" aria-label="${t("pron_var_t")}">${varBtn("probable")}${varBtn("pesimista")}</div>`;
  // Condiciones de hoy: tarjetas con su barrita
  const cond = (etq, valor, fuente, barra = "") => `<div class="pr-c"><span class="pr-c-l">${etq}${fuente ? infoIcono("pron_c", fuente) : ""}</span><span class="pr-c-v">${valor}</span>${barra}</div>`;
  const hs = tSup != null ? Math.min(1, tSup / ts) : null, hp = tProf != null ? Math.min(1, tProf / ts) : null;
  const rioTxt = est ? (P.rio?.pronostico ? t("pron_f_rio_pron")(est.estacion, fmt(P.rio.hMax, 2), fmtDiaFrase(P.rio.diaMax)) : t("pron_f_rio")(est.estacion)) : "";
  const rioBarra = est && est.ref ? barrita((est.h - est.ref * 0.7) / (est.ref * 0.4), [[(est.ref - est.ref * 0.7) / (est.ref * 0.4), "evac"]]) : "";
  const condiciones = [
    cond(t("pron_c_humedad"), hs != null ? `${fmt(100 * hs)}<small>%</small>` : "–", t("pron_f_humedad"), hs != null ? barrita(hs) : ""),
    cond(t("pron_c_napas"), hp != null ? `${fmt(100 * hp)}<small>%</small>` : "–", t("pron_f_napas"), hp != null ? barrita(hp) : ""),
    cond(t("pron_c_lluvia"), `${fmt(lluvia14)}<small>mm</small>`, t("pron_f_real")),
    cond(t("pron_c_rio"), est ? `${fmt(est.h, 2)}<small>m</small>` : "–", est ? `${rioTxt} · ${t("sim_v_evac")(fmt(est.ref, 2))}` : t("pron_c_rio_sin"), rioBarra),
    cond(t("pron_c_radar"), R ? (R.cobertura > 0.5 ? `${fmt(R.haVista, 1)}<small>ha</small>` : "–") : "…", R && R.cobertura <= 0.5 ? t("pron_c_radar_sin") : P.rad === null ? t("pron_c_radar_no") : t("pron_f_radar")),
    cond(t("pron_c_desague"), `${fmt(Math.round(SIM.hist?.H?.desague ?? SIM.desague))}<small>mm/h</small>`, t("pron_f_desague")),
    cond(t("pron_c_cloaca"), pTot ? `${fmt((100 * pSin) / pTot)}<small>%</small>` : "–", t("pron_f_cloaca"), pTot ? barrita(pSin / pTot) : ""),
    cond(t("pron_c_alertas"), alertas.length ? alertas.map(([e, n]) => `<span class="pr-alerta ${n}">${escapar(e)} · ${escapar(n)}</span>`).join("") : `<span class="pr-c-nada">${t("pron_c_alertas_no")}</span>`, t("pron_f_alertas")),
  ].join("");
  const tramo = (cls, tit, txt) => `<span class="${cls}">${tit}${infoIcono("pron_tramo", txt)}</span>`;
  const met3 = (k) => pp[k] ? t("pron_medido")(fmt(pp[k].correlacion, 2), fmt(100 * pp[k].deteccion_20mm), Vp.dias) : t("pron_sin_medir");
  const tramos = [tramo("pasado", t("pron_ley_pasado"), `<b>${t("pron_tr_pasado_t")}</b><br>${t("pron_tr_pasado")}`),
    tramo("alta", t("pron_ley_alta"), `<b>${t("pron_tr_alta_t")}</b><br>${t("pron_tr_det")} ${met3("0-3")}`),
    tramo("media", t("pron_ley_media"), `<b>${t("pron_tr_media_t")}</b><br>${t("pron_tr_det")} ${met3("4-7")}`),
    tramo("baja", t("pron_ley_baja"), `<b>${t("pron_tr_baja_t")}</b><br>${P.ens ? t("pron_tr_ens")(P.ens.miembros.length) : t("pron_tr_ens_no")} ${met3("8-15")}`)].join("");
  // Meses: lluvia del mes según SEAS5 frente a lo normal, en barras (y la probabilidad de evacuación del río)
  const E = lluviaEstacional, mm = E?.cmu[d.s.cmu], mesHoy = hoyLocal().slice(0, 7);
  const meses = (E?.meses ?? []).map((m, i) => ({ m, v: mm?.[i] })).filter((x) => x.m > mesHoy && x.v != null);
  const nombreMes = (m) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString(loc(), { month: "short", year: "2-digit" });
  const maxMes = Math.max(1, ...meses.map(({ m, v }) => Math.max(v, P.clima?.media?.[+m.slice(5) - 1] ?? 0)));
  const filasMes = meses.map(({ m, v }) => {
    const normal = P.clima?.media?.[+m.slice(5) - 1], pe = est ? Number(est[`pe_${m}`]) : NaN;
    const dif = normal ? `${v >= normal ? "+" : ""}${fmt((100 * (v - normal)) / normal)} %` : "";
    return `<div class="pr-mes"><span class="pr-mes-n">${nombreMes(m)}</span><span class="pr-mes-b"><i style="width:${(100 * v / maxMes).toFixed(1)}%"></i>${normal ? `<b style="left:${(100 * normal / maxMes).toFixed(1)}%" title="${t("pron_normal")}"></b>` : ""}</span>
      <span class="pr-mes-v">${fmt(v)} mm${dif ? `<small>${dif}</small>` : ""}</span>${est && Number.isFinite(pe) ? `<span class="pr-mes-r">${t("pron_mes_rio_c")} ${fmt(100 * pe)} %</span>` : ""}</div>`;
  }).join("");
  const umb = Rl?.u ?? null;
  SIM.kpisEl?.remove();
  cont.innerHTML = `${resumen}
    <h3 class="tit esc-tit">${t("pron_esc_t")}${infoIcono("pron_intro", t("pron_intro"))}</h3>${variante}
    <div id="sim-kpis-lugar-pron"></div>
    <h3 class="tit esc-tit">${t("pron_tramos_t")}</h3>${graficoPronostico(dias, umb, diaPico)}
    <div class="pron-leyenda">${tramos}</div>${umb ? `<p class="pr-nota">${t("pron_umb_nota")}</p>` : ""}
    <h3 class="tit esc-tit">${t("pron_hoy_t")}</h3><div class="pr-conds">${condiciones}</div>
    <h3 class="tit esc-tit">${t("pron_meses_t")}${infoIcono("pron_meses", t("pron_meses_sub"))}</h3>
    ${meses.length ? `<div class="pr-meses">${filasMes}</div><p class="pr-nota"><i class="pr-ley-normal"></i>${t("pron_normal")}</p>` : `<p class="sim-hint">${t("pron_meses_no")}</p>`}`;
  enlazarInfo(cont);
  if (SIM.kpisEl && SIM.modoSim === "pronostico") document.getElementById("sim-kpis-lugar-pron")?.replaceWith(SIM.kpisEl);
  cont.querySelectorAll("[data-var]").forEach((b) => { b.onclick = () => { if (P.variante !== b.dataset.var) { simularPronostico(b.dataset.var); pintarPronostico(); } }; });
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

// Riesgo del lugar (el mismo de la lámina 01), chico, al lado del radio: no hace falta volver a la otra solapa para verlo
function cuadroRiesgoSim() {
  const R = estado.riesgoVista;
  if (!R || !Number.isFinite(R.r)) return "";
  const cortes = [0, ...CORTES, 10], v = limitar(R.r, 0, 10), n = nivelRiesgo(v) || 1;
  const dia = R.dia ? fmtDia(estado.riesgo.dias[R.dia], { day: "numeric", month: "short" }).replace(".", "") : t("hoy").toLowerCase();
  return `<div class="sim-riesgo" data-ayuda="${escapar(t("sim_riesgo_ayuda"))}"><span class="sim-riesgo-l">${t("sim_riesgo_t")} · ${escapar(dia)}</span>
    <span class="sim-riesgo-v"><b>${fmtRiesgo(v)}</b><small>${escapar(nombreNivel(v))}</small></span>
    <span class="sim-riesgo-barra">${cortes.slice(1).map((c, i) => `<i style="width:${(10 * (c - cortes[i])).toFixed(1)}%;background:var(--r${i + 1})"></i>`).join("")}<em style="left:${(10 * v).toFixed(1)}%"></em></span></div>`;
}
function pintarPanelSimulador(d) {
  const panel = document.getElementById("sim-panel");
  const kpiSim = (etq, ayuda) => `<div class="kpi"><span class="kpi-l">${etq}${infoIcono("sim_kpi", ayuda)}</span><span class="kpi-v tb-dato-valor">–</span><span class="kpi-f tb-dato-extra"></span></div>`;
  // Indicadores del momento de más agua: en una fila debajo del selector de Niño (o arriba del pronóstico): primer pantallazo
  SIM.kpisEl = Object.assign(document.createElement("div"), { className: "sim-kpis", id: "sim-kpis" });
  SIM.kpisEl.innerHTML = `<p class="sim-kpis-cab" id="sim-kpis-cab"></p><div class="kpis sim-datos">
    ${kpiSim(t("sim_k_total"), t("sim_k_total_a"))}${kpiSim(t("sim_k_inund"), t("sim_k_inund_a"))}${kpiSim(t("sim_k_alc"), t("sim_k_pers_a"))}
    ${kpiSim(t("sim_k_area"), t("sim_k_area_a"))}${kpiSim(t("sim_k_calles"), t("sim_k_calles_a"))}${kpiSim(t("sim_k_aisl"), t("sim_aisladas_sub"))}${kpiSim(t("sim_k_salud"), t("sim_salud_sub"))}</div>`;
  enlazarInfo(SIM.kpisEl);
  panel.innerHTML = `
    <div class="sim-lec">
      <div class="sim-radio-fila">${cuadroRiesgoSim()}
      <div class="lec-radio" id="sim-radio">${estado.sel?.tipo === "punto" ? `<div class="lec-radio-cab"><span class="etq">${t("radio_km")}</span><b id="sim-radio-v">${fmt(estado.sel.km, estado.sel.km % 1 ? 1 : 0)} km</b></div>
        <input type="range" min="0.5" max="20" step="0.5" value="${estado.sel.km}" aria-label="${t("radio_km")}"><div class="lec-radio-ext"><span>0,5 km</span><span>20 km</span></div>` : ""}</div></div>
      <div><span class="etq" id="sim-etq"></span><h2 class="titular" id="sim-titular">${t("sim_tit_q")} <span>–</span></h2></div>
      <div class="sim-play">
          <div class="ctrls">
          <div class="ctrl"><span class="etq">${t("sim_lluvia_etq")}</span><div class="seg"><button type="button" id="sim-reiniciar" aria-label="${t("sim_reiniciar")}" data-ayuda="${t("sim_reiniciar")}">${icono("repetir")}</button><button type="button" id="sim-play" aria-label="${t("sim_reproducir")}">${icono("play")}</button></div></div>
        </div>
    <div class="sim-modos" role="tablist" aria-label="${t("sim_modos")}">${["escenario", "pronostico"].map((m) => `<button type="button" role="tab" class="sim-modo" data-modo="${m}" aria-selected="${(SIM.modoSim ?? "escenario") === m}">${t(`sim_modo_${m}`)}</button>`).join("")}</div>
    <p class="sim-progreso" id="sim-progreso" role="status" hidden></p>
    <div class="sim-ahora"><span class="sim-ahora-fecha" id="sim-fecha">–</span><span class="sim-ahora-tipo" id="sim-tipo"></span>
      <span class="sim-ahora-lluvia" id="sim-acum"></span></div>
    <div class="sim-control">
      <input type="range" id="sim-barra" min="0" max="0" step="1" value="0" aria-label="${t("sim_linea")}">
    </div>
    <div class="sim-vel" id="sim-vel" role="group" aria-label="${t("sim_velocidad")}"><span class="sim-dur-etq">${t("sim_velocidad")}</span>${[0.5, 1, 2, 4].map((v) => `<button type="button" class="chip" data-v="${v}" aria-pressed="${SIM.velocidad === v}">×${String(v).replace(".", ",")}</button>`).join("")}</div>
    <div class="sim-linea" id="sim-linea"></div>
      </div>
      <div>
        <div id="sim-modo-escenario"${SIM.modoSim === "pronostico" ? " hidden" : ""}><p class="bajada">${t("sim_bajada_lam")}</p>
        <h3 class="tit esc-tit">${t("sim_esc_t")}${infoIcono("sim_esc", t("info_esc"))}</h3>
        <div class="esc" id="sim-esc"><p class="sim-hint">${t("sim_hist_cargando")}</p></div></div>
        <div id="sim-modo-pronostico" class="pron"${SIM.modoSim === "pronostico" ? "" : " hidden"}></div>
        <p class="sim-hint" id="sim-hint" hidden>${t("sim_hint")}</p></div>
    </div>
    <div class="sim-mas">
    <div class="sim-corte" id="sim-corte" hidden></div>
    <div class="sim-filtros" id="sim-filtros" role="group" aria-label="${t("sim_capas")}"></div>
    <div class="sim-leyenda">${COLOR_AGUA.map(([v, c]) => `<span><i style="background:${rgba(c, 0.6)}"></i>${v < 1 ? `${fmt(v * 100)} cm` : `${fmt(v)} m`}</span>`).join("")}</div>
    <div class="sim-validez" id="sim-validez">${t("sim_validez")}</div>
    <div class="sim-ant" id="sim-ant"></div>
    <div class="sim-ninos" id="sim-ninos"></div>
    <details class="sim-metodo"><summary>${t("sim_como")}</summary><p>${t("sim_metodo")}</p><p id="sim-supuestos"></p></details>
    <div class="lec-pie" id="sim-pie"></div>
    </div>`;
  const barra = document.getElementById("sim-barra");
  barra.oninput = () => { const Mo = SIM.modelo; if (!Mo?.frames.length) return; detenerAnimaciones(); Mo.siguiendo = false; Mo.seco = false; Mo.hora = limitar(Number(barra.value), Mo.hoy, Mo.frames.length - 1); mostrarHora(); };
  document.getElementById("sim-play").onclick = () => reproducirSimulador();
  document.getElementById("sim-reiniciar").onclick = reiniciarSimulador;
  panel.querySelectorAll("#sim-vel .chip").forEach((b) => { b.onclick = () => { SIM.velocidad = +b.dataset.v; panel.querySelectorAll("#sim-vel .chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }; });
  pintarEscenario();
  // Radio del círculo arriba de todo: al soltar, la maqueta se arma de nuevo con el círculo nuevo
  const rad = panel.querySelector("#sim-radio input");
  if (rad) {
    rad.oninput = () => { document.getElementById("sim-radio-v").textContent = `${fmt(+rad.value, +rad.value % 1 ? 1 : 0)} km`; };
    rad.onchange = () => { cambiarRadio(Number(rad.value)); cerrarSimulador(); abrirSimulador(); };
  }
  panel.querySelectorAll(".sim-modo").forEach((b) => { b.onclick = () => elegirModoSim(b.dataset.modo); });
  pintarFiltrosSimulador();
  if (SIM.modoSim === "pronostico") pintarPronostico();
  pintarValidez();
  if (d) pintarCorte();
}

// Cabeza y pie de la lámina 02: rótulo del lugar y, abajo, cómo le fue al modelo en esta ciudad (o en todas) frente al satélite
function pintarCabezaSim() {
  const d = SIM.datos, etq = document.getElementById("sim-etq");
  if (!etq || !d) return;
  const m = estado.porCmu.get(d.s.cmu);
  etq.textContent = [m?.nam ?? document.getElementById("sim-titulo")?.textContent, t("sel_circulo")(d.s.km), t("sim_relieve_real")].filter(Boolean).join(" · ");
}
function pintarPieSim() {
  const cont = document.getElementById("sim-pie"), V = SIM.validacion;
  if (!cont) return;
  pintarCabezaSim();
  if (!V?.nino) { cont.innerHTML = ""; return; }
  const v = validacionCiudad(SIM.datos), temp = (f) => f.temporada.replace(/^nino_/, "").replace("_", "-");
  const fila = (n, a, b, max, dec, u = "") => `<div class="fila-b"><span class="n">${n}</span><span class="pista doble"><i style="width:${(100 * limitar(a / max, 0, 1)).toFixed(1)}%"></i><i style="width:${(100 * limitar((b ?? 0) / max, 0, 1)).toFixed(1)}%"></i></span><b>${fmt(a, dec)}${u}<small>${b == null ? "–" : fmt(b, dec) + u}</small></b></div>`;
  const ley = (b) => `<div class="leyq"><span><i style="background:var(--cian)"></i>${t("sim_val_modelo_c")}</span><span><i style="background:var(--pista-ref)"></i>${b}</span></div>`;
  let a, b;
  if (v?.filas?.length) {
    a = `<h3 class="tit">${t("sim_acierto_en")(escapar(v.ciudad))}</h3><p class="sub">${t("sim_csi_sub")}</p><div class="barras">${v.filas.map((f) => fila(temp(f), f.csi, f.csi_jrc, 1, 2)).join("")}</div>${ley(t("sim_ref_jrc"))}`;
    const mx = Math.max(1, ...v.filas.flatMap((f) => [f.sup_sim_pct ?? 0, f.sup_obs_pct ?? 0])) * 1.1;
    b = `<h3 class="tit">${t("sim_vs_sat")}</h3><p class="sub">${t("sim_vs_sat_sub")(V.radio_km)}</p><div class="barras">${v.filas.map((f) => fila(temp(f), f.sup_sim_pct ?? 0, f.sup_obs_pct, mx, 1, " %")).join("")}</div>${ley(t("sim_satelite"))}`;
  } else {
    const N = V.nino;
    a = `<h3 class="tit">${t("sim_acierto_todas")}</h3><p class="sub">${t("sim_csi_sub_todas")(V.ciudades)}</p><div class="barras">${fila(t("sim_mediana"), N.csi_mediana, N.csi_jrc_mediana, 1, 2)}</div>${ley(t("sim_ref_jrc"))}`;
    b = `<h3 class="tit">${t("sim_aciertos_t")}</h3><p class="sub">${t("sim_aciertos_sub")}</p><div class="barras">${fila(t("sim_detecta"), 100 * N.pod_mediana, null, 100, 0, " %")}${fila(t("sim_falsas"), 100 * N.far_mediana, null, 100, 0, " %")}</div>`;
  }
  cont.innerHTML = `<div>${a}</div><div>${b}</div>`;
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
  pintarPieSim();
  const cont = document.getElementById("sim-validez"), V = SIM.validacion;
  if (!cont) return;
  if (!V?.nino) { cont.innerHTML = `${t("sim_validez")} ${t("sim_limites")}`; return; }
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
    <p>${t("sim_limites")}</p>
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
  const k = Mo.hora, R = statHora(Mo, k), met = Mo.met, tp = TIPO_DATO[met.tipo[k]];
  const fecha = new Date(met.horas[k]);
  document.getElementById("sim-fecha").textContent = fecha.toLocaleString(estado.idioma === "en" ? "en-GB" : "es-AR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const etq = document.getElementById("sim-tipo");
  etq.textContent = t(Mo.escenario ? "sim_tipo_elegido" : `sim_tipo_${tp}`); etq.style.background = COLOR_TIPO[met.tipo[k]];
  if (Mo.escenario) document.getElementById("sim-fecha").textContent = t("sim_hora_esc")(k - 2, Mo.tormenta.horas);
  // Solo desde ahora: lo que ya pasó no se muestra (el modelo lo usa en silencio para saber qué tan mojado está el suelo)
  let pron = 0, esc = 0, test = 0;
  const reparto = repartoTormenta((Mo.tormenta?.horas) || 3);
  for (let j = Mo.hoy; j <= k; j++) { const v = met.lluvia[j]; if (met.tipo[j] === 2) esc += v; else pron += v; }
  if (Mo.tormenta?.mm) for (let j = 0; j < reparto.length && Mo.hoy + j <= k; j++) test += Mo.tormenta.mm * reparto[j];
  if (Mo.escenario) { test = 0; for (let j = 0; j <= k; j++) test += met.lluvia[j]; }
  document.getElementById("sim-acum").innerHTML = Mo.escenario ? t("sim_acum_esc")(fmt(test), fmt(Mo.tormenta.mm))
    : t("sim_acum_ahora")(fmt(Math.max(0, pron - test)), fmt(test), fmt(esc));
  const barra = document.getElementById("sim-barra");
  barra.min = String(Mo.hoy); barra.max = String(met.horas.length - 1); barra.value = String(k);
  // Indicadores y titular: el momento de más agua de la corrida (no la hora que se ve): primer pantallazo aunque la maqueta esté seca
  const kp = Mo.corriendo || Mo.pico == null ? Math.max(Mo.hoy, Mo.frames.length - 1) : Mo.pico, P = Mo.stats[kp] ?? R;
  const caja = SIM.kpisEl ?? document, vals = caja.querySelectorAll(".sim-datos .tb-dato-valor"), ext = caja.querySelectorAll(".sim-datos .tb-dato-extra");
  const cab = caja.querySelector("#sim-kpis-cab");
  if (cab) cab.textContent = Mo.corriendo ? t("sim_kpis_calc") : Mo.escenario ? t("sim_kpis_pico_esc")(Math.max(1, kp - 1), Mo.tormenta.horas)
    : t("sim_kpis_pico_fecha")(new Date(met.horas[kp]).toLocaleString(estado.idioma === "en" ? "en-GB" : "es-AR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }));
  const conU = (v, u) => `${v}<small>${u}</small>`, pctTxt = fmt(P.pct, P.pct < 10 ? 1 : 0);
  if (Mo.corriendo || Mo.pico == null) {   // hasta tener la corrida completa: «–» (no valores a medio calcular)
    vals.forEach((v) => { v.textContent = "–"; }); ext.forEach((x) => { x.textContent = ""; });
    const tit0 = document.getElementById("sim-titular"); if (tit0) tit0.innerHTML = `${t("sim_tit_q")} <span>–</span>`;
    return;
  }
  // Superficie (con la profundidad máxima abajo), habitantes y la parte industrial o comercial con agua
  // Personas: totales y en zona inundable del lugar (los mismos números del Panorama) y las alcanzadas por el agua en esta simulación
  const HL = estado.habitantesLugar;
  vals[0].textContent = HL ? fmtPersonas(HL.total) : "–"; ext[0].textContent = t("sim_k_total_s");
  vals[1].textContent = HL ? fmtPersonas(HL.inundable) : "–"; ext[1].textContent = HL && HL.total ? t("sim_k_inund_s")(fmt((100 * HL.inundable) / HL.total, 1)) : "";
  vals[3].innerHTML = conU(pctTxt, "%");
  ext[3].textContent = [t("sim_km2_corto")(fmt(P.km2, P.km2 < 10 ? 2 : 0)), P.maxProf >= 0.01 ? t("sim_prof_corto")(fmt(P.maxProf, 2)) : ""].filter(Boolean).join(" · ");
  pintarCabezaSim();
  const tit = document.getElementById("sim-titular"); if (tit) tit.innerHTML = `${t("sim_tit_q")} <span>${t("sim_tit_pct")(pctTxt)}</span>`;
  vals[2].textContent = fmtPersonas(P.personas); ext[2].textContent = t("sim_k_alc_s");
  const g = Mo.g;
  if (Mo.accesoK !== kp) { Mo.accesoK = kp; Mo.accesoPico = accesoHora(Mo, Mo.frames[kp]); }   // una vez por corrida (es una búsqueda en la red de calles)
  const ac = Mo.accesoPico;
  vals[4].innerHTML = g.nRuta ? conU(fmt(P.cortesKm, P.cortesKm < 10 ? 1 : 0), "km") : t("sin_informacion");
  ext[4].textContent = g.nRuta ? t("sim_cortes_de_corto")(fmt((g.nRuta * g.dx) / 1000)) : "";
  vals[5].textContent = ac ? fmtPersonas(ac.aisladas) : t("sin_informacion");
  vals[6].innerHTML = ac && ac.salud ? conU(ac.sinAcceso, `/ ${ac.salud}`) : t("sin_informacion");
  pintarAntecedentesSim(Mo, d);
  const sup = document.getElementById("sim-supuestos");
  if (sup) sup.textContent = `${t(d.D.fuente === "fabdem" ? "sim_terreno_fabdem" : "sim_terreno_aws")} ` + t("sim_supuestos")(Mo.suelo.nombre, Mo.suelo.supuesto, SIM.desague, fmt(Mo.g.dx), Mo.cuenta ? fmt(100 * Mo.cuenta.infiltrada / Math.max(1, Mo.cuenta.lluvia)) : "…")
    + ` ${usoDelSuelo(Mo.g)}`;
  pintarCorte();
  caja.querySelectorAll(".sim-datos .tb-dato-valor").forEach((v) => v.classList.toggle("texto", !/\d/.test(v.textContent)));   // «Sin información»: en letra de texto
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
  Mo.hora = planReproduccion(Mo).ini; Mo.frac = 0; Mo.siguiendo = false; Mo.seco = false;
  reproducirSimulador(true);
}
function reproducirSimulador(desdeCero = false) {
  const Mo = SIM.modelo, btn = document.getElementById("sim-play");
  if (!Mo?.frames.length) return;
  if (SIM.reproduciendo) { detenerAnimaciones(); return; }
  Mo.seco = false;
  const { ini, ts } = planReproduccion(Mo), ultimo = ts.length - 1;
  let j0 = Mo.hora - ini;
  if (desdeCero || j0 < 0 || j0 >= ultimo || Mo.hora === Mo.pico) j0 = 0;   // desde el pico o el final, arranca la tormenta de nuevo
  Mo.siguiendo = false;
  btn.innerHTML = icono("pausa");
  const L = SIM.maqueta?.lluvia;
  if (L) { if (j0 === 0) reiniciarLluvia(L); L.activa = true; L.deuda = 0; }
  // Lluvia que escurre en cada hora (para la animación): se descuentan los primeros 10 mm que absorbe el suelo
  const escurre = [];
  for (let k = ini, acum = 0; k <= ini + ultimo; k++) {
    const mm = Mo.met.lluvia[k] ?? 0, util = Math.max(0, acum + mm - PERDIDA_ANIM) - Math.max(0, acum - PERDIDA_ANIM);
    acum += mm; escurre.push((util / 1000) * ESCORRENTIA_ANIM);
  }
  let seg = ts[j0], antes = null;
  const cuadro = (ahora) => {
    const dt = antes == null ? 0 : ((ahora - antes) / 1000) * SIM.velocidad;   // la velocidad se puede cambiar en pleno juego
    seg += dt; antes = ahora;
    let j = j0; while (j < ultimo && ts[j + 1] <= seg) j++;
    const lento = j < ultimo && ts[j + 1] - ts[j] > 0.1;
    Mo.frac = lento ? (seg - ts[j]) / (ts[j + 1] - ts[j]) : 0;
    const hora = ini + j;
    if (hora !== Mo.hora) { Mo.hora = hora; actualizarNumeros(); pintarLineaSim(); }
    if (SIM.vista === "mapa") dibujarAgua();
    if (SIM.vista === "maqueta" && SIM.maqueta) {
      const dur = j < ultimo ? ts[j + 1] - ts[j] : 1, lam = dur > 0 ? (escurre[j] * Math.min(dt, dur)) / dur : 0;
      avanzarLluvia(SIM.maqueta.lluvia, lam, Math.min(dt, 0.2) / Math.max(0.3, SIM.velocidad));
      actualizarMaqueta(); hudReproduccion(Mo);
    }
    if (j >= ultimo && !Mo.corriendo) { detenerAnimaciones(); btn.innerHTML = icono("play"); return; }   // ▶ solo reproduce o pausa: repetir es el botón de al lado
    SIM.reproduciendo = requestAnimationFrame(cuadro);
  };
  SIM.reproduciendo = requestAnimationFrame(cuadro);
}

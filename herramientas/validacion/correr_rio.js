// Validación del río contra el radar: en el lugar abierto (?punto=…&radio=…), con la altura del río de un día real
// (window.__RIO = { dRio, horas }), devuelve dónde queda agua de 10 cm o más según
//  · la fórmula del peor Niño (aguaEvento de simulador.js: tierra conectada al río por debajo de su nivel), y
//  · el modelo 3D (hidraulica.js), sin lluvia, con el río a esa altura durante `horas` horas.
(async () => {
  const P = window.__RIO, e = (ms) => new Promise((r) => setTimeout(r, ms)), t00 = performance.now();
  abrirSimulador();
  for (let i = 0; i < 240 && !SIM.datos; i++) await e(500);
  const d = SIM.datos;
  if (!d) return JSON.stringify({ error: "sin datos del simulador" });
  for (let i = 0; i < 120 && !(SIM.mapa?.loaded() && SIM.mapa?.areTilesLoaded()); i++) await e(500);
  for (let i = 0; i < 240 && !SIM.hist; i++) await e(500);
  await e(1500);
  for (let i = 0; i < 60 && SIM.modelo?.corriendo; i++) await e(500);
  SIM.modelo?.worker?.terminate(); SIM.modelo = null;
  if (!SIM.hist?.est) return JSON.stringify({ error: "sin estación del INA a menos de 15 km" });
  const L = rasgosLugar(), g = L.g, D = d.D, Z = 256 * 2 ** D.z;
  const lon = (X) => (X / Z) * 360 - 180, lat = (Y) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * Y) / Z))) * 180) / Math.PI;
  const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode(...u8.subarray(i, i + 8192)); return btoa(s); };
  const formula = aguaEvento(L, 0, 0, P.dRio), mF = Uint8Array.from(formula.prof, (v) => (v >= AGUA_MIN ? 1 : 0));
  const n = P.horas, suelo = SIM.hist.suelo, hMax = new Float32Array(g.N);
  await new Promise((ok) => {
    const w = new Worker("hidraulica.js");
    w.onmessage = (ev) => {
      const m = ev.data;
      if (m.tipo === "hora") for (let c = 0; c < g.N; c++) { const p = m.h[c] - g.cauce[c]; if (p > hMax[c]) hMax[c] = p; }
      else if (m.tipo === "fin") { w.terminate(); ok(); }
    };
    w.postMessage({ tipo: "iniciar", nx: g.nx, ny: g.ny, dx: g.dx, z: g.z, tipo2: g.tipo2, lago: g.lago, nMan: g.nMan, imp: g.imp, suelo, theta0: 0.25,
      desague: 0, crecida: 0, relEvac: new Float32Array(n).fill(P.dRio), cuantilOrilla: 0.4, lluvia: new Float32Array(n), et0: new Float32Array(n) });
  });
  const mH = Uint8Array.from(hMax, (v) => (v >= AGUA_MIN ? 1 : 0)), X0 = D.tx0 * 256 + g.bx0, Y0 = D.ty0 * 256 + g.by0;
  return JSON.stringify({ estacion: SIM.hist.est.estacion, ref: SIM.hist.est.ref, dRio: P.dRio, personas_formula: Math.round(formula.personas), seg: Math.round((performance.now() - t00) / 1000),
    grilla: { nx: g.nx, ny: g.ny, dx: g.dx, oeste: lon(X0), este: lon(X0 + g.nx * g.f), norte: lat(Y0), sur: lat(Y0 + g.ny * g.f),
      tierra: b64(Uint8Array.from(g.tipo2, (v) => (v === 1 ? 1 : 0))), dentro: b64(g.dentroC), pob: Array.from(g.pob, (v) => Math.round(v)) },
    formula: b64(mF), modelo3d: b64(mH) });
})()

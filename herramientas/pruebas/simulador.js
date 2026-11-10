// Abre el simulador en el punto del link, espera a que el modelo termine y devuelve un resumen (sin imágenes)
abrirSimulador(); (async () => {
  const e = (ms) => new Promise((r) => setTimeout(r, ms)), t0 = performance.now();
  for (let i = 0; i < 120 && !SIM.datos; i++) await e(500);
  for (let i = 0; i < 400 && (!SIM.modelo || SIM.modelo.corriendo); i++) await e(500);
  const M = SIM.modelo; if (!M?.g) return "sin modelo: " + document.getElementById("sim-progreso")?.textContent;
  const k = M.cuenta, g = M.g, tipos = [0, 0, 0, 0]; g.tipo2.forEach((v) => tipos[v]++);
  const pico = M.stats[M.pico], ll = (tp) => M.met.lluvia.reduce((a, v, j) => a + (M.met.tipo[j] === tp ? v : 0), 0);
  return JSON.stringify({ seg: ((performance.now() - t0) / 1000).toFixed(0), horas: M.frames.length, grilla: `${g.nx}x${g.ny} celdas de ${g.dx.toFixed(0)} m`,
    celdas_tierra_lago_rio: tipos.slice(1), lagunas: g.nLagos, lluvia_real_mm: ll(0).toFixed(0), lluvia_pron_mm: ll(1).toFixed(0), lluvia_esc_mm: ll(2).toFixed(0),
    pico: { hora: M.pico, pct: pico.pct.toFixed(2), km2: pico.km2.toFixed(3), prof_max: pico.maxProf.toFixed(2), personas: Math.round(pico.personas) },
    balance_pct: (100 * (k.lluvia - k.infiltrada - k.desague - k.evaporada - k.salida - k.superficie - k.lagos - k.rio) / Math.max(1, k.lluvia)).toFixed(2),
    infiltrada_pct: (100 * k.infiltrada / Math.max(1, k.lluvia)).toFixed(0), lagos_m3: k.lagos.toFixed(0), rio_m3: k.rio.toFixed(0), texto: document.getElementById("sim-acum").innerText.slice(0, 120) });
})()

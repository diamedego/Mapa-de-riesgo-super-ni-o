// Período largo: 3 meses (14 días reales + 16 de pronóstico + escenario estacional)
abrirSimulador(); (async () => {
  const e = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 120 && !SIM.datos; i++) await e(500);
  for (let i = 0; i < 400 && (!SIM.modelo || SIM.modelo.corriendo); i++) await e(500);
  const t0 = performance.now();
  simularPeriodo(sumarDias(limitesPeriodo().hoy, 89));
  await e(1500);
  for (let i = 0; i < 1200 && SIM.modelo.corriendo; i++) await e(500);
  const M = SIM.modelo, k = M.cuenta, ll = (tp) => M.met.lluvia.reduce((a, v, j) => a + (M.met.tipo[j] === tp ? v : 0), 0);
  return JSON.stringify({ seg: ((performance.now() - t0) / 1000).toFixed(0), horas: M.frames.length, celda_m: M.g.dx.toFixed(0), real: ll(0).toFixed(0), pron: ll(1).toFixed(0), esc: ll(2).toFixed(0),
    pico_pct: M.stats[M.pico].pct.toFixed(2), pico_fecha: new Date(M.met.horas[M.pico]).toISOString().slice(0, 10), prof_max: M.stats[M.pico].maxProf.toFixed(2),
    infiltrada_pct: (100 * k.infiltrada / k.lluvia).toFixed(0), evaporada_pct: (100 * k.evaporada / k.lluvia).toFixed(0),
    balance_pct: (100 * (k.lluvia - k.infiltrada - k.desague - k.evaporada - k.salida - k.superficie - k.lagos - k.rio) / k.lluvia).toFixed(2) });
})()

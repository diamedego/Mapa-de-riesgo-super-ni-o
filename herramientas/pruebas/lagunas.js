// Corrientes: tormenta de prueba de 150 mm sobre una zona con lagunas; las lagunas tienen que subir de nivel
abrirSimulador(); (async () => {
  const e = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 120 && !SIM.datos; i++) await e(500);
  for (let i = 0; i < 400 && (!SIM.modelo || SIM.modelo.corriendo); i++) await e(500);
  simularPeriodo(sumarDias(limitesPeriodo().hoy, 2), 150);
  await e(1500);
  for (let i = 0; i < 400 && SIM.modelo.corriendo; i++) await e(500);
  const M = SIM.modelo, k = M.cuenta, fin = M.lagos.at(-1), antes = M.lagos[M.hoy];
  const suben = fin.map((v, l) => v - antes[l]).sort((a, b) => b - a);
  return JSON.stringify({ lagunas: M.g.nLagos, subida_lagunas_m: suben.slice(0, 5).map((v) => v.toFixed(2)), pico_pct: M.stats[M.pico].pct.toFixed(1),
    prof_max: M.stats[M.pico].maxProf.toFixed(2), personas: Math.round(M.stats[M.pico].personas), balance_pct: (100 * (k.lluvia - k.infiltrada - k.desague - k.evaporada - k.salida - k.superficie - k.lagos - k.rio) / k.lluvia).toFixed(2) });
})()

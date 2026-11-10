// Prueba del modelo hidráulico: un cuenco, 50 mm en 1 h y 24 h secas. El agua tiene que juntarse en el centro y cerrar el balance.
(async () => {
  const nx = 60, ny = 60, dx = 30, N = nx * ny, z = new Float32Array(N), c = 29.5;
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) { const r = Math.hypot(x - c, y - c) * dx; z[y * nx + x] = 10 + 0.000004 * r * r; }
  const lluvia = new Float32Array(25); lluvia[0] = 50;
  const w = new Worker("hidraulica.js"), t0 = performance.now(); let ultima = null;
  const fin = await new Promise((ok) => { w.onmessage = (e) => { if (e.data.tipo === "hora") ultima = e.data.h; if (e.data.tipo === "fin") ok(e.data); }; w.onerror = (e) => ok({ error: e.message });
    w.postMessage({ tipo: "iniciar", nx, ny, dx, z, tipo2: new Uint8Array(N).fill(1), lago: new Int32Array(N).fill(-1), nMan: new Float32Array(N).fill(0.035),
      imp: new Float32Array(N), suelo: { ks: 1, psi: 316, thetaS: 0.475 }, theta0: 0.3, desague: 0, crecida: 0, lluvia, et0: new Float32Array(25) }); });
  if (fin.error) return "ERROR " + fin.error;
  const k = fin.cuenta, cerr = k.lluvia - k.infiltrada - k.desague - k.evaporada - k.salida - k.superficie - k.lagos;
  let hc = 0; for (let y = 28; y < 32; y++) for (let x = 28; x < 32; x++) hc = Math.max(hc, fin.hMax[y * nx + x]);
  return JSON.stringify({ seg: ((performance.now() - t0) / 1000).toFixed(1), lluvia_m3: k.lluvia.toFixed(0), infiltrada: k.infiltrada.toFixed(0), superficie: k.superficie.toFixed(0),
    salida: k.salida.toFixed(0), error_balance_pct: (100 * cerr / k.lluvia).toFixed(3), prof_max_centro_m: hc.toFixed(3), prof_max_esquina_m: fin.hMax[0].toFixed(3), prof_final_centro_m: ultima[29 * nx + 29].toFixed(3), teoria_equilibrio_m: Math.sqrt(2 * 0.000004 * k.superficie / Math.PI).toFixed(3) });
})()

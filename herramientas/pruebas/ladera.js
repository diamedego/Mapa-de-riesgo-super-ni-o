// Prueba contra la teoría: ladera con 1 % de pendiente, 50 mm/h durante 4 h, sin infiltración.
// En régimen permanente, a una distancia L desde arriba: q = i·L y h = (q·n / √S)^(3/5) (Manning).
(async () => {
  const nx = 80, ny = 60, dx = 30, N = nx * ny, S0 = 0.01, n = 0.03, z = new Float32Array(N);
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) z[y * nx + x] = 50 - S0 * x * dx;
  const horas = 4, lluvia = new Float32Array(horas).fill(50);
  const w = new Worker("hidraulica.js");
  let ultima = null;
  const fin = await new Promise((ok) => { w.onmessage = (e) => { if (e.data.tipo === "hora") ultima = e.data.h; if (e.data.tipo === "fin") ok(e.data); };
    w.postMessage({ tipo: "iniciar", nx, ny, dx, z, tipo2: new Uint8Array(N).fill(1), lago: new Int32Array(N).fill(-1), nMan: new Float32Array(N).fill(n),
      imp: new Float32Array(N).fill(1), suelo: { ks: 1, psi: 300, thetaS: 0.45 }, theta0: 0.45, desague: 0, crecida: 0, lluvia, et0: new Float32Array(horas) }); });
  const i = 50 / 1000 / 3600, fila = 30, out = [];
  for (const x of [20, 40, 60]) {
    const L = (x + 0.5) * dx, teor = Math.pow(i * L * n / Math.sqrt(S0), 0.6);
    out.push(`x=${L.toFixed(0)} m: modelo ${(ultima[fila * nx + x] * 100).toFixed(2)} cm, teoría ${(teor * 100).toFixed(2)} cm`);
  }
  const k = fin.cuenta, err = 100 * (k.lluvia - k.infiltrada - k.desague - k.evaporada - k.salida - k.superficie) / k.lluvia;
  return out.join(" | ") + ` | balance ${err.toFixed(3)} %`;
})()

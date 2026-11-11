// Validación del simulador: repite temporadas reales con el mismo modelo del sitio (hidraulica.js y grillaModelo) y devuelve,
// por celda, dónde hubo agua. Lo lanza validar.py con window.__VAL = { temporadas: [{ nombre, desde, hasta, crecida }] }.
// - Lluvia, evapotranspiración y humedad inicial del suelo: Open-Meteo, archivo histórico hora por hora (ERA5).
// - Río: altura diaria medida por el INA en la estación más cercana, como crecida sobre su mediana 2015-2026.
// - Celda "con agua en el mes": 10 cm o más durante al menos la mitad de las horas del mes (como la moda mensual de Dynamic World).
(async () => {
  const P = window.__VAL, e = (ms) => new Promise((r) => setTimeout(r, ms)), t00 = performance.now();
  abrirSimulador();
  for (let i = 0; i < 240 && !SIM.datos; i++) await e(500);
  const d = SIM.datos;
  if (!d) return JSON.stringify({ error: "sin datos del simulador" });
  for (let i = 0; i < 120 && !(SIM.mapa?.loaded() && SIM.mapa?.areTilesLoaded()); i++) await e(500);
  await e(1500);
  for (let i = 0; i < 60 && SIM.modelo?.corriendo; i++) await e(500);   // la corrida automática de hoy: se deja terminar y se descarta
  SIM.modelo?.worker?.terminate(); SIM.modelo = null;
  const suelo = (await sueloEn(d.s.punto).catch(() => null)) ?? { ...TEXTURAS.franco, nombre: "franco", supuesto: true };
  const D = d.D, Z = 256 * 2 ** D.z;
  const lon = (X) => (X / Z) * 360 - 180, lat = (Y) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * Y) / Z))) * 180) / Math.PI;
  const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode(...u8.subarray(i, i + 8192)); return btoa(s); };
  const fechaArt = (ms) => new Date(ms - 3 * 3600e3).toISOString().slice(0, 10);
  const out = { suelo: suelo.nombre, fuente: D.fuente, temporadas: {} };
  for (const T of P.temporadas) {
    const [lo, la] = d.s.punto.map((v) => v.toFixed(3));
    const u = `https://archive-api.open-meteo.com/v1/archive?latitude=${la}&longitude=${lo}&start_date=${T.desde}&end_date=${T.hasta}`
      + "&hourly=precipitation,et0_fao_evapotranspiration,soil_moisture_0_to_7cm&timezone=America%2FArgentina%2FBuenos_Aires";
    const a = await fetch(u).then((r) => r.json());
    const horas = a.hourly.time.map((x) => Date.parse(`${x}:00-03:00`));
    const lluvia = Float32Array.from(a.hourly.precipitation, (v) => v ?? 0), et0 = Float32Array.from(a.hourly.et0_fao_evapotranspiration, (v) => v ?? 0);
    const theta0 = a.hourly.soil_moisture_0_to_7cm.find((v) => v != null) ?? 0.25;
    const n = horas.length, g = grillaModelo(d, n);
    // Río: crecida del día (si falta un día, la del último medido)
    let ultima = 0;
    const serieHora = (obj) => { let u = null; const a = Float32Array.from(horas, (ms) => { const v = obj[fechaArt(ms)]; if (v != null) u = v; return u ?? 0; }); return a; };
    const crecidaHora = T.crecida ? Float32Array.from(horas, (ms) => { const v = T.crecida[fechaArt(ms)]; if (v != null) ultima = v; return ultima; }) : null;
    const relEvac = T.relEvac ? serieHora(T.relEvac) : null;
    const mesDe = horas.map((ms) => { const f = new Date(ms - 3 * 3600e3); return f.getUTCFullYear() * 12 + f.getUTCMonth(); });
    const m0 = Math.min(...mesDe), nm = Math.max(...mesDe) - m0 + 1, horasMes = new Uint16Array(nm);
    mesDe.forEach((m) => horasMes[m - m0]++);
    const mojadas = Array.from({ length: nm }, () => new Uint16Array(g.N)), hMax = new Float32Array(g.N);
    const t0 = performance.now();
    const fin = await new Promise((ok) => {
      const w = new Worker("hidraulica.js");
      w.onmessage = (ev) => {
        const m = ev.data;
        if (m.tipo === "hora") {
          const M = mojadas[mesDe[m.k] - m0];
          for (let c = 0; c < g.N; c++) { const p = m.h[c] - g.cauce[c]; if (p >= 0.1) M[c]++; if (p > hMax[c]) hMax[c] = p; }
        } else if (m.tipo === "fin") { w.terminate(); ok(m); }
      };
      w.postMessage({ tipo: "iniciar", nx: g.nx, ny: g.ny, dx: g.dx, z: g.z, tipo2: g.tipo2, lago: g.lago, nMan: g.nMan, imp: g.imp, suelo,
        theta0, desague: SIM.desague, crecida: crecidaHora ? crecidaHora[0] : 0, crecidaHora: relEvac ? null : crecidaHora, relEvac, cuantilOrilla: P.cuantil ?? 0.4, lluvia, et0 });
    });
    const mes = new Uint8Array(g.N), alguna = new Uint8Array(g.N);
    for (let c = 0; c < g.N; c++) {
      alguna[c] = hMax[c] >= 0.1 ? 1 : 0;
      for (let k = 0; k < nm; k++) if (horasMes[k] && mojadas[k][c] >= horasMes[k] / 2) { mes[c] = 1; break; }
    }
    const k = fin.cuenta;
    out.temporadas[T.nombre] = { horas: n, seg: Math.round((performance.now() - t0) / 1000), lluvia_mm: Math.round(lluvia.reduce((x, y) => x + y, 0)),
      crecida_max: crecidaHora ? Math.max(...crecidaHora) : null, balance_pct: (100 * (k.lluvia - k.infiltrada - k.desague - k.evaporada - k.salida - k.superficie - k.lagos - k.rio)) / Math.max(1, k.lluvia),
      mes: b64(mes), alguna: b64(alguna) };
    if (!out.grilla) {
      const tierra = Uint8Array.from(g.tipo2, (v) => (v === 1 ? 1 : 0));
      const X0 = D.tx0 * 256 + g.bx0, Y0 = D.ty0 * 256 + g.by0;
      out.grilla = { nx: g.nx, ny: g.ny, dx: g.dx, oeste: lon(X0), este: lon(X0 + g.nx * g.f), norte: lat(Y0), sur: lat(Y0 + g.ny * g.f),
        tierra: b64(tierra), dentro: b64(g.dentroC), pob: Array.from(g.pob, (v) => Math.round(v)) };
    }
  }
  out.seg_total = Math.round((performance.now() - t00) / 1000);
  return JSON.stringify(out);
})()

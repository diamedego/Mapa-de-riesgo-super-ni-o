// Tanda 7: simulador con tormenta de prueba; devuelve calles cortadas, aislados, salud, confianza, antecedentes y uso del suelo
abrirSimulador(); (async () => {
  const e = (ms) => new Promise((r) => setTimeout(r, ms)), t0 = performance.now(), r = {};
  for (let i = 0; i < 120 && !SIM.datos; i++) await e(500);
  for (let i = 0; i < 400 && (!SIM.modelo || SIM.modelo.corriendo); i++) await e(500);
  // tormenta fuerte de prueba (el primer botón de tormentas)
  document.querySelector(".sim-presets .chip[data-i]")?.click(); await e(1000);
  for (let i = 0; i < 400 && (!SIM.modelo || SIM.modelo.corriendo); i++) await e(500);
  const M = SIM.modelo, g = M?.g;
  if (!g) return "sin modelo: " + document.getElementById("sim-progreso")?.textContent;
  let calles = 0, puentes = 0; g.ruta.forEach((v) => { if (v === 1) calles++; else if (v === 2) puentes++; });
  r.seg = ((performance.now() - t0) / 1000).toFixed(0);
  r.grilla = `${g.nx}x${g.ny} de ${g.dx.toFixed(0)} m · celdas con calle ${calles}, con puente ${puentes}, calles dentro ${g.nRuta} · salud ${M.salud?.length}`;
  r.tiles = [...document.querySelectorAll(".sim-datos .tb-dato")].map((d) => d.textContent.replace(/\s+/g, " ").trim());
  r.conf = `${document.getElementById("sim-conf").textContent} | ${document.getElementById("sim-conf").dataset.ayuda}`;
  r.validez = document.querySelector(".sim-validez")?.textContent.slice(0, 80);
  r.antecedentes = [...document.querySelectorAll("#sim-ant li")].map((l) => l.textContent);
  r.supuestos = document.getElementById("sim-supuestos")?.textContent.slice(-170);
  // la hora pico vs una hora seca: el aislamiento debe ser 0 sin agua
  const pico = M.pico; M.hora = 0; actualizarNumeros(); r.hora0 = [...document.querySelectorAll(".sim-datos .tb-dato-valor")].map((v) => v.textContent).join(" | ");
  M.hora = pico; actualizarNumeros(); r.pico = [...document.querySelectorAll(".sim-datos .tb-dato-valor")].map((v) => v.textContent).join(" | ");
  const tA = performance.now(); for (let j = 0; j < 20; j++) accesoHora(M); r.ms_acceso = ((performance.now() - tA) / 20).toFixed(1);
  return JSON.stringify(r, null, 1);
})()

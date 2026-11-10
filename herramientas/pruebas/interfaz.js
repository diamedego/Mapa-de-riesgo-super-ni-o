// Recorre la interfaz del simulador y devuelve qué funciona (sin imágenes)
abrirSimulador(); (async () => {
  const e = (ms) => new Promise((r) => setTimeout(r, ms)), r = {};
  for (let i = 0; i < 120 && !SIM.datos; i++) await e(500);
  for (let i = 0; i < 400 && (!SIM.modelo || SIM.modelo.corriendo); i++) await e(500);
  const M = SIM.modelo;
  r.linea = !!document.querySelector("#sim-linea svg"); r.fecha = document.getElementById("sim-fecha").textContent; r.tipo = document.getElementById("sim-tipo").textContent;
  r.numeros = [...document.querySelectorAll(".sim-datos .tb-dato-valor")].map((x) => x.textContent).join(" | ");
  document.getElementById("sim-barra").value = String(M.hoy + 5); document.getElementById("sim-barra").dispatchEvent(new Event("input")); await e(300);
  r.barra_ok = M.hora === M.hoy + 5;
  document.getElementById("sim-play").click(); await e(1500); r.play_avanza = M.hora > M.hoy + 5; document.getElementById("sim-play").click();
  await elegirVistaSimulador("maqueta"); await e(2500);
  r.maqueta = !!SIM.maqueta && !SIM.maqueta.capa.hidden;
  document.getElementById("sim-play").click(); await e(1500); r.lineas_activas = SIM.maqueta.part.activa; document.getElementById("sim-play").click();
  document.getElementById("sim-ver-corte")?.click(); await e(500); r.corte3d = SIM.corte3d && SIM.maqueta.tapa.children.length > 0; document.getElementById("sim-ver-corte")?.click();
  await elegirVistaSimulador("mapa"); await e(800); r.volvio_mapa = SIM.vista === "mapa";
  r.rio_visible = !document.getElementById("sim-rio").hidden;
  r.desborde = document.documentElement.scrollWidth > innerWidth;
  return JSON.stringify(r);
})()

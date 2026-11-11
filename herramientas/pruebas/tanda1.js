// Tanda 1: botón arriba del mapa, radio con barra, mapa topográfico, referencias y fecha en la maqueta
(async () => {
  const e = (ms) => new Promise((r) => setTimeout(r, ms)), r = {};
  const b = document.getElementById("btn-sim-top");
  r.boton = !!b && b.textContent.trim(); r.ayuda = b?.dataset.ayuda;
  r.boton_panel_viejo = !!document.querySelector("#tablero .btn-sim");
  r.barra_radio = !!document.getElementById("tb-radio"); r.tipo = document.getElementById("tb-tipo-txt")?.textContent;
  r.ver_todo = document.querySelector(".tb-ver-todo")?.textContent ?? null;
  r.periodo_repetido = !!document.querySelector("#tablero .tb-periodo");
  b.click();
  for (let i = 0; i < 120 && !SIM.datos; i++) await e(500);
  for (let i = 0; i < 300 && (!SIM.modelo || SIM.modelo.corriendo); i++) await e(500);
  r.topo = !!document.querySelector(".sim-topo"); r.topo_titulo = document.querySelector("#sim-corte .sim-corte-titulo:last-of-type")?.textContent;
  r.intervalo = SIM.datos.intervalo; r.curvas_mayores = SIM.datos.topo?.segs.filter((x) => x.mayor).length;
  await elegirVistaSimulador("maqueta"); await e(2500);
  r.refs3d_boton = !document.querySelector(".sim-refs3d").hidden; r.refs_capa = !!SIM.maqueta.refs;
  r.fecha_sat = document.querySelector(".sim-credito-sat")?.textContent.slice(0, 45);
  document.querySelector(".sim-refs3d").click(); await e(300); r.refs_apagadas = SIM.capas.refs3d === false;
  return JSON.stringify(r);
})()

(async () => {
  const e = (ms) => new Promise((r) => setTimeout(r, ms)), r = {};
  r.texto_actual = document.getElementById("periodo-texto").textContent;
  r.linea_bajo_mapa_oculta = document.getElementById("linea-tiempo").hidden;
  elegirModo("futuro"); await e(800);
  const de = document.getElementById("f-desde"), ha = document.getElementById("f-hasta");
  r.casilleros = `${de.type} ${de.value} → ${ha.value} (máx ${ha.max})`; r.texto_futuro = document.getElementById("periodo-texto").textContent;
  ha.value = ha.max; ha.dispatchEvent(new Event("change")); await e(800); r.texto_cambiado = document.getElementById("periodo-texto").textContent;
  r.evol = !!document.querySelector(".tb-evol"); r.hitos = document.querySelectorAll(".tb-evol-hito").length;
  document.querySelector('[data-accion="evol"]').click(); await e(3800); r.relleno = document.querySelector(".tb-evol-relleno")?.style.width; r.ahora = document.querySelector(".tb-evol-ahora")?.textContent;
  detenerReproduccion();
  await elegirCapa("lluvia"); await e(1500);
  r.lluvia = `${document.getElementById("f-desde").type} ${document.getElementById("f-desde").value} → ${document.getElementById("f-hasta").value} | ${document.getElementById("periodo-texto").textContent}`;
  const f = document.getElementById("form-buscar").getBoundingClientRect(); r.filtros_alto_px = Math.round(f.height);
  return JSON.stringify(r);
})()

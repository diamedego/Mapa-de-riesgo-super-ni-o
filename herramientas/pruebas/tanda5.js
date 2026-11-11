// Tanda 5: análisis debajo del mapa con 3 gráficos en una fila que siguen los filtros (como Power BI) y "Borrar filtros"
(async () => {
  const e = (ms) => new Promise((r) => setTimeout(r, ms)), r = {};
  const es = Object.keys(TEXTOS.es), en = Object.keys(TEXTOS.en);
  r.claves = `es ${es.length} en ${en.length} | faltan en EN: ${es.filter((k) => !en.includes(k)).join(",") || "-"} | faltan en ES: ${en.filter((k) => !es.includes(k)).join(",") || "-"}`;
  const an = () => document.getElementById("analisis");
  const leer = () => {
    const bloques = [...an().querySelectorAll(".an-grilla.tres > .an-bloque")];
    return {
      titulo: an().querySelector("h2")?.textContent, filtros: an().querySelector(".an-filtros")?.textContent.replace(/\s+/g, " ").trim(),
      bloques: bloques.map((b) => b.querySelector("h3").textContent), misma_fila: new Set(bloques.map((b) => Math.round(b.getBoundingClientRect().top))).size === 1,
      tablas: an().querySelectorAll("table, .calor").length,
      resaltadas: [...an().querySelectorAll(".rk-resaltada .rk-nombre")].map((x) => `${x.closest(".fila-rk").querySelector(".rk-pos").textContent}. ${x.firstChild.textContent}`),
      paneles: [...an().querySelectorAll(".panel-tit")].map((b) => b.textContent.replace(/\s+/g, " ").trim()),
      explica: [...an().querySelectorAll(".apilada-leyenda li")].map((li) => li.textContent).join(" | "),
      hallazgo: an().querySelector(".hallazgo")?.textContent,
    };
  };
  r.pais = leer();
  const campana = estado.lugares.find((l) => l.nivel === "gl" && l.nombre === "Campana");
  elegirLugar("localidad", campana); await e(2500);
  r.campana = leer();
  r.casilleros = [...document.querySelectorAll(".buscador .campo")].map((c) => `${c.querySelector("label").textContent}=${c.querySelector("input,select")?.value}${c.classList.contains("activo") ? "*" : ""}`).join(" | ");
  // tocar otro municipio en el Pareto: pasa a ser el filtro y completa los casilleros de arriba
  const otra = [...an().querySelectorAll("#an-pareto .fila-rk:not(.rk-resaltada)")][0];
  const nombreOtra = otra.querySelector(".rk-nombre").firstChild.textContent;
  otra.click(); await e(2500);
  r.clic_pareto = `${nombreOtra} → sel ${estado.sel?.lugar?.nombre} · casillero localidad ${document.getElementById("b-localidad").value} · resaltada ${leer().resaltadas.join(",")}`;
  elegirLugar("localidad", campana); await e(2000);
  await elegirCapa("lluvia"); await e(2500);
  r.lluvia_campana = leer();
  r.personas_svg = !!an().querySelector("#an-personas svg");
  // tocar un día en los paneles: pasa a condiciones futuras con ese día
  an().querySelectorAll("#an-paneles .golpe")[5].dispatchEvent(new MouseEvent("click", { bubbles: true })); await e(2000);
  r.clic_dia = `${estado.modo} ${JSON.stringify(estado.rangoDias)} · filtros: ${leer().filtros} · período marcado ${document.getElementById("periodo-futuro").classList.contains("activo")} · borrar visible ${!document.getElementById("btn-borrar").hidden}`;
  an().querySelector(".an-borrar").click(); await e(2500);
  r.borrar = `sel ${estado.sel} · modo ${estado.modo} · ${leer().filtros} · casilleros vacíos ${[...document.querySelectorAll(".buscador input")].every((x) => !x.value)} · borrar oculto ${document.getElementById("btn-borrar").hidden}`;
  const cba = estado.lugares.find((l) => l.nivel === "prov" && l.nombre === "Córdoba");
  elegirLugar("provincia", cba); await e(2500);
  r.cordoba_lluvia = leer();
  await elegirCapa("riesgo"); await e(2000);
  r.cordoba_riesgo = leer();
  // un punto fuera de la zona elegida: todo pasa al punto
  const sf = estado.lugares.find((l) => l.nivel === "gl" && l.nombre === "Santa Fe");
  elegirLugar("localidad", sf); await e(2000);
  seleccionarPunto([-58.83, -27.47], { volar: false }); await e(4000);
  r.punto_fuera = `sel ${estado.sel?.tipo} · provincia ${document.getElementById("b-provincia").value} · localidad ${document.getElementById("b-localidad").value} · análisis ${leer().titulo} · resaltada ${leer().resaltadas.join(",")}`;
  r.ancho = `${document.documentElement.scrollWidth}/${innerWidth}`;
  return JSON.stringify(r, null, 1);
})()

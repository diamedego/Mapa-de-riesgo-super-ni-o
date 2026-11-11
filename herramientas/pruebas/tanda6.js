// Tanda 6: encabezado (situación del país, zonas de mayor riesgo, actualización), fuentes por tipo y recorrido guiado
(async () => {
  const e = (ms) => new Promise((r) => setTimeout(r, ms)), r = {};
  const es = Object.keys(TEXTOS.es), en = Object.keys(TEXTOS.en);
  r.claves = `es ${es.length} en ${en.length} | faltan en EN: ${es.filter((k) => !en.includes(k)).join(",") || "-"} | faltan en ES: ${en.filter((k) => !es.includes(k)).join(",") || "-"}`;
  r.bajada = document.querySelector(".bajada").textContent.slice(0, 90);
  r.intro = [...document.querySelectorAll("#intro .intro-fila")].map((f) => f.textContent.replace(/\s+/g, " ").trim());
  // Fuentes
  document.querySelector(".intro-fuentes").click(); await e(400);
  const d = document.getElementById("fuentes");
  r.fuentes = `abierta ${d?.open} · ${d.querySelectorAll(".fuentes-grupo").length} grupos · ${d.querySelectorAll(".fuente").length} fuentes · con fecha: ${[...d.querySelectorAll(".fuente-pie b")].map((b) => b.textContent).join(", ")} · hash ${location.hash}`;
  d.querySelector("[data-cerrar]").click(); await e(300);
  r.fuentes_cerrada = `${d.open} · hash "${location.hash}"`;
  // Zona de mayor riesgo
  const z = document.querySelector(".intro-zona"); const nz = z.textContent.trim().split("\n")[0];
  z.click(); await e(2500);
  r.zona_clic = `${nz} → ${estado.sel?.lugar?.nombre}`;
  borrarTodo(); await e(1500);
  // Recorrido
  scrollTo(0, 0); await e(300);
  document.getElementById("btn-recorrido").click(); await e(900);
  const pasos = [];
  for (let k = 0; k < 15; k++) {
    const c = document.querySelector(".guia-cartel"), f = document.querySelector(".guia-foco");
    if (!c) break;
    const rc = c.getBoundingClientRect(), rf = f.getBoundingClientRect();
    const dentro = rc.top >= 0 && rc.bottom <= innerHeight && rc.left >= 0 && rc.right <= innerWidth;
    const focoVisible = rf.bottom > 0 && rf.top < innerHeight;
    const tapa = !(rc.bottom <= rf.top || rc.top >= rf.bottom || rc.right <= rf.left || rc.left >= rf.right);
    pasos.push(`${c.querySelector(".rec-paso").textContent} ${c.querySelector("h3").textContent} | cartel adentro ${dentro} | foco visible ${focoVisible} | tapa ${tapa} | scrollY ${Math.round(scrollY)}`);
    c.querySelector(".btn-primario").click(); await e(1100);
  }
  r.recorrido = pasos;
  r.cerrado = !document.querySelector(".guia-cartel");
  // Inglés: encabezado y un paso del recorrido
  estado.idioma = "en"; aplicarIdioma(); await e(1500);
  r.intro_en = document.querySelector("#intro .intro-fila").textContent.replace(/\s+/g, " ").trim();
  document.getElementById("btn-recorrido").click(); await e(800);
  r.paso_en = document.querySelector(".guia-cartel h3")?.textContent;
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); await e(300);
  r.esc_cierra = !document.querySelector(".guia-cartel");
  r.ancho = `${document.documentElement.scrollWidth}/${innerWidth}`;
  return JSON.stringify(r, null, 1);
})()

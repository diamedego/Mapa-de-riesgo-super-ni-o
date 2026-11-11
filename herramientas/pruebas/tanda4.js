// Tanda 4: "Situación" en viñetas con tortas y "Qué hacer" según el lugar (país, municipio, círculo, inglés, lluvia)
(async () => {
  const e = (ms) => new Promise((r) => setTimeout(r, ms)), r = {};
  const es = Object.keys(TEXTOS.es), en = Object.keys(TEXTOS.en);
  r.claves = `es ${es.length} en ${en.length} | faltan en EN: ${es.filter((k) => !en.includes(k)).join(",") || "-"} | faltan en ES: ${en.filter((k) => !es.includes(k)).join(",") || "-"}`;
  const leer = () => {
    const sit = document.querySelector(".tb-situacion");
    if (!sit) return "SIN SITUACIÓN";
    return {
      titulo: sit.querySelector("h3")?.textContent, sub: sit.querySelector(".tb-sub")?.textContent?.slice(0, 50),
      vinetas: [...sit.querySelectorAll(".tb-vinetas li")].map((li) => li.textContent.replace(/\s+/g, " ").trim()),
      tortas: [...sit.querySelectorAll(".torta-fig")].map((f) => `${f.querySelector("figcaption").textContent}: ${f.querySelector(".torta-centro")?.textContent ?? f.textContent.slice(-20)} [${f.querySelectorAll(".torta-arco").length} porciones] ${[...f.querySelectorAll(".torta-ley li")].map((l) => l.textContent.replace(/\s+/g, " ")).join(" | ")}`),
      que_hacer: [...sit.querySelectorAll("h4")].map((h) => `${h.textContent}: ${[...h.nextElementSibling.querySelectorAll("li")].map((l) => l.textContent).join(" // ")}`),
      pie: sit.querySelector(".tb-acc-pie")?.textContent?.slice(0, 40), nota_alineada: getComputedStyle(sit.querySelector(".tb-nota")).textAlign,
      evolucion_mensual: !!document.getElementById("tb-evol"), subnotas: [...document.querySelectorAll("#tablero .tb-bloque > .tb-sub")].map((p) => p.textContent.slice(0, 30)),
    };
  };
  r.pais = leer();
  const santaFe = estado.lugares.find((l) => l.nivel === "gl" && l.nombre === "Santa Fe");
  elegirLugar("localidad", santaFe); await e(2500);
  r.santa_fe = leer();
  seleccionarPunto([-57.955, -34.921], { nombre: "La Plata centro", volar: false }); await e(4000);
  r.la_plata_punto_primero = leer();
  await e(5000);   // llegan barrios populares e infraestructura y se vuelve a pintar
  r.la_plata_punto = leer();
  estado.idioma = "en"; aplicarIdioma(); await e(2500);
  r.en = leer();
  estado.idioma = "es"; aplicarIdioma(); await e(1500);
  await elegirCapa("lluvia"); await e(2000);
  r.lluvia = leer();
  r.ancho_pagina = `${document.documentElement.scrollWidth} / ${innerWidth}`;
  return JSON.stringify(r, null, 1);
})()

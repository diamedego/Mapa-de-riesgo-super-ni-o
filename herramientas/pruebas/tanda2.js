// Tanda 2: colores, panel de capas, capas nuevas, referencias que apagan todo, fecha por mapa
(async () => {
  const e = (ms) => new Promise((r) => setTimeout(r, ms)), r = {};
  r.colores = [1, 2, 3, 4, 5].map((n) => getComputedStyle(document.documentElement).getPropertyValue(`--r${n}`).trim()).join(" ");
  r.chips = [...document.querySelectorAll(".capa-chip")].map((b) => `${b.textContent.trim()}${b.getAttribute("aria-pressed") === "true" ? "*" : ""}`).join(", ");
  r.titulo = document.querySelector("#mapa-titulo small")?.textContent;
  r.leyenda_sin_interruptores = !document.querySelector("#leyenda input[type=checkbox]");
  mapa.jumpTo({ center: [-58.40, -34.70], zoom: 12.5 }); await e(4000);
  const visibles = () => mapa.queryRenderedFeatures().map((f) => f.layer.id);
  const antes = new Set(visibles()); r.poi_base_antes = [...antes].filter((x) => /^poi/.test(x)).length; r.colectivos = mapa.queryRenderedFeatures().filter((f) => f.layer.id.startsWith("poi") && f.properties.class === "bus").length;
  document.querySelector('.capa-chip[data-k="verReferencias"]').click(); await e(1500);
  const despues = visibles(); r.refs_apagadas_quedan = despues.filter((x) => /^(poi|ref-)/.test(x)).length;
  for (const k of ["verInundadas", "verDensidad", "verBarrios", "verSuelo", "verInfra", "verRutas"]) { document.querySelector(`.capa-chip[data-k="${k}"]`).click(); await e(200); }
  await e(5000);
  const ids = new Set(visibles()); r.capas_nuevas_vistas = ["jrc-agua", "densidad-radio", "densidad-mun", "barrios-relleno", "suelo-urbano", "suelo-verde", "infra-punto", "rutas-linea"].filter((x) => ids.has(x)).join(" ");
  r.claves_leyenda = document.querySelectorAll(".ley-claves span").length;
  return JSON.stringify(r);
})()

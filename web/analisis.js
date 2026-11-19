// Lámina 03 · Reporte: la situación y qué hacer en el lugar elegido (o en el país), solo en texto, con el nombre del lugar como título.
// La situación y «Qué hacer» se arman con el tablero de la lámina 01 (tableros.js, situacionRiesgo) y se muestran acá.
const nivelIdx = (r) => (r >= 7 ? 4 : r >= 6 ? 3 : r >= 4.5 ? 2 : r >= 3 ? 1 : 0);

// Situación y «Qué hacer» de lo elegido
function pintarSituacionAnalisis() {
  const dest = document.getElementById("an-situacion");
  if (!dest) return;
  const ok = estado.situacionHtml && estado.situacionSel === estado.sel;
  dest.innerHTML = ok ? estado.situacionHtml : '<p class="an-nota">Preparando el reporte de lo elegido…</p>';
  if (ok) { prepararInfo(dest); tipsEn(dest); }
}

// Datos del lugar, en texto: habitantes expuestos en el punto (si se eligió uno), los del municipio o la zona y la posición entre sus pares de todo el país
function lineasDatosLugar() {
  const R = estado.riesgo, D = R.dias, sel = estado.sel, cmus = cmusSel().filter((c) => R.cmu[c]);
  const pob = (c) => Number(estado.porCmu.get(c)?.poblacion) || 0, exp = (cs) => cs.reduce((a, c) => a + Math.max(0, ...(R.cmu[c].xd ?? [0])), 0);
  const media = (lista, i) => { let s = 0, w = 0; for (const c of lista) { const p = Math.max(1, pob(c)); s += (R.cmu[c].r[i] ?? 0) * p; w += p; } return w ? s / w : 0; };
  const expuestos = exp(cmus), totalPob = cmus.reduce((a, c) => a + pob(c), 0);
  const u = !sel ? null : sel.tipo === "zona" ? sel.lugar : estado.lugares.find((l) => l.nivel === "gl" && l.cmus[0] === sel.cmu);
  const pct = (n, total) => (total ? fmt((100 * n) / total, n / total < 0.1 ? 2 : 1) : "0");
  const lineas = [];
  // Con un punto: los habitantes del círculo (la misma cuenta que el indicador de la lámina 01, con el mayor de los próximos días)
  const HL = sel?.tipo === "punto" && estado.habitantesLugar?.sel === sel ? estado.habitantesLugar : null;
  if (HL) {
    const n = HL.maxDias ?? HL.inundable, km = fmt(sel.km, sel.km % 1 ? 1 : 0);
    lineas.push(`<li><b>Habitantes expuestos en el punto (${escapar(t("sel_circulo")(km).toLowerCase())}):</b> ${fmt(Math.round(n))} de ${fmt(Math.round(HL.total))} (${pct(n, HL.total)} % de la población del círculo), con el máximo diario sumado.</li>`);
  }
  const donde = sel?.tipo === "punto" ? estado.porCmu.get(sel.cmu)?.nam : null;
  lineas.push(`<li><b>Habitantes expuestos${donde ? ` en ${escapar(donde)}` : ""}:</b> ${fmt(Math.round(expuestos))} de ${fmt(Math.round(totalPob))} (${pct(expuestos, totalPob)} % de la población), con el máximo diario de cada lugar sumado.</li>`);
  if (u) {
    const par = estado.lugares.filter((l) => l.nivel === u.nivel).map((l) => { const cs = l.cmus.filter((c) => R.cmu[c]); return { l, max: cs.length ? Math.max(...D.map((_, i) => media(cs, i))) : -1, exp: exp(cs) }; });
    const yo = par.find((x) => x.l === u) ?? par.find((x) => x.l.nombre === u.nombre && x.l.provincia === u.provincia);
    if (yo && yo.max >= 0) {
      const plural = { prov: "provincias", depto: "partidos y departamentos", gl: "gobiernos locales", loc: "localidades" }[u.nivel] ?? "lugares";
      const top = (clave) => { const p = 1 + par.filter((x) => x[clave] > yo[clave]).length, n = par.length, pct = Math.max(1, Math.ceil((100 * p) / n)); return `${p <= 10 ? `Top ${p}` : `Top ${pct} %`} (puesto ${fmt(p)} de ${fmt(n)} ${plural})`; };
      lineas.push(`<li><b>Posición en el país:</b> ${top("max")} por riesgo previsto (${fmt(yo.max, 1)}/10) y ${top("exp")} por habitantes expuestos.</li>`);
    }
  }
  return lineas;
}
// Vuelve a escribir solo las líneas de datos del lugar (cuando llegan los habitantes del círculo)
function pintarDatosLugarAnalisis() {
  const ul = document.querySelector(".an-datos-lugar .an-lineas");
  if (ul && estado.riesgo?.cmu) ul.innerHTML = lineasDatosLugar().join("");
}

function pintarAnalisis() {
  const cont = document.getElementById("analisis"), R = estado.riesgo;
  if (!cont || !R?.cmu) return;
  const sel = estado.sel, cmus = cmusSel().filter((c) => R.cmu[c]);
  const nombre = sel ? lugarNombre() : "Argentina";
  const hoy = fmtDiaFrase(hoyLocal(), { day: "numeric", month: "long", year: "numeric" });
  const u = !sel ? null : sel.tipo === "zona" ? sel.lugar : estado.lugares.find((l) => l.nivel === "gl" && l.cmus[0] === sel.cmu);
  const sub = !sel ? t("sub_pais") : `${escapar(u?.tipo ?? "")}${u?.provincia && u.nivel !== "prov" ? ` · ${escapar(u.provincia)}` : ""} · ${fmt(cmus.length)} ${cmus.length === 1 ? "gobierno local" : "gobiernos locales"}${sel.tipo === "punto" ? ` · ${escapar(t("sel_circulo")(fmt(sel.km, sel.km % 1 ? 1 : 0)))}` : ""}`;
  cont.innerHTML = `<div class="an an-reporte">
  <header class="an-cab"><p class="an-eyebrow">Reporte · ${escapar(hoy)}</p><h2 class="an-tit">${escapar(nombre)}</h2><p class="an-sub">${sub}</p></header>
  <section class="an-card an-datos-lugar"><ul class="an-lineas">${lineasDatosLugar().join("")}</ul></section>
  <section class="an-card an-situacion"><div id="an-situacion"></div></section>
  </div>`;
  pintarSituacionAnalisis();
}

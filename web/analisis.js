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

function pintarAnalisis() {
  const cont = document.getElementById("analisis"), R = estado.riesgo;
  if (!cont || !R?.cmu) return;
  const D = R.dias, sel = estado.sel, cmus = cmusSel().filter((c) => R.cmu[c]);
  const pob = (c) => Number(estado.porCmu.get(c)?.poblacion) || 0, exp = (cs) => cs.reduce((a, c) => a + Math.max(0, ...(R.cmu[c].xd ?? [0])), 0);
  const media = (lista, i) => { let s = 0, w = 0; for (const c of lista) { const p = Math.max(1, pob(c)); s += (R.cmu[c].r[i] ?? 0) * p; w += p; } return w ? s / w : 0; };
  const expuestos = exp(cmus), totalPob = cmus.reduce((a, c) => a + pob(c), 0);
  const nombre = sel ? lugarTitulo() : "Argentina";
  const hoy = fmtDiaFrase(hoyLocal(), { day: "numeric", month: "long", year: "numeric" });
  const u = !sel ? null : sel.tipo === "zona" ? sel.lugar : estado.lugares.find((l) => l.nivel === "gl" && l.cmus[0] === sel.cmu);
  const sub = !sel ? t("sub_pais") : `${escapar(u?.tipo ?? "")}${u?.provincia && u.nivel !== "prov" ? ` · ${escapar(u.provincia)}` : ""} · ${fmt(cmus.length)} ${cmus.length === 1 ? "gobierno local" : "gobiernos locales"}`;
  // Datos del lugar, en texto: habitantes expuestos y posición entre sus pares de todo el país
  const lineas = [`<li><b>Habitantes expuestos:</b> ${fmt(Math.round(expuestos))} de ${fmt(Math.round(totalPob))} (${totalPob ? fmt((100 * expuestos) / totalPob, expuestos / totalPob < 0.1 ? 2 : 1) : "0"} % de la población), con el máximo diario de cada lugar sumado.</li>`];
  if (u) {
    const par = estado.lugares.filter((l) => l.nivel === u.nivel).map((l) => { const cs = l.cmus.filter((c) => R.cmu[c]); return { l, max: cs.length ? Math.max(...D.map((_, i) => media(cs, i))) : -1, exp: exp(cs) }; });
    const yo = par.find((x) => x.l === u) ?? par.find((x) => x.l.nombre === u.nombre && x.l.provincia === u.provincia);
    if (yo && yo.max >= 0) {
      const plural = { prov: "provincias", depto: "partidos y departamentos", gl: "gobiernos locales", loc: "localidades" }[u.nivel] ?? "lugares";
      const top = (clave) => { const p = 1 + par.filter((x) => x[clave] > yo[clave]).length, n = par.length, pct = Math.max(1, Math.ceil((100 * p) / n)); return `${p <= 10 ? `Top ${p}` : `Top ${pct} %`} (puesto ${fmt(p)} de ${fmt(n)} ${plural})`; };
      lineas.push(`<li><b>Posición en el país:</b> ${top("max")} por riesgo previsto (${fmt(yo.max, 1)}/10) y ${top("exp")} por habitantes expuestos.</li>`);
    }
  }
  cont.innerHTML = `<div class="an an-reporte">
  <header class="an-cab"><p class="an-eyebrow">Reporte · ${escapar(hoy)}</p><h2 class="an-tit">${escapar(nombre)}</h2><p class="an-sub">${sub}</p></header>
  <section class="an-card an-datos-lugar"><ul class="an-lineas">${lineas.join("")}</ul></section>
  <section class="an-card an-situacion"><div id="an-situacion"></div></section>
  </div>`;
  pintarSituacionAnalisis();
}

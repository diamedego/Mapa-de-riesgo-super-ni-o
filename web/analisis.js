// Lámina 03 · Análisis nacional: indicadores, evolución, cambios de nivel, calendario, ranking, amenazas y orientación, todos con
// el mismo filtro (país o una provincia). Reemplaza al análisis anterior (tableros.js): los datos son los del riesgo diario.
const PROV_COD = { "02": "CABA", "06": "Buenos Aires", "10": "Catamarca", "14": "Córdoba", "18": "Corrientes", "22": "Chaco", "26": "Chubut", "30": "Entre Ríos",
  "34": "Formosa", "38": "Jujuy", "42": "La Pampa", "46": "La Rioja", "50": "Mendoza", "54": "Misiones", "58": "Neuquén", "62": "Río Negro", "66": "Salta",
  "70": "San Juan", "74": "San Luis", "78": "Santa Cruz", "82": "Santa Fe", "86": "Sgo. del Estero", "90": "Tucumán", "94": "T. del Fuego" };
const provDe = (c) => PROV_COD[String(c).slice(0, 2)] ?? (String(c).startsWith("R") ? PROV_COD[String(c).slice(1, 3)] : null) ?? "—";
const NIV_TXT = () => t("niveles_cortos");
const nivelIdx = (r) => (r >= 7 ? 4 : r >= 6 ? 3 : r >= 4.5 ? 2 : r >= 3 ? 1 : 0);
const COL_NIV = ["var(--r1, #1a9850)", "var(--r2, #91cf60)", "var(--r3, #f2c94c)", "var(--r4, #e8642c)", "var(--r5, #c62f2f)"];
let anaProv = "", anaRank = "riesgo";

function pintarAnalisis() {
  const cont = document.getElementById("analisis"), R = estado.riesgo;
  if (!cont || !R?.cmu) return;
  const D = R.dias, nD = D.length, todos = Object.keys(R.cmu);
  const provs = [...new Set(todos.map(provDe))].filter((p) => p !== "—").sort((a, b) => a.localeCompare(b, "es"));
  const cmus = anaProv ? todos.filter((c) => provDe(c) === anaProv) : todos;
  const nom = (c) => estado.porCmu.get(c)?.nam ?? c, pob = (c) => Number(estado.porCmu.get(c)?.poblacion) || 0;
  const r = (c, i) => R.cmu[c].r[i] ?? 0, rMax = (c) => Math.max(...R.cmu[c].r);
  // Indicadores
  const medioMas = cmus.filter((c) => rMax(c) >= 4.5).length;
  const creciente = cmus.filter((c) => nivelIdx(rMax(c)) > nivelIdx(r(c, 0))).length;
  const expuestos = cmus.reduce((a, c) => a + Math.max(0, ...(R.cmu[c].xd ?? [0])), 0);
  const cajaProv = anaProv ? cmus.map((c) => R.cmu[c].c).filter(Boolean) : null;
  const cerca = (p) => !cajaProv || cajaProv.some((q) => distanciaKm(q, p) <= 30);
  const ests = estado.datos.estaciones.features.filter((f) => f.properties.estado && cerca(f.geometry.coordinates));
  const estAl = ests.filter((f) => f.properties.estado === "alerta" || f.properties.estado === "evacuacion").length;
  const alCmu = cmus.filter((c) => R.cmu[c].alerta[0] > 0), alNar = alCmu.filter((c) => R.cmu[c].alerta[0] >= 2).length;
  // Evolución: municipios en medio, alto y muy alto por día
  const serie = D.map((_, i) => [2, 3, 4].map((k) => cmus.filter((c) => nivelIdx(r(c, i)) === k).length));
  const totDia = serie.map((s) => s[0] + s[1] + s[2]), iPico = totDia.indexOf(Math.max(...totDia));
  // Cambios de nivel previstos (los que suben), con su fecha
  const cambios = cmus.map((c) => { const n0 = nivelIdx(r(c, 0)); let i1 = -1, n1 = n0; R.cmu[c].r.forEach((v, i) => { if (nivelIdx(v) > n1) { n1 = nivelIdx(v); i1 = i; } }); return { c, n0, n1, i: i1 }; })
    .filter((x) => x.i > 0).sort((a, b) => b.n1 - a.n1 || pob(b.c) - pob(a.c)).slice(0, 6);
  // Calendario: filas = provincias (país) o municipios con más riesgo (provincia); valor = riesgo medio ponderado por población
  const cols = [0, 3, 7, 10, nD - 1].filter((i, k, a) => i < nD && a.indexOf(i) === k);
  const grupos = anaProv ? cmus.map((c) => [nom(c), [c]]) : provs.map((p) => [p, todos.filter((c) => provDe(c) === p)]);
  const media = (lista, i) => { let s = 0, w = 0; for (const c of lista) { const p = Math.max(1, pob(c)); s += r(c, i) * p; w += p; } return w ? s / w : 0; };
  const filasCal = grupos.map(([n, l]) => [n, l, cols.map((i) => media(l, i))]).sort((a, b) => Math.max(...b[2]) - Math.max(...a[2])).slice(0, 8);
  // Ranking
  const rk = grupos.map(([n, l]) => { const s = D.map((_, i) => media(l, i)); return { n, l, s, max: Math.max(...s), inc: Math.max(...s) - s[0], exp: l.reduce((a, c) => a + Math.max(0, ...(R.cmu[c].xd ?? [0])), 0) }; });
  const ord = { riesgo: (a, b) => b.max - a.max, incremento: (a, b) => b.inc - a.inc, exposicion: (a, b) => b.exp - a.exp }[anaRank];
  const top = rk.sort(ord).slice(0, 6);
  // Amenazas
  const conLluvia = cmus.filter((c) => R.cmu[c].lluvia.slice(0, 7).some((v) => v > 0)).length;
  const rioN = cmus.filter((c) => R.cmu[c].rio.some((v) => v > 0)).length;
  const porNivel = [0, 1, 2, 3, 4].map((k) => cmus.filter((c) => nivelIdx(rMax(c)) === k).length);
  const fecha = (i) => fmtDiaFrase(D[i], { day: "numeric", month: "short" });
  const gen = R.generado ? new Date(R.generado) : null;
  const nombreZona = anaProv || "Argentina";
  const spark = (s) => { const w = 120, h = 24, x = (i) => (i / (s.length - 1)) * w, y = (v) => h - (v / 10) * h; return `<svg viewBox="0 0 ${w} ${h}" class="an-spark" aria-hidden="true"><polyline points="${s.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}" fill="none" stroke="var(--tinta-2)" stroke-width="1.5"/></svg>`; };
  // Área apilada (SVG)
  const W = 560, H = 200, maxY = Math.max(1, ...totDia), X = (i) => 40 + (i / (nD - 1)) * (W - 56), Y = (v) => H - 24 - (v / maxY) * (H - 40);
  let base = D.map(() => 0);
  const capas = [0, 1, 2].map((k) => { const sup = base.map((b, i) => b + serie[i][k]); const d = `M${D.map((_, i) => `${X(i)},${Y(sup[i])}`).join("L")}L${D.map((_, i) => `${X(nD - 1 - i)},${Y(base[nD - 1 - i])}`).join("L")}Z`; base = sup; return `<path d="${d}" fill="${COL_NIV[k + 2]}" opacity=".85"/>`; }).join("");
  const ejeX = [0, 4, 7, 10, nD - 1].filter((i) => i < nD).map((i) => `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${i ? `+${i}` : t("per_hoy")}</text>`).join("");
  const ejeY = [0, Math.round(maxY / 2), maxY].map((v) => `<text x="34" y="${Y(v) + 4}" text-anchor="end">${fmt(v)}</text><line x1="40" x2="${W - 16}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--linea)"/>`).join("");
  const N = NIV_TXT();
  cont.innerHTML = `<div class="an">
  <header class="an-cab"><div><h2 class="an-tit">${escapar(nombreZona)} · Situación y evolución del riesgo</h2>
    <p class="an-sub">Actualización: ${gen ? escapar(fmtDiaFrase(hoyLocal(), { day: "numeric", month: "short", year: "numeric" })) : "—"} · Horizonte: ${nD} días · ${cmus.length} gobiernos locales</p></div>
    <label class="an-filtro"><span>Provincia</span><select id="an-prov"><option value="">Todo el país</option>${provs.map((p) => `<option${p === anaProv ? " selected" : ""}>${escapar(p)}</option>`).join("")}</select></label></header>
  <div class="an-kpis">
    <div class="an-kpi"><b>${fmt(medioMas)}</b><span>gobiernos locales en riesgo medio o superior en algún día de los próximos ${nD}</span></div>
    <div class="an-kpi"><b>${fmt(creciente)}</b><span>con riesgo creciente: su nivel máximo del período supera al de hoy</span></div>
    <div class="an-kpi"><b>${expuestos >= 1e6 ? `${fmt(expuestos / 1e6, 1)} M` : fmt(Math.round(expuestos))}</b><span>habitantes expuestos a inundaciones (máximo diario de cada lugar, sumado)</span></div>
    <div class="an-kpi"><b>${fmt(estAl)}<small> / ${fmt(ests.length)}</small></b><span>estaciones del INA en alerta o evacuación hoy</span></div>
    <div class="an-kpi an-kpi-alerta"><b>${fmt(alCmu.length)}</b><span>gobiernos locales con alerta del SMN vigente${alNar ? `, ${fmt(alNar)} naranja o roja` : ""}</span></div>
  </div>
  <div class="an-fila3">
    <section class="an-card"><h3>Evolución del riesgo</h3><p class="an-nota">Gobiernos locales por nivel, día por día</p>
      <div class="an-ley">${[4, 3, 2].map((k) => `<span><i style="background:${COL_NIV[k]}"></i>${N[k]}</span>`).join("")}</div>
      <svg viewBox="0 0 ${W} ${H}" class="an-area" role="img" aria-label="Evolución del riesgo">${ejeY}${capas}${ejeX}</svg>
      <p class="an-pie">Mayor riesgo estimado: ${escapar(fecha(iPico))} · ${fmt(totDia[iPico])} gobiernos locales en riesgo medio o superior</p></section>
    <section class="an-card"><h3>Cambios de nivel previstos</h3><p class="an-nota">Gobiernos locales cuyo nivel sube respecto de hoy</p>
      <table class="an-tab"><thead><tr><th>Localidad</th><th>Cambio estimado</th><th>Fecha</th></tr></thead><tbody>${cambios.length ? cambios.map((x) => `<tr data-cmu="${x.c}"><td>${escapar(nom(x.c))} <small>(${escapar(provDe(x.c))})</small></td><td><span class="an-chip" style="background:${COL_NIV[x.n1]}">${N[x.n0]} → ${N[x.n1]}</span></td><td>${escapar(fecha(x.i))}</td></tr>`).join("") : `<tr><td colspan="3">Sin cambios de nivel previstos en el período.</td></tr>`}</tbody></table></section>
    <section class="an-card"><h3>Calendario de riesgo ${anaProv ? "por gobierno local" : "por provincia"}</h3><p class="an-nota">Riesgo medio ponderado por población · tocar una fila filtra</p>
      <table class="an-cal"><thead><tr><th>${anaProv ? "Lugar" : "Prov."}</th>${cols.map((i) => `<th>${i ? `+${i}` : t("per_hoy")}</th>`).join("")}</tr></thead><tbody>${filasCal.map(([n, , v]) => `<tr data-prov="${anaProv ? "" : escapar(n)}"><td>${escapar(n)}</td>${v.map((x) => `<td style="background:${COL_NIV[nivelIdx(x)]}" title="${fmt(x, 1)}"></td>`).join("")}</tr>`).join("")}</tbody></table></section>
  </div>
  <div class="an-fila4">
    <section class="an-card"><h3>Ranking de mayor riesgo previsto</h3>
      <div class="an-tabs">${[["riesgo", "Mayor riesgo"], ["incremento", "Mayor incremento"], ["exposicion", "Mayor exposición"]].map(([k, l]) => `<button type="button" data-rk="${k}" aria-pressed="${k === anaRank}">${l}</button>`).join("")}</div>
      <ol class="an-rank">${top.map((x, k) => `<li data-prov="${anaProv ? "" : escapar(x.n)}"><span>${k + 1}</span><span>${escapar(x.n)}</span><i style="background:${COL_NIV[nivelIdx(x.max)]}"></i><b>${anaRank === "exposicion" ? fmt(Math.round(x.exp)) : anaRank === "incremento" ? `+${fmt(x.inc, 1)}` : fmt(x.max, 1)}</b>${spark(x.s)}</li>`).join("")}</ol></section>
    <section class="an-card"><h3>Amenazas y condiciones</h3>
      <div class="an-ame"><div><small>Meteorológica</small><b>${fmt(conLluvia)}</b><span>gobiernos locales con lluvia sobre un umbral del SMN en los próximos 7 días (ensamble del ECMWF)</span></div>
      <div><small>Fluvial</small><b>${fmt(estAl)} / ${fmt(ests.length)}</b><span>estaciones del INA en alerta o evacuación; ${fmt(rioN)} gobiernos locales con amenaza de río en el período</span></div>
      <div><small>Alertas SMN</small><b>${fmt(alCmu.length)}</b><span>gobiernos locales bajo alerta por tormentas o lluvias vigente hoy</span></div></div></section>
    <section class="an-card"><h3>Orientación preventiva</h3><p class="an-nota">Gobiernos locales por nivel máximo del período</p>
      <ul class="an-ori">${[[1, "Mantenerse informado con el SMN y el INA."], [2, "Despejar desagües y sumideros; identificar las zonas que acumulan agua."], [3, "Seguir las indicaciones oficiales y preparar la evacuación de zonas bajas."], [4, "Consultar a Defensa Civil y evitar circular por zonas anegadas."]].map(([k, txt]) => `<li><i style="background:${COL_NIV[k]}"></i><b>${N[k]}</b><span>${fmt(porNivel[k])}</span><em>${txt}</em></li>`).join("")}</ul></section>
    <section class="an-card an-meta"><h3>Última actualización</h3><p>${gen ? escapar(gen.toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: ZONA_HORARIA })) : "—"} h</p>
      <h3>Incertidumbre</h3><p>Alta de hoy a día 2 · media de día 3 a 6 · baja de día 7 a ${nD - 1}: el pronóstico pierde habilidad con el plazo (verificación diaria contra la lluvia observada).</p></section>
  </div></div>`;
  cont.querySelector("#an-prov").onchange = (e) => { anaProv = e.target.value; pintarAnalisis(); };
  cont.querySelectorAll("[data-rk]").forEach((b) => { b.onclick = () => { anaRank = b.dataset.rk; pintarAnalisis(); }; });
  cont.querySelectorAll("[data-prov]").forEach((el) => { if (el.dataset.prov) { el.style.cursor = "pointer"; el.onclick = () => { anaProv = el.dataset.prov; pintarAnalisis(); }; } });
}

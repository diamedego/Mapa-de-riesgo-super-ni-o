// Gráficos propios en SVG (sin librerías): todos leen el ancho de su contenedor, usan los colores del tema
// (variables CSS) y tienen la misma capa de interacción: tooltip al pasar, cursor que se ajusta al dato y clic.

const Tip = (() => {
  const el = document.createElement("div");
  el.className = "tip";
  el.hidden = true;
  el.setAttribute("role", "status");
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(el));
  return {
    mostrar(html, ev) {
      el.innerHTML = html;
      el.hidden = false;
      const r = el.getBoundingClientRect(), m = 14;
      let x = ev.clientX + m, y = ev.clientY + m;
      if (x + r.width > innerWidth - 8) x = ev.clientX - r.width - m;
      if (y + r.height > innerHeight - 8) y = ev.clientY - r.height - m;
      el.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
    },
    ocultar() { el.hidden = true; },
  };
})();

// Marcas "lindas" para un eje que arranca en 0
function marcasEje(max, n = 4) {
  if (!(max > 0)) return [0, 1];
  const paso0 = max / n, mag = 10 ** Math.floor(Math.log10(paso0));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= paso0) ?? 10 * mag;
  const marcas = [];
  for (let v = 0; v <= max + paso * 0.001; v += paso) marcas.push(Math.round(v * 1e6) / 1e6);
  if (marcas[marcas.length - 1] < max) marcas.push(marcas[marcas.length - 1] + paso);
  return marcas;
}

const ancho = (cont) => Math.max(260, Math.floor(cont.clientWidth || cont.parentElement?.clientWidth || 320));
const svgAbre = (W, H, clase = "") => `<svg class="graf ${clase}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="presentation">`;

// ---------- Columnas (una serie) ----------
// opts: etiquetas, valores, alto, formato, colores (fn i → css), activos [a, b], onClick(i), tip(i) → html,
//       refs [{valor, texto}], iconos [svg] (arriba de cada etiqueta), marcar ("max" | i)
function grafBarras(cont, o) {
  const W = ancho(cont), H = o.alto ?? 170, izq = 34, der = 8, arr = o.iconos ? 14 : 12, aba = o.iconos ? 44 : 26;
  const n = o.valores.length;
  const maxV = Math.max(...o.valores.filter((v) => v != null), ...(o.refs ?? []).map((r) => r.valor), o.minMax ?? 0);
  const marcas = marcasEje(maxV || 1);
  const tope = marcas[marcas.length - 1];
  const banda = (W - izq - der) / n, grueso = Math.min(24, Math.max(3, banda - 4));
  const y = (v) => arr + (1 - v / tope) * (H - arr - aba);
  const xc = (i) => izq + banda * (i + 0.5);
  const activo = (i) => !o.activos || (i >= o.activos[0] && i <= o.activos[1]);
  const imax = o.marcar === "max" ? o.valores.indexOf(Math.max(...o.valores.filter((v) => v != null))) : o.marcar;
  const cada = Math.ceil(n / Math.max(1, Math.floor((W - izq - der) / 46)));
  let s = svgAbre(W, H);
  for (const m of marcas) s += `<line class="grilla" x1="${izq}" x2="${W - der}" y1="${y(m)}" y2="${y(m)}"/>
    <text class="eje" x="${izq - 6}" y="${y(m) + 4}" text-anchor="end">${o.formatoEje ? o.formatoEje(m) : fmt(m)}</text>`;
  for (const r of o.refs ?? []) s += `<line class="ref" x1="${izq}" x2="${W - der}" y1="${y(r.valor)}" y2="${y(r.valor)}"/>
    <text class="ref-texto" x="${W - der}" y="${y(r.valor) - 4}" text-anchor="end">${escapar(r.texto)}</text>`;
  o.valores.forEach((v, i) => {
    if (v == null) return;
    const h = Math.max(v > 0 ? 1.5 : 0, y(0) - y(v)), x = xc(i) - grueso / 2, r = Math.min(4, grueso / 2, h);
    const color = o.colores ? o.colores(i, v) : "var(--s-1)";
    s += `<path class="barra${activo(i) ? "" : " apagada"}" fill="${color}" d="M${x},${y(0)} v${-(h - r)} q0,${-r} ${r},${-r} h${grueso - 2 * r} q${r},0 ${r},${r} v${h - r} Z"/>`;
    if (i === imax && v > 0) s += `<text class="valor-marca" x="${xc(i)}" y="${y(v) - 6}" text-anchor="middle">${o.formato(v)}</text>`;
  });
  s += `<line class="base" x1="${izq}" x2="${W - der}" y1="${y(0)}" y2="${y(0)}"/>`;
  o.etiquetas.forEach((e, i) => {
    if (o.iconos?.[i]) s += `<g transform="translate(${xc(i) - 8},${H - aba + 6}) scale(.667)" class="ico-eje">${o.iconos[i]}</g>`;
    if (i % cada === 0) s += `<text class="eje" x="${xc(i)}" y="${H - 8}" text-anchor="middle">${escapar(e)}</text>`;
  });
  o.valores.forEach((_, i) => { s += `<rect class="golpe" data-i="${i}" x="${izq + banda * i}" y="${arr}" width="${banda}" height="${H - arr - aba + 4}"/>`; });
  cont.innerHTML = `${s}</svg>`;
  enlazar(cont, o, (i) => o.tip ? o.tip(i) : `<b>${o.formato(o.valores[i])}</b><span>${escapar(o.etiquetas[i])}</span>`);
}

function enlazar(cont, o, tip) {
  cont.querySelectorAll(".golpe").forEach((g) => {
    const i = +g.dataset.i;
    g.addEventListener("pointermove", (ev) => { Tip.mostrar(tip(i), ev); g.classList.add("sobre"); cont.querySelector(`.barra:nth-of-type(${i + 1})`); });
    g.addEventListener("pointerleave", () => { Tip.ocultar(); g.classList.remove("sobre"); });
    if (o.onClick) { g.style.cursor = "pointer"; g.addEventListener("click", () => o.onClick(i)); }
  });
}

// ---------- Líneas (una o varias series, un solo eje) ----------
// opts: etiquetas, series [{nombre, valores, color, ancho, punteada, area}], min, max, alto, formato, banda [a, b],
//       marca i, onClick(i), extraTip(i) → html
function grafLineas(cont, o) {
  const W = ancho(cont), H = o.alto ?? 190, izq = 30, der = 10, arr = 12, aba = 26;
  const n = o.etiquetas.length;
  const vals = o.series.flatMap((s) => s.valores.filter((v) => v != null));
  const max = o.max ?? Math.max(...vals) * 1.1, min = o.min ?? 0;
  const marcas = o.marcas ?? marcasEje(max - min).map((m) => m + min);
  const x = (i) => izq + (n === 1 ? (W - izq - der) / 2 : (i * (W - izq - der)) / (n - 1));
  const y = (v) => arr + (1 - (v - min) / (max - min)) * (H - arr - aba);
  const cada = Math.ceil(n / Math.max(1, Math.floor((W - izq - der) / 52)));
  let s = svgAbre(W, H);
  if (o.banda) {
    const [a, b] = o.banda, x0 = Math.max(izq, x(a) - (W - izq - der) / Math.max(1, n - 1) / 2), x1 = Math.min(W - der, x(b) + (W - izq - der) / Math.max(1, n - 1) / 2);
    s += `<rect class="banda" x="${x0}" y="${arr}" width="${x1 - x0}" height="${H - arr - aba}"/>`;
  }
  for (const m of marcas) if (m <= max + 1e-9) s += `<line class="grilla" x1="${izq}" x2="${W - der}" y1="${y(m)}" y2="${y(m)}"/>
    <text class="eje" x="${izq - 6}" y="${y(m) + 4}" text-anchor="end">${o.formatoEje ? o.formatoEje(m) : fmt(m)}</text>`;
  for (const se of o.series) {
    const pts = se.valores.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);
    if (!pts.length) continue;
    const d = pts.map((p, k) => `${k ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
    if (se.area) s += `<path class="area" fill="${se.color}" d="${d}L${pts[pts.length - 1][0]},${y(min)}L${pts[0][0]},${y(min)}Z"/>`;
    s += `<path class="linea${se.punteada ? " punteada" : ""}" stroke="${se.color}" stroke-width="${se.ancho ?? 2}" d="${d}"/>`;
    const ult = pts[pts.length - 1];
    if (!se.sinPunto) s += `<circle class="punto" cx="${ult[0]}" cy="${ult[1]}" r="4" fill="${se.color}"/>`;
  }
  if (o.marca != null) s += `<line class="marca" x1="${x(o.marca)}" x2="${x(o.marca)}" y1="${arr}" y2="${y(min)}"/>`;
  s += `<line class="base" x1="${izq}" x2="${W - der}" y1="${y(min)}" y2="${y(min)}"/>`;
  o.etiquetas.forEach((e, i) => { if (i % cada === 0 || i === n - 1) s += `<text class="eje" x="${x(i)}" y="${H - 8}" text-anchor="middle">${escapar(e)}</text>`; });
  s += `<line class="cruz" x1="0" x2="0" y1="${arr}" y2="${y(min)}" visibility="hidden"/><g class="cruz-puntos"></g>`;
  s += `<rect class="zona" x="${izq}" y="${arr}" width="${W - izq - der}" height="${H - arr - aba}" fill="transparent"/>`;
  cont.innerHTML = `${s}</svg>`;
  const zona = cont.querySelector(".zona"), cruz = cont.querySelector(".cruz"), puntos = cont.querySelector(".cruz-puntos");
  const indice = (ev) => { const r = zona.getBoundingClientRect();
    return limitar(Math.round(((ev.clientX - r.left) / r.width) * (n - 1)), 0, n - 1); };
  zona.addEventListener("pointermove", (ev) => {
    const i = indice(ev);
    cruz.setAttribute("x1", x(i)); cruz.setAttribute("x2", x(i)); cruz.setAttribute("visibility", "visible");
    puntos.innerHTML = o.series.filter((se) => se.valores[i] != null).map((se) =>
      `<circle cx="${x(i)}" cy="${y(se.valores[i])}" r="4" fill="${se.color}" class="punto"/>`).join("");
    Tip.mostrar(`<span class="tip-titulo">${escapar(o.etiquetas[i])}</span>` + o.series.map((se) => se.valores[i] == null ? "" :
      `<span class="tip-fila"><i style="background:${se.color}"></i><b>${o.formato(se.valores[i])}</b> ${escapar(se.nombre)}</span>`).join("") +
      (o.extraTip ? o.extraTip(i) : ""), ev);
  });
  zona.addEventListener("pointerleave", () => { cruz.setAttribute("visibility", "hidden"); puntos.innerHTML = ""; Tip.ocultar(); });
  if (o.onClick) { zona.style.cursor = "pointer"; zona.addEventListener("click", (ev) => o.onClick(indice(ev))); }
}

// ---------- Rangos mín–máx por día (temperatura) ----------
function grafRangos(cont, o) {
  const W = ancho(cont), H = o.alto ?? 200, izq = 30, der = 8, arr = 18, aba = o.iconos ? 44 : 26;
  const n = o.etiquetas.length;
  const lo = Math.floor(Math.min(...o.min.filter((v) => v != null)) / 5) * 5 - 2;
  const hi = Math.ceil(Math.max(...o.max.filter((v) => v != null)) / 5) * 5 + 2;
  const y = (v) => arr + (1 - (v - lo) / (hi - lo)) * (H - arr - aba);
  const banda = (W - izq - der) / n, grueso = Math.min(14, Math.max(4, banda - 8));
  const xc = (i) => izq + banda * (i + 0.5);
  const activo = (i) => !o.activos || (i >= o.activos[0] && i <= o.activos[1]);
  const cada = Math.ceil(n / Math.max(1, Math.floor((W - izq - der) / 46)));
  let s = svgAbre(W, H) + "<defs>";
  o.max.forEach((v, i) => { s += `<linearGradient id="gr${cont.id}${i}" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="${o.colorDe(o.min[i])}"/><stop offset="1" stop-color="${o.colorDe(v)}"/></linearGradient>`; });
  s += "</defs>";
  for (let m = Math.ceil(lo / 5) * 5; m <= hi; m += 5) s += `<line class="grilla" x1="${izq}" x2="${W - der}" y1="${y(m)}" y2="${y(m)}"/>
    <text class="eje" x="${izq - 6}" y="${y(m) + 4}" text-anchor="end">${m}°</text>`;
  o.max.forEach((v, i) => {
    if (v == null || o.min[i] == null) return;
    const y1 = y(v), y0 = y(o.min[i]);
    s += `<rect class="rango${activo(i) ? "" : " apagada"}" x="${xc(i) - grueso / 2}" y="${y1}" width="${grueso}" height="${Math.max(2, y0 - y1)}" rx="${grueso / 2}" fill="url(#gr${cont.id}${i})"/>`;
    if (n <= 16 || i % cada === 0) s += `<text class="valor-chico" x="${xc(i)}" y="${y1 - 5}" text-anchor="middle">${fmt(v)}°</text>`;
  });
  o.etiquetas.forEach((e, i) => {
    if (o.iconos?.[i]) s += `<g transform="translate(${xc(i) - 8},${H - aba + 6}) scale(.667)" class="ico-eje">${o.iconos[i]}</g>`;
    if (i % cada === 0) s += `<text class="eje" x="${xc(i)}" y="${H - 8}" text-anchor="middle">${escapar(e)}</text>`;
  });
  o.max.forEach((_, i) => { s += `<rect class="golpe" data-i="${i}" x="${izq + banda * i}" y="${arr}" width="${banda}" height="${H - arr - aba}"/>`; });
  cont.innerHTML = `${s}</svg>`;
  enlazar(cont, o, (i) => o.tip(i));
}

// ---------- Rosa de vientos (8 sectores; el largo es la frecuencia ponderada por la velocidad) ----------
function grafRosa(cont, o) {
  const T = Math.min(220, ancho(cont)), c = T / 2, R = c - 22;
  const max = Math.max(...o.valores, 1e-9);
  let s = svgAbre(T, T, "rosa");
  for (const f of [0.33, 0.66, 1]) s += `<circle class="grilla" cx="${c}" cy="${c}" r="${R * f}" fill="none"/>`;
  o.valores.forEach((v, k) => {
    const a0 = ((k * 45 - 20) * Math.PI) / 180, a1 = ((k * 45 + 20) * Math.PI) / 180, r = (R * v) / max;
    if (r < 0.5) return;
    const p = (a, rr) => `${c + rr * Math.sin(a)},${c - rr * Math.cos(a)}`;
    s += `<path class="petalo" data-k="${k}" fill="${o.color}" d="M${c},${c} L${p(a0, r)} A${r},${r} 0 0 1 ${p(a1, r)} Z"/>`;
  });
  t("puntos").forEach((e, k) => {
    const a = (k * 45 * Math.PI) / 180;
    s += `<text class="eje${k % 2 ? " chico" : ""}" x="${c + (R + 12) * Math.sin(a)}" y="${c - (R + 12) * Math.cos(a) + 4}" text-anchor="middle">${e}</text>`;
  });
  cont.innerHTML = `${s}</svg>`;
  cont.querySelectorAll(".petalo").forEach((p) => {
    p.addEventListener("pointermove", (ev) => Tip.mostrar(o.tip(+p.dataset.k), ev));
    p.addEventListener("pointerleave", () => Tip.ocultar());
  });
}

// ---------- Brújula: hacia dónde va el viento ----------
function brujula(dir, vel, color = "var(--cian)") {
  const s = 120, c = 60, R = 50;
  const a = (((dir + 180) % 360) * Math.PI) / 180;   // dirección de la que viene → la flecha apunta hacia donde va
  const p = (ang, r) => `${(c + r * Math.sin(ang)).toFixed(1)},${(c - r * Math.cos(ang)).toFixed(1)}`;
  let m = "";
  for (let k = 0; k < 36; k++) {
    const ang = (k * 10 * Math.PI) / 180, l = k % 9 === 0 ? 8 : 4;
    m += `<line class="tick" x1="${c + R * Math.sin(ang)}" y1="${c - R * Math.cos(ang)}" x2="${c + (R - l) * Math.sin(ang)}" y2="${c - (R - l) * Math.cos(ang)}"/>`;
  }
  const cardinales = t("puntos").filter((_, k) => k % 2 === 0)
    .map((e, k) => `<text class="eje" x="${p((k * 90 * Math.PI) / 180, R - 16).split(",")[0]}" y="${+p((k * 90 * Math.PI) / 180, R - 16).split(",")[1] + 4}" text-anchor="middle">${e}</text>`).join("");
  return `<svg class="brujula" viewBox="0 0 ${s} ${s}" aria-hidden="true">
    <circle cx="${c}" cy="${c}" r="${R}" class="aro"/>${m}${cardinales}
    <path d="M${p(a, R - 6)} L${p(a + 2.6, 13)} L${p(a + Math.PI, 6)} L${p(a - 2.6, 13)} Z" fill="${color}"/>
    <circle cx="${c}" cy="${c}" r="15" class="centro"/><text x="${c}" y="${c + 5}" text-anchor="middle" class="brujula-vel">${fmt(vel)}</text></svg>`;
}

// ---------- Medidor de riesgo (5 tramos con la escala del mapa) ----------
function medidorRiesgo(valor) {
  const lim = [0, ...CORTES, 10];
  const tramos = lim.slice(1).map((b, i) => `<span class="tramo" style="flex:${b - lim[i]};background:var(--r${i + 1})"></span>`).join("");
  const pos = limitar((valor ?? 0) / 10, 0, 1) * 100;
  return `<div class="medidor" role="img" aria-label="${t("riesgo")}: ${fmtRiesgo(valor)} / 10">
    <div class="medidor-pista">${tramos}</div><span class="medidor-aguja" style="left:${pos}%"></span>
    <div class="medidor-ejes">${[0, 3, 4.5, 6, 7, 10].map((v) => `<span style="left:${v * 10}%">${fmt(v, v % 1 ? 1 : 0)}</span>`).join("")}</div></div>`;
}

// ---------- Minigráfico de tendencia ----------
function spark(valores, { w = 120, h = 30, color = "currentColor", marca = null, min = null, max = null } = {}) {
  const vs = valores.filter((v) => v != null);
  if (vs.length < 2) return "";
  const lo = min ?? Math.min(...vs), hi = max ?? Math.max(...vs), r = hi - lo || 1;
  const x = (i) => 2 + (i * (w - 4)) / (valores.length - 1), y = (v) => h - 3 - ((v - lo) / r) * (h - 6);
  const d = valores.map((v, i) => (v == null ? "" : `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join("");
  const k = marca ?? valores.length - 1;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
    <path d="${d}L${x(valores.length - 1)},${h}L${x(0)},${h}Z" fill="${color}" opacity=".12"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
    ${valores[k] != null ? `<circle cx="${x(k)}" cy="${y(valores[k])}" r="2.6" fill="${color}"/>` : ""}</svg>`;
}

// ---------- Barra 100 % apilada (población por nivel de riesgo) ----------
function apilada(partes, formato) {
  const total = sumar(partes.map((p) => p.v)) || 1;
  return `<div class="apilada">${partes.filter((p) => p.v > 0).map((p) =>
    `<span style="flex:${p.v};background:${p.color}" title="${escapar(p.etq)}: ${formato(p.v)} (${fmt((100 * p.v) / total)} %)"></span>`).join("")}</div>
    <ul class="apilada-leyenda">${partes.filter((p) => p.v > 0).map((p) =>
      `<li><i style="background:${p.color}"></i>${escapar(p.etq)} <b>${fmt((100 * p.v) / total)} %</b></li>`).join("")}</ul>`;
}

// ---------- Ranking horizontal ----------
// filas [{nombre, sub, valor, color, tip}], formato, max, onClick(fila)
function grafRanking(cont, o) {
  const max = o.max ?? Math.max(...o.filas.map((f) => f.valor), 1e-9);
  cont.innerHTML = `<ol class="ranking">${o.filas.map((f, i) => `
    <li class="fila-rk" data-i="${i}" tabindex="${o.onClick ? 0 : -1}">
      <span class="rk-pos">${i + 1}</span>
      <span class="rk-nombre">${escapar(f.nombre)}<small>${escapar(f.sub ?? "")}</small></span>
      <span class="rk-pista"><span class="rk-barra" style="width:${Math.max(1.5, (100 * f.valor) / max)}%;background:${f.color ?? "var(--s-1)"}"></span></span>
      <span class="rk-valor">${o.formato(f.valor)}</span></li>`).join("")}</ol>`;
  cont.querySelectorAll(".fila-rk").forEach((li) => {
    const f = o.filas[+li.dataset.i];
    if (f.tip) {
      li.addEventListener("pointermove", (ev) => Tip.mostrar(f.tip, ev));
      li.addEventListener("pointerleave", () => Tip.ocultar());
    }
    if (o.onClick) {
      li.addEventListener("click", () => o.onClick(f));
      li.addEventListener("keydown", (ev) => { if (ev.key === "Enter") o.onClick(f); });
    }
  });
}

// ---------- Mapa de calor (filas × columnas) ----------
// filas [{nombre, valores, dato}], columnas [texto], colorDe(v) → css, textoDe(v), tipDe(fila, k), onFila, onCelda, activas [a, b]
function grafCalor(cont, o) {
  const activa = (k) => o.activas && k >= o.activas[0] && k <= o.activas[1];
  cont.innerHTML = `<div class="calor" style="--cols:${o.columnas.length}">
    <div class="calor-fila cabeza"><span></span>${o.columnas.map((c, k) => `<span class="${activa(k) ? "activa" : ""}">${escapar(c)}</span>`).join("")}</div>
    ${o.filas.map((f, r) => `<div class="calor-fila" data-r="${r}">
      <button class="calor-nombre" type="button" title="${escapar(f.nombre)}">${escapar(f.nombre)}</button>
      ${f.valores.map((v, k) => `<span class="celda${activa(k) ? " activa" : ""}" data-k="${k}" style="background:${o.colorDe(v)};color:${o.tintaDe ? o.tintaDe(v) : "inherit"}">${o.textoDe(v)}</span>`).join("")}
    </div>`).join("")}</div>`;
  cont.querySelectorAll(".calor-fila[data-r]").forEach((fila) => {
    const f = o.filas[+fila.dataset.r];
    fila.querySelector(".calor-nombre").addEventListener("click", () => o.onFila?.(f));
    fila.querySelectorAll(".celda").forEach((c) => {
      const k = +c.dataset.k;
      c.addEventListener("pointermove", (ev) => Tip.mostrar(o.tipDe(f, k), ev));
      c.addEventListener("pointerleave", () => Tip.ocultar());
      if (o.onCelda) c.addEventListener("click", () => o.onCelda(f, k));
    });
  });
}

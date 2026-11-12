// Utilidades compartidas: formato de números y fechas, geometría liviana y escalas de color.
// Se cargan antes que el resto de los módulos (todos comparten el ámbito global de la página).

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";
const loc = () => (estado.idioma === "es" ? "es-AR" : "en-US");
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const temaOscuro = () => {
  const forzado = document.documentElement.dataset.theme;
  return forzado ? forzado === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};
const movimientoReducido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const esMovil = () => matchMedia("(max-width: 760px)").matches;

// ---------- Números ----------
function fmt(v, dec = 0) {
  if (v == null || Number.isNaN(v)) return "–";
  return Number(v).toLocaleString(loc(), { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: "always" });   // 1.234 también con 4 cifras
}
function fmtPersonas(n) {
  if (n == null || Number.isNaN(n)) return "–";
  if (n >= 1e6) return `${fmt(n / 1e6, n >= 1e7 ? 0 : 1)} ${t("u_millones")}`;
  if (n >= 1e4) return `${fmt(n / 1e3, 0)} ${t("u_mil")}`;
  return fmt(Math.round(n));
}
const fmtRiesgo = (r) => fmt(r, 1);
const escapar = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const normalizar = (txt) => String(txt ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const sumar = (a) => a.reduce((x, y) => x + y, 0);
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- Fechas (siempre en hora argentina) ----------
function hoyLocal() {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());
  return p;   // AAAA-MM-DD
}
const mesLocal = () => hoyLocal().slice(0, 7);
const fechaIso = (iso) => new Date(iso.length === 10 ? `${iso}T12:00:00-03:00` : `${iso}:00-03:00`);
function fmtDia(iso, opciones = { weekday: "short", day: "numeric", month: "short" }) {
  return capitalizar(fechaIso(iso).toLocaleDateString(loc(), { ...opciones, timeZone: ZONA_HORARIA }).replace(".", ""));
}
// Día dentro de una frase: en castellano va en minúscula ("el sábado 7")
function fmtDiaFrase(iso, opciones = { weekday: "long", day: "numeric" }) {
  const s = fmtDia(iso, opciones);
  return estado.idioma === "es" ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
function fmtHora(iso) {
  return fechaIso(iso).toLocaleTimeString(loc(), { hour: "2-digit", minute: "2-digit", timeZone: ZONA_HORARIA, hour12: false });
}
const nombreMes = (m, largo = false) => {
  const n = t("meses")[m.slice(5, 7)];
  return largo ? `${t("meses_largos")[m.slice(5, 7)]} ${m.slice(0, 4)}` : `${n} ${m.slice(2, 4)}`;
};

// ---------- Riesgo ----------
// 5 niveles (escala 0-10). Con el índice de feb-2027: muy alto ≈ 5 % de los municipios, alto ≈ 11 %, medio ≈ 28 %,
// bajo ≈ 42 %, muy bajo ≈ 14 %: lo más riesgoso se distingue de un vistazo.
const CORTES = [3, 4.5, 6, 7];
// El nivel se calcula sobre el valor redondeado a un decimal: lo que se lee (6,0) coincide con la leyenda (alto: 6-7)
const nivelRiesgo = (r) => (r == null || Number.isNaN(r) || r < 0 ? 0 : 1 + CORTES.filter((c) => Math.round(r * 10) / 10 >= c).length);
const nombreNivel = (r) => t("niveles")[nivelRiesgo(r) - 1] ?? t("sin_dato");

// ---------- Geometría ----------
function contiene(geom, [x, y]) {
  const anillo = (r) => { let d = false;
    for (let a = 0, b = r.length - 1; a < r.length; b = a++) {
      const [xa, ya] = r[a], [xb, yb] = r[b];
      if ((ya > y) !== (yb > y) && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) d = !d;
    } return d; };
  const pol = (p) => anillo(p[0]) && !p.slice(1).some(anillo);
  return geom.type === "Polygon" ? pol(geom.coordinates) : geom.coordinates.some(pol);
}
function cajaDe(geom) {
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  const pols = geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : [];   // otros tipos: caja vacía
  for (const p of pols) for (const [x, y] of p[0]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}
// Centro aproximado (promedio de los vértices del anillo exterior más grande): suficiente para radios censales
function centroDe(geom) {
  const pols = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  let mejor = pols[0][0];
  for (const p of pols) if (p[0].length > mejor.length) mejor = p[0];
  let sx = 0, sy = 0;
  for (const [x, y] of mejor) { sx += x; sy += y; }
  return [sx / mejor.length, sy / mejor.length];
}
function distanciaKm([x1, y1], [x2, y2]) {
  const r = Math.PI / 180, dLat = (y2 - y1) * r, dLon = (x2 - x1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(y1 * r) * Math.cos(y2 * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}
function circuloGeo([x, y], km, n = 96) {
  const dy = km / 111.32, dx = km / (111.32 * Math.cos((y * Math.PI) / 180));
  const anillo = [];
  for (let k = 0; k <= n; k++) { const a = (2 * Math.PI * k) / n; anillo.push([x + dx * Math.cos(a), y + dy * Math.sin(a)]); }
  return { type: "Polygon", coordinates: [anillo] };
}
const cajaCirculo = ([x, y], km) => {
  const dy = km / 111.32, dx = km / (111.32 * Math.cos((y * Math.PI) / 180));
  return [x - dx, y - dy, x + dx, y + dy];
};
const cajasSeTocan = (a, b) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const latDeMercY = (y) => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * (180 / Math.PI);

// ---------- Viento ----------
// Escala de Beaufort (km/h) con los nombres que usa el SMN
const BEAUFORT = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
const beaufort = (kmh) => BEAUFORT.filter((v) => kmh >= v).length;
const sectorViento = (grados) => Math.round((((grados % 360) + 360) % 360) / 45) % 8;   // 0 = N, 1 = NE, …

// ---------- Colores ----------
// Escalas semánticas (lluvia tipo radar, viento y temperatura): [valor, [r, g, b, alfa]]
function colorEscala(escala, v, escalonada = false) {
  if (v == null || Number.isNaN(v)) return null;
  if (v <= escala[0][0]) return escala[0][1];
  for (let k = 1; k < escala.length; k++) {
    if (v < escala[k][0] || k === escala.length - 1 && v <= escala[k][0]) {
      if (escalonada) return escala[k - 1][1];
      const [v0, c0] = escala[k - 1], [v1, c1] = escala[k], f = (v - v0) / (v1 - v0);
      return c0.map((x, i) => x + (c1[i] - x) * f);
    }
  }
  return escala[escala.length - 1][1];
}
const rgba = (c, alfaMin = 0) => (c ? `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(alfaMin, c[3]).toFixed(2)})` : "transparent");
const colorNivel = (r) => (nivelRiesgo(r) ? `var(--r${nivelRiesgo(r)})` : "var(--sin-datos)");

// ---------- Íconos (trazo de 1,75 px, 24 × 24) ----------
const ICONOS = {
  riesgo: '<path d="M12 3c3.5 4.2 6 7.4 6 10.5A6 6 0 0 1 6 13.5C6 10.4 8.5 7.2 12 3Z"/><path d="M9.5 14.5c.3 1.3 1.2 2.2 2.5 2.5"/>',
  lluvia: '<path d="M7 15.5a4.5 4.5 0 1 1 1.3-8.8A5.5 5.5 0 0 1 18.8 9 3.3 3.3 0 0 1 17 15.5Z"/><path d="M9 18.5l-1 2M13 18.5l-1 2M17 18.5l-1 2"/>',
  viento: '<path d="M3 8.5h10.5a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 12.5h15a2.5 2.5 0 1 1-2.5 2.5"/><path d="M3 16.5h7"/>',
  temp: '<path d="M10 14.8V5a2 2 0 1 1 4 0v9.8a4 4 0 1 1-4 0Z"/><path d="M12 16.5v-6"/>',
  alerta: '<path d="M12 4 21 19.5H3L12 4Z"/><path d="M12 10v4.2M12 17v.2"/>',
  rio: '<path d="M3 8c2 0 2-1.5 4.5-1.5S9.5 8 12 8s2.5-1.5 4.5-1.5S18 8 21 8"/><path d="M3 13c2 0 2-1.5 4.5-1.5S9.5 13 12 13s2.5-1.5 4.5-1.5S18 13 21 13"/><path d="M3 18c2 0 2-1.5 4.5-1.5S9.5 18 12 18s2.5-1.5 4.5-1.5S18 18 21 18"/>',
  personas: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.3"/><path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5"/>',
  municipio: '<path d="M4 20V9l5-3 5 3v11"/><path d="M14 20v-7l6-2.5V20"/><path d="M3 20h18M7 12h.01M7 15.5h.01M11 12h.01M11 15.5h.01"/>',
  buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  pin: '<path d="M12 21s6.5-6.1 6.5-11.2a6.5 6.5 0 1 0-13 0C5.5 14.9 12 21 12 21Z"/><circle cx="12" cy="9.8" r="2.3"/>',
  play: '<path d="M8 5.5v13l10.5-6.5L8 5.5Z"/>',
  pausa: '<path d="M8 5.5v13M16 5.5v13"/>',
  repetir: '<path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5"/><path d="M20 4v4.5h-4.5"/><path d="M20 12a8 8 0 0 1-13.7 5.7L4 15.5"/><path d="M4 20v-4.5h4.5"/>',
  cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
  ampliar: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
  capas: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
  ruta: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8 18h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  nube: '<path d="M7 18.5a4.5 4.5 0 1 1 1.3-8.8A5.5 5.5 0 0 1 18.8 12 3.3 3.3 0 0 1 17 18.5Z"/>',
  tormenta: '<path d="M7 14.5a4.5 4.5 0 1 1 1.3-8.8A5.5 5.5 0 0 1 18.8 8 3.3 3.3 0 0 1 17 14.5"/><path d="m12.5 12-2.5 4.5h4L11.5 21"/>',
  nieve: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
  niebla: '<path d="M4 9h16M6 13h12M4 17h16"/>',
  objetivo: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  idioma: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.3 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.3-3.8-8.5S9.4 5.9 12 3.5Z"/>',
  tema: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17Z" fill="currentColor"/>',
  tablero: '<rect x="3.5" y="3.5" width="7" height="8" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.5"/><rect x="13.5" y="11.5" width="7" height="9" rx="1.5"/><rect x="3.5" y="14.5" width="7" height="6" rx="1.5"/>',
};
const icono = (nombre, clase = "ico") =>
  `<svg class="${clase}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ICONOS[nombre] ?? ""}</svg>`;

// Solo los trazos del ícono (para dibujarlo dentro de un SVG)
const iconoTrazos = (nombre) => `<g fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ICONOS[nombre] ?? ""}</g>`;

// Nombres de los ríos tal como los codifica el INA
const RIOS = { PARANAMED: "Paraná medio", PARANAINF: "Paraná inferior", PARANASUP: "Paraná superior", PARANADELASPALMAS: "Paraná de las Palmas",
  PARANAGUAZU: "Paraná Guazú", PARANAIBICUY: "Paraná Ibicuy", RIODELAPLATA: "Río de la Plata", SANJAVIER: "San Javier",
  BARRANQUERAS: "riacho Barranqueras", IGUAZU: "Iguazú", URUGUAY: "Uruguay", PARAGUAY: "Paraguay", GUALEGUAY: "Gualeguay",
  LUJAN: "Luján", BARADERO: "Baradero", CHANA: "Chaná", VICTORIA: "Victoria", LATINTA: "La Tinta", CANALGAFOTRE: "canal Gafotre" };
const nombreRio = (c) => (!c || c === "None" || c === "null" ? "" : RIOS[c] ?? capitalizar(String(c).toLowerCase()));

// Código de tiempo WMO → ícono y texto
function tiempoWmo(c) {
  if (c == null) return { ico: "nube", clave: "wmo_nublado" };
  if (c <= 1) return { ico: "sol", clave: "wmo_despejado" };
  if (c <= 3) return { ico: "nube", clave: "wmo_nublado" };
  if (c <= 48) return { ico: "niebla", clave: "wmo_niebla" };
  if (c <= 67 || (c >= 80 && c <= 82)) return { ico: "lluvia", clave: c >= 63 && c <= 67 || c >= 81 ? "wmo_lluvia_fuerte" : "wmo_lluvia" };
  if (c <= 77 || c === 85 || c === 86) return { ico: "nieve", clave: "wmo_nieve" };
  return { ico: "tormenta", clave: "wmo_tormenta" };
}

// Ejecuta fn como mucho una vez por cuadro de animación
function porCuadro(fn) {
  let pendiente = false;
  return (...args) => { if (pendiente) return; pendiente = true; requestAnimationFrame(() => { pendiente = false; fn(...args); }); };
}
function demorar(fn, ms) {
  let id = 0;
  return (...args) => { clearTimeout(id); id = setTimeout(() => fn(...args), ms); };
}

// ---------- Icono «!» de cada indicador o gráfico ----------
// Al pasar el mouse (o tocar) muestra la explicación y la fórmula; el clic queda reservado para el detalle (un PDF), todavía sin conectar.
const infoIcono = (clave, texto) => `<button type="button" class="info" data-detalle="${escapar(clave)}" data-tip="${escapar(texto)}" aria-label="${escapar(t("info_aria"))}">!</button>`;
const infoTexto = (clave) => { const v = TEXTOS[estado.idioma]?.[`info_${clave}`]; return typeof v === "string" ? v : t("info_generico"); };
const tit = (clave) => `${t(clave)}${infoIcono(clave, infoTexto(clave))}`;
// Las notas chicas de cada bloque pasan a la explicación del icono de su título (no ocupan lugar)
function notasATooltip(raiz) {
  raiz.querySelectorAll(".tb-sub, .tb-fuente, .tb-nota, .torta-nota, .tb-evol-nota").forEach((n) => {
    const sec = n.closest("section, figure, .tb-evol-cuerpo, .kpi-g, div");
    let enc = n.previousElementSibling;
    while (enc && !enc.matches("h3, h4, figcaption, .tb-evol-cab, .kpi-g-cab")) enc = enc.previousElementSibling;
    enc ??= sec?.querySelector("h3, figcaption, .tb-evol-cab, .kpi-g-cab");
    if (!enc) return n.remove();
    let ic = enc.querySelector(".info");
    const txt = n.textContent.trim();
    if (!ic) { enc.insertAdjacentHTML("beforeend", infoIcono("nota", escapar(txt))); }
    else if (!ic.dataset.tip.includes(txt)) ic.dataset.tip += `<br><br>${escapar(txt)}`;
    n.remove();
  });
}
function enlazarInfo(raiz) {
  raiz.querySelectorAll(".info").forEach((b) => {
    b.onpointermove = (ev) => Tip.mostrar(b.dataset.tip, ev);
    b.onpointerleave = () => Tip.ocultar();
    b.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); Tip.mostrar(b.dataset.tip, ev); };   // en el celular, el toque la muestra
  });
}
document.addEventListener("pointerdown", (ev) => { if (!ev.target.closest?.(".info")) Tip.ocultar(); });
function prepararInfo(raiz) { notasATooltip(raiz); enlazarInfo(raiz); }


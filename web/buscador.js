// Buscador tipo GPS: provincia, partido, localidad y dirección en un renglón, con sugerencias desde la primera letra
// (ordenadas por coincidencia y población), filtros en cascada y autocompletado de calles del callejero del INDEC.

const NIVELES_CAMPO = { provincia: ["prov"], partido: ["depto"], localidad: ["gl", "loc"] };
const ORDEN_NIVEL = { prov: 0, depto: 1, gl: 2, loc: 3 };

function prepararBuscador() {
  estado.lugares = estado.datos.buscador.map(([nombre, tipo, provincia, cmus, caja, nivel]) => {
    const clave = normalizar(nombre);
    const pob = sumar(cmus.map((c) => Number(estado.porCmu.get(c)?.poblacion) || 0));
    return { nombre, tipo, provincia, cmus, caja, nivel, clave, palabras: clave.split(/[\s\-.,()]+/).filter(Boolean), pob };
  });
  estado.filtros = { provincia: null, partido: null, localidad: null };
  for (const nivel of ["provincia", "partido", "localidad"]) autocompletar(document.getElementById(`b-${nivel}`), nivel);
  autocompletarDireccion(document.getElementById("b-direccion"));
  document.querySelectorAll(".buscador input").forEach((x) => x.addEventListener("input", actualizarBorrar));
  document.getElementById("form-buscar").addEventListener("submit", (e) => { e.preventDefault(); buscar(); });
  document.getElementById("btn-borrar").onclick = borrarFiltros;
  document.getElementById("b-radio").onchange = (e) => cambiarRadio(Number(e.target.value));
}

// Candidatos para un campo: coincidencia (exacta, empieza, palabras, contiene) y luego los más poblados
function candidatos(nivel, texto) {
  const q = normalizar(texto), fichas = q.split(/[\s\-.,]+/).filter(Boolean);
  if (!q) return [];
  let base = estado.lugares.filter((l) => NIVELES_CAMPO[nivel].includes(l.nivel));
  const prov = estado.filtros.provincia, partido = estado.filtros.partido;
  if (nivel !== "provincia" && prov) base = base.filter((l) => l.provincia === prov.nombre);
  if (nivel === "localidad" && partido) { const S = new Set(partido.cmus); base = base.filter((l) => l.cmus.some((c) => S.has(c))); }
  const puntaje = (l) => {
    if (l.clave === q) return 0;
    if (l.clave.startsWith(q)) return 1;
    if (fichas.every((f) => l.palabras.some((p) => p.startsWith(f)))) return 2;
    if (l.clave.includes(q)) return 3;
    return 9;
  };
  const vistos = new Set();   // el mismo lugar como municipio, localidad y barrio aparece una sola vez
  return base.map((l) => [puntaje(l), l]).filter(([p]) => p < 9)
    .sort((a, b) => a[0] - b[0] || ORDEN_NIVEL[a[1].nivel] - ORDEN_NIVEL[b[1].nivel] || b[1].pob - a[1].pob || a[1].clave.length - b[1].clave.length)
    .filter(([, l]) => { const k = `${l.clave}|${l.provincia}|${l.cmus[0]}`; if (vistos.has(k)) return false; vistos.add(k); return true; })
    .slice(0, 8).map(([, l]) => l);
}
function mejorLugar(nivel, texto) {
  const c = candidatos(nivel, texto), q = normalizar(texto);
  return c.find((l) => l.clave === q) ?? c[0] ?? null;
}
function resaltar(nombre, texto) {
  const q = normalizar(texto).split(/\s+/)[0];
  if (!q) return escapar(nombre);
  const i = normalizar(nombre).indexOf(q);
  return i < 0 ? escapar(nombre) : `${escapar(nombre.slice(0, i))}<mark>${escapar(nombre.slice(i, i + q.length))}</mark>${escapar(nombre.slice(i + q.length))}`;
}

// Lista desplegable accesible y con teclado (compartida por los cuatro campos)
function listaSugerencias(input, { buscarItems, pintarItem, elegir }) {
  const lista = input.parentElement.querySelector(".sugerencias");
  let items = [], pos = -1, version = 0;
  const cerrar = () => { lista.hidden = true; input.setAttribute("aria-expanded", "false"); };
  const pintar = () => {
    if (!items.length) { cerrar(); return; }
    lista.innerHTML = items.map((it, k) => `<li role="option" id="${input.id}-op${k}" aria-selected="${k === pos}" data-k="${k}">${pintarItem(it)}</li>`).join("");
    lista.hidden = false;
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-activedescendant", pos >= 0 ? `${input.id}-op${pos}` : "");
  };
  const actualizar = async () => {
    const v = ++version, res = await buscarItems(input.value);
    if (v !== version) return;
    items = res; pos = items.length ? 0 : -1; pintar();
  };
  input.addEventListener("input", actualizar);
  input.addEventListener("focus", () => { if (input.value.trim()) actualizar(); });
  input.addEventListener("keydown", (e) => {
    if (lista.hidden) return;
    if (e.key === "ArrowDown") { pos = Math.min(pos + 1, items.length - 1); pintar(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { pos = Math.max(pos - 1, 0); pintar(); e.preventDefault(); }
    else if (e.key === "Enter" && items[pos]) { e.preventDefault(); const it = items[pos]; cerrar(); elegir(it); }
    else if (e.key === "Escape") cerrar();
  });
  lista.addEventListener("pointerdown", (e) => {
    const li = e.target.closest("li[data-k]");
    if (!li) return;
    e.preventDefault();
    const it = items[+li.dataset.k]; cerrar(); elegir(it);
  });
  input.addEventListener("blur", () => setTimeout(cerrar, 120));
  return { cerrar };
}

function autocompletar(input, nivel) {
  listaSugerencias(input, {
    buscarItems: async (texto) => candidatos(nivel, texto),
    pintarItem: (l) => `<span class="sug-nombre"><span>${resaltar(l.nombre, input.value)}</span></span>
      <span class="sug-tipo">${escapar(l.tipo)}${l.nivel === "prov" ? "" : ` · ${escapar(l.provincia)}`}</span>`,
    elegir: (l) => elegirLugar(nivel, l),
  });
  input.addEventListener("input", () => { if (!input.value.trim()) estado.filtros[nivel] = null; });
}

function elegirLugar(nivel, l, { volar = true } = {}) {
  const campo = (n) => document.getElementById(`b-${n}`);
  estado.filtros[nivel] = l;
  campo(nivel).value = l.nombre;
  // Cascada: lo de abajo se borra; la provincia se completa sola
  if (nivel === "provincia") for (const n of ["partido", "localidad"]) {
    if (estado.filtros[n] && estado.filtros[n].provincia !== l.nombre) { estado.filtros[n] = null; campo(n).value = ""; }
  }
  if (nivel === "partido") { estado.filtros.localidad = null; campo("localidad").value = ""; }
  if (nivel !== "provincia") {
    const prov = estado.lugares.find((x) => x.nivel === "prov" && x.nombre === l.provincia);
    if (prov) { estado.filtros.provincia = prov; campo("provincia").value = prov.nombre; }
  }
  const dir = campo("direccion").value.trim();
  if (estado.dirPendiente && dir) return buscarDireccion(dir);   // la dirección esperaba este dato: se busca sola
  seleccionarZona(l, { volar });
}

// ---------- Dirección: calles del callejero propio ----------
const VACIAS = new Set(["AV", "AVDA", "AVENIDA", "CALLE", "BV", "BOULEVARD", "BULEVAR", "PJE", "PASAJE", "DR", "DOCTOR",
  "GRAL", "GENERAL", "ING", "INGENIERO", "PTE", "PRESIDENTE", "CNEL", "CORONEL", "DE", "DEL", "LA", "LAS", "LOS", "EL", "Y", "N"]);
const fichasCalle = (txt) => normalizar(txt).toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !VACIAS.has(w));
const nombreCalle = (n) => n.toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase());

async function callejero() {
  estado.callejero ??= { indice: await fetch("datos/callejero/indice.json").then((r) => r.json()), cargados: {} };
  return estado.callejero;
}
async function callesDeZona(zona) {
  const cj = await callejero();
  const deptos = [...new Set(zona.cmus.flatMap((c) => cj.indice.cmu_depto[c] || []))];
  const out = [];
  for (const d of deptos) {
    const archivo = cj.indice.depto_archivo[d];
    if (!archivo) continue;
    cj.cargados[archivo] ??= await fetch(`datos/callejero/${archivo}`).then((r) => r.json());
    out.push([d, cj.cargados[archivo][d] || {}]);
  }
  return out;
}
const zonaDireccion = () => estado.filtros.localidad || estado.filtros.partido;

function autocompletarDireccion(input) {
  listaSugerencias(input, {
    buscarItems: async (texto) => {
      const m = texto.match(/^(.*?)(?:[\s,]+(\d{1,5}))?\s*(?:,.*)?$/);
      const fichas = fichasCalle(m?.[1] ?? texto);
      const zona = zonaDireccion();
      if (!fichas.length || !zona || texto.includes(",")) return [];
      const vistos = new Map();
      for (const [, calles] of await callesDeZona(zona)) {
        for (const [nombre, cuadras] of Object.entries(calles)) {
          const pal = nombre.split(" ");
          if (!fichas.every((f) => pal.some((p) => p.startsWith(f)))) continue;
          vistos.set(nombre, (vistos.get(nombre) ?? 0) + cuadras.length);
        }
      }
      return [...vistos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7)
        .map(([nombre]) => ({ nombre: nombreCalle(nombre), numero: m?.[2] ?? "", zona: zona.nombre }));
    },
    pintarItem: (c) => `<span class="sug-nombre">${icono("pin", "ico ico-sug")}<span>${escapar(c.nombre)} ${escapar(c.numero)}</span></span>
      <span class="sug-tipo">${t("calle")} · ${escapar(c.zona)}</span>`,
    elegir: (c) => {
      input.value = `${c.nombre} ${c.numero}`.trim() + (c.numero ? "" : " ");
      if (c.numero) buscar(); else input.focus();
    },
  });
}

// ---------- Buscar ----------
function resolverEscritos() {
  const aviso = document.getElementById("aviso-busqueda");
  for (const nivel of ["provincia", "partido", "localidad"]) {
    const input = document.getElementById(`b-${nivel}`), txt = input.value.trim();
    if (!txt) { estado.filtros[nivel] = null; continue; }
    const actual = estado.filtros[nivel];
    if (actual && normalizar(actual.nombre) === normalizar(txt)) continue;
    const l = mejorLugar(nivel, txt);
    if (!l) { aviso.textContent = t("lugar_no_encontrado")(txt); aviso.hidden = false; return false; }
    estado.filtros[nivel] = l; input.value = l.nombre;
  }
  return true;
}

function buscar() {
  const aviso = document.getElementById("aviso-busqueda");
  aviso.hidden = true;
  if (esMovil()) document.activeElement?.blur();
  if (!resolverEscritos()) return;
  const dir = document.getElementById("b-direccion").value.trim();
  if (dir) return buscarDireccion(dir);
  const l = estado.filtros.localidad || estado.filtros.partido || estado.filtros.provincia;
  if (l) seleccionarZona(l, { volar: true });
}

// "Mitre 500, Campana": la parte después de la coma es la localidad o el partido
function separarLugarDeDireccion(texto) {
  const i = texto.lastIndexOf(",");
  if (i < 0) return texto;
  const lugar = texto.slice(i + 1).trim(), calle = texto.slice(0, i).trim();
  for (const nivel of ["localidad", "partido"]) {
    const l = mejorLugar(nivel, lugar);
    if (l) { estado.filtros[nivel] = l; document.getElementById(`b-${nivel}`).value = l.nombre; return calle; }
  }
  return texto;
}

async function buscarDireccionLocal(texto) {
  const m = texto.trim().match(/^(.*?)[\s,]+(\d{1,5})\s*$/);
  if (!m) return null;
  const fichas = fichasCalle(m[1]), numero = Number(m[2]);
  if (!fichas.length) return null;
  const zona = zonaDireccion();
  if (!zona) return { error: "elegir_partido" };
  let mejor = null;
  for (const [, calles] of await callesDeZona(zona)) {
    for (const [nombre, cuadras] of Object.entries(calles)) {
      const pal = nombre.split(" ");
      if (!fichas.every((p) => pal.some((w) => w === p || (p.length >= 4 && w.startsWith(p))))) continue;
      const extra = pal.length - fichas.length;
      let cuadra = null, dist = Infinity;
      for (const c of cuadras) {   // cuadra que contiene el número (o la más cercana)
        const dd = c[1] === 0 ? 5000 : numero < c[0] ? c[0] - numero : numero > c[1] ? numero - c[1] : 0;
        if (dd < dist) { dist = dd; cuadra = c; }
      }
      const puntaje = dist * 10 + extra;
      if (cuadra && (!mejor || puntaje < mejor.puntaje)) mejor = { puntaje, nombre, cuadra, dist };
    }
  }
  if (!mejor) return { error: "no_encontrada" };
  const [desde, hasta, x1, y1, x2, y2] = mejor.cuadra;
  const f = hasta > desde ? limitar((numero - desde) / (hasta - desde), 0, 1) : 0.5;
  return { punto: [(x1 + (x2 - x1) * f) / 1e5, (y1 + (y2 - y1) * f) / 1e5], nombre: `${nombreCalle(mejor.nombre)} ${numero}`, aproximada: mejor.dist > 50 };
}

async function buscarDireccion(texto) {
  const aviso = document.getElementById("aviso-busqueda");
  aviso.hidden = true;
  texto = separarLugarDeDireccion(texto);
  const zona = zonaDireccion();
  let punto = null, nombre = null;
  if (!SIN_TESELAS) {
    try {   // 1) servicio oficial de direcciones (versión completa)
      const params = new URLSearchParams({ direccion: texto, max: "1" });
      const p = estado.filtros.partido, prov = estado.filtros.provincia ?? (zona && { nombre: zona.provincia });
      if (p?.nivel === "depto") params.set("departamento", p.nombre);
      if (prov) params.set("provincia", prov.nombre);
      const d = await fetch(`https://apis.datos.gob.ar/georef/api/direcciones?${params}`).then((r) => r.json());
      const r = d.direcciones?.[0];
      if (r) { punto = [r.ubicacion.lon, r.ubicacion.lat]; nombre = nombreCalle(r.nomenclatura.split(",")[0]); }
    } catch (err) { /* sin conexión al servicio: se usa el callejero propio */ }
  }
  if (!punto) {   // 2) callejero propio (cuadras del INDEC publicadas con la web)
    const loc = await buscarDireccionLocal(texto).catch(() => null);
    if (loc?.punto) {
      punto = loc.punto; nombre = loc.nombre;
      if (loc.aproximada) { aviso.textContent = t("dir_aprox"); aviso.hidden = false; }
    } else {
      estado.dirPendiente = loc?.error === "elegir_partido";   // al elegir el lugar, la búsqueda sigue sola
      aviso.textContent = t(estado.dirPendiente ? "dir_elegir_partido" : "dir_no_encontrada");
      aviso.hidden = false;
      return;
    }
  }
  estado.dirPendiente = false;
  seleccionarPunto(punto, { nombre: zona ? `${nombre}, ${zona.nombre}` : nombre, origen: "direccion", volar: true });
}

// Al elegir un punto en el mapa, los campos muestran dónde cae (como un GPS)
function completarCamposDesdePunto(cmu) {
  const m = estado.porCmu.get(cmu);
  if (!m) return;
  const prov = estado.lugares.find((x) => x.nivel === "prov" && x.nombre === m.jur);
  const muni = estado.lugares.find((x) => x.nivel === "gl" && x.cmus[0] === cmu);
  estado.filtros = { provincia: prov ?? null, partido: null, localidad: muni ?? null };
  document.getElementById("b-provincia").value = prov?.nombre ?? "";
  document.getElementById("b-partido").value = "";
  document.getElementById("b-localidad").value = muni?.nombre ?? "";
  actualizarBorrar();
}

function borrarFiltros() {
  estado.filtros = { provincia: null, partido: null, localidad: null };
  estado.dirPendiente = false;
  document.querySelectorAll(".buscador input").forEach((x) => { x.value = ""; });
  document.getElementById("aviso-busqueda").hidden = true;
  seleccionar(null, { volar: true });
}
function actualizarBorrar() {
  const hay = estado.sel || [...document.querySelectorAll(".buscador input")].some((x) => x.value.trim());
  document.getElementById("btn-borrar").hidden = !hay;
}

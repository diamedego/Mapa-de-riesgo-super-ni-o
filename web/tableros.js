// Tableros: uno distinto para cada capa (riesgo, lluvia, viento, temperatura) sobre la selección (Argentina, una
// zona o un círculo alrededor de un punto), con resumen de la situación y acciones recomendadas. Debajo del mapa,
// el análisis por zonas de la capa elegida.

// ---------- Selección y período ----------
function todosLosCmus() { return (estado.todosCmus ??= Object.keys(estado.riesgo.cmu)); }
function cmusSel() {
  const s = estado.sel;
  if (s?.tipo === "zona") return s.lugar.cmus.filter((c) => estado.riesgo.cmu[c]);
  if (s?.tipo === "punto") return s.cmu ? [s.cmu] : [];
  return todosLosCmus();
}
// Días del riesgo a la vista: hoy por defecto, el día que pasa ▶ o el tramo elegido (el mapa pinta el máximo del tramo)
function diasVista() {
  const D = estado.riesgo.dias;
  if (estado.diaRiesgo != null) return [D[estado.diaRiesgo]];
  return D.slice(estado.rangoRiesgo[0], estado.rangoRiesgo[1] + 1);
}
const indicesVista = () => diasVista().map((m) => estado.riesgo.dias.indexOf(m));
const vistaHoy = () => estado.diaRiesgo == null && estado.rangoRiesgo[0] === 0 && estado.rangoRiesgo[1] === 0;
function valoresRiesgoVista() {
  const idx = indicesVista(), out = new Map();
  for (const [cmu, d] of Object.entries(estado.riesgo.cmu)) {
    const vs = idx.map((i) => d.r[i]).filter((v) => v != null);
    if (vs.length) out.set(cmu, Math.max(...vs));
  }
  return out;
}
function textoPeriodo(capa = estado.capa) {
  if (capa === "riesgo") {
    const D = diasVista(), i0 = estado.riesgo.dias.indexOf(D[0]), largo = { weekday: "long", day: "numeric", month: "long" };
    if (D.length === 1) return `${fmtDia(D[0], largo).replace(",", "")} · ${i0 ? t("dentro_n")(i0) : t("hoy")}`;
    return `${fmtDia(D[0])} – ${fmtDia(D[D.length - 1])} · ${t("n_dias")(D.length)}`;
  }
  const T = estado.tiempo;
  if (!T) return "";
  const P = periodoTiempo();
  if (P.tipo === "hora") return t("periodo_hora")(fmtDia(T.horas[P.k].slice(0, 10)), fmtHora(T.horas[P.k]), P.k === pasoAhora(T));
  const n = P.b - P.a + 1;
  return n === 1 ? fmtDia(T.dias[P.a], { weekday: "long", day: "numeric", month: "long" })
    : `${fmtDia(T.dias[P.a])} – ${fmtDia(T.dias[P.b])} · ${t("n_dias")(n)}`;
}
const textoPeriodoCorto = () => (vistaHoy() ? t("hoy") : diasVista().length === 1 ? fmtDia(diasVista()[0]) : `${fmtDia(diasVista()[0])} – ${fmtDia(diasVista().at(-1))}`);

// ---------- Análisis de riesgo ----------
function analisisRiesgoZona(cmus) {
  const R = estado.riesgo, M = R.dias, H = R.H, items = cmus.map((c) => [c, R.cmu[c], estado.porCmu.get(c) || {}]).filter(([, d]) => d);
  const pob = items.map(([, , p]) => Math.max(1, Number(p.poblacion) || 1)), total = sumar(pob);
  const pond = (fn) => M.map((_, i) => sumar(items.map((it, k) => (fn(it[1], i) ?? 0) * pob[k])) / total);
  const pondFijo = (campo) => { const v = items.map(([, , p], k) => [Number(p[campo]), pob[k]]).filter(([n]) => !Number.isNaN(n));
    const w = sumar(v.map(([, p]) => p)); return w ? sumar(v.map(([n, p]) => n * p)) / w : null; };
  const poblacion = sumar(items.map(([, , p]) => Number(p.poblacion) || 0));
  const pondR = (k) => sumar(items.map(([, d], j) => (d[k] ?? 0) * pob[j])) / total;
  const idx = indicesVista();
  const rVista = items.map(([, d]) => Math.max(...idx.map((i) => d.r[i] ?? -1)));
  const porNivel = [1, 2, 3, 4, 5].map((n) => sumar(items.map(([, , p], k) => (nivelRiesgo(rVista[k]) === n ? Number(p.poblacion) || 0 : 0))));
  return {
    tipo: "zona", n: items.length, poblacion, porNivel,
    riesgo: pond((d, i) => d.r[i]), lluvia: pond((d, i) => H[d.lluvia[i]]), rio: pond((d, i) => H[d.rio[i]]), alerta: pond((d, i) => H[d.alerta[i]]),
    terreno: pond((d) => d.pr ?? 0),
    amenaza: pond((d, i) => d.h[i]), E: pondR("E"), V: pondR("V"), sinRio: items.length > 0 && items.every(([, d]) => d.sr === 1),
    personas: M.map((_, i) => sumar(items.map(([, d]) => d.p[i] ?? 0))),
    altos: M.map((_, i) => items.filter(([, d]) => (d.r[i] ?? 0) >= CORTES[2]).length),
    bajo: poblacion ? (100 * sumar(items.map(([, , p]) => Number(p.pob_terreno_bajo) || 0))) / poblacion : null,
    sinCloaca: ((v) => (v == null ? null : 100 - v))(pondFijo("pct_cloaca")), nbi: pondFijo("pct_nbi"),
    materiales: pondFijo("pct_materiales_deficientes"),
  };
}

async function analisisRiesgoCirculo(s) {
  await cargarRadiosEn(cajaCirculo(s.punto, s.km));
  let dentro = estado.radios.filter((f) => distanciaKm(s.punto, f.properties._c) <= s.km);
  if (!dentro.length) {   // círculo chico en zona rural: el radio que contiene el punto o el más cercano
    const cont = estado.radios.find((f) => cajasSeTocan(cajaCirculo(s.punto, 0.01), cajaDe(f.geometry)) && contiene(f.geometry, s.punto));
    let cerca = cont, dmin = Infinity;
    if (!cerca) for (const f of estado.radios) { const d = distanciaKm(s.punto, f.properties._c); if (d < dmin) { dmin = d; cerca = f; } }
    dentro = cerca ? [cerca] : [];
  }
  const R = estado.riesgo, M = R.dias, d = R.cmu[s.cmu];
  const props = dentro.map((f) => f.properties), pob = props.map((p) => Math.max(1, Number(p.poblacion) || 0)), total = sumar(pob);
  const pond = (fn) => sumar(props.map((p, k) => (fn(p) ?? 0) * pob[k])) / total;
  const idx = indicesVista();
  const rVista = props.map((p) => Math.max(...idx.map((i) => Number(p[`r_${M[i]}`]) || 0)));
  const porNivel = [1, 2, 3, 4, 5].map((n) => sumar(props.map((p, k) => (nivelRiesgo(rVista[k]) === n ? Number(p.poblacion) || 0 : 0))));
  const zona = d ? analisisRiesgoZona([s.cmu]) : null;
  return {
    tipo: "circulo", n: props.length, poblacion: sumar(props.map((p) => Number(p.poblacion) || 0)), porNivel,
    riesgo: M.map((m) => (props.length ? pond((p) => Number(p[`r_${m}`])) : null)),
    lluvia: zona?.lluvia ?? M.map(() => null), rio: zona?.rio ?? M.map(() => null), alerta: zona?.alerta ?? M.map(() => null), terreno: zona?.terreno ?? M.map(() => null),
    sinRio: zona?.sinRio ?? false, amenaza: zona?.amenaza ?? M.map(() => null),
    bajo: props.length ? pond((p) => Number(p.pct_area_hand_2m)) : null,
    sinCloaca: props.length ? pond((p) => 100 - Number(p.pct_cloaca)) : null,
    E: pond((p) => Number(p.E)), V: pond((p) => Number(p.V)), municipio: zona, radios: dentro,
  };
}

// ---------- Rasgos del lugar (para el motivo y las recomendaciones) ----------
const numero = (v) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
// Zona: suma o promedio por superficie de sus municipios. Terreno bajo = radios con más de la mitad del área a menos
// de 2 m sobre el curso de agua más cercano (HAND); el mismo criterio que en el círculo.
function rasgosZona(cmus) {
  const fs = cmus.map((c) => estado.porCmu.get(c)).filter(Boolean), area = (p) => numero(p.area_km2) ?? 0, pob = (p) => numero(p.poblacion) ?? 0;
  const porArea = (k) => { let s = 0, w = 0; for (const p of fs) { const v = numero(p[k]); if (v != null) { s += v * area(p); w += area(p); } } return w ? s / w : null; };
  const conCloaca = fs.filter((p) => numero(p.pct_cloaca) != null);
  return {
    area: sumar(fs.map(area)), pob: sumar(fs.map(pob)), pobBajo: sumar(fs.map((p) => numero(p.pob_terreno_bajo) ?? 0)),
    pobDatoCloaca: sumar(conCloaca.map(pob)), pobSinCloaca: sumar(conCloaca.map((p) => (pob(p) * (100 - p.pct_cloaca)) / 100)),
    bp: sumar(fs.map((p) => numero(p.barrios_populares) ?? 0)), urbano: porArea("pct_urbano"), arcilla: porArea("arcilla_pct"),
    pend: porArea("pendiente_grados"), humedal: porArea("pct_humedal"), aguaHist: porArea("pct_area_agua_alguna_vez"),
    n16: porArea("agua_extra_nino_2015_16_pct"), n24: porArea("agua_extra_nino_2023_24_pct"),
  };
}
// Círculo: los radios censales que caen adentro
function rasgosRadios(radios) {
  const ps = radios.map((f) => f.properties), pob = (p) => numero(p.poblacion) ?? 0, area = (p) => pob(p) / Math.max(0.01, numero(p.dens) ?? 0.01);
  const pond = (k, w) => { let s = 0, sw = 0; for (const p of ps) { const v = numero(p[k]); if (v != null) { s += v * w(p); sw += w(p); } } return sw ? s / sw : null; };
  const conCloaca = ps.filter((p) => numero(p.pct_cloaca) != null), sup = sumar(ps.map(area));
  return {
    pob: sumar(ps.map(pob)), pobBajo: sumar(ps.filter((p) => numero(p.pct_area_hand_2m) > 50).map(pob)),
    pobDatoCloaca: sumar(conCloaca.map(pob)), pobSinCloaca: sumar(conCloaca.map((p) => (pob(p) * (100 - p.pct_cloaca)) / 100)),
    nbi: pond("nbi", pob), aguaHist: pond("agua", area), pend: pond("pend", area), dens: sup ? sumar(ps.map(pob)) / sup : null,
  };
}
// Capas que se bajan una sola vez, cuando hacen falta: mientras llegan devuelve null y al llegar vuelve a pintar el tablero
const cargasUnaVez = new Map();
function capaUnaVez(archivo, fn) {
  let c = cargasUnaVez.get(archivo);
  if (!c) {
    cargasUnaVez.set(archivo, (c = { valor: null }));
    c.promesa = fetch(`datos/${archivo}`).then((r) => r.json()).then((g) => { c.valor = fn(g); pintarTablero(); return c.valor; })
      .catch(() => { cargasUnaVez.delete(archivo); return null; });
  }
  return c.valor;
}
const barriosPopulares = () => capaUnaVez("barrios_populares.geojson", (g) => g.features
  .filter((f) => ["Polygon", "MultiPolygon"].includes(f.geometry?.type)).map((f) => ({ fam: numero(f.properties.fam) ?? 0, c: centroDe(f.geometry) })));
const leerInfra = (g) => g.features.filter((f) => f.geometry?.type === "Point").map((f) => ({ g: f.properties.g, n: f.properties.n, p: f.geometry.coordinates }));
const infraCritica = () => capaUnaVez("infraestructura_critica.geojson", leerInfra);
async function infraCriticaLista() {   // espera la carga (la usa el simulador)
  return infraCritica() ?? (await cargasUnaVez.get("infraestructura_critica.geojson")?.promesa) ?? null;
}
function barriosCirculo(s) {
  const todos = barriosPopulares();
  if (!todos) return null;
  const bs = todos.filter((b) => distanciaKm(s.punto, b.c) <= s.km);
  return { n: bs.length, fam: sumar(bs.map((b) => b.fam)) };
}
// Centros de salud y servicios (agua, energía) del círculo; en terreno bajo si su radio censal lo es
function infraCirculo(s, radios) {
  const todo = infraCritica();
  if (!todo) return null;
  const pts = todo.filter((x) => distanciaKm(s.punto, x.p) <= s.km);
  const cajas = radios.map((f) => [f, cajaDe(f.geometry)]);
  const bajo = (p) => cajas.some(([f, c]) => p[0] >= c[0] && p[0] <= c[2] && p[1] >= c[1] && p[1] <= c[3] && numero(f.properties.pct_area_hand_2m) > 50 && contiene(f.geometry, p));
  const salud = pts.filter((x) => x.g === "salud"), serv = pts.filter((x) => x.g === "agua" || x.g === "energia");
  const masCerca = (re, kmMax) => { let m = null;
    for (const x of todo) if (x.g === "salud" && x.n && re.test(x.n)) { const km = distanciaKm(s.punto, x.p); if (km <= kmMax && (!m || km < m.km)) m = { n: x.n, km }; }
    return m; };
  const cercano = masCerca(/hospital/i, 8) ?? masCerca(/sanatorio|cl[ií]nica/i, 8) ?? masCerca(/./, 15);
  return { salud: salud.length, saludBajo: salud.filter((x) => bajo(x.p)).length, servBajo: serv.filter((x) => bajo(x.p)).length, cercano };
}

// Estaciones de río de la selección (zona: dentro de su caja; punto: a menos de 60 km)
function estacionesSel() {
  const s = estado.sel, feats = estado.datos.estaciones.features;
  const lista = feats.map((f) => ({ ...f.properties, c: f.geometry.coordinates }));
  if (s?.tipo === "punto") return lista.map((e) => ({ ...e, km: distanciaKm(s.punto, e.c) })).filter((e) => e.km <= 60).sort((a, b) => a.km - b.km);
  if (s?.tipo === "zona") {
    const [x0, y0, x1, y1] = s.lugar.caja, m = 0.15;
    return lista.filter((e) => e.c[0] >= x0 - m && e.c[0] <= x1 + m && e.c[1] >= y0 - m && e.c[1] <= y1 + m);
  }
  return lista;
}
const pesoEstado = { evacuacion: 3, alerta: 2, normal: 1 };
// Alertas del SMN que tocan la selección
function alertasSel(tipos = null) {
  const s = estado.sel;
  let caja = null;
  if (s?.tipo === "zona") caja = s.lugar.caja;
  if (s?.tipo === "punto") caja = cajaCirculo(s.punto, s.km);
  return estado.datos.alertas.features.filter((f) => (!tipos || tipos.includes(f.properties.tipo))
    && (!caja || cajasSeTocan(cajaDe(f.geometry), caja))).map((f) => f.properties);
}

// ---------- Análisis del tiempo ----------
// Series por municipio (en su centro), calculadas una vez por carga del pronóstico
function tiempoMunicipios() {
  const T = estado.tiempo;
  if (estado.tiempoMuni?.T === T) return estado.tiempoMuni.datos;
  const datos = new Map();
  for (const [cmu, d] of Object.entries(estado.riesgo.cmu)) {
    if (!d.c) continue;
    const [x, y] = d.c, dia = (v) => seriePunto(T, T.diario[v], T.dias.length, x, y), hora = (v) => seriePunto(T, T.horario[v], T.horas.length, x, y);
    datos.set(cmu, { lluvia: dia("lluvia"), prob: dia("prob"), tmax: dia("tmax"), tmin: dia("tmin"), viento: dia("viento"),
      rafaga: dia("rafaga"), dir: dia("dir"), codigo: dia("codigo"),
      h: { lluvia: hora("lluvia"), temp: hora("temp"), viento: hora("viento"), rafaga: hora("rafaga"), dir: hora("dir") } });
  }
  estado.tiempoMuni = { T, datos };
  return datos;
}

// Series de la selección: en el punto, o promedio de los municipios ponderado por población
function tiempoSel() {
  const T = estado.tiempo, s = estado.sel;
  if (s?.tipo === "punto") {
    const [x, y] = s.punto, dia = (v) => seriePunto(T, T.diario[v], T.dias.length, x, y), hora = (v) => seriePunto(T, T.horario[v], T.horas.length, x, y);
    return { tipo: "punto", lluvia: dia("lluvia"), prob: dia("prob"), tmax: dia("tmax"), tmin: dia("tmin"), viento: dia("viento"),
      rafaga: dia("rafaga"), dir: dia("dir"), codigo: dia("codigo"),
      h: { lluvia: hora("lluvia"), temp: hora("temp"), viento: hora("viento"), rafaga: hora("rafaga"), dir: hora("dir") } };
  }
  const TM = tiempoMunicipios(), cmus = cmusSel().filter((c) => TM.has(c));
  const pob = cmus.map((c) => Math.max(1, Number(estado.porCmu.get(c)?.poblacion) || 1)), tot = sumar(pob);
  const prom = (sel) => {
    const n = sel(TM.get(cmus[0])).length;
    return Array.from({ length: n }, (_, k) => {
      let sv = 0, sw = 0;
      cmus.forEach((c, i) => { const v = sel(TM.get(c))[k]; if (v != null) { sv += v * pob[i]; sw += pob[i]; } });
      return sw ? sv / sw : null;
    });
  };
  const codigo = Array.from({ length: T.dias.length }, (_, k) => {   // el código más frecuente (ponderado)
    const votos = new Map();
    cmus.forEach((c, i) => { const v = TM.get(c).codigo[k]; if (v != null) votos.set(v, (votos.get(v) ?? 0) + pob[i]); });
    return [...votos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  });
  const dirMedia = (sel, vel) => Array.from({ length: sel(TM.get(cmus[0])).length }, (_, k) =>
    direccionMedia(cmus.map((c) => sel(TM.get(c))[k]), cmus.map((c, i) => (vel(TM.get(c))[k] ?? 0) * pob[i] / tot)));
  return { tipo: "zona", cmus, lluvia: prom((m) => m.lluvia), prob: prom((m) => m.prob), tmax: prom((m) => m.tmax), tmin: prom((m) => m.tmin),
    viento: prom((m) => m.viento), rafaga: prom((m) => m.rafaga), codigo, dir: dirMedia((m) => m.dir, (m) => m.viento),
    h: { lluvia: prom((m) => m.h.lluvia), temp: prom((m) => m.h.temp), viento: prom((m) => m.h.viento), rafaga: prom((m) => m.h.rafaga),
         dir: dirMedia((m) => m.h.dir, (m) => m.h.viento) } };
}

// Valor de cada municipio de la selección en el período (para rankings y extremos)
function valoresTiempoMunicipios(capa, P = periodoTiempo()) {
  const TM = tiempoMunicipios(), out = [];
  for (const c of cmusSel()) {
    const m = TM.get(c);
    if (!m) continue;
    let v;
    if (P.tipo === "hora") v = capa === "lluvia" ? m.h.lluvia[P.k] : capa === "viento" ? m.h.rafaga[P.k] : capa === "temp" ? m.h.temp[P.k] : null;
    else {
      const rango = (arr) => arr.slice(P.a, P.b + 1).filter((x) => x != null);
      const r = capa === "lluvia" ? rango(m.lluvia) : capa === "viento" ? rango(m.rafaga) : rango(m.tmax);
      v = !r.length ? null : capa === "lluvia" ? sumar(r) : Math.max(...r);
    }
    if (v != null) out.push({ cmu: c, v });
  }
  return out;
}

// Extremo del país en el período, leído en el centro poblado de cada municipio
function extremoMunicipal(capa, P = periodoTiempo()) {
  const TM = tiempoMunicipios();
  let mejor = null;
  for (const [c, m] of TM) {
    let v;
    if (P.tipo === "hora") v = capa === "lluvia" ? m.h.lluvia[P.k] : capa === "viento" ? m.h.rafaga[P.k] : m.h.temp[P.k];
    else {
      const r = (capa === "lluvia" ? m.lluvia : capa === "viento" ? m.rafaga : m.tmax).slice(P.a, P.b + 1).filter((x) => x != null);
      v = r.length ? (capa === "lluvia" ? sumar(r) : Math.max(...r)) : null;
    }
    if (v != null && (!mejor || v > mejor.v)) mejor = { v, cmu: c };
  }
  return mejor;
}

// ---------- Viento: tipos con nombre propio en la Argentina ----------
const PROV_ZONDA = ["Mendoza", "San Juan", "La Rioja", "Catamarca"];
const PROV_PATAGONIA = ["Neuquén", "Río Negro", "Chubut", "Santa Cruz", "Tierra del Fuego, Antártida e Islas del Atlántico Sur"];
const PROV_PAMPA = ["Buenos Aires", "Ciudad Autónoma de Buenos Aires", "La Pampa", "Córdoba", "Santa Fe", "Entre Ríos", "San Luis"];
function tipoViento(dir, vel, raf, punto, provincia) {
  const [lon, lat] = punto;
  const enRango = (a, b) => (a <= b ? dir >= a && dir <= b : dir >= a || dir <= b);
  if (PROV_ZONDA.includes(provincia) && lon < -64 && enRango(230, 340) && raf >= 40) return "zonda";
  if (lon > -60.8 && lat > -36.8 && lat < -32.5 && enRango(100, 162) && vel >= 25) return "sudestada";   // del sudeste (ESE a SSE)
  if (PROV_PATAGONIA.includes(provincia) && enRango(225, 315) && raf >= 55) return "patagonico";
  if (PROV_PAMPA.includes(provincia) && enRango(190, 260) && raf >= 40) return "pampero";
  if ((PROV_PAMPA.includes(provincia) || ["Corrientes", "Chaco", "Santiago del Estero"].includes(provincia)) && enRango(330, 45) && vel >= 22) return "norte";
  return null;
}
function provinciaSel() {
  const s = estado.sel;
  if (s?.tipo === "punto") return estado.porCmu.get(s.cmu)?.jur ?? null;
  if (s?.tipo === "zona") return s.lugar.nivel === "prov" ? s.lugar.nombre : s.lugar.provincia;
  return null;
}
function puntoSel() {
  const s = estado.sel;
  if (s?.tipo === "punto") return s.punto;
  if (s?.tipo === "zona") { const [x0, y0, x1, y1] = s.lugar.caja; return [(x0 + x1) / 2, (y0 + y1) / 2]; }
  return null;
}

// ---------- Piezas comunes ----------
// Botón "Simulador en 3D" (arriba del mapa): con un punto lo abre; con una localidad o municipio usa su centro;
// con el país o una provincia pide elegir un punto
function usarSimulador() {
  const sel = estado.sel, btn = document.getElementById("btn-sim-top");
  if (sel?.tipo === "punto") return abrirSimulador();
  // Provincia: el lugar de mayor riesgo del día elegido dentro de ella, con el círculo más grande (20 km) en su centro poblado
  if (sel?.tipo === "zona" && (sel.lugar.nivel === "prov" || sel.lugar.nivel === "region")) {
    const d = estado.rangoRiesgo?.[0] ?? 0, R = estado.riesgo.cmu;
    const c = sel.lugar.cmus.filter((x) => R[x]?.c).sort((a, b) => (R[b].r[d] ?? 0) - (R[a].r[d] ?? 0))[0];
    if (c) { cambiarRadio(20); seleccionarPunto(R[c].c, { nombre: `${estado.porCmu.get(c)?.nam ?? ""} · ${sel.lugar.nombre}`, origen: "zona", volar: true }); return abrirSimulador(); }
  }
  if (sel?.tipo === "zona" && sel.lugar.nivel !== "prov" && sel.lugar.nivel !== "region") {
    const [x0, y0, x1, y1] = sel.lugar.caja, centro = [(x0 + x1) / 2, (y0 + y1) / 2];
    cambiarRadio(limitar(Math.ceil(distanciaKm(centro, [x1, y1]) * 2) / 2, 1, 20));   // el círculo cubre toda la zona
    seleccionarPunto(centro, { nombre: sel.lugar.nombre, origen: "zona", volar: true });
    return abrirSimulador();
  }
  btn.dataset.ayuda = t("sim_elegir_punto"); btn.classList.add("muestra-ayuda");
  setTimeout(() => { btn.classList.remove("muestra-ayuda"); btn.dataset.ayuda = t("sim_desc"); }, 4000);
}
function cabeceraTablero() {
  const s = estado.sel;
  const titulo = !s ? "Argentina" : s.tipo === "zona" ? s.lugar.nombre : s.nombre ?? t("punto_en_mapa");
  let sub = t("sub_pais");
  if (s?.tipo === "zona") sub = s.lugar.nivel === "prov" ? t("provincia") : `${s.lugar.tipo} · ${s.lugar.provincia}`;
  if (s?.tipo === "punto") { const m = estado.porCmu.get(s.cmu); sub = m ? `${m.nam} · ${m.jur}` : `${fmt(s.punto[1], 3)}, ${fmt(s.punto[0], 3)}`; }
  const tipo = !s ? t("sel_pais") : s.tipo === "zona" ? t("sel_zona") : t("sel_radio")(fmt(s.km, s.km % 1 ? 1 : 0));
  // Radio con barra (0,5 a 20 km): el número cambia al deslizar y la zona se recalcula al soltar
  const radios = "";   // el radio del círculo se ajusta arriba de todo de la lectura (app.js, pintarRadioLectura)
  const acciones = s ? `<button class="btn-icono" data-accion="quitar" aria-label="${t("quitar_seleccion")}" title="${t("quitar_seleccion")}">${icono("cerrar")}</button>` : "";
  const verMuni = s?.tipo === "punto" && s.cmu ? `<button class="btn-texto tb-ver-todo" data-accion="municipio">${t("ver_municipio")(estado.porCmu.get(s.cmu)?.nam ?? "")}</button>` : "";
  return `<header class="tb-cabeza"><div class="tb-titulos"><span class="tb-tipo">${icono(s?.tipo === "punto" ? "objetivo" : "pin")}<span id="tb-tipo-txt">${tipo}</span>${verMuni}</span>
      <h2>${escapar(titulo)}</h2><p>${escapar(sub)}</p></div>${acciones}</header>
    ${radios}${bloqueEvolucion()}`;
}

// Nombre del lugar para los títulos (con el radio si es un círculo)
function lugarTitulo() {
  const s = estado.sel;
  if (!s) return "Argentina";
  if (s.tipo === "zona") return s.lugar.nombre;
  return t("lugar_radio")(s.nombre || estado.porCmu.get(s.cmu)?.nam || t("punto_en_mapa"), fmt(s.km, s.km % 1 ? 1 : 0));
}
// Situación en viñetas: título con el lugar y la fuente en chico debajo; "Qué hacer" en una lista o separado en
// prevención y emergencia (la que urge primero); la aclaración "Orientativo…" chica, a la derecha
function bloqueSituacion(nivel, vinetas, acciones, { nota = "", extra = "" } = {}) {
  const lista = (xs) => `<ul class="tb-acciones">${xs.slice(0, 4).map((a) => `<li>${a}</li>`).join("")}</ul>`;
  const qh = Array.isArray(acciones) ? lista(acciones)
    : acciones.orden.map((k) => `<h4>${t(`acc_tit_${k}`)}</h4>${lista(acciones[k])}${k === "emer" && acciones.pie ? `<p class="tb-acc-pie">${acciones.pie}</p>` : ""}`).join("");
  return `<section class="tb-situacion" data-nivel="${nivel}">
    <h3>${t("situacion_en")(escapar(lugarTitulo()))}${infoIcono("situacion_en", infoTexto("situacion_en"))}</h3>${nota ? `<p class="tb-sub">${nota}</p>` : ""}
    <ul class="tb-vinetas">${vinetas.filter(Boolean).map((v) => (Array.isArray(v) ? `<li><b>${v[0]}:</b> ${v[1]}</li>` : `<li>${v}</li>`)).join("")}</ul>
    ${extra}<h3>${tit("que_hacer")}</h3>${qh}
    <p class="tb-nota">${t("nota_oficial")}</p></section>`;
}
const dato = (etq, valor, extra = "", estadoSem = "") =>
  `<div class="tb-dato${estadoSem ? ` sem-${estadoSem}` : ""}"><span class="tb-dato-etq">${etq}</span><span class="tb-dato-valor">${valor}</span>${extra ? `<span class="tb-dato-extra">${extra}</span>` : ""}</div>`;
function semaforo(v, [verde, rojo]) { return v == null ? "" : v < verde ? "ok" : v < rojo ? "atencion" : "critico"; }
const pastilla = (estadoSem, txt) => `<span class="pill sem-${estadoSem}">${estadoSem === "ok" ? "●" : estadoSem === "atencion" ? "▲" : "✖"} ${txt}</span>`;
const pastillaNivel = (r) => `<span class="pill-nivel" style="--c:var(--r${nivelRiesgo(r) || 1})">${nombreNivel(r)}</span>`;

// Teaser del tiempo para el tablero de riesgo (y viceversa): saltar de capa con un clic
function enlacesCapas(actual) {
  if (!estado.tiempo) return "";
  const S = tiempoSel(), T = estado.tiempo, h0 = diaHoy(T), h6 = Math.min(T.dias.length - 1, h0 + 6);
  const r7 = sumar(S.lluvia.slice(h0, h6 + 1).filter((v) => v != null));
  const raf = Math.max(...S.rafaga.slice(h0, h6 + 1).filter((v) => v != null));
  const tmx = Math.max(...S.tmax.slice(h0, h6 + 1).filter((v) => v != null));
  const items = [["lluvia", `${fmt(r7)} mm`, t("prox_7_dias")], ["viento", `${fmt(raf)} km/h`, t("rafaga_max_7")], ["temp", `${fmt(tmx)} °C`, t("max_7_dias")]]
    .filter(([c]) => c !== actual);
  return `<section class="tb-bloque tb-tiempo-lugar"><h3>${tit("tiempo_en_lugar")}</h3><div class="tb-saltos">${items.map(([c, v, e]) =>
    `<button class="salto" data-capa="${c}">${icono(c)}<span><b>${v}</b>${e}</span></button>`).join("")}</div></section>`;
}

// ---------- Tablero: riesgo ----------
async function tableroRiesgo(cont) {
  const s = estado.sel, M = estado.riesgo.dias, idx = indicesVista();
  const A = s?.tipo === "punto" ? await analisisRiesgoCirculo(s) : analisisRiesgoZona(cmusSel());
  if (estado.sel !== s) return;   // la selección cambió mientras se cargaban los radios
  const peor = idx.reduce((m, i) => (A.riesgo[i] > A.riesgo[m] ? i : m), idx[0]);
  const r = A.riesgo[peor];
  // Amenazas del día (lluvia, río y alerta) y, aparte, la propensión fija del lugar: cada una con su semáforo
  const comps = [["lluvia", A.lluvia[peor]], ["rio", A.rio[peor]], ["alerta", A.alerta[peor]], ["terreno", A.terreno[peor]]];
  const motor = comps.slice(0, 3).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0], prop = A.terreno[peor];
  const ests = estacionesSel().filter((e) => e.estado && e.estado !== "null").sort((a, b) => (pesoEstado[b.estado] ?? 0) - (pesoEstado[a.estado] ?? 0) || (a.km ?? 0) - (b.km ?? 0));
  const alertas = alertasSel();
  const nivel = nivelRiesgo(r);
  const situacion = await situacionRiesgo({ s, A, M, idx, peor, r, nivel, motor, ests, alertas });
  if (estado.sel !== s) return;
  // Ríos
  const rios = ests.slice(0, 4).map((e) => {
    const tope = Math.max(e.nivel_evacuacion ?? e.nivel_alerta, e.h) * 1.12, pos = (v) => `${limitar((100 * v) / tope, 0, 100)}%`;
    return `<li class="rio"><div class="rio-cab"><b>${escapar(e.estacion)}</b> <span>${escapar(nombreRio(e.rio))}${e.km != null ? ` · ${fmt(e.km)} km` : ""}</span>
      <span class="pill sem-${e.estado === "evacuacion" ? "critico" : e.estado === "alerta" ? "atencion" : "ok"}">${t(`rio_${e.estado}`)}</span></div>
      <div class="rio-barra"><span class="rio-nivel" style="width:${pos(e.h)}"></span><i class="umbral al" style="left:${pos(e.nivel_alerta)}"></i>${e.nivel_evacuacion ? `<i class="umbral ev" style="left:${pos(e.nivel_evacuacion)}"></i>` : ""}</div>
      <div class="rio-pie"><span>${fmt(e.h, 2)} m ${e.dh != null ? `(${e.dh > 0 ? "+" : ""}${fmt(e.dh, 2)} m 24 h)` : ""}</span><span>${t("alerta_m")} ${fmt(e.nivel_alerta, 1)} · ${t("evac_m")} ${fmt(e.nivel_evacuacion, 1)}</span></div></li>`;
  }).join("");
  cont.innerHTML = `${cabeceraTablero()}
    <section class="tb-hero hero-riesgo" style="--c:var(--r${nivel || 1})" data-nivel="${nivel}">
      <h3 class="hero-tit">${t("riesgo_inundacion")}${infoIcono("riesgo", infoTexto("riesgo"))}</h3>
      <div class="hero-fila"><div class="hero-num"><span class="hero-valor">${fmtRiesgo(r)}</span></div>
        <div class="hero-lado">${pastillaNivel(r)}</div></div>
      <div class="medidor-caja">${medidorRiesgo(r)}</div>
      ${prop != null ? `<div class="hero-prop" style="--c:${colorNivel(prop)}"><span class="hero-prop-etq">${t("prop_t")}${infoIcono("prop_t", infoTexto("prop_t"))}</span>
        <span class="hero-prop-v"><i aria-hidden="true"></i><b>${fmtRiesgo(prop)}</b><small>/ 10</small><span>${nombreNivel(prop)}</span></span></div>` : ""}
    </section>
    ${bloqueCambios(cmusSel())}
    ${situacion}
    <section class="tb-bloque"><h3>${tit("que_lo_explica")}</h3><p class="tb-sub">${t("explica_nota")(textoPeriodoCorto())}</p>
      <div class="tb-comps">${comps.map(([k, v]) => `<div class="comp"><span class="comp-etq">${t(`comp_${k}`)}</span>
        ${k === "rio" && A.sinRio ? `<span class="comp-pista"></span><b data-tip="${escapar(t("sin_info_rio"))}">${t("sin_info")}</b>` : `<span class="comp-pista"><span style="width:${limitar((v ?? 0) * 10, 0, 100)}%;background:${colorNivel(v)}"></span></span><b>${fmtRiesgo(v)}</b>`}</div>`).join("")}</div>
    </section>
    ${rios ? `<section class="tb-bloque"><h3>${icono("rio")} ${tit("rios_cercanos")}</h3><p class="tb-sub">${t("fuente_ina")}</p><ul class="rios">${rios}</ul></section>` : ""}
    ${enlacesCapas("riesgo")}`;
  enlazarCambios(cont);
  tipsEn(cont);
}

// ---------- Qué cambia en los próximos días ----------
// Para cada municipio de la selección: su nivel de riesgo de hoy y el mayor de los próximos N días (y el primer día en que llega),
// con la amenaza que lo causa (lluvia, río o alerta del SMN), su probabilidad y una recomendación armada con los datos del lugar.
// Tres grupos: suben de nivel, siguen en riesgo alto y bajan.
function causaDia(d, i) {
  const n = d.n[i];
  return !n ? null : d.alerta[i] === n ? "alerta" : d.rio[i] === n ? "rio" : "lluvia";
}
function cambiosNivel(cmus, N) {
  const R = estado.riesgo, u = Math.min(N, R.dias.length - 1), out = { sube: [], sigue: [], baja: [] };
  for (const c of cmus) {
    const d = R.cmu[c];
    if (!d) continue;
    const niv = (i) => nivelRiesgo(d.r[i]) || 1, n0 = niv(0), m = estado.porCmu.get(c) ?? {};
    let iMax = 1;
    for (let i = 2; i <= u; i++) if (niv(i) > niv(iMax)) iMax = i;
    const base = { c, n0, nombre: m.nam ?? c, prov: ABREV_PROV[m.jur] ?? m.jur ?? "", pob: Number(m.poblacion) || 0 };
    if (niv(iMax) > n0) out.sube.push({ ...base, n1: niv(iMax), i: iMax, causa: causaDia(d, iMax), prob: d.prob[iMax] ?? 0 });
    else if (n0 >= 4 && niv(iMax) >= 4) out.sigue.push({ ...base, n1: niv(iMax), i: iMax, causa: causaDia(d, iMax) ?? causaDia(d, 0), prob: d.prob[iMax] ?? 0 });
    else if (n0 >= 3) {
      const iB = Array.from({ length: u }, (_, k) => k + 1).find((i) => niv(i) < n0);
      if (iB) out.baja.push({ ...base, n1: niv(iB), i: iB, causa: causaDia(d, 0), prob: d.prob[0] ?? 0 });
    }
  }
  out.sube.sort((a, b) => b.n1 - a.n1 || a.i - b.i || b.pob - a.pob);
  out.sigue.sort((a, b) => b.n1 - a.n1 || b.pob - a.pob);
  out.baja.sort((a, b) => b.n0 - a.n0 || a.i - b.i || b.pob - a.pob);
  return out;
}
// Recomendación para un municipio que cambia de nivel: según la amenaza y el lugar (terreno bajo, cloacas), con el día límite
function recCambio(it) {
  const R = estado.riesgo, d = R.cmu[it.c], m = estado.porCmu.get(it.c) ?? {}, dia = fmtDiaFrase(R.dias[it.i]), pct = fmt(100 * (it.prob ?? 0));
  let txt;
  if (it.causa === "rio") {
    const c0 = d.c, D = R.dias[it.i];
    const e = estado.datos.estaciones.features.filter((f) => f.properties[`nd_${D}`] != null && c0 && distanciaKm(c0, f.geometry.coordinates) <= 30)
      .sort((a, b) => b.properties[`nd_${D}`] - a.properties[`nd_${D}`])[0]?.properties;
    txt = t("rec_rio")(e ? escapar(e.estacion) : null, t("rio_nivel_pron")[Math.min(2, d.rio[it.i])], pct, dia);
  } else if (it.causa === "alerta") txt = t("rec_alerta")(t(`nivel_alerta_${["", "amarilla", "naranja", "roja"][d.alerta[it.i]]}`) ?? "", dia);
  else if (it.causa === "lluvia") txt = t("rec_lluvia")(t(`nivel_alerta_${["", "amarilla", "naranja", "roja"][d.lluvia[it.i]]}`) ?? "", pct, dia);
  else txt = t("rec_baja");
  // Habitantes expuestos ese día (terreno del simulador con la lluvia pronosticada): la medida se dirige a ellos, no a todo el lugar
  const N = d.xd?.[it.i] ?? 0, pob = Number(m.poblacion) || 0;
  const extra = it.causa === "rio" ? "" : N >= 1 ? t("rec_expuestos")(fmt(Math.round(N)), pob ? fmt((100 * N) / pob, 1) : null) : t("rec_sin_expuestos");
  return `${txt} ${extra}`.trim();
}
function bloqueCambios(cmus) {
  const N = estado.horizonte ?? 7, C = cambiosNivel(cmus, N), tab = estado.cambiosTab && C[estado.cambiosTab].length ? estado.cambiosTab : C.sube.length ? "sube" : C.sigue.length ? "sigue" : "baja";
  const lista = C[tab], todos = !!estado.cambiosTodos, vis = todos ? lista : lista.slice(0, 6), R = estado.riesgo;
  const chip = (n) => `<i class="cb-niv" style="--c:var(--r${n})">${t("niveles_cortos")[n - 1]}</i>`;
  const cuando = (it) => (tab === "sigue" ? t("cb_sigue")(it.i) : `${t("dentro_n")(it.i)} · ${fmtDia(R.dias[it.i], { weekday: "short", day: "numeric" }).replace(".", "")}`);
  const filas = vis.map((it) => `<li class="cb-fila" data-cmu="${it.c}" tabindex="0">
      <div class="cb-cab"><span class="cb-nombre"><b>${escapar(it.nombre)}</b><small>${escapar(it.prov)}</small></span>
        <span class="cb-niveles">${chip(it.n0)}<span class="cb-flecha" aria-hidden="true">→</span>${chip(it.n1)}</span>
        <span class="cb-cuando">${cuando(it)}</span></div>
      <p class="cb-rec">${it.causa ? `<b>${t(`cb_causa_${it.causa}`)}</b> · ` : ""}${recCambio(it)}</p></li>`).join("");
  const pest = ["sube", "sigue", "baja"].map((k) => `<button type="button" role="tab" data-cb-tab="${k}" aria-selected="${k === tab}">${t(`cb_tab_${k}`)} <span class="cb-n">${fmt(C[k].length)}</span></button>`).join("");
  const horiz = [3, 7, 14].map((n) => `<button type="button" role="radio" data-cb-h="${n}" aria-checked="${n === N}">${t("n_dias")(n)}</button>`).join("");
  return `<section class="tb-bloque tb-cambios"><h3>${tit("cb_t")}</h3>
    <div class="cb-controles"><span class="etq">${t("cb_horizonte")}</span><div class="seg cb-horiz" role="radiogroup" aria-label="${t("cb_horizonte")}">${horiz}</div></div>
    <div class="pestanas cb-pest" role="tablist">${pest}</div>
    ${lista.length ? `<ol class="cb-lista">${filas}</ol>${lista.length > 6 ? `<button type="button" class="btn-texto cb-todos" data-cb-todos>${todos ? t("cb_menos") : t("cb_todos")(fmt(lista.length))}</button>` : ""}`
      : `<p class="tb-sub cb-vacio">${t(`cb_vacio_${tab}`)(N)}</p>`}
    <p class="tb-sub">${t("cb_nota")}</p></section>`;
}
function enlazarCambios(cont) {
  cont.querySelectorAll("[data-cb-h]").forEach((b) => { b.onclick = () => { estado.horizonte = +b.dataset.cbH; estado.cambiosTodos = false; pintarTablero(); }; });
  cont.querySelectorAll("[data-cb-tab]").forEach((b) => { b.onclick = () => { estado.cambiosTab = b.dataset.cbTab; estado.cambiosTodos = false; pintarTablero(); }; });
  cont.querySelector("[data-cb-todos]")?.addEventListener("click", () => { estado.cambiosTodos = !estado.cambiosTodos; pintarTablero(); });
  cont.querySelectorAll(".cb-fila").forEach((li) => {
    const ir = () => { const l = estado.lugares.find((x) => x.nivel === "gl" && x.cmus[0] === li.dataset.cmu); if (l) elegirLugar("localidad", l); };
    li.onclick = ir; li.onkeydown = (ev) => { if (ev.key === "Enter") ir(); };
  });
}

// Situación del riesgo en viñetas, con tortas de población y "Qué hacer" armado con los datos del lugar: amenaza que
// domina, nivel y duración, terreno, suelo, cloacas, barrios populares, centros de salud, antecedentes de El Niño,
// ríos, alertas, lluvia de los próximos días y cuánto falta para el peor mes
async function situacionRiesgo({ s, A, M, idx, peor, r, nivel, motor, ests, alertas }) {
  const actual = vistaHoy(), iHoy = 0, circulo = s?.tipo === "punto", largo = { weekday: "long", day: "numeric", month: "long" };
  const cmus = circulo ? null : cmusSel(), muni = circulo && s.cmu ? estado.porCmu.get(s.cmu) : null;
  const Z = circulo ? rasgosRadios(A.radios) : rasgosZona(cmus);
  const ZM = circulo ? (s.cmu ? rasgosZona([s.cmu]) : null) : Z;   // los antecedentes de El Niño están por municipio
  const suelo = circulo ? await sueloEn(s.punto).catch(() => null) : null;
  const barrios = circulo ? barriosCirculo(s) : null, infra = circulo ? infraCirculo(s, A.radios) : null;
  const pct = (a, b) => (b > 0 ? (100 * a) / b : null), fmtPct = (v) => (v > 0 && v < 1 ? "<1" : fmt(v));
  const bajoP = pct(Z.pobBajo, Z.pob), sinP = pct(Z.pobSinCloaca, Z.pobDatoCloaca);
  const e0 = ests[0], rioE0 = e0 ? escapar(nombreRio(e0.rio) || e0.estacion) : null;
  // Crecida: el río es la amenaza que manda; quebrada: lluvia fuerte sobre terreno empinado (crecidas repentinas)
  const crecida = motor[0] === "rio" && (motor[1] ?? 0) >= 3, quebrada = motor[0] === "lluvia" && (motor[1] ?? 0) >= 3 && (Z.pend ?? 0) >= 8;
  const tiposAlerta = [...new Set(alertas.map((a) => t(`alerta_${a.tipo}`).toLowerCase()))].join(", ");
  const vin = [];
  // Situación: nivel, comparación y qué lo explica
  let comp = "";
  if (!circulo && cmus.length === 1) {
    const vals = [...valoresRiesgoVista().values()], p = Math.floor((100 * vals.filter((v) => v < r).length) / Math.max(1, vals.length));
    comp = p >= 50 ? t("sit_mas_que")(fmt(p)) : t("sit_menos_que")(fmt(100 - p));
  } else if (circulo && muni && A.municipio?.riesgo[peor] != null) comp = t("sit_vs_muni")(r >= A.municipio.riesgo[peor], escapar(muni.nam), fmtRiesgo(A.municipio.riesgo[peor]));
  vin.push([t("v_situacion"), `${t("sit_nivel")(nombreNivel(r).toLowerCase(), fmtRiesgo(r))}${comp ? `, ${comp}` : ""}.${A.amenaza[peor] != null && A.E != null
    ? ` ${t("sit_inform")(fmtRiesgo(A.amenaza[peor]), fmtRiesgo(A.E), fmtRiesgo(A.V))}` : ""}`]);
  if (actual) {   // ahora: ríos y alertas
    const ahora = [e0 ? t("sit_rio")(rioE0, escapar(e0.estacion), t(`rio_${e0.estado}`), fmt(e0.h, 2), fmt(e0.nivel_evacuacion, 2), e0.dh) : "",
      alertas.length ? t("sit_alertas")(alertas.length, tiposAlerta, alertas.some((a) => a.nivel === "naranja" || a.nivel === "roja")) : ""].filter(Boolean);
    if (ahora.length) vin.push([t("v_ahora"), ahora.join(" ")]);
  }
  // Período, duración y día más comprometido (mirando hoy: de hoy a 14 días)
  const horiz = actual ? M.map((_, i) => i) : idx;
  const altos = horiz.filter((i) => nivelRiesgo(A.riesgo[i]) >= 4);
  const iPeor = horiz.reduce((m, i) => ((A.riesgo[i] ?? -1) > (A.riesgo[m] ?? -1) ? i : m), horiz[0]);
  vin.push([t("v_periodo"), `${capitalizar(textoPeriodo("riesgo"))}. ${altos.length
    ? t("dias_altos")(altos.length, horiz.length, actual, fmtDia(M[altos[0]]), fmtDia(M[altos[altos.length - 1]])) : t("sin_dias_altos")(actual)}`]);
  vin.push([t("v_peor_dia"), `${fmtDia(M[iPeor], largo).replace(",", "")}${iPeor ? ` (${t("dentro_n")(iPeor)})` : ""}: ${nombreNivel(A.riesgo[iPeor]).toLowerCase()} (${fmtRiesgo(A.riesgo[iPeor])}/10)`]);
  // Motivo: por qué el agua no se absorbe ni se va
  const fac = [];
  if (crecida) fac.push(rioE0 ? t("mot_rio")(rioE0) : t("mot_rio_sin"));
  if (bajoP >= 10) fac.push(t("mot_bajo")(fmt(bajoP)));
  if (quebrada || (Z.pend ?? 0) >= 8) fac.push(t("mot_pendiente")(fmt(Z.pend ?? 0)));
  else if (Z.pend != null && Z.pend < 1) fac.push(t("mot_plano")(fmt(Z.pend, 1)));
  if (suelo?.ks != null) { if (suelo.ks <= 6.5) fac.push(t("mot_suelo")(t("textura")(suelo.nombre), fmt(suelo.ks, suelo.ks < 1 ? 1 : 0))); }
  else if (Z.arcilla >= 25) fac.push(t("mot_arcilla")(fmt(Z.arcilla)));
  if (Z.urbano >= 30) fac.push(t("mot_urbano")(fmt(Z.urbano)));
  else if (Z.dens >= 3000) fac.push(t("mot_denso")(fmt(Z.dens)));
  if (sinP >= 20) fac.push(t("mot_cloaca")(fmt(sinP)));
  if (Z.humedal >= 10) fac.push(t("mot_humedal")(fmt(Z.humedal)));
  vin.push([t("v_motivo"), `${(motor[1] ?? 0) >= 3 ? t("mot_tipo")[motor[0]] : t("mot_amenaza_baja")(t("mot_tipo")[motor[0]].toLowerCase())}. ${fac.length
    ? `${capitalizar(fac.slice(0, 4).join("; "))}.` : t("mot_ninguno")}`]);
  // Antecedentes: agua extra vista por satélite en los Niño 2015-16 y 2023-24, y agua alguna vez desde 1984
  const donde = circulo ? t("donde_muni")(escapar(muni?.nam ?? "")) : s ? t("donde_zona") : t("donde_pais"), ant = [];
  const ninos = [["2015-16", ZM?.n16], ["2023-24", ZM?.n24]].filter(([, v]) => v != null && v >= 0.1)
    .map(([anio, v]) => { const km2 = (ZM.area * v) / 100; return t("ant_nino_item")(fmt(v, v < 10 ? 1 : 0), anio, fmt(km2, km2 < 10 ? 1 : 0)); });
  if (ninos.length) ant.push(t("ant_nino")(ninos.join(t("y")), donde));
  if (Z.aguaHist >= 1) ant.push(t("ant_jrc")(fmt(Z.aguaHist), circulo ? t("donde_area") : s ? t("donde_zona") : t("donde_pais")));
  vin.push([t("v_antecedentes"), ant.length ? `${capitalizar(ant.join("; "))}.` : t("ant_ninguno")]);
  // Población, con tortas: por nivel de riesgo, cloaca y terreno
  const nbi = circulo ? Z.nbi : A.nbi, nBarrios = circulo ? barrios?.n ?? 0 : Z.bp;
  vin.push([t("v_poblacion"), [t("pob_personas")(fmtPersonas(A.poblacion)),
    nBarrios ? (circulo ? t("pob_barrios_fam")(nBarrios, fmtPersonas(barrios.fam)) : t("pob_barrios")(fmt(nBarrios))) : "",
    nbi != null ? t("pob_nbi")(fmt(nbi, 1)) : ""].filter(Boolean).join(" · ")]);
  const tot = sumar(A.porNivel), tip = (etq, v, de) => `<b>${escapar(etq)}</b><span>${fmtPersonas(v)} · ${fmtPct(pct(v, de))} %</span>`;
  const leyenda = (filas) => `<ul class="torta-ley">${filas.map(([color, etq, v, de]) =>
    `<li><i style="background:${color}"></i><span>${escapar(etq)} <b>${fmtPct(pct(v, de))} %</b><small>${fmtPersonas(v)}</small></span></li>`).join("")}</ul>`;
  const figura = (tit, cuerpo, clave) => `<figure class="torta-fig"><figcaption>${tit}${infoIcono(clave, infoTexto(clave))}</figcaption>${cuerpo}</figure>`;
  const anillo = (tit, filas, centro, clave) => figura(tit, `${torta(filas.map(([color, etq, v, de]) => ({ v, color, tip: tip(etq, v, de) })), { centro, etiqueta: tit })}${leyenda(filas)}`, clave);
  const sinInfo = (tit, clave) => figura(tit, `<p class="torta-sin">${t("sin_informacion")}</p>`, clave);
  const niveles = [1, 2, 3, 4, 5].map((n) => [`var(--r${n})`, t("niveles")[n - 1], A.porNivel[n - 1], tot]).filter((f) => f[2] > 0);
  const tortas = `<div class="tortas">
    ${tot ? anillo(t("torta_niveles"), niveles, `${fmtPct(pct(A.porNivel[3] + A.porNivel[4], tot))} %`, "torta_niveles") : sinInfo(t("torta_niveles"), "torta_niveles")}
    ${Z.pobDatoCloaca > 0 ? anillo(t("torta_cloaca"), [["var(--s-2)", t("sin_cloaca"), Z.pobSinCloaca, Z.pobDatoCloaca],
      ["var(--torta-resto)", t("con_cloaca"), Z.pobDatoCloaca - Z.pobSinCloaca, Z.pobDatoCloaca]], `${fmtPct(sinP)} %`, "torta_cloaca") : sinInfo(t("torta_cloaca"), "torta_cloaca")}
    ${Z.pob > 0 ? anillo(t("torta_terreno"), [["var(--s-1)", t("terreno_bajo_l"), Z.pobBajo, Z.pob], ["var(--torta-resto)", t("terreno_alto_l"), Z.pob - Z.pobBajo, Z.pob]],
      `${fmtPct(bajoP)} %`, "torta_terreno") : sinInfo(t("torta_terreno"), "torta_terreno")}</div><p class="tb-sub">${t("tortas_nota")}</p>`;
  // Qué hacer: cada recomendación sale de un dato del lugar; se ordenan por prioridad y se muestran las 4 primeras
  const prev = [], emer = [], evac = actual && ests.some((e) => e.estado === "evacuacion");
  if (actual && estado.tiempo) {   // la lluvia más fuerte de los próximos 7 días
    const T = estado.tiempo, S = tiempoSel(), h0 = diaHoy(T);
    let iMx = -1;
    for (let i = h0; i < Math.min(T.dias.length, h0 + 7); i++) if (S.lluvia[i] != null && (iMx < 0 || S.lluvia[i] > S.lluvia[iMx])) iMx = i;
    if (iMx >= 0 && S.lluvia[iMx] >= 20) prev.push([95, t("prev_lluvia_pronto")(fmtDiaFrase(T.dias[iMx]), fmt(S.lluvia[iMx]))]);
  }
  {   // pronóstico de caudales (GloFAS en altura): la estación de la selección que primero llega a evacuación en los próximos días
    const D = estado.riesgo.dias, conPron = estacionesSel().map((e) => {
      const k = D.findIndex((d, i) => i > 0 && Number(e[`nd_${d}`]) >= 2);
      return k > 0 ? { e, k, p: Number(e[`pd_${D[k]}`]) || 0 } : null;
    }).filter(Boolean).sort((x, y) => x.k - y.k)[0];
    if (conPron) prev.push([92, t("acc_rio_pron")(escapar(conPron.e.estacion), fmtDiaFrase(D[conPron.k]), fmt(conPron.p * 100))]);
  }
  if (e0 && (crecida || e0.estado === "alerta" || e0.estado === "evacuacion"))
    prev.push([88, t("prev_rio_seguir")(rioE0, escapar(e0.estacion), fmt(e0.h, 2), e0.nivel_alerta == null ? null : fmt(e0.nivel_alerta, 2), e0.nivel_evacuacion == null ? null : fmt(e0.nivel_evacuacion, 2))]);
  if (quebrada) prev.push([86, t("prev_quebrada")]);
  if (iPeor > iHoy && nivelRiesgo(A.riesgo[iPeor]) >= 3) prev.push([70, t("prev_tiempo")(fmtDiaFrase(M[iPeor]))]);
  if (bajoP >= 15) prev.push([50 + bajoP / 2, t("prev_bajo")(fmt(bajoP))]);
  if (sinP >= 20 && !quebrada) prev.push([45 + sinP / 2, t("prev_cloaca")(fmt(sinP))]);
  const nino = [["2015-16", ZM?.n16], ["2023-24", ZM?.n24]].filter(([, v]) => v != null).sort((a, b) => b[1] - a[1])[0];
  if (nino && nino[1] >= 1) prev.push([Math.min(90, 55 + 3 * nino[1]), t("prev_historia")(nino[0], fmt(nino[1], nino[1] < 10 ? 1 : 0), donde)]);
  if (infra?.saludBajo) prev.push([60, t("prev_salud")(infra.saludBajo, infra.salud)]);
  if (infra?.servBajo) prev.push([52, t("prev_servicios")(infra.servBajo)]);
  if (nBarrios && nivel >= 3) prev.push([40 + Math.min(20, nBarrios), t("prev_barrios")(fmt(nBarrios), circulo ? t("donde_area") : t("donde_zona"))]);
  if (Z.urbano >= 30) prev.push([42, t("prev_urbano")(fmt(Z.urbano))]);
  else if (Z.dens >= 3000) prev.push([42, t("prev_denso")]);
  if (nivel >= 3) prev.push([35, t("acc_kit")]);
  if (!prev.length) prev.push([1, t("acc_bajo")]);
  if (evac) { const ev = ests.find((e) => e.estado === "evacuacion"); emer.push([100, t("emer_rio_evac")(escapar(nombreRio(ev.rio) || ev.estacion), escapar(ev.estacion))]); }
  if (alertas.length) emer.push([96, t("emer_alerta")(tiposAlerta)]);
  if (quebrada) emer.push([90, t("emer_quebrada")]);
  if (motor[0] === "lluvia" || bajoP >= 10) emer.push([80, t("emer_calles")]);
  if (crecida || e0?.estado === "alerta" || e0?.estado === "evacuacion") emer.push([78, t("emer_evacuar")]);
  if (bajoP >= 10 || nivel >= 3) emer.push([70, t("emer_luz")]);
  if (infra?.cercano) emer.push([66, t("emer_salud_cerca")(escapar(infra.cercano.n), fmt(infra.cercano.km, 1))]);
  if (sinP >= 20) emer.push([60 + sinP / 4, t("emer_agua_potable")]);
  if (nivel >= 3) emer.push([40, t("emer_despues")]);
  if (!emer.length) emer.push([1, t("emer_calles")]);
  const ordenar = (xs) => xs.sort((a, b) => b[0] - a[0]).map((x) => x[1]);
  const urge = evac || alertas.some((a) => a.nivel === "naranja" || a.nivel === "roja");
  return bloqueSituacion(nivel, vin, { prev: ordenar(prev), emer: ordenar(emer), orden: urge ? ["emer", "prev"] : ["prev", "emer"], pie: t("emer_tel") },
    { nota: t("sit_fuente"), extra: tortas });
}

// ---------- Tablero: lluvia ----------
function categoriaLluvia(mmDia) { return mmDia < 1 ? "cat_sin" : mmDia < 10 ? "cat_debil" : mmDia < 20 ? "cat_moderada" : mmDia < 50 ? "cat_fuerte" : "cat_intensa"; }
function tableroLluvia(cont) {
  const T = estado.tiempo, S = tiempoSel(), P = periodoTiempo(), s = estado.sel;
  const [a, b] = P.tipo === "hora" ? [diaHoy(T), Math.min(T.dias.length - 1, diaHoy(T) + 2)] : [P.a, P.b];
  const dias = T.dias.map((d) => fmtDia(d, { weekday: "short", day: "numeric" }));
  const tramo = S.lluvia.slice(a, b + 1), total = sumar(tramo.filter((v) => v != null));
  const iMax = a + tramo.indexOf(Math.max(...tramo.filter((v) => v != null)));
  const maxDia = S.lluvia[iMax] ?? 0, prob = S.prob[iMax];
  const d20 = tramo.filter((v) => v >= 20).length;
  const ahora = S.h.lluvia[P.tipo === "hora" ? P.k : pasoAhora(T)];
  const lugar = s ? (s.tipo === "zona" ? s.lugar.nombre : t("el_area_cap")) : "Argentina";
  const vals = valoresTiempoMunicipios("lluvia"), ext = vals.sort((x, y) => y.v - x.v)[0];
  const nivelR = s?.tipo === "punto" && s.cmu ? nivelRiesgo(Math.max(...indicesVista().map((i) => estado.riesgo.cmu[s.cmu]?.r[i] ?? 0))) : 0;
  const alertas = estado.modo === "actual" ? alertasSel(["tormentas", "lluvias"]) : [];
  const cat = categoriaLluvia(maxDia);
  const nivel = maxDia >= 50 ? 5 : maxDia >= 20 ? 4 : maxDia >= 10 ? 3 : 1;
  const parrafos = [
    maxDia < 1 ? t("sit_lluvia_nada") : t("sit_lluvia")(escapar(lugar), fmt(total), null, t(cat)),
    maxDia >= 1 ? t("sit_lluvia_dia")(fmtDiaFrase(T.dias[iMax]), fmt(maxDia), prob == null ? null : fmt(prob)) : "",
    d20 ? t("sit_lluvia_20")(d20) : "",
    estado.modo === "actual" ? (ahora >= 0.5 ? t("sit_lluvia_ahora")(fmt(ahora, 1)) : t("sit_lluvia_no_ahora")) : "",
    !s && ext ? t("sit_extremo")(fmt(ext.v), escapar(estado.porCmu.get(ext.cmu)?.nam), escapar(estado.porCmu.get(ext.cmu)?.jur)) : "",
    nivelR >= 4 && maxDia >= 20 ? t("sit_lluvia_riesgo")(t("niveles")[nivelR - 1].toLowerCase()) : "",
    alertas.length ? t("sit_alertas")(alertas.length, t("alerta_tormentas").toLowerCase(), alertas.some((x) => x.nivel !== "amarilla")) : "",
  ];
  const acc = [];
  if (alertas.length) acc.push(t("acc_alerta_tormenta"));
  if (maxDia >= 50) acc.push(t("acc_lluvia_intensa"), t("acc_desagues_dia")(fmtDiaFrase(T.dias[iMax], { weekday: "long" })));
  else if (maxDia >= 20) acc.push(t("acc_lluvia_fuerte")(fmtDiaFrase(T.dias[iMax], { weekday: "long" })));
  if (!acc.length) acc.push(total < 5 ? t("acc_sin_lluvia") : t("acc_lluvia_normal"));
  const iconos = S.codigo.map((c) => iconoTrazos(tiempoWmo(c).ico));
  cont.innerHTML = `${cabeceraTablero()}
    <section class="tb-hero">
      <div class="hero-fila"><div class="hero-num"><span class="hero-valor">${fmt(total)}</span><span class="hero-unidad">mm</span></div>
      <div class="hero-lado"><span class="pill-lluvia" data-cat="${cat}">${t(cat)}</span><span class="hero-sub">${t("lluvia_periodo")}${s ? "" : ` · ${t("promedio_pob")}`}</span></div></div>
      <div class="tb-datos tres">
        ${dato(t("dia_mas_lluvioso"), `${fmt(maxDia)} mm`, fmtDia(T.dias[iMax]))}
        ${dato(t("prob_max"), prob == null ? "–" : `${fmt(prob)} %`, t("ese_dia"))}
        ${dato(estado.modo === "actual" ? t("prox_3h") : t("dias_20mm"), estado.modo === "actual" ? `${fmt(ahora ?? 0, 1)} mm` : fmt(d20), estado.modo === "actual" ? t("ahora") : t("en_periodo"))}
      </div>
    </section>
    ${bloqueSituacion(nivel, parrafos, acc, { nota: t("fuente_pronostico") })}
    <section class="tb-bloque"><h3>${tit("lluvia_por_dia")}</h3><p class="tb-sub">${t("ayuda_click_dia")}</p><div id="tb-lluvia-dias" class="graf-cont"></div></section>
    <section class="tb-bloque"><h3>${tit("prox_48h")}</h3><div id="tb-lluvia-48" class="graf-cont"></div></section>
    ${!s || s.tipo === "zona" ? `<section class="tb-bloque"><h3>${tit("donde_mas_llueve")}</h3><div id="tb-lluvia-rk"></div></section>` : ""}
    ${enlacesCapas("lluvia")}`;
  grafBarras(document.getElementById("tb-lluvia-dias"), {
    etiquetas: dias, valores: S.lluvia.map((v) => (v == null ? null : Math.round(v * 10) / 10)), alto: 190, iconos,
    activos: [a, b], marcar: "max", formato: (v) => `${fmt(v, v < 10 ? 1 : 0)} mm`, refs: [{ valor: 20, texto: "20 mm" }], unidad: "mm",
    colores: (i, v) => (v >= 50 ? "var(--lluvia-5)" : v >= 20 ? "var(--lluvia-4)" : "var(--s-1)"),
    tip: (i) => `<span class="tip-titulo">${fmtDia(T.dias[i], { weekday: "long", day: "numeric", month: "short" })}</span>
      <span class="tip-fila"><b>${fmt(S.lluvia[i], 1)} mm</b> ${t(tiempoWmo(S.codigo[i]).clave)}</span><span class="tip-fila">${t("prob")} ${fmt(S.prob[i])} %</span>`,
    onClick: (i) => { estado.modo = "futuro"; estado.rangoDias = [i, i]; actualizarTodo(); },
  });
  grafBarras(document.getElementById("tb-lluvia-48"), {
    etiquetas: T.horas.map((h) => fmtHora(h)), valores: S.h.lluvia.map((v) => (v == null ? null : Math.round(v * 10) / 10)), alto: 150,
    formato: (v) => `${fmt(v, 1)} mm`, unidad: t("mm_en_3h"), marcar: "max", activos: P.tipo === "hora" ? [P.k, P.k] : null,
    colores: () => "var(--s-1)", minMax: 2,
    tip: (i) => `<span class="tip-titulo">${fmtDia(T.horas[i].slice(0, 10))} ${fmtHora(T.horas[i])} – ${fmtHora(T.horas[Math.min(i + 1, T.horas.length - 1)])}</span><span class="tip-fila"><b>${fmt(S.h.lluvia[i], 1)} mm</b> ${t("en_3h")}</span>`,
    onClick: (i) => { estado.modo = "actual"; estado.paso3h = i; actualizarTodo(); },
  });
  if (!s || s.tipo === "zona") rankingTiempo(document.getElementById("tb-lluvia-rk"), vals, "lluvia", 8);
}

// ---------- Tablero: viento ----------
function tableroViento(cont) {
  const T = estado.tiempo, S = tiempoSel(), P = periodoTiempo(), s = estado.sel;
  const [a, b] = P.tipo === "hora" ? [diaHoy(T), Math.min(T.dias.length - 1, diaHoy(T) + 2)] : [P.a, P.b];
  const dias = T.dias.map((d) => fmtDia(d, { weekday: "short", day: "numeric" }));
  const tramo = S.rafaga.slice(a, b + 1), iMax = a + tramo.indexOf(Math.max(...tramo.filter((v) => v != null)));
  const raf = S.rafaga[iMax] ?? 0, vel = S.viento[iMax] ?? 0, dir = S.dir[iMax] ?? 0;
  const k = P.tipo === "hora" ? P.k : pasoAhora(T);
  const velAhora = S.h.viento[k] ?? 0, rafAhora = S.h.rafaga[k] ?? 0, dirAhora = S.h.dir[k] ?? 0;
  const [vH, rH, dH] = estado.modo === "actual" ? [velAhora, rafAhora, dirAhora] : [vel, raf, dir];
  const bft = beaufort(vH), prov = provinciaSel(), pt = puntoSel();
  const tipos = pt ? T.dias.map((_, i) => (S.dir[i] == null ? null : tipoViento(S.dir[i], S.viento[i] ?? 0, S.rafaga[i] ?? 0, pt, prov))) : T.dias.map(() => null);
  const tipoHero = pt ? (estado.modo === "actual" ? tipoViento(dirAhora, velAhora, rafAhora, pt, prov) : tipos[iMax]) : null;
  const lugar = s ? (s.tipo === "zona" ? s.lugar.nombre : t("el_area_cap")) : "Argentina";
  const vals = valoresTiempoMunicipios("viento"), ext = vals.sort((x, y) => y.v - x.v)[0];
  const alertas = estado.modo === "actual" ? alertasSel(["viento", "zonda"]) : [];
  const sector = (d) => t("puntos_largos")[sectorViento(d)];
  const parrafos = [
    t("sit_viento")(escapar(lugar), fmt(vel), fmt(raf), fmtDiaFrase(T.dias[iMax]), t("beaufort")[beaufort(vel)].toLowerCase(), sector(dir)),
    estado.modo === "actual" ? t("sit_viento_ahora")(fmt(velAhora), sector(dirAhora), fmt(rafAhora)) : "",
    tipoHero ? t("sit_tipo")(t(`viento_${tipoHero}`), t(`viento_${tipoHero}_exp`)) : "",
    !s && ext ? t("sit_extremo_viento")(fmt(ext.v), escapar(estado.porCmu.get(ext.cmu)?.nam), escapar(estado.porCmu.get(ext.cmu)?.jur)) : "",
    alertas.length ? t("sit_alertas")(alertas.length, [...new Set(alertas.map((x) => t(`alerta_${x.tipo}`).toLowerCase()))].join(", "), alertas.some((x) => x.nivel !== "amarilla")) : "",
  ];
  const acc = [];
  if (raf >= 90) acc.push(t("acc_temporal"));
  else if (raf >= 60) acc.push(t("acc_viento_fuerte"));
  const tiposPeriodo = tipos.slice(a, b + 1);
  if (tiposPeriodo.includes("sudestada") || tipoHero === "sudestada") acc.push(t("acc_sudestada"));
  if (tiposPeriodo.includes("zonda") || tipoHero === "zonda") acc.push(t("acc_zonda"));
  if (alertas.length) acc.push(t("acc_alerta_viento"));
  if (!acc.length) acc.push(t("acc_viento_normal"));
  const nivel = raf >= 90 ? 5 : raf >= 60 ? 4 : raf >= 45 ? 3 : 1;
  // Rosa de vientos del período (frecuencia ponderada por velocidad)
  const rosa = Array(8).fill(0);
  for (let i = a; i <= b; i++) if (S.dir[i] != null) rosa[sectorViento(S.dir[i])] += S.viento[i] ?? 0;
  const diasTipo = tipos.map((tp, i) => (tp && i >= a && i <= b ? `<li><span class="pill-viento">${t(`viento_${tp}`)}</span>${fmtDia(T.dias[i])}</li>` : "")).join("");
  cont.innerHTML = `${cabeceraTablero()}
    <section class="tb-hero hero-viento">
      ${brujula(dH, vH)}
      <div class="hero-lado">
        <div class="hero-num"><span class="hero-valor">${fmt(vH)}</span><span class="hero-unidad">km/h</span></div>
        <span class="hero-sub">${estado.modo === "actual" ? t("viento_ahora") : t("viento_max_periodo")} · ${t("del")} ${sector(dH)}</span>
        <div class="pills"><span class="pill-bft" style="--b:${bft}">${bft} Bft · ${t("beaufort")[bft]}</span>${tipoHero ? `<span class="pill-viento">${t(`viento_${tipoHero}`)}</span>` : ""}</div>
        <span class="hero-rafaga">${t("rafagas")} <b>${fmt(rH)} km/h</b></span>
      </div>
    </section>
    ${bloqueSituacion(nivel, parrafos, acc, { nota: t("fuente_pronostico") })}
    <section class="tb-bloque"><h3>${tit("viento_por_dia")}</h3><div class="leyenda-lineas"><span><i style="background:var(--s-1)"></i>${t("viento_max")}</span><span><i style="background:var(--s-2)"></i>${t("rafagas")}</span></div>
      <div id="tb-viento-dias" class="graf-cont"></div></section>
    <section class="tb-bloque tb-dos"><div><h3>${tit("rosa_vientos")}</h3><div id="tb-rosa"></div></div>
      <div><h3>${tit("tipos_viento")}</h3><p class="tb-sub">${t("tipos_ayuda")}</p>${diasTipo ? `<ul class="tipos-viento">${diasTipo}</ul>` : `<p class="tb-vacio">${t("sin_tipos")}</p>`}</div></section>
    <section class="tb-bloque"><h3>${tit("prox_48h")}</h3><div id="tb-viento-48" class="graf-cont"></div></section>
    ${!s || s.tipo === "zona" ? `<section class="tb-bloque"><h3>${tit("rafagas_fuertes")}</h3><div id="tb-viento-rk"></div></section>` : ""}
    ${enlacesCapas("viento")}`;
  grafLineas(document.getElementById("tb-viento-dias"), {
    etiquetas: dias, alto: 180, banda: [a, b], formato: (v) => `${fmt(v)} km/h`, unidad: "km/h",
    series: [{ nombre: t("viento_max"), valores: S.viento, color: "var(--s-1)", ancho: 2.2 }, { nombre: t("rafagas"), valores: S.rafaga, color: "var(--s-2)", ancho: 2.2 }],
    extraTip: (i) => `<span class="tip-fila">${t("del")} ${sector(S.dir[i] ?? 0)} · ${t("beaufort")[beaufort(S.viento[i] ?? 0)]}${tipos[i] ? ` · ${t(`viento_${tipos[i]}`)}` : ""}</span>`,
    onClick: (i) => { estado.modo = "futuro"; estado.rangoDias = [i, i]; actualizarTodo(); },
  });
  grafRosa(document.getElementById("tb-rosa"), { valores: rosa, color: "var(--s-1)", tip: (k) => `<span class="tip-fila"><b>${t("puntos_largos")[k]}</b></span><span class="tip-fila">${fmt((100 * rosa[k]) / (sumar(rosa) || 1))} % ${t("del_viento")}</span>` });
  grafLineas(document.getElementById("tb-viento-48"), {
    etiquetas: T.horas.map((h) => fmtHora(h)), alto: 150, formato: (v) => `${fmt(v)} km/h`, unidad: "km/h", marca: P.tipo === "hora" ? P.k : null,
    series: [{ nombre: t("viento"), valores: S.h.viento, color: "var(--s-1)", ancho: 2 }, { nombre: t("rafagas"), valores: S.h.rafaga, color: "var(--s-2)", ancho: 2 }],
    extraTip: (i) => `<span class="tip-fila">${fmtDia(T.horas[i].slice(0, 10))} · ${t("del")} ${sector(S.h.dir[i] ?? 0)}</span>`,
    onClick: (i) => { estado.modo = "actual"; estado.paso3h = i; actualizarTodo(); },
  });
  if (!s || s.tipo === "zona") rankingTiempo(document.getElementById("tb-viento-rk"), vals, "viento", 8);
}

// ---------- Tablero: temperatura ----------
function categoriaTemp(v) { return v >= 38 ? "cat_calor_extremo" : v >= 34 ? "cat_muy_caluroso" : v >= 30 ? "cat_caluroso" : v >= 18 ? "cat_templado" : v >= 10 ? "cat_fresco" : v >= 0 ? "cat_frio" : "cat_helada"; }
function tableroTemp(cont) {
  const T = estado.tiempo, S = tiempoSel(), P = periodoTiempo(), s = estado.sel;
  const [a, b] = P.tipo === "hora" ? [diaHoy(T), Math.min(T.dias.length - 1, diaHoy(T) + 2)] : [P.a, P.b];
  const dias = T.dias.map((d) => fmtDia(d, { weekday: "short", day: "numeric" }));
  const tx = S.tmax.slice(a, b + 1), tn = S.tmin.slice(a, b + 1);
  const iMax = a + tx.indexOf(Math.max(...tx.filter((v) => v != null))), iMin = a + tn.indexOf(Math.min(...tn.filter((v) => v != null)));
  const tmax = S.tmax[iMax], tmin = S.tmin[iMin];
  const k = P.tipo === "hora" ? P.k : pasoAhora(T), ahora = S.h.temp[k];
  // Ola de calor: 3 o más días seguidos con máxima ≥ 34 °C
  let racha = 0, mejor = [0, -1, -1];
  S.tmax.forEach((v, i) => { racha = v >= 34 ? racha + 1 : 0; if (racha > mejor[0]) mejor = [racha, i - racha + 1, i]; });
  const calor34 = tx.filter((v) => v >= 34).length, heladas = tn.filter((v) => v <= 0).length, tropicales = tn.filter((v) => v >= 20).length;
  const lugar = s ? (s.tipo === "zona" ? s.lugar.nombre : t("el_area_cap")) : "Argentina";
  const vals = valoresTiempoMunicipios("temp"), ext = vals.sort((x, y) => y.v - x.v)[0];
  const heroV = estado.modo === "actual" ? ahora : tmax, cat = categoriaTemp(heroV ?? 0);
  const parrafos = [
    t("sit_temp")(escapar(lugar), fmt(tmax), fmtDiaFrase(T.dias[iMax]), fmt(tmin), fmtDiaFrase(T.dias[iMin])),
    estado.modo === "actual" && ahora != null ? t("sit_temp_ahora")(fmt(ahora)) : "",
    mejor[0] >= 3 ? t("sit_ola_calor")(mejor[0], fmtDia(T.dias[mejor[1]]), fmtDia(T.dias[mejor[2]])) : calor34 ? t("sit_dias_34")(calor34) : "",
    heladas ? t("sit_heladas")(heladas) : "",
    tropicales ? t("sit_tropicales")(tropicales) : "",
    !s && ext ? t("sit_extremo_temp")(fmt(ext.v), escapar(estado.porCmu.get(ext.cmu)?.nam), escapar(estado.porCmu.get(ext.cmu)?.jur)) : "",
  ];
  const acc = [];
  if (tmax >= 35) acc.push(t("acc_calor"));
  if (mejor[0] >= 3 || tropicales >= 2) acc.push(t("acc_calor_tormentas"));
  if (heladas) acc.push(t("acc_heladas"));
  if (!acc.length) acc.push(t("acc_temp_normal"));
  const nivel = tmax >= 38 ? 5 : tmax >= 34 ? 4 : heladas ? 3 : 1;
  const colorTemp = (v) => rgba(colorEscala(ESCALAS.temp, v), 1).replace(/,[\d.]+\)$/, ",1)");
  cont.innerHTML = `${cabeceraTablero()}
    <section class="tb-hero">
      <div class="hero-fila"><div class="hero-num"><span class="hero-valor">${fmt(heroV)}</span><span class="hero-unidad">°C</span></div>
      <div class="hero-lado"><span class="pill-temp" style="--c:${colorTemp(heroV ?? 20)}">${t(cat)}</span><span class="hero-sub">${estado.modo === "actual" ? t("temp_ahora") : t("max_periodo")}</span></div></div>
      <div class="tb-datos tres">
        ${dato(t("maxima"), `${fmt(tmax)} °C`, fmtDia(T.dias[iMax]))}
        ${dato(t("minima"), `${fmt(tmin)} °C`, fmtDia(T.dias[iMin]))}
        ${dato(t("dias_34"), fmt(calor34), heladas ? t("heladas_n")(heladas) : t("sin_heladas"))}
      </div>
    </section>
    ${bloqueSituacion(nivel, parrafos, acc, { nota: t("fuente_pronostico") })}
    <section class="tb-bloque"><h3>${tit("min_max_dia")}</h3><div id="tb-temp-rangos" class="graf-cont"></div></section>
    <section class="tb-bloque"><h3>${tit("prox_48h")}</h3><div id="tb-temp-48" class="graf-cont"></div></section>
    ${!s || s.tipo === "zona" ? `<section class="tb-bloque"><h3>${tit("mas_calor")}</h3><div id="tb-temp-rk"></div></section>` : ""}
    ${enlacesCapas("temp")}`;
  grafRangos(document.getElementById("tb-temp-rangos"), {
    etiquetas: dias, min: S.tmin, max: S.tmax, alto: 210, activos: [a, b], colorDe: colorTemp, iconos: S.codigo.map((c) => iconoTrazos(tiempoWmo(c).ico)),
    tip: (i) => `<span class="tip-titulo">${fmtDia(T.dias[i], { weekday: "long", day: "numeric", month: "short" })}</span>
      <span class="tip-fila"><b>${fmt(S.tmax[i])} °C</b> ${t("maxima").toLowerCase()} · <b>${fmt(S.tmin[i])} °C</b> ${t("minima").toLowerCase()}</span>
      <span class="tip-fila">${t(tiempoWmo(S.codigo[i]).clave)}</span>`,
    onClick: (i) => { estado.modo = "futuro"; estado.rangoDias = [i, i]; actualizarTodo(); },
  });
  grafLineas(document.getElementById("tb-temp-48"), {
    etiquetas: T.horas.map((h) => fmtHora(h)), alto: 150, formato: (v) => `${fmt(v)} °C`, unidad: "°C", marca: P.tipo === "hora" ? P.k : null,
    min: Math.floor(Math.min(...S.h.temp.filter((v) => v != null)) / 5) * 5, max: Math.ceil(Math.max(...S.h.temp.filter((v) => v != null)) / 5) * 5 + 2,
    series: [{ nombre: t("temperatura"), valores: S.h.temp, color: "var(--s-2)", ancho: 2.2, area: true }],
    extraTip: (i) => `<span class="tip-fila">${fmtDia(T.horas[i].slice(0, 10))}</span>`,
    onClick: (i) => { estado.modo = "actual"; estado.paso3h = i; actualizarTodo(); },
  });
  if (!s || s.tipo === "zona") rankingTiempo(document.getElementById("tb-temp-rk"), vals, "temp", 8);
}

function rankingTiempo(cont, vals, capa, n) {
  const unidad = { lluvia: "mm", viento: "km/h", temp: "°C" }[capa];
  const escala = capa === "lluvia" ? (estado.modo === "actual" ? ESCALAS.lluvia3h : ESCALAS.lluviaAcum) : ESCALAS[capa];
  grafRanking(cont, {
    filas: vals.slice(0, n).map(({ cmu, v }) => ({ cmu, nombre: estado.porCmu.get(cmu)?.nam ?? cmu, sub: estado.porCmu.get(cmu)?.jur, valor: v,
      color: rgba(colorEscala(escala, v, capa === "lluvia") ?? [150, 160, 170, 1], 0.9) })),
    formato: (v) => `${fmt(v)} ${unidad}`,
    onClick: (f) => { const c = estado.riesgo.cmu[f.cmu]?.c; if (c) seleccionarPunto(c, { volar: true, origen: "ranking" }); },
  });
}

// ---------- Tablero según la capa ----------
async function pintarTablero() {
  const cont = document.getElementById("tablero");
  cont.classList.add("cargando");
  try {
    if (estado.capa === "riesgo") await tableroRiesgo(cont);
    else if (!estado.tiempo) cont.innerHTML = `${cabeceraTablero()}<p class="tb-vacio">${t("cargando_tiempo")}</p>`;
    else ({ lluvia: tableroLluvia, viento: tableroViento, temp: tableroTemp })[estado.capa](cont);
  } finally {
    cont.classList.remove("cargando");
  }
  const barra = cont.querySelector("#tb-radio");
  if (barra) {
    barra.oninput = () => { cont.querySelector("#tb-tipo-txt").textContent = t("sel_radio")(fmt(+barra.value, +barra.value % 1 ? 1 : 0)); };
    barra.onchange = () => cambiarRadio(Number(barra.value));
  }
  prepararInfo(cont);
  cont.querySelector('[data-accion="quitar"]')?.addEventListener("click", borrarFiltros);
  cont.querySelector('[data-accion="evol"]')?.addEventListener("click", () => (estado.reproduciendo != null ? detenerReproduccion() : reproducir()));
  cont.querySelector('[data-accion="municipio"]')?.addEventListener("click", () => {
    const l = estado.lugares.find((x) => x.nivel === "gl" && x.cmus[0] === estado.sel.cmu);
    if (l) elegirLugar("localidad", l);
  });
  cont.querySelectorAll(".salto").forEach((b) => { b.onclick = () => elegirCapa(b.dataset.capa); });
  // La evolución en el período y el tiempo en el lugar van arriba de todo, antes del resto del detalle
  const arriba = document.getElementById("lec-arriba");
  if (arriba) arriba.replaceChildren(...[cont.querySelector(".tb-evol"), cont.querySelector(".tb-tiempo-lugar")].filter(Boolean));
}

// ---------- Análisis debajo del mapa: 3 gráficos en una fila que siguen los filtros (como en Power BI) ----------
// Sin selección: las provincias. Con una provincia: sus partidos o municipios. Con un municipio, una localidad o un punto:
// los municipios de su provincia con el elegido resaltado, y los gráficos por día y por persona filtrados a la selección.
// Tocar una zona la elige (y completa los filtros de arriba); tocar un día lo elige como período.
function alcanceAnalisis() {
  const s = estado.sel, R = estado.riesgo;
  const gl = new Map(estado.lugares.filter((l) => l.nivel === "gl").map((l) => [l.cmus[0], l]));
  const municipios = (cmus) => cmus.map((c) => gl.get(c)).filter(Boolean), conDatos = (cmus) => cmus.filter((c) => R.cmu[c]);
  if (!s) return { nivel: "prov", unidades: estado.lugares.filter((l) => l.nivel === "prov"), resaltar: null, cmus: todosLosCmus(), nombre: "Argentina", contexto: null };
  if (s.tipo === "zona" && s.lugar.nivel === "prov") {
    const z = s.lugar, dentro = new Set(z.cmus);
    const deptos = estado.lugares.filter((l) => l.nivel === "depto" && l.provincia === z.provincia && l.cmus.every((c) => dentro.has(c)));
    return { nivel: deptos.length > 1 ? "depto" : "gl", unidades: deptos.length > 1 ? deptos : municipios(z.cmus), resaltar: null, cmus: conDatos(z.cmus),
      nombre: z.nombre, contexto: { nombre: "Argentina", cmus: todosLosCmus() } };
  }
  const elegidos = s.tipo === "zona" ? s.lugar.cmus : s.cmu ? [s.cmu] : [];
  const prov = estado.lugares.find((l) => l.nivel === "prov" && l.nombre === estado.porCmu.get(elegidos[0])?.jur);
  return { nivel: "gl", unidades: municipios(prov?.cmus ?? elegidos), resaltar: new Set(elegidos), cmus: conDatos(elegidos),
    nombre: s.tipo === "zona" ? s.lugar.nombre : estado.porCmu.get(s.cmu)?.nam ?? t("punto_en_mapa"), contexto: prov ? { nombre: prov.nombre, cmus: prov.cmus } : null };
}
const esResaltada = (A, u) => !!A.resaltar && u.cmus.length > 0 && u.cmus.every((c) => A.resaltar.has(c));
// Los primeros n y, si la zona elegida quedó afuera, también ella (con su puesto real)
function primerosYElegida(lista, n) {
  const out = lista.slice(0, n).map((f, i) => ({ ...f, pos: i + 1 }));
  lista.forEach((f, i) => { if (f.resaltada && i >= n && out.length < n + 3) out.push({ ...f, pos: i + 1 }); });
  return out;
}
// Tocar una zona en un gráfico: la elige como filtro y completa los casilleros de arriba
function elegirZonaDesdeGrafico(u) {
  elegirLugar(u.nivel === "prov" ? "provincia" : u.nivel === "depto" ? "partido" : "localidad", u);
}
const elegirDia = (k) => { detenerReproduccion(false); estado.modo = "futuro"; estado.rangoDias = [k, k]; actualizarTodo(); };

// Filtros activos (lugar y período) como etiquetas con ✕, y "Borrar filtros"
function chipsFiltros() {
  const chips = [];
  if (estado.sel) chips.push([t("filtro_lugar"), lugarTitulo(), "lugar"]);
  if (estado.capa === "riesgo" ? !vistaHoy() : estado.modo === "futuro") chips.push([t("filtro_periodo"), estado.capa === "riesgo" ? textoPeriodoCorto() : t("modo_futuro"), "periodo"]);
  if (!chips.length) return `<span class="an-sin-filtros">${t("sin_filtros")}</span>`;
  return `${chips.map(([etq, v, k]) => `<span class="filtro-activo"><span>${etq}: <b>${escapar(v)}</b></span>
    <button type="button" data-quitar="${k}" aria-label="${t("quitar_filtro")}: ${escapar(v)}" title="${t("quitar_filtro")}">${icono("cerrar")}</button></span>`).join("")}
    <button type="button" class="btn-texto an-borrar" data-quitar="todo">${t("borrar_filtros")}</button>`;
}
const cabezaAnalisis = (titulo, sub) => `<div class="an-cabeza"><div class="an-titulos"><h2>${titulo}</h2><p>${sub}</p></div>
  <div class="an-filtros" role="group" aria-label="${t("filtros_activos")}">${chipsFiltros()}</div></div>`;

function pintarAnalisis() {
  const cont = document.getElementById("analisis");
  if (estado.capa === "riesgo") analisisRiesgo(cont);
  else if (!estado.tiempo) { cont.innerHTML = ""; return; }
  else analisisTiempo(cont);
  prepararInfo(cont);
  tipsEn(cont);
  cont.querySelectorAll("[data-quitar]").forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.quitar;
      if (k === "todo") return borrarTodo();
      if (k === "lugar") borrarFiltros();
      if (k === "periodo") { if (estado.capa === "riesgo") { detenerReproduccion(false); estado.rangoRiesgo = [0, 0]; actualizarTodo(); } else elegirModo("actual"); }
    };
  });
}

function analisisRiesgo(cont) {
  const A = alcanceAnalisis(), M = estado.riesgo.dias, idx = indicesVista(), R = estado.riesgo;
  const filas = A.unidades.map((u) => {
    const cmus = u.cmus.filter((c) => R.cmu[c]);
    if (!cmus.length) return null;
    const pob = cmus.map((c) => Math.max(1, Number(estado.porCmu.get(c)?.poblacion) || 1)), tot = sumar(pob);
    return { u, resaltada: esResaltada(A, u), personas: M.map((_, i) => sumar(cmus.map((c) => R.cmu[c].p[i] ?? 0))),
      riesgo: M.map((_, i) => sumar(cmus.map((c, k) => (R.cmu[c].r[i] ?? 0) * pob[k])) / tot) };
  }).filter(Boolean);
  const pV = (f) => Math.max(...idx.map((i) => f.personas[i])), rV = (f) => Math.max(...idx.map((i) => f.riesgo[i]));
  // 1) Dónde se concentra la gente en riesgo (Pareto)
  const orden = filas.slice().sort((a, b) => pV(b) - pV(a)), total = sumar(orden.map(pV)) || 1;
  let acum = 0, n80 = 0;
  const cum = orden.map((f) => { const antes = acum; acum += pV(f); if (antes / total < 0.8) n80++; return (100 * acum) / total; });
  const iElegida = orden.findIndex((f) => f.resaltada);
  // 2) Ranking de municipios (por nivel o por personas)
  const porR = estado.ranking !== "p";
  const cmusRk = A.resaltar ? A.unidades.flatMap((u) => u.cmus) : A.cmus;
  const rk = cmusRk.filter((c) => R.cmu[c]).map((c) => { const d = R.cmu[c], m = estado.porCmu.get(c) || {};
    return { cmu: c, nombre: m.nam, sub: m.jur, r: Math.max(...idx.map((i) => d.r[i] ?? 0)), p: Math.max(...idx.map((i) => d.p[i] ?? 0)), rob: d.rob, resaltada: !!A.resaltar?.has(c) }; })
    .sort((a, b) => (porR ? b.r - a.r : b.p - a.p));
  // 3) Qué explica el riesgo: amenaza, exposición y vulnerabilidad de la selección frente a su provincia y al país
  const hev = (cmus) => {
    const xs = cmus.filter((c) => R.cmu[c]);
    if (!xs.length) return null;
    const pob = xs.map((c) => Math.max(1, Number(estado.porCmu.get(c)?.poblacion) || 1)), tot = sumar(pob);
    const pond = (fn) => sumar(xs.map((c, k) => (fn(R.cmu[c]) ?? 0) * pob[k])) / tot;
    const iP = idx.reduce((m, i) => (pond((d) => d.r[i]) > pond((d) => d.r[m]) ? i : m), idx[0]);   // su peor día
    return { r: pond((d) => d.r[iP]), h: pond((d) => d.h[iP]), e: pond((d) => d.E), v: pond((d) => d.V) };
  };
  const grupos = [[A.nombre, hev(A.cmus), "var(--s-1)"], ...(A.contexto && A.contexto.nombre !== "Argentina" ? [[A.contexto.nombre, hev(A.contexto.cmus), "var(--tinta-3)"]] : []),
    ...(estado.sel ? [["Argentina", hev(todosLosCmus()), "var(--torta-resto)"]] : [])].filter((g) => g[1]);
  const medidas = [["r", t("comp_riesgo"), ""], ["h", t("comp_amenaza"), t("comp_amenaza_sub")], ["e", t("comp_exposicion"), t("comp_exposicion_sub")], ["v", t("comp_vulnerabilidad"), t("comp_vulnerabilidad_sub")]];
  const explica = `<ul class="apilada-leyenda">${grupos.map(([n, , c]) => `<li><i style="background:${c}"></i>${escapar(n)}</li>`).join("")}</ul>
    <div class="explica">${medidas.map(([k, etq, sub]) => `<div class="explica-fila"><span class="explica-etq">${etq}${sub ? `<small>${sub}</small>` : ""}</span>
      <div class="explica-barras">${grupos.map(([n, g, c]) => `<div class="explica-barra" data-tip="${escapar(`<b>${escapar(n)}</b><span>${etq}: ${fmtRiesgo(g[k])}/10</span>`)}">
        <span class="explica-pista"><span style="width:${limitar(g[k] * 10, 0, 100)}%;background:${c}"></span></span><b>${fmtRiesgo(g[k])}</b></div>`).join("")}</div></div>`).join("")}</div>`;
  cont.innerHTML = `${cabezaAnalisis(t("an_riesgo_t")(escapar(A.nombre)), t("an_riesgo_sub")(textoPeriodoCorto(), estado.riesgo.generado ? fechaHora(estado.riesgo.generado) : "–"))}
    <div class="an-grilla tres">
      <section class="an-bloque"><h3>${tit("pareto_t")}</h3><p class="tb-sub">${t("pareto_nota")}</p>
        <p class="hallazgo">${t("pareto_hallazgo")(n80, orden.length, t("niveles_zona")[A.nivel])}${iElegida >= 0 ? ` ${t("pareto_puesto")(escapar(orden[iElegida].u.nombre), iElegida + 1)}` : ""}</p>
        <div id="an-pareto"></div></section>
      <section class="an-bloque"><h3>${tit("ranking_t")}</h3><p class="tb-sub">${t("robustez_nota")}</p>
        <div class="pestanas" role="tablist"><button role="tab" data-rk="r" aria-selected="${porR}">${t("tab_relativo")}</button>
          <button role="tab" data-rk="p" aria-selected="${!porR}">${t("tab_personas")}</button></div>
        <div id="an-ranking"></div></section>
      <section class="an-bloque"><h3>${tit("explica_t")}</h3><p class="tb-sub">${t("explica_an_nota")}</p>${explica}</section>
    </div>`;
  grafRanking(document.getElementById("an-pareto"), {
    filas: primerosYElegida(orden.map((f, i) => ({ f, i, resaltada: f.resaltada })), 10).map(({ f, i, pos }) => ({
      nombre: f.u.nombre, sub: `${fmt(cum[i])} % ${t("acumulado")}`, valor: pV(f), color: colorNivel(rV(f)), pos, resaltada: f.resaltada, u: f.u,
      tip: `<span class="tip-titulo">${escapar(f.u.nombre)}</span><span class="tip-fila"><b>${fmtPersonas(pV(f))}</b> ${t("personas_riesgo")}</span><span class="tip-fila">${t("riesgo")} ${fmtRiesgo(rV(f))} · ${nombreNivel(rV(f))}</span>` })),
    formato: fmtPersonas, onClick: (f) => elegirZonaDesdeGrafico(f.u),
  });
  grafRanking(document.getElementById("an-ranking"), {
    filas: primerosYElegida(rk, 10).map((f) => ({ ...f, valor: porR ? f.r : f.p, color: colorNivel(f.r),
      tip: `<span class="tip-titulo">${escapar(f.nombre)}</span><span class="tip-fila"><b>${fmtRiesgo(f.r)}</b> ${nombreNivel(f.r)}</span><span class="tip-fila">${fmtPersonas(f.p)} ${t("personas_riesgo")} · ${t("robustez")} ${fmt(f.rob)} %</span>` })),
    max: porR ? 10 : undefined, formato: porR ? fmtRiesgo : fmtPersonas,
    onClick: (f) => { const l = estado.lugares.find((x) => x.nivel === "gl" && x.cmus[0] === f.cmu); if (l) elegirZonaDesdeGrafico(l); },
  });
  cont.querySelectorAll("[data-rk]").forEach((b) => { b.onclick = () => { estado.ranking = b.dataset.rk; pintarAnalisis(); }; });
}

function analisisTiempo(cont) {
  const T = estado.tiempo, capa = estado.capa, TM = tiempoMunicipios(), A = alcanceAnalisis();
  const variable = { lluvia: "lluvia", viento: "rafaga", temp: "tmax" }[capa], unidad = { lluvia: "mm", viento: "km/h", temp: "°C" }[capa];
  const umbral = { lluvia: [20, 50], viento: [60, 90], temp: [34, 38] }[capa];
  const P = periodoTiempo(), [a, b] = P.tipo === "hora" ? [diaHoy(T), Math.min(T.dias.length - 1, diaHoy(T) + 2)] : [P.a, P.b];
  const pobDe = (c) => Number(estado.porCmu.get(c)?.poblacion) || 0;
  // Serie diaria de un grupo de municipios: promedio ponderado por población (pronóstico en el centro de cada uno)
  const serie = (cmus) => {
    const xs = cmus.filter((c) => TM.has(c));
    if (!xs.length) return null;
    const pob = xs.map((c) => Math.max(1, pobDe(c))), tot = sumar(pob);
    return T.dias.map((_, k) => sumar(xs.map((c, i) => (TM.get(c)[variable][k] ?? 0) * pob[i])) / tot);
  };
  const resumen = (v) => (capa === "lluvia" ? sumar(v.slice(a, b + 1)) : Math.max(...v.slice(a, b + 1)));
  const filas = A.unidades.map((u) => { const v = serie(u.cmus); return v ? { u, valores: v, res: resumen(v), resaltada: esResaltada(A, u) } : null; })
    .filter(Boolean).sort((x, y) => y.res - x.res);
  const escala = capa === "lluvia" ? ESCALAS.lluviaAcum : ESCALAS[capa], escalaDia = capa === "lluvia" ? ESCALAS.lluviaDia : ESCALAS[capa];
  const colorRes = (v) => rgba(colorEscala(escala, v, capa === "lluvia") ?? [150, 160, 170, 1], 0.9);
  const colorDia = (v) => { const c = colorEscala(escalaDia, v, capa === "lluvia"); return c && c[3] > 0.05 ? rgba(c, 1) : "var(--eje)"; };
  const dec = capa === "lluvia" ? 1 : 0, dias = T.dias.map((d) => fmtDia(d, { day: "numeric", month: "short" }));
  // 2) Paneles por día: con una zona elegida, ella, su provincia y el país; si no, las 6 zonas con más valor
  const paneles = A.resaltar
    ? [[A.nombre, serie(A.cmus), true, null], ...(A.contexto ? [[t("promedio_de")(A.contexto.nombre), serie(A.contexto.cmus), false, null]] : []), [t("promedio_pais"), serie(todosLosCmus()), false, null]]
        .filter((p) => p[1]).map(([titulo, valores, resaltado, dato]) => ({ titulo, valores, resaltado, dato, sub: `${fmt(resumen(valores))} ${unidad}` }))
    : filas.slice(0, 6).map((f) => ({ titulo: f.u.nombre, valores: f.valores, dato: f.u, sub: `${fmt(f.res)} ${unidad}` }));
  // 3) Personas con lluvia fuerte, ráfagas fuertes o calor extremo cada día, en la selección
  const cmusP = A.cmus.filter((c) => TM.has(c));
  const nivelDia = (k, desde, hasta) => sumar(cmusP.map((c) => { const v = TM.get(c)[variable][k]; return v >= desde && v < hasta ? pobDe(c) : 0; }));
  const s1 = T.dias.map((_, k) => nivelDia(k, umbral[0], umbral[1])), s2 = T.dias.map((_, k) => nivelDia(k, umbral[1], Infinity));
  const pobTot = sumar(cmusP.map(pobDe));
  cont.innerHTML = `${cabezaAnalisis(t(`an_${capa}_t`)(escapar(A.nombre)), t("an_tiempo_sub")(fmtDia(T.dias[0])))}
    <div class="an-grilla tres">
      <section class="an-bloque"><h3>${tit({ lluvia: "donde_mas_llueve", viento: "rafagas_fuertes", temp: "mas_calor" }[capa])}</h3>
        <p class="tb-sub">${t(`an_${capa}_rk_nota`)}</p><div id="an-rk"></div></section>
      <section class="an-bloque"><h3>${tit("an_dia_dia")}</h3><p class="tb-sub">${t("an_paneles_nota")}</p><div id="an-paneles"></div></section>
      <section class="an-bloque"><h3>${tit(`an_${capa}_personas`)}</h3><p class="tb-sub">${t(`an_${capa}_personas_nota`)(escapar(A.nombre), fmtPersonas(pobTot))}</p>
        <div class="leyenda-lineas"><span><i style="background:var(--lluvia-4)"></i>${t(`an_${capa}_n1`)}</span><span><i style="background:var(--lluvia-5)"></i>${t(`an_${capa}_n2`)}</span></div>
        <div id="an-personas" class="graf-cont"></div></section>
    </div>`;
  grafRanking(document.getElementById("an-rk"), {
    filas: primerosYElegida(filas, 10).map((f) => ({ nombre: f.u.nombre, sub: f.u.nivel === "prov" ? "" : f.u.provincia, valor: f.res, color: colorRes(f.res), pos: f.pos, resaltada: f.resaltada, u: f.u,
      tip: `<span class="tip-titulo">${escapar(f.u.nombre)}</span><span class="tip-fila"><b>${fmt(f.res, dec)} ${unidad}</b> ${t("promedio_pob")}</span>` })),
    formato: (v) => `${fmt(v)} ${unidad}`, onClick: (f) => elegirZonaDesdeGrafico(f.u),
  });
  grafPaneles(document.getElementById("an-paneles"), {
    paneles, etiquetas: dias, activos: [a, b], colorDe: colorDia, linea: capa === "temp", ref: umbral[0], minMax: umbral[0], unidad,
    tipDe: (p, k) => `<span class="tip-titulo">${escapar(p.titulo)} · ${fmtDia(T.dias[k])}</span><span class="tip-fila"><b>${fmt(p.valores[k], dec)} ${unidad}</b></span>`,
    onDia: elegirDia, onTitulo: (p) => elegirZonaDesdeGrafico(p.dato),
  });
  grafApiladas(document.getElementById("an-personas"), {
    etiquetas: T.dias.map((d) => fmtDia(d, { weekday: "narrow", day: "numeric" })), alto: 190, activos: [a, b], formatoEje: fmtPersonas, unidad: t("personas_u"),
    series: [{ nombre: t(`an_${capa}_n1`), valores: s1, color: "var(--lluvia-4)" }, { nombre: t(`an_${capa}_n2`), valores: s2, color: "var(--lluvia-5)" }],
    tip: (k) => `<span class="tip-titulo">${fmtDia(T.dias[k], { weekday: "long", day: "numeric", month: "short" })}</span>
      <span class="tip-fila">${t(`an_${capa}_n1`)}: <b>${fmtPersonas(s1[k])}</b></span><span class="tip-fila">${t(`an_${capa}_n2`)}: <b>${fmtPersonas(s2[k])}</b></span>`,
    onClick: elegirDia,
  });
}

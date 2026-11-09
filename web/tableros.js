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
function mesesVista() {
  const M = estado.riesgo.meses;
  if (estado.mesReproduciendo != null) return [M[estado.mesReproduciendo]];
  if (estado.modo === "actual") return [M[estado.iMesActual]];
  return M.slice(estado.rangoMeses[0], estado.rangoMeses[1] + 1);
}
const indicesVista = () => mesesVista().map((m) => estado.riesgo.meses.indexOf(m));
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
    const M = mesesVista();
    if (estado.modo === "actual") return t("periodo_mes_actual")(nombreMes(M[0], true));
    return M.length === 1 ? capitalizar(nombreMes(M[0], true)) : `${capitalizar(nombreMes(M[0]))} – ${nombreMes(M[M.length - 1])}`;
  }
  const T = estado.tiempo;
  if (!T) return "";
  const P = periodoTiempo();
  if (P.tipo === "hora") return t("periodo_hora")(fmtDia(T.horas[P.k].slice(0, 10)), fmtHora(T.horas[P.k]), P.k === pasoAhora(T));
  const n = P.b - P.a + 1;
  return n === 1 ? fmtDia(T.dias[P.a], { weekday: "long", day: "numeric", month: "long" })
    : `${fmtDia(T.dias[P.a])} – ${fmtDia(T.dias[P.b])} · ${t("n_dias")(n)}`;
}
const textoPeriodoCorto = () => (estado.modo === "actual" ? t("ahora") : textoPeriodo("riesgo"));

// ---------- Análisis de riesgo ----------
function analisisRiesgoZona(cmus) {
  const R = estado.riesgo, M = R.meses, items = cmus.map((c) => [c, R.cmu[c], estado.porCmu.get(c) || {}]).filter(([, d]) => d);
  const pob = items.map(([, , p]) => Math.max(1, Number(p.poblacion) || 1)), total = sumar(pob);
  const pond = (fn) => M.map((_, i) => sumar(items.map((it, k) => (fn(it[1], i) ?? 0) * pob[k])) / total);
  const pondFijo = (campo) => { const v = items.map(([, , p], k) => [Number(p[campo]), pob[k]]).filter(([n]) => !Number.isNaN(n));
    const w = sumar(v.map(([, p]) => p)); return w ? sumar(v.map(([n, p]) => n * p)) / w : null; };
  const poblacion = sumar(items.map(([, , p]) => Number(p.poblacion) || 0));
  const idx = indicesVista();
  const rVista = items.map(([, d]) => Math.max(...idx.map((i) => d.r[i] ?? -1)));
  const porNivel = [1, 2, 3, 4, 5].map((n) => sumar(items.map(([, , p], k) => (nivelRiesgo(rVista[k]) === n ? Number(p.poblacion) || 0 : 0))));
  return {
    tipo: "zona", n: items.length, poblacion, porNivel,
    riesgo: pond((d, i) => d.r[i]), agua: pond((d, i) => d.ha[i]), rio: pond((d, i) => d.hr[i]), quebrada: pond((d, i) => d.hq[i]),
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
  const R = estado.riesgo, M = R.meses, d = R.cmu[s.cmu];
  const props = dentro.map((f) => f.properties), pob = props.map((p) => Math.max(1, Number(p.poblacion) || 0)), total = sumar(pob);
  const pond = (fn) => sumar(props.map((p, k) => (fn(p) ?? 0) * pob[k])) / total;
  const idx = indicesVista();
  const rVista = props.map((p) => Math.max(...idx.map((i) => Number(p[`r_${M[i]}`]) || 0)));
  const porNivel = [1, 2, 3, 4, 5].map((n) => sumar(props.map((p, k) => (nivelRiesgo(rVista[k]) === n ? Number(p.poblacion) || 0 : 0))));
  const zona = d ? analisisRiesgoZona([s.cmu]) : null;
  return {
    tipo: "circulo", n: props.length, poblacion: sumar(props.map((p) => Number(p.poblacion) || 0)), porNivel,
    riesgo: M.map((m) => (props.length ? pond((p) => Number(p[`r_${m}`])) : null)),
    agua: zona?.agua ?? M.map(() => null), rio: zona?.rio ?? M.map(() => null), quebrada: zona?.quebrada ?? M.map(() => null),
    bajo: props.length ? pond((p) => Number(p.pct_area_hand_2m)) : null,
    sinCloaca: props.length ? pond((p) => 100 - Number(p.pct_cloaca)) : null,
    E: pond((p) => Number(p.E)), V: pond((p) => Number(p.V)), municipio: zona,
  };
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
// El simulador necesita un punto: con una zona de gobierno local se usa su centro; con el país o una provincia se pide elegir un punto
function botonSimular(s) {
  const lista = !s || (s.tipo === "zona" && s.lugar.nivel === "prov");
  const sub = lista ? t("sim_boton_elegir") : s.tipo === "zona" ? t("sim_boton_centro") : t("sim_boton_sub");
  return `<button type="button" class="btn-sim${lista ? " btn-sim-pide" : ""}" data-accion="simular"${lista ? ' aria-disabled="true"' : ""}>${icono("lluvia")}<span><b>${t("sim_boton")}</b><small>${sub}</small></span></button>`;
}
function cabeceraTablero() {
  const s = estado.sel;
  const titulo = !s ? "Argentina" : s.tipo === "zona" ? s.lugar.nombre : s.nombre ?? t("punto_en_mapa");
  let sub = t("sub_pais");
  if (s?.tipo === "zona") sub = s.lugar.nivel === "prov" ? t("provincia") : `${s.lugar.tipo} · ${s.lugar.provincia}`;
  if (s?.tipo === "punto") { const m = estado.porCmu.get(s.cmu); sub = m ? `${m.nam} · ${m.jur}` : `${fmt(s.punto[1], 3)}, ${fmt(s.punto[0], 3)}`; }
  const tipo = !s ? t("sel_pais") : s.tipo === "zona" ? t("sel_zona") : t("sel_circulo")(s.km);
  const radios = s?.tipo === "punto" ? `<div class="tb-radios" role="radiogroup" aria-label="${t("radio_km")}">${[1, 2, 5, 10, 20].map((k) =>
    `<button role="radio" aria-checked="${k === s.km}" data-km="${k}">${k} km</button>`).join("")}</div>` : "";
  const acciones = s ? `<button class="btn-icono" data-accion="quitar" aria-label="${t("quitar_seleccion")}" title="${t("quitar_seleccion")}">${icono("cerrar")}</button>` : "";
  const verMuni = s?.tipo === "punto" && s.cmu ? `<button class="btn-texto" data-accion="municipio">${t("ver_municipio")(estado.porCmu.get(s.cmu)?.nam ?? "")}</button>` : "";
  return `<header class="tb-cabeza"><div class="tb-titulos"><span class="tb-tipo">${icono(s?.tipo === "punto" ? "objetivo" : "pin")}${tipo}</span>
      <h2>${escapar(titulo)}</h2><p>${escapar(sub)}</p></div>${acciones}</header>
    ${radios}${botonSimular(s)}<p class="tb-periodo">${icono(estado.modo === "actual" ? "reloj" : "calendario")}<span>${escapar(textoPeriodo())}</span>${verMuni}</p>`;
}

function bloqueSituacion(nivel, parrafos, acciones) {
  return `<section class="tb-situacion" data-nivel="${nivel}">
    <h3>${t("situacion")}</h3>${parrafos.filter(Boolean).map((p) => `<p>${p}</p>`).join("")}
    <h3>${t("que_hacer")}</h3><ul>${acciones.slice(0, 4).map((a) => `<li>${a}</li>`).join("")}</ul>
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
  return `<section class="tb-bloque"><h3>${t("tiempo_en_lugar")}</h3><div class="tb-saltos">${items.map(([c, v, e]) =>
    `<button class="salto" data-capa="${c}">${icono(c)}<span><b>${v}</b>${e}</span></button>`).join("")}</div></section>`;
}

// ---------- Tablero: riesgo ----------
async function tableroRiesgo(cont) {
  const s = estado.sel, M = estado.riesgo.meses, idx = indicesVista();
  const A = s?.tipo === "punto" ? await analisisRiesgoCirculo(s) : analisisRiesgoZona(cmusSel());
  if (estado.sel !== s) return;   // la selección cambió mientras se cargaban los radios
  const pais = analisisRiesgoZona(todosLosCmus());
  const peor = idx.reduce((m, i) => (A.riesgo[i] > A.riesgo[m] ? i : m), idx[0]);
  const r = A.riesgo[peor];
  const comps = [["agua", A.agua[peor]], ["rio", A.rio[peor]], ["quebrada", A.quebrada[peor]]];
  const motor = comps.slice().sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
  const ests = estacionesSel().filter((e) => e.estado && e.estado !== "null").sort((a, b) => (pesoEstado[b.estado] ?? 0) - (pesoEstado[a.estado] ?? 0) || (a.km ?? 0) - (b.km ?? 0));
  const alertas = estado.modo === "actual" ? alertasSel() : [];
  const lugar = s ? (s.tipo === "zona" ? s.lugar.nombre : t("el_area_cap")) : "Argentina";
  const nivel = nivelRiesgo(r);
  // Situación
  const p1 = t("sit_riesgo")(escapar(lugar), nombreNivel(r).toLowerCase(), fmtRiesgo(r),
    estado.modo === "actual" ? t("este_mes") : idx.length > 1 ? t("peor_mes")(nombreMes(M[peor])) : t("en_mes")(nombreMes(M[peor], true)));
  const p2 = (motor[1] ?? 0) >= 3 ? t("sit_motor")(t(`motor_${motor[0]}`), fmtRiesgo(motor[1])) : t("sit_motor_bajo");
  const p3 = A.poblacion ? t("sit_poblacion")(fmtPersonas(A.poblacion), A.bajo == null ? null : fmt(A.bajo), A.sinCloaca == null ? null : fmt(A.sinCloaca)) : "";
  const e0 = ests[0];
  const p4 = e0 && estado.modo === "actual" ? t("sit_rio")(escapar(nombreRio(e0.rio) || e0.estacion), escapar(e0.estacion), t(`rio_${e0.estado}`),
    fmt(e0.h, 2), fmt(e0.nivel_evacuacion, 2), e0.dh) : "";
  const p5 = alertas.length ? t("sit_alertas")(alertas.length, [...new Set(alertas.map((a) => t(`alerta_${a.tipo}`).toLowerCase()))].join(", "),
    alertas.some((a) => a.nivel === "naranja" || a.nivel === "roja")) : "";
  const pico = A.riesgo.indexOf(Math.max(...A.riesgo.slice(estado.iMesActual).filter((v) => v != null)));
  const p6 = estado.modo === "actual" && pico > estado.iMesActual && A.riesgo[pico] - A.riesgo[estado.iMesActual] >= 0.15
    ? t("sit_sube")(nombreMes(M[pico], true), fmtRiesgo(A.riesgo[pico])) : "";
  const acc = [];
  if (estado.modo === "actual" && ests.some((e) => e.estado === "evacuacion")) acc.push(t("acc_rio_evac"));
  if (estado.modo === "futuro") {   // escenario: la estación con mayor probabilidad de evacuación en el período
    const M2 = mesesVista(), conProb = estacionesSel().filter((e) => e.conf === true || e.conf === "true")
      .map((e) => ({ e, p: Math.max(...M2.map((m) => Number(e[`pe_${m}`]) || 0)) })).sort((x, y) => y.p - x.p)[0];
    if (conProb && conProb.p >= 0.5) acc.push(t("acc_rio_escenario")(escapar(conProb.e.estacion), fmt(conProb.p * 100)));
  }
  if (alertas.length) acc.push(t("acc_alertas"));
  if (nivel >= 4) {
    acc.push(t(`acc_${motor[0]}`));
    acc.push(t("acc_kit"));
  } else if (nivel === 3) acc.push(t("acc_medio"));
  else acc.push(t("acc_bajo"));
  // Ríos
  const rios = ests.slice(0, 4).map((e) => {
    const tope = Math.max(e.nivel_evacuacion ?? e.nivel_alerta, e.h) * 1.12, pos = (v) => `${limitar((100 * v) / tope, 0, 100)}%`;
    return `<li class="rio"><div class="rio-cab"><b>${escapar(e.estacion)}</b> <span>${escapar(nombreRio(e.rio))}${e.km != null ? ` · ${fmt(e.km)} km` : ""}</span>
      <span class="pill sem-${e.estado === "evacuacion" ? "critico" : e.estado === "alerta" ? "atencion" : "ok"}">${t(`rio_${e.estado}`)}</span></div>
      <div class="rio-barra"><span class="rio-nivel" style="width:${pos(e.h)}"></span><i class="umbral al" style="left:${pos(e.nivel_alerta)}"></i>${e.nivel_evacuacion ? `<i class="umbral ev" style="left:${pos(e.nivel_evacuacion)}"></i>` : ""}</div>
      <div class="rio-pie"><span>${fmt(e.h, 2)} m ${e.dh != null ? `(${e.dh > 0 ? "+" : ""}${fmt(e.dh, 2)} m 24 h)` : ""}</span><span>${t("alerta_m")} ${fmt(e.nivel_alerta, 1)} · ${t("evac_m")} ${fmt(e.nivel_evacuacion, 1)}</span></div></li>`;
  }).join("");
  const sem = (v, m) => semaforo(v, m);
  cont.innerHTML = `${cabeceraTablero()}
    <section class="tb-hero">
      <div class="hero-fila"><div class="hero-num"><span class="hero-valor">${fmtRiesgo(r)}</span><span class="hero-unidad">/10</span></div>
        <div class="hero-lado">${pastillaNivel(r)}<span class="hero-sub">${t("riesgo_inundacion")}${idx.length > 1 ? ` · ${t("peor_mes_corto")} ${nombreMes(M[peor])}` : ""}</span></div></div>
      ${medidorRiesgo(r)}
    </section>
    ${bloqueSituacion(nivel, [p1, p2, p3, p4, p5, p6], acc)}
    <section class="tb-bloque"><h3>${t("que_lo_explica")}</h3>
      <div class="tb-comps">${comps.map(([k, v]) => `<div class="comp"><span class="comp-etq">${t(`comp_${k}`)}</span>
        <span class="comp-pista"><span style="width:${limitar((v ?? 0) * 10, 0, 100)}%;background:${colorNivel(v)}"></span></span><b>${fmtRiesgo(v)}</b></div>`).join("")}</div>
    </section>
    <section class="tb-bloque"><h3>${s?.tipo === "punto" ? t("personas_area") : t("personas_zona")}</h3>
      <div class="tb-datos">
        ${dato(t("poblacion"), fmtPersonas(A.poblacion), s?.tipo === "punto" ? t("radios_n")(A.n) : t("municipios_n")(A.n))}
        ${dato(t("terreno_bajo"), A.bajo == null ? "–" : `${fmt(A.bajo)} %`, pastilla(sem(A.bajo, [20, 50]), t("meta_menor")("20 %")), sem(A.bajo, [20, 50]))}
        ${dato(t("sin_cloaca"), A.sinCloaca == null ? "–" : `${fmt(A.sinCloaca)} %`, pastilla(sem(A.sinCloaca, [20, 50]), t("meta_menor")("20 %")), sem(A.sinCloaca, [20, 50]))}
        ${A.nbi != null ? dato(t("nbi"), `${fmt(A.nbi, 1)} %`, pastilla(sem(A.nbi, [5, 10]), t("meta_menor")("5 %")), sem(A.nbi, [5, 10])) :
          dato(t("vulnerabilidad"), `${fmtRiesgo(A.V)}<small>/10</small>`, pastilla(sem(A.V, [4.5, 6]), t("meta_menor")("4,5")), sem(A.V, [4.5, 6]))}
      </div>
      <h4>${t("poblacion_por_nivel")}</h4>${apilada([1, 2, 3, 4, 5].map((n) => ({ v: A.porNivel[n - 1], color: `var(--r${n})`, etq: t("niveles")[n - 1] })), fmtPersonas)}
    </section>
    <section class="tb-bloque"><h3>${t("evolucion")}</h3><div class="leyenda-lineas">
      <span><i style="background:var(--s-1)"></i>${escapar(s ? (s.tipo === "punto" ? t("el_area_cap") : s.lugar.nombre) : "Argentina")}</span>
      ${s ? `<span><i class="punteada" style="border-color:var(--tinta-3)"></i>${t("total_pais")}</span>` : ""}</div>
      <div id="tb-evol" class="graf-cont"></div></section>
    ${rios ? `<section class="tb-bloque"><h3>${icono("rio")} ${t("rios_cercanos")}</h3><ul class="rios">${rios}</ul><p class="tb-fuente">${t("fuente_ina")}</p></section>` : ""}
    ${enlacesCapas("riesgo")}`;
  grafLineas(document.getElementById("tb-evol"), {
    etiquetas: M.map((m) => nombreMes(m)), min: 0, max: 10, marcas: [0, 2, 4, 6, 8, 10], alto: 170, formato: (v) => fmtRiesgo(v),
    series: [...(s ? [{ nombre: t("total_pais"), valores: pais.riesgo, color: "var(--tinta-3)", punteada: true, ancho: 1.5, sinPunto: true }] : []),
      { nombre: s ? (s.tipo === "punto" ? t("el_area_cap") : s.lugar.nombre) : "Argentina", valores: A.riesgo, color: "var(--s-1)", ancho: 2.5, area: true }],
    banda: estado.modo === "futuro" ? estado.rangoMeses : null, marca: estado.iMesActual,
    extraTip: (i) => `<span class="tip-fila">${nombreNivel(A.riesgo[i])}</span>`,
    onClick: (i) => { if (i >= estado.iMesActual) { estado.modo = "futuro"; estado.rangoMeses = [i, i]; actualizarTodo(); } },
  });
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
    t("sit_lluvia")(escapar(lugar), fmt(total), textoPeriodo(), t(cat)),
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
    ${bloqueSituacion(nivel, parrafos, acc)}
    <section class="tb-bloque"><h3>${t("lluvia_por_dia")}</h3><div id="tb-lluvia-dias" class="graf-cont"></div>
      <p class="tb-fuente">${t("ayuda_click_dia")}</p></section>
    <section class="tb-bloque"><h3>${t("prox_48h")}</h3><div id="tb-lluvia-48" class="graf-cont"></div></section>
    ${!s || s.tipo === "zona" ? `<section class="tb-bloque"><h3>${t("donde_mas_llueve")}</h3><div id="tb-lluvia-rk"></div></section>` : ""}
    ${enlacesCapas("lluvia")}`;
  grafBarras(document.getElementById("tb-lluvia-dias"), {
    etiquetas: dias, valores: S.lluvia.map((v) => (v == null ? null : Math.round(v * 10) / 10)), alto: 190, iconos,
    activos: [a, b], marcar: "max", formato: (v) => `${fmt(v, v < 10 ? 1 : 0)} mm`, refs: [{ valor: 20, texto: "20 mm" }],
    colores: (i, v) => (v >= 50 ? "var(--lluvia-5)" : v >= 20 ? "var(--lluvia-4)" : "var(--s-1)"),
    tip: (i) => `<span class="tip-titulo">${fmtDia(T.dias[i], { weekday: "long", day: "numeric", month: "short" })}</span>
      <span class="tip-fila"><b>${fmt(S.lluvia[i], 1)} mm</b> ${t(tiempoWmo(S.codigo[i]).clave)}</span><span class="tip-fila">${t("prob")} ${fmt(S.prob[i])} %</span>`,
    onClick: (i) => { estado.modo = "futuro"; estado.rangoDias = [i, i]; actualizarTodo(); },
  });
  grafBarras(document.getElementById("tb-lluvia-48"), {
    etiquetas: T.horas.map((h) => fmtHora(h)), valores: S.h.lluvia.map((v) => (v == null ? null : Math.round(v * 10) / 10)), alto: 150,
    formato: (v) => `${fmt(v, 1)} mm`, marcar: "max", activos: P.tipo === "hora" ? [P.k, P.k] : null,
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
    ${bloqueSituacion(nivel, parrafos, acc)}
    <section class="tb-bloque"><h3>${t("viento_por_dia")}</h3><div class="leyenda-lineas"><span><i style="background:var(--s-1)"></i>${t("viento_max")}</span><span><i style="background:var(--s-2)"></i>${t("rafagas")}</span></div>
      <div id="tb-viento-dias" class="graf-cont"></div></section>
    <section class="tb-bloque tb-dos"><div><h3>${t("rosa_vientos")}</h3><div id="tb-rosa"></div></div>
      <div><h3>${t("tipos_viento")}</h3>${diasTipo ? `<ul class="tipos-viento">${diasTipo}</ul>` : `<p class="tb-vacio">${t("sin_tipos")}</p>`}
      <p class="tb-fuente">${t("tipos_ayuda")}</p></div></section>
    <section class="tb-bloque"><h3>${t("prox_48h")}</h3><div id="tb-viento-48" class="graf-cont"></div></section>
    ${!s || s.tipo === "zona" ? `<section class="tb-bloque"><h3>${t("rafagas_fuertes")}</h3><div id="tb-viento-rk"></div></section>` : ""}
    ${enlacesCapas("viento")}`;
  grafLineas(document.getElementById("tb-viento-dias"), {
    etiquetas: dias, alto: 180, banda: [a, b], formato: (v) => `${fmt(v)} km/h`,
    series: [{ nombre: t("viento_max"), valores: S.viento, color: "var(--s-1)", ancho: 2.2 }, { nombre: t("rafagas"), valores: S.rafaga, color: "var(--s-2)", ancho: 2.2 }],
    extraTip: (i) => `<span class="tip-fila">${t("del")} ${sector(S.dir[i] ?? 0)} · ${t("beaufort")[beaufort(S.viento[i] ?? 0)]}${tipos[i] ? ` · ${t(`viento_${tipos[i]}`)}` : ""}</span>`,
    onClick: (i) => { estado.modo = "futuro"; estado.rangoDias = [i, i]; actualizarTodo(); },
  });
  grafRosa(document.getElementById("tb-rosa"), { valores: rosa, color: "var(--s-1)", tip: (k) => `<span class="tip-fila"><b>${t("puntos_largos")[k]}</b></span><span class="tip-fila">${fmt((100 * rosa[k]) / (sumar(rosa) || 1))} % ${t("del_viento")}</span>` });
  grafLineas(document.getElementById("tb-viento-48"), {
    etiquetas: T.horas.map((h) => fmtHora(h)), alto: 150, formato: (v) => `${fmt(v)} km/h`, marca: P.tipo === "hora" ? P.k : null,
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
    ${bloqueSituacion(nivel, parrafos, acc)}
    <section class="tb-bloque"><h3>${t("min_max_dia")}</h3><div id="tb-temp-rangos" class="graf-cont"></div></section>
    <section class="tb-bloque"><h3>${t("prox_48h")}</h3><div id="tb-temp-48" class="graf-cont"></div></section>
    ${!s || s.tipo === "zona" ? `<section class="tb-bloque"><h3>${t("mas_calor")}</h3><div id="tb-temp-rk"></div></section>` : ""}
    ${enlacesCapas("temp")}`;
  grafRangos(document.getElementById("tb-temp-rangos"), {
    etiquetas: dias, min: S.tmin, max: S.tmax, alto: 210, activos: [a, b], colorDe: colorTemp, iconos: S.codigo.map((c) => iconoTrazos(tiempoWmo(c).ico)),
    tip: (i) => `<span class="tip-titulo">${fmtDia(T.dias[i], { weekday: "long", day: "numeric", month: "short" })}</span>
      <span class="tip-fila"><b>${fmt(S.tmax[i])} °C</b> ${t("maxima").toLowerCase()} · <b>${fmt(S.tmin[i])} °C</b> ${t("minima").toLowerCase()}</span>
      <span class="tip-fila">${t(tiempoWmo(S.codigo[i]).clave)}</span>`,
    onClick: (i) => { estado.modo = "futuro"; estado.rangoDias = [i, i]; actualizarTodo(); },
  });
  grafLineas(document.getElementById("tb-temp-48"), {
    etiquetas: T.horas.map((h) => fmtHora(h)), alto: 150, formato: (v) => `${fmt(v)} °C`, marca: P.tipo === "hora" ? P.k : null,
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
  cont.querySelectorAll("[data-km]").forEach((b) => { b.onclick = () => cambiarRadio(Number(b.dataset.km)); });
  cont.querySelector('[data-accion="quitar"]')?.addEventListener("click", borrarFiltros);
  cont.querySelector('[data-accion="simular"]')?.addEventListener("click", () => {
    const sel = estado.sel;
    if (sel?.tipo === "punto") return abrirSimulador();
    if (sel?.tipo === "zona" && sel.lugar.nivel !== "prov") {   // centro de la zona, con el radio elegido
      const [x0, y0, x1, y1] = sel.lugar.caja;
      seleccionarPunto([(x0 + x1) / 2, (y0 + y1) / 2], { nombre: sel.lugar.nombre, origen: "zona", volar: true });
      return abrirSimulador();
    }
    cont.querySelector(".btn-sim small").textContent = t("sim_boton_elegir_ya");
  });
  cont.querySelector('[data-accion="municipio"]')?.addEventListener("click", () => {
    const l = estado.lugares.find((x) => x.nivel === "gl" && x.cmus[0] === estado.sel.cmu);
    if (l) elegirLugar("localidad", l);
  });
  cont.querySelectorAll(".salto").forEach((b) => { b.onclick = () => elegirCapa(b.dataset.capa); });
}

// ---------- Análisis por zonas (debajo del mapa) ----------
function zonaAnalisis() {
  const s = estado.sel;
  if (s?.tipo === "zona") return s.lugar;
  if (s?.tipo === "punto" && s.cmu) return estado.lugares.find((l) => l.nivel === "prov" && l.nombre === estado.porCmu.get(s.cmu)?.jur) ?? null;
  return null;
}
function unidadesHijas() {
  const z = zonaAnalisis();
  if (!z) return { nivel: "prov", unidades: estado.lugares.filter((l) => l.nivel === "prov") };
  if (z.nivel === "prov") {
    const dentro = new Set(z.cmus);
    const deptos = estado.lugares.filter((l) => l.nivel === "depto" && l.provincia === z.provincia && l.cmus.every((c) => dentro.has(c)));
    if (deptos.length > 1) return { nivel: "depto", unidades: deptos };
  }
  const gl = new Map(estado.lugares.filter((l) => l.nivel === "gl").map((l) => [l.cmus[0], l]));
  return { nivel: "gl", unidades: z.cmus.map((c) => gl.get(c)).filter(Boolean) };
}

function pintarAnalisis() {
  const cont = document.getElementById("analisis");
  if (estado.capa === "riesgo") return analisisRiesgo(cont);
  if (!estado.tiempo) { cont.innerHTML = ""; return; }
  analisisTiempo(cont);
}

function analisisRiesgo(cont) {
  const { nivel, unidades } = unidadesHijas(), M = estado.riesgo.meses, idx = indicesVista();
  const R = estado.riesgo;
  const filas = unidades.map((u) => {
    const cmus = u.cmus.filter((c) => R.cmu[c]);
    const pob = cmus.map((c) => Math.max(1, Number(estado.porCmu.get(c)?.poblacion) || 1)), tot = sumar(pob);
    return { u, personas: M.map((_, i) => sumar(cmus.map((c) => R.cmu[c].p[i] ?? 0))),
      riesgo: M.map((_, i) => sumar(cmus.map((c, k) => (R.cmu[c].r[i] ?? 0) * pob[k])) / tot) };
  }).filter((f) => f.u.cmus.length);
  const pVista = (f) => Math.max(...idx.map((i) => f.personas[i])), rVista = (f) => Math.max(...idx.map((i) => f.riesgo[i]));
  const orden = filas.slice().sort((a, b) => pVista(b) - pVista(a));
  const total = sumar(orden.map(pVista)) || 1;
  let acum = 0, n80 = 0;
  orden.forEach((f) => { const antes = acum; acum += pVista(f); if (antes / total < 0.8) n80++; });
  const zonaTxt = zonaAnalisis()?.nombre ?? "Argentina";
  cont.innerHTML = `
    <div class="an-cabeza"><h2>${t("an_riesgo_t")(escapar(zonaTxt))}</h2><p>${escapar(textoPeriodo("riesgo"))}</p></div>
    <div class="an-grilla">
      <section class="an-bloque"><h3>${t("pareto_t")}</h3><p class="hallazgo">${t("pareto_hallazgo")(n80, orden.length, t("niveles_zona")[nivel])}</p>
        <div id="an-pareto"></div><p class="nota">${t("pareto_nota")}</p></section>
      <section class="an-bloque"><h3>${t("calor_t")}</h3><p class="nota">${t("calor_nota")}</p><div id="an-calor"></div></section>
      <section class="an-bloque an-ancho"><h3>${t("ranking_t")}</h3>
        <div class="pestanas" role="tablist"><button role="tab" data-rk="r" aria-selected="${estado.ranking !== "p"}">${t("tab_relativo")}</button>
          <button role="tab" data-rk="p" aria-selected="${estado.ranking === "p"}">${t("tab_personas")}</button></div>
        <div id="an-ranking"></div><p class="nota">${t("robustez_nota")}</p>
        <details class="ver-tabla"><summary>${t("ver_tabla")}</summary><div class="tabla-cont"><table class="tabla" id="an-tabla"></table></div></details></section>
    </div>`;
  // Pareto como ranking horizontal con barra de acumulado
  const top = orden.slice(0, 15);
  let ac = 0;
  grafRanking(document.getElementById("an-pareto"), {
    filas: top.map((f) => { ac += pVista(f); return { nombre: f.u.nombre, sub: `${fmt((100 * ac) / total)} % ${t("acumulado")}`, valor: pVista(f),
      color: colorNivel(rVista(f)), tip: `<span class="tip-titulo">${escapar(f.u.nombre)}</span><span class="tip-fila"><b>${fmtPersonas(pVista(f))}</b> ${t("personas_riesgo")}</span><span class="tip-fila">${t("riesgo")} ${fmtRiesgo(rVista(f))} · ${nombreNivel(rVista(f))}</span>`, u: f.u }; }),
    formato: fmtPersonas, onClick: (f) => seleccionarZona(f.u, { volar: true }),
  });
  const calor = filas.slice().sort((a, b) => rVista(b) - rVista(a)).slice(0, 18);
  grafCalor(document.getElementById("an-calor"), {
    filas: calor.map((f) => ({ nombre: f.u.nombre, valores: f.riesgo, u: f.u })), columnas: M.map((m) => nombreMes(m)),
    colorDe: (v) => colorNivel(v), textoDe: (v) => fmtRiesgo(v), tintaDe: (v) => (nivelRiesgo(v) >= 4 ? "#fff" : "var(--tinta-calor)"),
    activas: [idx[0], idx[idx.length - 1]],
    tipDe: (f, k) => `<span class="tip-titulo">${escapar(f.nombre)} · ${nombreMes(M[k])}</span><span class="tip-fila"><b>${fmtRiesgo(f.valores[k])}</b> ${nombreNivel(f.valores[k])}</span>`,
    onFila: (f) => seleccionarZona(f.u, { volar: true }),
    onCelda: (f, k) => { if (k >= estado.iMesActual) { estado.modo = "futuro"; estado.rangoMeses = [k, k]; actualizarTodo(); } },
  });
  // Ranking de municipios
  const cmus = (zonaAnalisis()?.cmus ?? todosLosCmus()).filter((c) => R.cmu[c]);
  const porR = estado.ranking !== "p";
  const rk = cmus.map((c) => { const d = R.cmu[c], m = estado.porCmu.get(c) || {};
    return { cmu: c, nombre: m.nam, sub: m.jur, r: Math.max(...idx.map((i) => d.r[i] ?? 0)), p: Math.max(...idx.map((i) => d.p[i] ?? 0)), rob: d.rob }; })
    .sort((a, b) => (porR ? b.r - a.r : b.p - a.p)).slice(0, 20);
  grafRanking(document.getElementById("an-ranking"), {
    filas: rk.map((f) => ({ ...f, valor: porR ? f.r : f.p, color: colorNivel(f.r),
      tip: `<span class="tip-titulo">${escapar(f.nombre)}</span><span class="tip-fila"><b>${fmtRiesgo(f.r)}</b> ${nombreNivel(f.r)}</span><span class="tip-fila">${fmtPersonas(f.p)} ${t("personas_riesgo")} · ${t("robustez")} ${fmt(f.rob)} %</span>` })),
    max: porR ? 10 : undefined, formato: porR ? fmtRiesgo : fmtPersonas,
    onClick: (f) => { const l = estado.lugares.find((x) => x.nivel === "gl" && x.cmus[0] === f.cmu); if (l) seleccionarZona(l, { volar: true }); },
  });
  document.getElementById("an-tabla").innerHTML = `<thead><tr><th>${t("col_mun")}</th><th>${t("col_prov")}</th><th class="num">${t("col_riesgo")}</th><th class="num">${t("col_personas")}</th><th class="num">${t("robustez")}</th></tr></thead>
    <tbody>${rk.map((f) => `<tr><td>${escapar(f.nombre)}</td><td>${escapar(f.sub)}</td><td class="num">${fmtRiesgo(f.r)}</td><td class="num">${fmt(f.p)}</td><td class="num">${fmt(f.rob)} %</td></tr>`).join("")}</tbody>`;
  cont.querySelectorAll("[data-rk]").forEach((b) => { b.onclick = () => { estado.ranking = b.dataset.rk; analisisRiesgo(cont); }; });
}

function analisisTiempo(cont) {
  const T = estado.tiempo, capa = estado.capa, TM = tiempoMunicipios();
  const { unidades } = unidadesHijas();
  const variable = { lluvia: "lluvia", viento: "rafaga", temp: "tmax" }[capa];
  const filas = unidades.map((u) => {
    const cmus = u.cmus.filter((c) => TM.has(c));
    if (!cmus.length) return null;
    const pob = cmus.map((c) => Math.max(1, Number(estado.porCmu.get(c)?.poblacion) || 1)), tot = sumar(pob);
    const valores = T.dias.map((_, k) => sumar(cmus.map((c, i) => (TM.get(c)[variable][k] ?? 0) * pob[i])) / tot);
    return { u, valores };
  }).filter(Boolean);
  const P = periodoTiempo(), [a, b] = P.tipo === "hora" ? [diaHoy(T), diaHoy(T)] : [P.a, P.b];
  const resumen = (f) => (capa === "lluvia" ? sumar(f.valores.slice(a, b + 1)) : Math.max(...f.valores.slice(a, b + 1)));
  filas.sort((x, y) => resumen(y) - resumen(x));
  const escalaDia = capa === "lluvia" ? ESCALAS.lluviaDia : ESCALAS[capa];
  const unidad = { lluvia: "mm", viento: "km/h", temp: "°C" }[capa];
  const zonaTxt = zonaAnalisis()?.nombre ?? "Argentina";
  cont.innerHTML = `
    <div class="an-cabeza"><h2>${t(`an_${capa}_t`)(escapar(zonaTxt))}</h2><p>${t("an_tiempo_sub")(T.generado ? fmtDia(T.dias[0]) : "")}</p></div>
    <div class="an-grilla">
      <section class="an-bloque an-ancho"><h3>${t(`an_${capa}_calor`)}</h3><p class="nota">${t("an_tiempo_nota")}</p><div id="an-calor"></div></section>
    </div>`;
  grafCalor(document.getElementById("an-calor"), {
    filas: filas.slice(0, 24).map((f) => ({ nombre: f.u.nombre, valores: f.valores, u: f.u })),
    columnas: T.dias.map((d) => fmtDia(d, { weekday: "narrow", day: "numeric" })),
    colorDe: (v) => { const c = colorEscala(escalaDia, v, capa === "lluvia"); return c && c[3] > 0.05 ? rgba(c, 0.35) : "var(--superficie-2)"; },
    textoDe: (v) => (capa === "lluvia" ? (v < 0.5 ? "" : fmt(v)) : fmt(v)), tintaDe: () => "var(--tinta-calor)",
    activas: [a, b],
    tipDe: (f, k) => `<span class="tip-titulo">${escapar(f.nombre)} · ${fmtDia(T.dias[k])}</span><span class="tip-fila"><b>${fmt(f.valores[k], capa === "lluvia" ? 1 : 0)} ${unidad}</b> ${t("promedio_pob")}</span>`,
    onFila: (f) => seleccionarZona(f.u, { volar: true }),
    onCelda: (f, k) => { estado.modo = "futuro"; estado.rangoDias = [k, k]; actualizarTodo(); },
  });
}

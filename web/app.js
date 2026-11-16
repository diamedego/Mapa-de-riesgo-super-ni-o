// Argentina frente a El Niño 2026-27: tablero de riesgo de inundación y del tiempo.
// Orquesta el estado, los indicadores, el modo (condiciones actuales o futuras), la línea de tiempo, las capas
// (una grande y las otras en miniatura), la selección y el arranque. Módulos: textos, utiles, graficos, tiempo,
// mapa, buscador y tableros.

const estado = {
  idioma: "es", capa: "riesgo", modo: "actual", sel: null, km: 1,
  rangoRiesgo: [0, 0], rangoDias: [0, 6], paso3h: null,
  diaRiesgo: null, diaReproduciendo: null, reproduciendo: null,
  verRios: true, verAlertas: false, verReferencias: true, verHidro: true, verInundadas: false, verInundHoy: false, verDensidad: false,
  verBarrios: false, verSuelo: false, verInfra: false, verRutas: false, riesgo3d: false, relieve3d: false, relieve: false, ranking: "r",
  datos: {}, riesgo: null, porCmu: new Map(), radios: [], cargasRadios: new Map(), tiempo: null,
};
const t = (clave) => TEXTOS[estado.idioma][clave] ?? TEXTOS.es[clave] ?? clave;
const CAPAS = ["riesgo", "lluvia", "viento", "temp"];

// ---------- Indicadores grandes (franja superior) ----------
function alcanceKpis() {
  const s = estado.sel;
  if (s?.tipo === "zona") return { nombre: s.lugar.nombre, cmus: s.lugar.cmus.filter((c) => estado.riesgo.cmu[c]), caja: s.lugar.caja };
  if (s?.tipo === "punto" && s.cmu) { const m = estado.porCmu.get(s.cmu); return { nombre: `${m?.nam ?? ""} · ${t("sel_circulo")(s.km).toLowerCase()}`, cmus: [s.cmu], caja: cajaCirculo(s.punto, s.km), circulo: s }; }
  return { nombre: "Argentina", cmus: todosLosCmus(), caja: null };
}

// Con un punto elegido, los indicadores son los del círculo: los radios censales que caen adentro (su riesgo es el del radio,
// no el promedio del municipio). Si los radios de la zona todavía no se bajaron, se piden y se vuelve a pintar.
let pedidoRadiosKpi = "";
function circuloKpis(s) {
  const R = estado.riesgo, M = R.dias, idx = indicesVista(), radios = (estado.radios ?? []).filter((f) => f.properties._c && f.properties[`r_${M[0]}`] != null);
  let dentro = radios.filter((f) => distanciaKm(s.punto, f.properties._c) <= s.km);
  if (!dentro.length) {   // círculo chico: el radio que contiene el punto
    const c = radios.find((f) => cajasSeTocan(cajaCirculo(s.punto, 0.01), cajaDe(f.geometry)) && contiene(f.geometry, s.punto));
    if (c) dentro = [c];
  }
  const clave = `${s.punto}|${s.km}`;
  if (!dentro.length) {
    if (pedidoRadiosKpi !== clave) { pedidoRadiosKpi = clave; cargarRadiosEn(cajaCirculo(s.punto, s.km)).then(() => { if (estado.sel === s) pintarKpis(); }); return { cargando: true }; }
    return null;   // sin radios censales en el lugar (zona rural sin datos): queda el municipio
  }
  const props = dentro.map((f) => f.properties), pob = props.map((p) => Number(p.poblacion) || 0), peso = pob.map((v) => Math.max(1, v)), total = sumar(peso);
  const rVista = props.map((p) => Math.max(...idx.map((i) => Number(p[`r_${M[i]}`]) || 0)));
  const altos = props.filter((p, k) => rVista[k] >= CORTES[2]);
  return { n: props.length, poblacion: sumar(pob), altos: altos.length, pobAlto: sumar(altos.map((p) => Number(p.poblacion) || 0)),
    riesgo: M.map((m) => sumar(props.map((p, k) => (Number(p[`r_${m}`]) || 0) * peso[k])) / total) };
}

function pintarKpis() {
  const A = alcanceKpis(), R = estado.riesgo, idx = indicesVista();
  const C = A.circulo ? circuloKpis(A.circulo) : null;
  if (C?.cargando) return;   // vuelve a pintarse apenas llegan los radios censales del círculo
  const Z = C ?? analisisRiesgoZona(A.cmus);
  const rV = Math.max(...idx.map((i) => Z.riesgo[i]));
  const altos = C ? [] : A.cmus.filter((c) => Math.max(...idx.map((i) => R.cmu[c].r[i] ?? 0)) >= CORTES[2]);
  const pobAlto = C ? C.pobAlto : sumar(altos.map((c) => Number(estado.porCmu.get(c)?.poblacion) || 0));
  // Ríos: con un punto, las estaciones a menos de 15 km (o dentro del círculo, si es más grande); con una zona, las de su caja
  const enCaja = (c) => (A.circulo ? distanciaKm(A.circulo.punto, c) <= Math.max(15, A.circulo.km)
    : !A.caja || (c[0] >= A.caja[0] - 0.1 && c[0] <= A.caja[2] + 0.1 && c[1] >= A.caja[1] - 0.1 && c[1] <= A.caja[3] + 0.1));
  const alertas = estado.datos.alertas.features.filter((f) => !A.caja || (cajasSeTocan(cajaDe(f.geometry), A.caja) && (!A.circulo || contiene(f.geometry, A.circulo.punto)))).map((f) => f.properties);
  const nivelAl = alertas.some((a) => a.nivel === "roja") ? "roja" : alertas.some((a) => a.nivel === "naranja") ? "naranja" : alertas.length ? "amarilla" : null;
  const ests = estado.datos.estaciones.features.filter((f) => f.properties.estado && enCaja(f.geometry.coordinates)).map((f) => f.properties);
  const evac = ests.filter((e) => e.estado === "evacuacion").length, alerta = ests.filter((e) => e.estado === "alerta").length;
  const kpis = [
    { k: "personas", ico: "personas", etq: t("kpi_personas"), valor: fmtPersonas(pobAlto), sub: t("kpi_personas_sub")(fmt((100 * pobAlto) / (Z.poblacion || 1), 1)),
      sev: pobAlto > 0 ? "atencion" : "ok", ir: () => { elegirCapa("riesgo"); irALamina(3); } },
    C ? { k: "radios", ico: "municipio", etq: t("kpi_radios"), valor: fmt(C.altos), unidad: ` / ${fmt(C.n)}`, sub: t("kpi_municipios_sub"),
      sev: C.altos ? "atencion" : "ok", ir: () => { elegirCapa("riesgo"); irALamina(3); } }
      : { k: "municipios", ico: "municipio", etq: t("kpi_municipios"), valor: fmt(altos.length), unidad: ` / ${fmt(A.cmus.length)}`, sub: t("kpi_municipios_sub"),
      sev: altos.length ? "atencion" : "ok", ir: () => { elegirCapa("riesgo"); irALamina(3); } },
    { k: "rios", ico: "rio", etq: t("kpi_rios"), valor: fmt(evac + alerta), unidad: ` / ${fmt(ests.length)}`, sub: t("kpi_rios_sub")(evac, alerta),
      sev: evac ? "critico" : alerta ? "atencion" : "ok", ir: () => { estado.verRios = true; actualizarTodo(); } },
    { k: "alertas", ico: "alerta", etq: t("kpi_alertas"), valor: fmt(alertas.length), sub: alertas.length ? [...new Set(alertas.map((a) => t(`alerta_${a.tipo}`)))].slice(0, 2).join(" · ") : t("sin_alertas"),
      sev: nivelAl === "roja" || nivelAl === "naranja" ? "critico" : nivelAl ? "atencion" : "ok", nivelAl, ir: () => { estado.verAlertas = true; actualizarTodo(); } },
  ];
  if (estado.tiempo) {
    const T = estado.tiempo, TM = tiempoMunicipios(), h0 = diaHoy(T), h6 = Math.min(T.dias.length - 1, h0 + 6), h2 = Math.min(T.dias.length - 1, h0 + 2);
    const ext = (fn) => { let m = null; for (const c of A.cmus) { const s = TM.get(c); if (!s) continue; const v = fn(s); if (v != null && (!m || v > m.v)) m = { v, c }; } return m; };
    const lluvia = ext((s) => sumar(s.lluvia.slice(h0, h6 + 1).filter((v) => v != null)));
    const raf = ext((s) => Math.max(...s.rafaga.slice(h0, h2 + 1).filter((v) => v != null)));
    const tmx = ext((s) => Math.max(...s.tmax.slice(h0, h6 + 1).filter((v) => v != null)));
    const lugar = (m) => (m ? (A.circulo ? t("en_el_lugar") : `${estado.porCmu.get(m.c)?.nam ?? ""}${A.cmus.length > 1 ? ` · ${estado.porCmu.get(m.c)?.jur ?? ""}` : ""}`) : "");
    const irA = (capa, m, dias) => () => { estado.modo = "futuro"; estado.rangoDias = [h0, dias]; elegirCapa(capa); if (m && A.cmus.length > 1) seleccionarPunto(estado.riesgo.cmu[m.c].c, { volar: true, origen: "kpi" }); };
    kpis.push(
      { k: "lluvia", ico: "lluvia", etq: t("kpi_lluvia"), valor: fmt(lluvia?.v), unidad: " mm", sub: lugar(lluvia), sev: lluvia?.v >= 100 ? "critico" : lluvia?.v >= 50 ? "atencion" : "ok", ir: irA("lluvia", lluvia, h6) },
      { k: "rafaga", ico: "viento", etq: t("kpi_rafaga"), valor: fmt(raf?.v), unidad: " km/h", sub: lugar(raf), sev: raf?.v >= 90 ? "critico" : raf?.v >= 60 ? "atencion" : "ok", ir: irA("viento", raf, h2) },
      { k: "temp", ico: "temp", etq: t("kpi_temp"), valor: fmt(tmx?.v), unidad: " °C", sub: lugar(tmx), sev: tmx?.v >= 38 ? "critico" : tmx?.v >= 34 ? "atencion" : "ok", ir: irA("temp", tmx, h6) },
    );
  }
  // Día más comprometido de los próximos 14 días: el de más personas en riesgo alto o muy alto (con un círculo, el de más riesgo)
  const pico = picoDias(A, C, Z);
  kpis.push({ k: "pico", ico: "calendario", etq: t("kpi_pico"), valor: pico ? fmtDia(R.dias[pico.i], { day: "numeric", month: "short" }).replace(".", "") : "–",
    sub: pico ? t("kpi_pico_sub")(pico.i, C ? null : fmtPersonas(pico.v)) : t("kpi_pico_no"), sev: pico && pico.i > 0 ? "atencion" : "ok",
    ir: () => { if (!pico) return; detenerReproduccion(false); estado.rangoRiesgo = [pico.i, pico.i]; elegirCapa("riesgo"); } });
  document.getElementById("kpis-alcance").textContent = t("kpis_de")(A.nombre);
  const cont = document.getElementById("kpis");
  cont.innerHTML = kpis.map((k, i) => `<button class="kpi" data-i="${i}" data-sev="${k.sev}"${k.nivelAl ? ` data-alerta="${k.nivelAl}"` : ""} type="button" data-ayuda="${escapar(t(`kpi_ayuda_${k.k}`))}">
      <span class="kpi-l">${k.etq}</span><span class="kpi-i">${icono(k.ico)}</span>
      <span class="kpi-v">${k.valor}${k.unidad ? `<small>${k.unidad.trim()}</small>` : ""}</span>
      <span class="kpi-f">${escapar(k.sub)}</span></button>`).join("");
  cont.querySelectorAll(".kpi").forEach((b) => { b.onclick = () => kpis[+b.dataset.i].ir(); });
  pintarCabezaLectura(A, rV, pobAlto, evac, pico);
  pintarRadioLectura(A.circulo ?? (estado.sel ? null : { km: estado.km }));   // sin nada elegido: el radio que tendrá el próximo punto
}

// Radio del círculo, arriba de todo de la lectura (solo con un punto elegido)
function pintarRadioLectura(s) {
  const cont = document.getElementById("lec-radio");
  cont.hidden = !s;
  if (!s) return;
  const txt = (km) => `${fmt(km, km % 1 ? 1 : 0)} km`;
  if (!cont.querySelector("input")) {
    cont.innerHTML = `<span class="etq">${t("radio_corto")}</span><input type="range" min="0.5" max="20" step="0.5" aria-label="${t("radio_km")}"><b id="lec-radio-v"></b>`;
    const inp = cont.querySelector("input");
    inp.oninput = () => { document.getElementById("lec-radio-v").textContent = txt(+inp.value); };
    inp.onchange = () => { cambiarRadio(Number(inp.value)); if (!estado.sel) pintarRadioLectura({ km: estado.km }); };
  }
  cont.querySelector(".etq").textContent = t("radio_corto");
  const inp = cont.querySelector("input");
  if (document.activeElement !== inp) inp.value = String(s.km);
  document.getElementById("lec-radio-v").textContent = txt(+inp.value);
}

// Día de los próximos 14 con más personas en riesgo alto o muy alto (zona o país) o con más riesgo (círculo). null si ninguno llega.
function picoDias(A, C, Z) {
  const D = estado.riesgo.dias;
  const vals = C ? D.map((_, i) => C.riesgo[i] ?? 0) : D.map((_, i) => Z.personas?.[i] ?? 0);
  const v = Math.max(...vals), i = vals.indexOf(v);
  return (C ? nivelRiesgo(v) >= 4 : v > 0) ? { i, v } : null;
}

// ---------- Cabeza de la lámina 01: titular, bajada y escala de riesgo ----------
function pintarCabezaLectura(A, rV, pobAlto, evac, pico) {
  const pais = A.nombre === "Argentina", hoy = fmtDia(hoyLocal(), { day: "numeric", month: "short", year: "numeric" }).replace(".", "");
  const nivel = nombreNivel(rV).toLowerCase(), c = A.circulo ? "_c" : "";
  document.getElementById("lec-etq").textContent = t("lec_etq")(pais ? t("lec_pais") : A.nombre, hoy);
  document.getElementById("lec-titular").innerHTML = `${escapar(capitalizar(t("lec_titular")(nivel)))} <span>${t("sobre_10")(fmtRiesgo(rV))}</span>`;
  const pers = pobAlto >= 1e6 ? t("personas_txt")(fmt(pobAlto / 1e6, 1), true) : t("personas_txt")(fmt(Math.round(pobAlto)), false);
  const diaPico = pico ? fmtDiaFrase(estado.riesgo.dias[pico.i], { weekday: "long", day: "numeric", month: "long" }).replace(",", "") : null;
  document.getElementById("lec-bajada").textContent = t(`lec_bajada${c}`)(capitalizar(pers), evac, pico ? pico.i : null, diaPico);
  document.getElementById("escala-sub").textContent = t("escala_sub")(pais ? t("el_pais") : A.nombre);
  // Indicador de aguja de 0 a 10: un tramo por nivel del índice y la aguja en el valor de hoy
  const cortes = [0, ...CORTES, 10], nombres = t("niveles_cortos"), cx = 115, cy = 108, R = 82, v = limitar(rV, 0, 10);
  const pt = (val, r) => { const a = Math.PI * (1 - val / 10); return [(cx + r * Math.cos(a)).toFixed(1), (cy - r * Math.sin(a)).toFixed(1)]; };
  let ag = "";
  cortes.slice(1).forEach((c, i) => {
    const a = pt(cortes[i] + (i ? 0.07 : 0), R), b = pt(c - (c < 10 ? 0.07 : 0), R);
    ag += `<path d="M${a[0]} ${a[1]}A${R} ${R} 0 0 1 ${b[0]} ${b[1]}" fill="none" stroke-width="15" style="stroke:var(--r${i + 1})"><title>${nombres[i]}: ${fmt(cortes[i], cortes[i] % 1 ? 1 : 0)}–${fmt(c, c % 1 ? 1 : 0)}</title></path>`;
  });
  cortes.forEach((c) => { const q = pt(c, R + 17); ag += `<text x="${q[0]}" y="${c === 0 || c === 10 ? cy + 16 : q[1]}" text-anchor="middle" dominant-baseline="middle">${fmt(c, c % 1 ? 1 : 0)}</text>`; });
  const punta = pt(v, R - 13);
  ag += `<line x1="${cx}" y1="${cy}" x2="${punta[0]}" y2="${punta[1]}" stroke-width="2.5" stroke-linecap="round" style="stroke:var(--tinta-1)"/><circle cx="${cx}" cy="${cy}" r="5.5" style="fill:var(--tinta-1)"/>`;
  ag += `<text class="v" x="${cx}" y="${cy + 34}" text-anchor="middle">${fmtRiesgo(rV)} / 10 · ${escapar(nombreNivel(rV))}</text>`;
  document.getElementById("lec-escala").innerHTML = `<svg class="aguja" viewBox="0 0 230 150" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${fmtRiesgo(rV)} / 10 · ${escapar(nombreNivel(rV))}">${ag}</svg>`;
}

// ---------- Modo, período y línea de tiempo ----------
// Riesgo: días (hoy y los próximos 14); el modo «Ahora / Pronóstico» queda solo para lluvia, viento y temperatura.
// Fila de condiciones: dos casilleros de fecha limitados al horizonte del pronóstico y el texto «16/11/2026 – Dentro de 7 días»
function pintarControles() {
  document.querySelectorAll("#modo [data-modo]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.modo === estado.modo)));
  document.querySelectorAll(".capas-tabs [data-capa]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.capa === estado.capa)));
  const riesgo = estado.capa === "riesgo";
  document.getElementById("modo").hidden = riesgo;
  const caja = document.getElementById("periodo-futuro"), de = document.getElementById("f-desde"), ha = document.getElementById("f-hasta");
  const T = estado.tiempo, D = estado.riesgo.dias;
  caja.hidden = !riesgo && estado.modo !== "futuro";
  const fechas = riesgo ? D : T?.dias, rango = riesgo ? estado.rangoRiesgo : estado.rangoDias, h = riesgo ? 0 : T ? diaHoy(T) : 0;
  if (!caja.hidden && fechas) {
    for (const x of [de, ha]) { x.type = "date"; x.min = fechas[h]; x.max = fechas[fechas.length - 1]; }
    de.value = fechas[rango[0]]; ha.value = fechas[rango[1]];
    caja.dataset.ayuda = t(riesgo ? "limite_riesgo" : "limite_dias")(fechaCorta(fechas[fechas.length - 1]));
    de.onchange = ha.onchange = () => {
      let a = fechas.indexOf(de.value), b = fechas.indexOf(ha.value);
      if (a < 0) a = rango[0]; if (b < 0) b = rango[1]; if (b < a) b = a;
      detenerReproduccion(false);
      if (riesgo) estado.rangoRiesgo = [a, b]; else estado.rangoDias = [a, b];
      actualizarTodo();
    };
  }
  document.getElementById("periodo-texto").textContent = textoPeriodoFila();
  actualizarBorrar();
}
const fechaCorta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
function diasDesdeHoy(iso) { const hoy = hoyLocal(); return Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${hoy}T12:00:00Z`)) / 86400e3); }
function textoPeriodoFila() {
  const T = estado.tiempo, riesgo = estado.capa === "riesgo";
  if (!riesgo && estado.modo === "actual") return t("hoy_fecha")(fechaCorta(hoyLocal()));
  const fechas = riesgo ? estado.riesgo.dias : T?.dias;
  if (!fechas) return "";
  const [a, b] = riesgo ? estado.rangoRiesgo : estado.rangoDias, da = diasDesdeHoy(fechas[a]), db = diasDesdeHoy(fechas[b]);
  if (a === b && da <= 0) return t("hoy_fecha")(fechaCorta(fechas[a]));
  if (a !== b && da <= 0) return t("dias_desde_hoy")(fechaCorta(fechas[a]).slice(0, 5), fechaCorta(fechas[b]), db);
  return a === b ? t("dia_dentro")(fechaCorta(fechas[a]), da) : t("dias_dentro")(fechaCorta(fechas[a]).slice(0, 5), fechaCorta(fechas[b]), da, db);
}

// La línea de tiempo: días del riesgo, pasos de 3 h (tiempo, ahora) o días (tiempo, pronóstico)
function itemsLinea() {
  const T = estado.tiempo;
  if (estado.capa === "riesgo") return { tipo: "rdia", items: estado.riesgo.dias.map((d, i) => ({ etq: fmtDia(d, { day: "numeric" }), sub: i ? fmtDia(d, { weekday: "narrow" }) : t("ahora"), pasado: false })) };
  if (!T) return { tipo: "nada", items: [] };
  if (estado.modo === "actual") {
    const k0 = pasoAhora(T);
    return { tipo: "hora", items: T.horas.map((h, k) => ({ etq: fmtHora(h), sub: k === k0 ? t("ahora") : h.endsWith("T00:00") || k === 0 ? fmtDia(h.slice(0, 10), { weekday: "short" }) : "", pasado: k < k0 })) };
  }
  const h = diaHoy(T);
  return { tipo: "dia", items: T.dias.map((d, i) => ({ etq: fmtDia(d, { day: "numeric" }), sub: fmtDia(d, { weekday: "narrow" }), pasado: i < h })) };
}
function seleccionLinea(tipo) {
  if (tipo === "rdia") return estado.diaRiesgo != null ? [estado.diaRiesgo, estado.diaRiesgo] : estado.rangoRiesgo;
  if (tipo === "hora") { const k = estado.paso3h ?? pasoAhora(estado.tiempo); return [k, k]; }
  return estado.diaReproduciendo != null ? [estado.diaReproduciendo, estado.diaReproduciendo] : estado.rangoDias;
}

function pintarLineaTiempo() { const c = document.getElementById("linea-tiempo"); if (c) c.hidden = true; }   // ahora vive en el panel izquierdo

// Índices que recorre ▶: días del riesgo (el tramo elegido o, con un solo día, de hoy a 14 días), pasos de 3 h o días del tiempo
function listaReproduccion() {
  const { tipo } = itemsLinea(), T = estado.tiempo;
  const tramo = (r, desde, hasta) => { const [a, b] = r[0] === r[1] ? [desde, hasta] : r; return Array.from({ length: b - a + 1 }, (_, k) => a + k); };
  if (tipo === "rdia") return { tipo, lista: tramo(estado.rangoRiesgo, 0, estado.riesgo.dias.length - 1) };
  if (tipo === "hora") return { tipo, lista: Array.from({ length: T.horas.length - pasoAhora(T) }, (_, k) => pasoAhora(T) + k) };
  if (tipo === "dia") return { tipo, lista: tramo(estado.rangoDias, diaHoy(T), T.dias.length - 1) };
  return { tipo, lista: [] };
}
// Refresca solo el bloque de la línea de tiempo (mientras corre ▶, sin redibujar todo el panel)
function actualizarEvolucion() {
  const viejo = document.querySelector(".lec-1 .tb-evol");
  if (!viejo) return;
  const tmp = document.createElement("div"); tmp.innerHTML = bloqueEvolucion();
  const nuevo = tmp.firstElementChild;
  if (!nuevo) return;
  viejo.replaceWith(nuevo);
  nuevo.querySelector('[data-accion="evol"]').onclick = () => (estado.reproduciendo != null ? detenerReproduccion() : reproducir());
  enlazarInfo(nuevo);
}
// Bloque del panel izquierdo: ▶ y una línea de tiempo con hitos al comienzo de cada semana (lunes). Mientras avanza, en el riesgo
// la línea se pinta con el color del nivel de ese día y un cartelito dice dónde estamos.
function bloqueEvolucion() {
  const { tipo, lista } = listaReproduccion();
  if (!lista.length || lista.length < 2) return "";
  const T = estado.tiempo, jugando = estado.reproduciendo != null, n1 = lista.length - 1;
  const fechas = tipo === "rdia" ? estado.riesgo.dias : T.dias;
  let pct = 0, cartel = "", color = "var(--cian)", tinta = "var(--cian-tinta)";
  const x = (j) => (100 * j) / n1, etq = (k) => (tipo === "hora" ? fmtHora(T.horas[k]) : fechaCorta(fechas[k]).slice(0, 5));
  const lunes = lista.map((k, j) => ({ j, k })).filter(({ k }) => tipo !== "hora" && new Date(`${fechas[k]}T12:00:00Z`).getUTCDay() === 1);
  const hitos = [{ j: 0 }, ...lunes.filter(({ j }) => j > 0), { j: n1 }].filter((h, i, a) => a.findIndex((q) => q.j === h.j) === i)
    .filter((h, i, a) => i === 0 || (h.j - a[i - 1].j) / n1 > 0.14)
    .map(({ j }) => ({ x: x(j), etq: etq(lista[j]), activo: false, j }));
  const semanas = lunes.map(({ j }) => x(j));
  const actual = tipo === "rdia" ? estado.diaRiesgo : tipo === "dia" ? estado.diaReproduciendo : jugando ? estado.paso3h : null, pos = actual == null ? -1 : lista.indexOf(actual);
  if (pos >= 0) {
    pct = x(pos);
    cartel = tipo === "hora" ? `${fmtDia(T.horas[actual].slice(0, 10), { weekday: "short", day: "numeric" })} ${fmtHora(T.horas[actual])}`
      : tipo === "rdia" ? `${fmtDia(fechas[actual], { weekday: "short", day: "numeric", month: "short" })}${actual ? ` · ${t("dentro_n")(actual)}` : ` · ${t("hoy")}`}`
      : t("sem_cartel_dia")(Math.floor(pos / 7) + 1, fmtDia(fechas[actual], { day: "numeric", month: "short" }));
    if (tipo === "rdia") { const niv = nivelRiesgo(riesgoDelDia(actual)) || 1; color = `var(--r${niv})`; tinta = niv === 1 || niv === 5 ? "#fff" : "#1b2430"; }
    hitos.forEach((h) => { h.activo = h.x <= pct + 0.01; });
  }
  return `<div class="tb-evol"><button type="button" class="lt-play" data-accion="evol" aria-label="${jugando ? t("pausar") : t("reproducir")}">${icono(jugando ? "pausa" : "play")}</button>
    <div class="tb-evol-cuerpo"><div class="tb-evol-cab"><span>${t("evolucion")}${infoIcono("evolucion", infoTexto("evolucion"))}</span></div>
      <div class="tb-evol-pista" style="--c:${color};--tinta:${tinta}">
        ${cartel ? `<span class="tb-evol-cartel" style="left:${limitar(pct, 22, 78)}%">${escapar(cartel)}</span>` : ""}
        <span class="tb-evol-relleno" style="width:${pct}%"></span>
        ${semanas.map((x) => `<span class="tb-evol-sem${x <= pct && cartel ? " ok" : ""}" style="left:${x}%"></span>`).join("")}
        ${hitos.map((h) => `<span class="tb-evol-hito${h.activo ? " ok" : ""}" style="left:${h.x}%"><i></i><small>${escapar(h.etq)}</small></span>`).join("")}</div></div></div>`;
}

function elegirEnLinea(tipo, a, b, extender = false) {
  if (tipo === "rdia") estado.rangoRiesgo = extender ? [Math.min(estado.rangoRiesgo[0], a), Math.max(estado.rangoRiesgo[1], b)] : [a, b];
  else if (tipo === "hora") estado.paso3h = a;
  else estado.rangoDias = extender ? [Math.min(estado.rangoDias[0], a), Math.max(estado.rangoDias[1], b)] : [a, b];
  actualizarTodo({ ligero: true });
}

// Riesgo del lugar elegido en un día (para pintar la línea con el color del momento)
function riesgoDelDia(i) {
  const s = estado.sel, R = estado.riesgo;
  if (s?.tipo === "punto" && s.cmu && R.cmu[s.cmu]) return R.cmu[s.cmu].r[i];
  const cmus = cmusSel(), pob = cmus.map((c) => Math.max(1, Number(estado.porCmu.get(c)?.poblacion) || 1));
  return sumar(cmus.map((c, k) => (R.cmu[c].r[i] ?? 0) * pob[k])) / sumar(pob);
}

// Reproducción: avanza día a día (riesgo y tiempo) o de a 3 h, y se detiene al final
function reproducir() {
  detenerReproduccion(false);
  const { tipo, lista } = listaReproduccion();
  let k = 0;
  const paso = () => {
    if (tipo === "rdia") estado.diaRiesgo = lista[k];
    else if (tipo === "hora") estado.paso3h = lista[k];
    else estado.diaReproduciendo = lista[k];
    actualizarTodo({ ligero: true, cuadro: true });
    actualizarEvolucion();
    if (++k >= lista.length) detenerReproduccion(true);
  };
  estado.reproduciendo = setInterval(paso, tipo === "rdia" ? 900 : 1100);
  paso();
}
function detenerReproduccion(repintar = true) {
  if (estado.reproduciendo == null && estado.diaRiesgo == null && estado.diaReproduciendo == null) return;
  clearInterval(estado.reproduciendo);
  estado.reproduciendo = null;
  const habia = estado.diaRiesgo != null || estado.diaReproduciendo != null;
  estado.diaRiesgo = null; estado.diaReproduciendo = null;
  if (repintar) actualizarTodo();
  else if (habia) pintarLineaTiempo();
}

function elegirModo(modo) {
  setTimeout(pintarCapasExtra);   // Alertas del SMN solo en condiciones actuales
  detenerReproduccion(false);
  estado.modo = modo;
  if (modo === "actual") estado.paso3h = null;
  actualizarTodo();
}

// ---------- Capas: una grande y las otras en miniatura ----------
async function elegirCapa(capa) {
  detenerReproduccion(false);
  if (capa !== "riesgo" && !estado.tiempo) {
    try { await cargarTiempo(); } catch (e) { mostrarAviso(t("sin_tiempo")); return; }
  }
  estado.capa = capa;
  actualizarTodo();
}

function pintarMinis() {
  const cont = document.getElementById("miniaturas");
  const otras = CAPAS.filter((c) => c !== estado.capa && (c === "riesgo" || estado.tiempo));
  const titular = (c) => {
    if (c === "riesgo") {
      const v = valoresRiesgoVista(), altos = [...v.values()].filter((x) => x >= CORTES[2]).length;
      return { v: fmt(altos), u: t("mini_riesgo_u"), p: "" };
    }
    const ex = extremoMunicipal(c), m = ex && estado.porCmu.get(ex.cmu);
    return { v: ex ? textoValor(c, ex.v) : "–", u: c === "temp" ? "" : c === "lluvia" ? "mm" : "km/h",
      p: m ? `${t("max_en")} ${m.nam} · ${m.jur}` : "" };
  };
  cont.innerHTML = `<p class="minis-titulo">${icono("capas")}${t("otras_capas")}</p>` + otras.map((c) => {
    const h = titular(c);
    return `<button type="button" class="mini" data-capa="${c}" aria-label="${t("ver_grande")(t(`capa_${c}`))}">
      <span class="mini-cab">${icono(c)}<span>${t(`capa_${c}`)}</span><span class="mini-ampliar">${icono("ampliar")}</span></span>
      <canvas class="mini-mapa" aria-hidden="true"></canvas>
      <span class="mini-pie"><span><b>${h.v}</b>${h.u ? ` ${h.u}` : ""}</span><small>${escapar(h.p)}</small>${h.periodo ? `<small class="mini-periodo">${escapar(h.periodo)}</small>` : ""}</span></button>`;
  }).join("");
  cont.querySelectorAll(".mini").forEach((b) => {
    b.onclick = () => elegirCapa(b.dataset.capa);
    requestAnimationFrame(() => pintarMini(b.querySelector("canvas"), b.dataset.capa));
  });
}
const pintarMinisDemorado = demorar(pintarMinis, 180);

// ---------- Leyenda y título del mapa ----------
function pintarLeyenda() {
  const cont = document.getElementById("leyenda"), capa = estado.capa;
  // Claves de las capas opcionales prendidas (las que tienen colores propios)
  const claves = [
    estado.verInundadas && `<span><i style="background:linear-gradient(90deg,#f3a6b5,#5a7bd8)"></i>${t("ley_inundadas")}</span>`,
    estado.verDensidad && `<span><i style="background:linear-gradient(90deg,rgba(59,51,102,.15),rgba(59,51,102,.75))"></i>${t("ley_densidad")}</span>`,
    estado.verBarrios && `<span><i style="background:rgba(122,61,143,.45);border:1px solid #5b2a6f"></i>${t("capa_barrios")}</span>`,
    estado.verSuelo && `<span><i style="background:rgba(92,99,112,.5)"></i>${t("ley_urbano")} <i style="background:rgba(58,154,91,.5)"></i>${t("ley_verde")}</span>`,
    estado.verInfra && `<span>${Object.entries(GRUPOS_INFRA).map(([g, c]) => `<i class="pt" style="background:${c}"></i>${t(`infra_${g}`)}`).join(" ")}</span>`,
  ].filter(Boolean).join("");
  const interruptores = claves ? `<p class="ley-claves">${claves}</p>` : "";
  let cuerpo;
  if (capa === "riesgo") {
    // Como la lámina aprobada: una fila por nivel con su rango, y las estaciones de río por estado
    const fila = (muestra, nombre, dato) => `<div>${muestra}<span>${nombre}</span><b>${dato}</b></div>`;
    cuerpo = `<div class="ley-lista">${[1, 2, 3, 4, 5].map((n) => fila(`<i style="background:var(--r${n})"></i>`, t("niveles")[n - 1], ["0 – 3", "3 – 4,5", "4,5 – 6", "6 – 7", "7 – 10"][n - 1])).join("")}</div>
      ${estado.verHidro ? `<div class="ley-lista">${vistaHoy()
        ? fila('<i class="pto" style="background:var(--critico)"></i>', t("ley_rio_ev"), "") + fila('<i class="pto" style="background:var(--serio)"></i>', t("ley_rio_al"), "") + fila('<i class="pto" style="background:var(--rio-normal)"></i>', t("ley_rio_no"), "")
        : fila('<i class="pto" style="background:var(--critico)"></i>', t("ley_rio_ev_pron"), "") + fila('<i class="pto" style="background:var(--serio)"></i>', t("ley_rio_al_pron"), "") + fila('<i class="pto" style="background:var(--rio-normal)"></i>', t("ley_rio_no_pron"), "")}</div>` : ""}
      <div class="ley-km" id="ley-km"><i></i><span></span></div>`;
  } else if (estado.campo) {
    const c = estado.campo, esc = c.escala, n = esc.length;
    const pasos = esc.map(([v, col], i) => `<span style="background:${rgba(col, 0.25)}"></span>`).join("");
    cuerpo = `<p class="ley-titulo">${escapar(c.titulo)}</p>
      <div class="ley-escala${c.escalonada ? " escalonada" : ""}" style="--n:${n}">${c.escalonada ? pasos
        : `<span style="flex:1;background:linear-gradient(90deg, ${esc.map(([, col], i) => `${rgba(col, 0.3)} ${(100 * i) / (n - 1)}%`).join(",")})"></span>`}</div>
      <div class="ley-rotulos">${esc.map(([v]) => `<span>${fmt(v, v < 1 && v > 0 ? 1 : 0)}</span>`).join("")}</div>`;
  } else cuerpo = "";
  cont.classList.toggle("plegada", !!estado.leyendaPlegada);
  cont.innerHTML = `<button type="button" class="ley-plegar" aria-expanded="${!estado.leyendaPlegada}" aria-label="${t("ley_plegar")}" title="${t("ley_plegar")}">${icono(estado.leyendaPlegada ? "capas" : "cerrar")}</button>
    ${cuerpo}${interruptores}`;
  cont.querySelector(".ley-plegar").onclick = () => { estado.leyendaPlegada = !estado.leyendaPlegada; pintarLeyenda(); };
  // Título de cada mapa con la última actualización de sus datos
  const T = estado.tiempo;
  const gen = T?.generado ? new Date(T.generado.replace("Z", ":00Z")) : null;
  const gR = estado.riesgo.generado ? new Date(estado.riesgo.generado.replace("Z", ":00Z")) : null;
  const act = capa === "riesgo" ? (gR ? t("act_riesgo")(fmtDia(hoyDeFecha(gR)), gR.toLocaleTimeString(loc(), { hour: "2-digit", minute: "2-digit", timeZone: ZONA_HORARIA, hour12: false })) : t("sin_riesgo_diario"))
    : gen ? t("act_tiempo")(fmtDia(hoyDeFecha(gen)), gen.toLocaleTimeString(loc(), { hour: "2-digit", minute: "2-digit", timeZone: ZONA_HORARIA, hour12: false })) : "";
  document.getElementById("mapa-titulo").innerHTML = `${icono(capa)}<span><b>${t(`capa_${capa}_larga`)}</b><small>${escapar(act)}</small></span>`;
}

// ---------- Panel de capas (fuera del mapa, sirve para las cuatro vistas) ----------
// Dos grupos: el mapa de fondo se elige de a uno (riesgo, lluvia, viento o temperatura: colores que no se pueden superponer) y las
// capas adicionales se pueden sumar de a varias. Referencias y líneas de relieve quedan aparte, en la fila chica de opciones.
const OPCIONES_MAPA = [["verReferencias", "capa_ref"], ["relieve", "capa_relieve"]];
const CAPAS_SUMAR = [
  ["verHidro", "capa_hidro"], ["verAlertas", "capa_alertas"], ["verInundHoy", "capa_inund_hoy"], ["verInundadas", "capa_inundadas"], ["verDensidad", "capa_densidad"],
  ["verBarrios", "capa_barrios"], ["verSuelo", "capa_suelo"], ["verInfra", "capa_infra"], ["verRutas", "capa_rutas"],
];
function pintarCapasExtra() {
  const sinTeselas = new Set(SIN_TESELAS ? ["relieve", "verSuelo", "verRutas", "verInundadas", "verInundHoy"] : []);
  const botones = (lista) => lista.filter(([k]) => !sinTeselas.has(k)).map(([k, txt]) => {
    const apagada = k === "verAlertas" && estado.capa !== "riesgo" && estado.modo !== "actual";
    return `<button type="button" class="capa-chip" data-k="${k}" aria-pressed="${!!estado[k] && !apagada}"${apagada ? " disabled" : ""}
      data-ayuda="${escapar(t(`${txt}_ayuda`))}">${t(txt)}</button>`;
  }).join("");
  const a = document.getElementById("capas-extra"), b = document.getElementById("capas-sumar");
  if (a) a.innerHTML = `<span class="capas-extra-tit">${t("capas_tit")}</span>${botones(OPCIONES_MAPA)}`;
  if (b) b.innerHTML = botones(CAPAS_SUMAR);
  document.querySelectorAll("#capas-extra [data-k], #capas-sumar [data-k]").forEach((x) => {
    x.onclick = () => {
      const k = x.dataset.k;
      if (k === "relieve") return alternarRelieve();
      estado[k] = !estado[k];
      aplicarCapaEnMapa(); pintarLeyenda(); pintarCapasExtra();
      // Con una capa de superficie encendida el riesgo se atenúa para que se lea
      if (["verInundadas", "verDensidad", "verSuelo"].includes(k)) for (const id of ["riesgo-mun", "riesgo-radio"]) mapa.setPaintProperty(id, "fill-opacity", opacidadRiesgo(OPAC_RELLENO));
    };
  });
}

// ---------- Selección ----------
function seleccionar(sel, { volar = false } = {}) {
  estado.sel = sel;
  aplicarSeleccionEnMapa();
  aplicarCapaEnMapa();
  actualizarBorrar();
  pintarKpis(); pintarGraficosHeader(); pintarTablero(); pintarAnalisis(); pintarLeyenda();
  if (volar && sel?.tipo === "zona") volarAZona(sel.lugar);
  if (volar && sel?.tipo === "punto") volarAPunto(sel.punto, sel.km);
  if (!sel && volar !== false) mapa.flyTo({ ...vistaPais(), duration: movimientoReducido() ? 0 : 1400 });
}
function seleccionarZona(lugar, opciones = {}) { seleccionar({ tipo: "zona", lugar }, opciones); }
function municipioEn(punto) {
  estado.cajasMuni ??= estado.datos.municipios.features.map((f) => [f, cajaDe(f.geometry)]);
  return estado.cajasMuni.find(([f, c]) => punto[0] >= c[0] && punto[0] <= c[2] && punto[1] >= c[1] && punto[1] <= c[3] && contiene(f.geometry, punto))?.[0];
}
function seleccionarPunto(punto, { nombre = null, origen = "mapa", volar = false } = {}) {
  const muni = municipioEn(punto);
  if (origen !== "direccion") {
    if (muni) completarCamposDesdePunto(muni.properties.cmu);
    document.getElementById("b-direccion").value = "";
  }
  seleccionar({ tipo: "punto", punto, km: estado.km, cmu: muni?.properties.cmu ?? null,
    nombre: nombre ?? (muni ? t("punto_en")(muni.properties.nam) : t("punto_en_mapa")) }, { volar });
  if (esMovil() && origen !== "mapa") document.getElementById("tablero").scrollIntoView({ behavior: "smooth", block: "start" });
}
function cambiarRadioBarra() { document.getElementById("b-radio").value = String(estado.km); document.getElementById("b-radio-v").textContent = `${fmt(estado.km, estado.km % 1 ? 1 : 0)} km`; }
function cambiarRadio(km) {
  estado.km = km;
  const barra = document.getElementById("b-radio");
  barra.value = String(km);
  document.getElementById("b-radio-v").textContent = `${fmt(km, km % 1 ? 1 : 0)} km`;
  if (estado.sel?.tipo === "punto") {
    estado.sel = { ...estado.sel, km };
    aplicarSeleccionEnMapa();
    pintarTablero(); pintarKpis(); pintarGraficosHeader();   // la lectura de arriba sigue al círculo nuevo
    volarAPunto(estado.sel.punto, km);
  }
}

// ---------- Repintado ----------
function actualizarTodo({ ligero = false, cuadro = false } = {}) {
  pintarControles();
  pintarLineaTiempo();
  aplicarCapaEnMapa();
  pintarLeyenda();
  if (cuadro) { pintarKpis(); return; }   // durante la reproducción: mapa, línea y números grandes
  pintarKpis();
  pintarGraficosHeader();
  pintarMinisDemorado();
  pintarTablero();
  if (typeof mapa !== "undefined" && mapa.getSource?.("reticula")) { actualizarReticula(); dibujarDetalle(); }
  if (!ligero || estado.capa !== "riesgo") pintarAnalisis(); else pintarAnalisisDemorado();
}
const pintarAnalisisDemorado = demorar(() => pintarAnalisis(), 250);

function mostrarAviso(txt) {
  const a = document.getElementById("aviso-busqueda");
  a.textContent = txt; a.hidden = false;
}

// Vista inicial del país (el recorrido guiado está en guia.js)
const VISTA_PAIS = { center: [-63.6, -38.6], zoom: 3.55, pitch: 0, bearing: 0 };
// El país entero a la izquierda del cuadro de referencias (que no tape la mitad del país) y sin tapar los botones de zoom
function vistaPais() {
  const refs = document.getElementById("refs"), marco = document.querySelector(".mapa-marco");
  const der = refs && marco && !refs.hidden ? marco.getBoundingClientRect().right - refs.getBoundingClientRect().left + 16 : 40;
  const c = mapa.cameraForBounds([[-73.6, -55.2], [-53.5, -21.7]], { padding: { top: 70, bottom: 24, left: 70, right: Math.max(40, der) } });
  return c ? { center: c.center, zoom: c.zoom, pitch: 0, bearing: 0 } : VISTA_PAIS;
}

// ---------- Idioma y tema ----------
function aplicarIdioma() {
  setTimeout(pintarCapasExtra);
  document.documentElement.lang = estado.idioma;
  document.querySelectorAll("[data-i18n]").forEach((el) => { const v = t(el.dataset.i18n); if (typeof v === "string") el.innerHTML = v; });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  document.querySelectorAll("[data-i18n-ayuda]").forEach((el) => { el.dataset.ayuda = t(el.dataset.i18nAyuda); el.setAttribute("aria-description", t(el.dataset.i18nAyuda)); });
  document.getElementById("btn-idioma").innerHTML = estado.idioma === "es" ? "<b>ES</b><span>EN</span>" : "<span>ES</span><b>EN</b>";
  document.title = t("titulo");
  pintarIntro();
  refrescarLaminas();
  if (guia) recorrido(guia.i);   // el recorrido y las fuentes abiertos cambian de idioma
  if (document.getElementById("fuentes")?.open) abrirFuentes();
  if (estado.riesgo) actualizarTodo();
}
function cambiarTema() {
  document.documentElement.dataset.theme = temaOscuro() ? "light" : "dark";
  try { localStorage.setItem("tema", document.documentElement.dataset.theme); } catch (e) { /* sin almacenamiento */ }
  const vista = { center: mapa.getCenter(), zoom: mapa.getZoom(), pitch: mapa.getPitch(), bearing: mapa.getBearing() };
  estado.lienzo = null;
  mapa.setStyle(estiloBase());
  mapa.once("style.load", () => { agregarCapas(); mapa.jumpTo(vista); });
  actualizarTodo();
}
function alternar3d() {
  estado.relieve3d = !estado.relieve3d;
  pintarCapasExtra();
  if (!SIN_TESELAS && mapa.getSource("relieve")) {
    terrenoMapa();
    mapa.setLayoutProperty("sombreado", "visibility", estado.relieve3d ? "visible" : "none");
  }
  mapa.easeTo({ pitch: estado.relieve3d ? 55 : 0, bearing: estado.relieve3d ? -12 : 0, duration: 900 });
}

// Riesgo de hoy y de los próximos 14 días (modelos/riesgo_diario.py) sobre los rasgos fijos de cada municipio del índice
// (riesgo.json: exposición, vulnerabilidad y centro). Si el archivo del día falta, todo queda sin amenaza (nunca el índice mensual).
// Por día: nivel de amenaza 0-3 (n) y el de cada fuente (lluvia, río, alerta del SMN), su probabilidad y el riesgo de 0 a 10. La
// amenaza de cada día combina la pronosticada con la fija del lugar (hf, con lluvia normal): un lugar que junta agua nunca da 0.
// pr: propensión del lugar a juntar agua (0 a 10), el subindicador con su propio semáforo.
function armarRiesgo(fijo, diario) {
  const todos = diario?.dias ?? [hoyLocal()], k0 = Math.max(0, todos.indexOf(hoyLocal())), dias = todos.slice(k0), nD = dias.length;
  const H = diario?.h_nivel ?? [0, 4, 7, 10], digitos = (x) => (x ? [...x.slice(k0)].map(Number) : Array(nD).fill(0));
  const cmu = {};
  for (const [c, f] of Object.entries(fijo?.cmu ?? {})) {
    const d = diario?.cmu?.[c], n = digitos(d?.n);
    const hf = d?.hf ?? 0;
    cmu[c] = { c: f.c, E: f.E, V: f.V, sr: f.sr, rob: f.rob, n, lluvia: digitos(d?.l), rio: digitos(d?.q), alerta: digitos(d?.a), hf, pr: d?.pr ?? null,
      prob: (d?.p ?? []).slice(k0), r: d?.r ? d.r.slice(k0) : n.map(() => 0), h: n.map((v) => 10 - ((10 - hf) * (10 - H[v])) / 10), p: Array(nD).fill(0) };
  }
  const est = Object.fromEntries(Object.entries(diario?.est ?? {}).map(([e, v]) => [e, { n: digitos(v.n), p: (v.p ?? []).slice(k0), h: (v.h ?? []).slice(k0) }]));
  return { dias, cmu, H, est, generado: diario?.generado ?? null, fuentes: diario?.fuentes ?? {} };
}

const hoyDeFecha = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

// ---------- Inicio ----------
async function iniciar() {
  // Arranca siempre en claro (como el diseño); el oscuro queda a un toque y se recuerda si la persona lo elige
  let tm = null;
  try { tm = localStorage.getItem("tema"); } catch (e) { /* sin almacenamiento */ }
  document.documentElement.dataset.theme = tm || "light";
  const q = new URLSearchParams(location.search);
  if (q.get("tema")) document.documentElement.dataset.theme = q.get("tema") === "oscuro" || q.get("tema") === "dark" ? "dark" : "light";
  if (q.get("lang") === "en") estado.idioma = "en";
  const archivos = ["resumen.json", "municipios_geo.geojson", "riesgo.json", "riesgo_diario.json", "estaciones.geojson", "radios/indice.json",
    "provincias_geo.geojson", "bordes_geo.geojson", "buscador.json", "alertas.geojson"];
  const [resumen, municipios, fijo, diario, estaciones, cajas, provincias, bordes, buscador, alertas] = await Promise.all(archivos.map((f) =>
    fetch(`datos/${f}`, { cache: "no-cache" }).then((r) => r.json()).catch(() => (f === "alertas.geojson" ? { type: "FeatureCollection", features: [] } : null))));
  const riesgo = armarRiesgo(fijo, diario);
  unirRiesgo(municipios, riesgo);
  unirEstaciones(estaciones, riesgo);
  unirBordes(bordes, riesgo);
  estado.riesgo = riesgo;
  estado.datos = { resumen, municipios, estaciones, cajas, provincias, bordes, buscador, alertas };
  try { await cargarTiempo(); } catch (e) { estado.tiempo = null; }
  // Períodos por defecto: el riesgo de hoy y, en el tiempo, la semana que viene
  estado.rangoRiesgo = [0, 0];
  if (estado.tiempo) { const h = diaHoy(); estado.rangoDias = [h, Math.min(estado.tiempo.dias.length - 1, h + 6)]; }
  prepararBuscador();

  const v = q.get("vista")?.split(",").map(Number);
  const vistaInicial = v?.length === 3 ? { center: [v[0], v[1]], zoom: v[2], pitch: 0, bearing: 0 } : VISTA_PAIS;
  mapa = new maplibregl.Map({ container: "mapa", style: estiloBase(), ...vistaInicial, maxPitch: 75, attributionControl: { compact: true } });
  mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-left");
  // Créditos del mapa (obligatorios por licencia) cerrados: se abren solo al tocar el ícono (i)
  const cerrarCreditos = () => document.querySelectorAll("#mapa .maplibregl-ctrl-attrib").forEach((e) => e.classList.remove("maplibregl-compact-show"));
  mapa.once("load", cerrarCreditos); mapa.once("idle", cerrarCreditos);
  if (!(v?.length === 3)) mapa.once("load", () => { if (!estado.sel) mapa.jumpTo(vistaPais()); });   // con el tamaño real del mapa y del cuadro de referencias
  mapa.on("style.load", () => { if (!mapa.getSource("municipios")) agregarCapas(); });

  document.querySelectorAll("#modo [data-modo]").forEach((b) => { b.onclick = () => elegirModo(b.dataset.modo); });
  document.querySelectorAll(".capas-tabs [data-capa]").forEach((b) => { b.onclick = () => elegirCapa(b.dataset.capa); });
  document.getElementById("btn-idioma").onclick = () => { estado.idioma = estado.idioma === "es" ? "en" : "es"; aplicarIdioma(); };
  document.getElementById("btn-tema").onclick = cambiarTema;
  iniciarGuia();
  const laminaDelEnlace = iniciarLaminas();
  pintarCapasExtra();
  document.getElementById("btn-sim-top").onclick = usarSimulador;
  // Capas adicionales y opciones del mapa en un panel desplegable sobre el mapa
  const btnCapas = document.getElementById("btn-capas"), panelCapas = document.getElementById("panel-capas");
  btnCapas.onclick = (ev) => { ev.stopPropagation(); panelCapas.hidden = !panelCapas.hidden; btnCapas.setAttribute("aria-expanded", String(!panelCapas.hidden)); };
  document.addEventListener("click", (ev) => { if (!panelCapas.hidden && !panelCapas.contains(ev.target) && ev.target !== btnCapas) { panelCapas.hidden = true; btnCapas.setAttribute("aria-expanded", "false"); } });
  if (SIN_TESELAS) { document.getElementById("enlace-completo").hidden = false; }
  addEventListener("resize", demorar(() => { pintarTablero(); pintarAnalisis(); pintarMinis(); }, 250));

  aplicarIdioma();
  // Links directos (versión completa): ?capa=lluvia&modo=futuro&punto=lon,lat&radio=5&lugar=…&partido=…&dir=…
  if (CAPAS.includes(q.get("capa"))) estado.capa = q.get("capa");
  if (q.get("modo") === "futuro") estado.modo = "futuro";
  if (q.get("dia")) estado.rangoRiesgo = [limitar(Number(q.get("dia")) || 0, 0, estado.riesgo.dias.length - 1), limitar(Number(q.get("dia")) || 0, 0, estado.riesgo.dias.length - 1)];
  if (q.get("radio")) estado.km = Number(q.get("radio")) || 2;
  cambiarRadioBarra();
  // Espera a que las capas del mapa existan (el evento "load" puede pasar antes de enganchar y en el celular tarda más)
  const alCargar = (fn) => {
    let t0 = performance.now();
    const probar = () => {
      if (mapa.getLayer("circulo-borde") || performance.now() - t0 > 20000) fn(); else setTimeout(probar, 150);
    };
    probar();
  };
  alCargar(() => {
    iniciarPlano();
    actualizarTodo();
    laminaDelEnlace();   // enlaces directos a una lámina: #lamina-2, #lamina-3
    const buscarL = (nombre, niveles) => estado.lugares.find((l) => niveles.includes(l.nivel) && l.clave === normalizar(nombre));
    const pt = q.get("punto")?.split(",").map(Number);
    if (pt?.length === 2) seleccionarPunto(pt, { volar: true });
    for (const [param, nivel, niveles] of [["prov", "provincia", ["prov"]], ["partido", "partido", ["depto"]], ["lugar", "localidad", ["gl", "loc"]]]) {
      const l = q.get(param) && buscarL(q.get(param), niveles);
      if (l) { estado.filtros[nivel] = l; document.getElementById(`b-${nivel}`).value = l.nombre; }
    }
    if (q.get("dir")) { document.getElementById("b-direccion").value = q.get("dir"); buscarDireccion(q.get("dir")); }
    else if (!pt) { const l = estado.filtros.localidad || estado.filtros.partido || estado.filtros.provincia; if (l) seleccionarZona(l, { volar: true }); }
  });
}

iniciar();

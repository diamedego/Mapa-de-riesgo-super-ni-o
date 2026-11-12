// Argentina frente a El Niño 2026-27: tablero de riesgo de inundación y del tiempo.
// Orquesta el estado, los indicadores, el modo (condiciones actuales o futuras), la línea de tiempo, las capas
// (una grande y las otras en miniatura), la selección y el arranque. Módulos: textos, utiles, graficos, tiempo,
// mapa, buscador y tableros.

const estado = {
  idioma: "es", capa: "riesgo", modo: "actual", sel: null, km: 2,
  iMesActual: 0, rangoMeses: [0, 0], rangoDias: [0, 6], paso3h: null,
  mesReproduciendo: null, diaReproduciendo: null, reproduciendo: null,
  verRios: true, verAlertas: true, verReferencias: true, verHidro: true, verInundadas: false, verDensidad: false,
  verBarrios: false, verSuelo: false, verInfra: false, verRutas: false, riesgo3d: false, relieve3d: false, relieve: false, ranking: "r",
  datos: {}, riesgo: null, porCmu: new Map(), radios: [], cargasRadios: new Map(), tiempo: null,
};
const t = (clave) => TEXTOS[estado.idioma][clave] ?? TEXTOS.es[clave] ?? clave;
const CAPAS = ["riesgo", "lluvia", "viento", "temp"];

// ---------- Indicadores grandes (franja superior) ----------
function alcanceKpis() {
  const s = estado.sel;
  if (s?.tipo === "zona") return { nombre: s.lugar.nombre, cmus: s.lugar.cmus.filter((c) => estado.riesgo.cmu[c]), caja: s.lugar.caja };
  if (s?.tipo === "punto" && s.cmu) { const m = estado.porCmu.get(s.cmu); return { nombre: m?.nam ?? "", cmus: [s.cmu], caja: cajaDe(estado.datos.municipios.features.find((f) => f.properties.cmu === s.cmu).geometry) }; }
  return { nombre: "Argentina", cmus: todosLosCmus(), caja: null };
}

function pintarKpis() {
  const A = alcanceKpis(), R = estado.riesgo, idx = indicesVista();
  const Z = analisisRiesgoZona(A.cmus);
  const rV = Math.max(...idx.map((i) => Z.riesgo[i]));
  const altos = A.cmus.filter((c) => Math.max(...idx.map((i) => R.cmu[c].r[i] ?? 0)) >= CORTES[2]);
  const pobAlto = sumar(altos.map((c) => Number(estado.porCmu.get(c)?.poblacion) || 0));
  const enCaja = (c) => !A.caja || (c[0] >= A.caja[0] - 0.1 && c[0] <= A.caja[2] + 0.1 && c[1] >= A.caja[1] - 0.1 && c[1] <= A.caja[3] + 0.1);
  const alertas = estado.datos.alertas.features.filter((f) => !A.caja || cajasSeTocan(cajaDe(f.geometry), A.caja)).map((f) => f.properties);
  const nivelAl = alertas.some((a) => a.nivel === "roja") ? "roja" : alertas.some((a) => a.nivel === "naranja") ? "naranja" : alertas.length ? "amarilla" : null;
  const ests = estado.datos.estaciones.features.filter((f) => f.properties.estado && enCaja(f.geometry.coordinates)).map((f) => f.properties);
  const evac = ests.filter((e) => e.estado === "evacuacion").length, alerta = ests.filter((e) => e.estado === "alerta").length;
  const kpis = [
    { k: "riesgo", ico: "riesgo", etq: t("kpi_riesgo"), valor: fmtRiesgo(rV), unidad: "/10", sub: `${nombreNivel(rV)} · ${textoPeriodoCorto()}`,
      sev: nivelRiesgo(rV) >= 4 ? "critico" : nivelRiesgo(rV) === 3 ? "atencion" : "ok", spark: spark(Z.riesgo, { color: "var(--cian-vivo)", marca: idx[idx.length - 1] }), ir: () => elegirCapa("riesgo") },
    { k: "personas", ico: "personas", etq: t("kpi_personas"), valor: fmtPersonas(pobAlto), sub: t("kpi_personas_sub")(fmt((100 * pobAlto) / (Z.poblacion || 1), 1)),
      sev: pobAlto > 0 ? "atencion" : "ok", ir: () => { elegirCapa("riesgo"); document.getElementById("analisis").scrollIntoView({ behavior: "smooth" }); } },
    { k: "municipios", ico: "municipio", etq: t("kpi_municipios"), valor: fmt(altos.length), unidad: ` / ${fmt(A.cmus.length)}`, sub: t("kpi_municipios_sub"),
      sev: altos.length ? "atencion" : "ok", ir: () => { elegirCapa("riesgo"); document.getElementById("analisis").scrollIntoView({ behavior: "smooth" }); } },
    { k: "alertas", ico: "alerta", etq: t("kpi_alertas"), valor: fmt(alertas.length), sub: alertas.length ? [...new Set(alertas.map((a) => t(`alerta_${a.tipo}`)))].slice(0, 2).join(" · ") : t("sin_alertas"),
      sev: nivelAl === "roja" || nivelAl === "naranja" ? "critico" : nivelAl ? "atencion" : "ok", nivelAl, ir: () => { estado.verAlertas = true; elegirModo("actual"); } },
    { k: "rios", ico: "rio", etq: t("kpi_rios"), valor: fmt(evac + alerta), unidad: ` / ${fmt(ests.length)}`, sub: t("kpi_rios_sub")(evac, alerta),
      sev: evac ? "critico" : alerta ? "atencion" : "ok", ir: () => { estado.verRios = true; elegirCapa("riesgo"); elegirModo("actual"); } },
  ];
  if (estado.tiempo) {
    const T = estado.tiempo, TM = tiempoMunicipios(), h0 = diaHoy(T), h6 = Math.min(T.dias.length - 1, h0 + 6), h2 = Math.min(T.dias.length - 1, h0 + 2);
    const ext = (fn) => { let m = null; for (const c of A.cmus) { const s = TM.get(c); if (!s) continue; const v = fn(s); if (v != null && (!m || v > m.v)) m = { v, c }; } return m; };
    const lluvia = ext((s) => sumar(s.lluvia.slice(h0, h6 + 1).filter((v) => v != null)));
    const raf = ext((s) => Math.max(...s.rafaga.slice(h0, h2 + 1).filter((v) => v != null)));
    const tmx = ext((s) => Math.max(...s.tmax.slice(h0, h6 + 1).filter((v) => v != null)));
    const lugar = (m) => (m ? `${estado.porCmu.get(m.c)?.nam ?? ""}${A.cmus.length > 1 ? ` · ${estado.porCmu.get(m.c)?.jur ?? ""}` : ""}` : "");
    const irA = (capa, m, dias) => () => { estado.modo = "futuro"; estado.rangoDias = [h0, dias]; elegirCapa(capa); if (m && A.cmus.length > 1) seleccionarPunto(estado.riesgo.cmu[m.c].c, { volar: true, origen: "kpi" }); };
    kpis.push(
      { k: "lluvia", ico: "lluvia", etq: t("kpi_lluvia"), valor: fmt(lluvia?.v), unidad: " mm", sub: lugar(lluvia), sev: lluvia?.v >= 100 ? "critico" : lluvia?.v >= 50 ? "atencion" : "ok", ir: irA("lluvia", lluvia, h6) },
      { k: "rafaga", ico: "viento", etq: t("kpi_rafaga"), valor: fmt(raf?.v), unidad: " km/h", sub: lugar(raf), sev: raf?.v >= 90 ? "critico" : raf?.v >= 60 ? "atencion" : "ok", ir: irA("viento", raf, h2) },
      { k: "temp", ico: "temp", etq: t("kpi_temp"), valor: fmt(tmx?.v), unidad: " °C", sub: lugar(tmx), sev: tmx?.v >= 38 ? "critico" : tmx?.v >= 34 ? "atencion" : "ok", ir: irA("temp", tmx, h6) },
    );
  }
  document.getElementById("kpis-alcance").textContent = t("kpis_de")(A.nombre);
  const cont = document.getElementById("kpis");
  cont.innerHTML = kpis.map((k, i) => `<button class="kpi" data-i="${i}" data-sev="${k.sev}"${k.nivelAl ? ` data-alerta="${k.nivelAl}"` : ""} type="button" data-ayuda="${escapar(t(`kpi_ayuda_${k.k}`))}">
      <span class="kpi-cab">${icono(k.ico)}<span>${k.etq}</span></span>
      <span class="kpi-valor">${k.valor}${k.unidad ? `<small>${k.unidad}</small>` : ""}</span>
      <span class="kpi-pie">${escapar(k.sub)}</span>${k.spark ?? ""}</button>`).join("");
  cont.querySelectorAll(".kpi").forEach((b) => { b.onclick = () => kpis[+b.dataset.i].ir(); });
}

// ---------- Modo, presets y línea de tiempo ----------
function presets() {
  const M = estado.riesgo.meses, i = estado.iMesActual, ult = M.length - 1;
  if (estado.capa === "riesgo") {
    if (estado.modo === "actual") return [];
    const pico = M.indexOf(estado.datos.resumen.mes_pico);
    return [
      { etq: t("pr_prox_mes"), r: [Math.min(i + 1, ult), Math.min(i + 1, ult)] },
      { etq: t("pr_3_meses"), r: [Math.min(i + 1, ult), Math.min(i + 3, ult)] },
      { etq: t("pr_temporada"), r: [Math.min(i + 1, ult), ult] },
      ...(pico > i ? [{ etq: t("pr_pico")(nombreMes(M[pico])), r: [pico, pico] }] : []),
    ].map((p) => ({ ...p, activo: p.r[0] === estado.rangoMeses[0] && p.r[1] === estado.rangoMeses[1], ir: () => { estado.rangoMeses = p.r; actualizarTodo(); } }));
  }
  const T = estado.tiempo;
  if (!T) return [];
  if (estado.modo === "actual") {
    const k0 = pasoAhora(T), u = T.horas.length - 1;
    return [[t("pr_ahora"), k0], [t("pr_6h"), Math.min(u, k0 + 2)], [t("pr_24h"), Math.min(u, k0 + 8)], [t("pr_48h"), u]]
      .map(([etq, k]) => ({ etq, activo: (estado.paso3h ?? k0) === k, ir: () => { estado.paso3h = k; actualizarTodo(); } }));
  }
  const h = diaHoy(T), u = T.dias.length - 1;
  return [[t("pr_hoy"), [h, h]], [t("pr_manana"), [Math.min(u, h + 1), Math.min(u, h + 1)]], [t("pr_3_dias"), [h, Math.min(u, h + 2)]],
    [t("pr_7_dias"), [h, Math.min(u, h + 6)]], [t("pr_16_dias"), [h, u]]]
    .map(([etq, r]) => ({ etq, r, activo: r[0] === estado.rangoDias[0] && r[1] === estado.rangoDias[1], ir: () => { estado.rangoDias = r; actualizarTodo(); } }));
}

// Fila de condiciones: en "futuras", dos casilleros (meses para el riesgo, días para lluvia, viento y temperatura) limitados
// al horizonte del pronóstico, y el texto "16/11/2026 – Dentro de 7 días" (el período se muestra solo acá)
function pintarControles() {
  document.querySelectorAll("#modo [data-modo]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.modo === estado.modo)));
  document.querySelectorAll(".capas-tabs [data-capa]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.capa === estado.capa)));
  const caja = document.getElementById("periodo-futuro"), de = document.getElementById("f-desde"), ha = document.getElementById("f-hasta");
  const futuro = estado.modo === "futuro", T = estado.tiempo, M = estado.riesgo.meses;
  caja.hidden = !futuro;
  if (futuro) {
    if (estado.capa === "riesgo") {
      for (const x of [de, ha]) { x.type = "month"; x.min = M[Math.min(estado.iMesActual + 1, M.length - 1)]; x.max = M[M.length - 1]; }
      de.value = M[estado.rangoMeses[0]]; ha.value = M[estado.rangoMeses[1]];
      caja.dataset.ayuda = t("limite_meses")(capitalizar(nombreMes(M[M.length - 1], true)));
      de.onchange = ha.onchange = () => {
        let a = M.indexOf(de.value), b = M.indexOf(ha.value);
        if (a < 0) a = estado.rangoMeses[0]; if (b < 0) b = estado.rangoMeses[1]; if (b < a) b = a;
        detenerReproduccion(false); estado.rangoMeses = [a, b]; actualizarTodo();
      };
    } else if (T) {
      const h = diaHoy(T);
      for (const x of [de, ha]) { x.type = "date"; x.min = T.dias[h]; x.max = T.dias[T.dias.length - 1]; }
      de.value = T.dias[estado.rangoDias[0]]; ha.value = T.dias[estado.rangoDias[1]];
      caja.dataset.ayuda = t("limite_dias")(fechaCorta(T.dias[T.dias.length - 1]));
      de.onchange = ha.onchange = () => {
        let a = T.dias.indexOf(de.value), b = T.dias.indexOf(ha.value);
        if (a < 0) a = estado.rangoDias[0]; if (b < 0) b = estado.rangoDias[1]; if (b < a) b = a;
        detenerReproduccion(false); estado.rangoDias = [a, b]; actualizarTodo();
      };
    }
  }
  document.getElementById("periodo-texto").textContent = textoPeriodoFila();
  actualizarBorrar();
}
const fechaCorta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
function diasDesdeHoy(iso) { const hoy = hoyLocal(); return Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${hoy}T12:00:00Z`)) / 86400e3); }
function textoPeriodoFila() {
  const T = estado.tiempo, M = estado.riesgo.meses;
  if (estado.modo === "actual") return t("hoy_fecha")(fechaCorta(hoyLocal()));
  if (estado.capa === "riesgo") {
    const [a, b] = estado.rangoMeses, n = (k) => k - estado.iMesActual;
    return a === b ? t("mes_dentro")(capitalizar(nombreMes(M[a], true)), n(a)) : t("meses_dentro")(capitalizar(nombreMes(M[a], true)), nombreMes(M[b], true), n(a), n(b));
  }
  if (!T) return "";
  const [a, b] = estado.rangoDias, da = diasDesdeHoy(T.dias[a]), db = diasDesdeHoy(T.dias[b]);
  if (a !== b && da <= 0) return t("dias_desde_hoy")(fechaCorta(T.dias[a]).slice(0, 5), fechaCorta(T.dias[b]), db);
  return a === b ? t("dia_dentro")(fechaCorta(T.dias[a]), da) : t("dias_dentro")(fechaCorta(T.dias[a]).slice(0, 5), fechaCorta(T.dias[b]), da, db);
}

// La línea de tiempo vive abajo del mapa: meses (riesgo), pasos de 3 h (tiempo, actual) o días (tiempo, futuro)
function itemsLinea() {
  const M = estado.riesgo.meses, T = estado.tiempo;
  if (estado.capa === "riesgo") return { tipo: "mes", items: M.map((m, i) => ({ etq: nombreMes(m), sub: i === estado.iMesActual ? t("ahora") : "", pasado: i < estado.iMesActual })) };
  if (!T) return { tipo: "nada", items: [] };
  if (estado.modo === "actual") {
    const k0 = pasoAhora(T);
    return { tipo: "hora", items: T.horas.map((h, k) => ({ etq: fmtHora(h), sub: k === k0 ? t("ahora") : h.endsWith("T00:00") || k === 0 ? fmtDia(h.slice(0, 10), { weekday: "short" }) : "", pasado: k < k0 })) };
  }
  const h = diaHoy(T);
  return { tipo: "dia", items: T.dias.map((d, i) => ({ etq: fmtDia(d, { day: "numeric" }), sub: fmtDia(d, { weekday: "narrow" }), pasado: i < h })) };
}
function seleccionLinea(tipo) {
  if (tipo === "mes") return estado.mesReproduciendo != null ? [estado.mesReproduciendo, estado.mesReproduciendo]
    : estado.modo === "actual" ? [estado.iMesActual, estado.iMesActual] : estado.rangoMeses;
  if (tipo === "hora") { const k = estado.paso3h ?? pasoAhora(estado.tiempo); return [k, k]; }
  return estado.diaReproduciendo != null ? [estado.diaReproduciendo, estado.diaReproduciendo] : estado.rangoDias;
}

function pintarLineaTiempo() { const c = document.getElementById("linea-tiempo"); if (c) c.hidden = true; }   // ahora vive en el panel izquierdo

// Índices que recorre ▶: meses (riesgo), pasos de 3 h (tiempo, condiciones actuales) o días (tiempo, futuras)
function listaReproduccion() {
  const { tipo } = itemsLinea(), T = estado.tiempo;
  if (tipo === "mes") {
    const [a, b] = estado.modo === "actual" ? [estado.iMesActual, estado.riesgo.meses.length - 1] : estado.rangoMeses;
    return { tipo, lista: Array.from({ length: b - a + 1 }, (_, k) => a + k) };
  }
  if (tipo === "hora") return { tipo, lista: Array.from({ length: T.horas.length - pasoAhora(T) }, (_, k) => pasoAhora(T) + k) };
  if (tipo === "dia") {
    const [a, b] = estado.rangoDias[0] === estado.rangoDias[1] ? [diaHoy(T), T.dias.length - 1] : estado.rangoDias;
    return { tipo, lista: Array.from({ length: b - a + 1 }, (_, k) => a + k) };
  }
  return { tipo, lista: [] };
}
// Refresca solo el bloque de la línea de tiempo (mientras corre ▶, sin redibujar todo el panel)
function actualizarEvolucion() {
  const viejo = document.querySelector("#tablero .tb-evol");
  if (!viejo) return;
  const tmp = document.createElement("div"); tmp.innerHTML = bloqueEvolucion();
  const nuevo = tmp.firstElementChild;
  if (!nuevo) return;
  viejo.replaceWith(nuevo);
  nuevo.querySelector('[data-accion="evol"]').onclick = () => (estado.reproduciendo != null ? detenerReproduccion() : reproducir());
}
// Bloque del panel izquierdo: ▶ y una línea con hitos que se va llenando mientras avanza
function bloqueEvolucion() {
  const { tipo, lista } = listaReproduccion();
  if (!lista.length || lista.length < 2) return "";
  const T = estado.tiempo, M = estado.riesgo.meses, jugando = estado.reproduciendo != null;
  const actual = tipo === "mes" ? estado.mesReproduciendo : tipo === "dia" ? estado.diaReproduciendo : jugando ? estado.paso3h : null;
  const pos = actual == null ? -1 : lista.indexOf(actual), pct = pos < 0 ? 0 : (100 * pos) / (lista.length - 1);
  const etq = (k) => (tipo === "mes" ? capitalizar(nombreMes(M[k])) : tipo === "dia" ? fechaCorta(T.dias[k]).slice(0, 5) : fmtHora(T.horas[k]));
  const n1 = lista.length - 1, pos100 = (j) => (100 * j) / n1;
  // Semanas en el eje: en los días, un hito por lunes (la fecha y «sem»); en los meses, hitos por mes y una marca chica en cada lunes
  let hitos, semanas = [];
  if (tipo === "dia") {
    const lunes = lista.map((k, j) => ({ j, k })).filter(({ k }) => new Date(`${T.dias[k]}T12:00:00Z`).getUTCDay() === 1);
    hitos = [{ j: 0, k: lista[0] }, ...lunes.filter(({ j }) => j > 0), { j: n1, k: lista[n1] }].filter((h, i, a) => a.findIndex((x) => x.j === h.j) === i)
      .filter((h, i, a) => i === 0 || (h.j - a[i - 1].j) / n1 > 0.16 || h.j === n1 && (h.j - a[i - 1].j) / n1 > 0.16);
    semanas = lunes.map(({ j }) => pos100(j));
  } else {
    const cada = Math.max(1, Math.ceil(lista.length / 5));
    hitos = lista.map((k, j) => ({ j, k })).filter(({ j }) => j === 0 || j === n1 || j % cada === 0 && n1 - j > cada / 2);
    if (tipo === "mes") {
      const ini = M[lista[0]], fin = M[lista[n1]], d0 = new Date(`${ini}-01T12:00:00Z`), d1 = new Date(`${fin}-01T12:00:00Z`);
      d1.setUTCMonth(d1.getUTCMonth() + 1);
      for (let d = new Date(d0); d < d1; d.setUTCDate(d.getUTCDate() + 1)) {
        if (d.getUTCDay() !== 1) continue;
        const mi = (d.getUTCFullYear() - d0.getUTCFullYear()) * 12 + d.getUTCMonth() - d0.getUTCMonth();
        const dias = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(), j = mi + (d.getUTCDate() - 1) / dias;
        if (j > 0 && j < n1) semanas.push(pos100(j));
      }
    }
  }
  const hitoEtq = (k) => (tipo === "dia" ? `${t("sem")} ${etq(k)}` : etq(k));
  const ahora = pos >= 0 ? `<span class="tb-evol-ahora">${escapar(etq(lista[pos]))}</span>` : "";
  return `<div class="tb-evol"><button type="button" class="lt-play" data-accion="evol" aria-label="${jugando ? t("pausar") : t("reproducir")}">${icono(jugando ? "pausa" : "play")}</button>
    <div class="tb-evol-cuerpo"><div class="tb-evol-cab"><span>${t("evolucion")}</span>${ahora}</div>
      <div class="tb-evol-pista"><span class="tb-evol-relleno" style="width:${pct}%"></span>
        ${semanas.map((x) => `<span class="tb-evol-sem${x <= pct ? " ok" : ""}" style="left:${x}%"></span>`).join("")}
        ${hitos.map(({ j, k }) => `<span class="tb-evol-hito${j <= pos ? " ok" : ""}" style="left:${pos100(j)}%"><i></i><small>${escapar(hitoEtq(k))}</small></span>`).join("")}</div>
      <p class="tb-evol-nota">${t(tipo === "dia" ? "evol_nota_dia" : tipo === "mes" ? "evol_nota_mes" : "evol_nota_hora")}</p></div></div>`;
}

function elegirEnLinea(tipo, a, b, extender = false) {
  if (tipo === "mes") {
    if (a < estado.iMesActual) return;
    if (estado.modo === "actual" && a === estado.iMesActual && b === a) return;
    estado.modo = "futuro";
    estado.rangoMeses = extender ? [Math.min(estado.rangoMeses[0], a), Math.max(estado.rangoMeses[1], b)] : [a, b];
  } else if (tipo === "hora") estado.paso3h = a;
  else estado.rangoDias = extender ? [Math.min(estado.rangoDias[0], a), Math.max(estado.rangoDias[1], b)] : [a, b];
  actualizarTodo({ ligero: true });
}

// Reproducción: avanza mes a mes, de a 3 h o día a día y se detiene al final
function reproducir() {
  detenerReproduccion(false);
  const { tipo, lista } = listaReproduccion();
  let k = 0;
  const paso = () => {
    if (tipo === "mes") estado.mesReproduciendo = lista[k];
    else if (tipo === "hora") estado.paso3h = lista[k];
    else estado.diaReproduciendo = lista[k];
    actualizarTodo({ ligero: true, cuadro: true });
    actualizarEvolucion();
    if (++k >= lista.length) { detenerReproduccion(true); }
  };
  estado.reproduciendo = setInterval(paso, tipo === "mes" ? 1700 : 1100);
  paso();
}
function detenerReproduccion(repintar = true) {
  if (estado.reproduciendo == null && estado.mesReproduciendo == null && estado.diaReproduciendo == null) return;
  clearInterval(estado.reproduciendo);
  estado.reproduciendo = null;
  const habia = estado.mesReproduciendo != null || estado.diaReproduciendo != null;
  estado.mesReproduciendo = null; estado.diaReproduciendo = null;
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
    cuerpo = `<p class="ley-titulo">${t("ley_riesgo")}</p>
      <div class="ley-niveles">${[1, 2, 3, 4, 5].map((n) => `<span class="ley-nivel"><i style="background:var(--r${n})"></i><b>${t("niveles")[n - 1]}</b><small>${["< 3", "3–4,5", "4,5–6", "6–7", "≥ 7"][n - 1]}</small></span>`).join("")}
        <span class="ley-nivel"><i class="ley-sin-dato"></i><b>${t("sin_dato")}</b><small>&nbsp;</small></span></div>
      ${estado.verHidro ? `<p class="ley-rios">${estado.modo === "actual"
        ? `<i class="pt" style="background:var(--critico)"></i>${t("rio_evacuacion")} <i class="pt" style="background:var(--serio)"></i>${t("rio_alerta")} <i class="pt" style="background:var(--rio-normal)"></i>${t("rio_normal")}`
        : `<i class="pt" style="background:var(--serio)"></i>${t("ley_rios_prob")}`}</p>` : ""}`;
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
  const T = estado.tiempo, r = estado.datos.resumen;
  const gen = T?.generado ? new Date(T.generado.replace("Z", ":00Z")) : null;
  const act = capa === "riesgo" ? t("act_riesgo")(fmtDia(r?.calculado))
    : gen ? t("act_tiempo")(fmtDia(hoyDeFecha(gen)), gen.toLocaleTimeString(loc(), { hour: "2-digit", minute: "2-digit", timeZone: ZONA_HORARIA, hour12: false })) : "";
  document.getElementById("mapa-titulo").innerHTML = `${icono(capa)}<span><b>${t(`capa_${capa}_larga`)}</b><small>${escapar(act)}</small></span>`;
}

// ---------- Panel de capas (fuera del mapa, sirve para las cuatro vistas) ----------
// Dos grupos: el mapa de fondo se elige de a uno (riesgo, lluvia, viento o temperatura: colores que no se pueden superponer) y las
// capas adicionales se pueden sumar de a varias. Referencias y líneas de relieve quedan aparte, en la fila chica de opciones.
const OPCIONES_MAPA = [["verReferencias", "capa_ref"], ["relieve", "capa_relieve"]];
const CAPAS_SUMAR = [
  ["verHidro", "capa_hidro"], ["verAlertas", "capa_alertas"], ["verInundadas", "capa_inundadas"], ["verDensidad", "capa_densidad"],
  ["verBarrios", "capa_barrios"], ["verSuelo", "capa_suelo"], ["verInfra", "capa_infra"], ["verRutas", "capa_rutas"],
];
function pintarCapasExtra() {
  const sinTeselas = new Set(SIN_TESELAS ? ["relieve", "verSuelo", "verRutas", "verInundadas"] : []);
  const botones = (lista) => lista.filter(([k]) => !sinTeselas.has(k)).map(([k, txt]) => {
    const apagada = k === "verAlertas" && estado.modo !== "actual";
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
  if (!sel && volar !== false) mapa.flyTo({ ...VISTA_PAIS, duration: movimientoReducido() ? 0 : 1400 });
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
    pintarTablero();
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
  if (!ligero || estado.capa !== "riesgo") pintarAnalisis(); else pintarAnalisisDemorado();
}
const pintarAnalisisDemorado = demorar(() => pintarAnalisis(), 250);

function mostrarAviso(txt) {
  const a = document.getElementById("aviso-busqueda");
  a.textContent = txt; a.hidden = false;
}

// Vista inicial del país (el recorrido guiado está en guia.js)
const VISTA_PAIS = { center: [-63.6, -38.6], zoom: 3.55, pitch: 0, bearing: 0 };

// ---------- Idioma y tema ----------
function aplicarIdioma() {
  setTimeout(pintarCapasExtra);
  document.documentElement.lang = estado.idioma;
  document.querySelectorAll("[data-i18n]").forEach((el) => { const v = t(el.dataset.i18n); if (typeof v === "string") el.innerHTML = v; });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  document.querySelectorAll("[data-i18n-ayuda]").forEach((el) => { el.dataset.ayuda = t(el.dataset.i18nAyuda); el.setAttribute("aria-description", t(el.dataset.i18nAyuda)); });
  document.getElementById("btn-idioma").querySelector("span").textContent = estado.idioma === "es" ? "EN" : "ES";
  document.title = t("titulo");
  pintarIntro();
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
  const archivos = ["resumen.json", "municipios_geo.geojson", "riesgo.json", "estaciones.geojson", "radios/indice.json",
    "provincias_geo.geojson", "bordes_geo.geojson", "buscador.json", "alertas.geojson", "riesgo_semanal.json"];
  const [resumen, municipios, riesgo, estaciones, cajas, provincias, bordes, buscador, alertas, semanal] = await Promise.all(archivos.map((f) =>
    fetch(`datos/${f}`, { cache: "no-cache" }).then((r) => r.json()).catch(() => (f === "alertas.geojson" ? { type: "FeatureCollection", features: [] } : null))));
  unirRiesgo(municipios, riesgo);
  unirBordes(bordes, riesgo);
  estado.riesgo = riesgo;
  estado.datos = { resumen, municipios, estaciones, cajas, provincias, bordes, buscador, alertas, semanal };
  try { await cargarTiempo(); } catch (e) { estado.tiempo = null; }
  // Mes en curso y períodos por defecto
  const M = riesgo.meses, hoyM = mesLocal();
  estado.iMesActual = M.indexOf(hoyM) >= 0 ? M.indexOf(hoyM) : hoyM < M[0] ? 0 : M.length - 1;
  const i = estado.iMesActual, ult = M.length - 1;
  estado.rangoMeses = [Math.min(i + 1, ult), Math.min(i + 3, ult)];
  if (estado.tiempo) { const h = diaHoy(); estado.rangoDias = [h, Math.min(estado.tiempo.dias.length - 1, h + 6)]; }
  prepararBuscador();

  const v = q.get("vista")?.split(",").map(Number);
  const vistaInicial = v?.length === 3 ? { center: [v[0], v[1]], zoom: v[2], pitch: 0, bearing: 0 } : VISTA_PAIS;
  mapa = new maplibregl.Map({ container: "mapa", style: estiloBase(), ...vistaInicial, maxPitch: 75, attributionControl: { compact: true } });
  mapa.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  mapa.on("style.load", () => { if (!mapa.getSource("municipios")) agregarCapas(); });

  document.querySelectorAll("#modo [data-modo]").forEach((b) => { b.onclick = () => elegirModo(b.dataset.modo); });
  document.querySelectorAll(".capas-tabs [data-capa]").forEach((b) => { b.onclick = () => elegirCapa(b.dataset.capa); });
  document.getElementById("btn-idioma").onclick = () => { estado.idioma = estado.idioma === "es" ? "en" : "es"; aplicarIdioma(); };
  document.getElementById("btn-tema").onclick = cambiarTema;
  iniciarGuia();
  pintarCapasExtra();
  document.getElementById("btn-sim-top").onclick = usarSimulador;
  if (SIN_TESELAS) { document.getElementById("enlace-completo").hidden = false; }
  addEventListener("resize", demorar(() => { pintarTablero(); pintarAnalisis(); pintarMinis(); }, 250));

  aplicarIdioma();
  // Links directos (versión completa): ?capa=lluvia&modo=futuro&punto=lon,lat&radio=5&lugar=…&partido=…&dir=…
  if (CAPAS.includes(q.get("capa"))) estado.capa = q.get("capa");
  if (q.get("modo") === "futuro") estado.modo = "futuro";
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
    actualizarTodo();
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

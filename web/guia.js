// Guía de uso: encabezado con la situación del país y cuándo se actualizó cada dato, fuentes de datos por tipo y recorrido
// guiado que explica cómo usar el tablero (botones, mapas, búsquedas), llevando la pantalla a cada parte.

// ---------- Encabezado: situación del país, zonas de mayor riesgo y actualización de los datos ----------
const ABREV_PROV = { "Ciudad Autónoma de Buenos Aires": "CABA", "Tierra del Fuego, Antártida e Islas del Atlántico Sur": "T. del Fuego", "Santiago del Estero": "Sgo. del Estero" };
const fechaHora = (iso) => new Date(/T\d\d:\d\dZ$/.test(iso) ? iso.replace("Z", ":00Z") : iso)
  .toLocaleString(loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: ZONA_HORARIA }).replace(".", "");
const fechaSola = (iso) => fmtDia(iso.slice(0, 10), { day: "numeric", month: "short" });
// Última actualización de cada fuente que cambia sola
function actualizaciones() {
  const r = estado.datos.resumen ?? {}, T = estado.tiempo, A = estado.datos.alertas;
  const ina = estado.datos.estaciones.features.map((f) => f.properties.hf).filter(Boolean).sort().pop();
  return {
    riesgo: estado.riesgo?.generado && fechaHora(estado.riesgo.generado), tiempo: T?.generado && fechaHora(T.generado), alertas: A?.generado && fechaHora(A.generado),
    ina: ina && fechaSola(ina), glofas: r.corrida_glofas && fechaSola(r.corrida_glofas), seas5: r.corrida_seas5 && fechaSola(r.corrida_seas5),
  };
}
function pintarIntro() {
  const cont = document.getElementById("intro");
  if (!cont || !estado.riesgo) return;
  const R = estado.riesgo, iM = 0, cmus = todosLosCmus(), pob = (c) => Number(estado.porCmu.get(c)?.poblacion) || 0;
  const peso = sumar(cmus.map((c) => Math.max(1, pob(c))));
  const rPais = sumar(cmus.map((c) => (R.cmu[c].r[iM] ?? 0) * Math.max(1, pob(c)))) / peso;
  const altos = sumar(cmus.filter((c) => nivelRiesgo(R.cmu[c].r[iM]) >= 4).map(pob));
  const top = cmus.filter((c) => R.cmu[c].r[iM] != null).sort((a, b) => R.cmu[b].r[iM] - R.cmu[a].r[iM]).slice(0, 5);
  const ests = estado.datos.estaciones.features.map((f) => f.properties);
  const nEv = ests.filter((e) => e.estado === "evacuacion").length, nAl = ests.filter((e) => e.estado === "alerta").length;
  const al = estado.datos.alertas.features.map((f) => f.properties);
  const tipos = [...new Set(al.map((a) => t(`alerta_${a.tipo}`).toLowerCase()))].join(", ");
  const peorAlerta = ["roja", "naranja", "amarilla"].find((n) => al.some((a) => a.nivel === n));
  const pico = picoDias(null, null, analisisRiesgoZona(cmus)), act = actualizaciones();
  const partes = [t("intro_riesgo")(nombreNivel(rPais).toLowerCase(), fmtRiesgo(rPais)), t("intro_altos")(fmtPersonas(altos)),
    nEv || nAl ? t("intro_rios")(nEv, nAl) : "", tipos ? t("intro_alertas")(tipos, peorAlerta ? t(`nivel_alerta_${peorAlerta}`) : null) : "",
    pico && pico.i ? t("intro_pico")(fmtDiaFrase(R.dias[pico.i])) : ""].filter(Boolean);
  cont.innerHTML = `<div class="intro-fila"><span class="intro-etq">${t("intro_pais")(fmtDia(R.dias[iM], { weekday: "long", day: "numeric", month: "long" }).replace(",", ""))}</span><span>${partes.join(" · ")}</span></div>`;
  // Datos actualizados: al final de la página
  const pie = document.getElementById("datos-act");
  if (pie) {
    pie.innerHTML = `<span class="intro-etq">${t("datos_act")}</span><span class="intro-act">${[["riesgo", "upd_riesgo"], ["tiempo", "upd_tiempo"],
      ["alertas", "upd_alertas"], ["ina", "upd_ina"], ["glofas", "upd_glofas"], ["seas5", "upd_seas5"]].filter(([k]) => act[k])
      .map(([k, e]) => `<span>${t(e)} <b>${act[k]}</b></span>`).join("")}<a href="#fuentes" class="intro-fuentes">${t("intro_ver_fuentes")}</a></span>`;
    pie.querySelector(".intro-fuentes").onclick = (ev) => { ev.preventDefault(); abrirFuentes(); };
  }
}

// ---------- Indicadores gráficos del encabezado: zonas de mayor riesgo ----------
function nombreZonaSel() { const s = estado.sel; return !s ? "Argentina" : s.tipo === "zona" ? s.lugar.nombre : estado.porCmu.get(s.cmu)?.nam ?? t("punto_en_mapa"); }
let pedidoZonas = 0;
async function pintarGraficosHeader() {
  const cont = document.getElementById("kpis-graficos");
  if (!cont || !estado.riesgo) return;
  const s = estado.sel, yo = ++pedidoZonas;
  // 1) Zonas de mayor riesgo: sin selección, el país; con una provincia o partido, sus municipios; con un municipio, sus radios
  //    censales; con un punto en el mapa no se muestra
  let filas = [], sub = "", ocultar = s?.tipo === "punto";
  if (!ocultar) {
    const idx = indicesVista(), R = estado.riesgo, M = R.dias;
    if (s?.tipo === "zona" && s.lugar.cmus.length === 1) {
      const cmu = s.lugar.cmus[0];
      await cargarRadiosEn(s.lugar.caja);
      if (yo !== pedidoZonas) return;
      filas = estado.radios.filter((f) => f.properties.cmu === cmu).map((f) => {
        const r = Math.max(...idx.map((i) => Number(f.properties[`r_${M[i]}`]) || 0));
        return { nombre: `${t("zr_radio")} ${String(f.properties.cod_indec).slice(-7)}`, sub: `${fmtPersonas(f.properties.poblacion)} ${t("poblacion").toLowerCase()}`, r, c: f.properties._c, radio: true };
      }).sort((a, b) => b.r - a.r).slice(0, 5);
      sub = t("zr_radios")(s.lugar.nombre);
    } else {
      const cmus = cmusSel(), vals = valoresRiesgoVista();
      filas = cmus.filter((c) => vals.has(c)).map((c) => ({ cmu: c, nombre: estado.porCmu.get(c)?.nam ?? c, sub: ABREV_PROV[estado.porCmu.get(c)?.jur] ?? estado.porCmu.get(c)?.jur, r: vals.get(c) }))
        .sort((a, b) => b.r - a.r).slice(0, 5);
      sub = s ? t("zr_sel")(s.lugar.nombre) : t("zr_pais");
    }
  }
  const barras = ocultar ? "" : `<div class="kpi-g zr"><div class="kpi-g-cab"><b>${t("zr_t")}${infoIcono("zr_t", infoTexto("zr_t"))}</b><small>${escapar(sub)}</small></div><ol class="zr-lista">${filas.map((f, i) =>
    `<li class="zr-fila" data-i="${i}" tabindex="0" data-tip="${escapar(`<b>${escapar(f.nombre)}</b><span>${escapar(f.sub ?? "")} · ${nombreNivel(f.r)} (${fmtRiesgo(f.r)}/10)</span>`)}">
      <span class="zr-nombre">${escapar(f.nombre)}<small>${escapar(f.sub ?? "")}</small></span>
      <span class="zr-pista"><span style="width:${limitar(f.r * 10, 2, 100)}%;background:${colorNivel(f.r)}"></span></span><b>${fmtRiesgo(f.r)}</b></li>`).join("")}</ol></div>`;
  const sem = bloqueDias();
  cont.hidden = !barras && !sem;
  cont.className = `kpis-graficos${barras && sem ? " dos" : ""}`;
  cont.innerHTML = barras + sem;
  const cols = cont.querySelector("#dias-col");
  if (cols) graficoDias(cols);
  cont.querySelectorAll(".zr-fila").forEach((li) => {
    const f = filas[+li.dataset.i], ir = () => {
      if (f.radio) return seleccionarPunto(f.c, { volar: true, origen: "ranking" });
      const l = estado.lugares.find((x) => x.nivel === "gl" && x.cmus[0] === f.cmu); if (l) elegirLugar("localidad", l);
    };
    li.onclick = ir; li.onkeydown = (ev) => { if (ev.key === "Enter") ir(); };
  });
  prepararInfo(cont);
  tipsEn(cont);
}

// ---------- Riesgo día por día: % de la superficie en cada nivel (columnas apiladas) ----------
// La selección (o el país) en los 15 días: cada columna suma 100 % del área. Tocar una columna pinta el mapa con ese día.
function porcentajesDias() {
  const R = estado.riesgo, cmus = cmusSel(), area = cmus.map((c) => Number(estado.porCmu.get(c)?.area_km2) || 0), tot = sumar(area) || 1;
  return [1, 2, 3, 4, 5].map((n) => R.dias.map((_, i) => (100 * sumar(cmus.map((c, k) => ((nivelRiesgo(R.cmu[c].r[i]) || 1) === n ? area[k] : 0)))) / tot));
}
function bloqueDias() {
  const s = estado.sel, sub = !s ? t("dc_pais") : s.tipo === "zona" ? t("dc_zona")(s.lugar.nombre) : t("dc_muni")(estado.porCmu.get(s.cmu)?.nam ?? "");
  return `<div class="kpi-g dc"><div class="kpi-g-cab"><b>${t("dc_t")}${infoIcono("dc_t", infoTexto("dc_t"))}</b><small>${escapar(sub)}</small></div>
    <ul class="apilada-leyenda dc-ley">${[5, 4, 3, 2, 1].map((n) => `<li><i style="background:var(--r${n})"></i>${t("niveles_cortos")[n - 1]}</li>`).join("")}</ul>
    <div id="dias-col" class="graf-cont"></div><p class="dc-pie">${t("dc_pie")}</p></div>`;
}
function graficoDias(cont) {
  const R = estado.riesgo, P = porcentajesDias(), idx = indicesVista();
  grafApiladas(cont, {
    alto: 168, unidad: t("dc_unidad"), formatoEje: (v) => `${fmt(v)}`,
    etiquetas: R.dias.map((d, i) => (i ? fmtDia(d, { day: "numeric" }) : t("hoy"))),
    series: [1, 2, 3, 4, 5].map((n) => ({ valores: P[n - 1], color: `var(--r${n})` })),
    activos: [Math.min(...idx), Math.max(...idx)],
    tip: (i) => `<span class="tip-titulo">${capitalizar(fmtDia(R.dias[i], { weekday: "long", day: "numeric", month: "long" }))}</span>${[5, 4, 3, 2, 1]
      .filter((n) => P[n - 1][i] >= 0.05).map((n) => `<span class="tip-fila"><i style="background:var(--r${n})"></i>${t("niveles_cortos")[n - 1]}: <b>${fmt(P[n - 1][i], P[n - 1][i] < 10 ? 1 : 0)} %</b></span>`).join("")}<span class="tip-fila tip-ayuda">${t("dc_tocar")}</span>`,
    onClick: (i) => { detenerReproduccion(false); estado.rangoRiesgo = [i, i]; if (estado.capa !== "riesgo") elegirCapa("riesgo"); else actualizarTodo(); },
  });
}

// ---------- Fuentes de datos por tipo (ventana) ----------
const REPO = "https://github.com/diamedego/Mapa-de-riesgo-super-ni-o";
function abrirFuentes() {
  let d = document.getElementById("fuentes");
  if (!d) {
    d = document.createElement("dialog");
    d.id = "fuentes"; d.className = "fuentes"; d.setAttribute("aria-labelledby", "fuentes-titulo");
    document.body.appendChild(d);
    d.addEventListener("close", () => { if (location.hash === "#fuentes") history.replaceState(null, "", location.pathname + location.search); });
    d.addEventListener("click", (ev) => { if (ev.target === d) d.close(); });   // clic afuera de la caja
  }
  const act = actualizaciones(), tipos = t("tipo_dato");
  d.innerHTML = `<div class="fuentes-cabeza"><h2 id="fuentes-titulo">${t("fuentes_t")}</h2>
      <button type="button" class="btn-icono" data-cerrar aria-label="${t("cerrar")}">${icono("cerrar")}</button></div>
    <p class="fuentes-intro">${t("fuentes_intro")}</p>
    <ul class="fuentes-tipos">${Object.keys(tipos).map((k) => `<li><span class="tipo-dato" data-tipo="${k}">${tipos[k]}</span>${t("tipo_dato_exp")[k]}</li>`).join("")}</ul>
    ${t("fuentes_grupos").map((g) => `<section class="fuentes-grupo"><h3>${g.t}</h3><ul>${g.items.map((f) => `<li class="fuente">
      <div class="fuente-cab"><b>${f.n}</b><span class="tipo-dato" data-tipo="${f.tipo}">${tipos[f.tipo]}</span></div><p>${f.d}</p>
      <p class="fuente-pie">${f.u ? `<a href="${f.u === "repo" ? REPO : f.u}" target="_blank" rel="noopener">${f.f}</a>` : f.f} · ${f.cada}${f.act && act[f.act]
        ? ` · ${t("ultima_act")} <b>${act[f.act]}</b>` : ""}</p></li>`).join("")}</ul></section>`).join("")}`;
  d.querySelector("[data-cerrar]").onclick = () => d.close();
  if (!d.open) d.showModal();
  if (location.hash !== "#fuentes") history.replaceState(null, "", "#fuentes");
}

// ---------- Recorrido guiado: cómo se usa el tablero ----------
// Cada paso resalta una parte de la página, la lleva a la vista y pone el cartel al lado (en el celular, abajo)
// (el tercer dato es la lámina donde está esa parte; sin dato, la 01)
const PASOS = [
  [".solapas", "g0"], ["#intro", "g1"], ["#kpis", "g2"], ["#form-buscar", "g3"], ["#modo", "g4"], ["#btn-sim-top", "g5"], [".capas-tabs", "g6"],
  ["#capas-extra", "g7"], ["#mapa", "g8"], ["#leyenda", "g9"], ["#miniaturas", "g10"], ["#tablero", "g11"], ["#analisis", "g12", 4], [".intro-fuentes", "g13", 4],
];
const verPaso = (i) => { mostrarLamina(PASOS[i][2] ?? 1); return document.querySelector(PASOS[i][0]); };
let guia = null;
function recorrido(i = 0) {
  if (i < 0 || i >= PASOS.length) return cerrarRecorrido();
  if (!guia) {
    const foco = document.createElement("div"), cartel = document.createElement("div");
    foco.className = "guia-foco"; foco.setAttribute("aria-hidden", "true");
    cartel.className = "guia-cartel"; cartel.setAttribute("role", "dialog"); cartel.setAttribute("aria-label", t("recorrido"));
    document.body.append(foco, cartel);
    guia = { foco, cartel, i: 0, el: null };
    addEventListener("scroll", ubicarGuia, { passive: true, capture: true });
    addEventListener("resize", ubicarGuia);
    document.addEventListener("keydown", teclaGuia);
  }
  // Saltear lo que no se ve (por ejemplo, las miniaturas en una pantalla angosta)
  const dir = i >= guia.i ? 1 : -1;
  let el = verPaso(i);
  while ((!el || !el.getClientRects().length) && i + dir >= 0 && i + dir < PASOS.length) { i += dir; el = verPaso(i); }
  guia.i = i; guia.el = el;
  const clave = PASOS[i][1], ultimo = i === PASOS.length - 1;
  guia.cartel.innerHTML = `<span class="rec-paso">${i + 1} / ${PASOS.length}</span><h3>${t(`${clave}_t`)}</h3><p>${t(`${clave}_p`)}</p>
    <div class="rec-botones"><button type="button" class="btn-texto" data-r="${i - 1}"${i ? "" : " disabled"}>${t("anterior")}</button>
    <button type="button" class="btn-primario" data-r="${ultimo ? -1 : i + 1}">${ultimo ? t("terminar") : t("siguiente")}</button>
    <button type="button" class="btn-icono" data-r="-1" aria-label="${t("cerrar")}">${icono("cerrar")}</button></div>`;
  guia.cartel.querySelectorAll("[data-r]").forEach((b) => { b.onclick = () => recorrido(+b.dataset.r); });
  if (el) {
    const r = el.getBoundingClientRect(), alto = Math.min(r.height, innerHeight);
    // Celular: arriba de todo (el cartel va abajo). Escritorio: centrado, o arriba si es más alto que media pantalla.
    // (cada lámina se desplaza por dentro: se mueve el contenedor que haga falta)
    el.scrollIntoView({ block: esMovil() || alto > innerHeight * 0.55 ? "start" : "center", behavior: movimientoReducido() ? "auto" : "smooth" });
  }
  ubicarGuia();
  setTimeout(ubicarGuia, 500);
  guia.cartel.querySelector(".btn-primario").focus({ preventScroll: true });
}
function ubicarGuia() {
  if (!guia) return;
  const { foco, cartel, el } = guia;
  if (!el) { foco.hidden = true; return; }
  const r = el.getBoundingClientRect(), m = 6;
  foco.hidden = false;
  Object.assign(foco.style, { top: `${r.top - m}px`, left: `${r.left - m}px`, width: `${r.width + 2 * m}px`, height: `${r.height + 2 * m}px` });
  const abajo = esMovil();
  cartel.classList.toggle("abajo", abajo);
  if (abajo) { cartel.style.top = cartel.style.left = ""; return; }
  // Debajo, arriba, a la derecha o a la izquierda de la parte explicada, sin taparla; si no entra en ningún lado (una parte
  // que ocupa todo el ancho), adentro, en su esquina de arriba a la derecha
  const w = cartel.offsetWidth, h = cartel.offsetHeight, sep = 14, x = limitar(r.left, 8, innerWidth - w - 8), y = limitar(r.top, 8, innerHeight - h - 8);
  const entra = ([top, left]) => top >= 8 && top + h <= innerHeight - 8 && left >= 8 && left + w <= innerWidth - 8;
  const [top, left] = [[r.bottom + sep, x], [r.top - h - sep, x], [y, r.right + sep], [y, r.left - w - sep]].find(entra)
    ?? [limitar(Math.max(r.top, 0) + 12, 8, innerHeight - h - 8), limitar(r.right - w - 12, 8, innerWidth - w - 8)];
  Object.assign(cartel.style, { top: `${top}px`, left: `${left}px` });
}
function teclaGuia(ev) {
  if (!guia) return;
  if (ev.key === "Escape") cerrarRecorrido();
  else if (ev.key === "ArrowRight") recorrido(guia.i + 1);
  else if (ev.key === "ArrowLeft" && guia.i > 0) recorrido(guia.i - 1);
}
function cerrarRecorrido() {
  if (!guia) return;
  guia.foco.remove(); guia.cartel.remove();
  removeEventListener("scroll", ubicarGuia, { capture: true });
  removeEventListener("resize", ubicarGuia);
  document.removeEventListener("keydown", teclaGuia);
  guia = null;
  document.getElementById("btn-recorrido")?.focus({ preventScroll: true });
}

// Al cargar: encabezado, botón del recorrido y la ventana de fuentes si el enlace la pide (#fuentes)
function iniciarGuia() {
  pintarIntro();
  document.getElementById("btn-recorrido").onclick = () => recorrido(0);
  if (location.hash === "#fuentes") abrirFuentes();
  addEventListener("hashchange", () => { if (location.hash === "#fuentes") abrirFuentes(); });
}

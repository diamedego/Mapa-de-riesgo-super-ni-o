// Capas del tiempo (lluvia, viento, temperatura) sobre el mapa, separadas del riesgo.
// Datos: datos/tiempo.json (ingesta/tiempo_grilla.py, Open-Meteo, pronóstico a 16 días en una grilla de 1°).
// Se dibuja como imagen suave (interpolación bilineal de la grilla) y, para el viento, flechas.
// Usa lo definido en app.js (mapa, estado, SIN_TESELAS, css, primeraCapaDelMapaBase, t, normalizar).

const TT = {
  es: { capa: "Capa del mapa", riesgo: "Riesgo", lluvia: "Lluvia", viento: "Viento", temp: "Temperatura máx.",
        acum: "Acumulado hasta ese día", play: "Reproducir los 16 días", nota: "Pronóstico a 16 días: Open-Meteo.com. No es un producto oficial.",
        u_lluvia: "mm", u_viento: "km/h", u_temp: "°C", rafaga: "Ráfagas", dir: "Viento desde el", acumulado: "Lluvia acumulada",
        t_lluvia: "Lluvia del día (mm)", t_lluvia_acum: "Lluvia acumulada (mm)", t_viento: "Viento máximo del día (km/h)",
        t_temp: "Temperatura máxima (°C)", cargando: "Cargando el pronóstico…", sin_datos: "No se pudo cargar el pronóstico del tiempo.",
        puntos: ["N", "NE", "E", "SE", "S", "SO", "O", "NO"] },
  en: { capa: "Map layer", riesgo: "Risk", lluvia: "Rain", viento: "Wind", temp: "Max. temperature",
        acum: "Accumulated up to that day", play: "Play the 16 days", nota: "16-day forecast: Open-Meteo.com. Not an official product.",
        u_lluvia: "mm", u_viento: "km/h", u_temp: "°C", rafaga: "Gusts", dir: "Wind from", acumulado: "Accumulated rain",
        t_lluvia: "Daily rain (mm)", t_lluvia_acum: "Accumulated rain (mm)", t_viento: "Daily max. wind (km/h)",
        t_temp: "Max. temperature (°C)", cargando: "Loading forecast…", sin_datos: "Couldn't load the weather forecast.",
        puntos: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] },
};
const tt = (k) => TT[estado.idioma][k];

// Escalas: [valor, [r, g, b, alfa]]; entre dos valores se mezcla el color
const ESCALAS = {
  lluvia: [[0, [255, 255, 255, 0]], [1, [190, 225, 255, 0.35]], [5, [110, 175, 240, 0.6]], [15, [40, 110, 220, 0.72]],
           [30, [30, 60, 190, 0.8]], [60, [110, 40, 170, 0.85]], [100, [190, 20, 120, 0.9]]],
  lluvia_acum: [[0, [255, 255, 255, 0]], [5, [190, 225, 255, 0.35]], [20, [110, 175, 240, 0.6]], [50, [40, 110, 220, 0.72]],
                [100, [30, 60, 190, 0.8]], [200, [110, 40, 170, 0.85]], [400, [190, 20, 120, 0.9]]],
  viento: [[0, [255, 255, 255, 0]], [10, [200, 235, 220, 0.3]], [25, [120, 200, 150, 0.5]], [40, [240, 220, 90, 0.6]],
           [55, [240, 150, 50, 0.7]], [70, [220, 60, 40, 0.8]], [90, [150, 20, 120, 0.85]]],
  temp: [[-10, [70, 60, 180, 0.65]], [0, [90, 150, 230, 0.65]], [10, [130, 210, 200, 0.65]], [18, [250, 240, 150, 0.65]],
         [26, [250, 170, 60, 0.7]], [34, [220, 60, 40, 0.75]], [42, [140, 20, 60, 0.8]]],
};
const CAPAS = ["riesgo", "lluvia", "viento", "temp"];
const CAPAS_DE_RIESGO = ["sin-datos", "municipios-3d", "radios-3d", "municipios-alto", "radios-alto", "bordes-riesgo"];

function escalaActual() {
  const c = estado.capa;
  return ESCALAS[c === "lluvia" && estado.tiempoAcum ? "lluvia_acum" : c];
}

function colorEscala(escala, v) {
  if (v <= escala[0][0]) return escala[0][1];
  for (let k = 1; k < escala.length; k++) {
    if (v <= escala[k][0]) {
      const [v0, c0] = escala[k - 1], [v1, c1] = escala[k], f = (v - v0) / (v1 - v0);
      return c0.map((x, i) => x + (c1[i] - x) * f);
    }
  }
  return escala[escala.length - 1][1];
}

// Valor de la grilla en un punto (bilineal; ignora las esquinas sin dato). Devuelve [valor, peso disponible 0..1]
function valorEn(g, serie, dia, lon, lat) {
  const fx = (lon - g.lon0) / g.paso, fy = (g.lat0 - lat) / g.paso;
  if (fx < 0 || fy < 0 || fx > g.nx - 1 || fy > g.ny - 1) return [null, 0];
  const x0 = Math.min(Math.floor(fx), g.nx - 2), y0 = Math.min(Math.floor(fy), g.ny - 2), ax = fx - x0, ay = fy - y0;
  let suma = 0, peso = 0;
  for (const [dx, dy, w] of [[0, 0, (1 - ax) * (1 - ay)], [1, 0, ax * (1 - ay)], [0, 1, (1 - ax) * ay], [1, 1, ax * ay]]) {
    const v = serie(dia, (y0 + dy) * g.nx + x0 + dx);
    if (v != null) { suma += v * w; peso += w; }
  }
  return peso > 0 ? [suma / peso, peso] : [null, 0];
}

// Serie de un día; la lluvia puede ser acumulada hasta ese día
function serieTiempo(nombre) {
  const g = estado.tiempo;
  if (nombre === "lluvia" && estado.tiempoAcum) {
    return (dia, k) => { let s = 0; for (let d = 0; d <= dia; d++) { const v = g.lluvia[d * g.nx * g.ny + k]; if (v == null) return null; s += v; } return s; };
  }
  return (dia, k) => g[nombre][dia * g.nx * g.ny + k];
}

const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const latDeMercY = (y) => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * (180 / Math.PI);

function dibujarTiempo() {
  const g = estado.tiempo, capa = estado.capa;
  if (!g || capa === "riesgo" || !mapa.getSource("tiempo-img")) return;
  const dia = estado.tiempoDia, escala = escalaActual(), serie = serieTiempo(capa);
  const lon1 = g.lon0 + (g.nx - 1) * g.paso, latSur = g.lat0 - (g.ny - 1) * g.paso;
  const W = (g.nx - 1) * 14;
  const yTop = mercY(g.lat0), yBot = mercY(latSur);
  const H = Math.round((W * (yTop - yBot)) / (((lon1 - g.lon0) * Math.PI) / 180));
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d"), img = ctx.createImageData(W, H);
  for (let py = 0; py < H; py++) {
    const lat = latDeMercY(yTop - ((yTop - yBot) * (py + 0.5)) / H);
    for (let px = 0; px < W; px++) {
      const lon = g.lon0 + ((lon1 - g.lon0) * (px + 0.5)) / W;
      const [v, peso] = valorEn(g, serie, dia, lon, lat);
      if (v == null || peso < 0.35) continue;
      const [r, gg, b, a] = colorEscala(escala, v), o = (py * W + px) * 4;
      img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b;
      img.data[o + 3] = Math.round(255 * a * Math.min(1, (peso - 0.35) / 0.4));   // borde que se desvanece
    }
  }
  ctx.putImageData(img, 0, 0);
  mapa.getSource("tiempo-img").updateImage({ url: cv.toDataURL(), coordinates: [[g.lon0, g.lat0], [lon1, g.lat0], [lon1, latSur], [g.lon0, latSur]] });
  if (capa === "viento") {
    const feats = [];
    for (let k = 0; k < g.nx * g.ny; k++) {
      const v = g.viento[dia * g.nx * g.ny + k], d = g.direccion[dia * g.nx * g.ny + k];
      if (v == null || d == null) continue;
      feats.push({ type: "Feature", properties: { v, dir: d },
        geometry: { type: "Point", coordinates: [g.lon0 + (k % g.nx) * g.paso, g.lat0 - Math.floor(k / g.nx) * g.paso] } });
    }
    mapa.getSource("tiempo-flechas").setData({ type: "FeatureCollection", features: feats });
  }
}

function iconoFlecha() {
  const n = 48, cv = document.createElement("canvas"); cv.width = cv.height = n;
  const c = cv.getContext("2d");
  c.beginPath(); c.moveTo(n / 2, 4); c.lineTo(n - 12, n - 8); c.lineTo(n / 2, n - 16); c.lineTo(12, n - 8); c.closePath();
  c.fillStyle = "#1c1c1b"; c.strokeStyle = "#ffffff"; c.lineWidth = 3; c.lineJoin = "round"; c.stroke(); c.fill();
  return c.getImageData(0, 0, n, n);
}

// Se llama cada vez que se (re)crean las capas del mapa (arranque y cambio de tema)
function agregarCapaTiempo() {
  const antes = mapa.getLayer("agua-areas") ? "agua-areas" : SIN_TESELAS ? "provincias-borde" : primeraCapaDelMapaBase();
  const vacia = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  mapa.addSource("tiempo-img", { type: "image", url: vacia, coordinates: [[-74, -21], [-53, -21], [-53, -55], [-74, -55]] });
  mapa.addLayer({ id: "tiempo-raster", type: "raster", source: "tiempo-img", layout: { visibility: "none" },
    paint: { "raster-opacity": 0.9, "raster-resampling": "linear", "raster-fade-duration": 0 } }, antes);
  if (!mapa.hasImage("flecha")) mapa.addImage("flecha", iconoFlecha());
  mapa.addSource("tiempo-flechas", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  mapa.addLayer({ id: "tiempo-flechas", type: "symbol", source: "tiempo-flechas", layout: { visibility: "none",
    "icon-image": "flecha", "icon-rotate": ["+", ["get", "dir"], 180], "icon-rotation-alignment": "map", "icon-allow-overlap": false,
    "icon-padding": 6, "icon-size": ["interpolate", ["linear"], ["get", "v"], 0, 0.28, 40, 0.42, 90, 0.62] },
    paint: { "icon-opacity": 0.85 } });
  aplicarCapa();
}

async function elegirCapa(capa) {
  estado.capa = capa;
  pintarControlesTiempo();
  if (capa !== "riesgo" && !estado.tiempo) {
    const aviso = document.getElementById("aviso-tiempo");
    aviso.textContent = tt("cargando"); aviso.hidden = false;
    try {
      estado.tiempo = await fetch("datos/tiempo.json").then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
      aviso.hidden = true;
      document.getElementById("tiempo-dia").max = estado.tiempo.dias.length - 1;
    } catch (e) { aviso.textContent = tt("sin_datos"); estado.capa = "riesgo"; pintarControlesTiempo(); }
  }
  aplicarCapa();
}

// Muestra u oculta lo que corresponde a la capa elegida (el riesgo y el tiempo no se mezclan)
function aplicarCapa() {
  if (!mapa || !mapa.getLayer("tiempo-raster")) return;
  const tiempo = estado.capa !== "riesgo" && estado.tiempo;
  for (const id of CAPAS_DE_RIESGO) {
    if (!mapa.getLayer(id)) continue;
    const alto = id.endsWith("-alto");
    mapa.setLayoutProperty(id, "visibility", tiempo ? "none" : alto && !estado.altura ? "none" : "visible");
  }
  mapa.setLayoutProperty("tiempo-raster", "visibility", tiempo ? "visible" : "none");
  mapa.setLayoutProperty("tiempo-flechas", "visibility", tiempo && estado.capa === "viento" ? "visible" : "none");
  document.querySelector(".escenario").classList.toggle("modo-tiempo", !!tiempo);
  document.getElementById("tiempo-barra").hidden = !tiempo;
  document.getElementById("tiempo-acum-campo").hidden = estado.capa !== "lluvia";
  if (tiempo) { dibujarTiempo(); pintarLeyendaTiempo(); pintarFechaTiempo(); }
}

function fechaLinda(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(estado.idioma === "es" ? "es-AR" : "en-US",
    { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function pintarFechaTiempo() {
  const g = estado.tiempo;
  document.getElementById("tiempo-dia").value = estado.tiempoDia;
  document.getElementById("tiempo-fecha").textContent = fechaLinda(g.dias[estado.tiempoDia]);
  document.getElementById("tiempo-fuente").textContent = `${tt("nota")} (${g.corrida})`;
}

function pintarLeyendaTiempo() {
  const esc = escalaActual(), c = estado.capa;
  const titulo = c === "lluvia" && estado.tiempoAcum ? tt("t_lluvia_acum") : tt("t_" + c);
  const min = esc[0][0], max = esc[esc.length - 1][0];
  const tramo = esc.map(([v, [r, g, b, a]]) => `rgba(${r},${g},${b},${Math.max(a, 0.25)}) ${((v - min) / (max - min)) * 100}%`).join(", ");
  document.getElementById("leyenda-tiempo").innerHTML = `<p class="leyenda-titulo">${titulo}</p>
    <div class="degradado" style="background:linear-gradient(90deg, ${tramo})"></div>
    <div class="degradado-rotulos">${esc.map(([v]) => `<span>${v}</span>`).join("")}</div>`;
}

function pintarControlesTiempo() {
  document.getElementById("capas-etq").textContent = tt("capa");
  const cont = document.getElementById("capas-botones");
  cont.innerHTML = CAPAS.map((c) => `<button role="radio" aria-checked="${c === estado.capa}" data-capa="${c}">${tt(c)}</button>`).join("");
  cont.querySelectorAll("button").forEach((b) => { b.onclick = () => elegirCapa(b.dataset.capa); });
  document.getElementById("tiempo-acum-txt").textContent = tt("acum");
  document.getElementById("tiempo-play").setAttribute("aria-label", tt("play"));
  if (estado.tiempo && estado.capa !== "riesgo") { pintarLeyendaTiempo(); pintarFechaTiempo(); }
}

function popupTiempo(e) {
  if (estado.capa === "riesgo" || !estado.tiempo) return;
  const g = estado.tiempo, d = estado.tiempoDia, { lng, lat } = e.lngLat;
  const val = (n, acum = false) => { const prev = estado.tiempoAcum; estado.tiempoAcum = acum;
    const [v] = valorEn(g, serieTiempo(n), d, lng, lat); estado.tiempoAcum = prev; return v; };
  const lluvia = val("lluvia"), acum = val("lluvia", true), viento = val("viento"), rafaga = val("rafaga"), temp = val("temp");
  if (lluvia == null) return;
  const [dirv] = valorEn(g, serieTiempo("direccion"), d, lng, lat);
  const punto = tt("puntos")[Math.round((dirv ?? 0) / 45) % 8];
  new maplibregl.Popup({ closeButton: false, maxWidth: "240px" }).setLngLat(e.lngLat).setHTML(`<div class="popup-tiempo">
    <strong>${fechaLinda(g.dias[d])}</strong><br>
    ${tt("lluvia")}: ${lluvia.toFixed(1)} mm · ${tt("acumulado")}: ${acum.toFixed(0)} mm<br>
    ${tt("viento")}: ${Math.round(viento)} ${tt("u_viento")} (${tt("dir")} ${punto})<br>
    ${tt("rafaga")}: ${Math.round(rafaga)} ${tt("u_viento")}<br>
    ${tt("temp")}: ${temp.toFixed(0)} ${tt("u_temp")}</div>`).addTo(mapa);
}

function prepararTiempo() {
  estado.capa = "riesgo"; estado.tiempoDia = 0; estado.tiempoAcum = false; estado.tiempo = null;
  pintarControlesTiempo();
  document.getElementById("tiempo-dia").oninput = (e) => { estado.tiempoDia = Number(e.target.value); dibujarTiempo(); pintarFechaTiempo(); };
  document.getElementById("tiempo-acum").onchange = (e) => { estado.tiempoAcum = e.target.checked; dibujarTiempo(); pintarLeyendaTiempo(); };
  document.getElementById("tiempo-play").onclick = () => {
    const btn = document.getElementById("tiempo-play");
    if (estado.tiempoReproduce) { clearInterval(estado.tiempoReproduce); estado.tiempoReproduce = null; btn.textContent = "▶"; return; }
    btn.textContent = "❚❚";
    if (estado.tiempoDia >= estado.tiempo.dias.length - 1) estado.tiempoDia = 0;
    estado.tiempoReproduce = setInterval(() => {
      estado.tiempoDia++; dibujarTiempo(); pintarFechaTiempo();
      if (estado.tiempoDia >= estado.tiempo.dias.length - 1) { clearInterval(estado.tiempoReproduce); estado.tiempoReproduce = null; btn.textContent = "↻"; }
    }, 1100);
  };
  mapa.on("click", popupTiempo);
  const q = new URLSearchParams(location.search);
  if (CAPAS.includes(q.get("capa"))) elegirCapa(q.get("capa")).then(() => {
    estado.tiempoDia = Math.min(Number(q.get("dia") ?? 0), (estado.tiempo?.dias.length ?? 1) - 1);
    if (q.get("acum")) { estado.tiempoAcum = true; document.getElementById("tiempo-acum").checked = true; }
    aplicarCapa();
  });
}

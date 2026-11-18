// Tabla de habitantes expuestos de un círculo (herramientas/exposicion_simulador.py): con el código del simulador (relieve, bajos,
// suelo, desagües y margen de terreno alrededor), qué fracción de cada radio censal queda con 10 cm de agua o más para cada lluvia de
// 3 días y cada humedad del suelo. Solo cuenta el cuadrado central de 2,1 km que le toca al círculo (sin superposición con los vecinos).
const EXPO_P = [10, 20, 30, 50, 75, 100, 150, 200, 300], EXPO_W = [0.1, 0.5, 0.9];
// Escorrentía de una lluvia P (mm, 3 días) con humedad relativa w: número de curva con λ = 0,05 (como indiceNino) en lo permeable;
// en lo impermeable, lo que supera a los desagües en 12 horas efectivas de lluvia (la misma regla en el cálculo diario)
function escorrentiaExpo(P, w, cn2, D) {
  const cn1 = (4.2 * cn2) / (10 - 0.058 * cn2), cn3 = (23 * cn2) / (10 + 0.13 * cn2), S20 = (cn) => 25400 / cn - 254;
  const s20 = w <= 0.5 ? S20(cn1) + (S20(cn2) - S20(cn1)) * (w / 0.5) : S20(cn2) + (S20(cn3) - S20(cn2)) * ((w - 0.5) / 0.5);
  const S = 25.4 * 1.33 * (s20 / 25.4) ** 1.15;
  return { qPerm: P > 0.05 * S ? (P - 0.05 * S) ** 2 / (P + 0.95 * S) : 0, qImp: Math.max(0, P - 12 * D) };
}
window.__circulo = async (punto) => {
  const w = (s) => new Promise((r) => setTimeout(r, s)), t0 = performance.now();
  irALamina(1); await w(50);
  seleccionarPunto(punto, { volar: false }); await w(50);
  irALamina(2);
  const listo = () => SIM.datos && SIM.datos.s === estado.sel && SIM.hist?.H && SIM.hist.suelo !== undefined && SIM.modelo?.g;
  for (let i = 0; i < 240 && !listo(); i++) await w(250);
  const d = SIM.datos;
  if (!listo()) return { punto, error: "sin datos", ms: performance.now() - t0 };
  SIM.modelo.worker?.terminate();   // no hace falta la simulación hora a hora
  const L = rasgosLugar(), g = L.g, cn2 = cnTextura((SIM.modelo?.suelo ?? SIM.hist.suelo)?.nombre), D = Math.round(SIM.hist?.H?.desague ?? SIM.desague ?? 10);
  const rad = estado.radios.filter((f) => distanciaKm(punto, f.properties._c) <= estado.km * 1.6);
  const k = 2.1 / 111, mLat = k / 2, mLon = mLat / Math.cos((Math.round(punto[1] / k) * k * Math.PI) / 180), DD = d.D;
  const celdas = [];   // [radio, celda del modelo] del cuadrado central
  d.celdas.forEach((i, j) => {
    const r = d.radioDe[j], c = g.celdaDe(i); if (!r || c < 0) return;
    const lo = lonDeX(DD.tx0 + ((i % DD.W) + 0.5) / 256, DD.z), la = latDeY(DD.ty0 + (((i / DD.W) | 0) + 0.5) / 256, DD.z);
    if (Math.abs(la - punto[1]) <= mLat && Math.abs(lo - punto[0]) <= mLon) celdas.push(r, c);
  });
  const vis = new Float64Array(rad.length + 1);
  for (let j = 0; j < celdas.length; j += 2) vis[celdas[j]]++;
  const moj = EXPO_W.flatMap(() => EXPO_P.map(() => new Float64Array(rad.length + 1)));
  EXPO_W.forEach((wv, a) => EXPO_P.forEach((P, b) => {
    const { qPerm, qImp } = escorrentiaExpo(P, wv, cn2, D), prof = aguaEvento(L, qPerm, qImp, null).prof, m = moj[a * EXPO_P.length + b];
    for (let j = 0; j < celdas.length; j += 2) if (prof[celdas[j + 1]] >= 0.1) m[celdas[j]]++;
  }));
  const radios = [];
  for (let r = 1; r <= rad.length; r++) if (vis[r]) radios.push([rad[r - 1].properties.cod_indec, vis[r], d.celdasRadio[r], moj.map((m) => m[r])]);
  return { punto, cn: cn2, desague: D, ms: Math.round(performance.now() - t0), radios };
};

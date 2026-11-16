"""Riesgo de inundación de hoy y de los próximos 14 días por gobierno local (reemplaza al riesgo mensual, que fuera de los ríos
grandes no tenía sustento: la lluvia de un mes no se puede pronosticar).

Amenaza de cada día (nivel 0 a 3) = el mayor entre:
- LLUVIA: probabilidad de que la lluvia de 3 días seguidos que termina ese día supere la que en el lugar se da una vez cada 2, 5 o
  10 años (umbrales del clima del propio modelo: earth_engine/umbrales_lluvia.py). Probabilidad = fracción de los 50 pronósticos
  del ensamble del ECMWF (datos abiertos del ECMWF) que la superan. Nivel 1 / 2 / 3 si al menos el 30 % supera 2 / 5 / 10 años (el sistema
  europeo EFAS avisa cuando el 30 % del ensamble supera la crecida de 5 años). En lugares poco propensos a juntar agua (propensión
  histórica < 0,15: sin terreno bajo ni historia de agua) baja un nivel.
- RÍO: estaciones del INA con curva validada (43). Caudal de los 51 pronósticos de GloFAS → altura con la curva de cada estación.
  Nivel 1 si al menos el 30 % llega a alerta; 2 si el 30 % llega a evacuación; 3 si el 70 % llega a evacuación. Hoy manda la
  altura medida por el INA. Cuenta para los gobiernos locales a ≤ 15 km de la estación (a 15-30 km, un nivel menos).
- ALERTAS DEL SMN vigentes por tormentas o lluvias que cubren el lugar (solo los días que dura cada alerta): amarilla 1, naranja 2,
  roja 3.

Amenaza del día H = 10 − (10 − Hfija) × (10 − Hpron) / 10 (la combinación de amenazas del índice): Hpron = 0 / 4 / 7 / 10 según el
nivel pronosticado y Hfija la propensión del lugar con lluvia normal, la misma del índice con el factor de lluvia f = 0,5: agua en
superficie 10 × P_agua × f y quebradas 10 × s_quebrada × f × (½ + ½ arcilla), combinadas igual. Sin ella, un lugar que se inunda
seguido daba 0,0 en cualquier día sin pronóstico de lluvia (por ejemplo Toyota Boshoku, en Campana).
Riesgo = ∛(H × E × V), con E y V la exposición y la vulnerabilidad fijas del índice (escala física 0-10). Se pinta con los mismos
cortes del sitio.

Salida: web/datos/riesgo_diario.json
  {generado, dias, cmu: {cmu: {r: [15 riesgos], n: "nivel de amenaza por día", l / q / a: "nivel por lluvia / río / alerta",
                               p: [15 prob. del nivel que manda]}}, est: {estacion_id: {n: "nivel por día", p: [15 prob.]}}}
(los niveles van como texto de 15 dígitos 0-3) y una copia con fecha en data/archivo/riesgo_diario/ (para verificar después
contra lo que pasó). Lo bajado (ríos, lluvia) se guarda por día en data/procesado/riesgo_diario/ y se reusa si se corre de
nuevo el mismo día.
Uso: python modelos/riesgo_diario.py
"""
import datetime as dt
import json
import math
import pickle
import time
from pathlib import Path

import numpy as np
import pandas as pd
import requests

RAIZ = Path(__file__).resolve().parents[1]
REF, WEB = RAIZ / "data" / "referencia", RAIZ / "web" / "datos"
DIAS, P_UMBRAL, P_ALTA = 15, 0.30, 0.70
F_NORMAL = 0.5   # factor de lluvia del índice con lluvia normal (f = lluvia / normal / 2)
H_NIVEL = [0, 4, 7, 10]
CRECIDA = "https://flood-api.open-meteo.com/v1/flood"


def pedir(url, params, intentos=4):
    for k in range(intentos):
        try:
            r = requests.get(url, params=params, timeout=180)
            if r.ok:
                return r.json()
            print("  respuesta", r.status_code, r.text[:120], flush=True)
        except requests.RequestException as e:
            print("  error", e, flush=True)
        time.sleep(15 * (k + 1))
    return None


def lluvia_ecmwf(puntos: pd.DataFrame, hoy: str) -> dict:
    """Celda de 0,25° → (fechas, matriz miembros × días) de lluvia diaria (mm): los 2 días anteriores a hoy y los del pronóstico.

    Pronóstico: ensamble del ECMWF (IFS, los 50 miembros perturbados, 0,25°) bajado de sus datos abiertos (data.ecmwf.int, CC BY 4.0), la corrida
    más reciente de 00 o 12 UTC (las que llegan a 15 días). Por Open-Meteo el mismo pedido para las 1.345 celdas gastaba más que el
    límite gratis por hora. Días de 00 a 24 UTC (3 h de diferencia con el día argentino: despreciable en sumas de 3 días).
    Días anteriores: pronóstico determinístico de corto plazo (HRES de 00 UTC de anteayer, pasos 24 y 48 h), igual para todos los
    miembros; si ya no está publicado, quedan en 0 y se avisa.
    """
    import tempfile
    import eccodes
    from ecmwf.opendata import Client
    celdas = puntos[["celda_lat", "celda_lon"]].drop_duplicates().reset_index(drop=True)
    # Grilla global de 0,25°: filas de 90° a −90°, columnas desde −180°
    idx = ((90 - celdas.celda_lat) / 0.25).round().astype(int).values * 1440 + (((celdas.celda_lon + 180) / 0.25).round().astype(int) % 1440).values
    cli, tmp = Client(source="ecmwf"), Path(tempfile.mkdtemp())

    def leer(tipo: str, stream: str, paso: int, **fecha) -> dict:
        f = tmp / f"{tipo}_{paso}.grib2"
        cli.retrieve(type=tipo, stream=stream, step=paso, param="tp", target=str(f), **fecha)
        out = {}
        with open(f, "rb") as fh:
            while (h := eccodes.codes_grib_new_from_file(fh)) is not None:
                num = eccodes.codes_get(h, "number") if eccodes.codes_is_defined(h, "number") else 0   # el determinístico no tiene miembro
                out[num] = eccodes.codes_get_values(h)[idx] * 1000   # m → mm
                eccodes.codes_release(h)
        f.unlink()
        return out

    corrida = cli.latest(type="pf", stream="enfo", step=360, param="tp")
    fecha = {"date": corrida.strftime("%Y%m%d"), "time": corrida.hour}
    # Pasos que caen a las 00 UTC; con la corrida de 12 UTC, el primer día es la tarde y noche de ese día (pasos 0 a 12)
    s0 = (24 - corrida.hour) % 24
    limites = ([0] if s0 else []) + list(range(s0, 361, 24))
    acum = []
    for s in limites:
        if s == 0:
            acum.append(np.zeros((50, len(idx))))
            continue
        m = leer("pf", "enfo", s, **fecha)
        acum.append(np.stack([m[k] for k in sorted(m)]))
        print(f"  ensamble ECMWF {corrida:%d-%m %H} UTC, paso {s} h", flush=True)
    diaria = np.clip(np.diff(np.stack(acum), axis=0), 0, None)   # días × miembros × celdas
    fechas = [(corrida + dt.timedelta(hours=s)).date().isoformat() for s in limites[:-1]]
    k0 = fechas.index(hoy) if hoy in fechas else 0
    diaria, fechas = diaria[k0:], fechas[k0:]
    previos = np.zeros((2, len(idx)))
    try:
        d2 = (dt.date.fromisoformat(fechas[0]) - dt.timedelta(days=2)).strftime("%Y%m%d")
        a24, a48 = leer("fc", "oper", 24, date=d2, time=0)[0], leer("fc", "oper", 48, date=d2, time=0)[0]
        previos = np.stack([a24, np.clip(a48 - a24, 0, None)])
    except Exception as e:   # noqa: BLE001
        print("  sin lluvia de los 2 días previos:", e, flush=True)
    todas = [(dt.date.fromisoformat(fechas[0]) - dt.timedelta(days=k)).isoformat() for k in (2, 1)] + fechas
    out = {}
    for j, c in celdas.iterrows():
        M = np.concatenate([np.repeat(previos[:, j][None, :], diaria.shape[1], axis=0), diaria[:, :, j].T], axis=1)
        out[(c.celda_lat, c.celda_lon)] = (todas, M)
    return out


def niveles_lluvia(M: np.ndarray, u: pd.Series) -> tuple[list, list]:
    """Por día (desde hoy): nivel 0-3 y probabilidad de superar el umbral del nivel alcanzado (o el de 2 años)."""
    tres = M[:, :-2] + M[:, 1:-1] + M[:, 2:]   # ventana que termina en cada día desde hoy
    niv, prob = [], []
    for d in range(min(DIAS, tres.shape[1])):
        p = [(tres[:, d] > u[k]).mean() for k in ("t2", "t5", "t10")]
        n = 3 if p[2] >= P_UMBRAL else 2 if p[1] >= P_UMBRAL else 1 if p[0] >= P_UMBRAL else 0
        niv.append(n); prob.append(round(float(p[max(0, n - 1)]), 2))
    return niv, prob


def caudales_glofas(fallas: list | None = None) -> dict:
    """estacion_id → (fechas, matriz miembros × días) de caudal de los 51 pronósticos de GloFAS (31 días pasados + 15: la altura
    de hoy depende del caudal de hasta 10 días antes y el sesgo reciente necesita días pasados con altura medida)."""
    curvas = pd.read_parquet(REF / "rios_curvas.parquet")
    info = pd.read_parquet(REF / "estaciones_ina.parquet", columns=["series_id", "estacion_id"]).set_index("series_id")
    celdas = pd.read_csv(REF / "celdas_glofas.csv").set_index("estacion_id")
    out = {}
    for sid in curvas["series_id"]:
        est = int(info.loc[sid, "estacion_id"])
        if est not in celdas.index or est in out:
            continue
        j = pedir(CRECIDA, {"latitude": celdas.loc[est, "lat_celda"], "longitude": celdas.loc[est, "lon_celda"], "daily": "river_discharge",
                            "ensemble": "true", "forecast_days": DIAS, "past_days": 31})
        time.sleep(1.5)
        if j is None:
            if fallas is not None:
                fallas.append(est)
            continue
        ks = [k for k in j["daily"] if k.startswith("river_discharge")]
        out[est] = (j["daily"]["time"], np.array([[v if v is not None else np.nan for v in j["daily"][k]] for k in ks], dtype=float))
    return out


def alturas_ina() -> pd.DataFrame:
    """Alturas medidas por el INA (promedio por día) de lo bajado y lo archivado: series_id, fecha, altura_m."""
    partes = []
    for f in [RAIZ / "data" / "raw" / "ina" / "alturas.parquet", *(RAIZ / "data" / "archivo" / "ina").glob("alturas_*.parquet")]:
        if f.exists():
            a = pd.read_parquet(f, columns=["series_id", "fecha", "altura_m"])
            a["fecha"] = pd.to_datetime(a["fecha"], utc=True).dt.tz_convert(None).dt.normalize()
            partes.append(a.groupby(["series_id", "fecha"], as_index=False)["altura_m"].mean())
    return pd.concat(partes).drop_duplicates(["series_id", "fecha"], keep="last") if partes else pd.DataFrame(columns=["series_id", "fecha", "altura_m"])


def niveles_rios(hoy: str, caudales: dict) -> dict:
    """estacion_id → niveles 0-3 por día y su probabilidad: GloFAS pasado a altura con la curva de cada estación, corrida por el
    sesgo reciente (como modelos/rios.py: diferencia media entre lo medido por el INA y la curva en los días pasados de la misma
    corrida). El error de los últimos 2 días con dato pesa más al principio y se diluye hacia el de los últimos 15 días (persistencia
    del error, que se pierde con unos 5 días de escala): sesgo(d) = e15 + (e2 − e15) × exp(−d / 5). Con menos de 5 días con dato,
    el último; sin ninguno, el de calibración. Hoy manda la altura medida."""
    import geopandas as gpd
    curvas = pd.read_parquet(REF / "rios_curvas.parquet")
    info = gpd.read_parquet(REF / "estaciones_ina.parquet").set_index("series_id")   # con geometría (punto de la estación)
    obs = {str(f["properties"]["estacion_id"]): f["properties"] for f in json.loads((WEB / "estaciones.geojson").read_text())["features"]}
    alt = alturas_ina()
    out = {}
    for _, c in curvas.iterrows():
        e = info.loc[c["series_id"]]
        est = int(e["estacion_id"])
        if est not in caudales or pd.isna(e["nivel_alerta"]) or str(est) in out:
            continue
        fechas, Q = pd.to_datetime(caudales[est][0]), caudales[est][1]
        curva = lambda q: np.interp(np.log1p(q), c["x_log_caudal"], c["y_altura"])
        des = int(c["desfase_dias"])   # el caudal llega a la escala unos días después
        # Sesgo reciente: altura medida − curva(caudal mediano del ensamble) en los días pasados (fecha de la altura = caudal + desfase)
        med = pd.Series(curva(np.nanmedian(Q, axis=0)), index=fechas + pd.Timedelta(days=des))
        m = alt[alt["series_id"] == c["series_id"]].set_index("fecha")["altura_m"]
        comun = med.index[(med.index <= pd.Timestamp(hoy)) & med.index.isin(m.index)][-15:]
        try:
            ho = float(obs.get(str(est), {}).get("h"))
        except (TypeError, ValueError):
            ho = None
        err = (m.loc[comun] - med.loc[comun]).astype(float)
        e15 = float(err.mean()) if len(comun) >= 5 else float(err.iloc[-1]) if len(comun) else float(c["sesgo_calibracion"])
        e2 = float(err.iloc[-2:].mean()) if len(comun) else e15
        sesgo_dia = [e15 + (e2 - e15) * math.exp(-d / 5) for d in range(DIAS)]
        sesgo = e2
        H = curva(Q)
        alerta, evac = float(e["nivel_alerta"]), e["nivel_evacuacion"]
        evac = float(evac) if pd.notna(evac) else None
        i0 = int(np.searchsorted(fechas.values, np.datetime64(hoy)))
        niv, prob = [], []
        for d in range(DIAS):
            k = i0 + d - des
            h = H[:, k][~np.isnan(H[:, k])] + sesgo_dia[d] if 0 <= k < H.shape[1] else np.array([])
            pa = float((h >= alerta).mean()) if len(h) else 0.0
            pe = float((h >= evac).mean()) if len(h) and evac else 0.0
            n = 3 if pe >= P_ALTA else 2 if pe >= P_UMBRAL else 1 if pa >= P_UMBRAL else 0
            if d == 0 and ho is not None:   # hoy manda lo medido por el INA
                n = 3 if evac and ho >= evac else 1 if ho >= alerta else 0
                pe = pa = 1.0 if n else 0.0
            niv.append(n); prob.append(round(pe if n >= 2 else pa, 2))
        out[str(est)] = {"n": niv, "p": prob, "lat": e.geometry.y, "lon": e.geometry.x, "nombre": e["estacion"], "sesgo": round(sesgo, 2),
                         "sesgo_dias": int(len(comun))}
    return out


def alertas_smn(puntos: pd.DataFrame, dias: list) -> dict:
    """cmu → niveles 0-3 por día de las alertas vigentes del SMN que cubren su punto."""
    from shapely.geometry import Point, shape
    out = {}
    try:
        al = json.loads((WEB / "alertas.geojson").read_text())["features"]
    except (OSError, ValueError):
        return out
    nivel = {"amarilla": 1, "naranja": 2, "roja": 3}
    for f in al:
        pr, g = f["properties"], shape(f["geometry"])
        n = nivel.get(pr.get("nivel"))
        if not n or pr.get("tipo") not in ("tormentas", "lluvias"):   # calor, viento, nieve o zonda no inundan
            continue
        vence = (pr.get("vence") or dias[0])[:10]
        for r in puntos.itertuples():
            if g.bounds[0] <= r.lon <= g.bounds[2] and g.bounds[1] <= r.lat <= g.bounds[3] and g.contains(Point(r.lon, r.lat)):
                v = out.setdefault(r.cmu, [0] * DIAS)
                for d, iso in enumerate(dias):
                    if iso <= vence:
                        v[d] = max(v[d], n)
    return out


def combinar(a: float, b: float) -> float:
    """Dos amenazas de 0 a 10 combinadas como en el índice: 10 − (10 − a)(10 − b)/10."""
    return 10 - (10 - a) * (10 - b) / 10


def amenaza_fija(f, lluvia: float = F_NORMAL) -> float:
    """Agua en superficie y quebradas del índice (0 a 10) con un factor de lluvia: con lluvia normal (0,5) es la amenaza fija que
    entra al riesgo de cada día; con 1 es la propensión del lugar que se muestra como subindicador (cuánto junta agua el terreno)."""
    ha = 10 * min(1.0, float(f["P_agua"])) * lluvia
    hq = 10 * min(1.0, float(f["s_quebrada"])) * lluvia * (0.5 + 0.5 * min(1.0, float(f["arcilla_rel"])))
    return combinar(ha, hq)


def guardado(nombre: str, fn, valido=lambda v: True):
    """Resultado de fn guardado en data/procesado/riesgo_diario/<nombre>.pkl (cada parte por separado: si algo falla después,
    no se vuelve a bajar lo que ya estaba)."""
    f = RAIZ / "data" / "procesado" / "riesgo_diario" / f"{nombre}.pkl"
    if f.exists():
        return pickle.loads(f.read_bytes())
    v = fn()
    if valido(v):   # lo incompleto (p. ej. estaciones sin respuesta) no se guarda: la próxima corrida lo vuelve a pedir
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_bytes(pickle.dumps(v))
    return v


def km(lat1, lon1, lat2, lon2):
    a = math.sin(math.radians(lat2 - lat1) / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


def main() -> None:
    hoy = dt.datetime.now(dt.timezone(dt.timedelta(hours=-3))).date().isoformat()
    dias = [(dt.date.fromisoformat(hoy) + dt.timedelta(days=d)).isoformat() for d in range(DIAS)]
    puntos = pd.read_csv(REF / "puntos_gobiernos_locales.csv", dtype={"cmu": str})
    puntos["celda_lat"], puntos["celda_lon"] = (puntos.lat / 0.25).round() * 0.25, (puntos.lon / 0.25).round() * 0.25
    umb = pd.read_parquet(REF / "umbrales_lluvia_municipios.parquet").astype({"cmu": str}).set_index("cmu")
    idx = pd.read_parquet(RAIZ / "data" / "gold" / "indice_riesgo_mensual.parquet").astype({"cmu": str}).drop_duplicates("cmu").set_index("cmu")
    # Lo bajado se guarda por día: correrlo de nuevo el mismo día no vuelve a bajar nada
    lluvia = guardado(f"{hoy}_lluvia", lambda: lluvia_ecmwf(puntos, hoy))
    fallas = []
    caudales = guardado(f"{hoy}_glofas", lambda: caudales_glofas(fallas), valido=lambda v: not fallas)
    rios = niveles_rios(hoy, caudales)
    if fallas:
        print(f"  {len(fallas)} estaciones sin pronóstico de GloFAS (Open-Meteo no respondió)", flush=True)
    smn = alertas_smn(puntos, dias)
    salida, sin_lluvia = {}, 0
    for r in puntos.itertuples():
        n, p = [0] * DIAS, [0.0] * DIAS
        fuente = {"l": [0] * DIAS, "q": [0] * DIAS, "a": [0] * DIAS}   # nivel por lluvia, río y alerta
        L = lluvia.get((r.celda_lat, r.celda_lon))
        if L and r.cmu in umb.index:
            nl, pl = niveles_lluvia(L[1], umb.loc[r.cmu])
            propenso = float(idx.loc[r.cmu, "P_agua"]) >= 0.15 if r.cmu in idx.index else True
            for d in range(len(nl)):
                v = nl[d] if propenso else max(0, nl[d] - 1)
                fuente["l"][d] = v
                if v > n[d]: n[d], p[d] = v, pl[d]
        else:
            sin_lluvia += 1
        for est, R in rios.items():
            dist = km(r.lat, r.lon, R["lat"], R["lon"])
            if dist > 30:
                continue
            for d in range(DIAS):
                v = R["n"][d] if dist <= 15 else max(0, R["n"][d] - 1)
                fuente["q"][d] = max(fuente["q"][d], v)
                if v > n[d]: n[d], p[d] = v, R["p"][d]
        for d, v in enumerate(smn.get(r.cmu, [])):
            fuente["a"][d] = v
            if v > n[d]: n[d], p[d] = v, 1.0
        E = float(idx.loc[r.cmu, "E"]) if r.cmu in idx.index else 0.0
        V = float(idx.loc[r.cmu, "V"]) if r.cmu in idx.index else 0.0
        hf = amenaza_fija(idx.loc[r.cmu]) if r.cmu in idx.index else 0.0
        prop = amenaza_fija(idx.loc[r.cmu], 1.0) if r.cmu in idx.index else 0.0
        riesgo = [round((combinar(hf, H_NIVEL[v]) * E * V) ** (1 / 3), 1) for v in n]
        digitos = lambda xs: "".join(str(x) for x in xs)
        salida[r.cmu] = {"r": riesgo, "n": digitos(n), **{k: digitos(v) for k, v in fuente.items()}, "p": p, "hf": round(hf, 2), "pr": round(prop, 1)}
    res = {"generado": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"), "dias": dias, "umbral_p": P_UMBRAL, "h_nivel": H_NIVEL,
           "fuentes": {"lluvia": "Ensamble ECMWF IFS 0,25° (50 miembros, datos abiertos del ECMWF, CC BY 4.0)", "umbrales": "ERA5-Land 1995-2024, Gumbel",
                       "rios": f"GloFAS (51 miembros) + curva de cada estación; hoy, INA ({len(rios)} estaciones)", "alertas": "SMN vigentes",
                       "fija": "Propensión del índice con lluvia normal (agua en superficie y quebradas)"},
           "sin_lluvia": sin_lluvia, "cmu": salida,
           "est": {e: {"n": "".join(str(x) for x in R["n"]), "p": R["p"]} for e, R in rios.items()}}
    (WEB / "riesgo_diario.json").write_text(json.dumps(res, separators=(",", ":")))
    arch = RAIZ / "data" / "archivo" / "riesgo_diario"
    arch.mkdir(parents=True, exist_ok=True)
    (arch / f"{hoy}.json").write_text(json.dumps(res, separators=(",", ":")))
    cuenta = pd.Series([max(v["n"]) for v in salida.values()]).value_counts().sort_index().to_dict()   # máximo dígito
    print(f"riesgo_diario: {len(salida)} gobiernos locales, {len(rios)} estaciones, sin lluvia {sin_lluvia}; nivel máximo en 14 días: {cuenta}")


if __name__ == "__main__":
    main()

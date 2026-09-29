"""Riesgo de crecida en ríos grandes: probabilidad de superar el nivel de alerta / evacuación del INA.

Para cada estación del INA con niveles oficiales:
1. Curva caudal → altura: regresión isotónica (monótona creciente) de la altura observada (INA)
   contra el caudal de GloFAS en la celda del río, con el desfase de días (0-10) que mejor ajusta.
   Entrenamiento: sep-2015 → jun-2016 (Niño con crecida) y sep-2021 → jun-2022 (bajante histórica).
2. Validación fuera de muestra: sep-2023 → jun-2024 (Niño). Métricas por estación: correlación,
   error medio (m), y detección de días sobre el nivel de alerta (aciertos y falsas alarmas).
   Solo se usan en el pronóstico las estaciones que validan bien (r ≥ 0,7).
3. Pronóstico: cada día del pronóstico GloFAS trae cuantiles del ensamble (mín, p25, mediana, p75, máx).
   Se convierten a altura con la curva y se interpola la probabilidad de superar cada nivel
   (distribución lineal por tramos entre cuantiles). Por mes: probabilidad máxima diaria
   (≈ probabilidad de que el nivel se supere al menos un día).

Salidas: data/gold/rios_pronostico_mensual.parquet, data/gold/rios_validacion.parquet,
         data/gold/rios_metricas.json
"""
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
from sklearn.isotonic import IsotonicRegression

RAIZ = Path(__file__).resolve().parents[1]
RAW = RAIZ / "data" / "raw"
GOLD = RAIZ / "data" / "gold"
ENTRENAMIENTO = [("2015-09-01", "2016-06-30"), ("2021-09-01", "2022-06-30")]
VALIDACION = ("2023-09-01", "2024-06-30")
R_MINIMO = 0.7
CUANTILES = [("river_discharge_min", 0.0), ("river_discharge_p25", 0.25), ("river_discharge_median", 0.5),
             ("river_discharge_p75", 0.75), ("river_discharge_max", 1.0)]


def en_ventanas(fechas: pd.Series, ventanas) -> pd.Series:
    m = pd.Series(False, index=fechas.index)
    for ini, fin in ventanas:
        m |= fechas.between(ini, fin)
    return m


def datos():
    cal = pd.concat(pd.read_parquet(f) for f in (RAW / "glofas" / "calibracion").glob("estacion_*.parquet"))
    cal["fecha"] = pd.to_datetime(cal["fecha"])
    alt = pd.read_parquet(RAW / "ina" / "alturas.parquet")
    alt["fecha"] = alt["fecha"].dt.tz_convert(None).dt.normalize()
    ser = gpd.read_parquet(RAW / "ina" / "series.parquet")
    ser = ser[ser["nivel_alerta"].notna()]
    alt = alt.groupby(["series_id", "fecha"], as_index=False)["altura_m"].mean() \
        .merge(ser[["series_id", "estacion_id"]], on="series_id")
    return cal, alt, ser


def ajustar_estacion(q: pd.DataFrame, h: pd.DataFrame):
    """Devuelve (modelo, desfase_dias, r_entrenamiento) eligiendo el desfase con mejor ajuste en entrenamiento."""
    mejor = None
    for lag in range(0, 11):
        qq = q.assign(fecha=q["fecha"] + pd.Timedelta(days=lag))
        m = h.merge(qq, on="fecha").dropna()
        tr = m[en_ventanas(m["fecha"], ENTRENAMIENTO)]
        if len(tr) < 60:
            continue
        iso = IsotonicRegression(out_of_bounds="clip").fit(np.log1p(tr["caudal_m3s"]), tr["altura_m"])
        r = np.corrcoef(iso.predict(np.log1p(tr["caudal_m3s"])), tr["altura_m"])[0, 1]
        if mejor is None or r > mejor[2]:
            mejor = (iso, lag, r)
    return mejor


def sesgo_reciente(iso, lag, h: pd.DataFrame, q: pd.DataFrame) -> float:
    """Sesgo de la curva en los últimos 30 días con caudal y altura disponibles (retroalimentación)."""
    m = h.merge(q.assign(fecha=q["fecha"] + pd.Timedelta(days=lag)), on="fecha").dropna()
    if m.empty:
        return 0.0
    ult = m[m["fecha"] > m["fecha"].max() - pd.Timedelta(days=30)]
    return float((ult["altura_m"] - iso.predict(np.log1p(ult["caudal_m3s"]))).mean())


def prob_superar(alturas_cuantiles: np.ndarray, nivel: float) -> float:
    """P(altura > nivel) con una distribución lineal por tramos entre los cuantiles del ensamble."""
    probs = np.array([p for _, p in CUANTILES])
    h = np.maximum.accumulate(alturas_cuantiles)  # la curva es monótona, pero por las dudas
    if nivel <= h[0]:
        return 1.0
    if nivel >= h[-1]:
        return 0.0
    return float(1 - np.interp(nivel, h, probs))


def main() -> None:
    cal, alt, ser = datos()
    info = ser.drop_duplicates("series_id").set_index("series_id")
    validacion, modelos = [], {}
    for sid, h in alt.groupby("series_id"):
        est = info.loc[sid, "estacion_id"]
        q = cal[cal["estacion_id"] == est][["fecha", "caudal_m3s"]]
        if q.empty:
            continue
        ajuste = ajustar_estacion(q, h[["fecha", "altura_m"]])
        if ajuste is None:
            continue
        iso, lag, r_tr = ajuste
        m = h.merge(q.assign(fecha=q["fecha"] + pd.Timedelta(days=lag)), on="fecha").dropna()
        te = m[m["fecha"].between(*VALIDACION)]
        if len(te) < 60:
            continue
        # Retroalimentación: el corrimiento (sesgo) de la curva se estima con los últimos 30 días
        # observados ANTES del período evaluado (sep-2023) y se evalúa desde oct-2023 en adelante.
        calentamiento = te[te["fecha"] < pd.Timestamp(VALIDACION[0]) + pd.Timedelta(days=30)]
        te = te[te["fecha"] >= pd.Timestamp(VALIDACION[0]) + pd.Timedelta(days=30)]
        sesgo = float((calentamiento["altura_m"] - iso.predict(np.log1p(calentamiento["caudal_m3s"]))).mean()) \
            if len(calentamiento) >= 10 else 0.0
        pred_sin = iso.predict(np.log1p(te["caudal_m3s"]))
        pred = pred_sin + sesgo
        alerta = info.loc[sid, "nivel_alerta"]
        obs_sobre, pred_sobre = te["altura_m"].values > alerta, pred > alerta
        fila = {
            "series_id": sid, "estacion_id": est, "estacion": info.loc[sid, "estacion"], "rio": info.loc[sid, "rio"],
            "desfase_dias": lag, "r_entrenamiento": round(r_tr, 3),
            "r_validacion": round(float(np.corrcoef(pred, te["altura_m"])[0, 1]), 3),
            "error_medio_m": round(float(np.mean(np.abs(pred - te["altura_m"]))), 2),
            "error_medio_sin_correccion_m": round(float(np.mean(np.abs(pred_sin - te["altura_m"]))), 2),
            "sesgo_corregido_m": round(sesgo, 2),
            "dias_sobre_alerta_obs": int(obs_sobre.sum()), "dias_sobre_alerta_pred": int(pred_sobre.sum()),
            "aciertos_alerta": int((obs_sobre & pred_sobre).sum()),
            "falsas_alarmas": int((~obs_sobre & pred_sobre).sum()),
        }
        validacion.append(fila)
        if fila["r_validacion"] >= R_MINIMO:
            # Para el pronóstico, el sesgo se recalcula con las alturas observadas más recientes
            modelos[sid] = (iso, lag, sesgo_reciente(iso, lag, h, cal[cal["estacion_id"] == est]))
    val = pd.DataFrame(validacion).sort_values("r_validacion", ascending=False)

    # Pronóstico: último archivo de GloFAS disponible (descarga local o archivo automático de Actions)
    carpetas = sorted([p for p in (RAW / "glofas").glob("20*") if p.is_dir()] +
                      [p for p in (RAIZ / "data" / "archivo" / "glofas").glob("20*") if p.is_dir()])
    pron = pd.concat(pd.read_parquet(p) for p in carpetas[-1].glob("estacion_*.parquet"))
    pron["fecha"] = pd.to_datetime(pron["fecha"])
    corrida = pd.Timestamp(carpetas[-1].name)
    # Retroalimentación operativa: si la corrida trae días pasados, el sesgo se recalcula con esos días
    # y las alturas observadas más recientes (descarga local + archivo diario de GitHub Actions)
    recientes = [alt]
    for f in (RAIZ / "data" / "archivo" / "ina").glob("alturas_*.parquet"):
        a = pd.read_parquet(f)
        a["fecha"] = pd.to_datetime(a["fecha"], utc=True).dt.tz_convert(None).dt.normalize()
        recientes.append(a.groupby(["series_id", "fecha"], as_index=False)["altura_m"].mean())
    alt_rec = pd.concat(recientes).drop_duplicates(["series_id", "fecha"], keep="last")
    pasados = pron[pron["fecha"] < corrida].rename(columns={"river_discharge": "caudal_m3s"})
    for sid, (iso, lag, sesgo) in list(modelos.items()):
        q = pasados[pasados["estacion_id"] == info.loc[sid, "estacion_id"]][["fecha", "caudal_m3s"]]
        h = alt_rec[alt_rec["series_id"] == sid][["fecha", "altura_m"]]
        m = h.merge(q.assign(fecha=q["fecha"] + pd.Timedelta(days=lag)), on="fecha").dropna()
        if len(m) >= 10:
            modelos[sid] = (iso, lag, sesgo_reciente(iso, lag, h, q))
    filas = []
    for sid, (iso, lag, sesgo) in modelos.items():
        est = info.loc[sid, "estacion_id"]
        p = pron[pron["estacion_id"] == est].dropna(subset=["river_discharge_median"])
        for _, d in p.iterrows():
            hq = iso.predict(np.log1p(np.array([d[c] for c, _ in CUANTILES], dtype=float))) + sesgo
            filas.append({"series_id": sid, "fecha": d["fecha"] + pd.Timedelta(days=lag),
                          "altura_mediana_m": hq[2],
                          "p_alerta": prob_superar(hq, info.loc[sid, "nivel_alerta"]),
                          "p_evacuacion": (prob_superar(hq, info.loc[sid, "nivel_evacuacion"])
                                           if pd.notna(info.loc[sid, "nivel_evacuacion"]) else np.nan)})
    diario = pd.DataFrame(filas)
    diario = diario[diario["fecha"] >= pd.Timestamp(carpetas[-1].name)]  # solo días futuros
    diario["mes"] = diario["fecha"].dt.to_period("M").astype(str)
    mensual = diario.groupby(["series_id", "mes"]).agg(
        p_alerta=("p_alerta", "max"), p_evacuacion=("p_evacuacion", "max"),
        altura_mediana_max_m=("altura_mediana_m", "max")).reset_index()
    mensual = mensual.merge(val[["series_id", "estacion_id", "estacion", "rio", "r_validacion"]], on="series_id") \
        .merge(info[["nivel_alerta", "nivel_evacuacion", "provincia"]].reset_index(), on="series_id")
    mensual["corrida_glofas"] = carpetas[-1].name

    GOLD.mkdir(parents=True, exist_ok=True)
    val.to_parquet(GOLD / "rios_validacion.parquet", index=False)
    mensual.to_parquet(GOLD / "rios_pronostico_mensual.parquet", index=False)
    resumen = {
        "estaciones_evaluadas": int(len(val)),
        "estaciones_confiables_r_ge_0_7": int((val["r_validacion"] >= R_MINIMO).sum()),
        "r_validacion_mediana": float(val["r_validacion"].median()),
        "error_medio_m_mediana_confiables": float(val.loc[val["r_validacion"] >= R_MINIMO, "error_medio_m"].median()),
        "deteccion_dias_sobre_alerta": {
            "observados": int(val["dias_sobre_alerta_obs"].sum()), "aciertos": int(val["aciertos_alerta"].sum()),
            "falsas_alarmas": int(val["falsas_alarmas"].sum())},
        "corrida_glofas": carpetas[-1].name,
    }
    (GOLD / "rios_metricas.json").write_text(json.dumps(resumen, indent=2, ensure_ascii=False))
    print(json.dumps(resumen, indent=2, ensure_ascii=False))
    print("Error medio (mediana, confiables): sin corrección",
          val.loc[val["r_validacion"] >= R_MINIMO, "error_medio_sin_correccion_m"].median(), "m → con corrección",
          val.loc[val["r_validacion"] >= R_MINIMO, "error_medio_m"].median(), "m")
    print(val.head(12)[["estacion", "rio", "desfase_dias", "r_validacion", "error_medio_m", "sesgo_corregido_m",
                        "dias_sobre_alerta_obs", "aciertos_alerta", "falsas_alarmas"]].to_string(index=False))


if __name__ == "__main__":
    main()

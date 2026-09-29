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
REF = RAIZ / "data" / "referencia"
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


def pronosticar() -> None:
    """Pronóstico diario (corre en GitHub Actions): curvas guardadas + última corrida de GloFAS +
    alturas observadas recientes del INA para recalcular el sesgo (retroalimentación)."""
    curvas = pd.read_parquet(REF / "rios_curvas.parquet").set_index("series_id")
    info = gpd.read_parquet(REF / "estaciones_ina.parquet").set_index("series_id")
    carpetas = sorted([p for p in (RAW / "glofas").glob("20*") if p.is_dir()] +
                      [p for p in (RAIZ / "data" / "archivo" / "glofas").glob("20*") if p.is_dir()],
                      key=lambda p: p.name)
    pron = pd.concat(pd.read_parquet(p) for p in carpetas[-1].glob("estacion_*.parquet"))
    pron["fecha"] = pd.to_datetime(pron["fecha"])
    corrida = pd.Timestamp(carpetas[-1].name)

    alturas = []
    for f in [RAW / "ina" / "alturas.parquet", *(RAIZ / "data" / "archivo" / "ina").glob("alturas_*.parquet")]:
        if f.exists():
            a = pd.read_parquet(f)
            a["fecha"] = pd.to_datetime(a["fecha"], utc=True).dt.tz_convert(None).dt.normalize()
            alturas.append(a.groupby(["series_id", "fecha"], as_index=False)["altura_m"].mean())
    alt = pd.concat(alturas).drop_duplicates(["series_id", "fecha"], keep="last")

    filas, sesgos = [], {}
    for sid, c in curvas.iterrows():
        def curva(q, c=c):  # interpolación lineal entre umbrales = predicción de la regresión isotónica
            return np.interp(np.log1p(q), c["x_log_caudal"], c["y_altura"])
        lag = int(c["desfase_dias"])
        p = pron[pron["estacion_id"] == info.loc[sid, "estacion_id"]]
        # Sesgo con los días pasados de esta corrida y las alturas observadas (si hay ≥ 10 días en común)
        pas = p[p["fecha"] < corrida][["fecha", "river_discharge"]].dropna()
        m = alt[alt["series_id"] == sid].merge(pas.assign(fecha=pas["fecha"] + pd.Timedelta(days=lag)), on="fecha")
        reciente = len(m) >= 10
        sesgo = float((m["altura_m"] - curva(m["river_discharge"])).mean()) if reciente \
            else float(c["sesgo_calibracion"])
        sesgos[sid] = {"sesgo_m": round(sesgo, 2), "dias_para_sesgo": int(len(m)),
                       "fuente_sesgo": "reciente" if reciente else "calibracion"}
        for _, d in p[p["fecha"] >= corrida].dropna(subset=["river_discharge_median"]).iterrows():
            hq = curva(np.array([d[q] for q, _ in CUANTILES], dtype=float)) + sesgo
            filas.append({"series_id": sid, "fecha": d["fecha"] + pd.Timedelta(days=lag), "altura_mediana_m": hq[2],
                          "p_alerta": prob_superar(hq, info.loc[sid, "nivel_alerta"]),
                          "p_evacuacion": (prob_superar(hq, info.loc[sid, "nivel_evacuacion"])
                                           if pd.notna(info.loc[sid, "nivel_evacuacion"]) else np.nan)})
    diario = pd.DataFrame(filas)
    foto = RAIZ / "data" / "archivo" / "rios" / f"{carpetas[-1].name}.parquet"
    foto.parent.mkdir(parents=True, exist_ok=True)
    diario[["series_id", "fecha", "altura_mediana_m", "p_alerta", "p_evacuacion"]].round(3).to_parquet(foto, index=False)
    diario["mes"] = diario["fecha"].dt.to_period("M").astype(str)
    mensual = diario.groupby(["series_id", "mes"]).agg(
        p_alerta=("p_alerta", "max"), p_evacuacion=("p_evacuacion", "max"),
        altura_mediana_max_m=("altura_mediana_m", "max")).reset_index()
    mensual = mensual.merge(info[["estacion_id", "estacion", "rio", "provincia", "nivel_alerta", "nivel_evacuacion",
                                  "r_validacion"]].reset_index(), on="series_id")
    mensual = mensual.merge(pd.DataFrame(sesgos).T.rename_axis("series_id").reset_index(), on="series_id")
    mensual["corrida_glofas"] = carpetas[-1].name
    GOLD.mkdir(parents=True, exist_ok=True)
    mensual.to_parquet(GOLD / "rios_pronostico_mensual.parquet", index=False)
    print(f"Ríos: corrida GloFAS {carpetas[-1].name}; sesgo reciente en "
          f"{sum(v['fuente_sesgo'] == 'reciente' for v in sesgos.values())}/{len(sesgos)} estaciones")


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

    # Se guardan las curvas en data/referencia (versionado) para el pronóstico diario en GitHub Actions
    REF.mkdir(parents=True, exist_ok=True)
    pd.DataFrame([{"series_id": sid, "desfase_dias": lag, "sesgo_calibracion": sesgo,
                   "x_log_caudal": iso.X_thresholds_.tolist(), "y_altura": iso.y_thresholds_.tolist()}
                  for sid, (iso, lag, sesgo) in modelos.items()]).to_parquet(REF / "rios_curvas.parquet", index=False)
    est = ser.drop_duplicates("series_id")[["series_id", "estacion_id", "estacion", "rio", "provincia",
                                            "nivel_alerta", "nivel_evacuacion", "geometry"]]
    est = est.merge(val[["series_id", "r_validacion"]], on="series_id", how="left")
    est.to_parquet(REF / "estaciones_ina.parquet", index=False)

    GOLD.mkdir(parents=True, exist_ok=True)
    val.to_parquet(GOLD / "rios_validacion.parquet", index=False)
    resumen = {
        "estaciones_evaluadas": int(len(val)),
        "estaciones_confiables_r_ge_0_7": int((val["r_validacion"] >= R_MINIMO).sum()),
        "r_validacion_mediana": float(val["r_validacion"].median()),
        "error_medio_m_mediana_confiables": float(val.loc[val["r_validacion"] >= R_MINIMO, "error_medio_m"].median()),
        "deteccion_dias_sobre_alerta": {
            "observados": int(val["dias_sobre_alerta_obs"].sum()), "aciertos": int(val["aciertos_alerta"].sum()),
            "falsas_alarmas": int(val["falsas_alarmas"].sum())},
    }
    (GOLD / "rios_metricas.json").write_text(json.dumps(resumen, indent=2, ensure_ascii=False))
    print(json.dumps(resumen, indent=2, ensure_ascii=False))
    print("Error medio (mediana, confiables): sin corrección",
          val.loc[val["r_validacion"] >= R_MINIMO, "error_medio_sin_correccion_m"].median(), "m → con corrección",
          val.loc[val["r_validacion"] >= R_MINIMO, "error_medio_m"].median(), "m")
    print(val.head(12)[["estacion", "rio", "desfase_dias", "r_validacion", "error_medio_m", "sesgo_corregido_m",
                        "dias_sobre_alerta_obs", "aciertos_alerta", "falsas_alarmas"]].to_string(index=False))


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "pronostico":
        pronosticar()          # GitHub Actions: sin datos crudos
    else:
        main()                 # calibración + validación (Mac, con datos crudos)
        pronosticar()

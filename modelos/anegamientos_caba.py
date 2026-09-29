"""Anegamientos urbanos en CABA: reclamos pluviales al 147 esperados según la lluvia, por barrio.

Modelo: regresión binomial negativa (GLM) de los reclamos pluviales diarios de cada barrio contra:
- lluvia del día, del día anterior y acumulada en 3 días (ERA5 vía Open-Meteo), en escala log(1 + mm);
- efecto fijo de barrio (capacidad de drenaje, cuenca, sumideros);
- día de la semana (se reclama menos los fines de semana);
- régimen de registro 2020+ (el sistema de reclamos cambió y los pluviales bajaron ~50 %).

Entrenamiento: 2014-2022 (2011-2013 excluidos: 2012 y 2013 están incompletos en el portal).
Validación fuera de muestra: 2023 → 2026 (incluye El Niño 2023-24).
Línea base: promedio histórico del barrio para el mismo mes (sin lluvia).

Pronóstico 2026-27 (método delta): para cada mes se toman los días de lluvia observados de ese mes en
2014-2025 y se escalan por el cociente (lluvia pronosticada SEAS5 / normal) de CABA; se aplica el modelo
a esas series y se promedia → reclamos esperados por barrio y mes, con banda entre años (p10-p90).

Salidas: data/gold/anegamientos_caba_pronostico.parquet, data/gold/anegamientos_caba_metricas.json
"""
import json
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf
from scipy.stats import spearmanr

RAIZ = Path(__file__).resolve().parents[1]
RAW = RAIZ / "data" / "raw"
GOLD = RAIZ / "data" / "gold"


def norm(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().upper().strip()


def panel() -> pd.DataFrame:
    r = pd.read_parquet(RAIZ / "data" / "silver" / "reclamos_caba_diarios.parquet")
    r = r[r["tipo"] == "pluvial"].groupby(["fecha", "barrio"])["reclamos"].sum().reset_index()
    ll = pd.read_parquet(RAW / "open_meteo" / "lluvia_diaria_caba.parquet")
    ll["barrio"] = ll["barrio"].map(norm)
    ll["fecha"] = pd.to_datetime(ll["fecha"])
    ll = ll.sort_values(["barrio", "fecha"])
    ll["lluvia_mm"] = ll["lluvia_mm"].fillna(0)
    ll["lluvia_ayer"] = ll.groupby("barrio")["lluvia_mm"].shift(1).fillna(0)
    ll["lluvia_3d"] = ll.groupby("barrio")["lluvia_mm"].transform(lambda s: s.rolling(3, min_periods=1).sum())
    df = ll.merge(r, on=["fecha", "barrio"], how="left").fillna({"reclamos": 0})
    df = df[df["fecha"].dt.year >= 2014]
    df["anio"] = df["fecha"].dt.year
    df["mes"] = df["fecha"].dt.month
    df["dia_semana"] = df["fecha"].dt.dayofweek.astype(str)
    df["regimen_2020"] = (df["anio"] >= 2020).astype(int)
    for c in ["lluvia_mm", "lluvia_ayer", "lluvia_3d"]:
        df[f"log_{c}"] = np.log1p(df[c])
    return df


FORMULA = ("reclamos ~ log_lluvia_mm + log_lluvia_ayer + log_lluvia_3d + log_lluvia_mm:log_lluvia_3d"
           " + C(barrio) + C(dia_semana) + regimen_2020")


def main() -> None:
    df = panel()
    tr, te = df[df["anio"] <= 2022], df[df["anio"] >= 2023].copy()
    m = smf.glm(FORMULA, data=tr, family=sm.families.NegativeBinomial(alpha=1.0)).fit()
    te["pred"] = m.predict(te)
    base = tr.groupby(["barrio", "mes"])["reclamos"].mean().rename("base")
    te = te.merge(base, on=["barrio", "mes"], how="left")
    # La línea base histórica mezcla regímenes: se reescala al nivel 2020-2022
    te["base"] *= tr.loc[tr["regimen_2020"] == 1, "reclamos"].mean() / tr["reclamos"].mean()

    ciudad = te.groupby("fecha")[["reclamos", "pred", "base"]].sum()
    llovio = te.groupby("fecha")["lluvia_mm"].mean() >= 20
    semanal = te.groupby([pd.Grouper(key="fecha", freq="W"), "barrio"])[["reclamos", "pred", "base"]].sum()
    metricas = {
        "correlacion_diaria_ciudad": {"modelo": round(float(ciudad[["reclamos", "pred"]].corr().iloc[0, 1]), 3),
                                      "linea_base": round(float(ciudad[["reclamos", "base"]].corr().iloc[0, 1]), 3)},
        "dias_lluvia_20mm_o_mas": {
            "n": int(llovio.sum()), "reclamos_obs": int(ciudad.loc[llovio, "reclamos"].sum()),
            "reclamos_modelo": int(ciudad.loc[llovio, "pred"].sum()),
            "reclamos_linea_base": int(ciudad.loc[llovio, "base"].sum())},
        "spearman_barrios_total_periodo": round(float(spearmanr(
            te.groupby("barrio")["reclamos"].sum(), te.groupby("barrio")["pred"].sum()).statistic), 3),
        "mae_semanal_por_barrio": {"modelo": round(float((semanal["pred"] - semanal["reclamos"]).abs().mean()), 3),
                                   "linea_base": round(float((semanal["base"] - semanal["reclamos"]).abs().mean()), 3)},
        "coeficientes_lluvia": {k: round(float(v), 3) for k, v in m.params.items() if "lluvia" in k},
    }
    print(json.dumps(metricas, indent=2, ensure_ascii=False))

    # Pronóstico 2026-27 con método delta
    final = smf.glm(FORMULA, data=df, family=sm.families.NegativeBinomial(alpha=1.0)).fit()
    est = pd.read_parquet(sorted((RAW / "open_meteo").glob("estacional_2*.parquet"))[-1])
    caba_cmu = pd.read_csv(RAIZ / "data" / "referencia" / "puntos_gobiernos_locales.csv", dtype={"cmu": str})
    caba_cmu = caba_cmu[caba_cmu["cmu"].str.startswith("02")]["cmu"]
    e = est[est["cmu"].isin(caba_cmu)].groupby(["mes", "variable"])["valor"].mean().unstack()
    e["factor"] = (e["precipitation_mean"] / (e["precipitation_mean"] - e["precipitation_anomaly"])).clip(0.2, 3)
    filas = []
    hist = df[(df["anio"] <= 2025)]
    for mes_txt, factor in e["factor"].items():
        mes = int(mes_txt[5:7])
        if mes_txt < "2026-10":
            continue
        sub = hist[hist["mes"] == mes].copy()
        for c in ["lluvia_mm", "lluvia_ayer", "lluvia_3d"]:
            sub[f"log_{c}"] = np.log1p(sub[c] * factor)
        sub["regimen_2020"] = 1
        sub["pred"] = final.predict(sub)
        por_anio = sub.groupby(["barrio", "anio"])["pred"].sum().reset_index()
        neutro = hist[hist["mes"] == mes].assign(regimen_2020=1)
        neutro["pred"] = final.predict(neutro)
        normal = neutro.groupby("barrio")["pred"].sum() / neutro["anio"].nunique()
        resumen = por_anio.groupby("barrio")["pred"].agg(
            esperado="mean", p10=lambda s: s.quantile(0.1), p90=lambda s: s.quantile(0.9)).reset_index()
        resumen["con_lluvia_normal"] = resumen["barrio"].map(normal)
        resumen["mes"], resumen["factor_lluvia_seas5"] = mes_txt[:7], round(float(factor), 2)
        filas.append(resumen)
    pron = pd.concat(filas, ignore_index=True)
    GOLD.mkdir(parents=True, exist_ok=True)
    pron.to_parquet(GOLD / "anegamientos_caba_pronostico.parquet", index=False)
    (GOLD / "anegamientos_caba_metricas.json").write_text(json.dumps(metricas, indent=2, ensure_ascii=False))
    tot = pron.groupby("mes")[["esperado", "con_lluvia_normal", "p10", "p90"]].sum().round(0)
    tot["factor_lluvia"] = pron.groupby("mes")["factor_lluvia_seas5"].first()
    print(tot.to_string())


if __name__ == "__main__":
    main()

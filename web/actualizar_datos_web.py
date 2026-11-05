"""Escribe los NÚMEROS de la web que cambian cada día (corre en GitHub Actions después del índice).

- riesgo.json: por gobierno local y mes, riesgo, personas en riesgo y amenaza (con sus 3 componentes);
  además exposición, vulnerabilidad y robustez. El navegador lo une a municipios_geo.geojson.
- estaciones.geojson: estaciones del INA con la altura medida más reciente (estado: normal, alerta o evacuación,
  y cambio en 24 h) y, en las que validan bien, la probabilidad mensual de alerta y evacuación (escenario GloFAS).
- resumen.json: indicadores nacionales por mes, rankings y fechas de las corridas.

No necesita datos crudos: solo data/gold y data/referencia (versionados).
"""
import glob
import json
from pathlib import Path

import geopandas as gpd
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
GOLD = RAIZ / "data" / "gold"
SALIDA = Path(__file__).resolve().parent / "datos"


def estado_actual_rios(est: gpd.GeoDataFrame) -> pd.DataFrame:
    """Última altura medida por estación (archivo diario del INA), cambio en 24 h y estado frente a sus niveles."""
    archivos = sorted(glob.glob(str(RAIZ / "data" / "archivo" / "ina" / "alturas_*.parquet")))
    if not archivos:
        return pd.DataFrame(columns=["estacion_id", "h", "hf", "dh", "estado"])
    alt = pd.read_parquet(archivos[-1]).dropna(subset=["altura_m"]).sort_values("fecha")
    filas = []
    for sid, g in alt.groupby("series_id"):
        ultima = g.iloc[-1]
        antes = g[g["fecha"] <= ultima["fecha"] - pd.Timedelta(hours=20)]
        filas.append({"series_id": sid, "h": round(float(ultima["altura_m"]), 2), "fecha": ultima["fecha"],
                      "dh": round(float(ultima["altura_m"] - antes.iloc[-1]["altura_m"]), 2) if len(antes) else None})
    a = pd.DataFrame(filas).merge(est[["series_id", "estacion_id", "nivel_alerta", "nivel_evacuacion"]], on="series_id")
    a = a.sort_values("fecha").drop_duplicates("estacion_id", keep="last")
    # Series con otra referencia de altura (p. ej. cota sobre el nivel del mar): no se comparan con los niveles
    tope = a["nivel_evacuacion"].fillna(a["nivel_alerta"]) * 2.5 + 2
    a = a[a["h"] <= tope].copy()
    a["estado"] = "normal"
    a.loc[a["h"] >= a["nivel_alerta"], "estado"] = "alerta"
    a.loc[a["nivel_evacuacion"].notna() & (a["h"] >= a["nivel_evacuacion"]), "estado"] = "evacuacion"
    a["hf"] = a["fecha"].dt.tz_convert("America/Argentina/Buenos_Aires").dt.strftime("%Y-%m-%dT%H:%M")
    return a[["estacion_id", "h", "hf", "dh", "estado"]]


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    idx = pd.read_parquet(GOLD / "indice_riesgo_mensual.parquet").sort_values(["cmu", "mes"])
    meses = sorted(idx["mes"].unique())
    pico = idx.groupby("mes")["riesgo"].mean().idxmax()

    # riesgo.json: arrays por mes (mismo orden que "meses"); formato compacto
    def serie(g, col, dec):
        return [None if pd.isna(v) else round(float(v), dec) for v in g[col]]
    # Centro poblado (web/preparar_centros.py): el tiempo de cada municipio se lee donde vive la gente
    centro = pd.read_csv(RAIZ / "data" / "referencia" / "centros_poblados.csv", dtype={"cmu": str})
    centro = {r.cmu: [round(r.lon, 3), round(r.lat, 3)] for r in centro.itertuples()}
    por_cmu = {}
    for cmu, g in idx.groupby("cmu"):
        f = g.iloc[0]
        por_cmu[cmu] = {
            "r": serie(g, "riesgo", 2), "p": serie(g, "personas_en_riesgo", 0), "h": serie(g, "H", 2),
            "ha": serie(g, "H_agua", 2), "hr": serie(g, "H_rio", 2), "hq": serie(g, "H_quebrada", 2),
            "E": round(float(f["E"]), 1), "V": round(float(f["V"]), 1),
            "rob": round(float(f["pct_simulaciones_top10"]), 1), "c": centro.get(cmu),
        }
    (SALIDA / "riesgo.json").write_text(json.dumps({"meses": meses, "cmu": por_cmu}, separators=(",", ":")))

    # Estaciones de ríos: estado actual (altura medida) + escenario mensual en las que validan bien
    est = gpd.read_parquet(RAIZ / "data" / "referencia" / "estaciones_ina.parquet")
    rios = pd.read_parquet(GOLD / "rios_pronostico_mensual.parquet")
    rios = rios[rios["r_validacion"] >= 0.7]
    pa = rios.pivot_table(index="estacion_id", columns="mes", values="p_alerta").round(2)
    pa.columns = [f"pa_{m}" for m in pa.columns]
    pe = rios.pivot_table(index="estacion_id", columns="mes", values="p_evacuacion").round(2)
    pe.columns = [f"pe_{m}" for m in pe.columns]
    actual = estado_actual_rios(est)
    e = est.sort_values("r_validacion", ascending=False).drop_duplicates("estacion_id")
    e = e.drop(columns=["series_id", "r_validacion"]).merge(actual, on="estacion_id", how="left")
    e = e.merge(pa.join(pe).reset_index(), on="estacion_id", how="left")
    e["conf"] = e["estacion_id"].isin(pa.index)
    e = e[e["conf"] | e["h"].notna()].sort_values("conf", ascending=False)
    # La misma estación publicada por otra red (a menos de ~3 km): queda una sola
    pts = e.geometry.to_crs(5345)
    quedan = []
    for i in range(len(e)):
        if all(pts.iloc[i].distance(pts.iloc[j]) > 3000 for j in quedan):
            quedan.append(i)
    e = e.iloc[quedan]
    e = e[["estacion_id", "estacion", "rio", "nivel_alerta", "nivel_evacuacion", "h", "hf", "dh", "estado", "conf",
           *pa.columns, *pe.columns, "geometry"]]
    e["geometry"] = e.geometry.set_precision(1e-4)
    (SALIDA / "estaciones.geojson").write_text(e.to_json(drop_id=True, na="null"))

    # Resumen nacional
    por_mes = idx.groupby("mes").agg(personas_en_riesgo=("personas_en_riesgo", "sum"),
                                     riesgo_medio=("riesgo", "mean"),
                                     municipios_riesgo_alto=("riesgo", lambda s: int((s >= 7).sum()))).round(1)
    est_evac = rios.drop_duplicates(["estacion_id", "mes"]).groupby("mes")["p_evacuacion"].apply(lambda s: int((s >= 0.5).sum()))
    cols = ["cmu", "nam", "jur", "riesgo", "personas_en_riesgo", "pct_simulaciones_top10"]
    ver = json.loads((GOLD / "verificacion.json").read_text()) if (GOLD / "verificacion.json").exists() else {}
    resumen = {
        "calculado": str(idx["calculado"].iloc[0]), "corrida_seas5": str(idx["corrida_seas5"].iloc[0]),
        "corrida_glofas": str(rios["corrida_glofas"].iloc[0]), "meses": meses, "mes_pico": pico,
        "peso_pronostico": float(idx["peso_pronostico"].iloc[0]),
        "verificacion_lluvia": ver.get("lluvia_16_dias", {}).get("estado", "sin verificar todavía"),
        "por_mes": {m: {**por_mes.loc[m].to_dict(), "estaciones_prob_evacuacion_50": int(est_evac.get(m, 0))}
                    for m in meses},
        "top_relativo": idx[idx["mes"] == pico].nlargest(20, "riesgo")[cols].round(2).to_dict("records"),
        "top_personas": idx[idx["mes"] == pico].nlargest(20, "personas_en_riesgo")[cols].round(2).to_dict("records"),
        "municipios": int(idx["cmu"].nunique()),
        "estaciones_confiables": int(rios["estacion_id"].nunique()),
        "rios_hoy": {k: int(v) for k, v in e["estado"].value_counts().items()},
    }
    (SALIDA / "resumen.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=1, default=float))
    for n in ("riesgo.json", "estaciones.geojson", "resumen.json"):
        print(f"{n}: {(SALIDA / n).stat().st_size / 1e3:.0f} KB")


if __name__ == "__main__":
    main()

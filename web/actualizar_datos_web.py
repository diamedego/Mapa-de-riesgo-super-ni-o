"""Escribe los NÚMEROS de la web que cambian cada día (corre en GitHub Actions después del índice).

- riesgo.json: por gobierno local y mes, riesgo, personas en riesgo y amenaza (con sus 3 componentes);
  además exposición, vulnerabilidad y robustez. El navegador lo une a municipios_geo.geojson.
- estaciones.geojson: estaciones del INA confiables con la probabilidad mensual de alerta y evacuación.
- resumen.json: indicadores nacionales por mes, rankings y fechas de las corridas.

No necesita datos crudos: solo data/gold y data/referencia (versionados).
"""
import json
from pathlib import Path

import geopandas as gpd
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
GOLD = RAIZ / "data" / "gold"
SALIDA = Path(__file__).resolve().parent / "datos"


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    idx = pd.read_parquet(GOLD / "indice_riesgo_mensual.parquet").sort_values(["cmu", "mes"])
    meses = sorted(idx["mes"].unique())
    pico = idx.groupby("mes")["riesgo"].mean().idxmax()

    # riesgo.json: arrays por mes (mismo orden que "meses"); formato compacto
    def serie(g, col, dec):
        return [None if pd.isna(v) else round(float(v), dec) for v in g[col]]
    por_cmu = {}
    for cmu, g in idx.groupby("cmu"):
        f = g.iloc[0]
        por_cmu[cmu] = {
            "r": serie(g, "riesgo", 2), "p": serie(g, "personas_en_riesgo", 0), "h": serie(g, "H", 2),
            "ha": serie(g, "H_agua", 2), "hr": serie(g, "H_rio", 2), "hq": serie(g, "H_quebrada", 2),
            "E": round(float(f["E"]), 1), "V": round(float(f["V"]), 1),
            "rob": round(float(f["pct_simulaciones_top10"]), 1),
        }
    (SALIDA / "riesgo.json").write_text(json.dumps({"meses": meses, "cmu": por_cmu}, separators=(",", ":")))

    # Estaciones de ríos (solo las que validan bien)
    est = gpd.read_parquet(RAIZ / "data" / "referencia" / "estaciones_ina.parquet")
    rios = pd.read_parquet(GOLD / "rios_pronostico_mensual.parquet")
    rios = rios[rios["r_validacion"] >= 0.7]
    pa = rios.pivot_table(index="series_id", columns="mes", values="p_alerta").round(2)
    pa.columns = [f"pa_{m}" for m in pa.columns]
    pe = rios.pivot_table(index="series_id", columns="mes", values="p_evacuacion").round(2)
    pe.columns = [f"pe_{m}" for m in pe.columns]
    e = est.drop(columns=["r_validacion"], errors="ignore").merge(pa.join(pe).reset_index(), on="series_id")
    e = e.merge(rios.drop_duplicates("series_id")[["series_id", "r_validacion"]], on="series_id")
    e = e[["series_id", "estacion", "rio", "provincia", "nivel_alerta", "nivel_evacuacion", "r_validacion",
           *pa.columns, *pe.columns, "geometry"]]
    e["r_validacion"] = e["r_validacion"].round(2)
    e["geometry"] = e.geometry.set_precision(1e-4)
    (SALIDA / "estaciones.geojson").write_text(e.to_json(drop_id=True, na="null"))

    # Resumen nacional
    por_mes = idx.groupby("mes").agg(personas_en_riesgo=("personas_en_riesgo", "sum"),
                                     riesgo_medio=("riesgo", "mean"),
                                     municipios_riesgo_alto=("riesgo", lambda s: int((s >= 7).sum()))).round(1)
    est_evac = rios.groupby("mes")["p_evacuacion"].apply(lambda s: int((s >= 0.5).sum()))
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
        "estaciones_confiables": int(rios["series_id"].nunique()),
    }
    (SALIDA / "resumen.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=1, default=float))
    for n in ("riesgo.json", "estaciones.geojson", "resumen.json"):
        print(f"{n}: {(SALIDA / n).stat().st_size / 1e3:.0f} KB")


if __name__ == "__main__":
    main()

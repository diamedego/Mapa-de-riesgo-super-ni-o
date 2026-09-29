"""Verificación continua de los pronósticos y ajuste de su peso en el índice (retroalimentación).

Cada día (GitHub Actions) compara lo pronosticado con lo que pasó:
- Lluvia a 16 días (ECMWF): cada corrida archivada vs. la lluvia de los días ya transcurridos
  (tomada de los "días pasados" de corridas posteriores, que es el análisis del modelo).
  Métricas por plazo de anticipación: correlación entre municipios, sesgo, y detección de días ≥ 20 mm.
- Ríos: altura mediana pronosticada vs. altura observada por el INA en los días ya transcurridos.

Con esas métricas calcula el PESO del pronóstico, w ∈ [0, 1]: la anomalía pronosticada se "achica"
hacia lo normal según cuánto acertó (r_ajustada = 1 + w·(r − 1)). Sin verificaciones suficientes,
w = 1 (se usa el pronóstico tal cual) y se informa como "sin verificar todavía".

Salida: data/gold/verificacion.json (lo lee modelos/indice_riesgo.py)
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
GOLD = RAIZ / "data" / "gold"
MIN_DIAS = 7


def archivos(sub: str) -> list[Path]:
    return sorted([*(RAIZ / "data" / "raw" / sub).glob("20*.parquet"),
                   *(RAIZ / "data" / "archivo" / sub).glob("20*.parquet")], key=lambda p: p.stem)


def verificar_lluvia() -> dict:
    corridas = {p.stem: pd.read_parquet(p) for p in archivos("pronostico_corto")}
    if len(corridas) < 2:
        return {"estado": "sin verificar todavía", "corridas": len(corridas)}
    # "Observado": días ya transcurridos en la corrida más reciente que los cubre
    obs = []
    for fecha_corrida, d in corridas.items():
        obs.append(d[d["fecha"] < fecha_corrida][["cmu", "fecha", "lluvia_mm"]].assign(corrida=fecha_corrida))
    obs = pd.concat(obs).sort_values("corrida").drop_duplicates(["cmu", "fecha"], keep="last") \
        .rename(columns={"lluvia_mm": "obs_mm"})
    filas = []
    for fecha_corrida, d in corridas.items():
        f = d[d["fecha"] >= fecha_corrida].merge(obs[["cmu", "fecha", "obs_mm"]], on=["cmu", "fecha"])
        if f.empty:
            continue
        f["plazo_dias"] = (pd.to_datetime(f["fecha"]) - pd.Timestamp(fecha_corrida)).dt.days
        filas.append(f)
    if not filas:
        return {"estado": "sin verificar todavía", "corridas": len(corridas)}
    v = pd.concat(filas)
    por_plazo = {}
    for plazo, g in v.groupby(pd.cut(v["plazo_dias"], [-1, 3, 7, 15], labels=["0-3", "4-7", "8-15"]), observed=True):
        lluvia_fuerte = g["obs_mm"] >= 20
        por_plazo[str(plazo)] = {
            "n": int(len(g)),
            "correlacion": round(float(g[["lluvia_mm", "obs_mm"]].corr().iloc[0, 1]), 3) if len(g) > 30 else None,
            "sesgo_mm": round(float((g["lluvia_mm"] - g["obs_mm"]).mean()), 2),
            "deteccion_20mm": round(float((g.loc[lluvia_fuerte, "lluvia_mm"] >= 20).mean()), 3)
            if lluvia_fuerte.sum() >= 5 else None}
    dias = v["fecha"].nunique()
    corr = por_plazo.get("8-15", {}).get("correlacion")
    peso = 1.0 if (dias < MIN_DIAS or corr is None) else float(np.clip(corr, 0, 1))
    return {"estado": "verificado" if dias >= MIN_DIAS else "pocos días", "dias_verificados": int(dias),
            "por_plazo": por_plazo, "peso_pronostico": round(peso, 3)}


def verificar_rios() -> dict:
    f = GOLD / "rios_pronostico_mensual.parquet"
    fotos = sorted((RAIZ / "data" / "archivo" / "rios").glob("20*.parquet"))
    if not fotos:
        return {"estado": "sin verificar todavía"}
    alt = [pd.read_parquet(p) for p in (RAIZ / "data" / "archivo" / "ina").glob("alturas_*.parquet")]
    if not alt:
        return {"estado": "sin alturas observadas archivadas"}
    a = pd.concat(alt)
    a["fecha"] = pd.to_datetime(a["fecha"], utc=True).dt.tz_convert(None).dt.normalize()
    a = a.groupby(["series_id", "fecha"], as_index=False)["altura_m"].mean()
    p = pd.concat(pd.read_parquet(x).assign(corrida=x.stem) for x in fotos)
    m = p.merge(a, on=["series_id", "fecha"])
    m = m[m["fecha"] >= pd.to_datetime(m["corrida"])]
    if len(m) < 30:
        return {"estado": "pocos días", "pares": int(len(m)), "archivo_gold": f.name}
    return {"estado": "verificado", "pares": int(len(m)),
            "error_medio_m": round(float((m["altura_mediana_m"] - m["altura_m"]).abs().mean()), 2),
            "sesgo_m": round(float((m["altura_mediana_m"] - m["altura_m"]).mean()), 2)}


def main() -> None:
    res = {"lluvia_16_dias": verificar_lluvia(), "rios": verificar_rios(),
           "actualizado": pd.Timestamp.today().date().isoformat()}
    GOLD.mkdir(parents=True, exist_ok=True)
    (GOLD / "verificacion.json").write_text(json.dumps(res, indent=2, ensure_ascii=False))
    print(json.dumps(res, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

"""Personas expuestas de cada lugar (gobierno local o zona rural), para el eje de IMPACTO del riesgo diario (modelos/riesgo_diario.py).

Como en el Manual de mapas de riesgo del Ministerio del Interior (superponer el área donde ocurre la amenaza con la población) y en
la evaluación rápida de impacto del EFAS (gente que vive dentro de la mancha de inundación), con el terreno de cada radio censal:
- pob_lluvia: personas en terreno a menos de 2 m sobre el cauce más cercano (HAND, MERIT Hydro): donde se junta el agua de lluvia;
- pob_rio: personas a menos de 5 m sobre el cauce: la llanura que cubre una crecida de río (las ciudades sobre barranca, como
  La Paz o Diamante, tienen sus barrios ribereños abajo).
Cada radio aporta su población por la fracción de su superficie bajo esa altura (no todo o nada).

Salida: data/referencia/impacto_gobiernos_locales.csv (cmu, pob_lluvia, pob_rio). Uso: .venv/bin/python transformacion/impacto.py
"""
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]


def main() -> None:
    r = pd.read_parquet(RAIZ / "data" / "referencia" / "rasgos_radios.parquet", columns=["cod_indec", "cmu", "poblacion"])
    t = pd.read_parquet(RAIZ / "data" / "raw" / "earth_engine" / "terreno_agua_radios.parquet", columns=["cod_indec", "pct_area_hand_2m", "pct_area_hand_5m"])
    r = r.dropna(subset=["cmu"]).merge(t, on="cod_indec", how="left").fillna({"pct_area_hand_2m": 0, "pct_area_hand_5m": 0})
    r["pob_lluvia"] = r["poblacion"] * r["pct_area_hand_2m"] / 100
    r["pob_rio"] = r["poblacion"] * r["pct_area_hand_5m"] / 100
    out = r.groupby("cmu")[["pob_lluvia", "pob_rio"]].sum().round(0).astype(int).reset_index()
    out.to_csv(RAIZ / "data" / "referencia" / "impacto_gobiernos_locales.csv", index=False)
    print(out.describe().round(0).to_string())


if __name__ == "__main__":
    main()

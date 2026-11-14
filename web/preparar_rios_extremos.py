"""Alturas mínimas y máximas de cada estación del INA en los Niños, para los límites de la barra del río del simulador.

Por estación (las mismas de estaciones.geojson, con nivel de alerta):
- nino: mínimo (percentil 1 y sin ceros exactos, que son falta de dato) y máximo del promedio diario en las temporadas Niño con registro (oct → may de 2015-16 y 2023-24),
  y en qué temporada fue el máximo;
- todo: mínimo y máximo de todo el registro (2015 → hoy), para cuando la estación no midió durante un Niño.

Se corre en la Mac (necesita data/raw/ina) cuando se actualizan las alturas históricas.
Salida: web/datos/rios_extremos.json
"""
import json
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
NINOS = {"2015-16": ("2015-10-01", "2016-05-31"), "2023-24": ("2023-10-01", "2024-05-31")}


def main() -> None:
    alt = pd.read_parquet(RAIZ / "data" / "raw" / "ina" / "alturas.parquet")
    ser = pd.read_parquet(RAIZ / "data" / "raw" / "ina" / "series.parquet")[["series_id", "estacion_id"]].drop_duplicates("series_id")
    alt = alt[alt["altura_m"] != 0]   # el cero exacto es falta de dato (ríos de llanura con escala alta)
    alt["fecha"] = pd.to_datetime(alt["fecha"], utc=True).dt.tz_convert("America/Argentina/Buenos_Aires").dt.tz_localize(None).dt.normalize()
    dia = alt.groupby(["series_id", "fecha"], as_index=False)["altura_m"].mean().merge(ser, on="series_id")
    # Una estación puede tener más de una serie de altura: se queda con la de más días
    dia = dia[dia["series_id"].isin(dia.groupby(["estacion_id", "series_id"]).size().reset_index()
                                    .sort_values(0).drop_duplicates("estacion_id", keep="last")["series_id"])]
    estaciones = {f["properties"]["estacion_id"] for f in json.loads((RAIZ / "web" / "datos" / "estaciones.geojson").read_text())["features"]}
    out = {}
    for est, d in dia[dia["estacion_id"].isin(estaciones)].groupby("estacion_id"):
        e = {"todo": {"min": round(float(d["altura_m"].quantile(0.01)), 2), "max": round(float(d["altura_m"].max()), 2),
                      "desde": d["fecha"].min().date().isoformat()}}
        enN = [(k, d[d["fecha"].between(a, b)]) for k, (a, b) in NINOS.items()]
        enN = [(k, x) for k, x in enN if len(x) >= 60]   # al menos dos meses medidos en la temporada
        if enN:
            todos = pd.concat([x for _, x in enN])
            k_max = max(enN, key=lambda kx: kx[1]["altura_m"].max())[0]
            e["nino"] = {"min": round(float(todos["altura_m"].quantile(0.01)), 2), "max": round(float(todos["altura_m"].max()), 2),
                         "temporada_max": k_max, "temporadas": [k for k, _ in enN]}
        out[str(int(est))] = e
    (RAIZ / "web" / "datos" / "rios_extremos.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    con = sum("nino" in v for v in out.values())
    print(f"rios_extremos.json: {len(out)} estaciones, {con} con registro en un Niño")


if __name__ == "__main__":
    main()

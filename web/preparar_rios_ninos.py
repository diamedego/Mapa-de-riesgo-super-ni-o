"""Crecida del río en cada temporada Niño desde 1984, por estación del INA (para el «peor Niño» del simulador).

Por estación y temporada (octubre → mayo): altura máxima, su fecha y cuántos días estuvo sobre el nivel de evacuación.
- 2015-16 y 2023-24: alturas MEDIDAS por el INA (web/datos/rios_ninos.json, de preparar_rios_extremos.py).
- Niños desde 1984-85: caudal diario del reanálisis de GloFAS (Open-Meteo Flood API) en la celda del río de cada estación,
  pasado a altura con la curva caudal → altura calibrada de esa estación (data/referencia/rios_curvas.parquet: regresión
  isotónica + desfase + sesgo). Solo las 43 estaciones que validan bien (r ≥ 0,7); las demás quedan solo con lo medido.
- Antes de 1984 no hay caudal ni alturas: sin dato.

Se corre en la Mac (lee data/raw/glofas para la celda de cada estación).
Salida: web/datos/rios_ninos_resumen.json  {estacion_id: {temporada: {max, fecha, dias, fuente}}}
"""
import json
import time
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import requests

RAIZ = Path(__file__).resolve().parents[1]
WEB = RAIZ / "web" / "datos"
NINOS = [1986, 1987, 1991, 1994, 1997, 2002, 2004, 2006, 2009, 2014, 2015, 2018, 2023]   # Niños con caudal (GloFAS desde 1984)


def celdas() -> dict:
    """estacion_id → (lat, lon) de la celda de GloFAS elegida por ingesta/glofas_rios.py."""
    carpeta = sorted(p for p in (RAIZ / "data" / "raw" / "glofas").glob("20*") if p.is_dir())[-1]
    out = {}
    for f in carpeta.glob("estacion_*.parquet"):
        d = pd.read_parquet(f, columns=["estacion_id", "lat_celda", "lon_celda"]).dropna().head(1)
        if len(d):
            out[int(d["estacion_id"].iloc[0])] = (float(d["lat_celda"].iloc[0]), float(d["lon_celda"].iloc[0]))
    return out


def main() -> None:
    curvas = pd.read_parquet(RAIZ / "data" / "referencia" / "rios_curvas.parquet")
    info = gpd.read_parquet(RAIZ / "data" / "referencia" / "estaciones_ina.parquet").set_index("series_id")
    cel = celdas()
    medidas = json.loads((WEB / "rios_ninos.json").read_text())
    out: dict = {}
    ses = requests.Session()
    for _, c in curvas.iterrows():
        est = int(info.loc[c["series_id"], "estacion_id"]); evac = info.loc[c["series_id"], "nivel_evacuacion"]
        if est not in cel or pd.isna(evac):
            continue
        lat, lon = cel[est]
        for intento in range(3):
            r = ses.get("https://flood-api.open-meteo.com/v1/flood", params={"latitude": lat, "longitude": lon, "daily": "river_discharge",
                        "start_date": "1984-10-01", "end_date": "2024-05-31"}, timeout=60)
            if r.ok:
                break
            time.sleep(5 * (intento + 1))
        if not r.ok:
            print("sin caudal:", est); continue
        d = r.json()["daily"]
        q = pd.Series(d["river_discharge"], index=pd.to_datetime(d["time"]), dtype=float)
        q.index = q.index + pd.Timedelta(days=int(c["desfase_dias"]))   # el caudal llega a la escala unos días después
        h = pd.Series(np.interp(np.log1p(q.values), c["x_log_caudal"], c["y_altura"]) + float(c["sesgo_calibracion"]), index=q.index)
        res = {}
        for a in NINOS:
            t = h[f"{a}-10-01":f"{a + 1}-05-31"].dropna()
            if len(t) > 60:
                res[f"{a}-{str(a + 1)[2:]}"] = {"max": round(float(t.max()), 2), "fecha": t.idxmax().date().isoformat(),
                                                "dias": int((t >= evac).sum()), "fuente": "GloFAS"}
        out[str(est)] = res
        time.sleep(1)
    # Lo medido por el INA reemplaza a lo estimado (2015-16 y 2023-24)
    est_evac = {int(r.estacion_id): r.nivel_evacuacion for r in info.drop_duplicates("estacion_id").itertuples()}
    for est, serie in medidas.items():
        evac = est_evac.get(int(est))
        if evac is None or pd.isna(evac):
            continue
        for a in (2015, 2023):
            v = {k: x for k, x in serie.items() if f"{a}-10-01" <= k <= f"{a + 1}-05-31"}
            if len(v) > 60:
                k = max(v, key=v.get)
                out.setdefault(est, {})[f"{a}-{str(a + 1)[2:]}"] = {"max": v[k], "fecha": k, "dias": int(sum(x >= evac for x in v.values())), "fuente": "INA"}
    (WEB / "rios_ninos_resumen.json").write_text(json.dumps(out, separators=(",", ":")))
    print(f"rios_ninos_resumen.json: {len(out)} estaciones")
    for est in ("40", "26", "30"):
        print(est, {k: (v["max"], v["dias"], v["fuente"]) for k, v in sorted(out.get(est, {}).items())})


if __name__ == "__main__":
    main()

"""Rasgos fijos por gobierno local (y por radio censal): todo lo que no cambia día a día.

Se calcula una vez en la Mac (necesita los datos crudos pesados) y se guarda en data/referencia/
(versionado, liviano), para que GitHub Actions pueda recalcular el riesgo sin los datos crudos.

Por radio censal (data/referencia/rasgos_radios.parquet):
  población, % hogares con desagüe a red cloacal, % NBI, % materiales deficientes (INMAT 3-4),
  terreno (HAND, % superficie a < 2 m del cauce, pendiente) y agua histórica, gobierno local.
Por gobierno local (data/referencia/rasgos_gobiernos_locales.parquet):
  agregados de los radios (ponderados por población) + Earth Engine (agua observada en Niños, arcilla,
  pendiente p90, uso del suelo 2024) + RENABAP + estación de río confiable cercana.
"""
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
RAW = RAIZ / "data" / "raw"
REF = RAIZ / "data" / "referencia"


def pct_categoria(var: str, categorias: list[str]) -> pd.Series:
    d = pd.read_parquet(RAW / "censo" / f"{var}.parquet")
    tot = d.groupby("id_geo")["conteo"].sum()
    sel = d[d["valor_categoria"].astype(str).isin(categorias)].groupby("id_geo")["conteo"].sum()
    return (100 * sel.reindex(tot.index, fill_value=0) / tot).rename(var)


def rasgos_radios() -> pd.DataFrame:
    radios = gpd.read_parquet(RAW / "limites" / "radios_censales.parquet")[["cod_indec", "cde", "geometry"]]
    gl = gpd.read_parquet(RAW / "limites" / "gobiernos_locales.parquet")[["cmu", "geometry"]]
    pts = radios.copy()
    pts["geometry"] = pts.geometry.representative_point()
    pts = gpd.sjoin(pts, gl, predicate="within", how="left").drop_duplicates("cod_indec")
    r = pd.DataFrame(pts[["cod_indec", "cde", "cmu"]])
    r["lat"], r["lon"] = pts.geometry.y.round(5).values, pts.geometry.x.round(5).values
    pob = pd.read_parquet(RAW / "censo" / "PERSONA_EDADGRU.parquet").groupby("id_geo")["conteo"].sum()
    r["poblacion"] = r["cod_indec"].map(pob).fillna(0)
    r["pct_cloaca"] = r["cod_indec"].map(pct_categoria("HOGAR_H18", ["1"]))
    r["pct_nbi"] = r["cod_indec"].map(pct_categoria("HOGAR_NBI_TOT", ["1"]))
    r["pct_materiales_deficientes"] = r["cod_indec"].map(pct_categoria("HOGAR_INMAT", ["3", "4"]))
    t = pd.read_parquet(RAW / "earth_engine" / "terreno_agua_radios.parquet").set_index("cod_indec")
    for c in ["hand_m", "pct_area_hand_2m", "pendiente_grados", "pct_area_agua_alguna_vez"]:
        r[c] = r["cod_indec"].map(t[c])
    r["bajo_y_sin_cloaca"] = (r["pct_area_hand_2m"] > 50) & (r["pct_cloaca"] < 50)
    return r


def main() -> None:
    REF.mkdir(parents=True, exist_ok=True)
    r = rasgos_radios()
    r.round(3).to_parquet(REF / "rasgos_radios.parquet", index=False)

    # Agregado por gobierno local (ponderado por población)
    def pond(g, c):
        w = g["poblacion"]
        return np.average(g[c].fillna(0), weights=w) if w.sum() > 0 else np.nan

    agg = r.dropna(subset=["cmu"]).groupby("cmu").apply(lambda g: pd.Series({
        "poblacion": g["poblacion"].sum(),
        "pob_terreno_bajo": g.loc[g["pct_area_hand_2m"] > 50, "poblacion"].sum(),
        "pob_bajo_sin_cloaca": g.loc[g["bajo_y_sin_cloaca"], "poblacion"].sum(),
        "pct_cloaca": pond(g, "pct_cloaca"), "pct_nbi": pond(g, "pct_nbi"),
        "pct_materiales_deficientes": pond(g, "pct_materiales_deficientes"),
    }), include_groups=False).reset_index()

    ee = RAW / "earth_engine"
    ter = pd.read_parquet(ee / "terreno_agua_gobiernos_locales.parquet")
    obs = pd.read_parquet(ee / "inundacion_observada_gobiernos_locales.parquet")
    sue = pd.read_parquet(ee / "suelo_deslizamientos_gobiernos_locales.parquet")
    uso = pd.read_parquet(ee / "uso_suelo_gobiernos_locales.parquet")
    uso = uso[uso["anio"] == 2024].pivot(index="cmu", columns="clase", values="pct_area").add_prefix("pct_").reset_index()
    gl = gpd.read_parquet(RAW / "limites" / "gobiernos_locales.parquet")[["cmu", "nam", "jur", "cpr", "geometry"]]
    base = pd.DataFrame(gl.drop(columns="geometry"))
    base["area_km2"] = gl.to_crs(5345).area.values / 1e6
    ren = gpd.read_file(RAW / "renabap" / "barrios.gpkg").to_crs(4326)
    ren["geometry"] = ren.geometry.representative_point()
    n_ren = gpd.sjoin(ren[["geometry"]], gl[["cmu", "geometry"]], predicate="within").groupby("cmu").size()
    base["barrios_populares"] = base["cmu"].map(n_ren).fillna(0).astype(int)

    out = (base.merge(agg, on="cmu", how="left")
           .merge(ter, on="cmu", how="left").merge(obs, on="cmu", how="left")
           .merge(sue, on="cmu", how="left").merge(uso, on="cmu", how="left"))
    out.round(4).to_parquet(REF / "rasgos_gobiernos_locales.parquet", index=False)
    print(f"Radios: {len(r)} | gobiernos locales: {len(out)} | columnas: {out.shape[1]}")
    print(out[["poblacion", "pob_terreno_bajo", "pob_bajo_sin_cloaca", "pct_cloaca", "pct_nbi"]].sum().round(0).head(3))
    for f in REF.glob("*.parquet"):
        print(f.name, round(f.stat().st_size / 1e6, 1), "MB")


if __name__ == "__main__":
    main()

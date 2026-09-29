"""Prepara los datos livianos que consume la web (web/datos/), a partir de data/gold y data/referencia.

- municipios.geojson: 2 282 gobiernos locales simplificados, con el riesgo y sus componentes por mes.
- estaciones.geojson: estaciones INA confiables con la probabilidad mensual de alerta y evacuación.
- caba_barrios.geojson: 48 barrios con los reclamos pluviales esperados por mes.
- resumen.json: indicadores nacionales por mes, rankings y fecha de cálculo.

Corre en la Mac (necesita los polígonos crudos). Los polígonos se simplifican a ~250 m: suficiente para
ver el país y las provincias, liviano para el navegador.
"""
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import shapely

RAIZ = Path(__file__).resolve().parents[1]
GOLD = RAIZ / "data" / "gold"
SALIDA = Path(__file__).resolve().parent / "datos"


def solo_poligonos(g):
    """make_valid puede devolver colecciones mixtas (polígono + línea): se conservan solo los polígonos."""
    if g is None or g.geom_type in ("Polygon", "MultiPolygon", "Point"):
        return g
    partes = [p for p in shapely.get_parts(g) if p.geom_type in ("Polygon", "MultiPolygon")]
    return shapely.union_all(partes) if partes else None


def redondear_geojson(gdf: gpd.GeoDataFrame, destino: Path, decimales: int = 4) -> None:
    gdf = gdf.copy()
    gdf["geometry"] = gdf.geometry.apply(solo_poligonos)
    gdf = gdf[gdf.geometry.notna() & ~gdf.geometry.is_empty]
    gdf["geometry"] = shapely.set_precision(gdf.geometry.values, 10 ** -decimales)
    geo = json.loads(gdf.to_json(drop_id=True, na="null"))
    destino.write_text(json.dumps(geo, ensure_ascii=False, separators=(",", ":")))


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    idx = pd.read_parquet(GOLD / "indice_riesgo_mensual.parquet")
    meses = sorted(idx["mes"].unique())

    # Municipios: una columna por mes para riesgo (r_), personas (p_) y componentes del mes pico
    gl = gpd.read_parquet(RAIZ / "data" / "raw" / "limites" / "gobiernos_locales.parquet")[["cmu", "geometry"]]
    gl["geometry"] = gl.to_crs(5345).simplify(250).to_crs(4326).make_valid()
    ancho = idx.pivot(index="cmu", columns="mes", values="riesgo").round(2)
    ancho.columns = [f"r_{m}" for m in ancho.columns]
    pers = idx.pivot(index="cmu", columns="mes", values="personas_en_riesgo").round(0)
    pers.columns = [f"p_{m}" for m in pers.columns]
    hmes = idx.pivot(index="cmu", columns="mes", values="H").round(2)
    hmes.columns = [f"h_{m}" for m in hmes.columns]
    fijo = idx.drop_duplicates("cmu").set_index("cmu")[["nam", "jur", "poblacion", "pob_terreno_bajo", "E", "V",
                                                         "pct_simulaciones_top10"]]
    pico = idx.groupby("mes")["riesgo"].mean().idxmax()
    comp = idx[idx["mes"] == pico].set_index("cmu")[["H_agua", "H_rio", "H_quebrada"]].round(2)
    props = fijo.join([ancho, pers, hmes, comp]).reset_index()
    props[["E", "V", "pct_simulaciones_top10"]] = props[["E", "V", "pct_simulaciones_top10"]].round(1)
    props["poblacion"] = props["poblacion"].fillna(0).round(0)
    props["pob_terreno_bajo"] = props["pob_terreno_bajo"].fillna(0).round(0)
    mun = gl.merge(props, on="cmu")
    redondear_geojson(mun, SALIDA / "municipios.geojson")

    # Estaciones de ríos (solo las que validan bien)
    est = gpd.read_parquet(RAIZ / "data" / "referencia" / "estaciones_ina.parquet")
    rios = pd.read_parquet(GOLD / "rios_pronostico_mensual.parquet")
    rios = rios[rios["r_validacion"] >= 0.7]
    pa = rios.pivot_table(index="series_id", columns="mes", values="p_alerta").round(2)
    pa.columns = [f"pa_{m}" for m in pa.columns]
    pe = rios.pivot_table(index="series_id", columns="mes", values="p_evacuacion").round(2)
    pe.columns = [f"pe_{m}" for m in pe.columns]
    e = est.merge(pa.join(pe).reset_index(), on="series_id")
    e = e[["series_id", "estacion", "rio", "provincia", "nivel_alerta", "nivel_evacuacion", "r_validacion",
           *pa.columns, *pe.columns, "geometry"]]
    e["r_validacion"] = e["r_validacion"].round(2)
    redondear_geojson(e, SALIDA / "estaciones.geojson", 4)

    # CABA: reclamos pluviales esperados por barrio y mes
    br = gpd.read_file(RAIZ / "data" / "raw" / "caba" / "barrios.geojson")[["nombre", "geometry"]]
    br["barrio"] = br["nombre"].str.upper().str.normalize("NFKD").str.encode("ascii", "ignore").str.decode("ascii")
    br["geometry"] = br.to_crs(5345).simplify(20).to_crs(4326)
    ca = pd.read_parquet(GOLD / "anegamientos_caba_pronostico.parquet")
    esp = ca.pivot(index="barrio", columns="mes", values="esperado").round(1)
    esp.columns = [f"c_{m}" for m in esp.columns]
    nor = ca.pivot(index="barrio", columns="mes", values="con_lluvia_normal").round(1)
    nor.columns = [f"n_{m}" for m in nor.columns]
    b = br.merge(esp.join(nor).reset_index(), on="barrio", how="left").drop(columns="barrio")
    redondear_geojson(b, SALIDA / "caba_barrios.geojson", 5)

    # Radios censales (nivel barrio): riesgo = cbrt(H del municipio en el mes × E del radio × V del radio)
    rr = pd.read_parquet(RAIZ / "data" / "referencia" / "rasgos_radios.parquet")
    rr = rr[(rr["poblacion"] > 0) & rr["cmu"].notna()].copy()
    rng = lambda s: s.rank(pct=True).fillna(0)
    rr["E_radio"] = 10 * rng(rr["pct_area_hand_2m"])
    rr["V_radio"] = 10 * (rng(100 - rr["pct_cloaca"]) + rng(rr["pct_nbi"]) + rng(rr["pct_materiales_deficientes"])) / 3
    hm = idx.pivot(index="cmu", columns="mes", values="H")
    for m in meses:
        rr[f"r_{m}"] = np.cbrt(rr["cmu"].map(hm[m]) * rr["E_radio"] * rr["V_radio"]).round(1)
    geo_r = gpd.read_parquet(RAIZ / "data" / "raw" / "limites" / "radios_censales.parquet")[["cod_indec", "geometry"]]
    geo_r = geo_r.merge(rr[["cod_indec", "cmu", "poblacion", "pct_cloaca", "pct_area_hand_2m",
                            *[f"r_{m}" for m in meses]]], on="cod_indec")
    geo_r["geometry"] = geo_r.to_crs(5345).simplify(15).to_crs(4326).make_valid()
    geo_r[["pct_cloaca", "pct_area_hand_2m"]] = geo_r[["pct_cloaca", "pct_area_hand_2m"]].round(0)
    carpeta_r = SALIDA / "radios"
    carpeta_r.mkdir(exist_ok=True)
    cajas = {}
    for prov, g in geo_r.groupby(geo_r["cod_indec"].str[:2]):
        redondear_geojson(g, carpeta_r / f"{prov}.geojson", 5)
        cajas[prov] = [round(v, 3) for v in g.total_bounds]

    # Resumen nacional
    por_mes = idx.groupby("mes").agg(personas_en_riesgo=("personas_en_riesgo", "sum"),
                                     riesgo_medio=("riesgo", "mean"),
                                     municipios_riesgo_alto=("riesgo", lambda s: int((s >= 7).sum()))).round(1)
    est_evac = rios.groupby("mes")["p_evacuacion"].apply(lambda s: int((s >= 0.5).sum()))
    top_rel = idx[idx["mes"] == pico].sort_values("riesgo", ascending=False).head(20)
    top_per = idx[idx["mes"] == pico].sort_values("personas_en_riesgo", ascending=False).head(20)
    cols = ["cmu", "nam", "jur", "riesgo", "personas_en_riesgo", "pct_simulaciones_top10"]
    resumen = {
        "calculado": str(idx["calculado"].iloc[0]), "corrida_seas5": str(idx["corrida_seas5"].iloc[0]),
        "corrida_glofas": str(rios["corrida_glofas"].iloc[0]), "meses": meses, "mes_pico": pico,
        "por_mes": {m: {**por_mes.loc[m].to_dict(), "estaciones_prob_evacuacion_50": int(est_evac.get(m, 0))}
                    for m in meses},
        "top_relativo": top_rel[cols].round(2).to_dict("records"),
        "top_personas": top_per[cols].round(2).to_dict("records"),
        "poblacion_total": float(idx.drop_duplicates("cmu")["poblacion"].sum()),
        "poblacion_terreno_bajo": float(idx.drop_duplicates("cmu")["pob_terreno_bajo"].sum()),
        "municipios": int(idx["cmu"].nunique()),
        "estaciones_confiables": int(rios["series_id"].nunique()),
        "cajas_radios": cajas,
    }
    (SALIDA / "resumen.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=1, default=float))
    for f in SALIDA.iterdir():
        print(f"{f.name}: {f.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()

"""Prepara las GEOMETRÍAS de la web (web/datos/), que casi no cambian. Corre en la Mac (necesita los
polígonos crudos); se vuelve a correr solo si cambian los límites, el Censo o el modelo de CABA.

- municipios_geo.geojson: 2 282 gobiernos locales simplificados (~250 m) con sus atributos fijos.
- radios/<provincia>.geojson: radios censales con su exposición (E) y vulnerabilidad (V) propias.
- radios/indice.json: caja de cada provincia, para cargar solo las que se miran.
- caba_barrios.geojson: 48 barrios con los reclamos pluviales esperados por mes (modelo mensual).

Los NÚMEROS que cambian cada día (riesgo por mes, ríos, resumen) los escribe web/actualizar_datos_web.py,
que corre en GitHub Actions: así el repositorio no sube 50 MB de geometrías por día.
"""
import json
from pathlib import Path

import geopandas as gpd
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
    # Municipios: geometría + atributos fijos (el riesgo se agrega en el navegador desde riesgo.json)
    ras = pd.read_parquet(RAIZ / "data" / "referencia" / "rasgos_gobiernos_locales.parquet")
    gl = gpd.read_parquet(RAIZ / "data" / "raw" / "limites" / "gobiernos_locales.parquet")[["cmu", "geometry"]]
    gl["geometry"] = gl.to_crs(5345).simplify(250).to_crs(4326).make_valid()
    fijo = ras[["cmu", "nam", "jur", "poblacion", "pob_terreno_bajo"]].copy()
    fijo[["poblacion", "pob_terreno_bajo"]] = fijo[["poblacion", "pob_terreno_bajo"]].fillna(0).round(0)
    redondear_geojson(gl.merge(fijo, on="cmu"), SALIDA / "municipios_geo.geojson")

    # Provincias: fondo gris del mapa (lo que no cubre ningún gobierno local se ve como "sin datos")
    pv = gpd.read_parquet(RAIZ / "data" / "raw" / "limites" / "provincias.parquet")[["nam", "geometry"]]
    pv["geometry"] = pv.geometry.intersection(shapely.box(-75, -56, -52, -21))  # sin el sector antártico
    pv = pv[~pv.geometry.is_empty]
    pv["geometry"] = pv.to_crs(5345).simplify(800).to_crs(4326).make_valid()
    redondear_geojson(pv, SALIDA / "provincias_geo.geojson", 3)

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

    # Radios censales (nivel barrio): el navegador calcula riesgo = cbrt(H del municipio en el mes × E × V)
    rr = pd.read_parquet(RAIZ / "data" / "referencia" / "rasgos_radios.parquet")
    rr = rr[(rr["poblacion"] > 0) & rr["cmu"].notna()].copy()
    rng = lambda s: s.rank(pct=True).fillna(0)
    rr["E"] = (10 * rng(rr["pct_area_hand_2m"])).round(2)
    rr["V"] = (10 * (rng(100 - rr["pct_cloaca"]) + rng(rr["pct_nbi"]) + rng(rr["pct_materiales_deficientes"])) / 3).round(2)
    geo_r = gpd.read_parquet(RAIZ / "data" / "raw" / "limites" / "radios_censales.parquet")[["cod_indec", "geometry"]]
    geo_r = geo_r.merge(rr[["cod_indec", "cmu", "poblacion", "pct_cloaca", "pct_area_hand_2m", "E", "V"]], on="cod_indec")
    geo_r["geometry"] = geo_r.to_crs(5345).simplify(15).to_crs(4326).make_valid()
    geo_r[["pct_cloaca", "pct_area_hand_2m"]] = geo_r[["pct_cloaca", "pct_area_hand_2m"]].round(0)
    carpeta_r = SALIDA / "radios"
    carpeta_r.mkdir(exist_ok=True)
    cajas = {}
    for prov, g in geo_r.groupby(geo_r["cod_indec"].str[:2]):
        redondear_geojson(g, carpeta_r / f"{prov}.geojson", 5)
        cajas[prov] = [round(v, 3) for v in g.total_bounds]
    (carpeta_r / "indice.json").write_text(json.dumps(cajas))

    viejo = SALIDA / "municipios.geojson"   # versión anterior, con números: reemplazada
    if viejo.exists():
        viejo.unlink()
    for f in sorted(SALIDA.rglob("*.*json")):
        print(f"{f.relative_to(SALIDA)}: {f.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()

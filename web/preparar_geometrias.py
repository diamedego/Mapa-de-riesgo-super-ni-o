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


def bordes_entre_vecinos(g: gpd.GeoDataFrame, tol: float = 0.003) -> gpd.GeoDataFrame:
    """Tramos de borde compartidos por cada par de municipios vecinos (a, b) y el borde exterior (a, "").

    Las geometrías simplificadas no coinciden exactamente entre vecinos: se toma el borde de "a" que cae
    a menos de ~300 m del polígono de "b".
    """
    g = g[["cmu", "geometry"]].reset_index(drop=True)
    buf = g.copy()
    buf["geometry"] = g.geometry.buffer(tol)
    pares = gpd.sjoin(g, buf, predicate="intersects")
    pares = pares[pares["cmu_left"] < pares["cmu_right"]][["cmu_left", "cmu_right"]].drop_duplicates()
    geo, gb = dict(zip(g["cmu"], g.geometry)), dict(zip(buf["cmu"], buf.geometry))
    filas = []
    for a, b in zip(pares["cmu_left"], pares["cmu_right"]):
        seg = geo[a].boundary.intersection(gb[b])
        if not seg.is_empty and seg.length > 0:
            filas.append((a, b, seg))
    vecinos = pd.concat([pares.set_axis(["x", "y"], axis=1), pares[["cmu_right", "cmu_left"]].set_axis(["x", "y"], axis=1)])
    vec = vecinos.groupby("x")["y"].apply(list)
    for c in g["cmu"]:
        vs = vec.get(c, [])
        resto = geo[c].boundary.difference(shapely.union_all([gb[v] for v in vs])) if vs else geo[c].boundary
        if not resto.is_empty and resto.length > 0:
            filas.append((c, "", resto))
    return gpd.GeoDataFrame(filas, columns=["a", "b", "geometry"], crs=4326)


def redondear_lineas(gdf: gpd.GeoDataFrame, destino: Path) -> None:
    gdf = gdf.copy()
    gdf["geometry"] = shapely.set_precision(gdf.geometry.values, 1e-4)
    gdf = gdf[~gdf.geometry.is_empty]
    destino.write_text(gdf.to_json(drop_id=True))


def indice_buscador() -> list:
    """Lugares buscables → municipios (gobiernos locales) que abarcan y caja para centrar el mapa.

    Tipos: provincia, departamento / partido / comuna, municipio (gobierno local), localidad y barrio
    (Georef), y barrios de CABA. Cada entrada: [nombre, tipo, provincia, cmus, [x0, y0, x1, y1], nivel] con nivel prov/depto/gl/loc.
    """
    raw = RAIZ / "data" / "raw" / "limites"
    gl = gpd.read_parquet(raw / "gobiernos_locales.parquet")[["cmu", "nam", "jur", "gna", "geometry"]]
    pts = gl.copy()
    pts["geometry"] = gl.geometry.representative_point()
    caja = lambda geom: [round(v, 3) for v in geom.bounds]
    entradas = []
    for prov, g in gl.groupby("jur"):
        b = g.geometry.intersection(shapely.box(-75, -56, -52, -21)).total_bounds
        entradas.append([prov, "Provincia", prov, sorted(g["cmu"]), [round(v, 3) for v in b], "prov"])
    dep = gpd.read_parquet(raw / "departamentos.parquet")[["cde", "nam", "jur", "geometry"]]
    dep = dep[dep.geometry.representative_point().y > -56]
    cont = gpd.sjoin(pts[["cmu", "geometry"]], dep[["cde", "geometry"]], predicate="within").groupby("cde")["cmu"].apply(sorted)
    for _, d in dep.iterrows():
        tipo = "Partido" if d["jur"] == "Buenos Aires" else "Comuna" if d["jur"].startswith("Ciudad") else "Departamento"
        if d["cde"] in cont.index:
            entradas.append([d["nam"], tipo, d["jur"], cont[d["cde"]], caja(d.geometry), "depto"])
    for _, g in gl.iterrows():
        entradas.append([g["nam"], g["gna"] or "Municipio", g["jur"], [g["cmu"]], caja(g.geometry), "gl"])
    loc = json.loads((raw / "georef_localidades.json").read_text())["localidades"]
    lg = gpd.GeoDataFrame(loc, geometry=gpd.points_from_xy([l["centroide"]["lon"] for l in loc],
                                                           [l["centroide"]["lat"] for l in loc]), crs=4326)
    lg = gpd.sjoin(lg, gl[["cmu", "geometry"]], predicate="within").drop_duplicates("id")
    for _, l in lg.iterrows():
        x, y = l.geometry.x, l.geometry.y
        tipo = "Barrio o paraje" if l["categoria"] == "Entidad" else "Localidad"
        entradas.append([l["nombre"], tipo, l["provincia"]["nombre"], [l["cmu"]],
                         [round(x - .04, 3), round(y - .03, 3), round(x + .04, 3), round(y + .03, 3)], "loc"])
    br = gpd.read_file(RAIZ / "data" / "raw" / "caba" / "barrios.geojson")[["nombre", "geometry"]]
    bp = br.copy()
    bp["geometry"] = br.geometry.representative_point()
    bp = gpd.sjoin(bp, gl[["cmu", "geometry"]], predicate="within")
    for (_, b), geom in zip(bp.iterrows(), br.loc[bp.index].geometry):
        entradas.append([b["nombre"].title(), "Barrio", "Ciudad Autónoma de Buenos Aires", [b["cmu"]], caja(geom), "loc"])
    return entradas


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    # Municipios: geometría + atributos fijos (el riesgo se agrega en el navegador desde riesgo.json)
    ras = pd.read_parquet(RAIZ / "data" / "referencia" / "rasgos_gobiernos_locales.parquet")
    gl = gpd.read_parquet(RAIZ / "data" / "raw" / "limites" / "gobiernos_locales.parquet")[["cmu", "geometry"]]
    gl["geometry"] = gl.to_crs(5345).simplify(250).to_crs(4326).make_valid()
    fijo = ras[["cmu", "nam", "jur", "poblacion", "pob_terreno_bajo"]].copy()
    fijo[["poblacion", "pob_terreno_bajo"]] = fijo[["poblacion", "pob_terreno_bajo"]].fillna(0).round(0)
    redondear_geojson(gl.merge(fijo, on="cmu"), SALIDA / "municipios_geo.geojson")

    # Bordes entre municipios vecinos (y contra zonas sin datos). El navegador dibuja solo los que
    # separan dos niveles de riesgo distintos en el mes elegido: línea fina gris oscuro.
    redondear_lineas(bordes_entre_vecinos(gpd.read_file(SALIDA / "municipios_geo.geojson")), SALIDA / "bordes_geo.geojson")

    # Índice del buscador
    (SALIDA / "buscador.json").write_text(json.dumps(indice_buscador(), ensure_ascii=False, separators=(",", ":")))

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

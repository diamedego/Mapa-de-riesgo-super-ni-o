"""Zonas rurales sin gobierno local: lo que queda de cada departamento fuera de sus municipios, comunas y juntas.

Los 2.282 gobiernos locales del INDEC cubren el 63 % del territorio; el resto (buena parte del Chaco, Formosa, Santiago del
Estero, Salta y la Patagonia) no tiene gobierno local y quedaba «sin datos» en el mapa. Cada departamento suma una unidad
«Zona rural de <departamento>» con el mismo tratamiento que un gobierno local (terreno, agua, población de los radios
rurales, lluvia y ríos), así el índice cubre todo el país.

Entrada: data/raw/limites/gobiernos_locales_indec.parquet (lo que baja ingesta/limites.py) y departamentos.parquet.
Salida:  data/raw/limites/gobiernos_locales.parquet = gobiernos locales + zonas rurales (cmu = "R" + código de departamento,
         gna = "Zona rural", cat_gl = "ZR"). Todo lo que antes leía los gobiernos locales ahora lee las dos cosas juntas.
Uso: .venv/bin/python ingesta/zonas_rurales.py            (polígonos; lo llama ingesta/limites.py)
     .venv/bin/python ingesta/zonas_rurales.py puntos     (puntos de consulta, después de transformacion/rasgos.py)
"""
import geopandas as gpd
import numpy as np
import pandas as pd
from shapely.geometry import MultiPolygon, Point, Polygon

from comun import RAIZ, RAW

AREA_MIN_PARTE = 2.0    # km²: astillas entre los límites del INDEC (departamentos y gobiernos locales no calzan al metro)
AREA_MIN_ZONA = 25.0    # km²: una zona rural más chica no aporta (bordes de ciudades)
EQUIAREA = 6933         # proyección de igual área para medir
# Antártida Argentina e Islas del Atlántico Sur: sin censo del INDEC ni datos comparables (quedan sin índice, como hasta ahora)
EXCLUIR = {"94028", "94021"}


def solo_poligonos(g):
    """Partes de más de AREA_MIN_PARTE km² (la geometría ya en metros)."""
    partes = [p for p in getattr(g, "geoms", [g]) if isinstance(p, Polygon) and p.area / 1e6 >= AREA_MIN_PARTE]
    return MultiPolygon(partes) if partes else None


def armar() -> gpd.GeoDataFrame:
    carpeta = RAW / "limites"
    gl = gpd.read_parquet(carpeta / "gobiernos_locales_indec.parquet")
    de = gpd.read_parquet(carpeta / "departamentos.parquet")
    glm, dem = gl.to_crs(EQUIAREA), de.to_crs(EQUIAREA)
    glm["geometry"] = glm.geometry.buffer(0)
    filas = []
    for _, d in dem[~dem["cde"].isin(EXCLUIR)].iterrows():
        cerca = glm[glm.intersects(d.geometry)]
        resto = d.geometry.buffer(0).difference(cerca.geometry.union_all()) if len(cerca) else d.geometry
        resto = solo_poligonos(resto.buffer(0))
        if resto is None or resto.area / 1e6 < AREA_MIN_ZONA:
            continue
        filas.append({"cpr": d["cpr"], "jur": d["jur"], "cmu": f"R{d['cde']}", "fna": f"Zona rural sin gobierno local · {d['fna']}",
                      "gna": "Zona rural", "nam": f"Zona rural de {d['nam']}", "cat_gl": "ZR", "geometry": resto})
    zr = gpd.GeoDataFrame(filas, crs=EQUIAREA).to_crs(gl.crs)
    zr["geometry"] = zr.geometry.simplify(0.0005)   # ~50 m: el borde exacto lo dan los municipios vecinos
    todo = pd.concat([gl, zr], ignore_index=True)
    return gpd.GeoDataFrame(todo, geometry="geometry", crs=gl.crs)


def puntos() -> None:
    """Punto de consulta (lluvia, alertas, río) de cada zona rural en data/referencia/puntos_gobiernos_locales.csv: el centro de
    su población (promedio de los radios censales rurales ponderado por habitantes) si cae adentro; si no, el radio más poblado;
    sin radios, un punto interior. Correr después de transformacion/rasgos.py (que asigna los radios a las zonas)."""
    archivo = RAIZ / "data" / "referencia" / "puntos_gobiernos_locales.csv"
    pts = pd.read_csv(archivo, dtype={"cmu": str})
    pts = pts[~pts["cmu"].str.startswith("R")]
    zr = gpd.read_parquet(RAW / "limites" / "gobiernos_locales.parquet")
    zr = zr[zr["cat_gl"] == "ZR"].set_index("cmu")
    rr = pd.read_parquet(RAIZ / "data" / "referencia" / "rasgos_radios.parquet")
    rr = rr[rr["cmu"].astype(str).str.startswith("R") & (rr["poblacion"] > 0)]
    filas = []
    for cmu, z in zr.iterrows():
        g = rr[rr["cmu"] == cmu]
        p = None
        if len(g):
            p = Point(np.average(g["lon"], weights=g["poblacion"]), np.average(g["lat"], weights=g["poblacion"]))
            if not z.geometry.contains(p):
                m = g.loc[g["poblacion"].idxmax()]
                p = Point(m["lon"], m["lat"])
        p = p or z.geometry.representative_point()
        filas.append({"cmu": cmu, "lat": round(p.y, 4), "lon": round(p.x, 4)})
    pd.concat([pts, pd.DataFrame(filas)], ignore_index=True).to_csv(archivo, index=False)
    print(f"Puntos de consulta: {len(filas)} zonas rurales agregadas")


def main() -> None:
    todo = armar()
    zr = todo[todo["cat_gl"] == "ZR"]
    km2 = zr.to_crs(EQUIAREA).area / 1e6
    todo.to_parquet(RAW / "limites" / "gobiernos_locales.parquet", index=False)
    print(f"Zonas rurales: {len(zr)} ({km2.sum():,.0f} km²) | unidades en total: {len(todo)}")
    print(zr.assign(km2=km2.values).groupby("jur")["km2"].agg(["count", "sum"]).sort_values("sum", ascending=False).round(0).head(12))


if __name__ == "__main__":
    import sys
    puntos() if sys.argv[1:] == ["puntos"] else main()

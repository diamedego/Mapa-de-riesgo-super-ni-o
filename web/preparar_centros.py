"""Centro poblado de cada gobierno local: promedio de los centros de sus radios censales ponderado por población.

Se usa para leer el tiempo "donde vive la gente": el centro geométrico de municipios grandes puede caer en la
montaña o en el campo (p. ej. Luján de Cuyo, cuyo territorio llega a la cordillera). Se calcula una vez (Mac).
Salida: data/referencia/centros_poblados.csv (cmu, lon, lat)
"""
from pathlib import Path

import geopandas as gpd
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]


def main() -> None:
    rr = pd.read_parquet(RAIZ / "data" / "referencia" / "rasgos_radios.parquet", columns=["cod_indec", "cmu", "poblacion"])
    rr = rr[(rr["poblacion"] > 0) & rr["cmu"].notna()]
    geo = gpd.read_parquet(RAIZ / "data" / "raw" / "limites" / "radios_censales.parquet", columns=["cod_indec", "geometry"])
    pts = geo.set_index("cod_indec").to_crs(5345).geometry.representative_point().to_crs(4326)
    rr = rr.join(pd.DataFrame({"lon": pts.x, "lat": pts.y}), on="cod_indec").dropna(subset=["lon"])
    c = rr.groupby("cmu").apply(lambda g: pd.Series({"lon": (g.lon * g.poblacion).sum() / g.poblacion.sum(),
                                                       "lat": (g.lat * g.poblacion).sum() / g.poblacion.sum()}), include_groups=False)
    base = pd.read_csv(RAIZ / "data" / "referencia" / "puntos_gobiernos_locales.csv", dtype={"cmu": str}).set_index("cmu")
    c = c.reindex(base.index).fillna(base[["lon", "lat"]]).round(4).reset_index()
    c.to_csv(RAIZ / "data" / "referencia" / "centros_poblados.csv", index=False)
    print(f"{len(c)} centros poblados")


if __name__ == "__main__":
    main()

"""Alertas y avisos vigentes del SMN en formato CAP (Common Alerting Protocol).

El feed solo muestra lo vigente, por eso este script se corre varias veces por día
(GitHub Actions) y cada corrida agrega sus alertas a un archivo por fecha.
Así se arma el histórico que usa la línea de tiempo del mapa.

Salida: data/raw/smn_cap/alertas_<AAAA-MM-DD>.parquet (sin duplicados por identificador).
"""
import xml.etree.ElementTree as ET

import geopandas as gpd
import pandas as pd
from shapely.geometry import Polygon

from comun import RAW, hoy, registrar, sesion

FEED = "https://ssl.smn.gob.ar/CAP/AR.php"
NS = {"cap": "urn:oasis:names:tc:emergency:cap:1.2"}


def _texto(nodo, ruta):
    x = nodo.find(ruta, NS)
    return x.text.strip() if x is not None and x.text else None


def _poligono(texto: str) -> Polygon:
    # CAP usa "lat,lon lat,lon ..." → shapely necesita (lon, lat)
    coords = [tuple(map(float, p.split(",")))[::-1] for p in texto.split()]
    return Polygon(coords)


def main() -> None:
    s = sesion()
    rss = ET.fromstring(s.get(FEED, timeout=60).content)
    links = [i.findtext("link") for i in rss.iter("item")]
    filas = []
    for url in links:
        cap = ET.fromstring(s.get(url, timeout=60).content)
        for info in cap.findall("cap:info", NS):
            for area in info.findall("cap:area", NS):
                for pol in area.findall("cap:polygon", NS):
                    filas.append({
                        "identificador": _texto(cap, "cap:identifier"),
                        "enviado": _texto(cap, "cap:sent"),
                        "evento": _texto(info, "cap:event"),
                        "severidad": _texto(info, "cap:severity"),
                        "urgencia": _texto(info, "cap:urgency"),
                        "certeza": _texto(info, "cap:certainty"),
                        "titulo": _texto(info, "cap:headline"),
                        "vence": _texto(info, "cap:expires"),
                        "areas": _texto(area, "cap:areaDesc"),
                        "url": url,
                        "geometry": _poligono(pol.text),
                    })

    destino = RAW / "smn_cap" / f"alertas_{hoy()}.parquet"
    destino.parent.mkdir(parents=True, exist_ok=True)
    nuevas = gpd.GeoDataFrame(filas, geometry="geometry", crs=4326) if filas else None
    if destino.exists():
        previas = gpd.read_parquet(destino)
        nuevas = previas if nuevas is None else gpd.GeoDataFrame(
            pd.concat([previas, nuevas]).drop_duplicates(subset=["identificador", "areas"]), crs=4326)
    if nuevas is not None:
        nuevas.to_parquet(destino)
    n = 0 if nuevas is None else len(nuevas)
    registrar("SMN", "alertas CAP vigentes", FEED, destino if n else "", "GeoParquet", n,
              "CC BY 4.0 (SMN)", nota=f"{len(links)} avisos en el feed")
    print(f"SMN: {len(links)} avisos en el feed, {n} polígonos acumulados hoy")


if __name__ == "__main__":
    main()

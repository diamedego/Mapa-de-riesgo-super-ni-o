"""Alertas y avisos vigentes del SMN en formato CAP (Common Alerting Protocol).

El feed solo muestra lo vigente, por eso este script se corre varias veces por día
(GitHub Actions) y cada corrida agrega sus alertas a un archivo por fecha.
Así se arma el histórico que usa la línea de tiempo del mapa.

Salida: data/raw/smn_cap/alertas_<AAAA-MM-DD>.parquet (sin duplicados por identificador).
"""
import re
import time
import xml.etree.ElementTree as ET

import geopandas as gpd
import pandas as pd
import requests
from requests.adapters import HTTPAdapter
from shapely.geometry import Polygon
from urllib3.util.retry import Retry

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


def leer_xml(contenido: bytes):
    """Lee el XML del SMN. A veces un aviso trae un carácter inválido (& suelto, caracteres de control): se limpia y se reintenta;
    si sigue mal formado devuelve None y ese aviso se saltea en vez de tirar abajo toda la corrida."""
    try:
        return ET.fromstring(contenido)
    except ET.ParseError:
        txt = contenido.decode("utf-8", errors="replace")
        txt = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]", "", txt)
        txt = re.sub(r"&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)", "&amp;", txt)
        try:
            return ET.fromstring(txt.encode("utf-8"))
        except ET.ParseError as e:
            print(f"SMN: aviso con XML inválido, se saltea ({e})")
            return None


def main() -> None:
    s = sesion()
    reintentos = Retry(total=2, backoff_factor=1, status_forcelist=[500, 502, 503, 504])   # sin reintentar los 429: se corta y sigue la próxima corrida
    s.mount("https://", HTTPAdapter(max_retries=reintentos))
    rss = leer_xml(s.get(FEED, timeout=60).content)
    if rss is None:
        raise SystemExit("SMN: el feed principal no se pudo leer")
    links = [i.findtext("link") for i in rss.iter("item")]
    destino = RAW / "smn_cap" / f"alertas_{hoy()}.parquet"
    previas = gpd.read_parquet(destino) if destino.exists() else None
    conocidas = set(previas["url"]) if previas is not None and "url" in previas else set()
    filas = []
    saltados = 0
    seguidos = 0
    for url in links:
        if url in conocidas:   # ya guardado en una corrida de hoy: no se vuelve a pedir (el SMN limita las consultas seguidas con 429)
            continue
        time.sleep(0.4)
        try:
            cap = leer_xml(s.get(url, timeout=60).content)
        except requests.exceptions.RequestException as e:
            print(f"SMN: no se pudo bajar un aviso, se saltea ({type(e).__name__})")
            cap = None
        if cap is None:
            saltados += 1
            seguidos += 1
            if seguidos >= 3:   # el SMN está limitando las consultas: lo que falta se baja en la próxima corrida (cada 3 horas)
                print("SMN: tres fallas seguidas, se corta esta corrida")
                break
            continue
        seguidos = 0
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

    destino.parent.mkdir(parents=True, exist_ok=True)
    nuevas = gpd.GeoDataFrame(filas, geometry="geometry", crs=4326) if filas else None
    if previas is not None:
        nuevas = previas if nuevas is None else gpd.GeoDataFrame(
            pd.concat([previas, nuevas]).drop_duplicates(subset=["identificador", "areas"]), crs=4326)
    if nuevas is not None:
        nuevas.to_parquet(destino)
    n = 0 if nuevas is None else len(nuevas)
    registrar("SMN", "alertas CAP vigentes", FEED, destino if n else "", "GeoParquet", n,
              "CC BY 4.0 (SMN)", nota=f"{len(links)} avisos en el feed, {saltados} con XML inválido")
    print(f"SMN: {len(links)} avisos en el feed ({saltados} con XML inválido), {n} polígonos acumulados hoy")


if __name__ == "__main__":
    main()

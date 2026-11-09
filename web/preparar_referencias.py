"""Referencias para ubicarse en el mapa (se corre a mano, en la Mac; los archivos se publican con la web).

- datos/municipios_etiquetas.geojson: un punto por gobierno local, dentro de su territorio, con el nombre (2 282 puntos).
- datos/industrias.geojson: plantas, fábricas y parques industriales con nombre de OpenStreetMap (Overpass),
  con su superficie aproximada para mostrar primero los más grandes.

Uso: .venv/bin/python web/preparar_referencias.py
"""
import json
import math
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

import geopandas as gpd

WEB = Path(__file__).resolve().parent
SERVIDORES = ["https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass-api.de/api/interpreter",
              "https://overpass.kumi.systems/api/interpreter"]
PARQUE = re.compile(r"\b(parque|polo|[aá]rea|sector|zona|distrito|complejo)\s+(industrial|tecnol[oó]gico|log[ií]stico|petroqu[ií]mico)", re.I)
CONSULTA = """[out:json][timeout:240];area["ISO3166-1"="AR"][admin_level=2]->.a;
(nwr["man_made"="works"]["name"](area.a);nwr["landuse"="industrial"]["name"](area.a);nwr["industrial"]["name"](area.a););
out bb tags;"""


def municipios() -> None:
    g = gpd.read_file(WEB / "datos" / "municipios_geo.geojson")
    nombre = "nam" if "nam" in g.columns else next(c for c in g.columns if c.lower() in ("nombre", "name"))
    p = g.to_crs(4326).geometry.representative_point()   # siempre cae dentro del municipio
    feats = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(pt.x, 4), round(pt.y, 4)]},
              "properties": {"n": n}} for n, pt in zip(g[nombre], p)]
    (WEB / "datos" / "municipios_etiquetas.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False, separators=(",", ":")))
    print(f"municipios_etiquetas: {len(feats)} puntos")


def overpass() -> dict:
    datos = urllib.parse.urlencode({"data": CONSULTA}).encode()
    for intento in range(6):
        for srv in SERVIDORES:
            try:
                req = urllib.request.Request(srv, data=datos, headers={"User-Agent": "mapa-riesgo-nino/1.0 (proyecto personal)"})
                return json.loads(urllib.request.urlopen(req, timeout=300).read())
            except Exception as e:   # servidores saturados: se prueba el siguiente y se espera cada vez más
                print(f"  {srv.split('/')[2]}: {str(e)[:60]}")
        time.sleep(30 * (intento + 1))
    raise RuntimeError("Overpass no respondió")


def industrias() -> None:
    feats = []
    for e in overpass()["elements"]:
        t = e.get("tags", {})
        b = e.get("bounds")
        c = ({"lat": e["lat"], "lon": e["lon"]} if "lat" in e
             else {"lat": (b["minlat"] + b["maxlat"]) / 2, "lon": (b["minlon"] + b["maxlon"]) / 2} if b else None)
        if not c or not t.get("name"):
            continue
        ha = 0.0
        if b:   # superficie aproximada del recuadro, en hectáreas
            alto = (b["maxlat"] - b["minlat"]) * 111_320
            ancho = (b["maxlon"] - b["minlon"]) * 111_320 * math.cos(math.radians(c["lat"]))
            ha = round(alto * ancho / 10_000, 1)
        nombre = t["name"].strip()
        parque = bool(PARQUE.search(nombre))
        feats.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(c["lon"], 5), round(c["lat"], 5)]},
                      "properties": {"n": nombre, "t": "parque" if parque else "planta", "ha": ha}})
    feats.sort(key=lambda f: -f["properties"]["ha"])   # los más grandes primero (el mapa los dibuja antes)
    (WEB / "datos" / "industrias.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False, separators=(",", ":")))
    print(f"industrias: {len(feats)} lugares, {sum(f['properties']['t'] == 'parque' for f in feats)} parques")


if __name__ == "__main__":
    municipios()
    industrias()

"""Agua vista hoy por el radar Sentinel-1, para que el pronóstico del simulador arranque con el agua real en superficie.

El radar ve a través de las nubes: el agua quieta refleja poco (VV < −16 dB). En cada lugar se toma la pasada más reciente de
los últimos 12 días (Sentinel-1 pasa cada 6 a 12 días), con un filtro de mediana de 50 m contra el ruido, y se quita el agua
permanente (JRC > 80 %): los ríos y lagunas ya están en el mapa base del modelo. Límite conocido: entre edificios el radar no ve
bien el agua (el rebote en las paredes la hace brillar), así que en la ciudad subestima lo inundado.

Salida: un mapa de Earth Engine que la web lee como teselas PNG (sin credenciales, con CORS para el sitio) y su dirección en
web/datos/radar_agua.json. Cada píxel: rojo = 255 si hay agua; verde = días desde la pasada × 20 (0 a 240); transparente donde
no hubo pasada en la ventana. Earth Engine vence los mapas a las horas: se regenera en cada corrida de la automatización.
En GitHub Actions se identifica con la cuenta de servicio mapa-nino-actions por identidad federada (sin claves).
Uso: .venv/bin/python earth_engine/agua_hoy_radar.py
"""
import datetime as dt
import json
import os
import sys
from pathlib import Path

import ee

sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import PROYECTO_EE  # noqa: E402

RAIZ = Path(__file__).resolve().parents[1]
VENTANA_DIAS, UMBRAL_DB = 12, -16
NINOS_S1 = [2015, 2023]   # temporadas Niño (octubre a abril) con radar Sentinel-1


def iniciar() -> None:
    if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):   # GitHub Actions (google-github-actions/auth)
        import google.auth
        cred, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/earthengine", "https://www.googleapis.com/auth/cloud-platform"])
        ee.Initialize(cred, project=PROYECTO_EE)
    else:
        ee.Initialize(project=PROYECTO_EE)


def mapa() -> dict:
    ahora = ee.Date(dt.datetime.now(dt.timezone.utc).isoformat())
    s1 = (ee.ImageCollection("COPERNICUS/S1_GRD").filterDate(ahora.advance(-VENTANA_DIAS, "day"), ahora)
          .filter(ee.Filter.eq("instrumentMode", "IW")).filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
          .sort("system:time_start"))   # el último de la lista queda arriba en el mosaico: la pasada más reciente

    def preparar(i):
        dias = ahora.difference(ee.Date(i.get("system:time_start")), "day")
        return i.select("VV").focalMedian(50, "circle", "meters").addBands(ee.Image.constant(dias).rename("dias").toFloat()) \
            .updateMask(i.select("VV").mask())
    ultimo = s1.map(preparar).mosaic()
    permanente = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence").unmask(0).gt(80)
    agua = ultimo.select("VV").lt(UMBRAL_DB).And(permanente.Not()).rename("agua")
    rgb = ee.Image.cat([agua, ultimo.select("dias"), ee.Image.constant(0).rename("b")]).updateMask(ultimo.select("VV").mask())
    vis = rgb.visualize(bands=["agua", "dias", "b"], min=[0, 0, 0], max=[1, 12.75, 1])
    # Agua histórica (JRC Global Surface Water 1984-2021): en qué % de las observaciones hubo agua en cada píxel de 30 m. Marca las
    # lagunas permanentes y las temporarias (donde el agua se junta seguido), que el radar de hoy no ve si están secas o vegetadas
    occ = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence").unmask(0)
    jrc = occ.visualize(min=0, max=100, palette=["000000", "ff0000"]).updateMask(occ.gt(0))
    # Lagunas con vegetación o someras (esteros): Dynamic World (Sentinel-2, 10 m) del último año, probabilidad media de «agua» más
    # «vegetación inundada». El JRC y el radar ven solo agua abierta
    dw = ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1").filterDate(ahora.advance(-365, "day"), ahora).select(["water", "flooded_vegetation"]) \
        .map(lambda i: i.select("water").add(i.select("flooded_vegetation")).rename("p")).mean()
    dwv = dw.visualize(min=0, max=1, palette=["000000", "ff0000"]).updateMask(dw.gt(0.15))
    # Agua vista por el radar en cada mes de los Niños con Sentinel-1 (desde 2014): donde hubo agua al menos en una pasada del mes
    # (mediana de 50 m, VV < −16 dB) y no es agua permanente. El simulador la usa para completar la inundación del escenario de ese
    # Niño con lo que de verdad se vio (lo que el modelo no llegó a mojar)
    ninos = {}
    for anio in NINOS_S1:
        meses = {}
        for m in range(7):
            ini = ee.Date.fromYMD(anio, 10, 1).advance(m, "month")
            col = ee.ImageCollection("COPERNICUS/S1_GRD").filterDate(ini, ini.advance(1, "month")).filter(ee.Filter.eq("instrumentMode", "IW")) \
                .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV")).select("VV")
            vv = col.map(lambda i: i.focalMedian(50, "circle", "meters").lt(UMBRAL_DB).updateMask(i.mask())).max()
            a = vv.And(permanente.Not())
            img = a.visualize(min=0, max=1, palette=["000000", "ff0000"]).updateMask(vv.mask())
            meses[f"{anio + (m + 9) // 12}-{(9 + m) % 12 + 1:02d}"] = img.getMapId({})["tile_fetcher"].url_format
        ninos[f"{anio}-{str(anio + 1)[2:]}"] = meses
    return {"url": vis.getMapId({})["tile_fetcher"].url_format, "ninos_url": ninos, "jrc_url": jrc.getMapId({})["tile_fetcher"].url_format,
            # "dw_url" (lagunas con vegetación, Dynamic World): apagado hasta probarlo en el simulador
            "generado": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
            "ventana_dias": VENTANA_DIAS, "umbral_db": UMBRAL_DB, "codificacion": "rojo 255 = agua; verde = días desde la pasada × 20; transparente = sin pasada",
            "jrc_codificacion": "rojo = % de las observaciones 1984-2021 con agua (0-255 = 0-100 %); transparente = nunca"}


if __name__ == "__main__":
    iniciar()
    m = mapa()
    (RAIZ / "web" / "datos" / "radar_agua.json").write_text(json.dumps(m, ensure_ascii=False))
    print("radar_agua.json:", m["generado"], m["url"][:90])

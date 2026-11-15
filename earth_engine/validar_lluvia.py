"""Validación de la lluvia de las tormentas contra pluviómetros, para saber cuánto se equivoca cada fuente y cuál usar.

Pluviómetros (lluvia de 24 h desde las 9 de la mañana):
- INA, red RHN-SAT (API alerta.ina.gob.ar): 366 pluviómetros automáticos, temporadas 2019-20 a 2025-26 (incluye el Niño 2023-24).
- GHCN-Daily (NOAA): estaciones argentinas, casi todas del SMN; después de 2005 les faltan muchos días (vienen de mensajes
  SYNOP incompletos), así que solo entran las temporadas con 90 % de días medidos (en la práctica 2002-03 y 2004-05).
Para cada pluviómetro y temporada (1 de octubre a 30 de abril, con al menos 90 % de días medidos):
- la peor tormenta medida: los 3 días seguidos con más lluvia;
- lo que dan ERA5-Land, IMERG y su promedio en la celda de 0,1° esos MISMOS días (acierta el momento y la cantidad);
- y la peor tormenta de cada fuente en la temporada, sea cuando sea (solo la cantidad: lo que usan las barras del simulador);
- el orden de las temporadas: si la fuente las ordena como el pluviómetro (Spearman) y si elige la misma peor.
Un día de pluviómetro (9 a 9 h) es 15 h de un día de las fuentes (0 a 24 h) y 9 h del siguiente.

Salidas: data/validacion/lluvia_estaciones.csv, web/datos/validacion_lluvia.json, docs/img/validacion_lluvia.png
Uso: .venv/bin/python earth_engine/validar_lluvia.py
"""
import json
import sys
from pathlib import Path

import ee
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lluvia_ninos as LN  # noqa: E402

RAIZ = Path(__file__).resolve().parents[1]
GHCN = RAIZ / "data" / "raw" / "ghcn"
SALIDA = RAIZ / "data" / "validacion"
TEMPORADAS_GHCN = [a for a in LN.TEMPORADAS if a >= 2002]
TEMPORADAS_INA = list(range(2019, 2026))


def pluviometros() -> tuple[pd.DataFrame, dict]:
    """Catálogo (id, nombre, lon, lat, red) y lluvia diaria de cada pluviómetro, indexada por el día en que empieza (9 h)."""
    cat, serie = [], {}
    ids = set((GHCN / "lista_ar.txt").read_text().split())
    for l in (GHCN / "ghcnd-stations.txt").read_text().splitlines():
        if l[:11] not in ids:
            continue
        d = pd.read_csv(GHCN / "estaciones" / f"{l[:11]}.csv", usecols=["DATE", "PRCP", "PRCP_ATTRIBUTES"], low_memory=False).dropna(subset=["PRCP"])
        d = d[d["PRCP_ATTRIBUTES"].fillna(",,").str.split(",").str[1].isin(["", " "])]   # marca de calidad vacía = pasó los controles
        serie[l[:11]] = pd.Series(d["PRCP"].values / 10, index=pd.to_datetime(d["DATE"]) - pd.Timedelta(days=1))   # termina a las 9 h de DATE
        cat.append((l[:11], l[41:71].strip(), float(l[21:30]), float(l[12:20]), "GHCN"))
    ina = RAIZ / "data" / "raw" / "ina"
    p = pd.read_parquet(ina / "precipitacion_diaria.parquet")
    p = p[(p["valor"] >= 0) & (p["valor"] <= 400)]   # fuera de rango físico: error del equipo
    p["dia"] = pd.to_datetime(p["timestart"], utc=True).dt.tz_convert("America/Argentina/Buenos_Aires").dt.tz_localize(None).dt.normalize()
    for sid, g in p.groupby("series_id"):
        serie[f"INA{sid}"] = g.groupby("dia")["valor"].mean()
    for r in pd.read_parquet(ina / "pluviometros.parquet").itertuples():
        cat.append((f"INA{r.series_id}", r.nombre, r.lon, r.lat, "INA"))
    C = pd.DataFrame(cat, columns=["id", "nombre", "lon", "lat", "red"])
    return C[C["id"].isin(serie) & C["lon"].between(LN.OESTE, LN.OESTE + LN.ANCHO * LN.PASO) & C["lat"].between(LN.NORTE - LN.ALTO * LN.PASO, LN.NORTE)], serie


def fuentes_en_estaciones(E: pd.DataFrame, temporadas: list) -> dict:
    """Lluvia diaria de ERA5-Land (e) e IMERG (x) en la celda de cada pluviómetro, cada día de cada temporada (Earth Engine)."""
    puntos = ee.FeatureCollection([ee.Feature(ee.Geometry.Point(r.lon, r.lat), {"id": r.id}) for r in E.itertuples()])
    out = {}
    for anio in temporadas:
        for b in "ex":
            img = LN.temporada(anio, b)
            fc = img.reduceRegions(puntos, ee.Reducer.first(), crs="EPSG:4326", crsTransform=[LN.PASO, 0, LN.OESTE, 0, -LN.PASO, LN.NORTE]).getInfo()
            for f in fc["features"]:
                p = f["properties"]
                n = len([k for k in p if k.startswith(b) and k[1:].isdigit()])
                out[(anio, b, p["id"])] = np.array([p.get(f"{b}{k}") for k in range(n)], dtype=float) / 10
        print("fuentes", anio)
    return out


def main() -> None:
    ee.Initialize(project=LN.PROYECTO_EE)
    E, S = pluviometros()
    cache = SALIDA / "lluvia_fuentes_estaciones.json"
    F = {tuple(json.loads(k)): np.array(v, dtype=float) for k, v in json.loads(cache.read_text()).items()} if cache.exists() else {}
    faltan = [(red, temps) for red, temps in (("GHCN", TEMPORADAS_GHCN), ("INA", TEMPORADAS_INA))
              if not any((a, "e", i) in F for a in temps for i in E[E["red"] == red]["id"])]
    for red, temps in faltan:
        F.update(fuentes_en_estaciones(E[E["red"] == red], temps))
    if faltan:
        SALIDA.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps({json.dumps([a, b, i]): [None if np.isnan(x) else x for x in v] for (a, b, i), v in F.items()}))
    filas = []
    tres = lambda p: p[:-2] + p[1:-1] + p[2:]
    alinear = lambda p: 0.625 * p + 0.375 * np.concatenate([p[1:], p[-1:]])   # día 9 a 9 h: 15 h del día de la fuente y 9 h del siguiente
    for r in E.itertuples():
        for anio in TEMPORADAS_GHCN if r.red == "GHCN" else TEMPORADAS_INA:
            dias = pd.date_range(f"{anio}-10-01", f"{anio + 1}-04-30")
            o = S[r.id].reindex(dias)
            e, x = F.get((anio, "e", r.id)), F.get((anio, "x", r.id))
            if o.notna().mean() < 0.9 or e is None or x is None or np.isnan(e).any() or np.isnan(x).any() or len(e) != len(dias):
                continue
            o = o.fillna(0).values
            k = int(tres(o).argmax())
            if tres(o)[k] < 10:   # temporada sin tormentas (o pluviómetro trabado en cero)
                continue
            fila = {"id": r.id, "red": r.red, "nombre": r.nombre, "lat": r.lat, "lon": r.lon, "temporada": f"{anio}-{str(anio + 1)[2:]}",
                    "inicio": dias[k].date().isoformat(), "obs": tres(o)[k]}
            for n, p in {"era5": e, "imerg": x, "promedio": (e + x) / 2}.items():
                fila[f"{n}_mismos_dias"] = tres(alinear(p))[k]   # misma tormenta (momento y cantidad)
                fila[f"{n}_peor"] = tres(alinear(p)).max()       # peor tormenta de la fuente en la temporada (solo cantidad)
            filas.append(fila)
    D = pd.DataFrame(filas)
    # Control de calidad: errores groseros del equipo (picos falsos o pluviómetro trabado). Se descarta la tormenta si el
    # pluviómetro y LAS DOS fuentes, que son independientes entre sí, difieren más de 10 veces en el mismo sentido.
    m = D[["era5_mismos_dias", "imerg_mismos_dias"]]
    D["descartada"] = (D["obs"] > 10 * m.max(axis=1)) | (D["obs"] * 10 < m.min(axis=1))
    D.to_csv(SALIDA / "lluvia_estaciones.csv", index=False)
    n_desc = int(D["descartada"].sum())
    D = D[~D["descartada"]].copy()
    D["llanura"] = D["lon"] > -66   # llanura chaco-pampeana y litoral: donde vive la mayoría y no hay montaña
    res = {"pluviometros": int(D["id"].nunique()), "tormentas": len(D), "descartadas_control": n_desc, "por_red": D.groupby("red").size().to_dict(),
           "temporadas": sorted(D["temporada"].unique().tolist()), "fuentes": {}}
    clases = [(10, 60), (60, 100), (100, 150), (150, 2000)]
    for n in ("era5", "imerg", "promedio"):
        q = D[f"{n}_mismos_dias"] / D["obs"]
        w = D[f"{n}_peor"] / D["obs"]
        sp, acierto = [], []   # orden de las temporadas en cada pluviómetro con 6 o más
        for _, g in D.groupby("id"):
            if len(g) >= 6:
                sp.append(g["obs"].rank().corr(g[f"{n}_peor"].rank()))
                acierto.append(g["obs"].idxmax() == g[f"{n}_peor"].idxmax())
        mdape = lambda r: round(float((r - 1).abs().median()), 3)
        res["fuentes"][n] = {
            "mismos_dias": {"mediana_cociente": round(float(q.median()), 3), "error_mediano": mdape(q),
                            "correlacion": round(float(D["obs"].corr(D[f"{n}_mismos_dias"])), 3),
                            "llanura_mediana_cociente": round(float(q[D["llanura"]].median()), 3), "llanura_error_mediano": mdape(q[D["llanura"]]),
                            "por_tamano": {f"{a}-{b}": [round(float(q[(D['obs'] >= a) & (D['obs'] < b)].median()), 3), int(((D['obs'] >= a) & (D['obs'] < b)).sum())] for a, b in clases}},
            "peor_temporada": {"mediana_cociente": round(float(w.median()), 3), "error_mediano": mdape(w),
                               "por_tamano": {f"{a}-{b}": round(float(w[(D['obs'] >= a) & (D['obs'] < b)].median()), 3) for a, b in clases},
                               "error_por_tamano": {f"{a}-{b}": mdape(w[(D['obs'] >= a) & (D['obs'] < b)]) for a, b in clases},
                               "fuertes_100": {"mediana_cociente": round(float(w[D['obs'] >= 100].median()), 3), "error_mediano": mdape(w[D['obs'] >= 100]), "n": int((D['obs'] >= 100).sum())}},
            "orden_temporadas": {"spearman_mediana": round(float(np.nanmedian(sp)), 3) if sp else None, "acierto_peor": round(float(np.mean(acierto)), 3) if acierto else None, "n_pluviometros": len(sp)}}
    # Mapeo de cuantiles (Piani et al. 2010; Gudmundsson et al. 2012) de la peor tormenta del promedio a la del pluviómetro, en la
    # llanura: qué valor medido corresponde a cada valor del promedio con la misma probabilidad
    L = D[D["llanura"]]
    cu = np.linspace(0.02, 0.98, 25)
    res["mapeo_cuantiles_llanura"] = {"n": len(L), "promedio": np.quantile(L["promedio_peor"], cu).round(1).tolist(), "medido": np.quantile(L["obs"], cu).round(1).tolist()}
    (RAIZ / "web" / "datos" / "validacion_lluvia.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
    print(json.dumps(res, ensure_ascii=False, indent=1))
    grafico(D)


def grafico(D: pd.DataFrame) -> None:
    D = D[~D["descartada"]]
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    col = {"era5": "#b5651d", "imerg": "#2a6f97", "promedio": "#1b998b"}
    nom = {"era5": "Reanálisis ERA5", "imerg": "Satélite IMERG (el que usa el simulador)", "promedio": "Promedio de los dos"}
    fig, ax = plt.subplots(1, 2, figsize=(11, 4.4), dpi=150)
    clases = [(0, 60), (60, 100), (100, 150), (150, 1000)]
    etq = ["< 60 mm", "60-100 mm", "100-150 mm", "> 150 mm"]
    for j, n in enumerate(col):
        med = [(D[f"{n}_mismos_dias"] / D["obs"])[(D["obs"] >= a) & (D["obs"] < b)].median() * 100 for a, b in clases]
        ax[0].bar(np.arange(4) + (j - 1) * 0.26, med, width=0.24, color=col[n], label=nom[n])
    ax[0].axhline(100, color="#333", lw=1, ls="--")
    ax[0].set_xticks(range(4), [f"{e}\n({((D['obs'] >= a) & (D['obs'] < b)).sum()} casos)" for e, (a, b) in zip(etq, clases)])
    ax[0].set_ylabel("Lluvia de la fuente / lluvia medida (%)")
    ax[0].set_title("Peor tormenta de 3 días medida, según su tamaño", fontsize=10)
    ax[0].legend(fontsize=8, frameon=False)
    lim = max(D["obs"].max(), 1) * 1.05
    for n in col:
        ax[1].scatter(D["obs"], D[f"{n}_mismos_dias"], s=7, alpha=0.45, color=col[n], label=nom[n])
    ax[1].plot([0, lim], [0, lim], color="#333", lw=1, ls="--")
    ax[1].set_xlim(0, lim); ax[1].set_ylim(0, lim)
    ax[1].set_xlabel("Medido en el pluviómetro (mm en 3 días)"); ax[1].set_ylabel("Fuente, mismos días (mm)")
    ax[1].set_title(f"{D['id'].nunique()} pluviómetros, {len(D)} tormentas (2002-2026)", fontsize=10)
    for a in ax:
        a.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    (RAIZ / "docs" / "img").mkdir(parents=True, exist_ok=True)
    fig.savefig(RAIZ / "docs" / "img" / "validacion_lluvia.png")


if __name__ == "__main__":
    main()

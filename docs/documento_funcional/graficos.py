"""Figuras del documento funcional (SVG en línea; el texto queda como texto para que use las tipografías del documento)."""
import io

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

TINTA, SUAVE, GRIS = "#1b2430", "#5b6675", "#d9dee5"
CIAN, AZUL, NARANJA, VERDE, ROJO, AMARILLO = "#0e7490", "#2a78d6", "#eb6834", "#1baf7a", "#c62f2f", "#e0ae00"
plt.rcParams.update({"svg.fonttype": "none", "font.family": "DejaVu Sans", "font.size": 9, "axes.edgecolor": SUAVE, "axes.labelcolor": TINTA,
                     "xtick.color": SUAVE, "ytick.color": SUAVE, "axes.spines.top": False, "axes.spines.right": False, "text.color": TINTA})


def svg(fig) -> str:
    b = io.StringIO()
    fig.savefig(b, format="svg", bbox_inches="tight", transparent=True)
    plt.close(fig)
    s = b.getvalue()
    s = s[s.index("<svg"):]
    return s.replace("DejaVu Sans", "Avenir Next, Gill Sans, Helvetica Neue, Arial, sans-serif")


def validacion_simulador(csv) -> str:
    d = pd.read_csv(csv)
    d = d[(d.temporada != "referencia_2022_23") & (d.celdas_obs >= 20)].copy()
    d["caso"] = d.ciudad + "\n" + d.temporada.str[5:].str.replace("_", "-")
    d = d.sort_values("csi", ascending=True)
    fig, ax = plt.subplots(figsize=(6.6, 3.15))
    y = range(len(d))
    ax.barh([i + 0.2 for i in y], d.csi, height=0.38, color=CIAN, label="Modelo hidráulico")
    ax.barh([i - 0.2 for i in y], d.csi_jrc, height=0.38, color="#9aa6b5", label="Referencia: «donde ya hubo agua» (JRC)")
    ax.set_yticks(list(y)); ax.set_yticklabels(d.caso, fontsize=7.5)
    ax.set_xlim(0, 0.85); ax.set_xlabel("CSI (aciertos / (aciertos + falsas alarmas + faltantes))")
    for i, v in zip(y, d.csi):
        ax.text(v + 0.01, i + 0.2, f"{v:.2f}", va="center", fontsize=7.5, color=CIAN)
    ax.legend(frameon=False, fontsize=8, loc="lower right")
    ax.grid(axis="x", color=GRIS, lw=0.6); ax.set_axisbelow(True)
    return svg(fig)


def verificacion_pronostico() -> str:
    fig, ax = plt.subplots(figsize=(5.4, 2.3))
    plazos = ["0 a 3 días", "4 a 7 días", "8 a 15 días"]
    corr, det = [0.709, 0.45, 0.107], [55.8, 27.0, 10.4]
    x = range(3)
    ax.bar([i - 0.2 for i in x], corr, width=0.38, color=CIAN, label="Correlación con la lluvia observada")
    ax.bar([i + 0.2 for i in x], [v / 100 for v in det], width=0.38, color=NARANJA, label="Detección de días con 20 mm o más")
    for i, (c, d_) in enumerate(zip(corr, det)):
        ax.text(i - 0.2, c + 0.015, f"{c:.2f}", ha="center", fontsize=8, color=CIAN)
        ax.text(i + 0.2, d_ / 100 + 0.015, f"{d_:.0f} %", ha="center", fontsize=8, color=NARANJA)
    ax.set_xticks(list(x)); ax.set_xticklabels(plazos); ax.set_ylim(0, 0.95); ax.set_ylabel("Valor")
    ax.legend(frameon=False, fontsize=7.5, loc="upper right")
    ax.grid(axis="y", color=GRIS, lw=0.6); ax.set_axisbelow(True)
    return svg(fig)


def cobertura_datos() -> str:
    filas = [("Pronóstico estacional (SEAS5)", 100), ("Terreno: altura sobre el cauce (HAND)", 100), ("Uso del suelo (MapBiomas)", 100),
             ("Agua histórica 1984-2021 (JRC)", 100), ("Agua en los Niño (Dynamic World)", 100), ("Censo 2022 (radios censales)", 99.7),
             ("Escuelas (IGN)", 99), ("Salud (IGN)", 90), ("Puentes (OSM)", 74), ("Alcantarillas (OSM)", 63),
             ("Canales y desagües", 46), ("Barrios populares (RENABAP)", 30), ("Estación de río con alerta ≤ 30 km", 21)]
    filas = sorted(filas, key=lambda f: f[1])
    fig, ax = plt.subplots(figsize=(6.6, 3.3))
    cols = [CIAN if v >= 90 else AMARILLO if v >= 40 else NARANJA for _, v in filas]
    ax.barh([f[0] for f in filas], [f[1] for f in filas], color=cols, height=0.62)
    for i, (_, v) in enumerate(filas):
        ax.text(v + 1, i, f"{v:g} %", va="center", fontsize=7.5)
    ax.set_xlim(0, 112); ax.set_xlabel("% de los 2.282 gobiernos locales con el dato")
    ax.tick_params(axis="y", labelsize=7.5); ax.grid(axis="x", color=GRIS, lw=0.6); ax.set_axisbelow(True)
    return svg(fig)


def cronograma() -> str:
    hitos = [("Fuentes y alcance", "2026-09-27", "2026-09-28", AZUL), ("Ingesta y Earth Engine", "2026-09-28", "2026-09-30", AZUL),
             ("Índice de riesgo y modelos", "2026-09-29", "2026-10-02", CIAN), ("Web: primera versión y análisis", "2026-09-29", "2026-10-15", VERDE),
             ("Rediseño «sala de situación» y sitio público", "2026-11-05", "2026-11-06", VERDE), ("Simulador: llenado de bajos", "2026-11-06", "2026-11-08", NARANJA),
             ("Modelo hidráulico 2D y terreno FABDEM", "2026-11-10", "2026-11-11", NARANJA), ("Tandas 1 a 9 (28 puntos del pedido)", "2026-11-10", "2026-11-12", ROJO),
             ("Validación del simulador (Dynamic World)", "2026-11-11", "2026-11-12", ROJO), ("Láminas, índice físico y escenarios", "2026-11-13", "2026-11-14", VERDE),
             ("Investigación y validación de lluvia y río", "2026-11-15", "2026-11-15", ROJO)]
    fig, ax = plt.subplots(figsize=(6.8, 3.2))
    for i, (n, a, b, c) in enumerate(hitos[::-1]):
        a_, b_ = pd.Timestamp(a), pd.Timestamp(b) + pd.Timedelta(days=1)
        ax.barh(i, (b_ - a_).days, left=matplotlib.dates.date2num(a_), height=0.55, color=c)
    ax.set_yticks(range(len(hitos))); ax.set_yticklabels([h[0] for h in hitos[::-1]], fontsize=7.5)
    ax.xaxis_date(); ax.xaxis.set_major_formatter(matplotlib.dates.DateFormatter("%d/%m")); ax.xaxis.set_major_locator(matplotlib.dates.DayLocator(interval=7))
    ax.grid(axis="x", color=GRIS, lw=0.6); ax.set_axisbelow(True); ax.tick_params(axis="x", labelsize=8)
    return svg(fig)


def validacion_lluvia(csv) -> str:
    """Peor tormenta de 3 días de cada temporada: lo que da cada fuente frente al pluviómetro y su error, por tamaño."""
    import numpy as np
    d = pd.read_csv(csv)
    d = d[~d["descartada"]]
    clases = [(10, 60, "< 60 mm"), (60, 100, "60–100 mm"), (100, 150, "100–150 mm"), (150, 2000, "≥ 150 mm")]
    fuentes = [("era5", "Reanálisis ERA5", NARANJA), ("promedio", "Promedio de los dos", "#9aa6b5"), ("imerg", "Satélite IMERG (el elegido)", CIAN)]
    fig, ax = plt.subplots(1, 2, figsize=(6.9, 2.7))
    x = np.arange(len(clases))
    for j, (k, nom, col) in enumerate(fuentes):
        r = [(d[f"{k}_peor"] / d["obs"])[(d["obs"] >= a) & (d["obs"] < b)] for a, b, _ in clases]
        ax[0].bar(x + (j - 1) * 0.27, [100 * v.median() for v in r], width=0.25, color=col, label=nom)
        ax[1].bar(x + (j - 1) * 0.27, [100 * (v - 1).abs().median() for v in r], width=0.25, color=col)
    ax[0].axhline(100, color=TINTA, lw=0.8, ls="--")
    n = [int(((d["obs"] >= a) & (d["obs"] < b)).sum()) for a, b, _ in clases]
    for a_ in ax:
        a_.set_xticks(x); a_.set_xticklabels([f"{e}\n{k} casos" for (_, _, e), k in zip(clases, n)], fontsize=7)
        a_.grid(axis="y", color=GRIS, lw=0.6); a_.set_axisbelow(True)
    ax[0].set_ylabel("Fuente / pluviómetro (%)"); ax[0].set_title("Lluvia que da (100 % = exacto)", fontsize=8.5)
    ax[1].set_ylabel("Error mediano (%)"); ax[1].set_title("Error", fontsize=8.5)
    ax[0].legend(frameon=False, fontsize=6.8, loc="upper right")
    fig.tight_layout()
    return svg(fig)


def validacion_rio(antes: dict, ahora: dict) -> str:
    """Crecida de Concordia (nov-2023) contra el radar: regla de 1 km frente a tierra conectada (= modelo 3D)."""
    fig, ax = plt.subplots(figsize=(6.2, 2.0))
    met = [("pod", "Agua del radar que el modelo acierta (POD)"), ("far", "Agua del modelo que el radar no vio (FAR)"), ("csi", "Índice de acierto (CSI)")]
    y = range(len(met))
    ax.barh([i + 0.19 for i in y], [antes[m] for m, _ in met], height=0.36, color="#9aa6b5", label="Antes: solo a menos de 1 km del río")
    ax.barh([i - 0.19 for i in y], [ahora[m] for m, _ in met], height=0.36, color=CIAN, label="Ahora: tierra conectada y más baja (= modelo 3D)")
    for i, (m, _) in enumerate(met):
        ax.text(antes[m] + 0.01, i + 0.19, f"{antes[m]:.2f}", va="center", fontsize=7.5, color=SUAVE)
        ax.text(ahora[m] + 0.01, i - 0.19, f"{ahora[m]:.2f}", va="center", fontsize=7.5, color=CIAN)
    ax.set_yticks(list(y)); ax.set_yticklabels([t for _, t in met], fontsize=7.5); ax.invert_yaxis()
    ax.set_xlim(0, 1); ax.legend(frameon=False, fontsize=7, loc="lower right"); ax.grid(axis="x", color=GRIS, lw=0.6); ax.set_axisbelow(True)
    return svg(fig)


def sensibilidad_ml() -> str:
    fig, ax = plt.subplots(figsize=(5.2, 2.0))
    n = ["Agua histórica (JRC)\nlínea base", "Combinado\nGB + línea base", "Gradient\nboosting", "Ridge"]
    v = [0.64, 0.63, 0.53, 0.47]
    ax.bar(n, v, color=[CIAN, "#6bb3c4", "#9aa6b5", "#c4cbd5"], width=0.6)
    for i, x in enumerate(v):
        ax.text(i, x + 0.015, f"{x:.2f}", ha="center", fontsize=8.5)
    ax.set_ylim(0, 0.8); ax.set_ylabel("Spearman (2023-24)"); ax.tick_params(axis="x", labelsize=7.5)
    ax.grid(axis="y", color=GRIS, lw=0.6); ax.set_axisbelow(True)
    return svg(fig)

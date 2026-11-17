"""Datos fijos por celda de 0,1° para el riesgo en manchas (lo que se ve al acercar el mapa, desde zoom 6): los umbrales de lluvia del
SMN (earth_engine/umbrales_smn.py), las personas en zona inundable (a < 2 m del cauce para la lluvia y < 5 m para el río) y su
vulnerabilidad media, sumadas desde los radios censales que caen en cada celda. Se corre una vez en la Mac (necesita datos crudos);
modelos/riesgo_diario.py arma con esto las imágenes de cada día en GitHub Actions.

Salida: data/referencia/grilla_riesgo.npz. Uso: .venv/bin/python web/preparar_grilla_riesgo.py
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ / "earth_engine"))
sys.path.insert(0, str(RAIZ / "web"))
import lluvia_ninos as LN  # noqa: E402  (la grilla)
from preparar_geometrias import exposicion_vulnerabilidad_radios  # noqa: E402


def main() -> None:
    U = np.load(RAIZ / "data" / "procesado" / "umbrales_smn.npy")
    ny, nx = U.shape[1:]
    rr = pd.read_parquet(RAIZ / "data" / "referencia" / "rasgos_radios.parquet")
    t = pd.read_parquet(RAIZ / "data" / "raw" / "earth_engine" / "terreno_agua_radios.parquet", columns=["cod_indec", "pct_area_hand_5m"])
    rr = rr.merge(t, on="cod_indec", how="left")
    rr["E"], rr["V"] = exposicion_vulnerabilidad_radios(rr)
    fi = ((LN.NORTE - rr.lat) / LN.PASO).astype(int).clip(0, ny - 1).values
    ci = ((rr.lon - LN.OESTE) / LN.PASO).astype(int).clip(0, nx - 1).values
    pob = rr.poblacion.fillna(0).values
    PL, PR, PV, P = (np.zeros((ny, nx)) for _ in range(4))
    np.add.at(PL, (fi, ci), pob * rr.pct_area_hand_2m.fillna(0).values / 100)
    np.add.at(PR, (fi, ci), pob * rr.pct_area_hand_5m.fillna(0).values / 100)
    np.add.at(PV, (fi, ci), pob * rr.V.fillna(0).values)
    np.add.at(P, (fi, ci), pob)
    V = np.where(P > 0, PV / np.maximum(P, 1), 0)
    np.savez_compressed(RAIZ / "data" / "referencia" / "grilla_riesgo.npz", umb=U.astype(np.float16), pob_lluvia=PL.astype(np.float32),
                        pob_rio=PR.astype(np.float32), V=V.astype(np.float16), oeste=LN.OESTE, norte=LN.NORTE, paso=LN.PASO)
    print("grilla_riesgo.npz:", (RAIZ / "data" / "referencia" / "grilla_riesgo.npz").stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()

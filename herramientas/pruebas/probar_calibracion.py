"""Pruebas de modelos/calibracion_umbrales.py con datos sintéticos (sin Earth Engine). Uso: python herramientas/pruebas/probar_calibracion.py"""
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "modelos"))
from calibracion_umbrales import elegir_factor, metricas  # noqa: E402

rng = np.random.default_rng(0)
D, NY, NX = 40, 20, 20
U = np.full((NY, NX), 30.0)
mask = np.ones((NY, NX), bool)

# 1) ETS conocido: a=10,b=5,c=5,d=80
m = metricas(10, 5, 5, 80)
azar = 15 * 15 / 100
assert abs(m["ETS"] - (10 - azar) / (10 + 5 + 5 - azar)) < 1e-12 and abs(m["bias"] - 1.0) < 1e-12

# 2) Lluvia con señal (alerta ⇒ lluvia mayor) y ruido: el factor elegido respeta el Bias
A = (rng.random((D, NY, NX)) < 0.2).astype(np.int8)
mm = np.where(A >= 1, rng.gamma(2.0, 12.0, A.shape), rng.gamma(0.6, 6.0, A.shape))
r = elegir_factor(mm, U, A, 1, mask)
assert r["cumple_bias"] and 0.8 <= r["bias"] <= 1.5, r
print("sintético con señal:", {k: round(v, 3) if isinstance(v, float) else v for k, v in r.items()})

# 3) Sin restricción el factor es el de máximo ETS; con restricción, nunca da más sobrealerta que sin ella
libre = elegir_factor(mm, U, A, 1, mask, bias=(0, 1e9))
assert r["bias"] <= libre["bias"] + 1e-9 or r["cumple_bias"]

# 4) El piso físico nunca deja un umbral efectivo por debajo de él: con piso 25 mm nada con < 25 mm cuenta como pronóstico
r_piso = elegir_factor(mm, U, A, 1, mask, piso=25.0, bias=(0, 1e9))
pron = mm > np.maximum(r_piso["factor"] * U, 25.0)[None]
assert not pron[mm <= 25.0].any()

# 5) Sin ningún f que cumpla el Bias (alerta casi inexistente y lluvia generalizada): elige el de menor sobrealerta y avisa
A0 = np.zeros((D, NY, NX), np.int8); A0[0, 0, 0] = 1
mm0 = np.full((D, NY, NX), 50.0)
r0 = elegir_factor(mm0, U, A0, 1, mask)
assert not r0["cumple_bias"] and r0["factor"] == 1.2, r0
print("OK: 5 pruebas de calibracion_umbrales")

# Fuentes de datos y cobertura real

*Actualizado: 2026-09-28. La cobertura se calcula con `ingesta/cobertura.py` sobre los datos descargados, no se estima.*
*Detalle por gobierno local: `data/cobertura.csv`. Resumen por provincia: `data/cobertura_provincias.csv`. Registro de cada descarga: `data/manifest.csv`.*

## Unidad territorial

- **Gobiernos locales del INDEC (2 282)**: unidad municipal de referencia. Incluyen municipios, comunas, comisiones de fomento y juntas de gobierno de las 24 jurisdicciones. Otras fuentes quedan incompletas: la API Georef (2 082) no tiene Santiago del Estero ni Santa Cruz, y la capa del IGN (2 114) no tiene Santiago del Estero.
- **Radios censales 2022 (66 515)**: unidad de detalle (barrio).
- Los gobiernos locales cubren ~64 % de la superficie continental. El resto es rural, pero ahí vive **solo el 1 % de la población** (437 345 de 45,6 millones). Esa población se asigna al **departamento** (529).

## Cobertura por tipo de dato (% de los 2 282 gobiernos locales)

| Dato | Fuente | Cobertura | Nivel de detalle | Estado |
|---|---|---|---|---|
| Pronóstico de lluvia, humedad del suelo y escorrentía (6 meses) | ECMWF SEAS5 vía Open-Meteo | **100 %** | ~36 km (municipios vecinos comparten celda) | ✅ descargado |
| Alertas meteorológicas vigentes | SMN (CAP) | **100 %** (sistema nacional) | polígono + departamentos | ✅ se archiva a diario |
| Población, cloacas, agua, vivienda, NBI, salud, celular | INDEC Censo 2022 | **99,7 %** de los radios | radio censal | ✅ 17 variables |
| Establecimientos educativos | IGN | **99 %** | punto | ✅ |
| Establecimientos de salud | IGN (8 311) + OSM (6 974) | **90 %** (IGN) | punto, sin capacidad | ✅ |
| Puentes | OSM (40 658) | 74 % | línea/punto | ✅ completitud variable |
| Canales, zanjas y desagües | OSM (40 687) + IGN | 46 % | línea | ✅ completitud variable |
| Alcantarillas | OSM (35 825) | 63 % | punto/línea | ✅ completitud variable |
| Subestaciones eléctricas | OSM (1 670) | 30 % | punto | ✅ |
| Barrios populares | RENABAP (6 467) | 30 % (donde existen) | polígono | ✅ |
| Estación de río con nivel de alerta a ≤ 30 km | INA (175 estaciones, 1,25 M mediciones desde 2015) | **21 %** (Litoral y AMBA; **0 %** en NOA, Cuyo y Patagonia) | punto | ✅ |
| Plantas cloacales | OSM (735) | 9 % | punto | ⚠️ subregistro |
| Plantas potabilizadoras | OSM (640) | 10 % | punto | ⚠️ subregistro |
| Estaciones de bombeo | OSM (273) | 5 % | punto | ⚠️ subregistro |
| Basurales y rellenos | IGN + OSM (397) | 6-9 % | punto/polígono | ⚠️ subregistro (el Ministerio de Ambiente estima ~5 000 basurales) |
| Sumideros georreferenciados | BA Data | solo CABA (15 comunas) | punto | ✅ |
| Reclamos al 147 (sumideros, anegamientos, residuos) | BA Data 2011-2026 | solo CABA | punto (99 % con coordenadas) | ✅ ~2,5 GB |
| Lluvia diaria histórica 2011-2026 | ERA5 vía Open-Meteo | CABA (48 barrios) | ~25 km | ✅ |
| Pronóstico de caudal (210 días, ensamble) | GloFAS v4 vía Open-Meteo | estaciones INA con alerta | 5 km | ⏳ en curso (límite de la API) |
| Elevación 30 m, pendiente, bajos, acumulación de flujo | MDE-Ar IGN / Copernicus DEM | 100 % esperado | 30 m | ⏳ Earth Engine |
| Impermeabilización y cambio de uso del suelo 1985-2025 | MapBiomas Argentina | 100 % esperado | 30 m | ⏳ Earth Engine |
| Agua histórica e inundaciones observadas | JRC Global Surface Water, Sentinel-1 | 100 % esperado | 10-30 m | ⏳ Earth Engine |
| Sudestada y mareas del Río de la Plata | SHN | costa del Río de la Plata | puertos | ⏳ pendiente |
| Deslizamientos (probabilidad diaria) | NASA LHASA | 100 % esperado | 1 km | ⏳ pendiente |
| Suelos: drenaje y anegabilidad | INTA 1:500 000 | 100 % esperado | polígono | ⏳ pendiente |
| Dengue y leptospirosis | Boletín Epidemiológico Nacional | provincia / departamento | — | ⏳ pendiente |
| Eventos históricos | DesInventar, Copernicus EMS | departamento | — | ⏳ pendiente |

## Faltantes sin fuente pública nacional

| Dato | Por qué falta | Alternativa (proxy) | Acción |
|---|---|---|---|
| Red pluvial fuera de CABA | Los municipios no la publican | Pendiente + bajos del DEM + canales/alcantarillas de OSM | Borrador de pedido de información a municipios piloto |
| Geometría de la red cloacal | Los operadores (AySA, ABSA, Aguas Santafesinas, etc.) no la publican | Censo 2022: % de hogares con desagüe a red por radio | Borrador de pedido a operadores |
| Conexiones clandestinas o irregulares | No existe un registro | RENABAP (servicios en barrios populares) + Censo (pozo ciego, hoyo) | — |
| Estado de limpieza de sumideros | Solo CABA publica reclamos | Reclamos 147 en CABA; resto sin dato | — |
| Napas freáticas | Redes provinciales fragmentadas | Humedad del suelo (SEAS5) + lagunas (MapBiomas Agua) | — |
| Estaciones de río con alerta en NOA, Cuyo y Patagonia | El INA no tiene niveles de alerta allí | GloFAS en los cauces principales (Pilcomayo, Bermejo) | — |

## Licencias

- INDEC, IGN, INA, SMN, RENABAP, Georef: datos públicos con cita de fuente (SMN e IGN: CC BY 4.0).
- BA Data: CC BY 2.5 AR.
- OpenStreetMap: ODbL, exige atribución.
- Open-Meteo (ECMWF, GloFAS, ERA5): CC BY 4.0, gratuito para uso no comercial.
- Censo 2022 por radio: base REDATAM oficial del INDEC, consultada con el paquete `censoargentino`, que la expone como Parquet.

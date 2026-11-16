# Fuentes de datos y cobertura real

*Actualizado: 2026-09-28 (noche); fuentes del simulador y de las validaciones, 2026-11-15. La cobertura se calcula con `ingesta/cobertura.py` sobre los datos descargados, no se estima.*
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
| Pronóstico de caudal (210 días, ensamble) | GloFAS v4 vía Open-Meteo | 96 estaciones INA con alerta | 5 km | ✅ (se actualiza cada lunes) |
| Elevación, HAND (altura sobre el cauce), % de superficie a < 2 m y < 5 m del cauce, pendiente | MERIT Hydro (90 m) + Copernicus DEM GLO-30 (30 m) vía Earth Engine | **100 %** | gobierno local; radio censal en curso | ✅ |
| Urbano, agua, humedal y cultivos, cada año 1985-2024 | MapBiomas Argentina col. 2 vía Earth Engine | **100 %** | 30 m → gobierno local | ✅ |
| Agua histórica 1984-2021 (ocurrencia y máxima extensión) | JRC Global Surface Water vía Earth Engine | **100 %** | 30 m → gobierno local | ✅ |
| Agua observada en los Niños 2015-16 y 2023-24 vs. la sequía 2022-23 | Dynamic World (Sentinel-2 + deep learning) vía Earth Engine | **100 %** | 10 m → gobierno local | ✅ (Sentinel-1 descartado por falsos positivos en sequía) |
| Lluvia de las tormentas de los Niños (desde 2000), hora más lluviosa y lluvia de 1 h de 2 años | IMERG V07 Final (NASA) vía Earth Engine (`earth_engine/lluvia_ninos.py`) | **100 %** | 0,1° (~11 km), cada 30 min | ✅ precalculada (elegida contra 482 tormentas medidas: ver `docs/04_validacion_simulador.md`) |
| Lluvia de 1997-98 y forma hora a hora de cada tormenta; humedad del suelo antes de la tormenta | ERA5 / ERA5-Land (Earth Engine y Open-Meteo) | **100 %** | 0,1°–0,25°, horaria | ✅ (subestima las tormentas fuertes: 60 % de lo medido en las de ≥ 100 mm) |
| Altura de los ríos cada día de los Niños desde 1997-98 | INA medido (2015-16, 2023-24) + reanálisis GloFAS con la curva de cada estación | 72 estaciones | diaria | ✅ `web/datos/rios_ninos/` |
| Lluvia diaria medida (validación) | INA red RHN-SAT (366 pluviómetros, 2019-2026) + GHCN-Daily de NOAA (75 estaciones, completas solo en 2002-2005) | puntos | diaria (9 a 9 h) | ✅ |
| Agua vista por radar (validación del río) | Sentinel-1 GRD vía Earth Engine | casos | 10 m | ✅ Concordia 28-nov-2023 |
| Empresas y lugares que OSM no tiene | TomTom Search (2 500 consultas/día gratis) | nacional | punto | ✅ (clave pública en `web/claves.js`: conviene limitarla al dominio) |
| Sudestada y mareas del Río de la Plata | SHN | costa del Río de la Plata | puertos | ⏳ pendiente |
| Deslizamientos históricos 1970-2019 | Catálogo Global de Deslizamientos (NASA) vía Earth Engine | 7 gobiernos locales | punto | ⚠️ subregistro; se complementa con pendiente p90 + arcilla + lluvia |
| Suelo: % de arcilla (infiltración) | OpenLandMap vía Earth Engine | **100 %** | 250 m | ✅ (reemplaza al INTA, cuyo geoservicio no responde) |
| Dengue y zika por semana, 2018-2025 | Ministerio de Salud (datos.gob.ar) | departamento | — | ✅ (leptospirosis pendiente) |
| Desastres históricos | DesInventar Argentina | departamento | — | ✅ (Copernicus EMS pendiente) |

## Faltantes sin fuente pública nacional

| Dato | Por qué falta | Alternativa (proxy) | Acción |
|---|---|---|---|
| Red pluvial fuera de CABA | Los municipios no la publican | Capacidad = lluvia de 1 h de 2 años del lugar (IMERG) + bajos del DEM + canales/alcantarillas de OSM | Borrador de pedido de información a municipios piloto |
| Curvas intensidad-duración-frecuencia locales | No hay curvas públicas para la mayoría de las ciudades | Máximos de IMERG por duración (suavizan los picos de minutos) | — |
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

## Riesgo por día (15-nov-2026)
- **Ensamble del ECMWF (IFS ENS, 50 miembros perturbados, 0,25°)** — datos abiertos del ECMWF (data.ecmwf.int, CC BY 4.0), corrida de 00 o 12 UTC hasta 360 h, parámetro `tp`. Cliente `ecmwf-opendata`, lectura con `eccodes`. Los 2 días previos: HRES 00 UTC de anteayer (pasos 24 y 48 h).
- **ERA5-Land diario (Earth Engine `ECMWF/ERA5_LAND/DAILY_AGGR`)** 1995-2024 — máximos anuales de lluvia de 3 días y Gumbel por momentos (T2, T5, T10) por celda de 0,1°.
- **GloFAS v4 ensamble (Open-Meteo flood API, `ensemble=true`)** — 51 miembros, 31 días pasados + 15, convertidos a altura con `data/referencia/rios_curvas.parquet`.

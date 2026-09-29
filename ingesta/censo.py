"""Censo 2022 (INDEC) por radio censal: población, saneamiento, vivienda y vulnerabilidad.

Se consulta con el paquete `censoargentino`, que expone la base REDATAM oficial del INDEC
(primera entrega definitiva, dic-2024) como Parquet remoto. El código de radio (id_geo, 9 dígitos)
coincide con `cod_indec` de la cartografía de radios del INDEC.

Salida: data/raw/censo/<variable>.parquet en formato largo (id_geo, categoría, conteo)
"""
import censoargentino as censo

from comun import RAW, registrar

VARIABLES = {
    # Exposición
    "PERSONA_EDADGRU": "población por grandes grupos de edad (niños y mayores = más vulnerables)",
    "VIVIENDA_URP": "área urbana / rural",
    # Saneamiento y agua (factores de inundación y contaminación)
    "HOGAR_H18": "desagüe del inodoro: red cloacal / cámara séptica / pozo ciego / hoyo",
    "HOGAR_H15_17_18": "servicio sanitario",
    "HOGAR_H13": "tenencia de agua",
    "HOGAR_H14": "procedencia del agua para beber y cocinar",
    # Vivienda
    "HOGAR_H10": "material de los pisos",
    "HOGAR_H11": "material del techo",
    "HOGAR_INMAT": "calidad de los materiales",
    "HOGAR_H20CP": "hacinamiento",
    # Vulnerabilidad socioeconómica
    "HOGAR_NBI_TOT": "necesidades básicas insatisfechas",
    "HOGAR_NBI_SAN": "NBI condiciones sanitarias",
    "HOGAR_NBI_VIV": "NBI vivienda inconveniente",
    "HOGAR_IPMH": "índice de privación material de los hogares",
    "PERSONA_P19": "cobertura de salud",
    # Capacidad de recibir alertas
    "HOGAR_H24B": "celular con internet",
    "HOGAR_H22": "propiedad de la vivienda",
}
LICENCIA = "INDEC, Censo 2022 (uso libre con cita); acceso vía paquete censoargentino"


def main() -> None:
    carpeta = RAW / "censo"
    carpeta.mkdir(parents=True, exist_ok=True)
    for var, descripcion in VARIABLES.items():
        try:
            df = censo.query(variables=var)
            destino = carpeta / f"{var}.parquet"
            df.to_parquet(destino, index=False)
            registrar("INDEC Censo 2022", f"{var}: {descripcion}", "hf://pedroorden/censoargentino",
                      destino, "Parquet", len(df), LICENCIA,
                      nota=f"{df['id_geo'].nunique()} radios")
            print(f"{var}: {len(df)} filas, {df['id_geo'].nunique()} radios")
        except Exception as e:
            registrar("INDEC Censo 2022", var, "hf://pedroorden/censoargentino", "", "Parquet",
                      None, LICENCIA, "error", str(e)[:200])
            print(f"{var}: ERROR {e}")


if __name__ == "__main__":
    main()

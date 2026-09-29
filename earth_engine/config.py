"""Configuración de Google Earth Engine.

El proyecto de Google Cloud donde está habilitado Earth Engine (uso no comercial).
Para usar otro proyecto: cambiar este valor o definir la variable de entorno EE_PROJECT.
"""
import os

PROYECTO_EE = os.environ.get("EE_PROJECT", "camisetas-de-futbol-argentino")

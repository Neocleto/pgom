# Revisión de la entrega PGOM

Fecha: 13 de noviembre de 2026.

## Resultado

- Identidad PGOM y denominación Plan General de Ordenación Municipal en interfaz, plantillas, documentación, correos y recursos.
- Consultas a `pgom` con nombres de tablas sin prefijo; se conservan las consultas institucionales compartidas a `dbo` y `div_adm`.
- Rutas de instalación, redirecciones, clases, variables CSS, funciones, claves de almacenamiento del navegador y contrato del configurador coherentes con PGOM.
- Verde corporativo **#003B17**, extraído de la muestra facilitada, con variantes para fondos, bordes y estados interactivos.
- Tema de Bootstrap propio, sin modificar los archivos de las librerías.
- Logotipos de proyecto, favicon y recursos de estado vacío en SVG. Los logotipos institucionales conservan sus originales.
- Icono de documentos rotulado PGOM, iconos de participación adaptados mediante CSS, seis ayudas visuales nuevas y diagramas de fases en verde.
- Preguntas iniciales redactadas para PGOM y centradas en el uso del portal; se retiran de la plantilla las condiciones específicas de otro instrumento de planeamiento.
- SQL manual opcional para los catálogos de un esquema vacío. Los registros ya existentes no se sustituyen.

## Verificación ejecutada

- Comprobación de sintaxis de los 80 archivos PHP con PHP CLI 8.4.27. La aplicación sigue orientada a PHP 8.3; no se ha introducido sintaxis propia de PHP 8.4. El entorno de revisión no dispone de PHP 8.3 nativo.
- Análisis sintáctico adicional de los archivos PHP propios configurado para PHP 8.3.
- Comprobación de sintaxis de los 27 archivos JavaScript propios con Node.
- Renderizado PHP de acceso, portal municipal, configurador y documentos con datos de ejemplo, sin avisos ni errores PHP.
- Ejecución de sus scripts y navegación por los apartados del configurador en un DOM simulado, con respuestas de ejemplo. Se comprueban catálogo de iconos, color corporativo, selección de muestras y recursos locales de las páginas.
- Análisis sintáctico de las hojas CSS y de los 15 archivos SQL mediante analizadores independientes. No equivale a ejecutar las migraciones contra una base de datos.
- Revisión de rutas relativas de recursos CSS, imágenes y scripts, y revisión de includes PHP estáticos.
- Búsqueda de la identidad anterior en nombres y contenido del proyecto, además de reconocimiento de texto en los recursos raster susceptibles de contenerla.
- Comparación de las librerías con la base: se conservan sus bytes originales.
- Extracción final del ZIP y comparación de inventario y SHA-256 de cada archivo con la carpeta entregada.

## Límites de la revisión

No se dispone de vuestra conexión PostgreSQL, credenciales, datos, permisos, sesiones ni SMTP. No se ha probado CRUD contra vuestra base, el inicio de sesión real, la entrega de correos ni la publicación en LOCAL/PRE/PRO.

La ejecución con DOM simulado verifica marcado y comportamiento de JavaScript, pero no sustituye una revisión visual y responsive en un navegador real. El navegador de este entorno no pudo iniciarse para esa comprobación.

La copia del esquema debe conservar tablas, columnas, restricciones, secuencias, funciones y triggers propios. El código nuevo no corrige automáticamente dependencias que pudiera conservar una copia de base de datos. El SQL de comprobación permite revisarlas antes de usar la aplicación.

Los pasos de instalación y la prueba funcional pendiente están en `LEEME_INSTALACION.md`. El inventario de archivos cambiados está en `ARCHIVOS_MODIFICADOS.txt`.

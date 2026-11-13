-- ============================================================================
-- COMPROBACIÓN DE LA COPIA PGOM: SOLO LECTURA
-- Ejecutar con el usuario de conexión de la aplicación.
-- No crea, modifica ni elimina tablas, datos o esquemas.
-- ============================================================================

-- 1. Las 19 tablas utilizadas por la aplicación deben existir y tener permisos.
WITH tablas_necesarias(nombre) AS (
    VALUES
        ('accesos_publicos'), ('categorias_documentos'), ('configuracion_visual'),
        ('documentos'), ('faq_municipio'), ('faqs'), ('fase_actual'), ('fases'),
        ('fases_documentos'), ('formulario_preguntas'), ('formulario_respuestas'),
        ('formulario_secciones'), ('formularios'), ('informacion_general'),
        ('municipios'), ('noticias'), ('participacion'), ('participacion_botones'),
        ('subfases')
), tablas_resueltas AS (
    SELECT nombre, to_regclass('pgom.' || nombre) AS tabla
    FROM tablas_necesarias
)
SELECT nombre,
       tabla IS NOT NULL AS existe,
       has_table_privilege(current_user, tabla, 'SELECT') AS puede_leer,
       has_table_privilege(current_user, tabla, 'INSERT') AS puede_crear,
       has_table_privilege(current_user, tabla, 'UPDATE') AS puede_editar,
       has_table_privilege(current_user, tabla, 'DELETE') AS puede_eliminar
FROM tablas_resueltas
ORDER BY nombre;

-- 2. No deben quedar claves externas de PGOM dirigidas al esquema anterior.
SELECT tabla.relname AS tabla,
       restriccion.conname AS restriccion,
       pg_get_constraintdef(restriccion.oid) AS definicion
FROM pg_constraint restriccion
JOIN pg_class tabla ON tabla.oid = restriccion.conrelid
JOIN pg_namespace esquema ON esquema.oid = tabla.relnamespace
JOIN pg_class destino ON destino.oid = restriccion.confrelid
JOIN pg_namespace esquema_destino ON esquema_destino.oid = destino.relnamespace
WHERE restriccion.contype = 'f'
  AND esquema.nspname = 'pgom'
  AND esquema_destino.nspname NOT IN ('pgom', 'dbo', 'div_adm')
ORDER BY tabla.relname, restriccion.conname;

-- 3. Los valores por defecto, incluidas las secuencias, no deben usar el anterior.
SELECT tabla.relname AS tabla,
       columna.attname AS columna,
       pg_get_expr(defecto.adbin, defecto.adrelid) AS valor_por_defecto
FROM pg_attrdef defecto
JOIN pg_class tabla ON tabla.oid = defecto.adrelid
JOIN pg_namespace esquema ON esquema.oid = tabla.relnamespace
JOIN pg_attribute columna ON columna.attrelid = tabla.oid
                        AND columna.attnum = defecto.adnum
WHERE esquema.nspname = 'pgom'
  AND pg_get_expr(defecto.adbin, defecto.adrelid) LIKE '%nextval(%'
  AND pg_get_expr(defecto.adbin, defecto.adrelid) NOT LIKE '%pgom.%'
ORDER BY tabla.relname, columna.attname;

-- 4. Los triggers de PGOM tampoco deben llamar funciones del esquema anterior
--    ni funciones cuyo cuerpo conserve referencias a él.
SELECT tabla.relname AS tabla,
       disparador.tgname AS nombre_trigger,
       esquema_funcion.nspname AS esquema_funcion,
       funcion.proname AS funcion
FROM pg_trigger disparador
JOIN pg_class tabla ON tabla.oid = disparador.tgrelid
JOIN pg_namespace esquema ON esquema.oid = tabla.relnamespace
JOIN pg_proc funcion ON funcion.oid = disparador.tgfoid
JOIN pg_namespace esquema_funcion ON esquema_funcion.oid = funcion.pronamespace
WHERE esquema.nspname = 'pgom'
  AND NOT disparador.tgisinternal
  AND esquema_funcion.nspname <> 'pgom'
ORDER BY tabla.relname, disparador.tgname;

-- 5. Revisa también funciones propias, aunque no estén vinculadas a un trigger.
SELECT funcion.oid::regprocedure AS funcion, pg_get_functiondef(funcion.oid) AS definicion
FROM pg_proc funcion
JOIN pg_namespace esquema ON esquema.oid = funcion.pronamespace
WHERE esquema.nspname = 'pgom'
  AND funcion.prokind IN ('f', 'p')
ORDER BY funcion.proname;

-- Resultado esperado: las 19 tablas existen; permisos acordes al uso de cada
-- tabla; las consultas 2 a 4 no devuelven filas; revisar las funciones listadas en 5. Si aparecen dependencias,
-- deben corregirse en la base de datos antes de retirar el esquema anterior.

-- 6. Catálogos: deben contener filas para usar fases, documentos y plantilla.
SELECT 'fases' AS catalogo, COUNT(*) AS filas FROM pgom.fases
UNION ALL SELECT 'subfases', COUNT(*) FROM pgom.subfases
UNION ALL SELECT 'fases_documentos', COUNT(*) FROM pgom.fases_documentos
UNION ALL SELECT 'faqs', COUNT(*) FROM pgom.faqs;

-- PGOM: CATÁLOGOS INICIALES PARA UN ESQUEMA YA CREADO
-- Ejecutar manualmente SOLO si las tablas de catálogo están vacías.
-- No crea ni altera tablas. No modifica ni borra registros existentes.
-- Cada bloque omite el catálogo si ya contiene filas. Ejecutar como transacción.
BEGIN;
-- Una copia del esquema debe usar exclusivamente sus propias secuencias.
-- Se comprueban tanto los valores por defecto como la propiedad de la secuencia.
DO $$
DECLARE tabla text; secuencia text;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_attrdef valor
        JOIN pg_class tabla ON tabla.oid = valor.adrelid
        JOIN pg_namespace esquema ON esquema.oid = tabla.relnamespace
        JOIN pg_depend dependencia ON dependencia.classid = 'pg_attrdef'::regclass
                                  AND dependencia.objid = valor.oid
                                  AND dependencia.refclassid = 'pg_class'::regclass
        JOIN pg_class secuencia ON secuencia.oid = dependencia.refobjid AND secuencia.relkind = 'S'
        JOIN pg_namespace origen ON origen.oid = secuencia.relnamespace
        WHERE esquema.nspname = 'pgom' AND origen.nspname <> 'pgom'
          AND tabla.relname IN ('fases', 'subfases', 'faqs')
    ) THEN
        RAISE EXCEPTION 'Revisar la copia del esquema: un catálogo usa una secuencia externa a pgom.';
    END IF;
    FOREACH tabla IN ARRAY ARRAY['fases','subfases','faqs'] LOOP
        secuencia := pg_get_serial_sequence('pgom.' || tabla, 'id');
        IF secuencia IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM pg_class objeto
            JOIN pg_namespace esquema ON esquema.oid = objeto.relnamespace
            WHERE objeto.oid = secuencia::regclass AND esquema.nspname = 'pgom'
        ) THEN
            RAISE EXCEPTION 'Revisar la secuencia de pgom.%: debe pertenecer a pgom.', tabla;
        END IF;
    END LOOP;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pgom.fases) THEN
        INSERT INTO pgom.fases (id, num_fase, titulo, imagen_url) VALUES
            (1, 1, 'Programa de trabajo y participación', 'images/municipios/fases/fase1.svg'),
            (2, 2, 'Redacción del avance', 'images/municipios/fases/fase2.svg'),
            (3, 3, 'Acuerdo de avance y tramitación ambiental', 'images/municipios/fases/fase3.svg'),
            (4, 4, 'Redacción de aprobación inicial', 'images/municipios/fases/fase4.svg'),
            (5, 5, 'Aprobación inicial e información pública', 'images/municipios/fases/fase5.svg'),
            (6, 6, 'Propuesta final', 'images/municipios/fases/fase6.svg'),
            (7, 7, 'Aprobación definitiva', 'images/municipios/fases/fase7.svg'),
            (8, 8, 'Publicación y entrada en vigor', 'images/municipios/fases/fase8.svg');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pgom.subfases) THEN
        INSERT INTO pgom.subfases (id, num_fase_padre, codigo_subfase, titulo, imagen_url) VALUES
            (1, 1, '1.1', 'Participación ciudadana', 'images/municipios/fases/fase1_1.png'),
            (2, 1, '1.2', 'Información y diagnóstico previo', 'images/municipios/fases/fase1_2.png'),
            (3, 2, '2.1', 'Redacción del avance del PGOM', 'images/municipios/fases/fase2_1.png'),
            (4, 2, '2.2', 'Entrega del avance del PGOM', 'images/municipios/fases/fase2_2.png'),
            (5, 3, '3.1', 'Acuerdo municipal de avance y publicación web', 'images/municipios/fases/fase3_1.png'),
            (6, 3, '3.2', 'Tramitación ambiental y salud', 'images/municipios/fases/fase3_2.png'),
            (7, 4, '4.1', 'Redacción de aprobación inicial del PGOM', 'images/municipios/fases/fase4_1.png'),
            (8, 4, '4.2', 'Entrega de aprobación inicial del PGOM', 'images/municipios/fases/fase4_2.png'),
            (9, 5, '5.1', 'Aprobación inicial e información pública', 'images/municipios/fases/fase5_1.png'),
            (10, 5, '5.2', 'Petición de informes sectoriales', 'images/municipios/fases/fase5_2.png'),
            (11, 6, '6.1', 'Informes sectoriales y propuesta final del PGOM', 'images/municipios/fases/fase6_1.png'),
            (12, 6, '6.2', 'Entrega de propuesta final del PGOM', 'images/municipios/fases/fase6_2.png'),
            (13, 7, '7.1', 'Aprobación definitiva del PGOM', 'images/municipios/fases/fase7_1.png'),
            (14, 8, '8.1', 'Publicación del PGOM', 'images/municipios/fases/fase8_1.png'),
            (15, 8, '8.2', 'Entrada en vigor y divulgación del PGOM', 'images/municipios/fases/fase8_2.png');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pgom.fases_documentos) THEN
        INSERT INTO pgom.fases_documentos (num_fase, codigo, etiqueta, titulo, es_fase_21) VALUES
            (1, '1', 'FASE 1', 'AVANCE Y DOCUMENTO INICIAL ESTRATÉGICO', FALSE),
            (2, '2', 'FASE 2', 'APROBACIÓN INICIAL Y EVALUACIÓN AMBIENTAL ESTRATÉGICA', FALSE),
            (21, '2.1', 'FASE 2.1', 'SEGUNDA APROBACIÓN INICIAL Y EVALUACIÓN AMBIENTAL ESTRATÉGICA', TRUE),
            (4, '2.9', 'Documento final', 'DOCUMENTO FINAL', FALSE),
            (3, '3', 'FASE 3', 'APROBACIÓN DEFINITIVA Y EVALUACIÓN AMBIENTAL ESTRATÉGICA', FALSE);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pgom.faqs) THEN
        INSERT INTO pgom.faqs (id, pregunta, respuesta) VALUES
            (1, '¿Qué es el PGOM?', 'PGOM significa Plan General de Ordenación Municipal. Este portal reúne la información del plan de tu municipio, su estado de tramitación, los documentos publicados y las vías de participación.'),
            (2, '¿Cuál es el objetivo principal del PGOM?', 'Definir el modelo general de ordenación del municipio. Consulta la documentación publicada para conocer las propuestas concretas de tu localidad.'),
            (3, '¿Quién elabora el PGOM?', 'La elaboración corresponde al equipo redactor y a las administraciones que intervienen en el expediente. El Ayuntamiento facilita la información sobre los responsables y el seguimiento del plan.'),
            (4, '¿Cómo puedo conocer las propuestas para mi municipio?', 'Consulta los documentos, las noticias y la información del plan publicados en este portal. Para resolver una duda sobre una propuesta concreta, utiliza los canales de contacto municipales.'),
            (5, '¿Dónde puedo consultar el estado del PGOM?', 'En el apartado Fases se muestra la fase actual y el estado de la tramitación que haya publicado el Ayuntamiento.'),
            (6, '¿Cómo puede participar la ciudadanía?', 'Puedes consultar los materiales disponibles, responder a las encuestas habilitadas y enviar sugerencias a través del buzón cuando esté activo. Los anuncios oficiales indican los plazos y canales de cada trámite.'),
            (7, '¿Dónde se publica la información ambiental del plan?', 'La documentación ambiental disponible se puede consultar en el apartado Documentos, junto al resto de materiales publicados del expediente.'),
            (8, '¿Qué ocurre si el PGOM todavía no está aprobado?', 'Consulta la fase actual y los anuncios municipales para conocer el estado del expediente. Para saber qué planeamiento resulta aplicable a una actuación concreta, solicita información al Ayuntamiento.'),
            (9, '¿Dónde puedo obtener más información sobre el PGOM de mi municipio?', 'En este portal, en la web del Ayuntamiento y a través de los canales de contacto municipales. Consulta también las publicaciones oficiales que se indiquen en el expediente.'),
            (10, '¿Cómo puedo enviar una consulta o sugerencia?', 'Utiliza el buzón de participación si está habilitado o los canales de atención del Ayuntamiento. Para presentar documentación dentro de un trámite oficial, sigue el procedimiento indicado en su anuncio.');
    END IF;
END $$;
DO $$
DECLARE tabla text; secuencia text; maximo bigint; ultimo bigint;
BEGIN
    FOREACH tabla IN ARRAY ARRAY['fases','subfases','faqs'] LOOP
        secuencia := pg_get_serial_sequence('pgom.' || tabla, 'id');
        IF secuencia IS NOT NULL THEN
            EXECUTE format('SELECT MAX(id) FROM pgom.%I', tabla) INTO maximo;
            EXECUTE format('SELECT last_value FROM %s', secuencia) INTO ultimo;
            IF maximo IS NOT NULL AND maximo >= ultimo THEN
                PERFORM setval(secuencia::regclass, maximo, true);
            END IF;
        END IF;
    END LOOP;
END $$;
COMMIT;

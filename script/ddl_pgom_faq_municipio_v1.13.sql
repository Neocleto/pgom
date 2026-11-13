-- ============================================================================
-- PGOM V1.13 - PREGUNTAS FRECUENTES PERSONALIZABLES POR MUNICIPIO
-- ============================================================================
-- La biblioteca pgom.faqs continúa siendo común y reutilizable.
-- Estas columnas permiten adaptar una pregunta para un municipio concreto
-- o crear una pregunta exclusiva sin modificar dicha biblioteca.
-- ============================================================================

ALTER TABLE pgom.faq_municipio
    ADD COLUMN IF NOT EXISTS pregunta_personalizada TEXT;

ALTER TABLE pgom.faq_municipio
    ADD COLUMN IF NOT EXISTS respuesta_personalizada TEXT;

ALTER TABLE pgom.faq_municipio
    ADD COLUMN IF NOT EXISTS es_exclusiva BOOLEAN NOT NULL DEFAULT FALSE;

-- Una pregunta exclusiva no necesita estar enlazada con la biblioteca común.
ALTER TABLE pgom.faq_municipio
    ALTER COLUMN pregunta_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pgom_faq_municipio_codigo_orden
    ON pgom.faq_municipio (cod_mun, orden, id);

-- La comprobación se añade sin validar los datos antiguos para que la migración
-- pueda ejecutarse también en instalaciones que ya tengan contenido.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pgom_faq_municipio_contenido_chk'
          AND conrelid = 'pgom.faq_municipio'::regclass
    ) THEN
        ALTER TABLE pgom.faq_municipio
            ADD CONSTRAINT pgom_faq_municipio_contenido_chk
            CHECK (
                pregunta_id IS NOT NULL
                OR (
                    NULLIF(BTRIM(pregunta_personalizada), '') IS NOT NULL
                    AND NULLIF(BTRIM(respuesta_personalizada), '') IS NOT NULL
                )
            ) NOT VALID;
    END IF;
END $$;

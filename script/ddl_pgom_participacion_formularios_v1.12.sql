-- ============================================================================
-- PGOM v1.12 - BOTONES DE PARTICIPACION VINCULADOS A FORMULARIOS
--
-- Cada boton puede mostrar:
-- - Solo un archivo PDF.
-- - Solo un formulario online.
-- - El formulario online y su archivo PDF.
-- ============================================================================

ALTER TABLE pgom.participacion_botones
    ADD COLUMN IF NOT EXISTS tipo_contenido VARCHAR(20) NOT NULL DEFAULT 'pdf';

ALTER TABLE pgom.participacion_botones
    ADD COLUMN IF NOT EXISTS formulario_id INTEGER;

-- Los registros antiguos siguen funcionando como botones PDF.
UPDATE pgom.participacion_botones
SET tipo_contenido = 'pdf'
WHERE tipo_contenido IS NULL
   OR tipo_contenido NOT IN ('pdf', 'formulario', 'ambos');

-- Añadimos las restricciones solo cuando todavía no existen.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pgom_participacion_boton_tipo_chk'
          AND conrelid = 'pgom.participacion_botones'::regclass
    ) THEN
        ALTER TABLE pgom.participacion_botones
            ADD CONSTRAINT pgom_participacion_boton_tipo_chk
            CHECK (tipo_contenido IN ('pdf', 'formulario', 'ambos'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pgom_participacion_boton_formulario_fk'
          AND conrelid = 'pgom.participacion_botones'::regclass
    ) THEN
        ALTER TABLE pgom.participacion_botones
            ADD CONSTRAINT pgom_participacion_boton_formulario_fk
            FOREIGN KEY (formulario_id)
            REFERENCES pgom.formularios(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pgom_participacion_botones_formulario
ON pgom.participacion_botones(formulario_id);

COMMENT ON COLUMN pgom.participacion_botones.tipo_contenido IS
'Contenido mostrado por el boton: pdf, formulario o ambos.';

COMMENT ON COLUMN pgom.participacion_botones.formulario_id IS
'Formulario online vinculado al boton de participacion.';

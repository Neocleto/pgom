-- Conserva el orden y el contenido de las encuestas existentes.
BEGIN;
ALTER TABLE pgom.formulario_secciones
    ADD COLUMN IF NOT EXISTS numero VARCHAR(30) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS nivel SMALLINT NOT NULL DEFAULT 0 CHECK (nivel BETWEEN 0 AND 2);

ALTER TABLE pgom.formulario_preguntas
    ADD COLUMN IF NOT EXISTS numero VARCHAR(30) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS nivel SMALLINT NOT NULL DEFAULT 0 CHECK (nivel BETWEEN 0 AND 2);
COMMIT;

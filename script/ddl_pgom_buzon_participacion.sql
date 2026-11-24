-- Ejecutar antes de publicar el nuevo buzón. No modifica los datos existentes.
BEGIN;

-- Los adjuntos quedan en PostgreSQL y solo se descargan desde el panel.
CREATE TABLE IF NOT EXISTS pgom.buzon_participacion (
    id BIGSERIAL PRIMARY KEY,
    cod_mun VARCHAR(10) NOT NULL REFERENCES pgom.municipios(cod_mun) ON DELETE RESTRICT,
    asunto VARCHAR(200) NOT NULL,
    mensaje VARCHAR(10000) NOT NULL,
    fecha_envio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nombre_adjunto VARCHAR(255),
    tipo_adjunto VARCHAR(40),
    archivo_adjunto BYTEA,
    correo_enviado BOOLEAN
);

CREATE INDEX IF NOT EXISTS idx_pgom_buzon_municipio_envio
    ON pgom.buzon_participacion (cod_mun, id DESC);

COMMIT;

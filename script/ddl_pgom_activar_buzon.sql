-- Prepara el interruptor de Datos generales. Conserva el valor si la columna ya existía.
ALTER TABLE pgom.municipios
    ADD COLUMN IF NOT EXISTS buzon_participacion_activo BOOLEAN NOT NULL DEFAULT FALSE;

-- Recupera el color editable del buzón. Conserva el guardado anteriormente.
ALTER TABLE pgom.configuracion_visual
    ADD COLUMN IF NOT EXISTS color_buzon VARCHAR(20) NOT NULL DEFAULT '#003b17';

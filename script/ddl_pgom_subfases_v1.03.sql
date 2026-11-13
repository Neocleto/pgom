-- 1. Nueva tabla: subfases
CREATE TABLE IF NOT EXISTS pgom.subfases (
  id SERIAL PRIMARY KEY,
  num_fase_padre INTEGER NOT NULL,
  codigo_subfase VARCHAR(10) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  imagen_url VARCHAR(255) NOT NULL,
  fecha_creacion TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pgom_subfases_unique UNIQUE (num_fase_padre, codigo_subfase)
);

-- Relación a fase padre (tu tabla actual pgom.fases)
ALTER TABLE pgom.subfases
  ADD CONSTRAINT pgom_subfases_num_fase_padre_fkey
  FOREIGN KEY (num_fase_padre)
  REFERENCES pgom.fases(num_fase)
  ON UPDATE NO ACTION ON DELETE NO ACTION;

-- 2.  Modificar pgom.fase_actual: guardar subfase

ALTER TABLE pgom.fase_actual
  ADD COLUMN IF NOT EXISTS subfase_id INTEGER;

ALTER TABLE pgom.fase_actual
  ADD CONSTRAINT pgom_fase_actual_subfase_fkey
  FOREIGN KEY (subfase_id)
  REFERENCES pgom.subfases(id)
  ON UPDATE NO ACTION
  ON DELETE NO ACTION;



-- 3.  Limpieza opcional si estás probando (NO lo uses en prod sin querer)
-- TRUNCATE pgom.subfases RESTART IDENTITY;

INSERT INTO pgom.subfases (num_fase_padre, codigo_subfase, titulo, imagen_url) VALUES
(1,'1.1','PARTICIPACIÓN CIUDADANA','images/municipios/fases/fase1_1.png'),
(1,'1.2','INFORMACIÓN Y DIAGNÓSTICO PREVIO','images/municipios/fases/fase1_2.png'),

(2,'2.1','REDACCIÓN DEL AVANCE DEL PGOM','images/municipios/fases/fase2_1.png'),
(2,'2.2','ENTREGA AVANCE DEL PGOM','images/municipios/fases/fase2_2.png'),

(3,'3.1','ACUERDO MUNICIPAL DE AVANCE y PUBLICACIÓN WEB','images/municipios/fases/fase3_1.png'),
(3,'3.2','TRAMITACIÓN AMBIENTAL y SALUD','images/municipios/fases/fase3_2.png'),

(4,'4.1','REDACCIÓN DE APROBACIÓN INICIAL DEL PGOM','images/municipios/fases/fase4_1.png'),
(4,'4.2','ENTREGA DE APROBACIÓN INICIAL DEL PGOM','images/municipios/fases/fase4_2.png'),

(5,'5.1','APROBACIÓN INICIAL DEL PGOM E INFORMACIÓN PÚBLICA','images/municipios/fases/fase5_1.png'),
(5,'5.2','PETICIÓN DE INFORMES SECTORIALES','images/municipios/fases/fase5_2.png'),

(6,'6.1','RECEPCIÓN INFORMES SECTORIALES Y REDACCIÓN PROPUESTA FINAL PGOM.','images/municipios/fases/fase6_1.png'),
(6,'6.2','ENTREGA PROPUESTA FINAL DEL PGOM','images/municipios/fases/fase6_2.png'),

(7,'7.1','APROBACIÓN DEFINITIVA DEL PGOM','images/municipios/fases/fase7_1.png'),

(8,'8.1','PUBLICACIÓN EN BOJA DEL PGOM.','images/municipios/fases/fase8_1.png'),
(8,'8.2','ENTRADA EN VIGOR DEL PGOM y DIVULGACIÓN.','images/municipios/fases/fase8_2.png');


-- 3.1  Migración de datos existentes (opcional)
-- Si ya tienes municipios con pgom.fase_actual.num_fase guardado, puedes asignarles por defecto la primera subfase de esa fase:
UPDATE pgom.fase_actual fa
SET subfase_id = s.id
FROM (
  SELECT DISTINCT ON (num_fase_padre)
    num_fase_padre,
    id
  FROM pgom.subfases
  ORDER BY num_fase_padre, codigo_subfase
) s
WHERE fa.subfase_id IS NULL
  AND fa.num_fase = s.num_fase_padre;


-- 4. Añadimos columna descripcion a subfase
ALTER TABLE pgom.subfases
ADD COLUMN descripcion TEXT;

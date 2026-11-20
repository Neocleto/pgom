<?php
// Borra únicamente archivos de documentos o imágenes del municipio indicado.
// Se llama después de guardar el cambio en BBDD, usando la ruta leída del registro.
function eliminarArchivoMunicipalPGOM($rutaRelativa, $codMun, $conn)
{
    $rutaRelativa = str_replace('\\', '/', trim((string)$rutaRelativa));
    // Acepta también las rutas antiguas guardadas con el nombre del proyecto.
    $rutaRelativa = ltrim($rutaRelativa, '/');
    $rutaRelativa = preg_replace('~^pgom/~i', '', $rutaRelativa);
    if ($rutaRelativa === '' || !preg_match('/^\d{5}$/', (string)$codMun)) return;

    // Conservar el archivo si otro recurso todavía lo utiliza, incluso oculto.
    // Si no se puede comprobar, se conserva: un fallo de limpieza no debe romper enlaces.
    try {
        $sql = "SELECT EXISTS (
                    SELECT 1 FROM (
                        SELECT archivo_url AS ruta FROM pgom.documentos
                        UNION ALL
                        SELECT archivo_url FROM pgom.participacion_botones
                        UNION ALL
                        SELECT pdf_url FROM pgom.formularios
                        UNION ALL
                        SELECT imagen_url FROM pgom.noticias
                        UNION ALL
                        SELECT imagen_cabecera FROM pgom.municipios
                        UNION ALL
                        SELECT escudo FROM pgom.municipios
                    ) recursos
                    -- Las rutas antiguas pueden empezar por /pgom/ o usar barras inversas.
                    WHERE regexp_replace(ltrim(replace(trim(ruta), chr(92), '/'), '/'),
                                         '^pgom/', '', 'i') = :ruta
                )";
        $stmt = $conn->prepare($sql);
        $stmt->execute([':ruta' => $rutaRelativa]);
        if ($stmt->fetchColumn()) return;
    } catch (Throwable $error) {
        error_log('PGOM: no se pudo comprobar si el archivo sigue enlazado.');
        return;
    }

    $prefijos = ["docs/{$codMun}/", "images/municipios/{$codMun}/"];
    $raiz = dirname(__DIR__, 2);
    foreach ($prefijos as $prefijo) {
        if (strpos($rutaRelativa, $prefijo) !== 0) continue;
        $carpeta = realpath($raiz . '/' . $prefijo);
        $archivo = realpath($raiz . '/' . $rutaRelativa);
        if ($carpeta && $archivo && is_file($archivo)
            && strpos($archivo, $carpeta . DIRECTORY_SEPARATOR) === 0) {
            if (!unlink($archivo)) error_log('PGOM: no se pudo eliminar un archivo municipal.');
        }
        return;
    }
}

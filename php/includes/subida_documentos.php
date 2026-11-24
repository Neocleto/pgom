<?php
// Validación y guardado compartidos por la subida individual y el asistente.
const MAX_UPLOAD_MB = 8;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

function iniBytes(string $value): int
{
    $value = trim($value);
    if ($value === '') return 0;

    $unit = strtolower(substr($value, -1));
    $num = (float) $value;

    switch ($unit) {
        case 'g': $num *= 1024;
        case 'm': $num *= 1024;
        case 'k': $num *= 1024;
    }

    return (int) $num;
}

function mensajeErrorUpload(int $error): string
{
    $uploadMax = ini_get('upload_max_filesize') ?: 'desconocido';
    $postMax = ini_get('post_max_size') ?: 'desconocido';

    switch ($error) {
        case UPLOAD_ERR_INI_SIZE:
            return "El archivo supera el límite configurado en PHP (upload_max_filesize: {$uploadMax}).";
        case UPLOAD_ERR_FORM_SIZE:
            return 'El archivo supera el tamaño máximo permitido por el formulario.';
        case UPLOAD_ERR_PARTIAL:
            return 'El archivo se subió solo parcialmente. Inténtalo de nuevo.';
        case UPLOAD_ERR_NO_FILE:
            return 'No se recibió ningún archivo. Selecciona un documento antes de subirlo.';
        case UPLOAD_ERR_NO_TMP_DIR:
            return 'Falta la carpeta temporal de subida en el servidor.';
        case UPLOAD_ERR_CANT_WRITE:
            return 'El servidor no pudo escribir el archivo en disco. Revisa permisos.';
        case UPLOAD_ERR_EXTENSION:
            return 'Una extensión de PHP bloqueó la subida del archivo.';
        default:
            return "No se recibió el archivo correctamente. Límites actuales: upload_max_filesize={$uploadMax}, post_max_size={$postMax}.";
    }
}

function guardarDocumentoMunicipio(array $archivo, string $codMun, string $tipo): string
{
    if (!preg_match('/^\d{5}$/D', $codMun) || !in_array($tipo, ['documento', 'participacion'], true)) {
        throw new InvalidArgumentException('Faltan datos obligatorios (cod_mun o tipo).');
    }
    $errorSubida = $archivo['error'] ?? UPLOAD_ERR_NO_FILE;
    if ($errorSubida !== UPLOAD_ERR_OK) {
        throw new InvalidArgumentException(mensajeErrorUpload((int)$errorSubida));
    }

    if (($archivo['size'] ?? 0) > MAX_UPLOAD_BYTES) {
        throw new InvalidArgumentException('El archivo pesa ' . round($archivo['size'] / 1024 / 1024, 2) . ' MB y supera el máximo permitido de ' . MAX_UPLOAD_MB . ' MB.');
    }

    // 3. Definir rutas
    $raizProyecto = dirname(__DIR__, 2);
    $base = $raizProyecto . '/docs/';
    $rutaSubcarpeta = $tipo === 'participacion' ? "{$codMun}/participacion/" : "{$codMun}/";
    $directorioDestino = $base . $rutaSubcarpeta;

    // 4. Validar extensión
    $nombreOriginal = basename($archivo['name']);
    $extension = strtolower(pathinfo($nombreOriginal, PATHINFO_EXTENSION));
    $permitidas = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
    if (!in_array($extension, $permitidas, true)) {
        throw new InvalidArgumentException('Tipo de archivo no permitido. Formatos permitidos: PDF, DOC, DOCX, JPG, JPEG y PNG.');
    }

    // El contenido real debe corresponder al tipo de documento anunciado.
    $tiposPermitidos = [
        'pdf' => ['application/pdf'],
        'doc' => ['application/msword', 'application/x-ole-storage', 'application/CDFV2'],
        'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
        'jpg' => ['image/jpeg'], 'jpeg' => ['image/jpeg'], 'png' => ['image/png']
    ];
    $tipoReal = (new finfo(FILEINFO_MIME_TYPE))->file($archivo['tmp_name']);
    if (!in_array($tipoReal, $tiposPermitidos[$extension], true)) {
        throw new InvalidArgumentException('El contenido del archivo no corresponde a su extensión.');
    }

    if (!is_dir($directorioDestino)) {
        if (!@mkdir($directorioDestino, 0775, true) && !is_dir($directorioDestino)) {
            throw new InvalidArgumentException('No se pudo crear la carpeta destino. Revisa permisos de la carpeta docs/.');
        }
    }

    // 5. Generar nombre seguro y mover
    $nombreSeguro = uniqid('archivo_', true) . '.' . $extension;
    $rutaCompleta = $directorioDestino . $nombreSeguro;
    $rutaPublica = "docs/{$rutaSubcarpeta}{$nombreSeguro}";

    if (!move_uploaded_file($archivo['tmp_name'], $rutaCompleta)) {
        throw new InvalidArgumentException('Error al mover el archivo al servidor. Revisa permisos de escritura en docs/.');
    }
    return $rutaPublica;
}

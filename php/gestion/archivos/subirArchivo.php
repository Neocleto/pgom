<?php
// Acceso de gestión: convenio vigente y proyecto correcto.
require_once __DIR__ . '/../../login/permisos_proyecto.php';
exigirAccesoProyecto(true);

// ===============================================
// Script: subirArchivo.php (GENÉRICO)
// Descripción: Gestiona la subida de documentos al servidor (documentos y botones)
// Parámetros requeridos:
// - archivo (file)
// - cod_mun (string)
// - tipo (string): 'documento' o 'participacion'
// ===============================================

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../includes/subida_documentos.php';

function responderSubida(bool $success, string $message = '', array $extra = []): void
{
    echo json_encode(array_merge([
        'success' => $success,
        'message' => $message,
    ], $extra));
    exit;
}

$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
$postMaxBytes = iniBytes(ini_get('post_max_size') ?: '0');

// Cuando se supera post_max_size, PHP vacía $_POST y $_FILES.
if ($contentLength > 0 && $postMaxBytes > 0 && $contentLength > $postMaxBytes && empty($_POST) && empty($_FILES)) {
    responderSubida(false, 'El archivo o la petición completa supera el límite del servidor (post_max_size: ' . ini_get('post_max_size') . '). Tamaño máximo recomendado: ' . MAX_UPLOAD_MB . ' MB.');
}

// La sesión y los permisos se comprueban antes de mover el archivo.
require_once __DIR__ . '/../acciones/permisos_municipio.php';
try {
    if (!isset($_FILES['archivo'])) {
        throw new InvalidArgumentException('Selecciona un documento de hasta 8 MB antes de subirlo.');
    }
    $codMun = (string)($_POST['cod_mun'] ?? '');
    $tipo = (string)($_POST['tipo'] ?? '');
    comprobarPermisoMunicipio(new MunicipioModel($conn), $codMun, $_SESSION['usuario_id'], $_SESSION['usuario_correo'] ?? '');
    $ruta = guardarDocumentoMunicipio($_FILES['archivo'], $codMun, $tipo);
    responderSubida(true, 'Archivo subido correctamente.', ['url' => $ruta]);
} catch (Exception $error) {
    responderSubida(false, $error->getMessage());
}

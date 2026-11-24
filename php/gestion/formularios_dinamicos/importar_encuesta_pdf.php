<?php
// Lee un PDF subido por un gestor y devuelve el borrador sin guardar el archivo.
require_once __DIR__ . '/../../login/permisos_proyecto.php';
exigirAccesoProyecto(true);
require_once __DIR__ . '/../../modelo/MunicipioModel.php';
require_once __DIR__ . '/ImportarEncuestaPdf.php';

header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['ok' => false, 'mensaje' => 'Utiliza la opción Importar desde PDF del configurador.']);
    exit;
}

$codMun = $_POST['cod_mun'] ?? '';
try {
    if (!is_string($codMun) || !preg_match('/^\d{5}$/D', $codMun)) {
        throw new InvalidArgumentException('El código del municipio no es válido.');
    }
    $municipioModel = new MunicipioModel($conn);
    if (!$municipioModel->usuarioPuedeGestionarMunicipio($codMun, $_SESSION['usuario_id'], $_SESSION['usuario_correo'] ?? '')) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'mensaje' => 'No tienes permiso para importar encuestas de este municipio.']);
        exit;
    }

    $archivo = $_FILES['archivo'] ?? null;
    if (!$archivo || $archivo['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($archivo['tmp_name'])
        || $archivo['size'] <= 0 || $archivo['size'] > 8 * 1024 * 1024) {
        throw new InvalidArgumentException('Selecciona un PDF de hasta 8 MB.');
    }
    $tipo = (new finfo(FILEINFO_MIME_TYPE))->file($archivo['tmp_name']);
    if ($tipo !== 'application/pdf') {
        throw new InvalidArgumentException('El archivo seleccionado no es un PDF válido.');
    }

    // Liberamos la sesión durante la lectura para que el panel pueda seguir abierto.
    session_write_close();
    $configuracion = parse_ini_file(dirname(__DIR__, 3) . '/config.ini', true, INI_SCANNER_RAW);
    $lectura = leerEncuestaPdf($archivo['tmp_name'], $configuracion['importacion_pdf'] ?? []);
    $borrador = interpretarEncuestaPdf($lectura['texto'], $archivo['name']);
    echo json_encode(['ok' => true, 'borrador' => $borrador, 'ocr' => $lectura['ocr']], JSON_UNESCAPED_UNICODE);
} catch (InvalidArgumentException $error) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'mensaje' => $error->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    error_log('Importación de encuesta: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'mensaje' => 'No se ha podido importar la encuesta.']);
}

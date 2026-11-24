<?php
// Vista privada y descarga de adjuntos del buzón desde Gestión de municipios.
require_once __DIR__ . '/../login/permisos_proyecto.php';
exigirAccesoProyecto(false, false);
require_once __DIR__ . '/../modelo/MunicipioModel.php';
require_once __DIR__ . '/../modelo/BuzonParticipacionModel.php';

$codMun = $_GET['cod_mun'] ?? '';
if (!is_string($codMun) || !preg_match('/^\d{5}$/D', $codMun)) {
    http_response_code(400);
    exit('El código del municipio no es válido.');
}

$municipioModel = new MunicipioModel($conn);
if (!$municipioModel->usuarioPuedeGestionarMunicipio($codMun, $_SESSION['usuario_id'], $_SESSION['usuario_correo'] ?? '')) {
    http_response_code(403);
    exit('No tienes permiso para consultar este buzón.');
}
$municipio = $municipioModel->obtenerMunicipioPorCodigo($codMun);
$buzonModel = new BuzonParticipacionModel($conn);
$urlBuzon = 'php/gestion/buzon_participacion.php?cod_mun=' . rawurlencode($codMun);
$pagina = filter_input(INPUT_GET, 'pagina', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 80000000]]) ?: 1;
$envios = [];
$errorCarga = '';

try {
    if (isset($_GET['adjunto'])) {
        $id = filter_input(INPUT_GET, 'adjunto', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $adjunto = $id ? $buzonModel->obtenerAdjunto($codMun, $id) : false;
        if (!$adjunto) {
            http_response_code(404);
            exit('No se ha encontrado el archivo adjunto.');
        }

        $tipos = ['application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png'];
        $extension = $tipos[$adjunto['tipo_adjunto']] ?? 'bin';
        $contenido = base64_decode($adjunto['archivo'], true);
        header('Content-Type: application/octet-stream');
        header('X-Content-Type-Options: nosniff');
        header('Content-Disposition: attachment; filename="adjunto.' . $extension . '"; filename*=UTF-8\'\'' . rawurlencode($adjunto['nombre_adjunto']));
        header('Content-Length: ' . strlen($contenido));
        echo $contenido;
        exit;
    }

    $envios = $buzonModel->listarEnvios($codMun, ($pagina - 1) * 25);
} catch (Throwable $error) {
    error_log('Buzón de participación: ' . $error->getMessage());
    http_response_code(500);
    $errorCarga = 'No se ha podido consultar el buzón de participación.';
    if (isset($_GET['adjunto'])) {
        exit($errorCarga);
    }
}

$haySiguiente = count($envios) > 25;
if ($haySiguiente) {
    array_pop($envios);
}

$zonaHoraria = new DateTimeZone('Europe/Madrid');
include __DIR__ . '/buzon_participacion_template.php';

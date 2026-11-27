<?php
require_once __DIR__ . '/permisos_proyecto.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
// Conservar la renovación existente, comprobando antes el permiso actual del convenio.
$resultado = validarSesionProyecto(false);
if (!$resultado['success']) {
    http_response_code($resultado['http']);
    echo json_encode($resultado, JSON_UNESCAPED_UNICODE);
    exit;
}
// PHP rechaza también los clics que llegaron después del último segundo.
if (segundosParaRenovarSesion() === 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'status' => 'expired', 'message' => 'La sesión ha caducado.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Renovar conserva la duración de tres horas que se asigna al iniciar sesión.
$_SESSION['expira_en'] = time() + 3 * 60 * 60;
echo json_encode(['status' => 'renewed']);

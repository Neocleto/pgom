<?php
require_once __DIR__ . '/permisos_proyecto.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$resultado = validarSesionProyecto(false);
if ($resultado['success'] && time() >= (int)($_SESSION['expira_en'] ?? 0)) {
    // Al reabrir la pantalla se conserva el plazo de la sesión, incluso si ya pasó.
    $resultado = [
        'success' => false,
        'status' => 'expired',
        'message' => 'La sesión ha caducado.',
        'segundos_para_renovar' => segundosParaRenovarSesion()
    ];
}
echo json_encode($resultado, JSON_UNESCAPED_UNICODE);

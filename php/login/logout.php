<?php
// Cierre manual desde el menú y cierre automático desde el aviso de caducidad.
session_start();
header('Cache-Control: no-store');

$responderJson = ($_POST['motivo'] ?? '') === 'caducidad';
$cierreAutomatico = $responderJson || ($_GET['motivo'] ?? '') === 'caducidad';
$estado = 'active';

// Si otra pestaña renovó a tiempo, el contador de esta pestaña está obsoleto.
if (!$cierreAutomatico || (int)($_SESSION['expira_en'] ?? 0) <= time()) {
    // Vaciar la sesión en PHP y retirar su cookie del navegador.
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $cookie = session_get_cookie_params();
        setcookie(session_name(), '', time() - 3600, $cookie['path'], $cookie['domain'], $cookie['secure'], $cookie['httponly']);
    }
    session_destroy();
    $estado = 'closed';
}

if ($responderJson) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['status' => $estado]);
    exit;
}

// La salida manual y la navegación de respaldo vuelven a la portada del portal.
header('Location: ../../index.php');
exit;

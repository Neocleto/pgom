<?php
// Envío público: comprueba en el servidor que el municipio esté publicado y su buzón abierto.
header('Content-Type: application/json; charset=utf-8');

function responderBuzon(int $codigo, string $mensaje, ?array $envio = null): void
{
    http_response_code($codigo);
    $respuesta = [
        'status' => $codigo === 200 ? 'ok' : 'error',
        'message' => $mensaje,
        'advertencia' => $envio['advertencia'] ?? ''
    ];
    if ($envio !== null) {
        $respuesta['correo_enviado'] = $envio['gestor'];
        $respuesta['copia_arquitecto_enviada'] = $envio['arquitecto'];
    }
    echo json_encode($respuesta, JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    responderBuzon(405, 'Envía el mensaje desde el formulario del buzón.');
}

$codigo = $_POST['cod_mun'] ?? '';
$asunto = $_POST['asunto'] ?? '';
$mensaje = $_POST['mensaje'] ?? '';

if (!is_string($codigo) || !preg_match('/^\d{5}$/D', $codigo) || !is_string($asunto) || !is_string($mensaje)) {
    responderBuzon(400, 'Los datos del mensaje no son válidos.');
}
$asunto = trim($asunto);
$mensaje = trim($mensaje);
if ($asunto === '' || $mensaje === '' || mb_strlen($asunto) > 150 || mb_strlen($mensaje) > 6000) {
    responderBuzon(422, 'Completa el asunto y el mensaje. El asunto admite 150 caracteres y el mensaje 6000.');
}
if (($_POST['acepto'] ?? '') !== '1') {
    responderBuzon(422, 'Marca la casilla de aceptación antes de continuar.');
}

require_once __DIR__ . '/../modelo/MunicipioModel.php';
require_once __DIR__ . '/CorreoParticipacion.php';

try {
    $municipio = (new MunicipioModel($conn))->obtenerMunicipioActivosPorCodigo($codigo);
    if (!$municipio || !booleanoCorreoParticipacion($municipio['buzon_participacion_activo'] ?? false)) {
        responderBuzon(404, 'El buzón de participación no está disponible.');
    }

    // El adjunto temporal se usa solo para preparar el correo.
    $archivo = $_FILES['archivo'] ?? [];
    $error = $archivo['error'] ?? UPLOAD_ERR_NO_FILE;
    $nombreAdjunto = '';
    $rutaTemporal = '';
    if ($error !== UPLOAD_ERR_NO_FILE) {
        if ($error !== UPLOAD_ERR_OK || empty($archivo['size']) || $archivo['size'] > 5 * 1024 * 1024
            || !is_uploaded_file($archivo['tmp_name'] ?? '')) {
            responderBuzon(422, 'Adjunta un archivo válido de hasta 5 MB.');
        }
        $rutaTemporal = $archivo['tmp_name'];
        $nombreAdjunto = basename($archivo['name']);
        $extension = strtolower(pathinfo($nombreAdjunto, PATHINFO_EXTENSION));
        $tiposPermitidos = [
            'pdf' => 'application/pdf', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png'
        ];
        $tipoReal = (new finfo(FILEINFO_MIME_TYPE))->file($rutaTemporal);
        if (!isset($tiposPermitidos[$extension]) || $tiposPermitidos[$extension] !== $tipoReal) {
            responderBuzon(422, 'Solo se permiten archivos PDF, JPG o PNG válidos.');
        }
    }

    // La cabecera identifica el portal y el municipio en la bandeja del gestor.
    $portal = 'PGOM';
    $colorPortal = '#003b17';
    $nombreMunicipio = trim((string)($municipio['nombre'] ?? ''));
    if ($nombreMunicipio === '') {
        $nombreMunicipio = 'Municipio ' . $codigo;
    }

    $municipioSeguro = htmlspecialchars($nombreMunicipio, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $asuntoSeguro = htmlspecialchars($asunto, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $mensajeSeguro = nl2br(htmlspecialchars($mensaje, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));

    $correo = crearCorreoParticipacionPGOM();
    $correo->Timeout = 10;
    $correo->isHTML(true);
    // Las cabeceras de correo deben quedar en una sola línea.
    $asuntoCorreo = "[$portal · $nombreMunicipio] Buzón de participación: $asunto";
    $correo->Subject = preg_replace('/[\r\n]+/', ' ', $asuntoCorreo);

    // Si hay un adjunto, mostramos su nombre en las dos versiones del correo.
    $adjuntoHtml = '';
    $adjuntoTexto = '';
    if ($rutaTemporal !== '') {
        $correo->addAttachment($rutaTemporal, $nombreAdjunto);
        $nombreAdjuntoSeguro = htmlspecialchars($nombreAdjunto, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $adjuntoHtml = '<p style="margin:20px 0 0;"><strong>Archivo adjunto:</strong> ' . $nombreAdjuntoSeguro . '</p>';
        $adjuntoTexto = "\n\nArchivo adjunto: $nombreAdjunto";
    }

    $correo->Body = <<<HTML
    <!doctype html>
    <html lang="es">
    <body style="margin:0;padding:16px;background-color:#f3f5f8;font-family:Arial,sans-serif;color:#26364a;">
        <table role="presentation" align="center" width="100%" cellspacing="0" cellpadding="0"
               style="max-width:620px;background-color:#ffffff;border:1px solid #dce2ea;">
            <tr>
                <td style="padding:24px;background-color:{$colorPortal};color:#ffffff;">
                    <p style="margin:0 0 6px;font-size:14px;">Buzón de participación</p>
                    <h1 style="margin:0;font-size:24px;line-height:1.3;">Nueva aportación ciudadana</h1>
                </td>
            </tr>
            <tr>
                <td style="padding:24px;font-size:16px;line-height:1.5;word-wrap:break-word;overflow-wrap:anywhere;">
                    <p style="margin:0 0 18px;padding:12px;background-color:#f3f5f8;">
                        <strong>Municipio:</strong> {$municipioSeguro}<br>
                        <strong>Portal:</strong> {$portal}
                    </p>
                    <p style="margin:0 0 18px;"><strong>Asunto:</strong> {$asuntoSeguro}</p>
                    <h2 style="margin:0 0 6px;font-size:16px;color:{$colorPortal};">Mensaje</h2>
                    <div>{$mensajeSeguro}</div>
                    {$adjuntoHtml}
                </td>
            </tr>
        </table>
    </body>
    </html>
    HTML;
    $correo->AltBody = "Nueva aportación ciudadana\nBuzón de participación\n\n"
        . "Municipio: $nombreMunicipio\nPortal: $portal\n\n"
        . "Asunto: $asunto\n\nMensaje:\n$mensaje"
        . $adjuntoTexto;
    $resultado = enviarCorreoParticipacion($correo, $municipio);
    responderBuzon(200, 'El mensaje se ha enviado correctamente al gestor.', $resultado);
} catch (Throwable $error) {
    error_log('Buzón de participación del municipio ' . $codigo . ': ' . $error->getMessage());
    responderBuzon(503, 'No se ha podido enviar el mensaje al gestor. Inténtalo de nuevo más tarde.');
}

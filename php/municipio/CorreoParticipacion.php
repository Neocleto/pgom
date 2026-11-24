<?php
// ============================================================================
// CORREO DE PARTICIPACION PGOM
//
// Envía las respuestas de las encuestas al gestor y, si procede, al arquitecto.
// ============================================================================

use PHPMailer\PHPMailer\PHPMailer;

require_once(__DIR__ . '/../../lib/PHPMailer/src/Exception.php');
require_once(__DIR__ . '/../../lib/PHPMailer/src/PHPMailer.php');
require_once(__DIR__ . '/../../lib/PHPMailer/src/SMTP.php');

/**
 * Convierte los booleanos devueltos por PostgreSQL.
 */
function booleanoCorreoParticipacion($valor)
{
    if (is_bool($valor)) {
        return $valor;
    }

    return in_array(
        strtolower(trim((string)$valor)),
        ['1', 't', 'true', 'yes', 'si', 'sí'],
        true
    );
}

/**
 * Prepara PHPMailer para los correos de participación.
 *
 * Conserva el servidor SMTP de la instalación.
 */
function crearCorreoParticipacionPGOM()
{
    $mail = new PHPMailer(true);
    $mail->CharSet = 'UTF-8';
    $mail->ContentType = 'text/html; charset=UTF-8';

    // Server settings
    $mail->SMTPDebug = 0;
    $mail->isSMTP();

    $mail->Host       = 'goterayotilio.malaga.es';
    $mail->SMTPAuth = false;
    $mail->SMTPSecure = '';
    $mail->SMTPAutoTLS = false;
    $mail->Port = 25;
    $mail->setFrom('idemap@malaga.es', 'PGOM');

    return $mail;
}

/**
 * Envía primero al gestor y después una copia independiente al arquitecto.
 * Si el gestor falla no se envía la copia. Una copia fallida no invalida el
 * envío ya aceptado del gestor ni obliga a repetir el mensaje completo.
 */
function enviarCorreoParticipacion($mail, array $municipio)
{
    $correoGestor = trim((string)($municipio['correo_contacto_gestor'] ?? ''));
    $correoArquitecto = trim((string)($municipio['correo_contacto'] ?? ''));
    $contexto = $mail->FromName . ' - Correo de participación ' . ($municipio['cod_mun'] ?? '');

    // 1. El gestor es obligatorio y se comprueba en su propio envío SMTP.
    if (!filter_var($correoGestor, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('El municipio no tiene un correo de gestor válido.');
    }
    try {
        $mail->clearAllRecipients();
        $mail->addAddress($correoGestor);
        if (!$mail->send()) {
            throw new Exception($mail->ErrorInfo);
        }
        error_log($contexto . ' - SMTP aceptó gestor ' . $correoGestor . ' - ' . $mail->getLastMessageID());
    } catch (Throwable $error) {
        error_log($contexto . ' - Falló gestor ' . $correoGestor . ': ' . $error->getMessage());
        throw new Exception('No se ha podido enviar el mensaje al gestor. Inténtalo de nuevo más tarde.');
    }

    $resultado = ['gestor' => true, 'arquitecto' => null, 'advertencia' => ''];
    if (!booleanoCorreoParticipacion($municipio['enviar_docs_a_arquitecto'] ?? false)) {
        return $resultado;
    }
    if (strcasecmp($correoArquitecto, $correoGestor) === 0) {
        // Una misma dirección cumple ambos papeles sin recibir dos mensajes.
        $resultado['arquitecto'] = true;
        return $resultado;
    }

    // 2. Conservamos el contenido y los adjuntos; cambiamos solo el destinatario.
    try {
        if (!filter_var($correoArquitecto, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Correo de arquitecto no válido.');
        }
        $mail->clearAllRecipients();
        $mail->addAddress($correoArquitecto);
        if (!$mail->send()) {
            throw new Exception($mail->ErrorInfo);
        }
        $resultado['arquitecto'] = true;
        error_log($contexto . ' - SMTP aceptó arquitecto ' . $correoArquitecto . ' - ' . $mail->getLastMessageID());
    } catch (Throwable $error) {
        $resultado['arquitecto'] = false;
        $resultado['advertencia'] = 'El mensaje se ha enviado al gestor, pero no se ha podido enviar la copia al arquitecto.';
        error_log($contexto . ' - Falló copia al arquitecto ' . $correoArquitecto . ': ' . $error->getMessage());
    }
    return $resultado;
}

// El gestor recibe siempre el PDF. CorreoParticipacion usa la casilla del
// paso Datos generales para decidir si envía también una copia al arquitecto.
function enviarCorreoRespuestaFormulario(array $municipio, array $formulario, $referencia, $pdf)
{
    $mail = crearCorreoParticipacionPGOM();
    $mail->Timeout = 10;
    $mail->Subject = 'Nueva respuesta de participación: ' . $formulario['titulo'];
    $mail->Body = "Municipio: {$municipio['nombre']}\n"
        . "Encuesta: {$formulario['titulo']}\n"
        . "Referencia: {$referencia}\n\n"
        . 'La respuesta completa se incluye en el PDF adjunto.';
    $mail->addStringAttachment($pdf, 'participacion-' . $referencia . '.pdf', 'base64', 'application/pdf');

    return enviarCorreoParticipacion($mail, $municipio);
}

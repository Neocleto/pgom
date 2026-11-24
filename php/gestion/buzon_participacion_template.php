<?php
// Solo se muestra al entrar por la acción que comprueba el municipio.
if (!isset($buzonModel)) {
    http_response_code(404);
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Buzón de participación</title>
    <base href="/pgom/">
    <link rel="stylesheet" href="lib/bootstrap/css/bootstrap@5.3.0.min.css">
    <link rel="stylesheet" href="lib/bootstrap/css/bootstrap-icons.css">
    <link rel="stylesheet" href="css/acceso-moderno.css">
    <link rel="stylesheet" href="css/panel.css">
</head>
<body class="pgom-panel-page">
    <?php include __DIR__ . '/../includes/access_header.php'; ?>

    <main class="container py-4">
        <a class="btn btn-outline-primary mb-3" href="php/gestion/panel_gestion.php">
            <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>Volver a Gestión de municipios
        </a>

        <section class="card shadow-sm border-0">
            <div class="card-body p-3 p-md-4">
                <h1 class="h3 mb-1">Buzón de participación</h1>
                <p class="text-muted"><?= htmlspecialchars($municipio['nombre']) ?> · Mensajes y encuestas recibidas</p>

                <?php if ($errorCarga !== ''): ?>
                    <p class="alert alert-danger mb-0"><?= htmlspecialchars($errorCarga) ?></p>
                <?php elseif (!$envios): ?>
                    <div class="alert alert-light border mb-0">
                        <?= $pagina === 1 ? 'Todavía no hay envíos registrados.' : 'No hay envíos en esta página.' ?>
                        <p class="small mb-0 mt-1">Aquí se registran los envíos recibidos desde la activación del historial.</p>
                    </div>
                <?php else: ?>
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead>
                                <tr>
                                    <th scope="col">Fecha de envío</th>
                                    <th scope="col">Asunto y mensaje</th>
                                    <th scope="col">Adjunto</th>
                                    <th scope="col">Aviso al gestor</th>
                                </tr>
                            </thead>
                            <tbody>
                            <?php foreach ($envios as $envio): ?>
                                <tr>
                                    <td class="text-nowrap"><?= (new DateTimeImmutable($envio['fecha_envio']))->setTimezone($zonaHoraria)->format('d/m/Y H:i') ?></td>
                                    <td class="text-break">
                                        <details>
                                            <summary class="fw-semibold"><?= htmlspecialchars($envio['asunto']) ?></summary>
                                            <p class="mb-0 mt-2"><?= nl2br(htmlspecialchars($envio['mensaje'])) ?></p>
                                        </details>
                                    </td>
                                    <td class="text-break">
                                        <?php if ($envio['nombre_adjunto']): ?>
                                            <a href="<?= htmlspecialchars($urlBuzon . '&adjunto=' . $envio['id']) ?>">
                                                <i class="bi bi-download me-1" aria-hidden="true"></i><?= htmlspecialchars($envio['nombre_adjunto']) ?>
                                            </a>
                                        <?php else: ?>
                                            <span class="text-muted">Sin adjunto</span>
                                        <?php endif; ?>
                                    </td>
                                    <td class="text-nowrap">
                                        <?php if ($envio['correo_enviado'] === true): ?>
                                            <span class="text-success">Enviado</span>
                                        <?php elseif ($envio['correo_enviado'] === false): ?>
                                            <span class="text-muted">Sin enviar</span>
                                        <?php else: ?>
                                            <span class="text-muted">Sin confirmar</span>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                <?php endif; ?>

                <?php if ($errorCarga === '' && ($pagina > 1 || $haySiguiente)): ?>
                    <nav class="d-flex align-items-center gap-3 mt-3" aria-label="Páginas de envíos">
                        <?php if ($pagina > 1): ?>
                            <a class="btn btn-outline-primary btn-sm" href="<?= htmlspecialchars($urlBuzon . '&pagina=' . ($pagina - 1)) ?>">Anterior</a>
                        <?php endif; ?>
                        <span>Página <?= $pagina ?></span>
                        <?php if ($haySiguiente): ?>
                            <a class="btn btn-outline-primary btn-sm" href="<?= htmlspecialchars($urlBuzon . '&pagina=' . ($pagina + 1)) ?>">Siguiente</a>
                        <?php endif; ?>
                    </nav>
                <?php endif; ?>
            </div>
        </section>
    </main>

    <script src="lib/bootstrap.bundle.min.js"></script>
</body>
</html>

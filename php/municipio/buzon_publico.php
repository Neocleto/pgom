<?php
// Vista del buzón. Solo se usa desde la plantilla del portal municipal.
if (!isset($buzonActivo)) {
    return;
}
?>
<!-- Buzon ciudadano. -->
<?php if (($buzonActivo && $visibilidadSecciones['buzon']) || $modoEditorPortal): ?>
    <section id="buzon" data-portal-section="buzon" class="portal-section portal-mailbox" style="--section-color:<?= htmlspecialchars($coloresSecciones['buzon']) ?>;order:<?= (int)$ordenSecciones['buzon'] ?>;<?= (!$buzonActivo || !$visibilidadSecciones['buzon']) ? 'display:none;' : '' ?>">
        <div class="portal-mailbox__intro">
            <div class="portal-section__heading">
                <span class="section-icon" data-section-icon <?= $iconosSecciones['buzon'] === '' ? 'hidden' : '' ?>>
                    <?php if ($iconosSecciones['buzon'] !== ''): ?><i class="bi bi-<?= htmlspecialchars($iconosSecciones['buzon']) ?>"></i><?php endif; ?>
                </span>
                <div>
                    <p class="section-kicker" data-content="buzon.kicker"><?= htmlspecialchars($contenido['buzon']['kicker']) ?></p>
                    <h2 data-section-title><?= htmlspecialchars($titulosSecciones['buzon']) ?></h2>
                </div>
            </div>
            <div class="portal-rich-text" data-content="buzon.introduccion"><?= htmlEnriquecidoPortal($contenido['buzon']['introduccion']) ?></div>
            <div class="portal-privacy-note">
                <i class="bi bi-shield-check"></i>
                <div>
                    <strong data-content="buzon.privacidad_titulo"><?= htmlspecialchars($contenido['buzon']['privacidad_titulo']) ?></strong>
                    <div class="portal-rich-text" data-content="buzon.privacidad_texto"><?= htmlEnriquecidoPortal($contenido['buzon']['privacidad_texto']) ?></div>
                    <?php if (filter_var($municipio['politica_privacidad_url'] ?? '', FILTER_VALIDATE_URL)
                    && preg_match('~^https?://~i', $municipio['politica_privacidad_url'])): ?>
                        <a href="<?= htmlspecialchars($municipio['politica_privacidad_url']) ?>" target="_blank" rel="noopener noreferrer" data-content="buzon.privacidad_enlace"><?= htmlspecialchars($contenido['buzon']['privacidad_enlace']) ?></a>
                    <?php endif; ?>
                </div>
            </div>
            <?php if (booleanoPortal($contenido['buzon']['mostrar_ilustracion'] ?? false) || $modoEditorPortal): ?>
                <span class="portal-mailbox__illustration" data-mailbox-illustration aria-hidden="true"
                      <?= !booleanoPortal($contenido['buzon']['mostrar_ilustracion'] ?? false) ? 'hidden' : '' ?>></span>
            <?php endif; ?>
        </div>

        <form id="formBuzon" class="portal-mailbox__form" action="<?= $modoPreview ? 'php/municipio/municipio.php?cod_mun=' . urlencode($codMun) . '&amp;preview=1#buzon' : 'php/municipio/enviar_buzon.php' ?>"
          data-modo-preview="<?= $modoPreview ? '1' : '0' ?>" method="POST" enctype="multipart/form-data">
            <input type="hidden" name="cod_mun" value="<?= htmlspecialchars($codMun) ?>">

            <div class="portal-mailbox__fields">
                <label>
                    <span><span data-content="buzon.asunto_etiqueta"><?= htmlspecialchars($contenido['buzon']['asunto_etiqueta']) ?></span> (*)</span>
                    <input type="text" name="asunto" maxlength="150" required>
                </label>
                <label>
                    <span><span data-content="buzon.mensaje_etiqueta"><?= htmlspecialchars($contenido['buzon']['mensaje_etiqueta']) ?></span> (*)</span>
                    <textarea name="mensaje" rows="5" maxlength="6000" required></textarea>
                </label>
            </div>
            <div class="portal-attachment-field">
                <span id="etiquetaArchivoBuzon" data-content="buzon.archivo_etiqueta"><?= htmlspecialchars($contenido['buzon']['archivo_etiqueta']) ?></span>
                <div class="portal-attachment" id="zonaArchivoBuzon" aria-labelledby="etiquetaArchivoBuzon" aria-describedby="ayudaArchivoBuzon errorArchivoBuzon">
                    <i class="bi bi-cloud-arrow-up" aria-hidden="true"></i>
                    <div class="portal-attachment__copy">
                        <strong>Arrastra aquí tu documento</strong>
                        <small id="ayudaArchivoBuzon">PDF, JPG o PNG · Un archivo de hasta 5 MB</small>
                        <span id="estadoArchivoBuzon" role="status" aria-live="polite">Ningún archivo adjunto</span>
                    </div>
                    <button type="button" class="portal-attachment__select" id="btnSeleccionarArchivoBuzon">Seleccionar archivo</button>
                    <button type="button" class="portal-attachment__remove" id="btnQuitarArchivoBuzon" hidden>Quitar <i class="bi bi-x-lg" aria-hidden="true"></i></button>
                    <input class="visually-hidden" id="archivoBuzon" type="file" name="archivo" accept=".jpg,.jpeg,.png,.pdf" aria-labelledby="etiquetaArchivoBuzon" tabindex="-1">
                </div>
                <p class="portal-attachment-error" id="errorArchivoBuzon" role="alert" hidden></p>
            </div>
            <div class="portal-mailbox__footer">
                <label class="portal-consent">
                    <input type="checkbox" name="acepto" value="1" required>
                    <span data-content="buzon.consentimiento"><?= htmlspecialchars($contenido['buzon']['consentimiento']) ?></span>
                </label>
                <div class="portal-form-actions">
                    <button class="portal-button" style="--button-color:var(--section-color)" type="submit">
                        <span data-content="buzon.boton_texto"><?= htmlspecialchars($contenido['buzon']['boton_texto']) ?></span>
                        <i class="bi bi-send"></i>
                    </button>
                    <div id="spinnerEnvio" class="spinner-border spinner-border-sm d-none" role="status"></div>
                </div>
            </div>
            <div id="resultadoEnvio"></div>
        </form>

    </section>
<?php endif; ?>

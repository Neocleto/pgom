/**
 * Gestión de encuestas: listado, importación, ajustes y guardado.
 * configuradorPortal.js envía a este archivo los clics y cambios del panel.
 * El papel se dibuja en configuradorVistaFormulario.js. El orden y la
 * jerarquía de bloques se modifican en configuradorOrdenFormulario.js.
 */

let botonFormularioEnApertura = null;
let posicionEdicionFormulario = null;
let posicionSaltoVistaFormulario = null;

/**
 * Dibuja el listado o el editor de formularios dinámicos.
 */
function renderPanelFormularios() {
    establecerCabeceraPanel('Formularios y encuestas', 'Crea encuestas online, ofrece un PDF o combina las dos opciones.');

    if (estadoPortal.formularioActual) {
        renderEditorFormulario();
        return;
    }

    const filas = estadoPortal.formularios.map(function (formulario) {
        const modalidad = obtenerTextoModalidad(formulario.modalidad);
        const respuestas = Number(formulario.total_respuestas || 0);

        return `
            <article class="portal-form-list__item" data-form-id="${Number(formulario.id)}">
                ${formulario.icono ? `
                    <span class="portal-form-list__icon" style="--form-color:${escaparHtml(formulario.color || estadoPortal.configuracion.color_primario || '#003b17')}">
                        <i class="bi bi-${escaparHtml(formulario.icono)}"></i>
                    </span>` : ''}
                <span class="portal-form-list__copy">
                    <strong>${escaparHtml(formulario.titulo)}</strong>
                    <small>${modalidad} · ${respuestas} respuestas · ${convertirBooleano(formulario.activo, false) ? 'Publicado' : 'Borrador'}</small>
                </span>
                <span class="portal-form-list__actions">
                    ${esEncuestaOnline(formulario) && formulario.slug ? `
                        <a class="portal-small-button" href="${escaparHtml(obtenerUrlPruebaEncuesta(formulario.slug))}"
                           target="_blank" rel="noopener" title="Probar encuesta" aria-label="Probar ${escaparHtml(formulario.titulo)}">
                            <i class="bi bi-eye" aria-hidden="true"></i>
                        </a>` : ''}
                    <button type="button" class="portal-small-button" data-action="edit-form" data-id="${Number(formulario.id)}" title="Editar formulario" aria-label="Editar ${escaparHtml(formulario.titulo)}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="portal-small-button is-danger" data-action="delete-form" data-id="${Number(formulario.id)}" data-responses="${respuestas}" title="Eliminar o archivar" aria-label="Eliminar o archivar ${escaparHtml(formulario.titulo)}">
                        <i class="bi bi-trash"></i>
                    </button>
                </span>
            </article>
        `;
    }).join('');

    document.getElementById('contenidoPanelConfigurador').innerHTML = `
        ${crearTarjetaConfiguracion(
            'Formularios del municipio',
            'Después de guardar una encuesta, vincúlala al botón de participación que quieras usar.',
            `<div class="portal-form-builder-toolbar">
                <div class="d-flex flex-wrap gap-2">
                    <button type="button" class="btn btn-primary btn-sm" data-action="new-form">
                        <i class="bi bi-plus-circle me-1"></i>Nuevo formulario
                    </button>
                    <button type="button" class="btn btn-outline-primary btn-sm" data-action="import-form-pdf">
                        <i class="bi bi-file-earmark-arrow-up me-1" aria-hidden="true"></i>Importar desde PDF
                    </button>
                    <input type="file" data-import-form-pdf hidden accept="application/pdf,.pdf">
                </div>
            </div>
            <div class="portal-form-list">${filas || crearVacio('Aún no hay formularios.')}</div>`
        )}
    `;
    requestAnimationFrame(ajustarLienzoVistaPrevia);
}

/**
 * Genera un borrador editable a partir del PDF en el servidor.
 */
async function importarEncuestaDesdePdf(selector) {
    const archivo = selector.files[0];
    selector.value = '';
    if (!archivo) {
        return;
    }

    const boton = selector.previousElementSibling;
    if (!boton || boton.disabled) {
        return;
    }
    if (!archivo.size || archivo.size > 8 * 1024 * 1024) {
        Swal.fire('Revisa el archivo', 'Selecciona un PDF de hasta 8 MB.', 'warning');
        return;
    }

    const textoBoton = boton.innerHTML;
    boton.disabled = true;
    boton.textContent = 'Leyendo PDF…';

    const datos = new FormData();
    datos.append('cod_mun', estadoPortal.codMun);
    datos.append('archivo', archivo);

    try {
        const resultado = await solicitarJson('php/gestion/formularios_dinamicos/importar_encuesta_pdf.php', {
            method: 'POST',
            body: datos
        });

        // Si el gestor cambió de pantalla, la respuesta no sustituye lo que está editando.
        if (!boton.isConnected) {
            return;
        }
        const formulario = crearFormularioVacioPortal();
        formulario.titulo = resultado.borrador.titulo;
        formulario.descripcion = resultado.borrador.descripcion || '';
        formulario.secciones = resultado.borrador.secciones;
        formulario.activo = false;
        iniciarEditorFormulario(normalizarFormularioPortal(formulario), true);

        const aviso = resultado.ocr ? ' Se ha usado reconocimiento de texto en las páginas escaneadas.' : '';
        Swal.fire('Borrador de encuesta preparado',
            'Se han detectado ' + resultado.borrador.total_preguntas + ' preguntas.' + aviso
            + ' Revisa los enunciados, las opciones y los tipos de respuesta antes de guardarlo.', 'info');
    } catch (error) {
        if (boton.isConnected) {
            Swal.fire('No se pudo importar el PDF', error.message, 'error');
        }
    } finally {
        boton.disabled = false;
        boton.innerHTML = textoBoton;
    }
}

/**
 * Crea la estructura mínima de un formulario nuevo.
 */
function crearFormularioVacioPortal() {
    return {
        id: null,
        titulo: '',
        descripcion: '',
        slug: '',
        icono: 'clipboard-check',
        color: estadoPortal.configuracion.color_primario || '#003b17',
        modalidad: 'online',
        pdf_url: '',
        texto_boton_online: 'Realizar encuesta online',
        texto_boton_pdf: 'Descargar encuesta en PDF',
        mensaje_confirmacion: 'Tu respuesta se ha registrado correctamente.',
        activo: true,
        secciones: []
    };
}

/**
 * Crea una pregunta nueva con valores fáciles de modificar.
 */
function crearPreguntaVaciaPortal(tipo = 'texto') {
    return {
        enunciado: '',
        ayuda: '',
        tipo,
        obligatorio: false,
        ancho: 'completo',
        opciones: []
    };
}

/**
 * Lee el formulario existente antes de mostrarlo. Se comprueba que el botón
 * siga en pantalla y sea el último pulsado, por si el gestor navega mientras
 * llega la respuesta o abre otro formulario.
 */
async function abrirFormularioParaEditar(boton) {
    const idFormulario = Number(boton.dataset.id);
    botonFormularioEnApertura = boton;
    boton.disabled = true;

    try {
        const datos = await solicitarJson(
            `php/gestion/formularios_dinamicos/acciones_formularios.php?accion=obtener&cod_mun=${encodeURIComponent(estadoPortal.codMun)}&id=${encodeURIComponent(idFormulario)}`
        );

        if (botonFormularioEnApertura !== boton || !boton.isConnected) return;
        const formulario = normalizarFormularioPortal(datos.formulario);
        iniciarEditorFormulario(formulario, false);
        document.querySelector('[data-action="cancel-form"]').focus({ preventScroll: true });
    } catch (error) {
        if (botonFormularioEnApertura === boton && boton.isConnected) {
            Swal.fire('No se pudo abrir el formulario', error.message, 'error');
        }
    } finally {
        boton.disabled = false;
        if (botonFormularioEnApertura === boton) botonFormularioEnApertura = null;
    }
}

/** Un borrador creado desde cero muestra la cabecera editable de la encuesta. */
function iniciarEditorFormulario(formulario, hayCambios, desdeCero = false) {
    estadoPortal.formularioActual = formulario;
    formularioDesdeCero = desdeCero;
    probandoFormulario = false;
    posicionEdicionFormulario = null;
    posicionSaltoVistaFormulario = null;
    reiniciarOrdenFormulario();
    marcarCambios(hayCambios, 'formulario');
    renderEditorFormulario(formulario.modalidad === 'pdf');
    document.getElementById('contenidoPanelConfigurador').scrollTop = 0;
}

/** Pide confirmación antes de descartar los cambios pendientes del borrador. */
async function volverListadoFormularios() {
    const formulario = estadoPortal.formularioActual;
    if (formulario.guardando || formulario.subiendoPdf) return;

    if (estadoPortal.cambiosFormulario) {
        const decision = await Swal.fire({
            title: '¿Volver al listado?',
            text: 'Se perderán los cambios que todavía no hayas guardado.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Descartar cambios',
            cancelButtonText: 'Seguir editando',
            focusCancel: true,
            heightAuto: false
        });
        if (!decision.isConfirmed || estadoPortal.formularioActual !== formulario) return;
    }

    estadoPortal.formularioActual = null;
    marcarCambios(false, 'formulario');
    renderPanelFormularios();
    document.querySelector('[data-action="new-form"]')?.focus();
}

/** Datos generales. Cambiar aquí los textos, campos y opciones de publicación. */
function crearDatosFormulario(formulario) {
    const online = formulario.modalidad !== 'pdf';
    const pdf = formulario.modalidad === 'pdf' || formulario.modalidad === 'ambos';

    return `
        <section class="portal-config-card">
            <div class="portal-config-grid">
                ${crearCampoSeleccionFormulario('Formato', 'modalidad', formulario.modalidad, [
                    ['online', 'Solo formulario online'],
                    ['pdf', 'Solo documento PDF'],
                    ['ambos', 'Formulario online y PDF']
                ])}
                <div class="form-check form-switch portal-diseno-encuesta__publicacion">
                    <input class="form-check-input" type="checkbox" id="formularioPublicado" data-form-field="activo"
                        ${convertirBooleano(formulario.activo, true) ? 'checked' : ''}>
                    <label class="form-check-label" for="formularioPublicado">Publicar en la página del municipio</label>
                </div>
                ${pdf ? `
                    <div class="portal-config-field portal-diseno-encuesta__ancho">
                        <label for="documentoFormularioPortal">Documento PDF (hasta 8 MB)</label>
                        <div class="input-group">
                            <input id="documentoFormularioPortal" class="form-control"
                                value="${escaparHtml(formulario.pdf_url || '')}" placeholder="Sin PDF" readonly>
                            <button type="button" class="btn btn-outline-primary btn-sm" data-action="upload-form-pdf"
                                ${formulario.subiendoPdf ? 'disabled' : ''}>Subir PDF</button>
                        </div>
                        <input type="file" data-form-pdf-input hidden accept="application/pdf,.pdf">
                    </div>` : ''}
            </div>

            <details class="portal-config-advanced mt-3">
                <summary><span>Más opciones del formulario</span><i class="bi bi-chevron-down" aria-hidden="true"></i></summary>
                <div class="portal-config-grid portal-config-advanced__body">
                    ${crearSelectorColorPortal('Color de la encuesta', 'data-form-field', 'color',
                        formulario.color || estadoPortal.configuracion.color_primario || '#003b17')}
                    ${crearCampoIcono('Icono de la encuesta', 'icono', formulario.icono ?? 'clipboard-check', 'data-form-field')}
                    ${online ? crearCampoTextoFormulario('Texto del botón online', 'texto_boton_online', formulario.texto_boton_online) : ''}
                    ${pdf ? crearCampoTextoFormulario('Texto del botón PDF', 'texto_boton_pdf', formulario.texto_boton_pdf) : ''}
                    ${online ? crearCampoTextoFormulario('Mensaje después de enviar', 'mensaje_confirmacion',
                        formulario.mensaje_confirmacion) : ''}
                </div>
            </details>

        </section>`;
}

/* -------- Acciones de la barra, la paleta y el papel -------- */

function ejecutarAccionFormulario(boton) {
    const accion = boton.dataset.action;

    switch (accion) {
        case 'import-form-pdf':
            document.querySelector('[data-import-form-pdf]')?.click();
            break;
        case 'new-form':
            iniciarEditorFormulario(crearFormularioVacioPortal(), true, true);
            enfocarCampoFormulario(mostrarCampoEditorFormulario('titulo'));
            break;
        case 'edit-form':
            abrirFormularioParaEditar(boton);
            break;
        case 'delete-form':
            eliminarFormularioPortal(Number(boton.dataset.id), Number(boton.dataset.responses || 0));
            break;
        case 'cancel-form':
            volverListadoFormularios();
            break;
        case 'save-form':
            guardarFormularioPortal();
            break;
        case 'upload-form-pdf':
            document.querySelector('[data-form-pdf-input]')?.click();
            break;
        case 'form-settings': {
            const ajustes = document.getElementById('ajustesEditorFormulario');
            mostrarAjustesFormulario(ajustes.hidden || !boton.hasAttribute('aria-controls'));
            if (!boton.hasAttribute('aria-controls')) enfocarCampoFormulario(ajustes.querySelector('select'));
            break;
        }
        case 'show-form-live-preview':
            saltarVistaEnDirectoFormulario(true);
            break;
        case 'back-from-form-live-preview':
            saltarVistaEnDirectoFormulario(false);
            break;
        case 'toggle-form-test':
            alternarPruebaFormulario();
            break;
        case 'toggle-form-section': {
            const apartado = boton.closest('[data-apartado-lienzo]');
            alternarPlegadoApartadoFormulario(Number(apartado.dataset.apartadoLienzo));
            break;
        }
        case 'toggle-form-question':
            alternarPlegadoPreguntaFormulario(boton.closest('[data-pregunta-lienzo]'));
            break;
        case 'toggle-all-form-sections':
            plegarTodosApartadosFormulario(boton.dataset.plegar === 'true');
            break;
        case 'add-form-section':
            agregarDesdePaletaFormulario('apartado');
            break;
        case 'add-form-palette':
            agregarDesdePaletaFormulario(boton.dataset.arrastrarTipo);
            break;
        case 'add-form-question-here': {
            const apartado = Number(boton.dataset.bloqueApartado);
            // Un clic crea una pregunta de texto. Su tipo se puede cambiar ahí mismo.
            agregarBloqueFormulario('texto', destinoAntesFormulario(apartado, listaBloquesFormulario(apartado).length));
            break;
        }
        case 'add-form-child': {
            const apartado = Number(boton.dataset.bloqueApartado);
            const indice = Number(boton.dataset.bloqueIndice);
            agregarBloqueFormulario(apartado === -1 ? 'apartado' : 'texto', destinoHijoFormulario(apartado, indice));
            break;
        }
        case 'form-block-menu': {
            const menu = boton.parentElement.querySelector('[data-menu-bloque]');
            menu.open = !menu.open;
            if (menu.open) menu.querySelector('summary').focus({ preventScroll: true });
            break;
        }
        case 'move-form-block':
            moverBloqueConFlechaFormulario(leerOrigenBotonFormulario(boton), Number(boton.dataset.direccion));
            break;
        case 'nest-form-block':
        case 'raise-form-block':
            anidarBloqueFormulario(leerOrigenBotonFormulario(boton), accion === 'nest-form-block');
            break;
        case 'delete-form-block':
            borrarBloqueFormulario(leerOrigenBotonFormulario(boton));
            break;
        case 'undo-form-delete':
            deshacerBorradoFormulario();
            break;
    }
}

/** En pantalla estrecha la vista va debajo. El atajo recuerda el punto de edición. */
function saltarVistaEnDirectoFormulario(mostrar) {
    const panel = document.getElementById('contenidoPanelConfigurador');
    if (mostrar) {
        posicionSaltoVistaFormulario = { panel: panel.scrollTop, pagina: window.scrollY };
        const titulo = document.getElementById('tituloVistaEnDirectoFormulario');
        titulo.scrollIntoView({ block: 'start' });
        titulo.focus({ preventScroll: true });
    } else if (posicionSaltoVistaFormulario) {
        document.querySelector('[data-action="show-form-live-preview"]').focus({ preventScroll: true });
        panel.scrollTop = posicionSaltoVistaFormulario.panel;
        window.scrollTo(0, posicionSaltoVistaFormulario.pagina);
    } else {
        enfocarCampoFormulario(mostrarCampoEditorFormulario('titulo'));
    }
}

/**
 * La prueba empieza arriba. Al volver recuperamos la posición de edición:
 * en escritorio se desplaza el panel y en móvil se desplaza la página.
 */
function alternarPruebaFormulario() {
    const panel = document.getElementById('contenidoPanelConfigurador');
    if (!probandoFormulario) {
        posicionEdicionFormulario = {
            panel: panel.scrollTop,
            pagina: window.scrollY,
            ajustes: !document.getElementById('ajustesEditorFormulario').hidden,
            vista: document.getElementById('vistaEnDirectoFormulario').scrollTop,
            masTipos: document.getElementById('masTiposFormulario').open
        };
    }

    probandoFormulario = !probandoFormulario;
    const volviendoEditar = !probandoFormulario;
    renderEditorFormulario(volviendoEditar && posicionEdicionFormulario.ajustes);
    if (volviendoEditar) {
        document.getElementById('masTiposFormulario').open = posicionEdicionFormulario.masTipos;
        document.getElementById('vistaEnDirectoFormulario').scrollTop = posicionEdicionFormulario.vista;
    }
    panel.scrollTop = volviendoEditar ? posicionEdicionFormulario.panel : 0;
    window.scrollTo(0, volviendoEditar ? posicionEdicionFormulario.pagina : 0);
    document.querySelector('[data-action="toggle-form-test"]').focus({ preventScroll: true });
}

function leerOrigenBotonFormulario(boton) {
    return { apartado: Number(boton.dataset.bloqueApartado), indice: Number(boton.dataset.bloqueIndice) };
}

function mostrarAjustesFormulario(abierto) {
    const ajustes = document.getElementById('ajustesEditorFormulario');
    if (!ajustes) return;
    ajustes.hidden = !abierto;
    document.querySelector('[data-action="form-settings"][aria-controls]').setAttribute('aria-expanded', String(abierto));
}

function mostrarCampoEditorFormulario(ruta) {
    const panel = document.getElementById('contenidoPanelConfigurador');
    const campo = panel.querySelector(`[data-form-field="${ruta}"], [data-form-options="${ruta}"]`);
    if (!campo) return null;

    // Una validación puede señalar una pregunta en un apartado plegado.
    // Abrimos primero el apartado y luego la pregunta para poder enfocar el campo.
    const tarjetaApartado = campo.closest('[data-apartado-lienzo]');
    if (tarjetaApartado) {
        const apartado = Number(tarjetaApartado.dataset.apartadoLienzo);
        const tarjetaPregunta = campo.closest('[data-pregunta-lienzo]');
        if (abrirApartadoFormulario(apartado)) actualizarPlegadoApartadosFormulario();
        if (tarjetaPregunta && abrirPreguntaFormulario(apartado, Number(tarjetaPregunta.dataset.preguntaLienzo))) {
            actualizarPlegadoPreguntasFormulario(tarjetaApartado);
        }
    }
    if (campo.closest('#ajustesEditorFormulario')) mostrarAjustesFormulario(true);
    const detalle = campo.closest('details');
    if (detalle) detalle.open = true;
    return campo;
}

/** El foco sigue a la operación, incluso si el bloque está fuera de pantalla. */
function enfocarCampoFormulario(campo) {
    if (!campo) return;
    campo.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    campo.focus({ preventScroll: true });
}

/**
 * data-form-field indica dónde guardar el control. Por ejemplo:
 * secciones.0.preguntas.1.enunciado es la segunda pregunta del primer apartado.
 * Las opciones se escriben en líneas y PHP las recibe como una lista.
 */
function gestionarCambioFormulario(evento) {
    const campo = evento.target;
    const formulario = estadoPortal.formularioActual;

    if (campo.hasAttribute('data-import-form-pdf')) {
        if (evento.type === 'change') importarEncuestaDesdePdf(campo);
        return true;
    }
    if (!formulario) return false;

    if (campo.hasAttribute('data-form-pdf-input')) {
        if (evento.type === 'change') {
            const archivo = campo.files[0];
            campo.value = '';
            subirPdfFormularioPortal(archivo);
        }
        return true;
    }
    if (campo.hasAttribute('data-ir-apartado')) {
        if (evento.type === 'change' && campo.value !== '') {
            seleccionarApartadoFormulario(Number(campo.value));
            enfocarCampoFormulario(mostrarCampoEditorFormulario(`secciones.${campo.value}.titulo`));
        }
        return true;
    }
    if (campo.hasAttribute('data-mover-a-apartado')) {
        if (evento.type === 'change' && campo.value !== '') {
            const destino = Number(campo.value);
            moverBloqueFormulario(leerOrigenBotonFormulario(campo),
                destinoAntesFormulario(destino, formulario.secciones[destino].preguntas.length));
        }
        return true;
    }

    const rutaOpciones = campo.dataset.formOptions;
    const ruta = campo.dataset.formField || rutaOpciones;
    if (!ruta) return false;
    if (evento.type !== (campo.tagName === 'SELECT' ? 'change' : 'input')) return true;
    if (ruta === 'color' && !esColorPortal(campo.value)) return true;

    let valor = obtenerValorCampo(campo);
    if (rutaOpciones) valor = campo.value.split('\n').map(linea => linea.trim()).filter(Boolean);
    establecerValorRuta(formulario, ruta, valor);
    marcarCambios(true, 'formulario');

    // Solo los campos que cambian el HTML repintan el papel. Al escribir,
    // se actualiza el borrador sin retirar el campo que tiene el cursor.
    if (ruta === 'modalidad') {
        renderEditorFormulario(true);
        enfocarCampoFormulario(mostrarCampoEditorFormulario(ruta));
    } else if (ruta.endsWith('.tipo')) {
        // Solo se vuelve a dibujar al cambiar un tipo, para mostrar sus opciones.
        renderizarLienzoFormulario();
        enfocarCampoFormulario(mostrarCampoEditorFormulario(ruta));
    } else if (ruta === 'icono' && formularioDesdeCero) {
        renderizarLienzoFormulario();
    } else if (ruta === 'color') {
        document.querySelector('#lienzoEditorFormulario .portal-form-preview-page').style.setProperty('--form-preview-color', valor);
        programarVistaEnDirectoFormulario();
    } else {
        actualizarTextoLienzoFormulario(campo, ruta, valor);
        programarVistaEnDirectoFormulario();
    }
    return true;
}

function actualizarTextoLienzoFormulario(campo, ruta, valor) {
    const partes = ruta.split('.');
    if (ruta === 'titulo') {
        document.getElementById('descripcionPanelConfigurador').textContent = valor;
    } else if (partes.length === 3 && partes[2] === 'titulo') {
        const nivel = nivelBloqueFormulario(estadoPortal.formularioActual.secciones[Number(partes[1])]);
        for (const opcion of document.querySelectorAll(`[data-nombre-apartado="${partes[1]}"]`)) {
            opcion.textContent = (nivel ? '↳ ' : '') + (valor.trim() || 'Apartado sin título');
        }
        actualizarDestinoPaletaFormulario();
    } else if (ruta.endsWith('.enunciado')) {
        const resumen = campo.closest('[data-pregunta-lienzo]').querySelector('[data-resumen-pregunta]');
        resumen.textContent = valor.trim() || 'Pregunta sin enunciado';
    } else if (ruta.endsWith('.numero') || ruta.endsWith('.ayuda')) {
        const encabezado = campo.closest('.portal-diseno-encuesta__encabezado');
        const muestra = encabezado.querySelector(ruta.endsWith('.numero') ? '[data-muestra-numero]' : '[data-muestra-ayuda]');
        if (muestra) {
            muestra.textContent = valor;
            muestra.hidden = !String(valor).trim();
        }
    }
}

/**
 * Sube el PDF asociado al formulario que se está editando.
 * El archivo se guarda en el servidor, pero la ruta no se persiste hasta
 * pulsar "Guardar formulario".
 */
async function subirPdfFormularioPortal(archivo) {
    const formulario = estadoPortal.formularioActual;
    if (!archivo || !formulario || formulario.subiendoPdf) return;
    if (!archivo.size || archivo.size > 8 * 1024 * 1024) {
        Swal.fire('Revisa el archivo', 'Selecciona un PDF de hasta 8 MB.', 'warning');
        return;
    }

    formulario.subiendoPdf = true;
    cambiarEstadoSubidaFormulario(true);

    const datos = new FormData();
    datos.append('cod_mun', estadoPortal.codMun);
    datos.append('archivo', archivo);

    try {
        const resultado = await solicitarJson(
            'php/gestion/formularios_dinamicos/subir_pdf_formulario.php',
            {
                method: 'POST',
                body: datos
            }
        );

        formulario.pdf_url = resultado.url;
        if (estadoPortal.formularioActual !== formulario) return;
        marcarCambios(true, 'formulario');

        // Actualizamos el campo si sigue a la vista. El gestor puede seguir
        // revisando preguntas mientras el archivo termina de subir.
        const campoPdf = document.getElementById('documentoFormularioPortal');
        if (campoPdf) campoPdf.value = formulario.pdf_url;
        renderizarLienzoFormulario();

        Swal.fire({
            icon: 'success',
            title: 'PDF preparado',
            text: 'Guarda el formulario para conservar la ruta del documento.',
            timer: 1600,
            showConfirmButton: false
        });
    } catch (error) {
        Swal.fire('No se pudo subir el PDF', error.message, 'error');
    } finally {
        delete formulario.subiendoPdf;
        if (estadoPortal.formularioActual === formulario) {
            cambiarEstadoSubidaFormulario(false);
        }
    }
}

/** Durante la subida se puede editar y navegar, pero el guardado espera al PDF. */
function cambiarEstadoSubidaFormulario(subiendo) {
    const panel = document.getElementById('contenidoPanelConfigurador');
    for (const boton of panel.querySelectorAll('[data-action="upload-form-pdf"], [data-action="cancel-form"]')) {
        boton.disabled = subiendo;
    }
    mostrarGuardadoFormularioPortal(subiendo, 'Subiendo PDF');
}

/**
 * Devuelve el primer error y la ruta que hay que abrir para corregirlo.
 * Una ruta vacía corresponde al botón de añadir un apartado o una pregunta.
 * La validación definitiva se hace en FormularioDinamicoModel.php.
 */
function validarFormularioPortal(formulario) {
    if (!formulario.titulo.trim()) {
        return { mensaje: 'Escribe un título para el formulario.', ruta: 'titulo' };
    }

    const necesitaPdf = formulario.modalidad === 'pdf' || formulario.modalidad === 'ambos';
    if (necesitaPdf && !String(formulario.pdf_url || '').trim()) {
        return { mensaje: 'Sube el documento PDF antes de guardar este formato.', ruta: 'modalidad', accion: 'upload-form-pdf' };
    }
    if (formulario.modalidad === 'pdf') return null;
    if (!formulario.secciones.length) {
        return { mensaje: 'Añade al menos un apartado.', accion: 'add-form-section' };
    }

    let totalPreguntas = 0;
    for (const [indiceSeccion, seccion] of formulario.secciones.entries()) {
        const rutaSeccion = `secciones.${indiceSeccion}`;
        if (!seccion.titulo.trim()) {
            return { mensaje: 'Escribe el título de este apartado.', ruta: rutaSeccion + '.titulo' };
        }

        totalPreguntas += seccion.preguntas.length;
        for (const [indicePregunta, pregunta] of seccion.preguntas.entries()) {
            const rutaPregunta = rutaSeccion + '.preguntas.' + indicePregunta;
            if (!pregunta.enunciado.trim()) {
                return { mensaje: 'Escribe el enunciado de esta pregunta.', ruta: rutaPregunta + '.enunciado' };
            }
            if (tipoRespuestaConOpciones(pregunta.tipo) && new Set(pregunta.opciones).size < 2) {
                return { mensaje: 'Escribe al menos dos opciones distintas, una por línea.', ruta: rutaPregunta + '.opciones' };
            }
        }
    }

    if (totalPreguntas === 0) {
        return { mensaje: 'Añade al menos una pregunta.', accion: 'add-form-question-here' };
    }
    return null;
}

/**
 * Cambia el aspecto del botón de guardado mientras se envían los datos.
 * Esto evita dobles clics y deja claro que la operación sigue en curso.
 *
 * @param {boolean} guardando Indica si la petición está activa.
 */
function mostrarGuardadoFormularioPortal(guardando, mensaje = 'Guardando') {
    const boton = document.querySelector('[data-action="save-form"]');

    if (!boton) {
        return;
    }

    boton.disabled = guardando;
    boton.innerHTML = guardando
        ? '<span class="spinner-border spinner-border-sm me-1"></span>' + mensaje
        : '<i class="bi bi-check2-circle me-1" aria-hidden="true"></i>Guardar<span class="d-none d-sm-inline"> formulario</span>';
}

/**
 * Valida y guarda el formulario dinámico actual.
 */
async function guardarFormularioPortal() {
    const formulario = estadoPortal.formularioActual;
    if (!formulario || formulario.subiendoPdf || formulario.guardando) return;
    const error = validarFormularioPortal(formulario);
    if (error) {
        await Swal.fire({
            title: 'Revisa el formulario',
            text: error.mensaje,
            icon: 'warning',
            returnFocus: false,
            heightAuto: false
        });

        if (estadoPortal.formularioActual !== formulario) return;
        if (probandoFormulario) {
            probandoFormulario = false;
            renderEditorFormulario();
        }
        const campo = error.ruta ? mostrarCampoEditorFormulario(error.ruta) : null;
        if (error.accion) {
            if (error.accion === 'add-form-question-here' && abrirApartadoFormulario(0)) {
                actualizarPlegadoApartadosFormulario();
            }
            enfocarCampoFormulario(document.querySelector(`[data-action="${error.accion}"]`));
        } else {
            enfocarCampoFormulario(campo);
        }
        return;
    }

    // Se prepara el JSON antes de añadir el indicador visual de guardado.
    const cuerpo = JSON.stringify(formulario);
    mostrarGuardadoFormularioPortal(true);
    formulario.guardando = true;

    // Se bloquea la edición hasta que el servidor responda.
    const editor = document.getElementById('contenidoPanelConfigurador');
    editor.inert = true;

    try {
        const resultado = await solicitarJson(
            `php/gestion/formularios_dinamicos/acciones_formularios.php?accion=guardar&cod_mun=${encodeURIComponent(estadoPortal.codMun)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: cuerpo
            }
        );

        // La respuesta de guardado ya incluye los datos confirmados en PostgreSQL.
        // Una segunda petición al listado podía fallar y confundir un guardado correcto.
        const guardado = resultado.formulario;
        formulario.id = guardado.id;
        formulario.slug = guardado.slug;
        const indice = estadoPortal.formularios.findIndex(item => Number(item.id) === Number(guardado.id));
        if (indice === -1) {
            estadoPortal.formularios.push(guardado);
        } else {
            guardado.total_respuestas = estadoPortal.formularios[indice].total_respuestas;
            estadoPortal.formularios[indice] = guardado;
        }

        if (estadoPortal.formularioActual === formulario) {
            estadoPortal.formularioActual = null;
            marcarCambios(false, 'formulario');
            // Si el gestor eligió otro bloque del portal, respetamos esa pantalla.
            if (estadoPortal.panelActual === 'formularios') renderPanelFormularios();
        }
        editor.inert = false;
        renderMenuConfigurador();
        recargarIframePortal();

        const decision = await Swal.fire({
            icon: 'success',
            title: 'Formulario guardado',
            text: 'En Botones de participación puedes elegir la tarjeta y vincular este formulario.',
            confirmButtonText: 'Ir a los botones',
            heightAuto: false,
            returnFocus: false,
            showCancelButton: true,
            cancelButtonText: 'Cerrar'
        });
        if (decision.isConfirmed) {
            mostrarPanelConfigurador('seccion:participacion');
            requestAnimationFrame(ajustarLienzoVistaPrevia);
            requestAnimationFrame(function () {
                const lista = document.getElementById('botonesParticipacionConfigurador');
                if (!lista) return;
                lista.focus({ preventScroll: true });
                lista.closest('.portal-config-card').scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
            });
        }
    } catch (error) {
        Swal.fire('No se pudo guardar el formulario', error.message, 'error');
    } finally {
        delete formulario.guardando;
        editor.inert = false;
        if (estadoPortal.formularioActual === formulario) mostrarGuardadoFormularioPortal(false);
    }
}

/**
 * Elimina un formulario vacío o archiva uno que ya contiene respuestas.
 */
async function eliminarFormularioPortal(idFormulario, totalRespuestas) {
    const tieneRespuestas = totalRespuestas > 0;
    const confirmacion = await Swal.fire({
        title: tieneRespuestas ? '¿Archivar formulario?' : '¿Eliminar formulario?',
        text: tieneRespuestas
            ? 'Las respuestas se conservarán y el formulario dejará de publicarse.'
            : 'El formulario se eliminará definitivamente.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: tieneRespuestas ? 'Archivar' : 'Eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) {
        return;
    }

    try {
        const datos = new URLSearchParams({
            accion: 'eliminar',
            cod_mun: estadoPortal.codMun,
            id: String(idFormulario)
        });

        await solicitarJson(
            'php/gestion/formularios_dinamicos/acciones_formularios.php',
            {
                method: 'POST',
                body: datos
            }
        );

        const listado = await solicitarJson(
            `php/gestion/formularios_dinamicos/acciones_formularios.php?accion=listar&cod_mun=${encodeURIComponent(estadoPortal.codMun)}`
        );

        estadoPortal.formularios = listado.formularios || [];
        renderMenuConfigurador();
        renderPanelFormularios();
        recargarIframePortal();
    } catch (error) {
        Swal.fire('No se pudo actualizar el formulario', error.message, 'error');
    }
}

// ============================================================================
// CAMPOS HTML Y DATOS RECIBIDOS DEL SERVIDOR
// ============================================================================

/** Las etiquetas usan for y el campo usa id para que se puedan pulsar y leer con teclado. */
function crearCampoTextoFormulario(etiqueta, ruta, valor, placeholder = '', longitud = 0) {
    return `
        <div class="portal-config-field">
            <label for="campo-form-${ruta}">${escaparHtml(etiqueta)}</label>
            <input id="campo-form-${ruta}" class="form-control" data-form-field="${ruta}"
                value="${escaparHtml(valor || '')}" placeholder="${escaparHtml(placeholder)}" ${longitud ? `maxlength="${longitud}"` : ''}>
        </div>`;
}

function crearTextareaFormulario(etiqueta, ruta, valor, filas = 3, atributo = 'data-form-field') {
    return `
        <div class="portal-config-field portal-diseno-encuesta__ancho">
            <label for="campo-form-${ruta}">${escaparHtml(etiqueta)}</label>
            <textarea id="campo-form-${ruta}" class="form-control" rows="${filas}" ${atributo}="${ruta}">${escaparHtml(valor || '')}</textarea>
        </div>`;
}

/** Cada opción trae dos datos: el valor que se guarda y el texto que se muestra. */
function crearCampoSeleccionFormulario(etiqueta, ruta, valor, opciones) {
    return `
        <div class="portal-config-field">
            <label for="campo-form-${ruta}">${escaparHtml(etiqueta)}</label>
            <select id="campo-form-${ruta}" class="form-select" data-form-field="${ruta}">
                ${opciones.map(function (opcion) {
                    return `<option value="${opcion[0]}" ${opcion[0] === valor ? 'selected' : ''}>${escaparHtml(opcion[1])}</option>`;
                }).join('')}
            </select>
        </div>`;
}

/**
 * Normaliza los booleanos de un formulario devuelto por PostgreSQL.
 * También garantiza que secciones, preguntas y opciones sean arrays.
 */
function normalizarFormularioPortal(formulario) {
    const resultado = formulario;
    resultado.titulo = String(resultado.titulo || '');
    resultado.activo = convertirBooleano(resultado.activo, true);
    resultado.secciones = Array.isArray(resultado.secciones) ? resultado.secciones : [];

    resultado.secciones.forEach(function (seccion) {
        seccion.titulo = String(seccion.titulo || '');
        seccion.preguntas = Array.isArray(seccion.preguntas) ? seccion.preguntas : [];

        seccion.preguntas.forEach(function (pregunta) {
            pregunta.enunciado = String(pregunta.enunciado || '');
            pregunta.obligatorio = convertirBooleano(pregunta.obligatorio, false);
            pregunta.opciones = Array.isArray(pregunta.opciones) ? pregunta.opciones : [];
            pregunta.ancho = pregunta.ancho || 'completo';
            pregunta.tipo = pregunta.tipo || 'texto';
        });
    });

    return resultado;
}

/**
 * Devuelve una etiqueta legible para la modalidad del formulario.
 */
function obtenerTextoModalidad(modalidad) {
    if (modalidad === 'ambos') {
        return 'Online y PDF';
    }

    if (modalidad === 'pdf') {
        return 'Solo PDF';
    }

    return 'Formulario online';
}

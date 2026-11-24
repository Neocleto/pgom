/**
 * Formularios del configurador: listado, edición, importación y guardado.
 * Depende del estado y los campos comunes de configuradorPortal.js.
 */

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
                    <button type="button" class="portal-small-button" data-action="edit-form" data-id="${Number(formulario.id)}" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="portal-small-button is-danger" data-action="delete-form" data-id="${Number(formulario.id)}" data-responses="${respuestas}" title="Eliminar o archivar">
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
    cambiarModoVistaPrevia(estadoPortal.formularioActual ? 'formulario' : 'portal');
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
        estadoPortal.formularioActual = formulario;
        marcarCambios(true, 'formulario');
        renderEditorFormulario();

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
        secciones: [
            {
                titulo: 'Datos generales',
                descripcion: '',
                preguntas: []
            }
        ]
    };
}

/**
 * Crea una pregunta nueva con valores fáciles de modificar.
 */
function crearPreguntaVaciaPortal() {
    return {
        enunciado: 'Nueva pregunta',
        ayuda: '',
        tipo: 'texto',
        obligatorio: false,
        ancho: 'completo',
        opciones: []
    };
}

/**
 * Abre un formulario existente desde el servidor.
 */
async function abrirFormularioParaEditar(idFormulario) {
    try {
        const datos = await solicitarJson(
            `php/gestion/formularios_dinamicos/acciones_formularios.php?accion=obtener&cod_mun=${encodeURIComponent(estadoPortal.codMun)}&id=${encodeURIComponent(idFormulario)}`
        );

        estadoPortal.formularioActual = normalizarFormularioPortal(datos.formulario);
        marcarCambios(false, 'formulario');
        renderEditorFormulario();
    } catch (error) {
        Swal.fire('No se pudo abrir el formulario', error.message, 'error');
    }
}

/**
 * Dibuja el formulario completo en una sola pantalla desplazable.
 * Se evita un asistente dentro de otro asistente para reducir la complejidad.
 */
function renderEditorFormulario() {
    const formulario = estadoPortal.formularioActual;
    const ofreceFormularioOnline = formulario.modalidad !== 'pdf';
    const ofreceDocumentoPdf = formulario.modalidad === 'pdf'
        || formulario.modalidad === 'ambos';

    establecerCabeceraPanel(
        formulario.id ? 'Editar formulario' : 'Nuevo formulario',
        'Completa los datos básicos y añade apartados y preguntas.'
    );

    const secciones = formulario.secciones.map(function (seccion, indiceSeccion) {
        return crearEditorSeccionFormulario(seccion, indiceSeccion);
    }).join('');

    // El PDF solo se pide cuando la modalidad elegida lo va a mostrar.
    const campoPdf = ofreceDocumentoPdf
        ? `<div class="portal-config-field" style="grid-column:1/-1">
                <label>Documento PDF imprimible</label>
                <div class="input-group">
                    <input
                        class="form-control"
                        data-form-field="pdf_url"
                        value="${escaparHtml(formulario.pdf_url || '')}"
                        placeholder="No hay PDF seleccionado"
                        readonly>
                    <button
                        type="button"
                        class="btn btn-outline-primary"
                        data-action="upload-form-pdf">
                        <i class="bi bi-upload me-1"></i>
                        Subir PDF
                    </button>
                </div>
                <input
                    type="file"
                    class="d-none"
                    data-form-pdf-input
                    accept="application/pdf,.pdf">
                <div class="portal-config-help">Archivo PDF de hasta 8 MB.</div>
           </div>`
        : '';

    const campoTextoOnline = ofreceFormularioOnline
        ? crearCampoTextoFormulario(
            'Texto del botón online',
            'texto_boton_online',
            formulario.texto_boton_online || 'Realizar encuesta online'
        )
        : '';

    const campoTextoPdf = ofreceDocumentoPdf
        ? crearCampoTextoFormulario(
            'Texto del botón PDF',
            'texto_boton_pdf',
            formulario.texto_boton_pdf || ''
        )
        : '';

    const campoConfirmacion = ofreceFormularioOnline
        ? `<div class="portal-config-field" style="grid-column:1/-1">
                <label>Mensaje después de enviar</label>
                <input
                    class="form-control"
                    data-form-field="mensaje_confirmacion"
                    value="${escaparHtml(formulario.mensaje_confirmacion || '')}">
           </div>`
        : '';

    const constructorPreguntas = ofreceFormularioOnline
        ? `<div class="portal-form-builder-toolbar">
                <div>
                    <strong>Apartados y preguntas</strong>
                    <div class="portal-config-help">
                        Organiza el formulario por temas para que sea fácil de responder.
                    </div>
                </div>
                <button
                    type="button"
                    class="btn btn-outline-primary btn-sm"
                    data-action="add-form-section">
                    <i class="bi bi-plus-circle me-1"></i>
                    Añadir apartado
                </button>
           </div>

           <div id="constructorFormularioPortal">
                ${secciones || crearVacio('Añade un apartado para comenzar.')}
           </div>`
        : `<div class="alert alert-light border mt-3 mb-0">
                <i class="bi bi-file-earmark-pdf text-danger me-1"></i>
                Esta modalidad solo publica el documento PDF. No necesita preguntas online.
           </div>`;

    document.getElementById('contenidoPanelConfigurador').innerHTML = `
        <div class="portal-form-builder-toolbar portal-form-builder-toolbar--guardar">
            <button
                type="button"
                class="btn btn-outline-secondary btn-sm"
                data-action="cancel-form">
                <i class="bi bi-arrow-left me-1"></i>
                Volver al listado
            </button>

            <button
                type="button"
                class="btn btn-success btn-sm"
                data-action="save-form">
                <i class="bi bi-check2-circle me-1"></i>
                Guardar formulario
            </button>
        </div>

        ${crearTarjetaConfiguracion(
            'Datos básicos',
            'Define el título, la descripción y la forma de participación.',
            `<div class="portal-config-grid">
                ${crearCampoTextoFormulario(
                    'Título',
                    'titulo',
                    formulario.titulo,
                    'Ej: Encuesta inicial de participación'
                )}

                ${crearCampoSeleccionFormulario(
                    'Modalidad',
                    'modalidad',
                    formulario.modalidad,
                    [
                        ['online', 'Solo formulario online'],
                        ['pdf', 'Solo documento PDF'],
                        ['ambos', 'Formulario online y PDF']
                    ]
                )}

                <div class="portal-config-field" style="grid-column:1/-1">
                    <label>Descripción</label>
                    <textarea
                        class="form-control"
                        rows="3"
                        data-form-field="descripcion">${escaparHtml(formulario.descripcion || '')}</textarea>
                </div>

                ${crearCampoColorFormulario(
                    'Color de la encuesta',
                    'color',
                    formulario.color || estadoPortal.configuracion.color_primario || '#003b17'
                )}
                ${crearCampoIcono('Icono de la encuesta', 'icono', formulario.icono ?? 'clipboard-check', 'data-form-field')}

                ${campoPdf}
            </div>`
        )}

        ${crearTarjetaConfiguracion(
            'Opciones de publicación',
            'Ajustes menos habituales que puedes dejar con sus valores iniciales.',
            `<details class="portal-config-advanced">
                <summary>
                    <span><i class="bi bi-sliders me-1"></i>Mostrar opciones avanzadas</span>
                    <small>Textos de los botones y mensaje final</small>
                </summary>

                <div class="portal-config-grid portal-config-advanced__body">
                    ${campoTextoOnline}
                    ${campoTextoPdf}
                    ${campoConfirmacion}
                    <div class="portal-config-field" style="grid-column:1/-1">
                        <div class="form-check form-switch mt-2">
                            <input
                                class="form-check-input"
                                type="checkbox"
                                id="formularioPublicado"
                                data-form-field="activo"
                                ${convertirBooleano(formulario.activo, true) ? 'checked' : ''}>
                            <label class="form-check-label" for="formularioPublicado">
                                Publicar en la página del municipio
                            </label>
                        </div>
                    </div>
                </div>
            </details>`
        )}

        ${constructorPreguntas}
    `;
    cambiarModoVistaPrevia('formulario');
}

/**
 * Dibuja un apartado y todas sus preguntas.
 */
function crearEditorSeccionFormulario(seccion, indiceSeccion) {
    const preguntas = (seccion.preguntas || []).map(function (pregunta, indicePregunta) {
        return crearEditorPreguntaFormulario(pregunta, indiceSeccion, indicePregunta);
    }).join('');

    return `
        <section class="portal-form-builder-section" data-form-section="${indiceSeccion}" style="--nivel-encuesta:${Number(seccion.nivel) || 0}">
            <div class="portal-repeater-item__heading">
                <strong>${Number(seccion.nivel) ? 'Subapartado' : 'Apartado'} · ${escaparHtml(seccion.numero || String(indiceSeccion + 1))}</strong>
                <span class="portal-repeater-item__actions">
                    <button type="button" class="portal-small-button" data-action="move-form-section-up" data-section="${indiceSeccion}" title="Subir"><i class="bi bi-arrow-up"></i></button>
                    <button type="button" class="portal-small-button" data-action="move-form-section-down" data-section="${indiceSeccion}" title="Bajar"><i class="bi bi-arrow-down"></i></button>
                    <button type="button" class="portal-small-button is-danger" data-action="remove-form-section" data-section="${indiceSeccion}" title="Eliminar"><i class="bi bi-trash"></i></button>
                </span>
            </div>

            <div class="portal-config-grid">
                ${crearCampoTextoFormulario('Título del apartado', `secciones.${indiceSeccion}.titulo`, seccion.titulo || '')}
                ${crearCampoTextoFormulario('Descripción', `secciones.${indiceSeccion}.descripcion`, seccion.descripcion || '')}
                ${crearCampoNumeroEncuesta(`secciones.${indiceSeccion}.numero`, seccion.numero)}
                ${crearCampoSeleccionFormulario('Nivel', `secciones.${indiceSeccion}.nivel`, String(seccion.nivel || 0), [
                    ['0', 'Apartado principal'], ['1', 'Subapartado'], ['2', 'Subapartado de segundo nivel']
                ])}
            </div>

            <div class="mt-3">
                ${preguntas || '<div class="portal-config-help">Este apartado todavía no tiene preguntas.</div>'}
            </div>

            <button type="button" class="btn btn-outline-primary btn-sm mt-2" data-action="add-form-question" data-section="${indiceSeccion}">
                <i class="bi bi-plus-circle me-1"></i>Añadir pregunta
            </button>
            ${Number(seccion.nivel || 0) < 2 ? `<button type="button" class="btn btn-outline-secondary btn-sm mt-2"
                data-action="add-child-form-section" data-section="${indiceSeccion}">Añadir subapartado</button>` : ''}
        </section>
    `;
}

/**
 * Dibuja una pregunta editable.
 */
function crearEditorPreguntaFormulario(pregunta, indiceSeccion, indicePregunta) {
    const rutaBase = `secciones.${indiceSeccion}.preguntas.${indicePregunta}`;
    const necesitaOpciones = ['opcion_unica', 'opcion_multiple', 'desplegable'].includes(pregunta.tipo);

    return `
        <article class="portal-form-builder-question" data-form-question="${indicePregunta}" style="--nivel-encuesta:${Number(pregunta.nivel) || 0}">
            <div class="portal-repeater-item__heading">
                <strong>${Number(pregunta.nivel) ? 'Subpregunta' : 'Pregunta'} · ${escaparHtml(pregunta.numero || String(indicePregunta + 1))}</strong>
                <span class="portal-repeater-item__actions">
                    <button type="button" class="portal-small-button" data-action="move-form-question-up" data-section="${indiceSeccion}" data-question="${indicePregunta}" title="Subir"><i class="bi bi-arrow-up"></i></button>
                    <button type="button" class="portal-small-button" data-action="move-form-question-down" data-section="${indiceSeccion}" data-question="${indicePregunta}" title="Bajar"><i class="bi bi-arrow-down"></i></button>
                    <button type="button" class="portal-small-button is-danger" data-action="remove-form-question" data-section="${indiceSeccion}" data-question="${indicePregunta}" title="Eliminar"><i class="bi bi-trash"></i></button>
                </span>
            </div>

            <div class="portal-config-grid">
                ${crearCampoTextoFormulario('Pregunta', `${rutaBase}.enunciado`, pregunta.enunciado || '')}
                ${crearCampoNumeroEncuesta(`${rutaBase}.numero`, pregunta.numero)}
                ${crearCampoSeleccionFormulario('Nivel', `${rutaBase}.nivel`, String(pregunta.nivel || 0), [
                    ['0', 'Pregunta principal'], ['1', 'Subpregunta'], ['2', 'Subpregunta de segundo nivel']
                ])}
                ${crearCampoSeleccionFormulario('Tipo de respuesta', `${rutaBase}.tipo`, pregunta.tipo || 'texto', [
                    ['texto', 'Texto corto'],
                    ['texto_largo', 'Texto largo'],
                    ['numero', 'Número'],
                    ['fecha', 'Fecha'],
                    ['si_no', 'Sí / No'],
                    ['opcion_unica', 'Una opción'],
                    ['opcion_multiple', 'Varias opciones'],
                    ['desplegable', 'Lista desplegable']
                ])}
                ${crearCampoTextoFormulario('Texto de ayuda', `${rutaBase}.ayuda`, pregunta.ayuda || '', 'Opcional')}
                ${crearCampoSeleccionFormulario('Ancho', `${rutaBase}.ancho`, pregunta.ancho || 'completo', [
                    ['completo', 'Fila completa'],
                    ['medio', 'Media fila']
                ])}
                ${necesitaOpciones ? `
                    <div class="portal-config-field" style="grid-column:1/-1">
                        <label>Opciones, una por línea</label>
                        <textarea class="form-control" rows="4" data-form-options="${rutaBase}.opciones">${escaparHtml((pregunta.opciones || []).join('\n'))}</textarea>
                    </div>
                ` : ''}
                <div class="portal-config-field" style="grid-column:1/-1">
                    <div class="form-check form-switch mt-1">
                        <input class="form-check-input" type="checkbox" id="obligatoria_${indiceSeccion}_${indicePregunta}" data-form-field="${rutaBase}.obligatorio" ${pregunta.obligatorio ? 'checked' : ''}>
                        <label class="form-check-label" for="obligatoria_${indiceSeccion}_${indicePregunta}">Respuesta obligatoria</label>
                    </div>
                </div>
            </div>
            ${Number(pregunta.nivel || 0) < 2 ? `<button type="button" class="btn btn-outline-secondary btn-sm mt-2"
                data-action="add-child-form-question" data-section="${indiceSeccion}" data-question="${indicePregunta}">Añadir subpregunta</button>` : ''}
        </article>
    `;
}

function crearCampoNumeroEncuesta(ruta, numero) {
    return `<label class="portal-config-field">
        <span>Numeración (opcional)</span>
        <input class="form-control" maxlength="30" data-form-field="${ruta}" value="${escaparHtml(numero || '')}" placeholder="Ej. 1.2">
    </label>`;
}

/**
 * Mueve, elimina o añade elementos dentro del formulario actual.
 */
function modificarSeccionFormulario(boton) {
    const accion = boton.dataset.action;
    const indiceSeccion = Number(boton.dataset.section);
    const secciones = estadoPortal.formularioActual.secciones;

    if (accion === 'add-child-form-section') {
        insertarHijoEncuesta(secciones, indiceSeccion, { titulo: 'Nuevo subapartado', descripcion: '', preguntas: [] });
    } else {
        modificarOrdenEncuesta(secciones, indiceSeccion, accion);
    }

    marcarCambios(true, 'formulario');
    renderEditorFormulario();
}

/**
 * Mueve, elimina o añade preguntas dentro de un apartado.
 */
function modificarPreguntaFormulario(boton) {
    const accion = boton.dataset.action;
    const indiceSeccion = Number(boton.dataset.section);
    const indicePregunta = Number(boton.dataset.question);
    const preguntas = estadoPortal.formularioActual.secciones[indiceSeccion]?.preguntas;

    if (!preguntas) {
        return;
    }

    if (accion === 'add-form-question') {
        preguntas.push(crearPreguntaVaciaPortal());
    } else if (accion === 'add-child-form-question') {
        insertarHijoEncuesta(preguntas, indicePregunta, crearPreguntaVaciaPortal());
    } else {
        modificarOrdenEncuesta(preguntas, indicePregunta, accion);
    }

    marcarCambios(true, 'formulario');
    renderEditorFormulario();
}

// Los elementos que siguen con más sangría forman parte del mismo bloque.
function finBloqueEncuesta(lista, indice) {
    const nivel = Number(lista[indice].nivel || 0);
    let fin = indice + 1;
    while (fin < lista.length && Number(lista[fin].nivel || 0) > nivel) {
        fin++;
    }
    return fin;
}

function insertarHijoEncuesta(lista, indice, nuevo) {
    nuevo.nivel = Number(lista[indice].nivel || 0) + 1;
    lista.splice(finBloqueEncuesta(lista, indice), 0, nuevo);
}

function modificarOrdenEncuesta(lista, indice, accion) {
    const nivel = Number(lista[indice].nivel || 0);
    const fin = finBloqueEncuesta(lista, indice);
    if (accion.startsWith('remove-')) {
        // Al quitar un encabezado, sus elementos se conservan un nivel más arriba.
        for (let hijo = indice + 1; hijo < fin; hijo++) {
            lista[hijo].nivel = Number(lista[hijo].nivel) - 1;
        }
        lista.splice(indice, 1);
        return;
    }

    if (accion.endsWith('-down')) {
        if (fin >= lista.length || Number(lista[fin].nivel || 0) !== nivel) return;
        const destino = finBloqueEncuesta(lista, fin);
        const bloque = lista.splice(indice, fin - indice);
        lista.splice(destino - bloque.length, 0, ...bloque);
        return;
    }

    let anterior = indice - 1;
    while (anterior >= 0 && Number(lista[anterior].nivel || 0) > nivel) {
        anterior--;
    }
    if (anterior >= 0 && Number(lista[anterior].nivel || 0) === nivel) {
        const bloque = lista.splice(indice, fin - indice);
        lista.splice(anterior, 0, ...bloque);
    }
}

/**
 * Sube el PDF asociado al formulario que se está editando.
 * El archivo se guarda en el servidor, pero la ruta no se persiste hasta
 * pulsar "Guardar formulario".
 */
async function subirPdfFormularioPortal(archivo) {
    const formulario = estadoPortal.formularioActual;
    if (!archivo || !formulario || formulario.subiendoPdf) {
        return;
    }

    formulario.subiendoPdf = true;
    const botonSubir = document.querySelector('[data-action="upload-form-pdf"]');
    botonSubir.disabled = true;
    mostrarGuardadoFormularioPortal(true, 'Subiendo PDF');

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
        renderEditorFormulario();

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
            botonSubir.disabled = false;
            mostrarGuardadoFormularioPortal(false);
        }
    }
}

/**
 * Comprueba que el formulario contiene los datos mínimos para publicarse.
 *
 * La función no modifica el formulario. Solo devuelve un mensaje cuando
 * encuentra un problema y una cadena vacía cuando todo es correcto.
 *
 * @param {Object} formulario Formulario que se está editando.
 * @returns {string} Mensaje de validación o cadena vacía.
 */
function validarFormularioPortal(formulario) {
    if (!formulario.titulo.trim()) {
        return 'Escribe un título para el formulario.';
    }

    // Las modalidades que ofrecen descarga necesitan un PDF ya subido.
    const necesitaPdf = formulario.modalidad === 'pdf'
        || formulario.modalidad === 'ambos';

    if (necesitaPdf && !String(formulario.pdf_url || '').trim()) {
        return 'Sube el documento PDF antes de guardar esta modalidad.';
    }

    // Un recurso exclusivamente PDF no necesita apartados ni preguntas.
    if (formulario.modalidad === 'pdf') {
        return '';
    }

    if (!formulario.secciones.length) {
        return 'Añade al menos un apartado.';
    }

    let totalPreguntas = 0;

    for (const seccion of formulario.secciones) {
        if (!String(seccion.titulo || '').trim()) {
            return 'Todos los apartados necesitan un título.';
        }

        const preguntas = Array.isArray(seccion.preguntas)
            ? seccion.preguntas
            : [];

        totalPreguntas += preguntas.length;

        for (const pregunta of preguntas) {
            if (!String(pregunta.enunciado || '').trim()) {
                return 'Todas las preguntas necesitan un enunciado.';
            }

            const necesitaOpciones = [
                'opcion_unica',
                'opcion_multiple',
                'desplegable'
            ].includes(pregunta.tipo);

            if (necesitaOpciones && new Set(pregunta.opciones || []).size < 2) {
                return 'Las preguntas de opciones necesitan al menos dos respuestas posibles.';
            }
        }
    }

    if (formulario.modalidad !== 'pdf' && totalPreguntas === 0) {
        return 'Añade al menos una pregunta para la modalidad online.';
    }

    return '';
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
        : '<i class="bi bi-check2-circle me-1"></i>Guardar formulario';
}

/**
 * Valida y guarda el formulario dinámico actual.
 */
async function guardarFormularioPortal() {
    const formulario = estadoPortal.formularioActual;
    if (!formulario || formulario.subiendoPdf || formulario.guardando) return;
    const mensajeValidacion = validarFormularioPortal(formulario);

    if (mensajeValidacion) {
        Swal.fire('Revisa el formulario', mensajeValidacion, 'warning');
        return;
    }

    mostrarGuardadoFormularioPortal(true);
    formulario.guardando = true;

    // Mientras se guarda, las dos vistas quedan bloqueadas para evitar perder cambios.
    const editor = document.getElementById('contenidoPanelConfigurador');
    const vista = document.getElementById('vistaPreviaFormulario');
    editor.inert = true;
    vista.inert = true;

    try {
        const resultado = await solicitarJson(
            `php/gestion/formularios_dinamicos/acciones_formularios.php?accion=guardar&cod_mun=${encodeURIComponent(estadoPortal.codMun)}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formulario)
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
            renderPanelFormularios();
        }
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
            cambiarModoVistaPrevia('portal');
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
        vista.inert = false;
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

/**
 * Genera un campo de texto enlazado al formulario que se está editando.
 */
function crearCampoTextoFormulario(etiqueta, ruta, valor, placeholder) {
    return `
        <div class="portal-config-field">
            <label>${escaparHtml(etiqueta)}</label>
            <input class="form-control" data-form-field="${ruta}" value="${escaparHtml(valor)}" placeholder="${escaparHtml(placeholder || '')}">
        </div>
    `;
}

/**
 * Genera un selector enlazado al formulario que se está editando.
 */
function crearCampoSeleccionFormulario(etiqueta, ruta, valor, opciones) {
    return `
        <div class="portal-config-field">
            <label>${escaparHtml(etiqueta)}</label>
            <select class="form-select" data-form-field="${ruta}">
                ${opciones.map(function (opcion) {
                    return `<option value="${opcion[0]}" ${opcion[0] === valor ? 'selected' : ''}>${escaparHtml(opcion[1])}</option>`;
                }).join('')}
            </select>
        </div>
    `;
}

/**
 * Genera el selector de color identificativo de un formulario.
 */
function crearCampoColorFormulario(etiqueta, ruta, valor) {
    return crearSelectorColorPortal(etiqueta, 'data-form-field', ruta, valor);
}

/**
 * Normaliza los booleanos de un formulario devuelto por PostgreSQL.
 * También garantiza que secciones, preguntas y opciones sean arrays.
 */
function normalizarFormularioPortal(formulario) {
    const resultado = JSON.parse(JSON.stringify(formulario || crearFormularioVacioPortal()));

    resultado.activo = convertirBooleano(resultado.activo, true);
    resultado.secciones = Array.isArray(resultado.secciones) ? resultado.secciones : [];

    resultado.secciones.forEach(function (seccion) {
        seccion.preguntas = Array.isArray(seccion.preguntas) ? seccion.preguntas : [];

        seccion.preguntas.forEach(function (pregunta) {
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

/****************************************************************************
 * VISTA PREVIA DE FORMULARIOS PGOM
 *
 * Permite editar, rellenar y validar el borrador que comparte con el panel lateral.
 * La prueba se ejecuta localmente y no llama al PHP de envío.
 ****************************************************************************/

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-preview-mode]').forEach(function (boton) {
        boton.addEventListener('click', function () {
            cambiarModoVistaPrevia(boton.dataset.previewMode);
        });
    });
    const vista = document.getElementById('vistaPreviaFormulario');
    vista.addEventListener('click', gestionarClickEdicionVistaFormulario);
    vista.addEventListener('input', sincronizarEdicionVistaFormulario);
    vista.addEventListener('keydown', gestionarTeclaEdicionVistaFormulario);
});

/**
 * Alterna entre la página pública y el formulario que se está diseñando.
 */
function cambiarModoVistaPrevia(modo) {
    const iframe = document.getElementById('iframeVistaPreviaPortal');
    const formulario = document.getElementById('vistaPreviaFormulario');
    const esFormulario = modo === 'formulario';

    document.querySelectorAll('[data-preview-mode]').forEach(function (boton) {
        boton.classList.toggle('is-active', boton.dataset.previewMode === modo);
    });

    iframe?.classList.toggle('d-none', esFormulario);
    formulario?.classList.toggle('d-none', !esFormulario);

    if (esFormulario) {
        renderizarVistaPreviaFormulario();
    }
    const lienzo = document.getElementById('lienzoVistaPreviaPortal');

    lienzo?.classList.toggle('d-none', esFormulario);

    if (!esFormulario) {
        window.requestAnimationFrame(ajustarLienzoVistaPrevia);
    }

}

/**
 * Dibuja el formulario actual con el mismo orden de apartados y preguntas.
 */
function renderizarVistaPreviaFormulario() {
    const contenedor = document.getElementById('vistaPreviaFormulario');

    if (!contenedor) {
        return;
    }

    const formulario = estadoPortal.formularioActual;

    if (!formulario) {
        contenedor.innerHTML = `
            <div class="portal-form-preview-empty">
                <i class="bi bi-ui-checks-grid"></i>
                <strong>Selecciona o crea un formulario</strong>
                <p>La vista previa aparecerá aquí mientras lo diseñas.</p>
            </div>`;
        return;
    }

    const color = formulario.color || '#003b17';
    const ofreceOnline = formulario.modalidad !== 'pdf';
    const ofrecePdf = formulario.modalidad === 'pdf' || formulario.modalidad === 'ambos';
    const secciones = ofreceOnline
        ? (formulario.secciones || []).map(crearSeccionVistaFormulario).join('')
        : '';

    contenedor.innerHTML = `
        <div class="portal-form-preview-page" style="--form-preview-color:${escaparHtml(color)}">
            <header class="portal-form-preview-header">
                <div class="encuesta-marca__municipio">
                    <img class="encuesta-marca__escudo" src="${escaparHtml(obtenerRutaProyecto(estadoPortal.municipio.escudo || estadoPortal.municipio.escudo_automatico))}" alt="">
                    <strong>PGOM - ${escaparHtml(estadoPortal.municipio.nombre || '')}</strong>
                </div>
                <img class="encuesta-marca__diputacion" src="images/logo_diputacion_azul.png" alt="Diputación Provincial de Málaga">
            </header>

            <main class="portal-form-preview-content">
                <section class="portal-form-preview-intro">
                    ${formulario.icono ? `<span class="portal-form-preview-icon">
                        <i class="bi bi-${escaparHtml(formulario.icono)}"></i>
                    </span>` : ''}
                    <div>
                        <span class="portal-form-preview-label">Participación ciudadana</span>
                        <h1>${crearTextoEditableVistaFormulario('titulo', formulario.titulo, 'Título del formulario', 'Editar título del formulario')}</h1>
                        <p>${crearTextoEditableVistaFormulario('descripcion', formulario.descripcion, 'Añadir descripción', 'Editar descripción del formulario')}</p>
                    </div>
                </section>

                ${ofrecePdf ? crearAvisoPdfFormulario(formulario) : ''}

                ${ofreceOnline ? `
                    <form class="portal-form-preview-form" novalidate>
                        <p class="portal-form-preview-test">Pulsa un título, una pregunta o una ayuda para editarla. También puedes rellenar el formulario y probar el envío sin registrar respuestas.</p>
                        ${secciones || crearMensajeSinPreguntas()}
                        <div class="portal-form-preview-actions">
                            <button type="submit" ${formulario.secciones?.some(seccion => seccion.preguntas?.length) ? '' : 'disabled'}>
                                Probar envío
                                <i class="bi bi-send"></i>
                            </button>
                        </div>
                        <p class="portal-form-preview-result" role="status"></p>
                    </form>` : `
                    <div class="portal-form-preview-only-pdf">
                        <i class="bi bi-file-earmark-pdf"></i>
                        <h2>Formulario disponible en PDF</h2>
                        <p>La ciudadanía verá un acceso directo al documento imprimible.</p>
                        <button type="button" disabled>${escaparHtml(formulario.texto_boton_pdf || 'Descargar PDF')}</button>
                    </div>`}
            </main>
        </div>`;

    const prueba = contenedor.querySelector('.portal-form-preview-form');
    prueba?.addEventListener('submit', function (evento) {
        evento.preventDefault();
        const resultado = prueba.querySelector('.portal-form-preview-result');
        resultado.textContent = '';
        if (validarCamposEncuesta(prueba)) {
            resultado.textContent = 'Prueba completada. La respuesta de prueba no se ha guardado ni enviado.';
        }
    });
}

/**
 * Crea el aviso que acompaña a un formulario con versión imprimible.
 */
function crearAvisoPdfFormulario(formulario) {
    return `
        <div class="portal-form-preview-pdf">
            <span><i class="bi bi-file-earmark-pdf"></i></span>
            <div>
                <strong>También disponible para imprimir</strong>
                <small>${formulario.pdf_url ? escaparHtml(formulario.pdf_url) : 'El PDF todavía no se ha subido.'}</small>
            </div>
            <button type="button" disabled>${escaparHtml(formulario.texto_boton_pdf || 'Descargar PDF')}</button>
        </div>`;
}

/**
 * Crea un apartado del formulario.
 */
function crearSeccionVistaFormulario(seccion, indiceSeccion) {
    const preguntas = (seccion.preguntas || []).map(function (pregunta, indicePregunta) {
        return crearPreguntaVistaFormulario(pregunta, indiceSeccion, indicePregunta);
    }).join('');

    return `
        <fieldset class="portal-form-preview-section" style="--nivel-encuesta:${Number(seccion.nivel) || 0}">
            <legend>
                ${seccion.numero || !Number(seccion.nivel) ? `<span>${escaparHtml(seccion.numero || String(indiceSeccion + 1))}</span>` : ''}
                <div>
                    <strong>${crearTextoEditableVistaFormulario(`secciones.${indiceSeccion}.titulo`, seccion.titulo, `Apartado ${indiceSeccion + 1}`, 'Editar título del apartado')}</strong>
                    <small>${crearTextoEditableVistaFormulario(`secciones.${indiceSeccion}.descripcion`, seccion.descripcion, '', 'Editar descripción del apartado')}</small>
                </div>
            </legend>
            <div class="portal-form-preview-grid">
                ${preguntas || '<p class="portal-form-preview-section-empty">Añade preguntas para completar este apartado.</p>'}
            </div>
        </fieldset>`;
}

/**
 * Crea la etiqueta y el control que se pueden probar en el borrador.
 */
function crearPreguntaVistaFormulario(pregunta, indiceSeccion, indicePregunta) {
    const ancho = pregunta.ancho === 'medio' ? 'is-half' : 'is-full';
    const nombre = `preview_${indiceSeccion}_${indicePregunta}`;
    const ruta = `secciones.${indiceSeccion}.preguntas.${indicePregunta}`;
    const permiteEditarOpciones = ['opcion_unica', 'opcion_multiple', 'desplegable'].includes(pregunta.tipo);
    const obligatorio = pregunta.obligatorio ? '<em>*</em>' : '';
    let numeracion = pregunta.numero?.trim() || '';
    if (numeracion && !/[.)]$/.test(numeracion)) numeracion += '.';
    return `
        <div class="portal-form-preview-question ${ancho}" style="--nivel-encuesta:${Number(pregunta.nivel) || 0}">
            <span id="${nombre}_etiqueta">
                ${numeracion ? escaparHtml(numeracion) + ' ' : ''}
                ${crearTextoEditableVistaFormulario(ruta + '.enunciado', pregunta.enunciado, `Pregunta ${indicePregunta + 1}`, 'Editar pregunta')}
                ${obligatorio}
            </span>
            <small>${crearTextoEditableVistaFormulario(ruta + '.ayuda', pregunta.ayuda, '', 'Editar texto de ayuda')}</small>
            <div data-respuesta-vista="${ruta}">${crearControlVistaFormulario(pregunta, nombre)}</div>
            ${permiteEditarOpciones ? crearTextoEditableVistaFormulario(ruta + '.opciones', '', 'Editar opciones', 'Editar opciones') : ''}
            <small class="form-public-field__error" data-error-grupo aria-live="polite"></small>
        </div>`;
}

// La misma ruta identifica el texto de la vista y el campo que ya guarda el borrador.
function crearTextoEditableVistaFormulario(ruta, valor, textoVacio, etiqueta) {
    return `
        <span class="portal-form-edicion" data-texto-vista="${ruta}" ${!valor && !textoVacio ? 'hidden' : ''}>
            <button type="button" class="portal-form-edicion__boton" data-editar-vista
                title="${etiqueta}" aria-description="${etiqueta}">
                <span data-texto-vista-boton data-texto-vacio="${escaparHtml(textoVacio)}">${escaparHtml(valor || textoVacio)}</span>
                <i class="bi bi-pencil" aria-hidden="true"></i>
            </button>
        </span>`;
}

function gestionarClickEdicionVistaFormulario(evento) {
    const botonListo = evento.target.closest('[data-cerrar-editor-vista]');
    if (botonListo) {
        cerrarEdicionVistaFormulario(botonListo.closest('[data-editor-vista]'), true);
        return;
    }

    const editorAbierto = evento.currentTarget.querySelector('[data-editor-vista]');
    if (editorAbierto && !editorAbierto.contains(evento.target)) {
        cerrarEdicionVistaFormulario(editorAbierto);
    }

    const botonEditar = evento.target.closest('[data-editar-vista]');
    if (botonEditar) {
        abrirEdicionVistaFormulario(botonEditar.closest('[data-texto-vista]').dataset.textoVista);
    }
}

// Lleva el panel de propiedades al campo de origen sin quitar el foco a la vista.
function abrirEdicionVistaFormulario(ruta) {
    if (estadoPortal.panelActual !== 'formularios') {
        mostrarPanelConfigurador('formularios');
    }

    const campo = buscarCampoLateralFormulario(ruta);
    const grupo = document.querySelector(`[data-texto-vista="${ruta}"]`);
    if (!campo || !grupo) {
        return;
    }

    const panel = document.getElementById('contenidoPanelConfigurador');
    panel.querySelector('.portal-form-campo-vinculado')?.classList.remove('portal-form-campo-vinculado');
    const fila = campo.closest('.portal-config-field');
    fila.classList.add('portal-form-campo-vinculado');
    fila.scrollIntoView({ block: 'center', inline: 'nearest' });

    const boton = grupo.querySelector('[data-editar-vista]');
    const editor = document.createElement('span');
    editor.className = 'portal-form-edicion__editor';
    editor.dataset.editorVista = '';
    editor.dataset.valorInicial = campo.value;
    const esLista = campo.hasAttribute('data-form-options');
    const usaTextarea = campo.tagName === 'TEXTAREA';

    editor.innerHTML = `
        ${usaTextarea ? '<textarea rows="4" data-valor-vista></textarea>' : '<input type="text" data-valor-vista>'}
        <span class="portal-form-edicion__acciones">
            ${esLista ? '<span>Una opción por línea. Pulsa Intro para añadir otra.</span>' : ''}
            <button type="button" data-cerrar-editor-vista>Listo</button>
        </span>`;

    const control = editor.querySelector('[data-valor-vista]');
    control.setAttribute('aria-label', boton.title);
    if (campo.maxLength >= 0) {
        control.maxLength = campo.maxLength;
    }
    control.value = campo.value;
    boton.hidden = true;
    grupo.appendChild(editor);
    control.focus();
    if (esLista) {
        control.setSelectionRange(control.value.length, control.value.length);
    }
}

// Usamos el mismo evento que al escribir en el lateral. Así se reutiliza el formato
// de opciones, la actualización del borrador y su guardado habitual.
function sincronizarEdicionVistaFormulario(evento) {
    const control = evento.target.closest('[data-valor-vista]');
    if (!control) {
        return;
    }
    const ruta = control.closest('[data-texto-vista]').dataset.textoVista;
    const campo = buscarCampoLateralFormulario(ruta);
    if (campo) {
        campo.value = control.value;
        if (campo.value !== control.value) {
            control.value = campo.value;
        }
        campo.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function gestionarTeclaEdicionVistaFormulario(evento) {
    const control = evento.target.closest('[data-valor-vista]');
    if (!control || evento.isComposing) {
        return;
    }

    const editor = control.closest('[data-editor-vista]');
    if (evento.key === 'Escape') {
        evento.preventDefault();
        control.value = editor.dataset.valorInicial;
        sincronizarEdicionVistaFormulario(evento);
        cerrarEdicionVistaFormulario(editor, true);
    } else if (evento.key === 'Enter' && (control.tagName !== 'TEXTAREA' || evento.ctrlKey || evento.metaKey)) {
        evento.preventDefault();
        cerrarEdicionVistaFormulario(editor, true);
    }
}

function cerrarEdicionVistaFormulario(editor, devolverFoco = false) {
    const grupo = editor.closest('[data-texto-vista]');
    if (!grupo) {
        return;
    }

    const boton = grupo.querySelector('[data-editar-vista]');
    const texto = boton.querySelector('[data-texto-vista-boton]');
    editor.remove();
    boton.hidden = false;
    grupo.hidden = texto.textContent === '';
    if (devolverFoco && !grupo.hidden) {
        boton.focus({ preventScroll: true });
    }
}

function buscarCampoLateralFormulario(ruta) {
    return document.querySelector(
        `#contenidoPanelConfigurador [data-form-field="${ruta}"], #contenidoPanelConfigurador [data-form-options="${ruta}"]`
    );
}

// Al escribir, actualizamos solo el texto o las respuestas de esa pregunta.
function actualizarCampoVistaFormulario(ruta, valor) {
    const grupo = document.querySelector(`[data-texto-vista="${ruta}"]`);
    if (!grupo) {
        renderizarVistaPreviaFormulario();
        return;
    }

    const control = grupo.querySelector('[data-valor-vista]');
    if (control && control.value !== valor) {
        control.value = valor;
    }

    if (ruta.endsWith('.opciones')) {
        const rutaPregunta = ruta.slice(0, -'.opciones'.length);
        const pregunta = obtenerValorRuta(estadoPortal.formularioActual, rutaPregunta);
        const controles = document.querySelector(`[data-respuesta-vista="${rutaPregunta}"]`);
        const [, indiceSeccion, , indicePregunta] = rutaPregunta.split('.');
        controles.innerHTML = crearControlVistaFormulario(pregunta, `preview_${indiceSeccion}_${indicePregunta}`);
        controles.parentElement.querySelector('[data-error-grupo]').textContent = '';
        return;
    }

    const texto = grupo.querySelector('[data-texto-vista-boton]');
    texto.textContent = valor || texto.dataset.textoVacio;
    grupo.hidden = !texto.textContent && !control;
}

/**
 * Devuelve el control visual correspondiente al tipo de pregunta.
 */
function crearControlVistaFormulario(pregunta, nombre) {
    const requerido = pregunta.obligatorio ? 'required' : '';
    const atributo = `name="${nombre}" aria-labelledby="${nombre}_etiqueta" ${requerido}`;

    if (pregunta.tipo === 'texto_largo') {
        return `<textarea rows="4" ${atributo} placeholder="Escribe tu respuesta"></textarea>`;
    }

    if (pregunta.tipo === 'numero') {
        return `<input type="number" step="any" ${atributo}>`;
    }

    if (pregunta.tipo === 'fecha') {
        return `<input type="date" ${atributo}>`;
    }

    const opciones = pregunta.tipo === 'si_no' ? ['Sí', 'No'] : (pregunta.opciones || []);
    if (pregunta.tipo === 'desplegable') {
        return `
            <select ${atributo}>
                <option value="">Selecciona una opción</option>
                ${opciones.map(opcion => `<option>${escaparHtml(opcion)}</option>`).join('')}
            </select>`;
    }

    if (['si_no', 'opcion_unica', 'opcion_multiple'].includes(pregunta.tipo)) {
        const multiple = pregunta.tipo === 'opcion_multiple';
        const tipo = multiple ? 'checkbox' : 'radio';
        return `
            <div class="portal-form-preview-options is-stacked" role="group" aria-labelledby="${nombre}_etiqueta"
                ${multiple && requerido ? 'data-required-group="true"' : ''}>
                ${opciones.map((opcion, indice) => `<label>
                    <input type="${tipo}" name="${nombre}" value="${escaparHtml(opcion)}"
                        ${!multiple && indice === 0 ? requerido : ''}> ${escaparHtml(opcion)}
                </label>`).join('') || '<span>Añade al menos dos opciones.</span>'}
            </div>`;
    }

    return `<input type="text" ${atributo} placeholder="Escribe tu respuesta">`;
}

function crearMensajeSinPreguntas() {
    return `
        <div class="portal-form-preview-empty is-inline">
            <i class="bi bi-plus-circle"></i>
            <strong>El formulario todavía no tiene preguntas</strong>
            <p>Añade un apartado y sus preguntas desde el panel de edición.</p>
        </div>`;
}

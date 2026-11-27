/**
 * Diseñador visual de encuestas.
 * Dibuja la edición y su vista en directo a partir del mismo borrador.
 * La vista en directo y «Probar formulario» comparten la presentación.
 * ConfiguradorFormularios guarda los campos de edición y
 * configuradorOrdenFormulario resuelve la colocación de los bloques.
 */

let probandoFormulario = false;
// Este dato es de la pantalla, igual que el modo de prueba. No se guarda en PHP.
let formularioDesdeCero = false;
let repintadoVistaEnDirecto = null;

// Cada fila contiene el valor de PHP, la etiqueta visible y un icono Bootstrap.
const tiposRespuestaFormulario = [
    ['texto', 'Texto corto', 'input-cursor-text'],
    ['texto_largo', 'Texto largo', 'text-paragraph'],
    ['opcion_unica', 'Una opción', 'record-circle'],
    ['opcion_multiple', 'Varias opciones', 'ui-checks'],
    ['desplegable', 'Lista desplegable', 'menu-button-wide'],
    ['si_no', 'Sí / No', 'toggle-on'],
    ['numero', 'Número', 'hash'],
    ['fecha', 'Fecha', 'calendar3']
];

function tipoRespuestaConOpciones(tipo) {
    return ['opcion_unica', 'opcion_multiple', 'desplegable'].includes(tipo);
}

/** Dibuja la página completa al entrar o cambiar el formato o el modo de prueba. */
function renderEditorFormulario(ajustesAbiertos = false) {
    const formulario = estadoPortal.formularioActual;
    const online = formulario.modalidad !== 'pdf';
    const panel = document.getElementById('contenidoPanelConfigurador');
    establecerCabeceraPanel(formulario.id ? 'Editar formulario' : 'Nuevo formulario', formulario.titulo);

    panel.innerHTML = `
        <section class="portal-diseno-encuesta" aria-label="Diseñador de formularios">
            <div class="portal-diseno-encuesta__barra">
                <div class="portal-diseno-encuesta__fila">
                    <button type="button" class="btn btn-outline-secondary btn-sm" data-action="cancel-form" aria-label="Volver al listado"
                        ${formulario.subiendoPdf ? 'disabled' : ''}>
                        <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>Volver<span class="d-none d-sm-inline"> al listado</span>
                    </button>
                    <div class="portal-diseno-encuesta__acciones">
                        ${!probandoFormulario ? `
                            <button type="button" class="btn btn-outline-secondary btn-sm" data-action="undo-form-delete" aria-label="Deshacer borrado"
                                ${borradosFormulario.length ? '' : 'hidden'}>
                                <i class="bi bi-arrow-counterclockwise me-1" aria-hidden="true"></i>Deshacer<span class="d-none d-sm-inline"> borrado</span>
                            </button>
                            <button type="button" class="btn btn-outline-secondary btn-sm portal-diseno-encuesta__salto-vista"
                                    data-action="show-form-live-preview">
                                <i class="bi bi-layout-sidebar-inset-reverse me-1" aria-hidden="true"></i>Vista en directo
                            </button>
                            <button type="button" class="btn btn-outline-secondary btn-sm" data-action="form-settings"
                                aria-controls="ajustesEditorFormulario" aria-expanded="${ajustesAbiertos}">
                                <i class="bi bi-gear me-1" aria-hidden="true"></i>Ajustes
                            </button>` : ''}
                        ${online ? `
                            <button type="button" class="btn btn-outline-primary btn-sm" data-action="toggle-form-test"
                                    aria-label="${probandoFormulario ? 'Volver a editar' : 'Probar formulario'}">
                                <i class="bi bi-${probandoFormulario ? 'pencil-square' : 'eye'} me-1" aria-hidden="true"></i>
                                ${probandoFormulario ? 'Volver a editar' : 'Probar<span class="d-none d-sm-inline"> formulario</span>'}
                            </button>` : ''}
                        <button type="button" class="btn btn-success btn-sm" data-action="save-form" aria-label="Guardar formulario">
                            <i class="bi bi-check2-circle me-1" aria-hidden="true"></i>Guardar<span class="d-none d-sm-inline"> formulario</span>
                        </button>
                    </div>
                </div>
                ${online && !probandoFormulario ? crearBarraApartadosFormulario() : ''}
                <span id="avisoEditorFormulario" class="visually-hidden" role="status"></span>
            </div>

            ${!probandoFormulario ? `
                <div id="ajustesEditorFormulario" class="portal-diseno-encuesta__ajustes" ${ajustesAbiertos ? '' : 'hidden'}>
                    ${crearDatosFormulario(formulario)}
                </div>` : ''}

            <div class="portal-diseno-encuesta__espacio">
                ${online && !probandoFormulario ? crearPaletaFormulario() : ''}
                <div id="lienzoEditorFormulario" class="portal-diseno-encuesta__lienzo"></div>
                ${probandoFormulario ? '' : crearPanelVistaEnDirectoFormulario()}
            </div>
        </section>`;

    renderizarLienzoFormulario();
    if (formulario.subiendoPdf) cambiarEstadoSubidaFormulario(true);
}

/** El índice aparece al tener varios apartados y permite saltar a cualquiera. */
function crearBarraApartadosFormulario() {
    return `<div class="portal-diseno-encuesta__fila portal-diseno-encuesta__estructura" id="navegacionApartadosFormulario" hidden>
        <div class="portal-diseno-encuesta__indice">
            <label for="irApartadoFormulario">Ir a un apartado</label>
            <select id="irApartadoFormulario" class="form-select form-select-sm" data-ir-apartado></select>
        </div>
        <button type="button" class="btn btn-outline-secondary btn-sm portal-diseno-encuesta__plegar-todos"
                data-action="toggle-all-form-sections">Plegar todos</button>
    </div>`;
}

/**
 * La paleta está visible durante la edición. Los tipos más usados aparecen
 * directamente. «Más tipos» abre los demás sin ocupar espacio desde el inicio.
 */
function crearPaletaFormulario() {
    const tiposHabituales = ['texto', 'opcion_unica', 'opcion_multiple', 'si_no'];
    const habituales = [];
    const adicionales = [];

    for (const [tipo, etiqueta, icono] of tiposRespuestaFormulario) {
        const boton = crearElementoPaletaFormulario(tipo, etiqueta, icono);
        if (tiposHabituales.includes(tipo)) habituales.push(boton);
        else adicionales.push(boton);
    }

    return `<aside class="portal-paleta-encuesta" aria-label="Elementos del formulario">
        <h2>Elementos</h2>
        <p>Arrastra al formulario o pulsa para añadir.</p>
        ${crearElementoPaletaFormulario('apartado', 'Apartado', 'layout-text-window')}
        <div class="portal-paleta-encuesta__preguntas">
            <div class="portal-paleta-encuesta__destino" id="destinoPaletaFormulario"></div>
            <div class="portal-paleta-encuesta__tipos">${habituales.join('')}</div>
            <details class="portal-paleta-encuesta__mas" id="masTiposFormulario">
                <summary>Más tipos de pregunta</summary>
                <div class="portal-paleta-encuesta__tipos">${adicionales.join('')}</div>
            </details>
        </div>
    </aside>`;
}

function crearElementoPaletaFormulario(tipo, etiqueta, icono) {
    return `<button type="button" class="portal-paleta-encuesta__elemento ${tipo === 'apartado' ? 'es-apartado' : ''}"
            draggable="true" data-arrastrar-tipo="${tipo}" data-action="add-form-palette">
        <i class="bi bi-${icono}" aria-hidden="true"></i><span>${etiqueta}</span>
        <i class="bi bi-grip-vertical" aria-hidden="true"></i>
    </button>`;
}

/** Dibuja el formulario y conecta el envío de prueba con el validador público. */
function renderizarLienzoFormulario() {
    const lienzo = document.getElementById('lienzoEditorFormulario');
    if (!lienzo) return;

    const formulario = estadoPortal.formularioActual;
    const online = formulario.modalidad !== 'pdf';
    const color = esColorPortal(formulario.color) ? formulario.color : estadoPortal.configuracion.color_primario;

    // En un formulario nuevo reutilizamos la cabecera de la prueba.
    const mostrarCabecera = probandoFormulario || formularioDesdeCero;
    const presentacion = mostrarCabecera
        ? crearPresentacionFormulario(formulario, !probandoFormulario)
        : crearTituloEditorFormulario(formulario);

    lienzo.classList.toggle('en-prueba', probandoFormulario);
    lienzo.innerHTML = `
        <div class="portal-form-preview-page" style="--form-preview-color:${escaparHtml(color)}">
            ${mostrarCabecera ? crearCabeceraFormulario() : ''}
            <div class="portal-form-preview-content">
                ${presentacion}
                ${formulario.modalidad !== 'online' ? crearAvisoPdfFormulario(formulario, !probandoFormulario) : ''}
                ${online ? (probandoFormulario ? crearFormularioVistaPublica(formulario, true) : crearApartadosLienzo(formulario)) : ''}
            </div>
        </div>`;

    const selector = document.getElementById('irApartadoFormulario');
    if (selector) {
        selector.innerHTML = crearOpcionesApartadosFormulario();
        document.getElementById('navegacionApartadosFormulario').hidden = formulario.secciones.length < 2;
        actualizarPlegadoApartadosFormulario();
        for (const tarjeta of lienzo.querySelectorAll('[data-apartado-lienzo]')) {
            actualizarPlegadoPreguntasFormulario(tarjeta);
        }
    }
    actualizarDestinoPaletaFormulario();
    renderizarVistaEnDirectoFormulario();

    const prueba = lienzo.querySelector('[data-prueba-formulario]');
    if (prueba) {
        prueba.addEventListener('submit', function (evento) {
            evento.preventDefault();
            const resultado = prueba.querySelector('[role="status"]');
            resultado.textContent = '';
            if (validarCamposEncuesta(prueba)) {
                resultado.textContent = 'Prueba completada. No se ha registrado ninguna respuesta.';
            }
        });
    }
}

function crearPanelVistaEnDirectoFormulario() {
    return `<section class="portal-diseno-encuesta__vista" aria-labelledby="tituloVistaEnDirectoFormulario">
        <div class="portal-diseno-encuesta__vista-barra">
            <h2 id="tituloVistaEnDirectoFormulario" tabindex="-1">Vista en directo</h2>
            <button type="button" class="btn btn-link btn-sm portal-diseno-encuesta__salto-vista"
                    data-action="back-from-form-live-preview">Volver al editor</button>
        </div>
        <div class="portal-diseno-encuesta__vista-papel" id="vistaEnDirectoFormulario"
             tabindex="0" role="region" aria-label="Contenido de la vista en directo"></div>
    </section>`;
}

/** Agrupa las pulsaciones. Se repinta la vista y el campo en edición conserva el cursor. */
function programarVistaEnDirectoFormulario() {
    if (repintadoVistaEnDirecto !== null) return;
    repintadoVistaEnDirecto = window.requestAnimationFrame(function () {
        repintadoVistaEnDirecto = null;
        renderizarVistaEnDirectoFormulario();
        seguirCampoVistaEnDirectoFormulario(document.activeElement);
    });
}

function renderizarVistaEnDirectoFormulario() {
    const vista = document.getElementById('vistaEnDirectoFormulario');
    if (!vista) return;

    const formulario = estadoPortal.formularioActual;
    const color = esColorPortal(formulario.color) ? formulario.color : estadoPortal.configuracion.color_primario;
    const posicion = vista.scrollTop;
    vista.innerHTML = `
        <div class="portal-form-preview-page" style="--form-preview-color:${escaparHtml(color)}">
            ${crearCabeceraFormulario()}
            <div class="portal-form-preview-content">
                ${crearPresentacionFormulario(formulario, false)}
                ${formulario.modalidad !== 'online' ? crearAvisoPdfFormulario(formulario, false) : ''}
                ${formulario.modalidad !== 'pdf' ? crearFormularioVistaPublica(formulario, false) : ''}
            </div>
        </div>`;
    vista.scrollTop = posicion;
}

/**
 * Al enfocar una pregunta, se acerca su resultado en el panel lateral.
 * En pantalla estrecha se evita desplazar la página mientras se edita.
 */
function seguirCampoVistaEnDirectoFormulario(campo) {
    const vista = document.getElementById('vistaEnDirectoFormulario');
    if (!vista || vista.scrollHeight <= vista.clientHeight || !campo) return;

    if (campo.matches('[data-form-field="titulo"], [data-form-field="descripcion"]')) {
        vista.scrollTop = 0;
        return;
    }

    const apartado = campo.closest('[data-apartado-lienzo]');
    if (!apartado) return;

    const pregunta = campo.closest('[data-pregunta-lienzo]');
    const indice = apartado.dataset.apartadoLienzo;
    const selector = pregunta
        ? `[data-vista-pregunta="${indice}.${pregunta.dataset.preguntaLienzo}"]`
        : `[data-vista-apartado="${indice}"]`;
    const bloque = vista.querySelector(selector);
    if (!bloque) return;

    const marco = vista.getBoundingClientRect();
    const resultado = bloque.getBoundingClientRect();
    if (resultado.top < marco.top + 10 || resultado.top + Math.min(resultado.height, 100) > marco.bottom - 10) {
        vista.scrollTop += resultado.top - marco.top - 12;
    }
}

/** Los campos opcionales ocupan espacio en el encabezado cuando se usan. */
function crearTituloEditorFormulario(formulario) {
    return `<section class="portal-form-preview-intro sin-icono portal-diseno-encuesta__titulo">
        <label for="papel-form-titulo">Título del formulario</label>
        ${crearTextoEnPapelFormulario('titulo', formulario.titulo, 'Título del formulario', 'Escribe el título', false, 180)}
        <details class="portal-diseno-encuesta__descripcion" ${formulario.descripcion ? 'open' : ''}>
            <summary>${formulario.descripcion ? 'Descripción' : 'Añadir descripción'}</summary>
            ${crearTextoEnPapelFormulario('descripcion', formulario.descripcion, 'Descripción del formulario', 'Escribe la descripción', true)}
        </details>
    </section>`;
}

function crearCabeceraFormulario() {
    return `
            <header class="portal-form-preview-header">
                <div class="encuesta-marca__municipio">
                    <img class="encuesta-marca__escudo" src="${escaparHtml(obtenerRutaProyecto(estadoPortal.municipio.escudo || estadoPortal.municipio.escudo_automatico))}" alt="">
                    <strong>PGOM - ${escaparHtml(estadoPortal.municipio.nombre || '')}</strong>
                </div>
                <img class="encuesta-marca__diputacion" src="images/logo_diputacion_azul.png" alt="Diputación Provincial de Málaga">
            </header>`;
}

/** La misma tarjeta muestra campos en edición y texto en la prueba pública. */
function crearPresentacionFormulario(formulario, editable) {
    const titulo = editable
        ? crearTextoEnPapelFormulario('titulo', formulario.titulo, 'Título del formulario', 'Título del formulario', false, 180)
        : escaparHtml(formulario.titulo || 'Formulario sin título');
    let descripcion = '';
    if (editable) {
        descripcion = crearTextoEnPapelFormulario(
            'descripcion', formulario.descripcion, 'Descripción del formulario', 'Añade una descripción (opcional)', true
        );
    } else if (formulario.descripcion) {
        descripcion = escaparHtml(formulario.descripcion);
    }

    return `<section class="portal-form-preview-intro ${formulario.icono ? '' : 'sin-icono'} ${editable ? 'portal-diseno-encuesta__inicio' : ''}">
        ${formulario.icono ? `<span class="portal-form-preview-icon"><i class="bi bi-${escaparHtml(formulario.icono)}" aria-hidden="true"></i></span>` : ''}
        <div>
            <span class="portal-form-preview-label">Participación ciudadana</span>
            <h1>${titulo}</h1>
            ${descripcion ? `<div class="portal-diseno-encuesta__descripcion">${descripcion}</div>` : ''}
        </div>
    </section>`;
}

function crearAvisoPdfFormulario(formulario, editable) {
    const nombre = formulario.pdf_url?.split('/').pop() || 'El PDF todavía no se ha subido.';
    return `
        <div class="portal-form-preview-pdf">
            <span><i class="bi bi-file-earmark-pdf" aria-hidden="true"></i></span>
            <div>
                <strong>${formulario.modalidad === 'pdf' ? 'Formulario en PDF' : 'Disponible también en PDF'}</strong>
                <small>${escaparHtml(nombre)}</small>
            </div>
            ${editable
                ? '<button type="button" class="btn btn-outline-primary btn-sm" data-action="form-settings">Ajustar PDF</button>'
                : `<button type="button" disabled>${escaparHtml(formulario.texto_boton_pdf || 'Descargar PDF')}</button>`}
        </div>`;
}

/* -------- Apartados y preguntas: presentación y acciones en el propio papel -------- */

function crearApartadosLienzo(formulario) {
    const apartados = formulario.secciones.map(function (apartado, indice) {
        return crearZonaSoltarFormulario(destinoAntesFormulario(-1, indice)) + crearApartadoLienzo(apartado, indice);
    }).join('');

    const final = destinoAntesFormulario(-1, formulario.secciones.length);
    const anadir = `
        <button type="button" class="btn btn-outline-primary btn-sm" data-action="add-form-section">
            <i class="bi bi-plus-lg me-1" aria-hidden="true"></i>Añadir apartado
        </button>`;

    // En un papel vacío la guía marca el primer destino y el botón queda debajo.
    const cierre = apartados
        ? crearZonaSoltarFormulario(final, 'final', anadir)
        : crearZonaSoltarFormulario(final, 'inicio', 'Arrastra un apartado aquí o pulsa «Añadir apartado».') + anadir;
    return `<div class="portal-diseno-encuesta__apartados">${apartados}${cierre}</div>`;
}

function crearApartadoLienzo(apartado, indiceApartado) {
    const ruta = 'secciones.' + indiceApartado;
    const idPreguntas = 'preguntas-apartado-' + indiceApartado;
    const nivel = nivelBloqueFormulario(apartado);
    const preguntas = apartado.preguntas.map(function (pregunta, indice) {
        return crearZonaSoltarFormulario(destinoAntesFormulario(indiceApartado, indice))
            + crearPreguntaLienzo(pregunta, indiceApartado, indice);
    }).join('');

    // El recuadro y su botón comparten el destino al final del apartado.
    const final = destinoAntesFormulario(indiceApartado, apartado.preguntas.length);
    const accion = `
        ${preguntas ? '' : '<span>Arrastra aquí la primera pregunta</span>'}
        <button type="button" class="btn btn-outline-primary btn-sm" data-action="add-form-question-here"
                data-bloque-apartado="${indiceApartado}">
            <i class="bi bi-plus-lg me-1" aria-hidden="true"></i>Añadir pregunta
        </button>`;

    return `
        <section class="portal-form-preview-section portal-diseno-encuesta__apartado" data-apartado-lienzo="${indiceApartado}" style="--nivel-encuesta:${nivel}">
            <div class="portal-diseno-encuesta__encabezado portal-diseno-encuesta__encabezado--apartado">
                ${crearAsaFormulario(-1, indiceApartado, nivel)}
                <div class="portal-diseno-encuesta__texto">
                    <span class="portal-diseno-encuesta__tipo">${nombreBloqueFormulario(-1, nivel)}
                        <span data-muestra-numero ${apartado.numero ? '' : 'hidden'}>${escaparHtml(apartado.numero || '')}</span>
                        <span data-resumen-apartado></span>
                    </span>
                    <h2>${crearTextoEnPapelFormulario(ruta + '.titulo', apartado.titulo, 'Título del apartado', 'Título del apartado', false, 180)}</h2>
                </div>
                <button type="button" class="portal-diseno-encuesta__plegar" data-action="toggle-form-section"
                        aria-controls="${idPreguntas}" aria-expanded="true" aria-label="Plegar apartado" title="Plegar apartado">
                    <i class="bi bi-chevron-up" aria-hidden="true"></i><span>Plegar</span>
                </button>
                ${crearMenuBloqueFormulario(-1, indiceApartado, apartado)}
            </div>

            <span class="portal-diseno-encuesta__destino-plegado" aria-hidden="true">Soltar al final del apartado</span>
            <div class="portal-diseno-encuesta__preguntas" data-contenido-apartado id="${idPreguntas}">
                ${preguntas}
                ${crearZonaSoltarFormulario(final, 'final', accion)}
            </div>
            ${nivel < 2 ? crearZonaSoltarFormulario(destinoHijoFormulario(-1, indiceApartado), 'hijo', 'Soltar como subapartado') : ''}
        </section>`;
}

function crearPreguntaLienzo(pregunta, apartado, indice) {
    const ruta = `secciones.${apartado}.preguntas.${indice}`;
    const id = `editor-pregunta-${apartado}-${indice}`;
    const nivel = nivelBloqueFormulario(pregunta);
    // La fila plegada conserva el enunciado, el asa y el menú. El botón
    // controla los dos grupos de edición: enunciado y ajustes de respuesta.
    return `
        <article class="portal-diseno-encuesta__pregunta" data-pregunta-lienzo="${indice}" style="--nivel-encuesta:${nivel}">
            <div class="portal-diseno-encuesta__encabezado">
                ${crearAsaFormulario(apartado, indice, nivel)}
                <div class="portal-diseno-encuesta__texto">
                    <span class="portal-diseno-encuesta__tipo">
                        ${nivel ? 'Subpregunta' : 'Pregunta'}
                        <span data-muestra-numero ${pregunta.numero ? '' : 'hidden'}>${escaparHtml(pregunta.numero || '')}</span>
                    </span>
                    <h3 class="portal-diseno-encuesta__resumen-pregunta" data-resumen-pregunta>${escaparHtml(pregunta.enunciado.trim() || 'Pregunta sin enunciado')}</h3>
                    <div class="portal-diseno-encuesta__enunciado" id="${id}-enunciado">
                        <h3>${crearTextoEnPapelFormulario(ruta + '.enunciado', pregunta.enunciado, 'Enunciado', 'Escribe la pregunta', true)}</h3>
                        <small class="portal-diseno-encuesta__ayuda" data-muestra-ayuda ${pregunta.ayuda ? '' : 'hidden'}>${escaparHtml(pregunta.ayuda || '')}</small>
                    </div>
                </div>
                <button type="button" class="portal-diseno-encuesta__plegar" data-action="toggle-form-question"
                        aria-controls="${id}-enunciado ${id}-respuesta">
                    <i class="bi bi-chevron-up" aria-hidden="true"></i>
                </button>
                ${crearMenuBloqueFormulario(apartado, indice, pregunta)}
            </div>
            <div class="portal-diseno-encuesta__respuesta" id="${id}-respuesta">
                ${crearCampoSeleccionFormulario('Tipo de respuesta', ruta + '.tipo', pregunta.tipo, tiposRespuestaFormulario)}
                <label class="form-check mb-0">
                    <input class="form-check-input" type="checkbox" data-form-field="${ruta}.obligatorio" ${pregunta.obligatorio ? 'checked' : ''}>
                    Obligatoria
                </label>
                ${tipoRespuestaConOpciones(pregunta.tipo) ? crearTextareaFormulario(
                    'Opciones (una por línea)', ruta + '.opciones', pregunta.opciones.join('\n'), 3, 'data-form-options'
                ) : ''}
            </div>
            ${nivel < 2 ? crearZonaSoltarFormulario(destinoHijoFormulario(apartado, indice), 'hijo', 'Soltar como subpregunta') : ''}
        </article>`;
}

/** El asa arrastra el bloque y, al pulsarla, abre sus acciones de teclado. */
function crearAsaFormulario(apartado, indice, nivel) {
    const nombre = nombreBloqueFormulario(apartado, nivel).toLowerCase();
    const marca = apartado === -1 ? 'data-asa-apartado' : `data-asa-pregunta="${indice}"`;
    return `<button type="button" class="portal-diseno-encuesta__asa" data-action="form-block-menu"
            draggable="true" ${marca} data-arrastrar-apartado="${apartado}" data-arrastrar-indice="${indice}"
            aria-label="Mover ${nombre}" title="Arrastra o pulsa para mover">
        <i class="bi bi-grip-vertical" aria-hidden="true"></i>
    </button>`;
}

function crearMenuBloqueFormulario(apartado, indice, bloque) {
    const esApartado = apartado === -1;
    const nivel = nivelBloqueFormulario(bloque);
    const nombre = nombreBloqueFormulario(apartado, nivel).toLowerCase();
    const ruta = esApartado ? `secciones.${indice}` : `secciones.${apartado}.preguntas.${indice}`;
    const lista = listaBloquesFormulario(apartado);
    const datos = `data-bloque-apartado="${apartado}" data-bloque-indice="${indice}"`;
    const puedeSubir = vecinoBloqueFormulario(lista, indice, -1) !== -1;
    const puedeBajar = vecinoBloqueFormulario(lista, indice, 1) !== -1;
    const otrosApartados = !esApartado && estadoPortal.formularioActual.secciones.length > 1;
    const padre = padreBloqueFormulario(lista, indice);
    const anterior = vecinoBloqueFormulario(lista, indice, -1);
    const puedeAnidar = anterior >= 0 && puedeColocarBloqueFormulario({ apartado, indice }, destinoHijoFormulario(apartado, anterior));

    return `<details class="portal-diseno-encuesta__menu" name="accionesBloquesFormulario" data-menu-bloque>
        <summary aria-label="Más opciones de ${nombre}">Más <i class="bi bi-chevron-down" aria-hidden="true"></i></summary>
        <div class="portal-diseno-encuesta__menu-contenido">
            <div class="portal-diseno-encuesta__acciones-bloque">
                <button type="button" class="btn btn-outline-secondary btn-sm" data-action="move-form-block" data-direccion="-1"
                    ${datos} ${puedeSubir ? '' : 'disabled'}>↑ Subir</button>
                <button type="button" class="btn btn-outline-secondary btn-sm" data-action="move-form-block" data-direccion="1"
                    ${datos} ${puedeBajar ? '' : 'disabled'}>↓ Bajar</button>
                ${puedeAnidar ? `<button type="button" class="btn btn-outline-secondary btn-sm" data-action="nest-form-block" ${datos}>
                    Anidar en el bloque anterior
                </button>` : ''}
                ${padre >= 0 ? `<button type="button" class="btn btn-outline-secondary btn-sm" data-action="raise-form-block" ${datos}>
                    Sacar al nivel superior
                </button>` : ''}
                ${nivel < 2 ? `<button type="button" class="btn btn-outline-secondary btn-sm" data-action="add-form-child" ${datos}>
                    ${esApartado ? 'Añadir subapartado' : 'Añadir subpregunta'}
                </button>` : ''}
            </div>
            ${otrosApartados ? `
                <label class="form-label" for="mover-${apartado}-${indice}">Mover a otro apartado</label>
                <select id="mover-${apartado}-${indice}" class="form-select form-select-sm" data-mover-a-apartado ${datos}>
                    <option value="">Elige un apartado</option>${crearOpcionesApartadosFormulario(apartado)}
                </select>` : ''}
            <div class="portal-config-grid">
                ${crearCampoTextoFormulario('Numeración (opcional)', ruta + '.numero', bloque.numero, 'Ej. 1.2', 30)}
                ${!esApartado ? crearCampoSeleccionFormulario('Ancho', ruta + '.ancho', bloque.ancho, [
                    ['completo', 'Fila completa'], ['medio', 'Media fila']
                ]) : ''}
            </div>
            ${esApartado
                ? crearTextareaFormulario('Descripción del apartado', ruta + '.descripcion', bloque.descripcion, 2)
                : crearTextareaFormulario('Texto de ayuda', ruta + '.ayuda', bloque.ayuda, 2)}
            <button type="button" class="btn btn-outline-danger btn-sm" data-action="delete-form-block" ${datos}>
                <i class="bi bi-trash me-1" aria-hidden="true"></i>Eliminar ${nombre}
            </button>
        </div>
    </details>`;
}

function crearOpcionesApartadosFormulario(excluir = -1) {
    return estadoPortal.formularioActual.secciones.map(function (apartado, indice) {
        if (indice === excluir) return '';
        const sangria = nivelBloqueFormulario(apartado) ? '↳ ' : '';
        return `<option value="${indice}" data-nombre-apartado="${indice}">${sangria}${escaparHtml(apartado.titulo.trim() || 'Apartado sin título')}</option>`;
    }).join('');
}

function crearTextoEnPapelFormulario(ruta, valor, etiqueta, placeholder, multilinea, longitud = 0) {
    const atributos = `class="portal-diseno-encuesta__campo" id="papel-form-${ruta}" data-form-field="${ruta}" aria-label="${etiqueta}" placeholder="${placeholder}"`;
    if (multilinea) return `<textarea rows="1" ${atributos}>${escaparHtml(valor || '')}</textarea>`;
    return `<input type="text" ${atributos} value="${escaparHtml(valor || '')}" ${longitud ? `maxlength="${longitud}"` : ''}>`;
}

/** Cada hueco describe su destino para que el código de arrastre no dependa del diseño. */
/** Las guías llevan la posición del bloque. Las del final admiten también un botón. */
function crearZonaSoltarFormulario(destino, tipo = '', contenido = '') {
    const clase = tipo ? 'es-' + tipo : '';
    return `<div class="portal-diseno-encuesta__soltar ${clase}" ${tipo === 'final' || tipo === 'inicio' ? '' : 'aria-hidden="true"'}
        data-soltar-apartado="${destino.apartado}" data-soltar-indice="${destino.indice}"
        data-soltar-nivel="${destino.nivel}" data-soltar-padre="${destino.padre}" style="--nivel-encuesta:${destino.nivel}">
        ${contenido}
    </div>`;
}

/* -------- Representación pública compartida por la vista y la prueba -------- */

function crearFormularioVistaPublica(formulario, interactivo) {
    const apartados = formulario.secciones.map(function (seccion, indice) {
        return crearSeccionVistaFormulario(seccion, indice, interactivo);
    }).join('');
    const hayPreguntas = formulario.secciones.some(function (apartado) { return apartado.preguntas.length > 0; });
    const contenido = apartados || '<p class="portal-diseno-encuesta__vacio">Todavía no hay apartados.</p>';

    if (!interactivo) {
        return `<div class="portal-form-preview-form">
            ${contenido}
            ${hayPreguntas ? `<div class="portal-form-preview-actions">
                <button type="button" disabled>Enviar respuestas <i class="bi bi-send" aria-hidden="true"></i></button>
            </div>` : ''}
        </div>`;
    }

    return `<form class="portal-form-preview-form" data-prueba-formulario novalidate>
        <p class="portal-form-preview-test">Puedes rellenar y probar este formulario. Las respuestas de prueba no se guardan.</p>
        ${contenido}
        <div class="portal-form-preview-actions">
            <button type="submit" ${hayPreguntas ? '' : 'disabled'}>Probar envío <i class="bi bi-send" aria-hidden="true"></i></button>
        </div>
        <p class="portal-form-preview-result" role="status"></p>
    </form>`;
}

function crearSeccionVistaFormulario(seccion, indiceSeccion, interactivo) {
    const preguntas = seccion.preguntas.map(function (pregunta, indicePregunta) {
        return crearPreguntaVistaFormulario(pregunta, indiceSeccion, indicePregunta, interactivo);
    }).join('');
    const nivel = nivelBloqueFormulario(seccion);

    return `<fieldset class="portal-form-preview-section" data-vista-apartado="${indiceSeccion}" style="--nivel-encuesta:${nivel}">
        <legend>
            ${seccion.numero || nivel === 0 ? `<span>${escaparHtml(seccion.numero || String(indiceSeccion + 1))}</span>` : ''}
            <div>
                <strong>${escaparHtml(seccion.titulo || 'Apartado sin título')}</strong>
                ${seccion.descripcion ? `<small>${escaparHtml(seccion.descripcion)}</small>` : ''}
            </div>
        </legend>
        <div class="portal-form-preview-grid">
            ${preguntas || '<p class="portal-form-preview-section-empty">Este apartado todavía no tiene preguntas.</p>'}
        </div>
    </fieldset>`;
}

function crearPreguntaVistaFormulario(pregunta, indiceSeccion, indicePregunta, interactivo) {
    const ancho = pregunta.ancho === 'medio' ? 'is-half' : 'is-full';
    const nombre = `preview_${indiceSeccion}_${indicePregunta}`;
    const numero = String(pregunta.numero || '').trim();
    const control = crearControlVistaFormulario(pregunta, nombre);
    return `<div class="portal-form-preview-question ${ancho}" data-vista-pregunta="${indiceSeccion}.${indicePregunta}"
            style="--nivel-encuesta:${nivelBloqueFormulario(pregunta)}">
        <span id="${nombre}_etiqueta">
            ${numero ? escaparHtml(numero) + (/[.)]$/.test(numero) ? ' ' : '. ') : ''}
            ${escaparHtml(pregunta.enunciado || 'Pregunta sin enunciado')}
            ${pregunta.obligatorio ? '<em>*</em>' : ''}
        </span>
        ${pregunta.ayuda ? `<small>${escaparHtml(pregunta.ayuda)}</small>` : ''}
        ${interactivo ? control : `<div inert>${control}</div>`}
        ${interactivo ? '<small class="form-public-field__error" data-error-grupo aria-live="polite"></small>' : ''}
    </div>`;
}
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
        const distribucion = pregunta.tipo === 'si_no' ? '' : 'is-grid';
        return `
            <div class="portal-form-preview-options ${distribucion}" role="group" aria-labelledby="${nombre}_etiqueta"
                ${multiple && requerido ? 'data-required-group="true"' : ''}>
                ${opciones.map((opcion, indice) => `<label>
                    <input type="${tipo}" name="${nombre}" value="${escaparHtml(opcion)}"
                        ${!multiple && indice === 0 ? requerido : ''}> ${escaparHtml(opcion)}
                </label>`).join('') || '<span>Añade al menos dos opciones.</span>'}
            </div>`;
    }

    return `<input type="text" ${atributo} placeholder="Escribe tu respuesta">`;
}


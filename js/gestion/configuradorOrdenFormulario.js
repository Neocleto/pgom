/**
 * Altas, movimientos y borrados del diseñador visual.
 * Las listas tienen el mismo orden y nivel que guarda PHP. Los bloques se
 * identifican por su posición mientras se arrastran y por su objeto al deshacer.
 */

let apartadoDestinoFormulario = null;
let borradosFormulario = [];
let arrastreFormulario = null;
// Estado de la pantalla. Guardamos referencias para que el plegado viaje
// con su apartado cuando cambia de posición y quede fuera de los datos de la encuesta.
const apartadosPlegadosFormulario = new Set();
// Cada apartado recuerda qué pregunta se está editando. El valor null indica
// que se han plegado todas. Sin valor, se abre la primera al entrar.
const preguntasAbiertasFormulario = new Map();

document.addEventListener('DOMContentLoaded', function () {
    const panel = document.getElementById('contenidoPanelConfigurador');
    panel.addEventListener('dragstart', empezarArrastreFormulario);
    panel.addEventListener('dragover', mostrarDestinoArrastreFormulario);
    panel.addEventListener('drop', soltarElementoFormulario);
    panel.addEventListener('dragend', limpiarArrastreFormulario);
    panel.addEventListener('focusin', function (evento) {
        const bloque = evento.target.closest('[data-apartado-lienzo]');
        if (bloque) seleccionarApartadoFormulario(Number(bloque.dataset.apartadoLienzo));
        seguirCampoVistaEnDirectoFormulario(evento.target);
    });
});

function reiniciarOrdenFormulario() {
    const apartados = estadoPortal.formularioActual.secciones;
    apartadoDestinoFormulario = apartados[0] || null;
    apartadosPlegadosFormulario.clear();
    preguntasAbiertasFormulario.clear();
    for (const apartado of apartados.slice(1)) apartadosPlegadosFormulario.add(apartado);
    borradosFormulario = [];
    arrastreFormulario = null;
}

/** Abre el apartado y sus padres para que se pueda enfocar un campo oculto. */
function abrirApartadoFormulario(indice) {
    const apartados = estadoPortal.formularioActual.secciones;
    let huboCambios = false;
    while (indice >= 0) {
        if (apartadosPlegadosFormulario.delete(apartados[indice])) huboCambios = true;
        indice = padreBloqueFormulario(apartados, indice);
    }
    return huboCambios;
}

/** Busca la pregunta abierta por su objeto, aunque haya cambiado de posición. */
function preguntaAbiertaFormulario(apartado) {
    const pregunta = preguntasAbiertasFormulario.get(apartado);
    if (pregunta === null || apartado.preguntas.includes(pregunta)) return pregunta;
    return apartado.preguntas[0] || null;
}

/** Abrir una pregunta sustituye a la anterior del mismo apartado. */
function abrirPreguntaFormulario(indiceApartado, indicePregunta) {
    const apartado = estadoPortal.formularioActual.secciones[indiceApartado];
    const pregunta = apartado.preguntas[indicePregunta];
    if (pregunta === preguntaAbiertaFormulario(apartado)) return false;
    preguntasAbiertasFormulario.set(apartado, pregunta);
    return true;
}

function alternarPlegadoPreguntaFormulario(tarjeta) {
    const tarjetaApartado = tarjeta.closest('[data-apartado-lienzo]');
    const apartado = estadoPortal.formularioActual.secciones[Number(tarjetaApartado.dataset.apartadoLienzo)];
    const pregunta = apartado.preguntas[Number(tarjeta.dataset.preguntaLienzo)];
    preguntasAbiertasFormulario.set(apartado, pregunta === preguntaAbiertaFormulario(apartado) ? null : pregunta);
    actualizarPlegadoPreguntasFormulario(tarjetaApartado);
}

/**
 * Cambia solo lo que se ve en el editor. El foco y los datos de las preguntas
 * se conservan y la vista en directo puede seguir mostrando todas.
 */
function actualizarPlegadoPreguntasFormulario(tarjetaApartado) {
    const apartado = estadoPortal.formularioActual.secciones[Number(tarjetaApartado.dataset.apartadoLienzo)];
    const abierta = preguntaAbiertaFormulario(apartado);
    for (const tarjeta of tarjetaApartado.querySelectorAll('[data-pregunta-lienzo]')) {
        const plegada = apartado.preguntas[Number(tarjeta.dataset.preguntaLienzo)] !== abierta;
        const boton = tarjeta.querySelector('[data-action="toggle-form-question"]');
        const accion = plegada ? 'Desplegar pregunta' : 'Plegar pregunta';
        tarjeta.classList.toggle('is-plegada', plegada);
        boton.setAttribute('aria-expanded', String(!plegada));
        boton.setAttribute('aria-label', accion);
        boton.title = accion;
        if (plegada) tarjeta.querySelector('[data-menu-bloque]').open = false;
    }
}

function alternarPlegadoApartadoFormulario(indice) {
    const apartados = estadoPortal.formularioActual.secciones;
    const apartado = apartados[indice];
    if (apartadosPlegadosFormulario.has(apartado)) {
        abrirApartadoFormulario(indice);
    } else {
        apartadosPlegadosFormulario.add(apartado);
    }
    actualizarPlegadoApartadosFormulario();
}

function plegarTodosApartadosFormulario(plegar) {
    apartadosPlegadosFormulario.clear();
    if (plegar) {
        for (const apartado of estadoPortal.formularioActual.secciones) apartadosPlegadosFormulario.add(apartado);
    }
    actualizarPlegadoApartadosFormulario();
}

/**
 * El papel dibuja los apartados y subapartados en una lista. Al plegar uno
 * ocultamos sus preguntas y los descendientes de la lista, conservando el
 * estado de cada subapartado para cuando se vuelva a abrir su padre.
 */
function actualizarPlegadoApartadosFormulario() {
    const tarjetas = document.querySelectorAll('#lienzoEditorFormulario [data-apartado-lienzo]');
    const apartados = estadoPortal.formularioActual.secciones;
    let ocultarHasta = 0;
    let hayApartadosAbiertos = false;

    for (const tarjeta of tarjetas) {
        const indice = Number(tarjeta.dataset.apartadoLienzo);
        const plegado = apartadosPlegadosFormulario.has(apartados[indice]);
        const ocultoPorPadre = indice < ocultarHasta;
        tarjeta.hidden = ocultoPorPadre;
        // La guía de inserción justo delante pertenece a su tarjeta.
        tarjeta.previousElementSibling.hidden = ocultoPorPadre;
        tarjeta.classList.toggle('is-plegado', plegado);
        tarjeta.querySelector('[data-contenido-apartado]').hidden = plegado;

        const boton = tarjeta.querySelector('[data-action="toggle-form-section"]');
        const accion = plegado ? 'Desplegar' : 'Plegar';
        boton.setAttribute('aria-expanded', String(!plegado));
        boton.setAttribute('aria-label', accion + ' apartado');
        boton.title = accion + ' apartado';
        boton.querySelector('span').textContent = accion;

        let preguntas = apartados[indice].preguntas.length;
        if (!ocultoPorPadre && plegado) {
            ocultarHasta = finBloqueEncuesta(apartados, indice);
            for (let hijo = indice + 1; hijo < ocultarHasta; hijo++) {
                preguntas += apartados[hijo].preguntas.length;
            }
            tarjeta.querySelector('[data-menu-bloque]').open = false;
        }
        tarjeta.querySelector('[data-resumen-apartado]').textContent =
            ' · ' + preguntas + (preguntas === 1 ? ' pregunta' : ' preguntas');
        if (!ocultoPorPadre && !plegado) hayApartadosAbiertos = true;
    }

    const botonTodos = document.querySelector('[data-action="toggle-all-form-sections"]');
    if (botonTodos) {
        botonTodos.dataset.plegar = String(hayApartadosAbiertos);
        botonTodos.textContent = hayApartadosAbiertos ? 'Plegar todos' : 'Desplegar todos';
    }
}

function seleccionarApartadoFormulario(indice) {
    apartadoDestinoFormulario = estadoPortal.formularioActual.secciones[indice] || null;
    actualizarDestinoPaletaFormulario();
}

function actualizarDestinoPaletaFormulario() {
    const formulario = estadoPortal.formularioActual;
    const selector = document.getElementById('irApartadoFormulario');
    const destino = document.getElementById('destinoPaletaFormulario');
    if (!selector || !destino) return;

    let indice = formulario.secciones.indexOf(apartadoDestinoFormulario);
    if (indice === -1 && formulario.secciones.length) {
        indice = 0;
        apartadoDestinoFormulario = formulario.secciones[0];
    }

    selector.value = indice === -1 ? '' : String(indice);
    destino.textContent = apartadoDestinoFormulario
        ? 'Preguntas para «' + (apartadoDestinoFormulario.titulo.trim() || 'Apartado sin título') + '»'
        : 'Añade un apartado para empezar.';
    document.querySelectorAll('[data-apartado-lienzo].is-destino').forEach(function (bloque) {
        bloque.classList.remove('is-destino');
    });
    document.querySelector(`[data-apartado-lienzo="${indice}"]`)?.classList.add('is-destino');
}

/**
 * Un apartado tiene una lista de preguntas. El valor -1 identifica la lista
 * de apartados. nivel 0 es un bloque principal; 1 y 2 son bloques anidados.
 */
function listaBloquesFormulario(indiceApartado) {
    const apartados = estadoPortal.formularioActual.secciones;
    if (indiceApartado === -1) return apartados;
    return apartados[indiceApartado]?.preguntas;
}

function nivelBloqueFormulario(bloque) {
    return Number(bloque?.nivel) || 0;
}

/** Los elementos consecutivos que tienen más nivel son los hijos del bloque. */
function finBloqueEncuesta(lista, indice) {
    const nivel = nivelBloqueFormulario(lista[indice]);
    let fin = indice + 1;
    while (fin < lista.length && nivelBloqueFormulario(lista[fin]) > nivel) fin++;
    return fin;
}

function padreBloqueFormulario(lista, indice) {
    const nivel = nivelBloqueFormulario(lista[indice]);
    if (nivel === 0) return -1;

    let anterior = indice - 1;
    while (anterior >= 0 && nivelBloqueFormulario(lista[anterior]) >= nivel) anterior--;
    return anterior;
}

function vecinoBloqueFormulario(lista, indice, direccion) {
    const nivel = nivelBloqueFormulario(lista[indice]);
    let vecino = finBloqueEncuesta(lista, indice);
    if (direccion < 0) {
        vecino = indice - 1;
        while (vecino >= 0 && nivelBloqueFormulario(lista[vecino]) > nivel) vecino--;
    }
    if (!lista[vecino] || nivelBloqueFormulario(lista[vecino]) !== nivel) return -1;
    return vecino;
}

/** Calcula el hueco antes de un bloque. Si no hay bloque, es el final de la lista. */
function destinoAntesFormulario(apartado, indice) {
    const lista = listaBloquesFormulario(apartado);
    return {
        apartado,
        indice,
        nivel: nivelBloqueFormulario(lista[indice]),
        padre: padreBloqueFormulario(lista, indice)
    };
}

/** Calcula el hueco inmediatamente después del último hijo de un bloque. */
function destinoHijoFormulario(apartado, indice) {
    const lista = listaBloquesFormulario(apartado);
    return {
        apartado,
        indice: finBloqueEncuesta(lista, indice),
        nivel: nivelBloqueFormulario(lista[indice]) + 1,
        padre: indice
    };
}

/**
 * Los botones de la paleta y «Añadir pregunta» también pasan por la misma
 * inserción que usa el arrastre. Con el teclado se puede elegir el apartado,
 * añadir un bloque y ordenarlo con los botones de su menú.
 */
function agregarDesdePaletaFormulario(tipo) {
    const apartados = estadoPortal.formularioActual.secciones;
    if (tipo === 'apartado') {
        agregarBloqueFormulario(tipo, destinoAntesFormulario(-1, apartados.length));
        return;
    }

    // Si se ha borrado el último apartado, la primera pregunta crea uno.
    if (!apartados.length) {
        apartados.push({ titulo: 'Datos generales', descripcion: '', preguntas: [] });
        apartadoDestinoFormulario = apartados[0];
    }
    let indice = apartados.indexOf(apartadoDestinoFormulario);
    if (indice === -1) indice = 0;
    agregarBloqueFormulario(tipo, destinoAntesFormulario(indice, apartados[indice].preguntas.length));
}

function agregarBloqueFormulario(tipo, destino) {
    const lista = listaBloquesFormulario(destino.apartado);
    const esApartado = tipo === 'apartado';
    const nuevo = esApartado
        ? { titulo: '', descripcion: '', preguntas: [] }
        : crearPreguntaVaciaPortal(tipo);
    nuevo.nivel = destino.nivel;
    lista.splice(destino.indice, 0, nuevo);

    // Al crear un apartado plegamos los demás. Si es un subapartado, sus
    // padres también se abren para dejar visible el camino hasta él.
    if (esApartado) {
        for (const apartado of lista) apartadosPlegadosFormulario.add(apartado);
        abrirApartadoFormulario(destino.indice);
    }

    const nombre = nombreBloqueFormulario(destino.apartado, destino.nivel);
    actualizarEstructuraFormulario(nombre + ' añadido' + (esApartado ? '.' : 'a.'), destino.apartado, destino.indice);
}

/**
 * Comprueba si un hueco admite el bloque. Por ejemplo, un apartado no puede
 * convertirse en pregunta, ni soltarse dentro de uno de sus propios hijos.
 */
function puedeColocarBloqueFormulario(origen, destino) {
    const listaDestino = listaBloquesFormulario(destino.apartado);
    if (!listaDestino || destino.nivel > 2) return false;
    const esApartado = destino.apartado === -1;
    if (origen.tipo) return esApartado === (origen.tipo === 'apartado');

    if (esApartado !== (origen.apartado === -1)) return false;
    const listaOrigen = listaBloquesFormulario(origen.apartado);
    if (!listaOrigen?.[origen.indice]) return false;
    const fin = finBloqueEncuesta(listaOrigen, origen.indice);
    if (listaOrigen === listaDestino) {
        if (destino.padre >= origen.indice && destino.padre < fin) return false;
        if (destino.indice > origen.indice && destino.indice < fin) return false;
        if (destino.nivel === nivelBloqueFormulario(listaOrigen[origen.indice])
            && (destino.indice === origen.indice || destino.indice === fin)) return false;
    }

    // Conservamos la sangría relativa de los hijos al mover el bloque.
    const diferencia = destino.nivel - nivelBloqueFormulario(listaOrigen[origen.indice]);
    for (let indice = origen.indice; indice < fin; indice++) {
        if (nivelBloqueFormulario(listaOrigen[indice]) + diferencia > 2) return false;
    }
    return true;
}

function moverBloqueFormulario(origen, destino) {
    if (!puedeColocarBloqueFormulario(origen, destino)) return;

    const listaOrigen = listaBloquesFormulario(origen.apartado);
    const listaDestino = listaBloquesFormulario(destino.apartado);
    const cantidad = finBloqueEncuesta(listaOrigen, origen.indice) - origen.indice;
    const diferencia = destino.nivel - nivelBloqueFormulario(listaOrigen[origen.indice]);
    const bloque = listaOrigen.splice(origen.indice, cantidad);
    let posicion = destino.indice;
    if (listaOrigen === listaDestino && posicion > origen.indice) posicion -= cantidad;

    if (diferencia !== 0) {
        for (const elemento of bloque) elemento.nivel = nivelBloqueFormulario(elemento) + diferencia;
    }
    listaDestino.splice(posicion, 0, ...bloque);
    actualizarEstructuraFormulario('Bloque movido.', destino.apartado, posicion, false);
}

/** Las flechas intercambian el bloque completo con el hermano anterior o siguiente. */
function moverBloqueConFlechaFormulario(origen, direccion) {
    const lista = listaBloquesFormulario(origen.apartado);
    const vecino = vecinoBloqueFormulario(lista, origen.indice, direccion);
    if (vecino < 0) return;

    const destino = destinoAntesFormulario(origen.apartado, vecino);
    if (direccion > 0) destino.indice = finBloqueEncuesta(lista, vecino);
    moverBloqueFormulario(origen, destino);
}

/** Mismas operaciones de anidado con un botón, también para pantallas táctiles. */
function anidarBloqueFormulario(origen, anidar) {
    const lista = listaBloquesFormulario(origen.apartado);
    if (anidar) {
        const anterior = vecinoBloqueFormulario(lista, origen.indice, -1);
        if (anterior >= 0) moverBloqueFormulario(origen, destinoHijoFormulario(origen.apartado, anterior));
        return;
    }

    const padre = padreBloqueFormulario(lista, origen.indice);
    if (padre < 0) return;
    const destino = destinoAntesFormulario(origen.apartado, padre);
    destino.indice = finBloqueEncuesta(lista, padre);
    moverBloqueFormulario(origen, destino);
}

function borrarBloqueFormulario(origen) {
    const lista = listaBloquesFormulario(origen.apartado);
    const padre = lista[padreBloqueFormulario(lista, origen.indice)];
    const fin = finBloqueEncuesta(lista, origen.indice);
    const anterior = lista[origen.indice - 1];
    const siguiente = lista[fin];
    const apartado = estadoPortal.formularioActual.secciones[origen.apartado];
    const elementos = lista.splice(origen.indice, fin - origen.indice);

    // Guardamos referencias al bloque y a sus vecinos. Así Deshacer recupera
    // el contenido borrado y conserva lo que se haya escrito entre medias.
    borradosFormulario.push({ elementos, apartado, padre, anterior, siguiente });
    const nombre = nombreBloqueFormulario(origen.apartado, nivelBloqueFormulario(elementos[0]));
    actualizarEstructuraFormulario(nombre + (origen.apartado === -1 ? ' eliminado.' : ' eliminada.'));
    document.querySelector('[data-action="undo-form-delete"]')?.focus({ preventScroll: true });
}

function deshacerBorradoFormulario() {
    const borrado = borradosFormulario.pop();
    if (!borrado) return;

    const apartados = estadoPortal.formularioActual.secciones;
    let apartado = borrado.apartado;
    if (apartado && borrado.padre) {
        apartado = apartados.find(function (seccion) {
            return seccion.preguntas.includes(borrado.padre);
        }) || apartado;
    }
    const lista = apartado ? apartado.preguntas : apartados;
    let indicePadre = lista.indexOf(borrado.padre);
    const nivelOriginal = nivelBloqueFormulario(borrado.elementos[0]);
    const nivelMasProfundo = Math.max(...borrado.elementos.map(nivelBloqueFormulario));

    // Si el padre ahora está demasiado anidado para recuperar sus hijos,
    // recuperamos la rama completa al nivel principal.
    if (indicePadre >= 0 && nivelBloqueFormulario(borrado.padre) + 1 + nivelMasProfundo - nivelOriginal > 2) {
        indicePadre = -1;
    }
    let inicio = 0;
    let fin = lista.length;
    let nivel = 0;
    if (indicePadre !== -1) {
        inicio = indicePadre + 1;
        fin = finBloqueEncuesta(lista, indicePadre);
        nivel = nivelBloqueFormulario(borrado.padre) + 1;
    }

    let posicion = lista.indexOf(borrado.siguiente);
    if (posicion < inicio || posicion >= fin || padreBloqueFormulario(lista, posicion) !== indicePadre) {
        const anterior = lista.indexOf(borrado.anterior);
        posicion = fin;
        if (anterior >= inicio && anterior < fin) {
            // El vecino puede ser el último hijo de un hermano. Buscamos ese
            // hermano antes de colocar todo lo recuperado después de él.
            let hermano = anterior;
            while (hermano > inicio && padreBloqueFormulario(lista, hermano) > indicePadre) {
                hermano = padreBloqueFormulario(lista, hermano);
            }
            if (padreBloqueFormulario(lista, hermano) === indicePadre) posicion = finBloqueEncuesta(lista, hermano);
        }
    }

    // Si el padre se movió después del borrado, los elementos recuperados
    // siguen su nivel actual. El formato de PostgreSQL tiene tres niveles.
    for (const elemento of borrado.elementos) {
        const nivelNuevo = nivel + nivelBloqueFormulario(elemento) - nivelOriginal;
        if (nivelNuevo !== nivelBloqueFormulario(elemento)) elemento.nivel = nivelNuevo;
    }
    lista.splice(posicion, 0, ...borrado.elementos);
    actualizarEstructuraFormulario('Bloque recuperado.', apartado ? apartados.indexOf(apartado) : -1, posicion, false);
}

function nombreBloqueFormulario(apartado, nivel) {
    if (apartado === -1) return nivel ? 'Subapartado' : 'Apartado';
    return nivel ? 'Subpregunta' : 'Pregunta';
}

/** Repinta el papel y actualiza el borrador. El foco sigue al bloque modificado. */
function actualizarEstructuraFormulario(mensaje, apartado, indice, editar = true) {
    const apartados = estadoPortal.formularioActual.secciones;
    if (indice !== undefined) {
        apartadoDestinoFormulario = apartados[apartado === -1 ? indice : apartado];
        // Una pregunta movida a un apartado plegado aparece al soltarla.
        // Un apartado movido conserva su plegado y solo abre sus nuevos padres.
        abrirApartadoFormulario(apartado === -1 ? padreBloqueFormulario(apartados, indice) : apartado);
        if (apartado !== -1) abrirPreguntaFormulario(apartado, indice);
    } else if (!apartados.includes(apartadoDestinoFormulario)) {
        apartadoDestinoFormulario = null;
    }

    marcarCambios(true, 'formulario');
    renderizarLienzoFormulario();
    const deshacer = document.querySelector('[data-action="undo-form-delete"]');
    if (deshacer) deshacer.hidden = borradosFormulario.length === 0;
    document.getElementById('avisoEditorFormulario').textContent = mensaje;
    if (indice === undefined) return;

    let ruta = `secciones.${indice}.titulo`;
    let selector = `[data-apartado-lienzo="${indice}"] [data-asa-apartado]`;
    if (apartado !== -1) {
        ruta = `secciones.${apartado}.preguntas.${indice}.enunciado`;
        selector = `[data-apartado-lienzo="${apartado}"] [data-asa-pregunta="${indice}"]`;
    }
    const campo = editar ? mostrarCampoEditorFormulario(ruta) : document.querySelector(selector);
    enfocarCampoFormulario(campo);
}

/* -------- Arrastrar y soltar con los eventos nativos del navegador -------- */

function empezarArrastreFormulario(evento) {
    const asa = evento.target.closest('[data-arrastrar-tipo], [data-arrastrar-indice]');
    if (!asa?.draggable || !evento.dataTransfer) return;

    if (asa.dataset.arrastrarTipo) {
        arrastreFormulario = { tipo: asa.dataset.arrastrarTipo };
    } else {
        arrastreFormulario = {
            apartado: Number(asa.dataset.arrastrarApartado),
            indice: Number(asa.dataset.arrastrarIndice)
        };
    }

    // Firefox requiere datos en el arrastre. La aplicación usa exclusivamente
    // el origen local anterior, por lo que soltar texto externo no crea nada.
    evento.dataTransfer.setData('application/x-bloque-encuesta', 'bloque');
    evento.dataTransfer.effectAllowed = arrastreFormulario.tipo ? 'copy' : 'move';
    evento.currentTarget.classList.add('arrastrando-encuesta');
    for (const zona of evento.currentTarget.querySelectorAll('[data-soltar-apartado]')) {
        zona.classList.toggle('acepta-bloque', puedeColocarBloqueFormulario(arrastreFormulario, leerDestinoArrastreFormulario(zona)));
    }
}

function leerDestinoArrastreFormulario(zona) {
    return {
        apartado: Number(zona.dataset.soltarApartado),
        indice: Number(zona.dataset.soltarIndice),
        nivel: Number(zona.dataset.soltarNivel),
        padre: Number(zona.dataset.soltarPadre)
    };
}

/**
 * Si el puntero pasa por encima de una tarjeta, su mitad superior o inferior
 * equivale a la guía anterior o siguiente. Así se puede soltar en el bloque
 * y ver la línea de inserción, sin tener que acertar en un hueco estrecho.
 */
function buscarDestinoArrastreFormulario(evento) {
    const directa = evento.target.closest('[data-soltar-apartado].acepta-bloque');
    if (directa) return directa;

    const esApartado = arrastreFormulario.tipo === 'apartado' || arrastreFormulario.apartado === -1;
    const apartado = evento.target.closest('[data-apartado-lienzo]');
    const tarjeta = esApartado ? apartado : evento.target.closest('[data-pregunta-lienzo]');
    if (!tarjeta) {
        // Soltar una pregunta sobre el título de un apartado la añade al final.
        if (!esApartado && apartado) {
            return apartado.querySelector('.portal-diseno-encuesta__preguntas > .es-final.acepta-bloque');
        }
        return null;
    }

    const caja = tarjeta.getBoundingClientRect();
    const mitadSuperior = evento.clientY < caja.top + caja.height / 2;
    let guia = mitadSuperior ? tarjeta.previousElementSibling : tarjeta.nextElementSibling;
    // Al soltar debajo de un apartado plegado, saltamos sus subapartados ocultos.
    while (!mitadSuperior && guia?.hidden) guia = guia.nextElementSibling;
    return guia?.classList.contains('acepta-bloque') ? guia : null;
}

function mostrarDestinoArrastreFormulario(evento) {
    if (!arrastreFormulario) return;

    const panel = evento.currentTarget;
    const zona = buscarDestinoArrastreFormulario(evento);
    const anterior = panel.querySelector('.destino-arrastre');
    if (anterior !== zona) {
        anterior?.classList.remove('destino-arrastre');
        zona?.classList.add('destino-arrastre');
    }

    // Sin zona válida el navegador no debe intentar insertar el texto del
    // arrastre dentro de un título o de otra caja editable.
    evento.preventDefault();
    if (!zona) {
        evento.dataTransfer.dropEffect = 'none';
        desplazarPanelDuranteArrastre(evento);
        return;
    }
    evento.dataTransfer.dropEffect = arrastreFormulario.tipo ? 'copy' : 'move';
}

/** Facilita llegar a los apartados lejanos mientras se mantiene pulsado el asa. */
function desplazarPanelDuranteArrastre(evento) {
    const panel = evento.currentTarget;
    const caja = panel.getBoundingClientRect();
    if (evento.clientY > caja.bottom - 45) panel.scrollTop += 18;
    const barra = panel.querySelector('.portal-diseno-encuesta__barra');
    if (evento.clientY < caja.top + barra.offsetHeight + 35) panel.scrollTop -= 18;
}

function soltarElementoFormulario(evento) {
    const origen = arrastreFormulario;
    if (!origen) return;
    const zona = buscarDestinoArrastreFormulario(evento);
    evento.preventDefault();
    if (!zona) {
        limpiarArrastreFormulario();
        return;
    }
    const destino = leerDestinoArrastreFormulario(zona);
    limpiarArrastreFormulario();
    if (!puedeColocarBloqueFormulario(origen, destino)) return;

    if (origen.tipo) agregarBloqueFormulario(origen.tipo, destino);
    else moverBloqueFormulario(origen, destino);
}

function limpiarArrastreFormulario() {
    arrastreFormulario = null;
    const panel = document.getElementById('contenidoPanelConfigurador');
    panel.classList.remove('arrastrando-encuesta');
    for (const zona of panel.querySelectorAll('.acepta-bloque, .destino-arrastre')) {
        zona.classList.remove('acepta-bloque', 'destino-arrastre');
    }
}

// Interacciones del buzón público original.
document.addEventListener("DOMContentLoaded", function () {
    inicializarAdjuntoBuzon();
    inicializarBuzonParticipacion();
});

/**
 * Envía el buzón mediante AJAX y mantiene al ciudadano en la misma pantalla.
 */
function inicializarBuzonParticipacion() {
    const formulario = document.getElementById("formBuzon");
    const cargando = document.getElementById("spinnerEnvio");
    const resultado = document.getElementById("resultadoEnvio");

    if (!formulario || !resultado) {
        return;
    }

    let enviando = false;
    formulario.addEventListener("submit", function (evento) {
        evento.preventDefault();
        if (formulario.dataset.modoPreview === '1') {
            mostrarResultadoBuzon(resultado, 'warning', 'La vista previa no envía mensajes.');
            return;
        }
        if (enviando) return;
        enviando = true;

        cargando?.classList.remove("d-none");
        resultado.innerHTML = "";

        const datos = new FormData(formulario);
        // El archivo y el botón de envío no cambian mientras se procesa esta petición.
        const controlesEnvio = formulario.querySelectorAll('[type="submit"], #archivoBuzon, #btnSeleccionarArchivoBuzon, #btnQuitarArchivoBuzon');
        controlesEnvio.forEach(function (control) { control.disabled = true; });

        fetch(formulario.action, {
            method: "POST",
            body: datos
        })
            .then(function (respuesta) {
                return respuesta.text().then(function (texto) {
                    let contenido;

                    try {
                        contenido = JSON.parse(texto);
                    } catch (error) {
                        throw new Error("No se ha podido confirmar el envío.");
                    }

                    return {
                        ok: respuesta.ok,
                        contenido: contenido
                    };
                });
            })
            .then(function (respuesta) {
                if (!respuesta.ok || respuesta.contenido.status !== "ok") {
                    throw new Error(
                        respuesta.contenido.message || "No se pudo enviar el mensaje."
                    );
                }

                mostrarResultadoBuzon(
                    resultado,
                    respuesta.contenido.advertencia ? "warning" : "success",
                    respuesta.contenido.advertencia || respuesta.contenido.message || "El mensaje se ha enviado correctamente."
                );

                formulario.reset();
            })
            .catch(function (error) {
                mostrarResultadoBuzon(
                    resultado,
                    "danger",
                    error.message || "Se ha producido un error inesperado."
                );
            })
            .finally(function () {
                cargando?.classList.add("d-none");
                enviando = false;
                controlesEnvio.forEach(function (control) { control.disabled = false; });
            });
    });
}

/**
 * Muestra una respuesta clara debajo del formulario del buzón.
 */
function mostrarResultadoBuzon(contenedor, tipo, mensaje) {
    let clase = "alert-danger";
    if (tipo === "success") clase = "alert-success";
    if (tipo === "warning") clase = "alert-warning";

    contenedor.innerHTML = `
        <div class="alert ${clase} mb-0" role="alert">
            ${escaparMensaje(mensaje)}
        </div>
    `;

    window.setTimeout(function () {
        contenedor.innerHTML = "";
    }, 6000);
}

/**
 * Evita insertar mensajes del servidor directamente como HTML.
 */
function escaparMensaje(valor) {
    return String(valor || "").replace(/[&<>'"]/g, function (caracter) {
        const equivalencias = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#039;",
            '"': "&quot;"
        };

        return equivalencias[caracter];
    });
}

/**
 * Adjunta un único documento al input que ya envía FormData.
 * Arrastrar y seleccionar terminan en la misma validación, sin subir nada todavía.
 */
function inicializarAdjuntoBuzon() {
    const zona = document.getElementById('zonaArchivoBuzon');
    const campo = document.getElementById('archivoBuzon');
    const seleccionar = document.getElementById('btnSeleccionarArchivoBuzon');
    const quitar = document.getElementById('btnQuitarArchivoBuzon');
    const estado = document.getElementById('estadoArchivoBuzon');
    const error = document.getElementById('errorArchivoBuzon');
    if (!zona || !campo || !seleccionar || !quitar || !estado || !error) return;

    let archivoActual = null;
    let entradasArrastre = 0;
    const limite = 5 * 1024 * 1024;

    function mostrarEstado() {
        zona.classList.toggle('has-file', archivoActual !== null);
        quitar.hidden = archivoActual === null;
        seleccionar.textContent = archivoActual ? 'Cambiar archivo' : 'Seleccionar archivo';
        if (archivoActual) {
            const tamano = (archivoActual.size / 1024 / 1024).toFixed(2).replace('.', ',');
            // textContent muestra el nombre literalmente, nunca como HTML.
            estado.textContent = archivoActual.name + ' · ' + tamano + ' MB';
        } else {
            estado.textContent = 'Ningún archivo adjunto';
        }
    }

    function mostrarError(mensaje) {
        error.textContent = mensaje;
        error.hidden = !mensaje;
    }

    function asignarArchivo(archivo) {
        if (!archivo) {
            campo.value = '';
            return;
        }
        // DataTransfer coloca el archivo soltado en el input real del formulario.
        const transferencia = new DataTransfer();
        transferencia.items.add(archivo);
        campo.files = transferencia.files;
    }

    function recibirArchivo(archivos) {
        if (campo.disabled || !archivos.length) return;
        let mensaje = '';
        const archivo = archivos[0];
        const extensionValida = /\.(pdf|jpe?g|png)$/i.test(archivo.name);
        const tipoValido = !archivo.type || ['application/pdf', 'image/jpeg', 'image/png'].includes(archivo.type);

        if (archivos.length !== 1) {
            mensaje = 'Adjunta solo un archivo. Puedes cambiarlo antes de enviar.';
        } else if (!extensionValida || !tipoValido) {
            mensaje = 'Elige un documento PDF o una imagen JPG o PNG.';
        } else if (archivo.size === 0) {
            mensaje = 'El archivo está vacío. Elige otro documento.';
        } else if (archivo.size > limite) {
            mensaje = 'El archivo supera los 5 MB. Elige uno más pequeño.';
        }

        if (mensaje) {
            // Una selección incorrecta conserva el adjunto anterior, si lo había.
            asignarArchivo(archivoActual);
            mostrarError(mensaje);
            return;
        }
        asignarArchivo(archivo);
        archivoActual = archivo;
        mostrarError('');
        mostrarEstado();
    }

    seleccionar.addEventListener('click', function () { campo.click(); });
    campo.addEventListener('change', function () { recibirArchivo(campo.files); });
    quitar.addEventListener('click', function () {
        archivoActual = null;
        asignarArchivo(null);
        mostrarError('');
        mostrarEstado();
        seleccionar.focus();
    });

    // Soltar un documento fuera del recuadro no debe sacar al usuario del formulario.
    window.addEventListener('dragover', function (evento) {
        if (evento.dataTransfer.types.includes('Files')) evento.preventDefault();
    });
    window.addEventListener('drop', function (evento) {
        if (evento.dataTransfer.files.length) evento.preventDefault();
    });

    zona.addEventListener('dragenter', function (evento) {
        if (!evento.dataTransfer.types.includes('Files') || campo.disabled) return;
        evento.preventDefault();
        entradasArrastre++;
        zona.classList.add('is-dragging');
    });
    zona.addEventListener('dragover', function (evento) {
        if (!evento.dataTransfer.types.includes('Files')) return;
        evento.preventDefault();
        evento.dataTransfer.dropEffect = campo.disabled ? 'none' : 'copy';
    });
    zona.addEventListener('dragleave', function () {
        entradasArrastre = Math.max(0, entradasArrastre - 1);
        if (entradasArrastre === 0) zona.classList.remove('is-dragging');
    });
    zona.addEventListener('drop', function (evento) {
        evento.preventDefault();
        entradasArrastre = 0;
        zona.classList.remove('is-dragging');
        recibirArchivo(evento.dataTransfer.files);
    });
    campo.form.addEventListener('reset', function () {
        archivoActual = null;
        asignarArchivo(null);
        mostrarError('');
        mostrarEstado();
    });
    mostrarEstado();
}

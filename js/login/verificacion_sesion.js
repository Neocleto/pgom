// Control de sesión de las pantallas de gestión. PHP marca el plazo de
// renovación y este archivo muestra la cuenta atrás y tramita la salida.
let comprobandoSesion = false;
let intervaloSesion = null;

// El configurador consulta este indicador en beforeunload. Una salida por
// sesión debe seguir adelante aunque haya cambios pendientes en el editor.
let saliendoPorSesionGestion = false;

function verificarSesionCada(minutos = 2) {
    if (intervaloSesion !== null) return;

    intervaloSesion = window.setInterval(comprobarSesionGestion, minutos * 60 * 1000);
}

async function comprobarSesionGestion() {
    if (comprobandoSesion || saliendoPorSesionGestion) return;
    comprobandoSesion = true;

    try {
        const respuesta = await fetch("php/login/check_sesion.php", { cache: "no-store" });
        const datos = await respuesta.json();

        if (datos.status === "forbidden" || datos.status === "no_session") {
            await mostrarAccesoNoDisponible(datos);
        } else if (datos.status === "expired") {
            const segundos = datos.segundos_para_renovar;
            if (!Number.isInteger(segundos) || segundos < 0) {
                throw new Error("El servidor no indicó un plazo de renovación válido.");
            }
            await ofrecerRenovacionSesion(segundos);
        }
        // Si falla temporalmente el servidor, el siguiente intervalo reintenta la comprobación.
    } catch (error) {
        console.error("No se pudo comprobar la sesión de gestión.", error);
    } finally {
        comprobandoSesion = false;
    }
}

function salirPorSesionGestion(ruta) {
    saliendoPorSesionGestion = true;
    window.clearInterval(intervaloSesion);
    // replace sustituye esta página en el historial y PHP resuelve el cierre.
    window.location.replace(ruta);
}

async function mostrarAccesoNoDisponible(datos) {
    await Swal.fire({
        title: "Acceso no disponible",
        text: datos.message || "Debes volver a identificarte.",
        icon: "warning",
        allowOutsideClick: false,
        allowEscapeKey: false
    });
    salirPorSesionGestion("index.php");
}

/**
 * El plazo se calcula una sola vez con los segundos que entrega PHP.
 * El intervalo consulta la hora real para ponerse al día tras una pausa.
 */
async function ofrecerRenovacionSesion(segundosParaRenovar) {
    if (segundosParaRenovar <= 0) {
        await cerrarSesionVencidaGestion();
        return;
    }

    const limiteRespuesta = Date.now() + segundosParaRenovar * 1000;
    let intervaloCuentaAtras;
    let contador;

    function actualizarCuentaAtras() {
        const segundos = Math.max(0, Math.ceil((limiteRespuesta - Date.now()) / 1000));
        const minutos = Math.floor(segundos / 60);
        const resto = String(segundos % 60).padStart(2, "0");
        contador.textContent = `${minutos}:${resto}`;
        // Cerrar el aviso resuelve la espera de Swal.fire y el flujo de abajo cierra la sesión.
        if (segundos === 0) Swal.close();
    }

    try {
        const resultado = await Swal.fire({
            title: "Sesión expirada",
            html: `<p>¿Deseas continuar con tu sesión?</p>
                   <p>Si se agota el tiempo, se cerrará la sesión y se perderán los cambios pendientes.</p>
                   <p class="mt-2"><strong>Tiempo restante: <span id="contadorSesion"></span></strong></p>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, continuar",
            cancelButtonText: "No, salir",
            customClass: {
                confirmButton: "btn btn-success me-2",
                cancelButton: "btn btn-secondary"
            },
            buttonsStyling: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: function (aviso) {
                contador = aviso.querySelector("#contadorSesion");
                intervaloCuentaAtras = window.setInterval(actualizarCuentaAtras, 1000);
                document.addEventListener("visibilitychange", actualizarCuentaAtras);
                actualizarCuentaAtras();
            },
            willClose: function () {
                window.clearInterval(intervaloCuentaAtras);
                document.removeEventListener("visibilitychange", actualizarCuentaAtras);
            }
        });

        // Comprobamos la hora antes de renovar, incluso si el clic llega entre dos actualizaciones.
        if (Date.now() >= limiteRespuesta) {
            await cerrarSesionVencidaGestion();
        } else if (resultado.isConfirmed) {
            await renovarSesionGestion();
        } else if (resultado.dismiss === Swal.DismissReason.cancel) {
            salirPorSesionGestion("php/login/logout.php");
        }
    } finally {
        window.clearInterval(intervaloCuentaAtras);
        document.removeEventListener("visibilitychange", actualizarCuentaAtras);
    }
}

async function renovarSesionGestion() {
    try {
        const respuesta = await fetch("php/login/renovar_sesion.php", {
            cache: "no-store",
            signal: AbortSignal.timeout(5000)
        });
        const datos = await respuesta.json();

        if (respuesta.ok && datos.status === "renewed") {
            await Swal.fire({
                title: "Sesión renovada",
                icon: "success",
                confirmButtonText: "Aceptar",
                customClass: { confirmButton: "btn btn-primary" },
                buttonsStyling: false
            });
        } else if (datos.status === "expired") {
            await cerrarSesionVencidaGestion();
        } else if (datos.status === "forbidden" || datos.status === "no_session") {
            await mostrarAccesoNoDisponible(datos);
        } else {
            throw new Error("No se pudo renovar la sesión.");
        }
    } catch (error) {
        console.error("No se pudo renovar la sesión de gestión.", error);
        await Swal.fire("No se pudo renovar la sesión", "Comprueba la conexión e inténtalo de nuevo.", "warning");
    }
}

/**
 * PHP comprueba el estado actual antes del cierre automático. Así, si otra
 * pestaña renovó a tiempo, esta conserva la sesión y el trabajo del editor.
 */
async function cerrarSesionVencidaGestion() {
    Swal.fire({
        title: "Cerrando sesión…",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: function () { Swal.showLoading(); }
    });

    try {
        const respuesta = await fetch("php/login/logout.php", {
            method: "POST",
            body: new URLSearchParams({ motivo: "caducidad" }),
            signal: AbortSignal.timeout(5000)
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error("No se pudo confirmar el cierre de sesión.");
        if (datos.status === "active") {
            Swal.close();
            return;
        }
        if (datos.status !== "closed") throw new Error("Respuesta de cierre desconocida.");
        salirPorSesionGestion("index.php");
    } catch (error) {
        // Si falla el AJAX, el navegador intenta el mismo cierre mediante una navegación.
        salirPorSesionGestion("php/login/logout.php?motivo=caducidad");
    }
}

document.addEventListener("DOMContentLoaded", function () {
    verificarSesionCada(2);
});

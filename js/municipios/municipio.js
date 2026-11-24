// ============================================================================
// PORTAL PÚBLICO DEL MUNICIPIO
// Controla la carga, el desplazamiento y la accesibilidad.
// ============================================================================

document.addEventListener("DOMContentLoaded", function () {
    // 1. Elementos principales de la página.
    const cuerpo = document.body;
    const cargador = document.getElementById("pageSpinner");
    const botonSubir = document.getElementById("btnScrollTop");
    const piePagina = document.querySelector(".portal-footer");

    // 2. La página se muestra únicamente cuando el DOM ya está preparado.
    requestAnimationFrame(function () {
        cuerpo.classList.remove("portal-loading");
        cargador?.classList.add("is-hidden");

        window.setTimeout(function () {
            cargador?.remove();
        }, 220);
    });

    // 3. Delegación: también funciona con los accesos que regenera el configurador.
    // Solo desplazamos esta ventana; scrollIntoView puede mover el editor exterior.
    document.addEventListener('click', function (evento) {
        const enlace = evento.target.closest('a[href^="#"]');
        if (!enlace) return;
        const id = enlace.getAttribute('href').slice(1);
        if (!id) return;
        const destino = document.getElementById(id);
        if (!destino) return;
        evento.preventDefault();
        window.scrollTo({
            top: window.scrollY + destino.getBoundingClientRect().top - 20,
            behavior: 'smooth'
        });
    });

    // 4. Botón para volver al inicio.
    function actualizarBotonSubir() {
        if (!botonSubir) {
            return;
        }

        // 1. Mostramos el botón cuando el usuario ya ha bajado por la página.
        botonSubir.classList.toggle("visible", window.scrollY > 350);

        // 2. Si el footer entra en pantalla, elevamos el botón para que nunca
        //    quede oculto dentro del fondo corporativo.
        let separacionInferior = 18;

        if (piePagina) {
            const posicionPie = piePagina.getBoundingClientRect();
            const parteVisible = Math.max(0, window.innerHeight - posicionPie.top);
            separacionInferior = Math.max(18, parteVisible + 18);
        }

        botonSubir.style.bottom = `${separacionInferior}px`;
    }

    window.addEventListener("scroll", actualizarBotonSubir, { passive: true });
    window.addEventListener("resize", actualizarBotonSubir);
    actualizarBotonSubir();

    botonSubir?.addEventListener("click", function () {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    inicializarPreguntasFrecuentes();
    prepararImagenesNoticias();
});

/** Muestra las preguntas adicionales sin agrandar inicialmente la sección. */
function inicializarPreguntasFrecuentes() {
    const boton = document.getElementById('btnMostrarFaq');
    if (!boton) return;
    boton.addEventListener('click', function () {
        const mostrar = boton.getAttribute('aria-expanded') !== 'true';
        document.querySelectorAll('[data-faq-extra]').forEach(function (pregunta) {
            pregunta.hidden = !mostrar;
        });
        boton.setAttribute('aria-expanded', String(mostrar));
        boton.textContent = mostrar ? 'Mostrar menos preguntas' : boton.dataset.moreLabel;
    });
}

/** Oculta una imagen de noticia solo cuando el navegador indica un error de carga. */
function prepararImagenesNoticias() {
    document.querySelectorAll('[data-news-image]').forEach(function (imagen) {
        imagen.addEventListener('error', function () {
            imagen.hidden = true;
        }, { once: true });
    });
}


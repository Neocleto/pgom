// Contenido de partida del asistente. Se carga solo al aplicar la plantilla.
const PLANTILLA_WIZARD = {
  paso1: {
    buzon_participacion_activo: '1'
  },
  paso2: {
    titulo: 'Para qué sirve el Plan General de Ordenación Municipal',
    descripcion: `
      <p>El Plan General de Ordenación Municipal (PGOM) define el modelo general de ordenación urbanística del municipio y establece las directrices que orientan su desarrollo futuro. Su elaboración permite que la ciudadanía conozca las propuestas y participe en las decisiones sobre su territorio.</p>
      <p>La planificación urbanística debe tener en cuenta la legislación vigente de ámbito autonómico y estatal, así como las características y necesidades específicas del municipio, para impulsar un desarrollo equilibrado y sostenible.</p>
      <p>El PGOM se elabora con participación ciudadana en el marco de la Ley de Impulso para la Sostenibilidad del Territorio de Andalucía (LISTA), que regula la ordenación del territorio y el urbanismo y establece los procedimientos de tramitación de los instrumentos urbanísticos.</p>
      <p>La LISTA promueve la conservación y mejora de los núcleos urbanos existentes, el aprovechamiento adecuado de sus recursos y la planificación justificada de las actuaciones que resulten necesarias.</p>
      <p>Este PGOM es un documento urbanístico elaborado en el marco de la asistencia técnica en planeamiento. Su objetivo es proporcionar al municipio un instrumento de ordenación urbanística general adaptado a las directrices de la legislación vigente y a las necesidades actuales de la ciudadanía.</p>
    `.trim()
  },
  paso3: {
    num_fase: '1',
    codigo_subfase: '1.1',
    estado_tramitacion: 'Esta fase inicia el proceso de elaboración del PGOM, donde se plantea un plan de participación pública que recoge acciones como encuestas, reuniones vecinales, buzones de sugerencias, sesiones informativas, herramientas digitales y mecanismos de retroalimentación continua.',
    // Fecha de aplicación en el horario local del navegador, no en UTC.
    fecha_inicio: () => {
      const hoy = new Date();
      const anio = hoy.getFullYear();
      const mes = String(hoy.getMonth() + 1).padStart(2, '0');
      const dia = String(hoy.getDate()).padStart(2, '0');
      return `${anio}-${mes}-${dia}`;
    }
  },
  paso5: {
    // Título y texto públicos de la sección de participación.
    titulo1: 'Participación ciudadana en el PGOM',
    descripcion1: `
      <p>La implicación de los ciudadanos en la Participación es un pilar esencial en la elaboración del <strong>Plan General de Ordenación Municipal (PGOM)</strong>. Este enfoque se centra en combinar las vivencias y perspectivas de la comunidad, con la experiencia técnica y administrativa del equipo del <strong>Servicio de Arquitectura y Planeamiento de la Diputación de Málaga</strong>, encargado de su redacción.</p>
      <p>El propósito es lograr que este instrumento de ordenación urbanística general se fundamente en un <strong>amplio consenso</strong> y aborde efectivamente las <strong>necesidades concretas del municipio</strong>.</p>
      <p>A través de este <strong>proceso colaborativo</strong>, se buscan soluciones que no solo sean técnicamente sólidas, sino que también alcancen un alto grado de aceptación entre los habitantes del municipio.</p>
      <p>Este método de participación garantiza que los planes reflejen una <strong>visión compartida</strong> y sean más efectivos en su <strong>implementación y sostenibilidad</strong>.</p>
    `.trim()
  },
  paso7: [
    {
        "id": 1,
        "pregunta": "¿Qué es el PGOM?",
        "respuesta": "PGOM significa Plan General de Ordenación Municipal. Este portal reúne la información del plan de tu municipio, su estado de tramitación, los documentos publicados y las vías de participación."
    },
    {
        "id": 2,
        "pregunta": "¿Cuál es el objetivo principal del PGOM?",
        "respuesta": "Definir el modelo general de ordenación del municipio. Consulta la documentación publicada para conocer las propuestas concretas de tu localidad."
    },
    {
        "id": 3,
        "pregunta": "¿Quién elabora el PGOM?",
        "respuesta": "La elaboración corresponde al equipo redactor y a las administraciones que intervienen en el expediente. El Ayuntamiento facilita la información sobre los responsables y el seguimiento del plan."
    },
    {
        "id": 4,
        "pregunta": "¿Cómo puedo conocer las propuestas para mi municipio?",
        "respuesta": "Consulta los documentos, las noticias y la información del plan publicados en este portal. Para resolver una duda sobre una propuesta concreta, utiliza los canales de contacto municipales."
    },
    {
        "id": 5,
        "pregunta": "¿Dónde puedo consultar el estado del PGOM?",
        "respuesta": "En el apartado Fases se muestra la fase actual y el estado de la tramitación que haya publicado el Ayuntamiento."
    },
    {
        "id": 6,
        "pregunta": "¿Cómo puede participar la ciudadanía?",
        "respuesta": "Puedes consultar los materiales disponibles, responder a las encuestas habilitadas y enviar sugerencias a través del buzón cuando esté activo. Los anuncios oficiales indican los plazos y canales de cada trámite."
    },
    {
        "id": 7,
        "pregunta": "¿Dónde se publica la información ambiental del plan?",
        "respuesta": "La documentación ambiental disponible se puede consultar en el apartado Documentos, junto al resto de materiales publicados del expediente."
    },
    {
        "id": 8,
        "pregunta": "¿Qué ocurre si el PGOM todavía no está aprobado?",
        "respuesta": "Consulta la fase actual y los anuncios municipales para conocer el estado del expediente. Para saber qué planeamiento resulta aplicable a una actuación concreta, solicita información al Ayuntamiento."
    },
    {
        "id": 9,
        "pregunta": "¿Dónde puedo obtener más información sobre el PGOM de mi municipio?",
        "respuesta": "En este portal, en la web del Ayuntamiento y a través de los canales de contacto municipales. Consulta también las publicaciones oficiales que se indiquen en el expediente."
    },
    {
        "id": 10,
        "pregunta": "¿Cómo puedo enviar una consulta o sugerencia?",
        "respuesta": "Utiliza el buzón de participación si está habilitado o los canales de atención del Ayuntamiento. Para presentar documentación dentro de un trámite oficial, sigue el procedimiento indicado en su anuncio."
    }
]
};

/** Sustituye el valor del campo y sincroniza CKEditor cuando corresponde. */
function escribirCampoPlantilla(id, valor) {
  const campo = document.getElementById(id);
  if (campo.dataset.richEditor === '1') {
    actualizarEditorEnriquecido(campo, valor);
  } else {
    campo.value = valor;
  }
}

/** Prepara las opciones de fase fuera del formulario. Un fallo deja el borrador intacto. */
async function prepararFasePlantilla(selectorFase, selectorSubfase) {
  const { num_fase, codigo_subfase } = PLANTILLA_WIZARD.paso3;
  const fases = selectorFase.cloneNode(true);
  const subfases = selectorSubfase.cloneNode(false);

  fases.value = num_fase;
  if (fases.value !== num_fase) {
    await cargarFasesPadre(num_fase, fases);
  }
  if (fases.value !== num_fase) {
    throw new Error('No se ha podido cargar la fase inicial.');
  }

  await cargarSubfases(num_fase, null, subfases);
  const subfase = Array.from(subfases.options).find(function (opcion) {
    const etiqueta = opcion.textContent.trim();
    return etiqueta === codigo_subfase || etiqueta.startsWith(codigo_subfase + ' ');
  });
  if (!subfase || !subfase.value) {
    throw new Error('No se ha podido cargar la subfase inicial.');
  }

  selectorFase.replaceChildren(...fases.options);
  selectorFase.disabled = false;
  selectorFase.value = num_fase;
  selectorSubfase.replaceChildren(...subfases.options);
  selectorSubfase.disabled = false;
  selectorSubfase.value = subfase.value;
}

/** Sustituye las preguntas asignadas al municipio con las de la plantilla. */
function aplicarPreguntasPlantilla() {
  preguntasAsignadasLocal = PLANTILLA_WIZARD.paso7.map(function (faq, indice) {
    const preguntaId = faq.id || null;
    // Sin ID de biblioteca, la pregunta pertenece exclusivamente al municipio.
    return {
      id: preguntaId || 'plantilla_' + (indice + 1),
      asignacion_id: null,
      pregunta_id: preguntaId,
      pregunta: faq.pregunta,
      respuesta: faq.respuesta,
      pregunta_base: faq.pregunta,
      respuesta_base: faq.respuesta,
      es_exclusiva: preguntaId === null
    };
  });
  renderizarTablaFaqs(preguntasAsignadasLocal);
}

/** Rellena el asistente. Guardar confirma los datos, el diseño y el índice juntos. */
async function aplicarPlantilla() {
  await prepararFasePlantilla(
    document.getElementById('fase_padre'),
    document.getElementById('subfase_id')
  );

  // Del paso 1 la plantilla solo define el estado del buzón.
  document.getElementById('buzon_participacion_activo').checked =
    PLANTILLA_WIZARD.paso1.buzon_participacion_activo === '1';

  escribirCampoPlantilla('titulo', PLANTILLA_WIZARD.paso2.titulo);
  escribirCampoPlantilla('descripcion', PLANTILLA_WIZARD.paso2.descripcion);

  escribirCampoPlantilla('estado_tramitacion', PLANTILLA_WIZARD.paso3.estado_tramitacion);
  escribirCampoPlantilla('fecha_inicio', PLANTILLA_WIZARD.paso3.fecha_inicio());

  escribirCampoPlantilla('titulo1', PLANTILLA_WIZARD.paso5.titulo1);
  escribirCampoPlantilla('descripcion1', PLANTILLA_WIZARD.paso5.descripcion1);
  aplicarPreguntasPlantilla();

  for (const paso of [1, 2, 3, 5, 7]) {
    guardarDatosPaso(paso);
  }
  plantillaPendiente = true;
  actualizarEstadoBotonGuardar();
}

// Una sola acción aplica la plantilla. El diálogo deja cancelar la sustitución.
document.getElementById('btnCargarPlantilla')?.addEventListener('click', async function () {
  const formulario = document.querySelector('.wizard-paso[data-step="1"] form');
  if (!formulario || cargandoEdicion || !modalWizardLoader.classList.contains('hidden')) return;
  if (!formulario.checkValidity() || !validarPaso(1)) {
    currentStep = 1;
    updateWizard();
    formulario.reportValidity();
    return;
  }

  const resultado = await Swal.fire({
    title: 'Aplicar plantilla',
    text: 'Se sustituirán los textos de información y participación, la fase, el estado del buzón, las preguntas frecuentes, el diseño y los accesos. Pulsa Guardar para aplicar los cambios y crear los botones de participación si el municipio todavía no tiene ninguno.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Aplicar plantilla',
    cancelButtonText: 'Cancelar',
    customClass: {
      confirmButton: 'btn btn-primary me-2',
      cancelButton: 'btn btn-secondary'
    },
    buttonsStyling: false
  });
  if (!resultado.isConfirmed) return;

  mostrarSpinnerModal();
  try {
    await aplicarPlantilla();
  } catch (error) {
    Swal.fire('No se pudo aplicar la plantilla', error.message, 'error');
  } finally {
    ocultarSpinnerModal();
    actualizarEstadoBotonGuardar();
  }
});

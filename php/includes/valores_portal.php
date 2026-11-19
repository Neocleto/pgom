<?php
require_once __DIR__ . '/iconos_portal.php';
// ============================================================================
// VALORES INICIALES DEL PORTAL MUNICIPAL
// Modelo, página pública y configurador consumen este mismo diseño.
// Cambiar aquí los valores de fábrica no reemplaza textos personalizados.
// No contiene consultas ni escribe en la base de datos.
// ============================================================================

/** Estructura, colores e iconos del portal dinámico de referencia. */
function obtenerSeccionesInicialesPortal()
{
    return [
        ['id' => 'informacion', 'titulo' => 'Para qué sirve el Plan General de Ordenación Municipal', 'icono' => 'info-circle', 'color' => '#003b17', 'visible' => true],
        ['id' => 'fases', 'titulo' => 'Fases en la tramitación del PGOM', 'icono' => 'pgom-fases', 'color' => '#003b17', 'visible' => true],
        ['id' => 'participacion', 'titulo' => 'Participación ciudadana en el PGOM', 'icono' => 'pgom-manos', 'color' => '#003b17', 'visible' => true],
        ['id' => 'documentos', 'titulo' => 'Documentos del PGOM', 'icono' => 'pgom-documentos', 'color' => '#003b17', 'visible' => true],
        ['id' => 'actualidad', 'titulo' => 'Noticias y preguntas frecuentes', 'icono' => 'pgom-noticias', 'color' => '#003b17', 'visible' => true],
        ['id' => 'buzon', 'titulo' => 'Buzón de participación', 'icono' => 'pgom-buzon', 'color' => '#003b17', 'visible' => true]
    ];
}

/** Textos iniciales de los elementos que se pueden editar. */
function obtenerContenidoInicialPortal()
{
    return [
        'cabecera' => [
            'etiqueta' => 'Portal municipal de planeamiento',
            'titulo' => 'Plan General de Ordenación Municipal',
            'descripcion' => 'Consulta la información urbanística, el estado de la tramitación y participa en el desarrollo del municipio.',
        ],
        'informacion' => [
            'kicker' => 'Conoce el plan'
        ],
        'fases' => [
            'kicker' => 'Estado del expediente',
            'etiqueta_fase' => 'FASE ACTUAL',
            'etiqueta_estado' => 'Estado de la tramitación'
        ],
        'participacion' => [
            'kicker' => 'Participación ciudadana',
            // El texto se escribe en gestión o se incorpora al aplicar la plantilla.
            'introduccion' => '',
            'formularios_titulo' => 'Encuestas y formularios',
            'formularios_descripcion' => 'Elige un formulario para responder online o descargar su versión imprimible.'
        ],
        'documentos' => [
            'kicker' => 'Documentación pública',
            'descripcion' => 'Consulta y descarga los documentos publicados durante la tramitación del PGOM.'
        ],
        'actualidad' => [
            'kicker' => 'Información al día',
            'noticias_icono' => 'newspaper',
            'noticias_titulo' => 'Últimas noticias',
            'faqs_icono' => 'question-circle',
            'faqs_titulo' => 'Preguntas frecuentes',
            'leer_mas' => 'Leer más'
        ],
        'buzon' => [
            'mostrar_ilustracion' => false,
            'kicker' => 'Contacto ciudadano',
            'introduccion' => 'Envía tus sugerencias, dudas o propuestas relacionadas con el PGOM.',
            'privacidad_titulo' => 'Protección de datos',
            'privacidad_texto' => 'Tus datos se utilizarán únicamente para gestionar esta consulta y responder a tu solicitud.',
            'privacidad_enlace' => 'Consultar la política de privacidad',
            'asunto_etiqueta' => 'Asunto',
            'mensaje_etiqueta' => 'Mensaje',
            'archivo_etiqueta' => 'Documento adjunto (opcional)',
            'consentimiento' => 'He leído y acepto la política de privacidad.',
            'boton_texto' => 'Enviar mensaje'
        ],
        'pie' => [
            'texto_principal' => 'Ayuntamiento de {municipio}',
            'texto_secundario' => 'Plan General de Ordenación Municipal'
        ]
    ];
}

/** Diseño usado cuando el municipio aún no tiene configuración. */
function obtenerConfiguracionInicialPortal($codMun = '')
{
    return [
        'cod_mun' => $codMun,
        'color_primario' => '#003b17',
        'color_secundario' => '#003b17',
        'color_participacion' => '#003b17',
        'color_documentos' => '#003b17',
        'color_noticias' => '#003b17',
        'color_buzon' => '#003b17',
        'ancho_contenido' => 1800,
        'escala_texto' => 1,
        'mostrar_accesos' => true,
        'secciones_portal' => obtenerSeccionesInicialesPortal(),
        'contenido_portal' => obtenerContenidoInicialPortal()
    ];
}

/** Accesos iniciales; el orden y la visibilidad se pueden personalizar. */
function obtenerAccesosInicialesPortal()
{
    $accesos = [
        ['titulo' => 'Fases de tramitación', 'descripcion' => 'Consulta el estado del expediente', 'icono' => 'pgom-fases', 'color' => '#003b17', 'destino' => '#fases'],
        ['titulo' => 'Participación', 'descripcion' => 'Aporta tu opinión', 'icono' => 'pgom-manos', 'color' => '#003b17', 'destino' => '#participacion'],
        ['titulo' => 'Documentos', 'descripcion' => 'Consulta y descarga', 'icono' => 'pgom-documentos', 'color' => '#003b17', 'destino' => '#documentos'],
        ['titulo' => 'Noticias y dudas', 'descripcion' => 'Noticias y preguntas frecuentes', 'icono' => 'pgom-noticias', 'color' => '#003b17', 'destino' => '#actualidad'],
        ['titulo' => 'Buzón', 'descripcion' => 'Envía tus propuestas', 'icono' => 'pgom-buzon', 'color' => '#003b17', 'destino' => '#buzon']
    ];
    foreach ($accesos as $indice => &$acceso) {
        $acceso['tipo_destino'] = 'seccion';
        $acceso['visible'] = true;
        $acceso['orden'] = $indice;
    }
    unset($acceso);
    return $accesos;
}

/** Catálogo de iconos disponible en los selectores del configurador. */
function obtenerIconosPortal()
{
    return [
        ['pgom-fases', 'Fases (hitos de tramitación)'],
        ['pgom-manos', 'Participación (guía de usuario)'],
        ['pgom-documentos', 'Documentos (guía de usuario)'],
        ['pgom-noticias', 'Noticias y dudas (guía de usuario)'],
        ['pgom-buzon', 'Buzón (guía de usuario)'],
        ['pgom-encuesta-infantil', 'Encuesta infantil'],
        ['pgom-encuesta-participacion', 'Encuesta de participación'],
        ['info-circle', 'Información'],
        ['calendar3', 'Estado de la tramitación'],
        ['question-circle', 'Preguntas frecuentes'],
        ['lightbulb', 'Idea'],
        ['book', 'Guía o publicación'],
        ['bookmark', 'Marcador'],
        ['buildings', 'Edificios'],
        ['building', 'Edificio municipal'],
        ['house-door', 'Vivienda'],
        ['geo-alt', 'Ubicación'],
        ['map', 'Mapa'],
        ['map-fill', 'Mapa destacado'],
        ['compass', 'Orientación'],
        ['signpost-split', 'Direcciones'],
        ['diagram-3', 'Proceso'],
        ['bezier2', 'Planificación'],
        ['bounding-box-circles', 'Delimitación'],
        ['layers', 'Capas'],
        ['grid-3x3-gap', 'Cuadrícula'],
        ['people', 'Personas'],
        ['person-badge', 'Ciudadanía'],
        ['person-check', 'Participación'],
        ['chat-dots', 'Conversación'],
        ['chat-left-text', 'Comentarios'],
        ['megaphone', 'Aviso'],
        ['hand-thumbs-up', 'Valoración'],
        ['clipboard-check', 'Encuesta'],
        ['ui-checks-grid', 'Formulario'],
        ['check2-circle', 'Completado'],
        ['list-check', 'Lista de tareas'],
        ['folder2-open', 'Carpeta'],
        ['files', 'Varios documentos'],
        ['file-earmark-text', 'Documento de texto'],
        ['file-earmark-pdf', 'Documento PDF'],
        ['file-earmark-arrow-down', 'Documento descargable'],
        ['download', 'Descarga'],
        ['upload', 'Subida'],
        ['archive', 'Archivo'],
        ['newspaper', 'Noticias (periódico)'],
        ['calendar-event', 'Calendario'],
        ['clock-history', 'Histórico'],
        ['bell', 'Notificación'],
        ['envelope', 'Correo'],
        ['telephone', 'Teléfono'],
        ['send', 'Enviar'],
        ['shield-check', 'Protección de datos'],
        ['lock', 'Acceso protegido'],
        ['eye', 'Consulta pública'],
        ['search', 'Búsqueda'],
        ['zoom-in', 'Ampliar'],
        ['bar-chart', 'Estadísticas'],
        ['pie-chart', 'Indicadores'],
        ['graph-up-arrow', 'Evolución'],
        ['tree', 'Medio ambiente'],
        ['flower1', 'Entorno natural'],
        ['water', 'Agua'],
        ['bicycle', 'Movilidad'],
        ['bus-front', 'Transporte'],
        ['car-front', 'Tráfico'],
        ['cone-striped', 'Obras'],
        ['tools', 'Actuaciones'],
        ['hammer', 'Normativa'],
        ['bank', 'Administración'],
        ['award', 'Reconocimiento'],
        ['star', 'Destacado'],
        ['link-45deg', 'Enlace'],
        ['box-arrow-up-right', 'Enlace externo'],
        ['play-circle', 'Contenido multimedia'],
        ['image', 'Imagen'],
        ['camera', 'Fotografía'],
        ['layout-text-window', 'Bloque de texto'],
        ['pencil-square', 'Editar'],
        ['square', 'Cuadrado'],
    ];
}

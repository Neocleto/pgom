<?php
// Extrae el contenido del PDF en el servidor y propone preguntas editables.

// En XAMPP se pueden indicar las rutas completas de los .exe en config.ini.
// [importacion_pdf]
// pdftotext = "C:/poppler/bin/pdftotext.exe"
// pdftoppm = "C:/poppler/bin/pdftoppm.exe"
// tesseract = "C:/Program Files/Tesseract-OCR/tesseract.exe"
// idioma_ocr = "spa"
function leerEncuestaPdf($rutaPdf, array $configuracion)
{
    $carpeta = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'encuesta_' . bin2hex(random_bytes(12));
    if (!mkdir($carpeta, 0700)) {
        throw new RuntimeException('No se pudo preparar la carpeta temporal.');
    }

    // La extracción y el OCR comparten un límite de tiempo para toda la petición.
    $limite = microtime(true) + 24;
    $rutaTexto = $carpeta . '/lectura.txt';
    try {
        $leido = ejecutarLectorEncuestaPdf([
            $configuracion['pdftotext'] ?? 'pdftotext',
            '-f', '1', '-l', '21', '-layout', '-enc', 'UTF-8', $rutaPdf, $rutaTexto
        ], $limite);
        if ($leido === 127 || $leido === 126) {
            throw new InvalidArgumentException('El servidor necesita Poppler (pdftotext) para importar encuestas.');
        }
        if ($leido !== 0 || !is_file($rutaTexto)) {
            throw new InvalidArgumentException('No se ha podido leer el PDF. Comprueba que se abre y que no tiene contraseña.');
        }

        $texto = obtenerTextoTemporalEncuesta($rutaTexto);
        $paginas = explode("\f", $texto);
        if (end($paginas) === '') {
            array_pop($paginas);
        }
        if (count($paginas) > 20) {
            throw new InvalidArgumentException('El PDF supera las 20 páginas. Recorta el documento a las páginas de la encuesta.');
        }

        // Solo se usa OCR en páginas sin texto seleccionable.
        $usoOcr = false;
        foreach ($paginas as $indice => $pagina) {
            if (preg_match('/\p{L}{2}/u', $pagina)) {
                continue;
            }

            $numeroPagina = (string)($indice + 1);
            $imagen = $carpeta . '/pagina';
            $salida = $carpeta . '/ocr';
            $extraido = ejecutarLectorEncuestaPdf([
                $configuracion['pdftoppm'] ?? 'pdftoppm',
                '-f', $numeroPagina, '-l', $numeroPagina, '-singlefile',
                '-scale-to', '2450', '-png', $rutaPdf, $imagen
            ], $limite);
            if ($extraido !== 0) {
                throw new InvalidArgumentException('No se pudo leer el PDF escaneado. Comprueba que el servidor tiene Poppler (pdftoppm).');
            }

            $reconocido = ejecutarLectorEncuestaPdf([
                $configuracion['tesseract'] ?? 'tesseract',
                $imagen . '.png', $salida, '-l', $configuracion['idioma_ocr'] ?? 'spa', '--psm', '6', '-c', 'preserve_interword_spaces=1'
            ], $limite);
            if ($reconocido !== 0) {
                throw new InvalidArgumentException('Para importar páginas escaneadas, el servidor necesita Tesseract y el idioma de OCR configurado.');
            }
            $paginas[$indice] = limpiarOcrEncuesta(obtenerTextoTemporalEncuesta($salida . '.txt'));
            $usoOcr = true;
        }

        return ['texto' => implode("\n\n", $paginas), 'ocr' => $usoOcr];
    } finally {
        foreach (glob($carpeta . '/*') as $archivo) {
            unlink($archivo);
        }
        rmdir($carpeta);
    }
}

function ejecutarLectorEncuestaPdf(array $comando, $limite)
{
    if (!function_exists('proc_open')) {
        throw new InvalidArgumentException('La importación de PDF no está habilitada en este servidor.');
    }

    // Los programas son de configuración local. El nombre del archivo original no se usa.
    $nulo = '/dev/null';
    if (PHP_OS_FAMILY === 'Windows') {
        $nulo = 'NUL';
        if (preg_match('/\.(cmd|bat)$/iD', $comando[0])) {
            throw new InvalidArgumentException('Configura los ejecutables .exe para la importación de PDF.');
        }
    }
    $destinos = [0 => ['file', $nulo, 'r'], 1 => ['file', $nulo, 'w'], 2 => ['file', $nulo, 'w']];
    $proceso = @proc_open($comando, $destinos, $tuberias, null, null, ['bypass_shell' => true]);
    if (!is_resource($proceso)) {
        return 127;
    }

    do {
        $estado = proc_get_status($proceso);
        if (!$estado['running']) {
            proc_close($proceso);
            return $estado['exitcode'];
        }
        if (microtime(true) >= $limite) {
            proc_terminate($proceso, 9);
            proc_close($proceso);
            throw new InvalidArgumentException('La lectura del PDF tardó demasiado. Prueba con menos páginas.');
        }
        usleep(50000);
    } while (true);
}

function obtenerTextoTemporalEncuesta($archivo)
{
    // Evita volcar en el formulario documentos con un volumen de texto excesivo.
    $texto = file_get_contents($archivo, false, null, 0, 262145);
    if ($texto === false || strlen($texto) > 262144 || !mb_check_encoding($texto, 'UTF-8')) {
        throw new InvalidArgumentException('El texto del PDF es demasiado extenso o no se ha podido leer correctamente.');
    }

    return $texto;
}

/**
 * Tesseract puede leer una casilla impresa como O, 0, C o [1.
 * Se recuperan las marcas antes de agrupar las opciones de cada pregunta.
 */
function limpiarOcrEncuesta($texto)
{
    $texto = preg_replace('/(?<![\p{L}\p{N}])[é¢€<]+(?=\p{Lu})/u', '¿', $texto);
    $texto = preg_replace('/(?<![\p{L}\p{N}])[é¢€<]+(?=c[oóé]mo|te\h)/iu', '¿', $texto);
    $texto = str_ireplace(
        ['Cémo', 'Cudntos', 'Dénde', 'afios', 'nifio', 'nifia', 'mds', 'publicos', 'SONAR', 'enel', 'Enlacalle', 'Enlaplaza', 'Encasa',
            'andnima', 'buzén', 'drboles', 'climdatico', 'cambio climdtico', 'gustaria', 'deberia', 'necesitaria', 'mejorarias', 'CAMBIARIAS',
            'Otra opinion', 'campo futbol', 'calles 9 la plaza', '¿Como', 'Niño', 'Niña', 'ser mas divertido', 'campo fútbol'],
        ['Cómo', 'Cuántos', 'Dónde', 'años', 'niño', 'niña', 'más', 'públicos', 'SOÑAR', 'en el', 'En la calle', 'En la plaza', 'En casa',
            'anónima', 'buzón', 'árboles', 'climático', 'cambio climático', 'gustaría', 'debería', 'necesitaría', 'mejorarías', 'CAMBIARÍAS',
            'Otra opinión', 'campo fútbol', 'calles o la plaza', '¿Cómo', 'niño', 'niña', 'ser más divertido', 'campo de fútbol'],
        $texto
    );
    $lineas = [];
    foreach (preg_split('/\R/u', $texto) as $linea) {
        // En una fila Sí/No, a veces se pierde una marca o queda pegada a la letra.
        $linea = preg_replace('/(\?|\h{2,}|^)(\h*\[?[O0C1Il]*\h*(?:s[ií]|pS)\h+(?:\[?[O0C1Il]+\h*)?no\b)(?=\h*(?:¿|[_-]{2,}|$))/iu',
            '$1 ☐ Sí ☐ No', $linea);
        $linea = preg_replace('/(?<![\p{L}\p{N}])(?:\[\h*[1Il]|[O0]1|[O0C]{1,2})(?=\h+\S|\p{Lu}\p{Ll})\h*/u', '☐ ', $linea);
        $linea = preg_replace('/(^|\h)(?:1|I|l)\h+(?=\p{Lu}\p{Ll})/u', '$1☐ ', $linea);
        $linea = preg_replace('/^\h*☐ niño(\h+☐ )niña/u', '☐ Niño$1Niña', $linea);
        if (str_contains($linea, '☐')) {
            $linea = preg_replace('/\h+\((?=No,)/u', ' ☐ ', $linea);
            $linea = preg_replace('/\h+(En\h+el\h+parque\h+infantil)(?=\h+☐)/iu', ' ☐ $1', $linea);
            $linea = preg_replace('/\h+[OS][ES]?\h*$/u', ' ☐ Otra opción', $linea);
        }

        if (preg_match('/\h{12,}(?:W[NY]|Diputaci).{0,50}(?:Malog[ae]|M[aá]lag[ae]|Maege|Provincia)\b/iu', $linea)) {
            continue;
        }
        $lineas[] = $linea;
    }
    return implode("\n", $lineas);
}

/**
 * Reconstruye la encuesta conservando los números impresos y el orden de lectura.
 * Una pregunta de seguimiento queda después de su pregunta principal.
 */
function interpretarEncuestaPdf($texto, $nombreArchivo)
{
    $titulo = '';
    $introduccion = [];
    $secciones = [];
    $apartado = nuevoApartadoImportado('Datos generales');
    $pregunta = null;
    $total = 0;
    $parrafo = true;
    preg_match_all('/^\h*(\d+(?:\.\d+)+)[.)]?\h+\S/mu', $texto, $gruposNumeros);
    $numerosConDescendientes = [];
    foreach ($gruposNumeros[1] as $numeroLeido) {
        $ultimoPunto = strrpos($numeroLeido, '.');
        $numerosConDescendientes[substr($numeroLeido, 0, $ultimoPunto)] = true;
    }
    $preguntasNumeradas = !empty($numerosConDescendientes);
    $dentro = false;

    foreach (preg_split('/\R/u', $texto) as $original) {
        $linea = trim($original);
        if ($linea === '') {
            $parrafo = true;
            continue;
        }

        // Ignora los pies de página, pero conserva las instrucciones de la encuesta.
        if (preg_match('/^\d+$|^Encuesta.*\h{3,}\d+$|^P[lij]an B.{1,4}ico de Ordenaci|^Much[ií]simas gracias|^Que tengas un verano|^Gracias$|^Con tu colaboraci/iu', $linea)) {
            continue;
        }
        if (preg_match('/^(Encuesta\h*infantil)\b/iu', $linea)) {
            $titulo = $titulo ?: 'Encuesta infantil';
            continue;
        }
        if ($titulo === '' && preg_match('/^(?:Encuesta\b|Cuestionario\b|Diagnóstico participativo)/iu', $linea)) {
            $titulo = preg_split('/\h{3,}/u', $linea, 2)[0];
            continue;
        }
        if ($linea === $titulo || preg_match('/^[\s._\-…•\x{F0B7}]{3,}$/u', $linea)) {
            continue;
        }

        $esVineta = preg_match('/^[•\x{F0B7}]/u', $linea);
        $linea = trim(preg_replace('/^[\h•\x{F0B7}]+/u', '', $linea));
        $numero = '';
        if (preg_match('/^(\d+(?:\.\d+){0,6})[.)]?\h+(.+)$/u', $linea, $grupos)) {
            $numero = $grupos[1];
            $linea = $grupos[2];
        }

        // Un encabezado resaltado puede tener una pregunta a su derecha en el original.
        $segmentos = preg_split('/\h{5,}(?=¿)/u', $linea, 2);
        $posibleTitulo = trim($segmentos[0]);
        if (esApartadoEncuestaPdf($posibleTitulo, $numero, $dentro, $preguntasNumeradas,
            isset($numerosConDescendientes[$numero]))) {
            agregarPreguntaImportada($apartado, $pregunta, $total);
            if ($dentro || $apartado['preguntas']) {
                $secciones[] = $apartado;
            }
            $nivel = $numero === '' ? 0 : min(2, substr_count($numero, '.'));
            $apartado = nuevoApartadoImportado($posibleTitulo, $numero, $nivel);
            $dentro = true;
            $parrafo = true;
            if (!isset($segmentos[1])) {
                continue;
            }
            $linea = $segmentos[1];
            $numero = '';
        }

        // Las introducciones de los PDF con numeración jerárquica pueden tener preguntas retóricas.
        if (!$dentro && $preguntasNumeradas && $numero === '') {
            if (preg_match('/^[\p{L}¿]/u', $linea)) {
                $introduccion[] = $linea;
            }
            continue;
        }
        if ($preguntasNumeradas && $numero === '' && str_starts_with($linea, '¿') &&
            !preg_match('/\p{Ll}/u', $linea)) {
            continue; // Cabecera repetida de la página.
        }

        $trozos = preg_split('/(?:\h+|^)(?:[☐□◻☑○◯⃣]|\[\h*\]|D(?=\h+\S))\h*/u', $linea);
        $enunciado = limpiarLineaEncuesta(array_shift($trozos));
        $opciones = [];
        $seguimiento = [];
        foreach ($trozos as $trozo) {
            // «Sí / No ¿Cómo la mejorarías?» es una elección y una respuesta libre.
            $partes = preg_split('/(?=¿)/u', limpiarLineaEncuesta($trozo), 2);
            if ($partes[0] !== '') {
                $opciones[] = trim($partes[0]);
                if (preg_match('/^(?:De otra manera|Otro lugar|Otra opini[oó]n|Otra opci[oó]n)$/iu', trim($partes[0]))) {
                    $seguimiento[] = 'Si has marcado «' . trim($partes[0]) . '», cuéntanos cuál.';
                }
            }
            if (!empty($partes[1])) {
                $seguimiento[] = $partes[1];
            }
        }

        $esPregunta = $numero !== '' || str_contains($enunciado, '¿') || str_contains($enunciado, '?')
            || preg_match('/^.{2,65}:\h*$/u', $enunciado) || preg_match('/^Puedes dibujar\b/iu', $enunciado);

        if (!$dentro && !$esPregunta && !$opciones) {
            // En los escaneos, antes de la introducción puede aparecer texto de las ilustraciones.
            if ($introduccion || preg_match('/^(?:Esta encuesta|La encuesta|Trabajamos|Queremos|Te invitamos)/iu', $enunciado)) {
                $introduccion[] = $enunciado;
            }
            continue;
        }

        if ($esPregunta) {
            $continuaPregunta = $pregunta && $numero === '' && !$esVineta && !$parrafo
                && !$pregunta['opciones'] && !preg_match('/[?.!:]$/u', $pregunta['enunciado'])
                && !str_starts_with($enunciado, '¿');
            if ($continuaPregunta) {
                $pregunta['enunciado'] .= ' ' . $enunciado;
            } else {
                $nivel = $numero === '' ? 0 : min(2, max(0, substr_count($numero, '.') - 1 - $apartado['nivel']));
                if ($pregunta && $numero === '' && ($esVineta ||
                    preg_match('/^¿(?:d[oó]nde|por qu[eé]|cu[aá]l|qu[eé] opinas)\?/iu', $enunciado))) {
                    $nivel = 1;
                }
                agregarPreguntaImportada($apartado, $pregunta, $total);
                $pregunta = nuevaPreguntaImportada($enunciado, $numero, $nivel);
            }
        } elseif ($enunciado !== '' && $pregunta) {
            if (preg_match('/^[a-z][.)]\h+(.+)$/iu', $enunciado, $grupo)) {
                $opciones[] = $grupo[1];
            } elseif (preg_match('/^DIBUJA\s+(?:o|y)\s+ESCRIBE|^Si tu respuesta/iu', $enunciado)) {
                $pregunta['ayuda'] = $enunciado;
            } elseif (!$parrafo && $pregunta['ayuda'] !== '' && preg_match('/^\p{Ll}/u', $enunciado)) {
                $pregunta['ayuda'] .= ' ' . $enunciado;
            } elseif (!$parrafo && !$pregunta['opciones'] && !preg_match('/[?.:]$/u', $pregunta['enunciado'])) {
                $pregunta['enunciado'] .= ' ' . $enunciado;
            } elseif (!$parrafo && !$opciones && $pregunta['opciones'] && preg_match('/^\p{Ll}/u', $enunciado)) {
                $ultima = count($pregunta['opciones']) - 1;
                $pregunta['opciones'][$ultima] .= ' ' . $enunciado;
            }
        }

        // Datos como «Niño / Niña» aparecen como dos casillas sin enunciado.
        $primeraFila = !$pregunta && count($opciones) >= 2;
        if ($primeraFila) {
            $etiqueta = in_array('Niño', $opciones, true) && in_array('Niña', $opciones, true) ? 'Niño o niña' : 'Selecciona una opción';
            $pregunta = nuevaPreguntaImportada($etiqueta, '', 0);
        }
        if ($pregunta) {
            $pregunta['opciones'] = array_merge($pregunta['opciones'], $opciones);
        }
        foreach ($seguimiento as $textoSeguimiento) {
            agregarPreguntaImportada($apartado, $pregunta, $total);
            $pregunta = nuevaPreguntaImportada($textoSeguimiento, '', $primeraFila ? 0 : 1);
        }
        $dentro = $dentro || $pregunta !== null;
        $parrafo = false;
    }

    agregarPreguntaImportada($apartado, $pregunta, $total);
    if ($apartado['preguntas']) {
        $secciones[] = $apartado;
    }
    if ($total === 0) {
        throw new InvalidArgumentException('No se han reconocido preguntas. Prueba con otra copia del PDF o crea el formulario a mano.');
    }

    if ($titulo === '') {
        $titulo = trim(str_replace(['_', '-'], ' ', pathinfo($nombreArchivo, PATHINFO_FILENAME)));
        if ($titulo === '' || !mb_check_encoding($titulo, 'UTF-8') || preg_match('/^archivo\s+[0-9a-f]/i', $titulo)) {
            $titulo = 'Encuesta importada';
        }
    }
    return [
        'titulo' => mb_substr($titulo, 0, 120),
        'descripcion' => mb_substr(implode(' ', $introduccion), 0, 1900),
        'secciones' => $secciones,
        'total_preguntas' => $total
    ];
}

function nuevoApartadoImportado($titulo, $numero = '', $nivel = 0)
{
    return ['titulo' => $titulo, 'numero' => $numero, 'nivel' => $nivel, 'descripcion' => '', 'preguntas' => []];
}

function nuevaPreguntaImportada($enunciado, $numero, $nivel)
{
    return ['enunciado' => $enunciado, 'numero' => $numero, 'nivel' => $nivel, 'ayuda' => '', 'opciones' => []];
}

// Las líneas para escribir y los puntos de relleno no forman parte del texto.
function limpiarLineaEncuesta($texto)
{
    $texto = preg_replace('/\h{2,}/u', ' ', $texto);
    return trim(preg_replace('/(?:[_.…—\-]{3,}|_+$).*$/u', '', $texto));
}

function esApartadoEncuestaPdf($texto, $numero, $dentro, $preguntasNumeradas, $tieneDescendientes)
{
    if (mb_strlen($texto) > 110 || preg_match('/[¿?:.!¡☐□◻☑○◯⃣]/u', $texto)) {
        return false;
    }
    if (preg_match('/^(?:apartado|subapartado|secci[oó]n)\b/iu', $texto)) {
        return true;
    }
    if ($numero !== '') {
        return $tieneDescendientes || (!preg_match('/\p{Ll}/u', $texto) && preg_match('/\p{Lu}{2,}/u', $texto));
    }
    if (!$dentro || $preguntasNumeradas || preg_match('/^(?:DIBUJA|ESCRIBE|Puedes|Gracias)\b/iu', $texto)) {
        return false;
    }

    // Los títulos de los recuadros suelen comenzar por una palabra en mayúsculas
    // o combinar palabras resaltadas con pequeñas palabras de enlace.
    return (bool)preg_match('/^\p{Lu}{3,}(?:\h|,|$)|^(?:[Ll]o|[Ee]l|[Ll]a|[Ll]os|[Ll]as)\h+\p{Lu}{3,}\b/u', $texto)
        || (bool)preg_match('/^(?:LO|EL|LA|LOS|LAS)\h+\p{Lu}{2,}\b/u', $texto);
}

function agregarPreguntaImportada(array &$apartado, ?array &$pregunta, int &$total)
{
    if (!$pregunta) {
        return;
    }
    $enunciado = $pregunta['enunciado'];
    if (preg_match('/^(.*?\?)\h+\((puedes\b.+)$/iu', $enunciado, $partes)) {
        $enunciado = $partes[1];
        $pregunta['ayuda'] = rtrim($partes[2], ')');
    }
    if (preg_match('/^Puedes dibujar$/iu', $enunciado)) {
        $pregunta['ayuda'] = 'En el formulario online puedes describir aquí tu dibujo.';
    }
    $opciones = array_values(array_unique($pregunta['opciones']));
    $tipo = 'texto_largo';

    $opcionesNormalizadas = array_map(function ($opcion) {
        return mb_strtolower(trim($opcion, " \t."));
    }, $opciones);
    if (preg_match('~\h+s[ií]\h*[/|]\h*no[.]?$~iu', $enunciado, $coincidencia)) {
        $enunciado = trim(substr($enunciado, 0, -strlen($coincidencia[0])));
        $tipo = 'si_no';
    } elseif (count($opciones) === 2 && in_array('no', $opcionesNormalizadas, true)
        && (in_array('sí', $opcionesNormalizadas, true) || in_array('si', $opcionesNormalizadas, true))) {
        $tipo = 'si_no';
    } elseif (count($opciones) >= 2) {
        $tipo = 'opcion_multiple';
        if (preg_match('/(?:elige|marca|selecciona)\h+(?:solo\h+)?una|(?:la|una) (?:única )?opción|^Niño o niña$|^¿Vives.*\bo\b.*\?$/iu', $enunciado)) {
            $tipo = 'opcion_unica';
        }
    } elseif (preg_match('/^fecha\b/iu', $enunciado)) {
        $tipo = 'fecha';
    } elseif (preg_match('/^edad\b|cu[aá]ntos a[nñ]os tienes/iu', $enunciado)) {
        $tipo = 'numero';
    } elseif (preg_match('/^(?:nombre|localidad|municipio|correo|curso|código postal)\b[^?]{0,35}:?$/iu', $enunciado)) {
        $tipo = 'texto';
    }

    $obligatoria = str_ends_with($enunciado, '*');
    $enunciado = trim(rtrim($enunciado, '*'));
    if ($enunciado !== '') {
        if ($total >= 120) {
            throw new InvalidArgumentException('Se han detectado más de 120 preguntas. Divide el PDF en varias encuestas.');
        }
        $pregunta['enunciado'] = $enunciado;
        $pregunta['tipo'] = $tipo;
        $pregunta['opciones'] = in_array($tipo, ['opcion_unica', 'opcion_multiple'], true) ? $opciones : [];
        $pregunta['obligatorio'] = $obligatoria;
        $pregunta['ancho'] = 'completo';
        $apartado['preguntas'][] = $pregunta;
        $total++;
    }
    $pregunta = null;
}

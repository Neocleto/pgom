<?php
// Etiquetas comunes a la página pública, las respuestas guardadas y el PDF.
function etiquetaNumeradaEncuesta(array $elemento, string $campo): string
{
    $numero = trim($elemento['numero'] ?? '');
    if ($numero === '') {
        return $elemento[$campo];
    }
    if (!preg_match('/[.)]$/u', $numero)) {
        $numero .= '.';
    }
    return $numero . ' ' . $elemento[$campo];
}

<?php
// Conserva los mensajes y sus adjuntos en un espacio privado por municipio.
class BuzonParticipacionModel
{
    private $conn;

    public function __construct(PDO $conexion)
    {
        $this->conn = $conexion;
    }

    public function guardarEnvio($codMun, $asunto, $mensaje, $adjunto)
    {
        // El texto y el archivo se guardan juntos, en una sola operación.
        $sql = "INSERT INTO pgom.buzon_participacion
                    (cod_mun, asunto, mensaje, nombre_adjunto, tipo_adjunto, archivo_adjunto)
                VALUES (:cod_mun, :asunto, :mensaje, :nombre, :tipo, decode(:archivo, 'base64'))
                RETURNING id";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':cod_mun' => $codMun,
            ':asunto' => $asunto,
            ':mensaje' => $mensaje,
            ':nombre' => $adjunto['nombre'] ?? null,
            ':tipo' => $adjunto['tipo'] ?? null,
            ':archivo' => $adjunto['contenido'] ?? null
        ]);

        return $stmt->fetchColumn();
    }

    public function guardarEstadoCorreo($id, $enviado)
    {
        $stmt = $this->conn->prepare("UPDATE pgom.buzon_participacion
            SET correo_enviado = :enviado WHERE id = :id");
        $stmt->bindValue(':enviado', $enviado, PDO::PARAM_BOOL);
        $stmt->bindValue(':id', $id);
        $stmt->execute();
    }

    public function listarEnvios($codMun, $desde)
    {
        // Pedimos un registro extra para saber si hay otra página.
        $sql = "SELECT id, asunto, mensaje, fecha_envio, nombre_adjunto, correo_enviado
                FROM pgom.buzon_participacion
                WHERE cod_mun = :cod_mun
                ORDER BY id DESC LIMIT 26 OFFSET :desde";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindValue(':cod_mun', $codMun);
        $stmt->bindValue(':desde', $desde, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function obtenerAdjunto($codMun, $id)
    {
        // La descarga siempre verifica el municipio además del ID.
        $sql = "SELECT nombre_adjunto, tipo_adjunto, encode(archivo_adjunto, 'base64') AS archivo
                FROM pgom.buzon_participacion
                WHERE cod_mun = :cod_mun AND id = :id AND archivo_adjunto IS NOT NULL";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([':cod_mun' => $codMun, ':id' => $id]);

        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}

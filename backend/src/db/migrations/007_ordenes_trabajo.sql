-- Orden de trabajo. Es el centro del dominio y tambien el registro historico:
-- no existe una tabla `historial`, el historial es la consulta de las ordenes
-- COMPLETADAS de un vehiculo.
--
-- reserva_id es NULLABLE porque un lubricentro atiende mayoritariamente por
-- llegada espontanea (walk-in); es UNIQUE para materializar el 1:0..1.
--
-- total lo calcula siempre el backend desde las lineas persistidas.
CREATE TABLE ordenes_trabajo (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id    INT UNSIGNED NOT NULL,
  vehiculo_id   INT UNSIGNED NOT NULL,
  reserva_id    INT UNSIGNED NULL,
  mecanico_id   INT UNSIGNED NULL,
  estado        ENUM('ABIERTA', 'EN_PROCESO', 'COMPLETADA', 'ANULADA') NOT NULL DEFAULT 'ABIERTA',
  kilometraje   INT UNSIGNED NULL,
  observaciones VARCHAR(1000) NULL,
  total         INT UNSIGNED NOT NULL DEFAULT 0,
  fecha_cierre  DATETIME NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ordenes_reserva (reserva_id),
  KEY idx_ordenes_estado (estado),
  KEY idx_ordenes_vehiculo_estado (vehiculo_id, estado),
  CONSTRAINT fk_ordenes_cliente  FOREIGN KEY (cliente_id)  REFERENCES clientes (id),
  CONSTRAINT fk_ordenes_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculos (id),
  CONSTRAINT fk_ordenes_reserva  FOREIGN KEY (reserva_id)  REFERENCES reservas (id),
  CONSTRAINT fk_ordenes_mecanico FOREIGN KEY (mecanico_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Reserva de hora. Cuelga del vehiculo y NO tiene cliente_id: el dueño se
-- obtiene por el vehiculo. La orden de trabajo si guarda cliente_id propio,
-- porque debe preservar quien pago aunque el vehiculo cambie de dueño.
CREATE TABLE reservas (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  vehiculo_id   INT UNSIGNED NOT NULL,
  fecha_hora    DATETIME NOT NULL,
  estado        ENUM('PENDIENTE', 'CUMPLIDA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
  observaciones VARCHAR(500) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reservas_fecha_hora (fecha_hora),
  CONSTRAINT fk_reservas_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculos (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

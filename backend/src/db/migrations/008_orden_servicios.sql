-- Linea de servicio de una orden.
-- nombre y precio son un SNAPSHOT: si mañana cambia el precio del catalogo,
-- el historial y el dashboard no deben alterarse retroactivamente.
-- Las lineas son inmutables: para corregir se borra y se vuelve a agregar.
CREATE TABLE orden_servicios (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  orden_id        INT UNSIGNED NOT NULL,
  servicio_id     INT UNSIGNED NOT NULL,
  nombre          VARCHAR(120) NOT NULL,
  precio_unitario INT UNSIGNED NOT NULL,
  cantidad        SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  subtotal        INT UNSIGNED AS (precio_unitario * cantidad) STORED,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_orden_servicios_orden    FOREIGN KEY (orden_id)    REFERENCES ordenes_trabajo (id) ON DELETE CASCADE,
  CONSTRAINT fk_orden_servicios_servicio FOREIGN KEY (servicio_id) REFERENCES servicios (id),
  CONSTRAINT ck_orden_servicios_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Linea de producto de una orden. Mismo snapshot de nombre y precio.
-- El stock se descuenta al AGREGAR la linea, no al cerrar la orden:
-- el producto sale de bodega cuando el mecanico lo toma.
CREATE TABLE orden_productos (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  orden_id        INT UNSIGNED NOT NULL,
  producto_id     INT UNSIGNED NOT NULL,
  nombre          VARCHAR(120) NOT NULL,
  precio_unitario INT UNSIGNED NOT NULL,
  cantidad        SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  subtotal        INT UNSIGNED AS (precio_unitario * cantidad) STORED,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_orden_productos_orden    FOREIGN KEY (orden_id)    REFERENCES ordenes_trabajo (id) ON DELETE CASCADE,
  CONSTRAINT fk_orden_productos_producto FOREIGN KEY (producto_id) REFERENCES productos (id),
  CONSTRAINT ck_orden_productos_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

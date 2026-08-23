-- Catalogo de productos con stock. El CHECK es la ultima linea de defensa
-- contra un descuento concurrente que deje el stock negativo.
CREATE TABLE productos (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(120) NOT NULL,
  descripcion  VARCHAR(300) NULL,
  precio       INT UNSIGNED NOT NULL,
  stock_actual INT NOT NULL DEFAULT 0,
  stock_minimo INT NOT NULL DEFAULT 0,
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_productos_nombre (nombre),
  CONSTRAINT ck_productos_stock_no_negativo CHECK (stock_actual >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

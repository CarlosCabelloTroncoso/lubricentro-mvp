-- Cliente del lubricentro. No es usuario del sistema: no hay portal publico.
-- Baja logica (activo = FALSE); nunca DELETE fisico, destruiria historial.
CREATE TABLE clientes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  rut        VARCHAR(12) NOT NULL,
  nombre     VARCHAR(120) NOT NULL,
  apellido   VARCHAR(120) NOT NULL,
  telefono   VARCHAR(20) NULL,
  email      VARCHAR(160) NULL,
  direccion  VARCHAR(200) NULL,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clientes_rut (rut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

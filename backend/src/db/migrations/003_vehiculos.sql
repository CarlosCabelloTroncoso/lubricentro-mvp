-- Vehiculo asociado a un cliente. La patente se guarda normalizada:
-- mayusculas, sin guiones ni espacios.
CREATE TABLE vehiculos (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id         INT UNSIGNED NOT NULL,
  patente            VARCHAR(8) NOT NULL,
  marca              VARCHAR(60) NOT NULL,
  modelo             VARCHAR(60) NOT NULL,
  anio               SMALLINT UNSIGNED NULL,
  color              VARCHAR(40) NULL,
  kilometraje_actual INT UNSIGNED NOT NULL DEFAULT 0,
  activo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vehiculos_patente (patente),
  CONSTRAINT fk_vehiculos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

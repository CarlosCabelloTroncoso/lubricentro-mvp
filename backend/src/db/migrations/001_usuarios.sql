-- Usuarios del back-office. El mecanico es un usuario con rol MECANICO,
-- no una tabla `tecnicos` aparte: necesita autenticarse igual.
CREATE TABLE usuarios (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  rol           ENUM('ADMIN', 'RECEPCIONISTA', 'MECANICO') NOT NULL,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

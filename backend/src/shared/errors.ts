/**
 * Errores de negocio como excepciones tipadas. Los services lanzan estas clases
 * y un unico errorHandler las traduce a respuesta HTTP. Asi ningun service
 * necesita conocer Express ni codigos de estado.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'No tiene permisos para realizar esta accion') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(recurso: string) {
    super(404, 'NOT_FOUND', `${recurso} no encontrado`);
  }
}

/** Choque con el estado actual: duplicados, transiciones invalidas, stock insuficiente. */
export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(409, 'CONFLICT', message, details);
  }
}

/**
 * Punto unico de traduccion de errores a HTTP.
 * Express 5 propaga los rechazos de handlers async hasta aca sin envoltorios.
 */
import type { Request, Response, NextFunction } from 'express';
import { AppError, NotFoundError } from '../shared/errors';
import { isProduction } from '../config/env';

/** Errores de MySQL que corresponden a una respuesta de negocio, no a un 500. */
function traducirErrorMysql(error: { code?: string; sqlMessage?: string }): AppError | null {
  switch (error.code) {
    case 'ER_DUP_ENTRY':
      return new AppError(409, 'CONFLICT', 'Ya existe un registro con ese valor unico');
    case 'ER_NO_REFERENCED_ROW_2':
      return new AppError(400, 'BAD_REQUEST', 'Referencia a un registro inexistente');
    case 'ER_ROW_IS_REFERENCED_2':
      return new AppError(409, 'CONFLICT', 'El registro esta en uso y no puede eliminarse');
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return new AppError(409, 'CONFLICT', 'La operacion viola una restriccion de integridad');
    default:
      return null;
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Recurso ${req.method} ${req.path}`));
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  const appError =
    error instanceof AppError
      ? error
      : traducirErrorMysql(error as { code?: string }) ?? null;

  if (appError) {
    res.status(appError.status).json({
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details ? { details: appError.details } : {}),
      },
    });
    return;
  }

  // Error no previsto: se registra completo en el servidor y se responde
  // generico, sin filtrar stack ni detalles internos al cliente.
  console.error('Error no controlado:', error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      ...(isProduction ? {} : { details: String(error) }),
    },
  });
}

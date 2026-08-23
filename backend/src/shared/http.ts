/**
 * Envelope uniforme de respuesta: { data, meta? } en exito,
 * { error: { code, message, details? } } en fallo.
 */
import type { Response } from 'express';

export interface Meta {
  total: number;
  page: number;
  limit: number;
}

export function ok<T>(res: Response, data: T, meta?: Meta): void {
  res.json(meta ? { data, meta } : { data });
}

export function creado<T>(res: Response, data: T): void {
  res.status(201).json({ data });
}

export function sinContenido(res: Response): void {
  res.status(204).end();
}

/** Parametros de paginacion comunes a todos los listados. */
export function leerPaginacion(query: Record<string, unknown>): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

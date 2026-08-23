/**
 * Valida la FORMA del request con Zod (lo que se ve en el body/query/params).
 * La validacion de ESTADO (lo que exige consultar la BD) vive en los services.
 */
import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import { BadRequestError } from '../shared/errors';

type Fuente = 'body' | 'query' | 'params';

export function validate(schema: ZodType, fuente: Fuente = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const resultado = schema.safeParse(req[fuente]);

    if (!resultado.success) {
      const details = resultado.error.issues.map((issue) => ({
        campo: issue.path.join('.'),
        mensaje: issue.message,
      }));
      next(new BadRequestError('Datos invalidos', details));
      return;
    }

    // req.query y req.params son getters de solo lectura en Express 5:
    // el resultado parseado se deja en una propiedad propia.
    if (fuente === 'body') {
      req.body = resultado.data;
    } else {
      Object.defineProperty(req, `${fuente}Valid`, { value: resultado.data, writable: true });
    }
    next();
  };
}

/** Accede a lo parseado por validate() para query o params. */
export function datosValidados<T>(req: Request, fuente: Exclude<Fuente, 'body'>): T {
  return (req as unknown as Record<string, T>)[`${fuente}Valid`] ?? (req[fuente] as unknown as T);
}

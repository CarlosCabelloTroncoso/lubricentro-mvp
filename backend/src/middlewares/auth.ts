/**
 * Autenticacion y autorizacion.
 *
 * El JWT viaja en una cookie HttpOnly: el frontend nunca lo ve y no hay nada
 * en localStorage. La autorizacion gruesa (por rol) vive aca; la fina
 * (un mecanico solo toca sus ordenes) vive en el service, porque necesita
 * consultar el recurso.
 */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../shared/errors';
import type { Rol } from '../shared/roles';

export const COOKIE_TOKEN = 'token';

export interface TokenPayload {
  sub: number;
  email: string;
  rol: Rol;
}

export function firmarToken(payload: TokenPayload, expiraEnSegundos: number): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: expiraEnSegundos });
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_TOKEN];
  if (!token) {
    next(new UnauthorizedError());
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as unknown as TokenPayload;
    req.usuario = { id: payload.sub, email: payload.email, rol: payload.rol };
    next();
  } catch {
    // No se distingue entre token expirado, alterado o mal formado:
    // el cliente no gana nada con el detalle y el atacante si.
    next(new UnauthorizedError('Sesion invalida o expirada'));
  }
}

export function authorize(...roles: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.usuario.rol)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}

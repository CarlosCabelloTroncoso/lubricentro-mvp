import type { Request, Response } from 'express';
import { ok } from '../../shared/http';
import { isProduction, JWT_EXPIRES_IN_SECONDS } from '../../config/env';
import { COOKIE_TOKEN } from '../../middlewares/auth';
import * as authService from './auth.service';

/**
 * La cookie es HttpOnly (JS no la lee) y SameSite=Lax.
 * `secure` solo en produccion: en desarrollo se sirve por http.
 */
const opcionesCookie = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProduction,
  maxAge: JWT_EXPIRES_IN_SECONDS * 1000,
  path: '/',
};

export async function login(req: Request, res: Response): Promise<void> {
  const { token, usuario } = await authService.login(req.body);
  res.cookie(COOKIE_TOKEN, token, opcionesCookie);
  ok(res, usuario);
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(COOKIE_TOKEN, { ...opcionesCookie, maxAge: undefined });
  ok(res, { mensaje: 'Sesion cerrada' });
}

export async function me(req: Request, res: Response): Promise<void> {
  const usuario = await authService.obtenerSesion(req.usuario!.id);
  ok(res, usuario);
}

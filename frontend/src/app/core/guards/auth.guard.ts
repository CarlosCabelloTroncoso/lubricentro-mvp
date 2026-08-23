import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const usuario = await auth.verificarSesion();
  if (usuario) return true;

  return router.createUrlTree(['/login']);
};

/** Ruta /login: si ya hay sesion, no tiene sentido mostrar el formulario. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const usuario = await auth.verificarSesion();
  if (!usuario) return true;

  return router.createUrlTree(['/']);
};

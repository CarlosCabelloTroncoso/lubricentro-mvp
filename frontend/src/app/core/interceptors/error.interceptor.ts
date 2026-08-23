import { inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import type { ApiErrorBody } from '../models/common.model';

/**
 * Traduce el envelope { error: { code, message } } del backend a un Toast.
 * `GET /auth/me` con 401 es el chequeo normal de sesion al arrancar la app:
 * no es un error que el usuario deba ver.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const esChequeoSesion = error.status === 401 && req.url.includes('/auth/me');
        // El login muestra su propio mensaje inline; el toast duplicaria el error.
        const esLoginFallido = req.url.includes('/auth/login');

        if (!esChequeoSesion && !esLoginFallido) {
          const cuerpo = error.error as ApiErrorBody | undefined;
          const mensaje = cuerpo?.error?.message ?? 'Ocurrio un error inesperado';
          messageService.add({
            severity: 'error',
            summary: cuerpo?.error?.code ?? `Error ${error.status}`,
            detail: mensaje,
            life: 5000,
          });
        }
      }
      return throwError(() => error);
    }),
  );
};

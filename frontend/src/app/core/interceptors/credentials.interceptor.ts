import type { HttpInterceptorFn } from '@angular/common/http';

/**
 * El JWT viaja en una cookie HttpOnly: el navegador la maneja, pero fetch/XHR
 * necesitan `credentials: 'include'` explicito para enviarla y para aceptar
 * el Set-Cookie de la respuesta de login.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ withCredentials: true }));
};

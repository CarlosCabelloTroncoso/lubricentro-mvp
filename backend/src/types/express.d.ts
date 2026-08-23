import type { Rol } from '../shared/roles';

/**
 * El middleware `authenticate` deja el usuario del token en req.usuario.
 * Se declara aca para que este tipado en controllers y services.
 */
declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: number;
        email: string;
        rol: Rol;
      };
    }
  }
}

export {};

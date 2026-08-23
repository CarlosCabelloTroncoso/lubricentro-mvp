export type Rol = 'ADMIN' | 'RECEPCIONISTA' | 'MECANICO';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface LoginInput {
  email: string;
  password: string;
}

import bcrypt from 'bcryptjs';
import { UnauthorizedError } from '../../shared/errors';
import { firmarToken } from '../../middlewares/auth';
import { JWT_EXPIRES_IN_SECONDS } from '../../config/env';
import * as usuariosRepo from '../usuarios/usuarios.repository';
import type { LoginInput } from './auth.schemas';
import type { Rol } from '../../shared/roles';

export interface UsuarioPublico {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
}

export async function login(
  input: LoginInput,
): Promise<{ token: string; usuario: UsuarioPublico }> {
  const usuario = await usuariosRepo.buscarPorEmail(input.email);

  // Mismo mensaje para email inexistente, password incorrecta y usuario
  // desactivado: no se le confirma a nadie que un email existe en el sistema.
  const credencialesInvalidas = new UnauthorizedError('Credenciales invalidas');
  if (!usuario || !usuario.activo) throw credencialesInvalidas;

  const coincide = await bcrypt.compare(input.password, usuario.password_hash);
  if (!coincide) throw credencialesInvalidas;

  const token = firmarToken(
    { sub: usuario.id, email: usuario.email, rol: usuario.rol },
    JWT_EXPIRES_IN_SECONDS,
  );

  return {
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
  };
}

/** Rehidrata la sesion del frontend a partir de la cookie. */
export async function obtenerSesion(usuarioId: number): Promise<UsuarioPublico> {
  const usuario = await usuariosRepo.buscarPorId(usuarioId);
  if (!usuario || !usuario.activo) throw new UnauthorizedError('Sesion invalida');
  return { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol };
}

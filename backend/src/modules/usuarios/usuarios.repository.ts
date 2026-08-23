import type { RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool';
import type { Rol } from '../../shared/roles';

export interface UsuarioRow extends RowDataPacket {
  id: number;
  nombre: string;
  email: string;
  password_hash: string;
  rol: Rol;
  activo: number;
}

export async function buscarPorEmail(email: string): Promise<UsuarioRow | null> {
  const [filas] = await pool.query<UsuarioRow[]>(
    'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = ?',
    [email],
  );
  return filas[0] ?? null;
}

export async function buscarPorId(id: number): Promise<UsuarioRow | null> {
  const [filas] = await pool.query<UsuarioRow[]>(
    'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE id = ?',
    [id],
  );
  return filas[0] ?? null;
}

export async function listarMecanicos(): Promise<RowDataPacket[]> {
  const [filas] = await pool.query<RowDataPacket[]>(
    `SELECT id, nombre, email, rol FROM usuarios
     WHERE activo = TRUE AND rol IN ('MECANICO', 'ADMIN')
     ORDER BY nombre`,
  );
  return filas;
}

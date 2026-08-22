import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool';
import type { CrearServicioInput, ActualizarServicioInput, ListarServiciosQuery } from './servicios.schemas';

export interface ServicioRow extends RowDataPacket {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  activo: number;
}

const CAMPOS = 'id, nombre, descripcion, precio, activo';

export async function listar(
  filtros: ListarServiciosQuery,
  offset: number,
): Promise<{ items: ServicioRow[]; total: number }> {
  const condiciones: string[] = [];
  const valores: unknown[] = [];

  if (filtros.q) {
    condiciones.push('nombre LIKE ?');
    valores.push(`%${filtros.q}%`);
  }
  if (filtros.activo !== undefined) {
    condiciones.push('activo = ?');
    valores.push(filtros.activo === 'true');
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [items] = await pool.query<ServicioRow[]>(
    `SELECT ${CAMPOS} FROM servicios ${where} ORDER BY nombre LIMIT ? OFFSET ?`,
    [...valores, filtros.limit, offset],
  );
  const [conteo] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM servicios ${where}`,
    valores,
  );
  return { items, total: Number(conteo[0]?.total ?? 0) };
}

export async function buscarPorId(id: number): Promise<ServicioRow | null> {
  const [filas] = await pool.query<ServicioRow[]>(
    `SELECT ${CAMPOS} FROM servicios WHERE id = ?`,
    [id],
  );
  return filas[0] ?? null;
}

export async function crear(input: CrearServicioInput): Promise<number> {
  const [resultado] = await pool.query<ResultSetHeader>(
    'INSERT INTO servicios (nombre, descripcion, precio) VALUES (?, ?, ?)',
    [input.nombre, input.descripcion ?? null, input.precio],
  );
  return resultado.insertId;
}

export async function actualizar(id: number, input: ActualizarServicioInput): Promise<void> {
  const mapa: Record<string, unknown> = {
    nombre: input.nombre,
    descripcion: input.descripcion,
    precio: input.precio,
  };
  const asignaciones: string[] = [];
  const valores: unknown[] = [];
  for (const [columna, valor] of Object.entries(mapa)) {
    if (valor !== undefined) {
      asignaciones.push(`${columna} = ?`);
      valores.push(valor);
    }
  }
  if (asignaciones.length === 0) return;
  valores.push(id);
  await pool.query(`UPDATE servicios SET ${asignaciones.join(', ')} WHERE id = ?`, valores);
}

export async function cambiarEstado(id: number, activo: boolean): Promise<void> {
  await pool.query('UPDATE servicios SET activo = ? WHERE id = ?', [activo, id]);
}

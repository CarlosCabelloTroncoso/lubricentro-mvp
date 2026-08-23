import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool';
import type { CrearClienteInput, ActualizarClienteInput, ListarClientesQuery } from './clientes.schemas';

export interface ClienteRow extends RowDataPacket {
  id: number;
  rut: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  activo: number;
  created_at: Date;
}

const CAMPOS = 'id, rut, nombre, apellido, telefono, email, direccion, activo, created_at';

export async function listar(
  filtros: ListarClientesQuery,
  offset: number,
): Promise<{ items: ClienteRow[]; total: number }> {
  const condiciones: string[] = [];
  const valores: unknown[] = [];

  if (filtros.q) {
    condiciones.push('(nombre LIKE ? OR apellido LIKE ? OR rut LIKE ?)');
    const patron = `%${filtros.q}%`;
    valores.push(patron, patron, patron);
  }
  if (filtros.activo !== undefined) {
    condiciones.push('activo = ?');
    valores.push(filtros.activo === 'true');
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [items] = await pool.query<ClienteRow[]>(
    `SELECT ${CAMPOS} FROM clientes ${where} ORDER BY apellido, nombre LIMIT ? OFFSET ?`,
    [...valores, filtros.limit, offset],
  );
  const [conteo] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM clientes ${where}`,
    valores,
  );

  return { items, total: Number(conteo[0]?.total ?? 0) };
}

export async function buscarPorId(id: number): Promise<ClienteRow | null> {
  const [filas] = await pool.query<ClienteRow[]>(
    `SELECT ${CAMPOS} FROM clientes WHERE id = ?`,
    [id],
  );
  return filas[0] ?? null;
}

export async function buscarPorRut(rut: string): Promise<ClienteRow | null> {
  const [filas] = await pool.query<ClienteRow[]>(
    `SELECT ${CAMPOS} FROM clientes WHERE rut = ?`,
    [rut],
  );
  return filas[0] ?? null;
}

export async function crear(input: CrearClienteInput): Promise<number> {
  const [resultado] = await pool.query<ResultSetHeader>(
    `INSERT INTO clientes (rut, nombre, apellido, telefono, email, direccion)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.rut,
      input.nombre,
      input.apellido,
      input.telefono ?? null,
      input.email ?? null,
      input.direccion ?? null,
    ],
  );
  return resultado.insertId;
}

export async function actualizar(id: number, input: ActualizarClienteInput): Promise<void> {
  // Se construye el SET solo con los campos presentes; los nombres de columna
  // salen de una lista fija, nunca del input del usuario.
  const columnas: Array<keyof ActualizarClienteInput> = [
    'rut', 'nombre', 'apellido', 'telefono', 'email', 'direccion',
  ];
  const asignaciones: string[] = [];
  const valores: unknown[] = [];

  for (const columna of columnas) {
    if (input[columna] !== undefined) {
      asignaciones.push(`${columna} = ?`);
      valores.push(input[columna]);
    }
  }
  if (asignaciones.length === 0) return;

  valores.push(id);
  await pool.query(`UPDATE clientes SET ${asignaciones.join(', ')} WHERE id = ?`, valores);
}

/** Baja logica. Nunca DELETE fisico: destruiria el historial de ordenes. */
export async function desactivar(id: number): Promise<void> {
  await pool.query('UPDATE clientes SET activo = FALSE WHERE id = ?', [id]);
}

export async function reactivar(id: number): Promise<void> {
  await pool.query('UPDATE clientes SET activo = TRUE WHERE id = ?', [id]);
}

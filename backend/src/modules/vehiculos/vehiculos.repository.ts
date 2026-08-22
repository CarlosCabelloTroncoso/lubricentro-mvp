import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../db/pool';
import type { CrearVehiculoInput, ActualizarVehiculoInput, ListarVehiculosQuery } from './vehiculos.schemas';

export interface VehiculoRow extends RowDataPacket {
  id: number;
  cliente_id: number;
  patente: string;
  marca: string;
  modelo: string;
  anio: number | null;
  color: string | null;
  kilometraje_actual: number;
  activo: number;
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_rut: string;
}

const SELECT_BASE = `
  SELECT v.id, v.cliente_id, v.patente, v.marca, v.modelo, v.anio, v.color,
         v.kilometraje_actual, v.activo,
         c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, c.rut AS cliente_rut
  FROM vehiculos v
  JOIN clientes c ON c.id = v.cliente_id`;

export async function listar(
  filtros: ListarVehiculosQuery,
  offset: number,
): Promise<{ items: VehiculoRow[]; total: number }> {
  const condiciones: string[] = [];
  const valores: unknown[] = [];

  if (filtros.q) {
    condiciones.push('(v.patente LIKE ? OR v.marca LIKE ? OR v.modelo LIKE ?)');
    const patron = `%${filtros.q}%`;
    valores.push(patron, patron, patron);
  }
  if (filtros.clienteId) {
    condiciones.push('v.cliente_id = ?');
    valores.push(filtros.clienteId);
  }
  if (filtros.activo !== undefined) {
    condiciones.push('v.activo = ?');
    valores.push(filtros.activo === 'true');
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [items] = await pool.query<VehiculoRow[]>(
    `${SELECT_BASE} ${where} ORDER BY v.patente LIMIT ? OFFSET ?`,
    [...valores, filtros.limit, offset],
  );
  const [conteo] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM vehiculos v ${where}`,
    valores,
  );

  return { items, total: Number(conteo[0]?.total ?? 0) };
}

export async function buscarPorId(id: number): Promise<VehiculoRow | null> {
  const [filas] = await pool.query<VehiculoRow[]>(`${SELECT_BASE} WHERE v.id = ?`, [id]);
  return filas[0] ?? null;
}

export async function buscarPorPatente(patente: string): Promise<VehiculoRow | null> {
  const [filas] = await pool.query<VehiculoRow[]>(`${SELECT_BASE} WHERE v.patente = ?`, [patente]);
  return filas[0] ?? null;
}

export async function crear(input: CrearVehiculoInput): Promise<number> {
  const [resultado] = await pool.query<ResultSetHeader>(
    `INSERT INTO vehiculos (cliente_id, patente, marca, modelo, anio, color, kilometraje_actual)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.clienteId,
      input.patente,
      input.marca,
      input.modelo,
      input.anio ?? null,
      input.color ?? null,
      input.kilometrajeActual ?? 0,
    ],
  );
  return resultado.insertId;
}

export async function actualizar(id: number, input: ActualizarVehiculoInput): Promise<void> {
  const mapa: Record<string, unknown> = {
    cliente_id: input.clienteId,
    patente: input.patente,
    marca: input.marca,
    modelo: input.modelo,
    anio: input.anio,
    color: input.color,
    kilometraje_actual: input.kilometrajeActual,
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
  await pool.query(`UPDATE vehiculos SET ${asignaciones.join(', ')} WHERE id = ?`, valores);
}

export async function desactivar(id: number): Promise<void> {
  await pool.query('UPDATE vehiculos SET activo = FALSE WHERE id = ?', [id]);
}

export async function reactivar(id: number): Promise<void> {
  await pool.query('UPDATE vehiculos SET activo = TRUE WHERE id = ?', [id]);
}

/**
 * El kilometraje del vehiculo solo avanza: se actualiza al cerrar una orden
 * y nunca retrocede aunque el mecanico anote un valor menor por error.
 */
export async function actualizarKilometraje(
  cx: PoolConnection,
  id: number,
  kilometraje: number,
): Promise<void> {
  await cx.query(
    'UPDATE vehiculos SET kilometraje_actual = ? WHERE id = ? AND kilometraje_actual < ?',
    [kilometraje, id, kilometraje],
  );
}

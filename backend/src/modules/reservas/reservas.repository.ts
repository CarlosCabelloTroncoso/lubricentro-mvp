import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../db/pool';
import type {
  ActualizarReservaInput,
  CrearReservaInput,
  EstadoReserva,
  ListarReservasQuery,
} from './reservas.schemas';

export interface ReservaRow extends RowDataPacket {
  id: number;
  vehiculo_id: number;
  fecha_hora: Date;
  estado: EstadoReserva;
  observaciones: string | null;
  patente: string;
  marca: string;
  modelo: string;
  cliente_id: number;
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_telefono: string | null;
}

const SELECT_BASE = `
  SELECT r.id, r.vehiculo_id, r.fecha_hora, r.estado, r.observaciones,
         v.patente, v.marca, v.modelo,
         c.id AS cliente_id, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
         c.telefono AS cliente_telefono
  FROM reservas r
  JOIN vehiculos v ON v.id = r.vehiculo_id
  JOIN clientes c  ON c.id = v.cliente_id`;

export async function listar(
  filtros: ListarReservasQuery,
  offset: number,
): Promise<{ items: ReservaRow[]; total: number }> {
  const condiciones: string[] = [];
  const valores: unknown[] = [];

  if (filtros.estado) {
    condiciones.push('r.estado = ?');
    valores.push(filtros.estado);
  }
  if (filtros.vehiculoId) {
    condiciones.push('r.vehiculo_id = ?');
    valores.push(filtros.vehiculoId);
  }
  if (filtros.desde) {
    condiciones.push('r.fecha_hora >= ?');
    valores.push(filtros.desde);
  }
  if (filtros.hasta) {
    condiciones.push('r.fecha_hora <= ?');
    valores.push(filtros.hasta);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [items] = await pool.query<ReservaRow[]>(
    `${SELECT_BASE} ${where} ORDER BY r.fecha_hora ASC LIMIT ? OFFSET ?`,
    [...valores, filtros.limit, offset],
  );
  const [conteo] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM reservas r ${where}`,
    valores,
  );
  return { items, total: Number(conteo[0]?.total ?? 0) };
}

export async function buscarPorId(id: number): Promise<ReservaRow | null> {
  const [filas] = await pool.query<ReservaRow[]>(`${SELECT_BASE} WHERE r.id = ?`, [id]);
  return filas[0] ?? null;
}

export async function crear(input: CrearReservaInput): Promise<number> {
  const [resultado] = await pool.query<ResultSetHeader>(
    'INSERT INTO reservas (vehiculo_id, fecha_hora, observaciones) VALUES (?, ?, ?)',
    [input.vehiculoId, input.fechaHora, input.observaciones ?? null],
  );
  return resultado.insertId;
}

export async function actualizar(id: number, input: ActualizarReservaInput): Promise<void> {
  const mapa: Record<string, unknown> = {
    fecha_hora: input.fechaHora,
    observaciones: input.observaciones,
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
  await pool.query(`UPDATE reservas SET ${asignaciones.join(', ')} WHERE id = ?`, valores);
}

/**
 * Recibe la conexion porque marcar la reserva como CUMPLIDA forma parte de la
 * transaccion que cierra la orden de trabajo.
 */
export async function cambiarEstado(
  cx: PoolConnection,
  id: number,
  estado: EstadoReserva,
): Promise<void> {
  await cx.query('UPDATE reservas SET estado = ? WHERE id = ?', [estado, id]);
}

export async function cambiarEstadoSimple(id: number, estado: EstadoReserva): Promise<void> {
  await pool.query('UPDATE reservas SET estado = ? WHERE id = ?', [estado, id]);
}

/** Reservas pendientes del dia en curso. Alimenta el dashboard. */
export async function pendientesDeHoy(): Promise<ReservaRow[]> {
  const [filas] = await pool.query<ReservaRow[]>(
    `${SELECT_BASE}
     WHERE r.estado = 'PENDIENTE' AND DATE(r.fecha_hora) = CURDATE()
     ORDER BY r.fecha_hora ASC`,
  );
  return filas;
}

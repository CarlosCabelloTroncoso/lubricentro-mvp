import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../../db/pool';
import type { ActualizarOrdenInput, EstadoOrden, ListarOrdenesQuery } from './ordenes.schemas';

export interface OrdenRow extends RowDataPacket {
  id: number;
  cliente_id: number;
  vehiculo_id: number;
  reserva_id: number | null;
  mecanico_id: number | null;
  estado: EstadoOrden;
  kilometraje: number | null;
  observaciones: string | null;
  total: number;
  fecha_cierre: Date | null;
  created_at: Date;
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_rut: string;
  patente: string;
  marca: string;
  modelo: string;
  mecanico_nombre: string | null;
}

export interface LineaRow extends RowDataPacket {
  id: number;
  orden_id: number;
  nombre: string;
  precio_unitario: number;
  cantidad: number;
  subtotal: number;
  servicio_id?: number;
  producto_id?: number;
}

const SELECT_BASE = `
  SELECT o.id, o.cliente_id, o.vehiculo_id, o.reserva_id, o.mecanico_id, o.estado,
         o.kilometraje, o.observaciones, o.total, o.fecha_cierre, o.created_at,
         c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, c.rut AS cliente_rut,
         v.patente, v.marca, v.modelo,
         m.nombre AS mecanico_nombre
  FROM ordenes_trabajo o
  JOIN clientes c  ON c.id = o.cliente_id
  JOIN vehiculos v ON v.id = o.vehiculo_id
  LEFT JOIN usuarios m ON m.id = o.mecanico_id`;

export async function listar(
  filtros: ListarOrdenesQuery,
  offset: number,
): Promise<{ items: OrdenRow[]; total: number }> {
  const condiciones: string[] = [];
  const valores: unknown[] = [];

  if (filtros.estado) {
    condiciones.push('o.estado = ?');
    valores.push(filtros.estado);
  }
  if (filtros.vehiculoId) {
    condiciones.push('o.vehiculo_id = ?');
    valores.push(filtros.vehiculoId);
  }
  if (filtros.clienteId) {
    condiciones.push('o.cliente_id = ?');
    valores.push(filtros.clienteId);
  }
  if (filtros.mecanicoId) {
    condiciones.push('o.mecanico_id = ?');
    valores.push(filtros.mecanicoId);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [items] = await pool.query<OrdenRow[]>(
    `${SELECT_BASE} ${where} ORDER BY o.id DESC LIMIT ? OFFSET ?`,
    [...valores, filtros.limit, offset],
  );
  const [conteo] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ordenes_trabajo o ${where}`,
    valores,
  );
  return { items, total: Number(conteo[0]?.total ?? 0) };
}

export async function buscarPorId(id: number): Promise<OrdenRow | null> {
  const [filas] = await pool.query<OrdenRow[]>(`${SELECT_BASE} WHERE o.id = ?`, [id]);
  return filas[0] ?? null;
}

export async function buscarPorReserva(reservaId: number): Promise<OrdenRow | null> {
  const [filas] = await pool.query<OrdenRow[]>(`${SELECT_BASE} WHERE o.reserva_id = ?`, [reservaId]);
  return filas[0] ?? null;
}

export async function crear(datos: {
  clienteId: number;
  vehiculoId: number;
  reservaId: number | null;
  mecanicoId: number | null;
  kilometraje: number | null;
  observaciones: string | null;
}): Promise<number> {
  const [resultado] = await pool.query<ResultSetHeader>(
    `INSERT INTO ordenes_trabajo
       (cliente_id, vehiculo_id, reserva_id, mecanico_id, kilometraje, observaciones)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      datos.clienteId,
      datos.vehiculoId,
      datos.reservaId,
      datos.mecanicoId,
      datos.kilometraje,
      datos.observaciones,
    ],
  );
  return resultado.insertId;
}

export async function actualizarDatos(id: number, input: ActualizarOrdenInput): Promise<void> {
  const mapa: Record<string, unknown> = {
    mecanico_id: input.mecanicoId,
    kilometraje: input.kilometraje,
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
  await pool.query(`UPDATE ordenes_trabajo SET ${asignaciones.join(', ')} WHERE id = ?`, valores);
}

export async function cambiarEstado(
  cx: PoolConnection,
  id: number,
  estado: EstadoOrden,
  cerrar: boolean,
): Promise<void> {
  const fechaCierre = cerrar ? 'NOW()' : 'NULL';
  await cx.query(
    `UPDATE ordenes_trabajo SET estado = ?, fecha_cierre = ${fechaCierre} WHERE id = ?`,
    [estado, id],
  );
}

/**
 * El total lo calcula siempre el backend sumando las lineas persistidas.
 * El cliente nunca lo envia.
 */
export async function recalcularTotal(cx: PoolConnection, ordenId: number): Promise<void> {
  await cx.query(
    `UPDATE ordenes_trabajo SET total = (
       (SELECT COALESCE(SUM(subtotal), 0) FROM orden_servicios WHERE orden_id = ?) +
       (SELECT COALESCE(SUM(subtotal), 0) FROM orden_productos WHERE orden_id = ?)
     ) WHERE id = ?`,
    [ordenId, ordenId, ordenId],
  );
}

export async function listarServiciosDeOrden(ordenId: number): Promise<LineaRow[]> {
  const [filas] = await pool.query<LineaRow[]>(
    `SELECT id, orden_id, servicio_id, nombre, precio_unitario, cantidad, subtotal
     FROM orden_servicios WHERE orden_id = ? ORDER BY id`,
    [ordenId],
  );
  return filas;
}

export async function listarProductosDeOrden(ordenId: number): Promise<LineaRow[]> {
  const [filas] = await pool.query<LineaRow[]>(
    `SELECT id, orden_id, producto_id, nombre, precio_unitario, cantidad, subtotal
     FROM orden_productos WHERE orden_id = ? ORDER BY id`,
    [ordenId],
  );
  return filas;
}

export async function insertarLineaServicio(
  cx: PoolConnection,
  datos: { ordenId: number; servicioId: number; nombre: string; precio: number; cantidad: number },
): Promise<number> {
  const [resultado] = await cx.query<ResultSetHeader>(
    `INSERT INTO orden_servicios (orden_id, servicio_id, nombre, precio_unitario, cantidad)
     VALUES (?, ?, ?, ?, ?)`,
    [datos.ordenId, datos.servicioId, datos.nombre, datos.precio, datos.cantidad],
  );
  return resultado.insertId;
}

export async function insertarLineaProducto(
  cx: PoolConnection,
  datos: { ordenId: number; productoId: number; nombre: string; precio: number; cantidad: number },
): Promise<number> {
  const [resultado] = await cx.query<ResultSetHeader>(
    `INSERT INTO orden_productos (orden_id, producto_id, nombre, precio_unitario, cantidad)
     VALUES (?, ?, ?, ?, ?)`,
    [datos.ordenId, datos.productoId, datos.nombre, datos.precio, datos.cantidad],
  );
  return resultado.insertId;
}

export async function buscarLineaServicio(
  cx: PoolConnection,
  ordenId: number,
  lineaId: number,
): Promise<LineaRow | null> {
  const [filas] = await cx.query<LineaRow[]>(
    'SELECT * FROM orden_servicios WHERE id = ? AND orden_id = ?',
    [lineaId, ordenId],
  );
  return filas[0] ?? null;
}

export async function buscarLineaProducto(
  cx: PoolConnection,
  ordenId: number,
  lineaId: number,
): Promise<LineaRow | null> {
  const [filas] = await cx.query<LineaRow[]>(
    'SELECT * FROM orden_productos WHERE id = ? AND orden_id = ?',
    [lineaId, ordenId],
  );
  return filas[0] ?? null;
}

export async function eliminarLineaServicio(cx: PoolConnection, lineaId: number): Promise<void> {
  await cx.query('DELETE FROM orden_servicios WHERE id = ?', [lineaId]);
}

export async function eliminarLineaProducto(cx: PoolConnection, lineaId: number): Promise<void> {
  await cx.query('DELETE FROM orden_productos WHERE id = ?', [lineaId]);
}

/** Todas las lineas de producto de una orden, para reponer stock al anularla. */
export async function lineasProductoParaReversion(
  cx: PoolConnection,
  ordenId: number,
): Promise<LineaRow[]> {
  const [filas] = await cx.query<LineaRow[]>(
    'SELECT id, producto_id, cantidad FROM orden_productos WHERE orden_id = ?',
    [ordenId],
  );
  return filas;
}

/**
 * Historial de un vehiculo: no existe tabla `historial`, son sus ordenes
 * completadas ordenadas de la mas reciente a la mas antigua.
 */
export async function historialPorVehiculo(vehiculoId: number): Promise<OrdenRow[]> {
  const [filas] = await pool.query<OrdenRow[]>(
    `${SELECT_BASE} WHERE o.vehiculo_id = ? AND o.estado = 'COMPLETADA'
     ORDER BY o.fecha_cierre DESC, o.id DESC`,
    [vehiculoId],
  );
  return filas;
}

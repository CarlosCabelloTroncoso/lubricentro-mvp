import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../../db/pool';
import type { CrearProductoInput, ActualizarProductoInput, ListarProductosQuery } from './productos.schemas';

export interface ProductoRow extends RowDataPacket {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock_actual: number;
  stock_minimo: number;
  activo: number;
}

const CAMPOS = 'id, nombre, descripcion, precio, stock_actual, stock_minimo, activo';

export async function listar(
  filtros: ListarProductosQuery,
  offset: number,
): Promise<{ items: ProductoRow[]; total: number }> {
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
  if (filtros.bajoMinimo === 'true') {
    condiciones.push('stock_actual <= stock_minimo');
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [items] = await pool.query<ProductoRow[]>(
    `SELECT ${CAMPOS} FROM productos ${where} ORDER BY nombre LIMIT ? OFFSET ?`,
    [...valores, filtros.limit, offset],
  );
  const [conteo] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM productos ${where}`,
    valores,
  );
  return { items, total: Number(conteo[0]?.total ?? 0) };
}

export async function buscarPorId(id: number): Promise<ProductoRow | null> {
  const [filas] = await pool.query<ProductoRow[]>(
    `SELECT ${CAMPOS} FROM productos WHERE id = ?`,
    [id],
  );
  return filas[0] ?? null;
}

export async function crear(input: CrearProductoInput): Promise<number> {
  const [resultado] = await pool.query<ResultSetHeader>(
    `INSERT INTO productos (nombre, descripcion, precio, stock_actual, stock_minimo)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.nombre,
      input.descripcion ?? null,
      input.precio,
      input.stockActual ?? 0,
      input.stockMinimo ?? 0,
    ],
  );
  return resultado.insertId;
}

export async function actualizar(id: number, input: ActualizarProductoInput): Promise<void> {
  const mapa: Record<string, unknown> = {
    nombre: input.nombre,
    descripcion: input.descripcion,
    precio: input.precio,
    stock_actual: input.stockActual,
    stock_minimo: input.stockMinimo,
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
  await pool.query(`UPDATE productos SET ${asignaciones.join(', ')} WHERE id = ?`, valores);
}

export async function cambiarEstado(id: number, activo: boolean): Promise<void> {
  await pool.query('UPDATE productos SET activo = ? WHERE id = ?', [activo, id]);
}

export async function contarBajoMinimo(): Promise<number> {
  const [filas] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM productos WHERE activo = TRUE AND stock_actual <= stock_minimo',
  );
  return Number(filas[0]?.total ?? 0);
}

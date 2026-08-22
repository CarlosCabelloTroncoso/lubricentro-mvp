/**
 * Unico punto por donde se mueve el stock.
 *
 * Toda mutacion vive aca para que el modulo de ordenes no toque productos
 * directamente y para que la funcionalidad P1 (tabla movimientos_inventario,
 * kardex) sea aditiva: se agrega el INSERT del movimiento en estas dos
 * funciones y ningun otro archivo cambia.
 *
 * Las funciones reciben la conexion de la transaccion en curso: descontar
 * stock y crear la linea de la orden deben ser atomicos.
 */
import type { PoolConnection } from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import { ConflictError, NotFoundError } from '../../shared/errors';

interface StockRow extends RowDataPacket {
  id: number;
  nombre: string;
  precio: number;
  stock_actual: number;
  activo: number;
}

/**
 * Bloquea la fila del producto con SELECT ... FOR UPDATE antes de leer el
 * stock. Sin el bloqueo, dos mecanicos tomando la ultima unidad a la vez
 * leerian el mismo stock y ambos pasarian la validacion.
 */
async function bloquearProducto(cx: PoolConnection, productoId: number): Promise<StockRow> {
  const [filas] = await cx.query<StockRow[]>(
    'SELECT id, nombre, precio, stock_actual, activo FROM productos WHERE id = ? FOR UPDATE',
    [productoId],
  );
  const producto = filas[0];
  if (!producto) throw new NotFoundError('Producto');
  return producto;
}

export async function descontarStock(
  cx: PoolConnection,
  productoId: number,
  cantidad: number,
): Promise<StockRow> {
  const producto = await bloquearProducto(cx, productoId);

  if (!producto.activo) {
    throw new ConflictError(`El producto "${producto.nombre}" esta desactivado`);
  }
  if (producto.stock_actual < cantidad) {
    throw new ConflictError(
      `Stock insuficiente de "${producto.nombre}": disponible ${producto.stock_actual}, solicitado ${cantidad}`,
    );
  }

  await cx.query('UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?', [
    cantidad,
    productoId,
  ]);

  return producto;
}

/** Reversion: al eliminar una linea de producto o anular una orden. */
export async function reponerStock(
  cx: PoolConnection,
  productoId: number,
  cantidad: number,
): Promise<void> {
  await bloquearProducto(cx, productoId);
  await cx.query('UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?', [
    cantidad,
    productoId,
  ]);
}

import { NotFoundError, ConflictError } from '../../shared/errors';
import { withTransaction } from '../../db/pool';
import { descontarStock, reponerStock } from '../inventario/inventario.service';
import * as repo from './productos.repository';
import type { CrearProductoInput, ActualizarProductoInput, ListarProductosQuery } from './productos.schemas';

function aDto(fila: repo.ProductoRow) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    precio: fila.precio,
    stockActual: fila.stock_actual,
    stockMinimo: fila.stock_minimo,
    bajoMinimo: fila.stock_actual <= fila.stock_minimo,
    activo: Boolean(fila.activo),
  };
}

export type ProductoDto = ReturnType<typeof aDto>;

export async function listar(filtros: ListarProductosQuery) {
  const offset = (filtros.page - 1) * filtros.limit;
  const { items, total } = await repo.listar(filtros, offset);
  return { items: items.map(aDto), meta: { total, page: filtros.page, limit: filtros.limit } };
}

export async function obtener(id: number): Promise<ProductoDto> {
  const fila = await repo.buscarPorId(id);
  if (!fila) throw new NotFoundError('Producto');
  return aDto(fila);
}

export async function crear(input: CrearProductoInput): Promise<ProductoDto> {
  const id = await repo.crear(input);
  return obtener(id);
}

export async function actualizar(id: number, input: ActualizarProductoInput): Promise<ProductoDto> {
  await obtener(id);
  await repo.actualizar(id, input);
  return obtener(id);
}

export async function desactivar(id: number): Promise<void> {
  await obtener(id);
  await repo.cambiarEstado(id, false);
}

export async function reactivar(id: number): Promise<ProductoDto> {
  await obtener(id);
  await repo.cambiarEstado(id, true);
  return obtener(id);
}

/**
 * Ajuste manual de inventario (recepcion de mercaderia o correccion).
 * Pasa por inventario.service igual que el consumo de una orden: el stock
 * tiene un solo camino de mutacion.
 */
export async function ajustarStock(id: number, cantidad: number): Promise<ProductoDto> {
  await withTransaction(async (cx) => {
    if (cantidad > 0) {
      await reponerStock(cx, id, cantidad);
    } else {
      await descontarStock(cx, id, Math.abs(cantidad));
    }
  });
  return obtener(id);
}

/** Productos activos con stock igual o bajo el minimo. Alimenta el dashboard. */
export async function alertasStock(): Promise<ProductoDto[]> {
  const { items } = await repo.listar(
    { page: 1, limit: 100, activo: 'true', bajoMinimo: 'true' },
    0,
  );
  return items.map(aDto);
}

export async function contarAlertasStock(): Promise<number> {
  return repo.contarBajoMinimo();
}

/** Validacion de estado usada por el modulo de ordenes. */
export async function obtenerActivoParaOrden(id: number): Promise<ProductoDto> {
  const producto = await obtener(id);
  if (!producto.activo) {
    throw new ConflictError(`El producto ${producto.nombre} esta desactivado`);
  }
  return producto;
}

import { NotFoundError, ConflictError } from '../../shared/errors';
import * as repo from './servicios.repository';
import type { CrearServicioInput, ActualizarServicioInput, ListarServiciosQuery } from './servicios.schemas';

function aDto(fila: repo.ServicioRow) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    precio: fila.precio,
    activo: Boolean(fila.activo),
  };
}

export type ServicioDto = ReturnType<typeof aDto>;

export async function listar(filtros: ListarServiciosQuery) {
  const offset = (filtros.page - 1) * filtros.limit;
  const { items, total } = await repo.listar(filtros, offset);
  return { items: items.map(aDto), meta: { total, page: filtros.page, limit: filtros.limit } };
}

export async function obtener(id: number): Promise<ServicioDto> {
  const fila = await repo.buscarPorId(id);
  if (!fila) throw new NotFoundError('Servicio');
  return aDto(fila);
}

export async function crear(input: CrearServicioInput): Promise<ServicioDto> {
  const id = await repo.crear(input);
  return obtener(id);
}

export async function actualizar(id: number, input: ActualizarServicioInput): Promise<ServicioDto> {
  await obtener(id);
  await repo.actualizar(id, input);
  return obtener(id);
}

export async function desactivar(id: number): Promise<void> {
  await obtener(id);
  await repo.cambiarEstado(id, false);
}

export async function reactivar(id: number): Promise<ServicioDto> {
  await obtener(id);
  await repo.cambiarEstado(id, true);
  return obtener(id);
}

/** Usado por el modulo de ordenes al agregar una linea de servicio. */
export async function obtenerActivoParaOrden(id: number): Promise<ServicioDto> {
  const servicio = await obtener(id);
  if (!servicio.activo) {
    throw new ConflictError(`El servicio ${servicio.nombre} esta desactivado`);
  }
  return servicio;
}

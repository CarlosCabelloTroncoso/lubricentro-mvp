import { NotFoundError, ConflictError } from '../../shared/errors';
import { formatearRut } from '../../shared/rut';
import * as repo from './clientes.repository';
import type { CrearClienteInput, ActualizarClienteInput, ListarClientesQuery } from './clientes.schemas';

/** Agrega el RUT formateado para presentacion sin duplicar el dato almacenado. */
function aDto(fila: repo.ClienteRow) {
  return {
    id: fila.id,
    rut: fila.rut,
    rutFormateado: formatearRut(fila.rut),
    nombre: fila.nombre,
    apellido: fila.apellido,
    nombreCompleto: `${fila.nombre} ${fila.apellido}`,
    telefono: fila.telefono,
    email: fila.email,
    direccion: fila.direccion,
    activo: Boolean(fila.activo),
    createdAt: fila.created_at,
  };
}

export type ClienteDto = ReturnType<typeof aDto>;

export async function listar(filtros: ListarClientesQuery) {
  const offset = (filtros.page - 1) * filtros.limit;
  const { items, total } = await repo.listar(filtros, offset);
  return {
    items: items.map(aDto),
    meta: { total, page: filtros.page, limit: filtros.limit },
  };
}

export async function obtener(id: number): Promise<ClienteDto> {
  const fila = await repo.buscarPorId(id);
  if (!fila) throw new NotFoundError('Cliente');
  return aDto(fila);
}

export async function crear(input: CrearClienteInput): Promise<ClienteDto> {
  const existente = await repo.buscarPorRut(input.rut);
  if (existente) {
    throw new ConflictError(`Ya existe un cliente con el RUT ${formatearRut(input.rut)}`);
  }
  const id = await repo.crear(input);
  return obtener(id);
}

export async function actualizar(id: number, input: ActualizarClienteInput): Promise<ClienteDto> {
  await obtener(id);

  if (input.rut) {
    const otro = await repo.buscarPorRut(input.rut);
    if (otro && otro.id !== id) {
      throw new ConflictError(`Ya existe otro cliente con el RUT ${formatearRut(input.rut)}`);
    }
  }

  await repo.actualizar(id, input);
  return obtener(id);
}

export async function desactivar(id: number): Promise<void> {
  await obtener(id);
  await repo.desactivar(id);
}

export async function reactivar(id: number): Promise<ClienteDto> {
  await obtener(id);
  await repo.reactivar(id);
  return obtener(id);
}

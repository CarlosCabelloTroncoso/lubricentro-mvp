import { NotFoundError, ConflictError } from '../../shared/errors';
import { formatearRut } from '../../shared/rut';
import * as clientesRepo from '../clientes/clientes.repository';
import * as repo from './vehiculos.repository';
import type { CrearVehiculoInput, ActualizarVehiculoInput, ListarVehiculosQuery } from './vehiculos.schemas';

function aDto(fila: repo.VehiculoRow) {
  return {
    id: fila.id,
    clienteId: fila.cliente_id,
    patente: fila.patente,
    marca: fila.marca,
    modelo: fila.modelo,
    anio: fila.anio,
    color: fila.color,
    kilometrajeActual: fila.kilometraje_actual,
    activo: Boolean(fila.activo),
    descripcion: `${fila.marca} ${fila.modelo}`,
    cliente: {
      id: fila.cliente_id,
      nombreCompleto: `${fila.cliente_nombre} ${fila.cliente_apellido}`,
      rutFormateado: formatearRut(fila.cliente_rut),
    },
  };
}

export type VehiculoDto = ReturnType<typeof aDto>;

export async function listar(filtros: ListarVehiculosQuery) {
  const offset = (filtros.page - 1) * filtros.limit;
  const { items, total } = await repo.listar(filtros, offset);
  return {
    items: items.map(aDto),
    meta: { total, page: filtros.page, limit: filtros.limit },
  };
}

export async function obtener(id: number): Promise<VehiculoDto> {
  const fila = await repo.buscarPorId(id);
  if (!fila) throw new NotFoundError('Vehiculo');
  return aDto(fila);
}

/** El cliente debe existir y estar activo antes de colgarle un vehiculo. */
async function validarCliente(clienteId: number): Promise<void> {
  const cliente = await clientesRepo.buscarPorId(clienteId);
  if (!cliente) throw new NotFoundError('Cliente');
  if (!cliente.activo) throw new ConflictError('El cliente esta desactivado');
}

export async function crear(input: CrearVehiculoInput): Promise<VehiculoDto> {
  await validarCliente(input.clienteId);

  const existente = await repo.buscarPorPatente(input.patente);
  if (existente) {
    throw new ConflictError(`Ya existe un vehiculo con la patente ${input.patente}`);
  }

  const id = await repo.crear(input);
  return obtener(id);
}

export async function actualizar(id: number, input: ActualizarVehiculoInput): Promise<VehiculoDto> {
  await obtener(id);

  if (input.clienteId) await validarCliente(input.clienteId);

  if (input.patente) {
    const otro = await repo.buscarPorPatente(input.patente);
    if (otro && otro.id !== id) {
      throw new ConflictError(`Ya existe otro vehiculo con la patente ${input.patente}`);
    }
  }

  await repo.actualizar(id, input);
  return obtener(id);
}

export async function desactivar(id: number): Promise<void> {
  await obtener(id);
  await repo.desactivar(id);
}

export async function reactivar(id: number): Promise<VehiculoDto> {
  await obtener(id);
  await repo.reactivar(id);
  return obtener(id);
}

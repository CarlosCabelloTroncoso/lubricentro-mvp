import { ConflictError, NotFoundError } from '../../shared/errors';
import * as vehiculosRepo from '../vehiculos/vehiculos.repository';
import * as repo from './reservas.repository';
import type {
  ActualizarReservaInput,
  CrearReservaInput,
  EstadoReserva,
  ListarReservasQuery,
} from './reservas.schemas';

function aDto(fila: repo.ReservaRow) {
  return {
    id: fila.id,
    vehiculoId: fila.vehiculo_id,
    fechaHora: fila.fecha_hora,
    estado: fila.estado,
    observaciones: fila.observaciones,
    vehiculo: {
      id: fila.vehiculo_id,
      patente: fila.patente,
      descripcion: `${fila.marca} ${fila.modelo}`,
    },
    cliente: {
      id: fila.cliente_id,
      nombreCompleto: `${fila.cliente_nombre} ${fila.cliente_apellido}`,
      telefono: fila.cliente_telefono,
    },
  };
}

export type ReservaDto = ReturnType<typeof aDto>;

export async function listar(filtros: ListarReservasQuery) {
  const offset = (filtros.page - 1) * filtros.limit;
  const { items, total } = await repo.listar(filtros, offset);
  return { items: items.map(aDto), meta: { total, page: filtros.page, limit: filtros.limit } };
}

export async function obtener(id: number): Promise<ReservaDto> {
  const fila = await repo.buscarPorId(id);
  if (!fila) throw new NotFoundError('Reserva');
  return aDto(fila);
}

export async function crear(input: CrearReservaInput): Promise<ReservaDto> {
  const vehiculo = await vehiculosRepo.buscarPorId(input.vehiculoId);
  if (!vehiculo) throw new NotFoundError('Vehiculo');
  if (!vehiculo.activo) throw new ConflictError('El vehiculo esta desactivado');

  const id = await repo.crear(input);
  return obtener(id);
}

export async function actualizar(id: number, input: ActualizarReservaInput): Promise<ReservaDto> {
  const reserva = await obtener(id);
  if (reserva.estado !== 'PENDIENTE') {
    throw new ConflictError(`La reserva ya esta ${reserva.estado} y no puede modificarse`);
  }
  await repo.actualizar(id, input);
  return obtener(id);
}

/**
 * Solo se permite cancelar manualmente. CUMPLIDA la marca el cierre de la
 * orden de trabajo, dentro de su misma transaccion: no es un cambio manual.
 */
export async function cambiarEstado(id: number, estado: EstadoReserva): Promise<ReservaDto> {
  const reserva = await obtener(id);

  if (reserva.estado !== 'PENDIENTE') {
    throw new ConflictError(`La reserva ya esta ${reserva.estado}`);
  }
  if (estado === 'CUMPLIDA') {
    throw new ConflictError(
      'Una reserva se marca como CUMPLIDA al completar su orden de trabajo, no manualmente',
    );
  }

  await repo.cambiarEstadoSimple(id, estado);
  return obtener(id);
}

export async function pendientesDeHoy(): Promise<ReservaDto[]> {
  const filas = await repo.pendientesDeHoy();
  return filas.map(aDto);
}

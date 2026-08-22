/**
 * Nucleo del dominio: la orden de trabajo.
 *
 * Reglas que viven aca (no en la BD ni en el controller):
 *  - El cliente de la orden se deriva del dueño actual del vehiculo.
 *  - Las lineas guardan un snapshot de nombre y precio.
 *  - El total lo calcula el backend desde las lineas persistidas.
 *  - El stock se descuenta al agregar la linea y se repone al quitarla o
 *    al anular la orden, siempre dentro de la misma transaccion.
 *  - Las transiciones de estado siguen una maquina explicita.
 */
import { withTransaction } from '../../db/pool';
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors';
import { formatearRut } from '../../shared/rut';
import type { Rol } from '../../shared/roles';
import { descontarStock, reponerStock } from '../inventario/inventario.service';
import * as productosService from '../productos/productos.service';
import * as serviciosService from '../servicios/servicios.service';
import * as clientesRepo from '../clientes/clientes.repository';
import * as vehiculosRepo from '../vehiculos/vehiculos.repository';
import * as reservasRepo from '../reservas/reservas.repository';
import * as usuariosRepo from '../usuarios/usuarios.repository';
import * as repo from './ordenes.repository';
import type {
  ActualizarOrdenInput,
  AgregarProductoInput,
  AgregarServicioInput,
  CrearOrdenInput,
  EstadoOrden,
  ListarOrdenesQuery,
} from './ordenes.schemas';

export interface Actor {
  id: number;
  rol: Rol;
}

/**
 * Transiciones permitidas. COMPLETADA y ANULADA son estados finales:
 * una orden cerrada es el registro historico y no se reabre.
 */
const TRANSICIONES: Record<EstadoOrden, EstadoOrden[]> = {
  ABIERTA: ['EN_PROCESO', 'COMPLETADA', 'ANULADA'],
  EN_PROCESO: ['COMPLETADA', 'ANULADA'],
  COMPLETADA: [],
  ANULADA: [],
};

/** Estados en los que la orden todavia admite cambios de lineas o datos. */
const ESTADOS_EDITABLES: EstadoOrden[] = ['ABIERTA', 'EN_PROCESO'];

/** El numero visible de la orden se formatea desde el id; no se almacena. */
function formatearNumero(id: number): string {
  return `OT-${String(id).padStart(6, '0')}`;
}

function aResumen(fila: repo.OrdenRow) {
  return {
    id: fila.id,
    numero: formatearNumero(fila.id),
    estado: fila.estado,
    total: fila.total,
    kilometraje: fila.kilometraje,
    observaciones: fila.observaciones,
    reservaId: fila.reserva_id,
    fechaApertura: fila.created_at,
    fechaCierre: fila.fecha_cierre,
    cliente: {
      id: fila.cliente_id,
      nombreCompleto: `${fila.cliente_nombre} ${fila.cliente_apellido}`,
      rutFormateado: formatearRut(fila.cliente_rut),
    },
    vehiculo: {
      id: fila.vehiculo_id,
      patente: fila.patente,
      descripcion: `${fila.marca} ${fila.modelo}`,
    },
    mecanico: fila.mecanico_id
      ? { id: fila.mecanico_id, nombre: fila.mecanico_nombre ?? '' }
      : null,
  };
}

function aLinea(fila: repo.LineaRow) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    precioUnitario: fila.precio_unitario,
    cantidad: fila.cantidad,
    subtotal: fila.subtotal,
    servicioId: fila.servicio_id ?? null,
    productoId: fila.producto_id ?? null,
  };
}

export type OrdenResumen = ReturnType<typeof aResumen>;

/**
 * Autorizacion fina: el mecanico solo opera sobre las ordenes que tiene
 * asignadas. Vive en el service porque requiere consultar el recurso;
 * el middleware `authorize` solo sabe de roles.
 */
function verificarAcceso(fila: repo.OrdenRow, actor: Actor): void {
  if (actor.rol === 'MECANICO' && fila.mecanico_id !== actor.id) {
    throw new ForbiddenError('Solo puede operar sobre las ordenes que tiene asignadas');
  }
}

async function obtenerFila(id: number): Promise<repo.OrdenRow> {
  const fila = await repo.buscarPorId(id);
  if (!fila) throw new NotFoundError('Orden de trabajo');
  return fila;
}

function verificarEditable(fila: repo.OrdenRow): void {
  if (!ESTADOS_EDITABLES.includes(fila.estado)) {
    throw new ConflictError(
      `La orden ${formatearNumero(fila.id)} esta ${fila.estado} y ya no admite cambios`,
    );
  }
}

export async function listar(filtros: ListarOrdenesQuery, actor: Actor) {
  // El mecanico ve solo su propia carga de trabajo.
  const filtrosEfectivos =
    actor.rol === 'MECANICO' ? { ...filtros, mecanicoId: actor.id } : filtros;

  const offset = (filtrosEfectivos.page - 1) * filtrosEfectivos.limit;
  const { items, total } = await repo.listar(filtrosEfectivos, offset);
  return {
    items: items.map(aResumen),
    meta: { total, page: filtrosEfectivos.page, limit: filtrosEfectivos.limit },
  };
}

/** Detalle completo: cabecera + lineas de servicio + lineas de producto. */
export async function obtener(id: number, actor: Actor) {
  const fila = await obtenerFila(id);
  verificarAcceso(fila, actor);

  const [servicios, productos] = await Promise.all([
    repo.listarServiciosDeOrden(id),
    repo.listarProductosDeOrden(id),
  ]);

  return {
    ...aResumen(fila),
    servicios: servicios.map(aLinea),
    productos: productos.map(aLinea),
  };
}

export async function crear(input: CrearOrdenInput, actor: Actor) {
  const vehiculo = await vehiculosRepo.buscarPorId(input.vehiculoId);
  if (!vehiculo) throw new NotFoundError('Vehiculo');
  if (!vehiculo.activo) throw new ConflictError('El vehiculo esta desactivado');

  const cliente = await clientesRepo.buscarPorId(vehiculo.cliente_id);
  if (!cliente || !cliente.activo) {
    throw new ConflictError('El cliente dueño del vehiculo esta desactivado');
  }

  // Un vehiculo no puede tener dos ordenes vivas a la vez.
  const { items: abiertas } = await repo.listar(
    { page: 1, limit: 1, vehiculoId: input.vehiculoId, estado: 'ABIERTA' },
    0,
  );
  const { items: enProceso } = await repo.listar(
    { page: 1, limit: 1, vehiculoId: input.vehiculoId, estado: 'EN_PROCESO' },
    0,
  );
  const viva = abiertas[0] ?? enProceso[0];
  if (viva) {
    throw new ConflictError(
      `El vehiculo ${vehiculo.patente} ya tiene la orden ${formatearNumero(viva.id)} sin cerrar`,
    );
  }

  if (input.reservaId) {
    const reserva = await reservasRepo.buscarPorId(input.reservaId);
    if (!reserva) throw new NotFoundError('Reserva');
    if (reserva.vehiculo_id !== input.vehiculoId) {
      throw new ConflictError('La reserva corresponde a otro vehiculo');
    }
    if (reserva.estado !== 'PENDIENTE') {
      throw new ConflictError(`La reserva ya esta ${reserva.estado}`);
    }
    const yaUsada = await repo.buscarPorReserva(input.reservaId);
    if (yaUsada) {
      throw new ConflictError('La reserva ya tiene una orden de trabajo asociada');
    }
  }

  if (input.mecanicoId) await validarMecanico(input.mecanicoId);

  const id = await repo.crear({
    clienteId: vehiculo.cliente_id,
    vehiculoId: input.vehiculoId,
    reservaId: input.reservaId ?? null,
    mecanicoId: input.mecanicoId ?? null,
    kilometraje: input.kilometraje ?? null,
    observaciones: input.observaciones ?? null,
  });

  return obtener(id, actor);
}

async function validarMecanico(mecanicoId: number): Promise<void> {
  const usuario = await usuariosRepo.buscarPorId(mecanicoId);
  if (!usuario || !usuario.activo) throw new NotFoundError('Mecanico');
  if (usuario.rol === 'RECEPCIONISTA') {
    throw new ConflictError('El usuario asignado debe tener rol MECANICO o ADMIN');
  }
}

export async function actualizar(id: number, input: ActualizarOrdenInput, actor: Actor) {
  const fila = await obtenerFila(id);
  verificarAcceso(fila, actor);
  verificarEditable(fila);

  if (input.mecanicoId) await validarMecanico(input.mecanicoId);

  await repo.actualizarDatos(id, input);
  return obtener(id, actor);
}

export async function agregarServicio(id: number, input: AgregarServicioInput, actor: Actor) {
  const fila = await obtenerFila(id);
  verificarAcceso(fila, actor);
  verificarEditable(fila);

  const servicio = await serviciosService.obtenerActivoParaOrden(input.servicioId);

  await withTransaction(async (cx) => {
    await repo.insertarLineaServicio(cx, {
      ordenId: id,
      servicioId: servicio.id,
      // Snapshot: si mañana cambia el catalogo, esta orden no se altera.
      nombre: servicio.nombre,
      precio: servicio.precio,
      cantidad: input.cantidad,
    });
    await repo.recalcularTotal(cx, id);
  });

  return obtener(id, actor);
}

export async function quitarServicio(id: number, lineaId: number, actor: Actor) {
  const fila = await obtenerFila(id);
  verificarAcceso(fila, actor);
  verificarEditable(fila);

  await withTransaction(async (cx) => {
    const linea = await repo.buscarLineaServicio(cx, id, lineaId);
    if (!linea) throw new NotFoundError('Linea de servicio');
    await repo.eliminarLineaServicio(cx, lineaId);
    await repo.recalcularTotal(cx, id);
  });

  return obtener(id, actor);
}

/**
 * Agregar un producto descuenta stock. El INSERT de la linea y el UPDATE del
 * stock van en la misma transaccion: o pasan los dos o no pasa ninguno.
 */
export async function agregarProducto(id: number, input: AgregarProductoInput, actor: Actor) {
  const fila = await obtenerFila(id);
  verificarAcceso(fila, actor);
  verificarEditable(fila);

  await productosService.obtenerActivoParaOrden(input.productoId);

  await withTransaction(async (cx) => {
    const producto = await descontarStock(cx, input.productoId, input.cantidad);
    await repo.insertarLineaProducto(cx, {
      ordenId: id,
      productoId: input.productoId,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: input.cantidad,
    });
    await repo.recalcularTotal(cx, id);
  });

  return obtener(id, actor);
}

/** Quitar la linea devuelve las unidades a bodega. */
export async function quitarProducto(id: number, lineaId: number, actor: Actor) {
  const fila = await obtenerFila(id);
  verificarAcceso(fila, actor);
  verificarEditable(fila);

  await withTransaction(async (cx) => {
    const linea = await repo.buscarLineaProducto(cx, id, lineaId);
    if (!linea) throw new NotFoundError('Linea de producto');

    await reponerStock(cx, linea.producto_id!, linea.cantidad);
    await repo.eliminarLineaProducto(cx, lineaId);
    await repo.recalcularTotal(cx, id);
  });

  return obtener(id, actor);
}

export async function cambiarEstado(id: number, nuevoEstado: EstadoOrden, actor: Actor) {
  const fila = await obtenerFila(id);
  verificarAcceso(fila, actor);

  if (fila.estado === nuevoEstado) {
    throw new ConflictError(`La orden ya esta ${nuevoEstado}`);
  }
  if (!TRANSICIONES[fila.estado].includes(nuevoEstado)) {
    throw new ConflictError(
      `Transicion invalida: no se puede pasar de ${fila.estado} a ${nuevoEstado}`,
    );
  }

  if (nuevoEstado === 'COMPLETADA') {
    const [servicios, productos] = await Promise.all([
      repo.listarServiciosDeOrden(id),
      repo.listarProductosDeOrden(id),
    ]);
    if (servicios.length === 0 && productos.length === 0) {
      throw new ConflictError('No se puede completar una orden sin servicios ni productos');
    }
  }

  await withTransaction(async (cx) => {
    if (nuevoEstado === 'ANULADA') {
      // Devolver a bodega todo lo consumido por esta orden.
      const lineas = await repo.lineasProductoParaReversion(cx, id);
      for (const linea of lineas) {
        await reponerStock(cx, linea.producto_id!, linea.cantidad);
      }
    }

    const esCierre = nuevoEstado === 'COMPLETADA';
    await repo.cambiarEstado(cx, id, nuevoEstado, esCierre);

    if (esCierre) {
      await repo.recalcularTotal(cx, id);
      if (fila.kilometraje !== null) {
        await vehiculosRepo.actualizarKilometraje(cx, fila.vehiculo_id, fila.kilometraje);
      }
      if (fila.reserva_id) {
        await reservasRepo.cambiarEstado(cx, fila.reserva_id, 'CUMPLIDA');
      }
    }
  });

  return obtener(id, actor);
}

/** Historial del vehiculo: sus ordenes completadas, con las lineas de cada una. */
export async function historialPorVehiculo(vehiculoId: number) {
  const filas = await repo.historialPorVehiculo(vehiculoId);

  return Promise.all(
    filas.map(async (fila) => {
      const [servicios, productos] = await Promise.all([
        repo.listarServiciosDeOrden(fila.id),
        repo.listarProductosDeOrden(fila.id),
      ]);
      return {
        ...aResumen(fila),
        servicios: servicios.map(aLinea),
        productos: productos.map(aLinea),
      };
    }),
  );
}

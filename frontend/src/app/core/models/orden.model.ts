export type EstadoOrden = 'ABIERTA' | 'EN_PROCESO' | 'COMPLETADA' | 'ANULADA';

export interface OrdenClienteResumen {
  id: number;
  nombreCompleto: string;
  rutFormateado: string;
}

export interface OrdenVehiculoResumen {
  id: number;
  patente: string;
  descripcion: string;
}

export interface OrdenMecanicoResumen {
  id: number;
  nombre: string;
}

export interface OrdenLinea {
  id: number;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
  servicioId: number | null;
  productoId: number | null;
}

/** Forma que devuelve el listado: sin lineas. */
export interface OrdenResumen {
  id: number;
  numero: string;
  estado: EstadoOrden;
  total: number;
  kilometraje: number | null;
  observaciones: string | null;
  reservaId: number | null;
  fechaApertura: string;
  fechaCierre: string | null;
  cliente: OrdenClienteResumen;
  vehiculo: OrdenVehiculoResumen;
  mecanico: OrdenMecanicoResumen | null;
}

/** Forma del detalle: incluye lineas de servicio y producto. */
export interface OrdenDetalle extends OrdenResumen {
  servicios: OrdenLinea[];
  productos: OrdenLinea[];
}

export interface CrearOrdenInput {
  vehiculoId: number;
  reservaId?: number | null;
  mecanicoId?: number | null;
  kilometraje?: number | null;
  observaciones?: string | null;
}

export interface AgregarLineaInput {
  cantidad: number;
}

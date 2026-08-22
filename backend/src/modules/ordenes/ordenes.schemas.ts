import { z } from 'zod';

export const ESTADOS_ORDEN = ['ABIERTA', 'EN_PROCESO', 'COMPLETADA', 'ANULADA'] as const;
export type EstadoOrden = (typeof ESTADOS_ORDEN)[number];

/**
 * No se recibe clienteId: se deriva del dueño actual del vehiculo.
 * Asi es imposible crear una orden cuyo cliente no corresponda al vehiculo.
 */
export const crearOrdenSchema = z.object({
  vehiculoId: z.coerce.number().int().positive(),
  reservaId: z.coerce.number().int().positive().optional().nullable(),
  mecanicoId: z.coerce.number().int().positive().optional().nullable(),
  kilometraje: z.coerce.number().int().min(0).optional().nullable(),
  observaciones: z.string().trim().max(1000).optional().nullable(),
});

export const actualizarOrdenSchema = z.object({
  mecanicoId: z.coerce.number().int().positive().optional().nullable(),
  kilometraje: z.coerce.number().int().min(0).optional().nullable(),
  observaciones: z.string().trim().max(1000).optional().nullable(),
});

export const cambiarEstadoSchema = z.object({
  estado: z.enum(ESTADOS_ORDEN),
});

export const agregarServicioSchema = z.object({
  servicioId: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().int().min(1).max(999).default(1),
});

export const agregarProductoSchema = z.object({
  productoId: z.coerce.number().int().positive(),
  cantidad: z.coerce.number().int().min(1).max(999).default(1),
});

export const listarOrdenesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.enum(ESTADOS_ORDEN).optional(),
  vehiculoId: z.coerce.number().int().positive().optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  mecanicoId: z.coerce.number().int().positive().optional(),
});

export type CrearOrdenInput = z.infer<typeof crearOrdenSchema>;
export type ActualizarOrdenInput = z.infer<typeof actualizarOrdenSchema>;
export type AgregarServicioInput = z.infer<typeof agregarServicioSchema>;
export type AgregarProductoInput = z.infer<typeof agregarProductoSchema>;
export type ListarOrdenesQuery = z.infer<typeof listarOrdenesQuerySchema>;

import { z } from 'zod';

export const ESTADOS_RESERVA = ['PENDIENTE', 'CUMPLIDA', 'CANCELADA'] as const;
export type EstadoReserva = (typeof ESTADOS_RESERVA)[number];

/**
 * La reserva cuelga del vehiculo; el cliente se obtiene por el vehiculo.
 * La fecha llega en ISO y se guarda como DATETIME.
 */
export const crearReservaSchema = z.object({
  vehiculoId: z.coerce.number().int().positive(),
  fechaHora: z.coerce.date(),
  observaciones: z.string().trim().max(500).optional().nullable(),
});

export const actualizarReservaSchema = z.object({
  fechaHora: z.coerce.date().optional(),
  observaciones: z.string().trim().max(500).optional().nullable(),
});

export const cambiarEstadoReservaSchema = z.object({
  estado: z.enum(ESTADOS_RESERVA),
});

export const listarReservasQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.enum(ESTADOS_RESERVA).optional(),
  vehiculoId: z.coerce.number().int().positive().optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});

export type CrearReservaInput = z.infer<typeof crearReservaSchema>;
export type ActualizarReservaInput = z.infer<typeof actualizarReservaSchema>;
export type ListarReservasQuery = z.infer<typeof listarReservasQuerySchema>;

import { z } from 'zod';

export const crearServicioSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  descripcion: z.string().trim().max(300).optional().nullable(),
  // Precio en CLP: entero, el peso chileno no tiene decimales.
  precio: z.coerce.number().int().min(0).max(99999999),
});

export const actualizarServicioSchema = crearServicioSchema.partial();

export const listarServiciosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().optional(),
  activo: z.enum(['true', 'false']).optional(),
});

export type CrearServicioInput = z.infer<typeof crearServicioSchema>;
export type ActualizarServicioInput = z.infer<typeof actualizarServicioSchema>;
export type ListarServiciosQuery = z.infer<typeof listarServiciosQuerySchema>;

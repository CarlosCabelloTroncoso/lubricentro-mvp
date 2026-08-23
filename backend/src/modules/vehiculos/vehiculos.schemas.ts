import { z } from 'zod';
import { esPatenteValida, normalizarPatente } from '../../shared/patente';

const anioActual = new Date().getFullYear();

const patenteSchema = z
  .string()
  .min(5)
  .refine(esPatenteValida, 'Patente invalida (formatos validos: ABCD12 o AB1234)')
  .transform(normalizarPatente);

export const crearVehiculoSchema = z.object({
  clienteId: z.coerce.number().int().positive(),
  patente: patenteSchema,
  marca: z.string().trim().min(1).max(60),
  modelo: z.string().trim().min(1).max(60),
  anio: z.coerce.number().int().min(1900).max(anioActual + 1).optional().nullable(),
  color: z.string().trim().max(40).optional().nullable(),
  kilometrajeActual: z.coerce.number().int().min(0).default(0),
});

export const actualizarVehiculoSchema = crearVehiculoSchema.partial();

export const listarVehiculosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  activo: z.enum(['true', 'false']).optional(),
});

export type CrearVehiculoInput = z.infer<typeof crearVehiculoSchema>;
export type ActualizarVehiculoInput = z.infer<typeof actualizarVehiculoSchema>;
export type ListarVehiculosQuery = z.infer<typeof listarVehiculosQuerySchema>;

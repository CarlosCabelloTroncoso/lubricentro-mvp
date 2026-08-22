import { z } from 'zod';
import { esRutValido, normalizarRut } from '../../shared/rut';

const rutSchema = z
  .string()
  .min(8, 'RUT demasiado corto')
  .refine(esRutValido, 'RUT invalido (digito verificador no coincide)')
  .transform(normalizarRut);

export const crearClienteSchema = z.object({
  rut: rutSchema,
  nombre: z.string().trim().min(2).max(120),
  apellido: z.string().trim().min(2).max(120),
  telefono: z.string().trim().max(20).optional().nullable(),
  email: z.email('Email invalido').max(160).optional().nullable(),
  direccion: z.string().trim().max(200).optional().nullable(),
});

export const actualizarClienteSchema = crearClienteSchema.partial();

export const listarClientesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
  activo: z.enum(['true', 'false']).optional(),
});

export type CrearClienteInput = z.infer<typeof crearClienteSchema>;
export type ActualizarClienteInput = z.infer<typeof actualizarClienteSchema>;
export type ListarClientesQuery = z.infer<typeof listarClientesQuerySchema>;

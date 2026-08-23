import { z } from 'zod';

export const crearProductoSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  descripcion: z.string().trim().max(300).optional().nullable(),
  precio: z.coerce.number().int().min(0).max(99999999),
  stockActual: z.coerce.number().int().min(0).default(0),
  stockMinimo: z.coerce.number().int().min(0).default(0),
});

export const actualizarProductoSchema = crearProductoSchema.partial();

/** Ajuste manual de inventario: positivo repone, negativo corrige a la baja. */
export const ajustarStockSchema = z.object({
  cantidad: z.coerce.number().int().refine((n) => n !== 0, 'La cantidad no puede ser cero'),
});

export const listarProductosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().optional(),
  activo: z.enum(['true', 'false']).optional(),
  bajoMinimo: z.enum(['true']).optional(),
});

export type CrearProductoInput = z.infer<typeof crearProductoSchema>;
export type ActualizarProductoInput = z.infer<typeof actualizarProductoSchema>;
export type AjustarStockInput = z.infer<typeof ajustarStockSchema>;
export type ListarProductosQuery = z.infer<typeof listarProductosQuerySchema>;

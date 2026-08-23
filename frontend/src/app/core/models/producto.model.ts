export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stockActual: number;
  stockMinimo: number;
  bajoMinimo: boolean;
  activo: boolean;
}

export interface ProductoInput {
  nombre: string;
  descripcion?: string | null;
  precio: number;
  stockActual?: number;
  stockMinimo?: number;
}

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  activo: boolean;
}

export interface ServicioInput {
  nombre: string;
  descripcion?: string | null;
  precio: number;
}

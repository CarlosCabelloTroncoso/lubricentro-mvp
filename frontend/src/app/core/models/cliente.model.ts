export interface Cliente {
  id: number;
  rut: string;
  rutFormateado: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  activo: boolean;
  createdAt: string;
}

export interface ClienteInput {
  rut: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
}

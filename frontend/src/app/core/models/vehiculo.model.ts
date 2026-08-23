export interface VehiculoClienteResumen {
  id: number;
  nombreCompleto: string;
  rutFormateado: string;
}

export interface Vehiculo {
  id: number;
  clienteId: number;
  patente: string;
  marca: string;
  modelo: string;
  descripcion: string;
  anio: number | null;
  color: string | null;
  kilometrajeActual: number;
  activo: boolean;
  cliente: VehiculoClienteResumen;
}

export interface VehiculoInput {
  clienteId: number;
  patente: string;
  marca: string;
  modelo: string;
  anio?: number | null;
  color?: string | null;
  kilometrajeActual?: number;
}

import type { Producto } from './producto.model';

export interface DashboardMetricas {
  clientesActivos: number;
  vehiculosActivos: number;
  reservasPendientesHoy: number;
  ordenesAbiertas: number;
  ordenesCompletadasHoy: number;
  ingresosHoy: number;
  ingresosMes: number;
  productosBajoMinimo: number;
}

export interface ServicioMasSolicitado {
  nombre: string;
  veces: number;
  ingresos: number;
}

export interface ReservaResumenDashboard {
  id: number;
  vehiculoId: number;
  fechaHora: string;
  estado: string;
  observaciones: string | null;
  vehiculo: { id: number; patente: string; descripcion: string };
  cliente: { id: number; nombreCompleto: string; telefono: string | null };
}

export interface DashboardResumen {
  metricas: DashboardMetricas;
  serviciosMasSolicitados: ServicioMasSolicitado[];
  alertasStock: Producto[];
  reservasHoy: ReservaResumenDashboard[];
}

import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { ProgressSpinner } from 'primeng/progressspinner';
import { DashboardService } from '../../core/services/dashboard.service';
import type { DashboardResumen } from '../../core/models/dashboard.model';

interface Metrica {
  etiqueta: string;
  valor: number;
  icono: string;
  esMoneda?: boolean;
  ruta?: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CurrencyPipe, DatePipe, Card, Tag, ProgressSpinner],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly service = inject(DashboardService);

  readonly cargando = signal(true);
  readonly datos = signal<DashboardResumen | null>(null);
  readonly metricas = signal<Metrica[]>([]);

  constructor() {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const datos = await this.service.resumen();
      this.datos.set(datos);
      this.metricas.set([
        { etiqueta: 'Clientes activos', valor: datos.metricas.clientesActivos, icono: 'pi pi-users', ruta: '/clientes' },
        { etiqueta: 'Vehiculos activos', valor: datos.metricas.vehiculosActivos, icono: 'pi pi-car', ruta: '/vehiculos' },
        { etiqueta: 'Reservas pendientes hoy', valor: datos.metricas.reservasPendientesHoy, icono: 'pi pi-calendar' },
        { etiqueta: 'Ordenes abiertas', valor: datos.metricas.ordenesAbiertas, icono: 'pi pi-file-edit', ruta: '/ordenes-trabajo' },
        { etiqueta: 'Completadas hoy', valor: datos.metricas.ordenesCompletadasHoy, icono: 'pi pi-check-circle' },
        { etiqueta: 'Ingresos del dia', valor: datos.metricas.ingresosHoy, icono: 'pi pi-dollar', esMoneda: true },
        { etiqueta: 'Ingresos del mes', valor: datos.metricas.ingresosMes, icono: 'pi pi-chart-line', esMoneda: true },
        { etiqueta: 'Productos bajo minimo', valor: datos.metricas.productosBajoMinimo, icono: 'pi pi-exclamation-triangle', ruta: '/productos' },
      ]);
    } finally {
      this.cargando.set(false);
    }
  }
}

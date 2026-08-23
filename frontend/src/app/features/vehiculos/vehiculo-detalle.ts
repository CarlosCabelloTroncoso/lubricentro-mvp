import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { ButtonDirective } from 'primeng/button';
import { ProgressSpinner } from 'primeng/progressspinner';
import { VehiculosService } from '../../core/services/vehiculos.service';
import { AuthService } from '../../core/services/auth.service';
import type { Vehiculo } from '../../core/models/vehiculo.model';
import type { OrdenDetalle } from '../../core/models/orden.model';

@Component({
  selector: 'app-vehiculo-detalle',
  imports: [RouterLink, CurrencyPipe, DatePipe, DecimalPipe, Card, Tag, ButtonDirective, ProgressSpinner],
  templateUrl: './vehiculo-detalle.html',
  styleUrl: './vehiculo-detalle.scss',
})
export class VehiculoDetalle {
  private readonly service = inject(VehiculosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly cargando = signal(true);
  readonly vehiculo = signal<Vehiculo | null>(null);
  readonly historial = signal<OrdenDetalle[]>([]);
  readonly expandidas = signal<Set<number>>(new Set());

  private readonly id = Number(this.route.snapshot.paramMap.get('id'));

  constructor() {
    void this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const [vehiculo, historial] = await Promise.all([
        this.service.obtener(this.id),
        this.service.historial(this.id),
      ]);
      this.vehiculo.set(vehiculo);
      this.historial.set(historial);
    } finally {
      this.cargando.set(false);
    }
  }

  toggleExpandida(ordenId: number): void {
    const set = new Set(this.expandidas());
    if (set.has(ordenId)) set.delete(ordenId);
    else set.add(ordenId);
    this.expandidas.set(set);
  }

  async crearOrden(): Promise<void> {
    await this.router.navigate(['/ordenes-trabajo'], { queryParams: { nueva: 1, vehiculoId: this.id } });
  }

  severidadEstado(estado: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (estado) {
      case 'COMPLETADA':
        return 'success';
      case 'EN_PROCESO':
        return 'info';
      case 'ABIERTA':
        return 'warn';
      default:
        return 'danger';
    }
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonDirective } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { Card } from 'primeng/card';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ConfirmationService, MessageService } from 'primeng/api';
import { OrdenesService } from '../../core/services/ordenes.service';
import { ServiciosService } from '../../core/services/servicios.service';
import { ProductosService } from '../../core/services/productos.service';
import { AuthService } from '../../core/services/auth.service';
import type { EstadoOrden, OrdenDetalle as OrdenDetalleModel } from '../../core/models/orden.model';
import type { Servicio } from '../../core/models/servicio.model';
import type { Producto } from '../../core/models/producto.model';
import type { ApiErrorBody } from '../../core/models/common.model';

const SIGUIENTE_ESTADO: Record<EstadoOrden, EstadoOrden[]> = {
  ABIERTA: ['EN_PROCESO', 'COMPLETADA', 'ANULADA'],
  EN_PROCESO: ['COMPLETADA', 'ANULADA'],
  COMPLETADA: [],
  ANULADA: [],
};

@Component({
  selector: 'app-orden-detalle',
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    ButtonDirective,
    InputNumber,
    Select,
    Tag,
    Card,
    ProgressSpinner,
  ],
  templateUrl: './orden-detalle.html',
  styleUrl: './orden-detalle.scss',
})
export class OrdenDetalle {
  private readonly service = inject(OrdenesService);
  private readonly serviciosService = inject(ServiciosService);
  private readonly productosService = inject(ProductosService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmacion = inject(ConfirmationService);
  private readonly mensajes = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  private readonly id = Number(this.route.snapshot.paramMap.get('id'));

  readonly cargando = signal(true);
  readonly errorAcceso = signal<string | null>(null);
  readonly orden = signal<OrdenDetalleModel | null>(null);
  readonly serviciosCatalogo = signal<Servicio[]>([]);
  readonly productosCatalogo = signal<Producto[]>([]);

  readonly agregandoServicio = signal(false);
  readonly agregandoProducto = signal(false);
  readonly cambiandoEstado = signal(false);

  readonly formServicio = this.fb.nonNullable.group({
    servicioId: [0, [Validators.required, Validators.min(1)]],
    cantidad: [1, [Validators.required, Validators.min(1)]],
  });

  readonly formProducto = this.fb.nonNullable.group({
    productoId: [0, [Validators.required, Validators.min(1)]],
    cantidad: [1, [Validators.required, Validators.min(1)]],
  });

  readonly editable = computed(() => {
    const o = this.orden();
    return o !== null && (o.estado === 'ABIERTA' || o.estado === 'EN_PROCESO');
  });

  readonly transicionesDisponibles = computed<EstadoOrden[]>(() => {
    const o = this.orden();
    if (!o) return [];
    return SIGUIENTE_ESTADO[o.estado];
  });

  readonly puedeCompletar = computed(() => {
    const o = this.orden();
    if (!o) return false;
    return this.transicionesDisponibles().includes('COMPLETADA') && (o.servicios.length + o.productos.length) > 0;
  });

  constructor() {
    void this.cargar();
    void this.serviciosService.listar({ limit: 100, activo: 'true' }).then((r) => this.serviciosCatalogo.set(r.data));
    void this.productosService.listar({ limit: 100, activo: 'true' }).then((r) => this.productosCatalogo.set(r.data));
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.errorAcceso.set(null);
    try {
      const orden = await this.service.obtener(this.id);
      this.orden.set(orden);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 403) {
        this.errorAcceso.set('No tienes acceso a esta orden: no es una de tus ordenes asignadas.');
      } else if (error instanceof HttpErrorResponse && error.status === 404) {
        this.errorAcceso.set('La orden no existe.');
      } else {
        this.errorAcceso.set('No se pudo cargar la orden.');
      }
    } finally {
      this.cargando.set(false);
    }
  }

  severidadEstado(estado: EstadoOrden): 'success' | 'info' | 'warn' | 'danger' {
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

  etiquetaTransicion(estado: EstadoOrden): string {
    switch (estado) {
      case 'EN_PROCESO':
        return 'Iniciar trabajo';
      case 'COMPLETADA':
        return 'Completar orden';
      case 'ANULADA':
        return 'Anular orden';
      default:
        return estado;
    }
  }

  async agregarServicio(): Promise<void> {
    if (this.formServicio.invalid) {
      this.formServicio.markAllAsTouched();
      return;
    }
    this.agregandoServicio.set(true);
    const { servicioId, cantidad } = this.formServicio.getRawValue();
    try {
      const orden = await this.service.agregarServicio(this.id, servicioId, cantidad);
      this.orden.set(orden);
      this.formServicio.reset({ servicioId: 0, cantidad: 1 });
    } finally {
      this.agregandoServicio.set(false);
    }
  }

  async quitarServicio(lineaId: number): Promise<void> {
    const orden = await this.service.quitarServicio(this.id, lineaId);
    this.orden.set(orden);
  }

  async agregarProducto(): Promise<void> {
    if (this.formProducto.invalid) {
      this.formProducto.markAllAsTouched();
      return;
    }
    this.agregandoProducto.set(true);
    const { productoId, cantidad } = this.formProducto.getRawValue();
    try {
      const orden = await this.service.agregarProducto(this.id, productoId, cantidad);
      this.orden.set(orden);
      this.formProducto.reset({ productoId: 0, cantidad: 1 });
      // El stock consumido cambia el catalogo mostrado en el selector.
      void this.productosService.listar({ limit: 100, activo: 'true' }).then((r) => this.productosCatalogo.set(r.data));
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        const cuerpo = error.error as ApiErrorBody | undefined;
        if (cuerpo?.error?.code === 'CONFLICT') return;
      }
      throw error;
    } finally {
      this.agregandoProducto.set(false);
    }
  }

  async quitarProducto(lineaId: number): Promise<void> {
    const orden = await this.service.quitarProducto(this.id, lineaId);
    this.orden.set(orden);
    void this.productosService.listar({ limit: 100, activo: 'true' }).then((r) => this.productosCatalogo.set(r.data));
  }

  cambiarEstado(nuevoEstado: EstadoOrden): void {
    const esDestructivo = nuevoEstado === 'ANULADA';
    const mensaje =
      nuevoEstado === 'COMPLETADA'
        ? 'Se cerrara la orden, se calculara el total final y se actualizara el kilometraje del vehiculo.'
        : nuevoEstado === 'ANULADA'
          ? 'Se anulara la orden y se repondra a bodega todo el stock consumido.'
          : 'Se marcara la orden como en proceso.';

    this.confirmacion.confirm({
      header: this.etiquetaTransicion(nuevoEstado),
      message: mensaje,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: esDestructivo ? 'danger' : 'primary', label: 'Confirmar' },
      rejectButtonProps: { severity: 'secondary', outlined: true, label: 'Cancelar' },
      accept: async () => {
        this.cambiandoEstado.set(true);
        try {
          const orden = await this.service.cambiarEstado(this.id, nuevoEstado);
          this.orden.set(orden);
          this.mensajes.add({ severity: 'success', summary: `Orden ${nuevoEstado.toLowerCase()}` });
        } finally {
          this.cambiandoEstado.set(false);
        }
      },
    });
  }

  async irAHistorial(): Promise<void> {
    const orden = this.orden();
    if (!orden) return;
    await this.router.navigate(['/vehiculos', orden.vehiculo.id]);
  }
}

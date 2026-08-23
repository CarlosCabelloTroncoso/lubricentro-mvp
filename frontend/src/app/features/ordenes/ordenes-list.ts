import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Table, TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { ButtonDirective } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { AutoComplete, type AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { OrdenesService } from '../../core/services/ordenes.service';
import { VehiculosService } from '../../core/services/vehiculos.service';
import { UsuariosService, type MecanicoResumen } from '../../core/services/usuarios.service';
import { AuthService } from '../../core/services/auth.service';
import type { EstadoOrden, OrdenResumen } from '../../core/models/orden.model';
import type { Vehiculo } from '../../core/models/vehiculo.model';

const ESTADOS: EstadoOrden[] = ['ABIERTA', 'EN_PROCESO', 'COMPLETADA', 'ANULADA'];

@Component({
  selector: 'app-ordenes-list',
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    ReactiveFormsModule,
    TableModule,
    ButtonDirective,
    InputNumber,
    Textarea,
    Select,
    AutoComplete,
    Tag,
    Dialog,
  ],
  templateUrl: './ordenes-list.html',
  styleUrl: './ordenes-list.scss',
})
export class OrdenesList {
  private readonly service = inject(OrdenesService);
  private readonly vehiculosService = inject(VehiculosService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly fb = inject(FormBuilder);
  private readonly mensajes = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly ordenes = signal<OrdenResumen[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);
  readonly limit = 15;
  readonly estados = ESTADOS;
  readonly estadoFiltro = signal<EstadoOrden | null>(null);

  readonly dialogoVisible = signal(false);
  readonly guardando = signal(false);
  readonly vehiculoPreseleccionado = signal<Vehiculo | null>(null);
  readonly mecanicos = signal<MecanicoResumen[]>([]);
  readonly sugerenciasVehiculo = signal<Vehiculo[]>([]);

  readonly form = this.fb.nonNullable.group({
    vehiculoId: [0, [Validators.required, Validators.min(1)]],
    mecanicoId: this.fb.control<number | null>(null),
    kilometraje: this.fb.control<number | null>(null),
    observaciones: [''],
  });

  private page = 1;

  constructor() {
    void this.usuariosService.listarMecanicos().then((m) => this.mecanicos.set(m));

    const vehiculoIdParam = this.route.snapshot.queryParamMap.get('vehiculoId');
    const abrirNueva = this.route.snapshot.queryParamMap.get('nueva');
    if (abrirNueva && vehiculoIdParam) {
      void this.abrirCrear(Number(vehiculoIdParam));
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

  async cargar(event?: TableLazyLoadEvent): Promise<void> {
    this.cargando.set(true);
    const page = event ? Math.floor((event.first ?? 0) / this.limit) + 1 : this.page;
    this.page = page;

    try {
      const respuesta = await this.service.listar({
        page,
        limit: this.limit,
        estado: this.estadoFiltro() ?? undefined,
      });
      this.ordenes.set(respuesta.data);
      this.total.set(respuesta.meta.total);
    } finally {
      this.cargando.set(false);
    }
  }

  filtrarPorEstado(estado: EstadoOrden | null, tabla: Table): void {
    this.estadoFiltro.set(estado);
    tabla.first = 0;
    this.page = 1;
    void this.cargar();
  }

  async abrirCrear(vehiculoId?: number): Promise<void> {
    this.form.reset({ vehiculoId: vehiculoId ?? 0, mecanicoId: null, kilometraje: null, observaciones: '' });
    this.vehiculoPreseleccionado.set(null);

    if (vehiculoId) {
      const vehiculo = await this.vehiculosService.obtener(vehiculoId);
      this.vehiculoPreseleccionado.set(vehiculo);
      this.form.patchValue({ kilometraje: vehiculo.kilometrajeActual });
    }

    this.dialogoVisible.set(true);
  }

  async buscarVehiculos(event: AutoCompleteCompleteEvent): Promise<void> {
    const respuesta = await this.vehiculosService.listar({ q: event.query, limit: 10, activo: 'true' });
    this.sugerenciasVehiculo.set(respuesta.data);
  }

  seleccionarVehiculo(vehiculo: Vehiculo): void {
    this.vehiculoPreseleccionado.set(vehiculo);
    this.form.patchValue({ vehiculoId: vehiculo.id, kilometraje: vehiculo.kilometrajeActual });
  }

  quitarVehiculoSeleccionado(): void {
    this.vehiculoPreseleccionado.set(null);
    this.form.patchValue({ vehiculoId: 0, kilometraje: null });
  }

  cerrarDialogo(): void {
    this.dialogoVisible.set(false);
    // Limpia los query params de apertura automatica al cerrar, sin recargar.
    void this.router.navigate([], { queryParams: {}, relativeTo: this.route });
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const valores = this.form.getRawValue();

    try {
      const orden = await this.service.crear({
        vehiculoId: valores.vehiculoId,
        mecanicoId: valores.mecanicoId,
        kilometraje: valores.kilometraje,
        observaciones: valores.observaciones || null,
      });
      this.mensajes.add({ severity: 'success', summary: 'Orden creada', detail: orden.numero });
      this.dialogoVisible.set(false);
      await this.router.navigate(['/ordenes-trabajo', orden.id]);
    } finally {
      this.guardando.set(false);
    }
  }
}

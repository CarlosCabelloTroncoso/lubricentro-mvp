import { Component, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Table, TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { VehiculosService } from '../../core/services/vehiculos.service';
import { ClientesService } from '../../core/services/clientes.service';
import { AuthService } from '../../core/services/auth.service';
import type { Vehiculo, VehiculoInput } from '../../core/models/vehiculo.model';
import type { Cliente } from '../../core/models/cliente.model';

@Component({
  selector: 'app-vehiculos-list',
  imports: [
    RouterLink,
    DecimalPipe,
    ReactiveFormsModule,
    TableModule,
    ButtonDirective,
    InputText,
    InputNumber,
    Select,
    Tag,
    Dialog,
    IconField,
    InputIcon,
  ],
  templateUrl: './vehiculos-list.html',
  styleUrl: './vehiculos-list.scss',
})
export class VehiculosList {
  private readonly service = inject(VehiculosService);
  private readonly clientesService = inject(ClientesService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmacion = inject(ConfirmationService);
  private readonly mensajes = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);

  readonly vehiculos = signal<Vehiculo[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);
  readonly filtro = signal('');
  readonly clienteIdFiltro = signal<number | undefined>(undefined);
  readonly clienteNombreFiltro = signal<string | null>(null);
  readonly limit = 10;

  readonly clientesOpciones = signal<Cliente[]>([]);
  readonly dialogoVisible = signal(false);
  readonly guardando = signal(false);
  readonly editando = signal<Vehiculo | null>(null);

  readonly form = this.fb.nonNullable.group({
    clienteId: [0, [Validators.required, Validators.min(1)]],
    patente: ['', [Validators.required, Validators.minLength(5)]],
    marca: ['', [Validators.required]],
    modelo: ['', [Validators.required]],
    anio: this.fb.control<number | null>(null),
    color: [''],
    kilometrajeActual: [0, [Validators.min(0)]],
  });

  private page = 1;
  private busquedaTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    const clienteIdParam = this.route.snapshot.queryParamMap.get('clienteId');
    if (clienteIdParam) {
      this.clienteIdFiltro.set(Number(clienteIdParam));
      void this.clientesService.obtener(Number(clienteIdParam)).then((c) => {
        this.clienteNombreFiltro.set(c.nombreCompleto);
      });
    }
    void this.cargarClientesOpciones();
  }

  private async cargarClientesOpciones(): Promise<void> {
    const respuesta = await this.clientesService.listar({ limit: 100, activo: 'true' });
    this.clientesOpciones.set(respuesta.data);
  }

  async cargar(event?: TableLazyLoadEvent): Promise<void> {
    this.cargando.set(true);
    const page = event ? Math.floor((event.first ?? 0) / this.limit) + 1 : this.page;
    this.page = page;

    try {
      const respuesta = await this.service.listar({
        page,
        limit: this.limit,
        q: this.filtro() || undefined,
        clienteId: this.clienteIdFiltro(),
      });
      this.vehiculos.set(respuesta.data);
      this.total.set(respuesta.meta.total);
    } finally {
      this.cargando.set(false);
    }
  }

  buscar(valor: string, tabla: Table): void {
    this.filtro.set(valor);
    clearTimeout(this.busquedaTimeout);
    this.busquedaTimeout = setTimeout(() => {
      tabla.first = 0;
      this.page = 1;
      void this.cargar();
    }, 350);
  }

  quitarFiltroCliente(tabla: Table): void {
    this.clienteIdFiltro.set(undefined);
    this.clienteNombreFiltro.set(null);
    tabla.first = 0;
    this.page = 1;
    void this.cargar();
  }

  abrirCrear(): void {
    this.editando.set(null);
    this.form.reset({
      clienteId: this.clienteIdFiltro() ?? 0,
      patente: '',
      marca: '',
      modelo: '',
      anio: null,
      color: '',
      kilometrajeActual: 0,
    });
    this.dialogoVisible.set(true);
  }

  abrirEditar(vehiculo: Vehiculo): void {
    this.editando.set(vehiculo);
    this.form.setValue({
      clienteId: vehiculo.clienteId,
      patente: vehiculo.patente,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      color: vehiculo.color ?? '',
      kilometrajeActual: vehiculo.kilometrajeActual,
    });
    this.dialogoVisible.set(true);
  }

  cerrarDialogo(): void {
    this.dialogoVisible.set(false);
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const valores = this.form.getRawValue();
    const input: VehiculoInput = {
      clienteId: valores.clienteId,
      patente: valores.patente,
      marca: valores.marca,
      modelo: valores.modelo,
      anio: valores.anio,
      color: valores.color || null,
      kilometrajeActual: valores.kilometrajeActual,
    };

    try {
      const actual = this.editando();
      if (actual) {
        await this.service.actualizar(actual.id, input);
        this.mensajes.add({ severity: 'success', summary: 'Vehiculo actualizado' });
      } else {
        await this.service.crear(input);
        this.mensajes.add({ severity: 'success', summary: 'Vehiculo creado' });
      }
      this.dialogoVisible.set(false);
      await this.cargar();
    } finally {
      this.guardando.set(false);
    }
  }

  confirmarDesactivar(vehiculo: Vehiculo): void {
    this.confirmacion.confirm({
      header: 'Desactivar vehiculo',
      message: `¿Desactivar el vehiculo ${vehiculo.patente}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: 'Desactivar' },
      rejectButtonProps: { severity: 'secondary', outlined: true, label: 'Cancelar' },
      accept: async () => {
        await this.service.desactivar(vehiculo.id);
        this.mensajes.add({ severity: 'success', summary: 'Vehiculo desactivado' });
        await this.cargar();
      },
    });
  }

  async reactivar(vehiculo: Vehiculo): Promise<void> {
    await this.service.reactivar(vehiculo.id);
    this.mensajes.add({ severity: 'success', summary: 'Vehiculo reactivado' });
    await this.cargar();
  }
}

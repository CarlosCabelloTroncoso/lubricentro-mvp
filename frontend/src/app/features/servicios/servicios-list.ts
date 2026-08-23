import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { Table, TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { ServiciosService } from '../../core/services/servicios.service';
import { AuthService } from '../../core/services/auth.service';
import type { Servicio, ServicioInput } from '../../core/models/servicio.model';

@Component({
  selector: 'app-servicios-list',
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    TableModule,
    ButtonDirective,
    InputText,
    InputNumber,
    Textarea,
    Tag,
    Dialog,
    IconField,
    InputIcon,
  ],
  templateUrl: './servicios-list.html',
  styleUrl: './servicios-list.scss',
})
export class ServiciosList {
  private readonly service = inject(ServiciosService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmacion = inject(ConfirmationService);
  private readonly mensajes = inject(MessageService);
  readonly auth = inject(AuthService);

  readonly servicios = signal<Servicio[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);
  readonly filtro = signal('');
  readonly limit = 10;

  readonly dialogoVisible = signal(false);
  readonly guardando = signal(false);
  readonly editando = signal<Servicio | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0)]],
  });

  private page = 1;
  private busquedaTimeout?: ReturnType<typeof setTimeout>;

  async cargar(event?: TableLazyLoadEvent): Promise<void> {
    this.cargando.set(true);
    const page = event ? Math.floor((event.first ?? 0) / this.limit) + 1 : this.page;
    this.page = page;

    try {
      const respuesta = await this.service.listar({
        page,
        limit: this.limit,
        q: this.filtro() || undefined,
      });
      this.servicios.set(respuesta.data);
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

  abrirCrear(): void {
    this.editando.set(null);
    this.form.reset({ nombre: '', descripcion: '', precio: 0 });
    this.dialogoVisible.set(true);
  }

  abrirEditar(servicio: Servicio): void {
    this.editando.set(servicio);
    this.form.setValue({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion ?? '',
      precio: servicio.precio,
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
    const input: ServicioInput = {
      nombre: valores.nombre,
      descripcion: valores.descripcion || null,
      precio: valores.precio,
    };

    try {
      const actual = this.editando();
      if (actual) {
        await this.service.actualizar(actual.id, input);
        this.mensajes.add({ severity: 'success', summary: 'Servicio actualizado' });
      } else {
        await this.service.crear(input);
        this.mensajes.add({ severity: 'success', summary: 'Servicio creado' });
      }
      this.dialogoVisible.set(false);
      await this.cargar();
    } finally {
      this.guardando.set(false);
    }
  }

  confirmarDesactivar(servicio: Servicio): void {
    this.confirmacion.confirm({
      header: 'Desactivar servicio',
      message: `¿Desactivar "${servicio.nombre}"? Ya no podra agregarse a nuevas ordenes.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: 'Desactivar' },
      rejectButtonProps: { severity: 'secondary', outlined: true, label: 'Cancelar' },
      accept: async () => {
        await this.service.desactivar(servicio.id);
        this.mensajes.add({ severity: 'success', summary: 'Servicio desactivado' });
        await this.cargar();
      },
    });
  }

  async reactivar(servicio: Servicio): Promise<void> {
    await this.service.reactivar(servicio.id);
    this.mensajes.add({ severity: 'success', summary: 'Servicio reactivado' });
    await this.cargar();
  }
}

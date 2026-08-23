import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Table, TableModule, type TableLazyLoadEvent } from 'primeng/table';
import { ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { ClientesService } from '../../core/services/clientes.service';
import { AuthService } from '../../core/services/auth.service';
import type { Cliente, ClienteInput } from '../../core/models/cliente.model';

@Component({
  selector: 'app-clientes-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    TableModule,
    ButtonDirective,
    InputText,
    Tag,
    Dialog,
    IconField,
    InputIcon,
  ],
  templateUrl: './clientes-list.html',
  styleUrl: './clientes-list.scss',
})
export class ClientesList {
  private readonly service = inject(ClientesService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmacion = inject(ConfirmationService);
  private readonly mensajes = inject(MessageService);
  readonly auth = inject(AuthService);

  readonly clientes = signal<Cliente[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);
  readonly filtro = signal('');
  readonly limit = 10;

  readonly dialogoVisible = signal(false);
  readonly guardando = signal(false);
  readonly editando = signal<Cliente | null>(null);

  readonly form = this.fb.nonNullable.group({
    rut: ['', [Validators.required, Validators.minLength(8)]],
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellido: ['', [Validators.required, Validators.minLength(2)]],
    telefono: [''],
    email: [''],
    direccion: [''],
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
      this.clientes.set(respuesta.data);
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
    this.form.reset();
    this.dialogoVisible.set(true);
  }

  abrirEditar(cliente: Cliente): void {
    this.editando.set(cliente);
    this.form.setValue({
      rut: cliente.rut,
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      telefono: cliente.telefono ?? '',
      email: cliente.email ?? '',
      direccion: cliente.direccion ?? '',
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
    const input: ClienteInput = {
      rut: valores.rut,
      nombre: valores.nombre,
      apellido: valores.apellido,
      telefono: valores.telefono || null,
      email: valores.email || null,
      direccion: valores.direccion || null,
    };

    try {
      const actual = this.editando();
      if (actual) {
        await this.service.actualizar(actual.id, input);
        this.mensajes.add({ severity: 'success', summary: 'Cliente actualizado' });
      } else {
        await this.service.crear(input);
        this.mensajes.add({ severity: 'success', summary: 'Cliente creado' });
      }
      this.dialogoVisible.set(false);
      await this.cargar();
    } finally {
      this.guardando.set(false);
    }
  }

  confirmarDesactivar(cliente: Cliente): void {
    this.confirmacion.confirm({
      header: 'Desactivar cliente',
      message: `¿Desactivar a ${cliente.nombreCompleto}? Sus vehiculos y ordenes se mantienen.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: 'Desactivar' },
      rejectButtonProps: { severity: 'secondary', outlined: true, label: 'Cancelar' },
      accept: async () => {
        await this.service.desactivar(cliente.id);
        this.mensajes.add({ severity: 'success', summary: 'Cliente desactivado' });
        await this.cargar();
      },
    });
  }

  async reactivar(cliente: Cliente): Promise<void> {
    await this.service.reactivar(cliente.id);
    this.mensajes.add({ severity: 'success', summary: 'Cliente reactivado' });
    await this.cargar();
  }
}

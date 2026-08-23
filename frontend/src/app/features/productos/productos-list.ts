import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { ProductosService } from '../../core/services/productos.service';
import { AuthService } from '../../core/services/auth.service';
import type { Producto, ProductoInput } from '../../core/models/producto.model';

@Component({
  selector: 'app-productos-list',
  imports: [
    CurrencyPipe,
    FormsModule,
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
  templateUrl: './productos-list.html',
  styleUrl: './productos-list.scss',
})
export class ProductosList {
  private readonly service = inject(ProductosService);
  private readonly fb = inject(FormBuilder);
  private readonly confirmacion = inject(ConfirmationService);
  private readonly mensajes = inject(MessageService);
  readonly auth = inject(AuthService);

  readonly productos = signal<Producto[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);
  readonly filtro = signal('');
  readonly limit = 10;

  readonly dialogoVisible = signal(false);
  readonly guardando = signal(false);
  readonly editando = signal<Producto | null>(null);

  readonly dialogoStockVisible = signal(false);
  readonly productoStock = signal<Producto | null>(null);
  readonly cantidadAjuste = signal<number>(0);
  readonly guardandoStock = signal(false);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0)]],
    stockActual: [0, [Validators.min(0)]],
    stockMinimo: [0, [Validators.min(0)]],
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
      this.productos.set(respuesta.data);
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
    this.form.reset({ nombre: '', descripcion: '', precio: 0, stockActual: 0, stockMinimo: 0 });
    this.dialogoVisible.set(true);
  }

  abrirEditar(producto: Producto): void {
    this.editando.set(producto);
    this.form.setValue({
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? '',
      precio: producto.precio,
      stockActual: producto.stockActual,
      stockMinimo: producto.stockMinimo,
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

    try {
      const actual = this.editando();
      if (actual) {
        // El stock del producto existente se ajusta solo por "ajustar-stock",
        // no por este formulario: evita pisar el inventario real por error.
        const input: Partial<ProductoInput> = {
          nombre: valores.nombre,
          descripcion: valores.descripcion || null,
          precio: valores.precio,
        };
        await this.service.actualizar(actual.id, input);
        this.mensajes.add({ severity: 'success', summary: 'Producto actualizado' });
      } else {
        const input: ProductoInput = {
          nombre: valores.nombre,
          descripcion: valores.descripcion || null,
          precio: valores.precio,
          stockActual: valores.stockActual,
          stockMinimo: valores.stockMinimo,
        };
        await this.service.crear(input);
        this.mensajes.add({ severity: 'success', summary: 'Producto creado' });
      }
      this.dialogoVisible.set(false);
      await this.cargar();
    } finally {
      this.guardando.set(false);
    }
  }

  abrirAjusteStock(producto: Producto): void {
    this.productoStock.set(producto);
    this.cantidadAjuste.set(0);
    this.dialogoStockVisible.set(true);
  }

  cerrarDialogoStock(): void {
    this.dialogoStockVisible.set(false);
  }

  async guardarAjusteStock(): Promise<void> {
    const producto = this.productoStock();
    const cantidad = this.cantidadAjuste();
    if (!producto || !cantidad) return;

    this.guardandoStock.set(true);
    try {
      await this.service.ajustarStock(producto.id, cantidad);
      this.mensajes.add({ severity: 'success', summary: 'Stock ajustado' });
      this.dialogoStockVisible.set(false);
      await this.cargar();
    } finally {
      this.guardandoStock.set(false);
    }
  }

  confirmarDesactivar(producto: Producto): void {
    this.confirmacion.confirm({
      header: 'Desactivar producto',
      message: `¿Desactivar "${producto.nombre}"? Ya no podra agregarse a nuevas ordenes.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { severity: 'danger', label: 'Desactivar' },
      rejectButtonProps: { severity: 'secondary', outlined: true, label: 'Cancelar' },
      accept: async () => {
        await this.service.desactivar(producto.id);
        this.mensajes.add({ severity: 'success', summary: 'Producto desactivado' });
        await this.cargar();
      },
    });
  }

  async reactivar(producto: Producto): Promise<void> {
    await this.service.reactivar(producto.id);
    this.mensajes.add({ severity: 'success', summary: 'Producto reactivado' });
    await this.cargar();
  }
}

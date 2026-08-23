import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ApiItemResponse, ApiListResponse } from '../models/common.model';
import type { Producto, ProductoInput } from '../models/producto.model';

export interface ListarProductosFiltros {
  page?: number;
  limit?: number;
  q?: string;
  activo?: 'true' | 'false';
  bajoMinimo?: 'true';
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/productos';

  listar(filtros: ListarProductosFiltros = {}): Promise<ApiListResponse<Producto>> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== '') params = params.set(clave, String(valor));
    }
    return firstValueFrom(this.http.get<ApiListResponse<Producto>>(this.base, { params }));
  }

  crear(input: ProductoInput): Promise<Producto> {
    return firstValueFrom(this.http.post<ApiItemResponse<Producto>>(this.base, input)).then(
      (r) => r.data,
    );
  }

  actualizar(id: number, input: Partial<ProductoInput>): Promise<Producto> {
    return firstValueFrom(
      this.http.put<ApiItemResponse<Producto>>(`${this.base}/${id}`, input),
    ).then((r) => r.data);
  }

  ajustarStock(id: number, cantidad: number): Promise<Producto> {
    return firstValueFrom(
      this.http.post<ApiItemResponse<Producto>>(`${this.base}/${id}/ajustar-stock`, { cantidad }),
    ).then((r) => r.data);
  }

  desactivar(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
  }

  reactivar(id: number): Promise<Producto> {
    return firstValueFrom(
      this.http.patch<ApiItemResponse<Producto>>(`${this.base}/${id}/reactivar`, {}),
    ).then((r) => r.data);
  }
}

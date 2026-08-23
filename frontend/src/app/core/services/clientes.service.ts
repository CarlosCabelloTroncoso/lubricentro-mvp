import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ApiItemResponse, ApiListResponse } from '../models/common.model';
import type { Cliente, ClienteInput } from '../models/cliente.model';

export interface ListarClientesFiltros {
  page?: number;
  limit?: number;
  q?: string;
  activo?: 'true' | 'false';
}

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/clientes';

  listar(filtros: ListarClientesFiltros = {}): Promise<ApiListResponse<Cliente>> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== '') params = params.set(clave, String(valor));
    }
    return firstValueFrom(this.http.get<ApiListResponse<Cliente>>(this.base, { params }));
  }

  obtener(id: number): Promise<Cliente> {
    return firstValueFrom(this.http.get<ApiItemResponse<Cliente>>(`${this.base}/${id}`)).then(
      (r) => r.data,
    );
  }

  crear(input: ClienteInput): Promise<Cliente> {
    return firstValueFrom(this.http.post<ApiItemResponse<Cliente>>(this.base, input)).then(
      (r) => r.data,
    );
  }

  actualizar(id: number, input: Partial<ClienteInput>): Promise<Cliente> {
    return firstValueFrom(
      this.http.put<ApiItemResponse<Cliente>>(`${this.base}/${id}`, input),
    ).then((r) => r.data);
  }

  desactivar(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
  }

  reactivar(id: number): Promise<Cliente> {
    return firstValueFrom(
      this.http.patch<ApiItemResponse<Cliente>>(`${this.base}/${id}/reactivar`, {}),
    ).then((r) => r.data);
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ApiItemResponse, ApiListResponse } from '../models/common.model';
import type { Servicio, ServicioInput } from '../models/servicio.model';

export interface ListarServiciosFiltros {
  page?: number;
  limit?: number;
  q?: string;
  activo?: 'true' | 'false';
}

@Injectable({ providedIn: 'root' })
export class ServiciosService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/servicios';

  listar(filtros: ListarServiciosFiltros = {}): Promise<ApiListResponse<Servicio>> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== '') params = params.set(clave, String(valor));
    }
    return firstValueFrom(this.http.get<ApiListResponse<Servicio>>(this.base, { params }));
  }

  crear(input: ServicioInput): Promise<Servicio> {
    return firstValueFrom(this.http.post<ApiItemResponse<Servicio>>(this.base, input)).then(
      (r) => r.data,
    );
  }

  actualizar(id: number, input: Partial<ServicioInput>): Promise<Servicio> {
    return firstValueFrom(
      this.http.put<ApiItemResponse<Servicio>>(`${this.base}/${id}`, input),
    ).then((r) => r.data);
  }

  desactivar(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
  }

  reactivar(id: number): Promise<Servicio> {
    return firstValueFrom(
      this.http.patch<ApiItemResponse<Servicio>>(`${this.base}/${id}/reactivar`, {}),
    ).then((r) => r.data);
  }
}

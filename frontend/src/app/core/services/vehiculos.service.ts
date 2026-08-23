import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ApiItemResponse, ApiListResponse } from '../models/common.model';
import type { Vehiculo, VehiculoInput } from '../models/vehiculo.model';
import type { OrdenDetalle } from '../models/orden.model';

export interface ListarVehiculosFiltros {
  page?: number;
  limit?: number;
  q?: string;
  clienteId?: number;
  activo?: 'true' | 'false';
}

@Injectable({ providedIn: 'root' })
export class VehiculosService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/vehiculos';

  listar(filtros: ListarVehiculosFiltros = {}): Promise<ApiListResponse<Vehiculo>> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== '') params = params.set(clave, String(valor));
    }
    return firstValueFrom(this.http.get<ApiListResponse<Vehiculo>>(this.base, { params }));
  }

  obtener(id: number): Promise<Vehiculo> {
    return firstValueFrom(this.http.get<ApiItemResponse<Vehiculo>>(`${this.base}/${id}`)).then(
      (r) => r.data,
    );
  }

  historial(id: number): Promise<OrdenDetalle[]> {
    return firstValueFrom(
      this.http.get<ApiItemResponse<OrdenDetalle[]>>(`${this.base}/${id}/historial`),
    ).then((r) => r.data);
  }

  crear(input: VehiculoInput): Promise<Vehiculo> {
    return firstValueFrom(this.http.post<ApiItemResponse<Vehiculo>>(this.base, input)).then(
      (r) => r.data,
    );
  }

  actualizar(id: number, input: Partial<VehiculoInput>): Promise<Vehiculo> {
    return firstValueFrom(
      this.http.put<ApiItemResponse<Vehiculo>>(`${this.base}/${id}`, input),
    ).then((r) => r.data);
  }

  desactivar(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base}/${id}`));
  }

  reactivar(id: number): Promise<Vehiculo> {
    return firstValueFrom(
      this.http.patch<ApiItemResponse<Vehiculo>>(`${this.base}/${id}/reactivar`, {}),
    ).then((r) => r.data);
  }
}

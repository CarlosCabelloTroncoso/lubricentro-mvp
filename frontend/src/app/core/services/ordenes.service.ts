import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ApiItemResponse, ApiListResponse } from '../models/common.model';
import type {
  CrearOrdenInput,
  EstadoOrden,
  OrdenDetalle,
  OrdenResumen,
} from '../models/orden.model';

export interface ListarOrdenesFiltros {
  page?: number;
  limit?: number;
  estado?: EstadoOrden;
  vehiculoId?: number;
  clienteId?: number;
  mecanicoId?: number;
}

@Injectable({ providedIn: 'root' })
export class OrdenesService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/ordenes-trabajo';

  listar(filtros: ListarOrdenesFiltros = {}): Promise<ApiListResponse<OrdenResumen>> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== '') params = params.set(clave, String(valor));
    }
    return firstValueFrom(this.http.get<ApiListResponse<OrdenResumen>>(this.base, { params }));
  }

  obtener(id: number): Promise<OrdenDetalle> {
    return firstValueFrom(
      this.http.get<ApiItemResponse<OrdenDetalle>>(`${this.base}/${id}`),
    ).then((r) => r.data);
  }

  crear(input: CrearOrdenInput): Promise<OrdenDetalle> {
    return firstValueFrom(
      this.http.post<ApiItemResponse<OrdenDetalle>>(this.base, input),
    ).then((r) => r.data);
  }

  cambiarEstado(id: number, estado: EstadoOrden): Promise<OrdenDetalle> {
    return firstValueFrom(
      this.http.patch<ApiItemResponse<OrdenDetalle>>(`${this.base}/${id}/estado`, { estado }),
    ).then((r) => r.data);
  }

  agregarServicio(id: number, servicioId: number, cantidad = 1): Promise<OrdenDetalle> {
    return firstValueFrom(
      this.http.post<ApiItemResponse<OrdenDetalle>>(`${this.base}/${id}/servicios`, {
        servicioId,
        cantidad,
      }),
    ).then((r) => r.data);
  }

  quitarServicio(id: number, lineaId: number): Promise<OrdenDetalle> {
    return firstValueFrom(
      this.http.delete<ApiItemResponse<OrdenDetalle>>(`${this.base}/${id}/servicios/${lineaId}`),
    ).then((r) => r.data);
  }

  agregarProducto(id: number, productoId: number, cantidad = 1): Promise<OrdenDetalle> {
    return firstValueFrom(
      this.http.post<ApiItemResponse<OrdenDetalle>>(`${this.base}/${id}/productos`, {
        productoId,
        cantidad,
      }),
    ).then((r) => r.data);
  }

  quitarProducto(id: number, lineaId: number): Promise<OrdenDetalle> {
    return firstValueFrom(
      this.http.delete<ApiItemResponse<OrdenDetalle>>(`${this.base}/${id}/productos/${lineaId}`),
    ).then((r) => r.data);
  }
}

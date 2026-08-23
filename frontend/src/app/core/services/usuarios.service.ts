import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ApiItemResponse } from '../models/common.model';

export interface MecanicoResumen {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);

  listarMecanicos(): Promise<MecanicoResumen[]> {
    return firstValueFrom(
      this.http.get<ApiItemResponse<MecanicoResumen[]>>('/api/usuarios/mecanicos'),
    ).then((r) => r.data);
  }
}

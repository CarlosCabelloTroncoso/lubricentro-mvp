import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ApiItemResponse } from '../models/common.model';
import type { DashboardResumen } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  resumen(): Promise<DashboardResumen> {
    return firstValueFrom(
      this.http.get<ApiItemResponse<DashboardResumen>>('/api/dashboard'),
    ).then((r) => r.data);
  }
}

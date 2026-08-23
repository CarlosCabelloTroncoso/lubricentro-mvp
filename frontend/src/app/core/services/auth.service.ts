import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ApiItemResponse } from '../models/common.model';
import type { LoginInput, Rol, Usuario } from '../models/auth.model';

/**
 * Rehidrata la sesion contra GET /auth/me: el JWT vive en una cookie HttpOnly
 * que el frontend nunca lee, asi que el unico modo de saber "quien soy" es
 * preguntarle al backend. `sessionChecked` evita parpadeos de guard mientras
 * esa primera consulta esta en vuelo.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly usuarioSignal = signal<Usuario | null>(null);
  private readonly sessionCheckedSignal = signal(false);

  readonly usuario = this.usuarioSignal.asReadonly();
  readonly sessionChecked = this.sessionCheckedSignal.asReadonly();
  readonly estaAutenticado = computed(() => this.usuarioSignal() !== null);
  readonly rol = computed<Rol | null>(() => this.usuarioSignal()?.rol ?? null);

  private sesionEnCurso: Promise<Usuario | null> | null = null;

  /** Se llama una vez al arrancar la app (ver app.ts). Cachea la promesa en curso. */
  async verificarSesion(): Promise<Usuario | null> {
    if (this.sessionCheckedSignal()) return this.usuarioSignal();
    if (!this.sesionEnCurso) {
      this.sesionEnCurso = this.cargarSesion();
    }
    return this.sesionEnCurso;
  }

  private async cargarSesion(): Promise<Usuario | null> {
    try {
      const respuesta = await firstValueFrom(
        this.http.get<ApiItemResponse<Usuario>>('/api/auth/me'),
      );
      this.usuarioSignal.set(respuesta.data);
      return respuesta.data;
    } catch {
      this.usuarioSignal.set(null);
      return null;
    } finally {
      this.sessionCheckedSignal.set(true);
    }
  }

  async login(input: LoginInput): Promise<Usuario> {
    const respuesta = await firstValueFrom(
      this.http.post<ApiItemResponse<Usuario>>('/api/auth/login', input),
    );
    this.usuarioSignal.set(respuesta.data);
    this.sessionCheckedSignal.set(true);
    return respuesta.data;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/auth/logout', {}));
    } finally {
      this.usuarioSignal.set(null);
    }
  }

  tieneRol(...roles: Rol[]): boolean {
    const actual = this.rol();
    return actual !== null && roles.includes(actual);
  }
}

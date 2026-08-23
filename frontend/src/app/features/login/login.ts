import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { ButtonDirective } from 'primeng/button';
import { Message } from 'primeng/message';
import { AuthService } from '../../core/services/auth.service';
import type { ApiErrorBody } from '../../core/models/common.model';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, InputText, Password, ButtonDirective, Message],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly errorMensaje = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  async enviar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMensaje.set(null);
    try {
      await this.auth.login(this.form.getRawValue());
      await this.router.navigateByUrl('/');
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        const cuerpo = error.error as ApiErrorBody | undefined;
        this.errorMensaje.set(cuerpo?.error?.message ?? 'No se pudo iniciar sesion');
      } else {
        this.errorMensaje.set('No se pudo iniciar sesion');
      }
    } finally {
      this.cargando.set(false);
    }
  }
}

import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Avatar } from 'primeng/avatar';
import { Tag } from 'primeng/tag';
import { ButtonDirective } from 'primeng/button';
import { AuthService } from '../../core/services/auth.service';

interface ItemMenu {
  ruta: string;
  etiqueta: string;
  icono: string;
}

const ITEMS: ItemMenu[] = [
  { ruta: '/', etiqueta: 'Dashboard', icono: 'pi pi-home' },
  { ruta: '/clientes', etiqueta: 'Clientes', icono: 'pi pi-users' },
  { ruta: '/vehiculos', etiqueta: 'Vehiculos', icono: 'pi pi-car' },
  { ruta: '/servicios', etiqueta: 'Servicios', icono: 'pi pi-wrench' },
  { ruta: '/productos', etiqueta: 'Productos', icono: 'pi pi-box' },
  { ruta: '/ordenes-trabajo', etiqueta: 'Ordenes de trabajo', icono: 'pi pi-file-edit' },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Avatar, Tag, ButtonDirective],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly items = ITEMS;
  readonly usuario = this.auth.usuario;

  iniciales(nombre: string): string {
    return nombre
      .split(' ')
      .slice(0, 2)
      .map((parte) => parte.charAt(0).toUpperCase())
      .join('');
  }

  async cerrarSesion(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}

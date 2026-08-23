import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/clientes/clientes-list').then((m) => m.ClientesList),
      },
      {
        path: 'vehiculos',
        loadComponent: () =>
          import('./features/vehiculos/vehiculos-list').then((m) => m.VehiculosList),
      },
      {
        path: 'vehiculos/:id',
        loadComponent: () =>
          import('./features/vehiculos/vehiculo-detalle').then((m) => m.VehiculoDetalle),
      },
      {
        path: 'servicios',
        loadComponent: () =>
          import('./features/servicios/servicios-list').then((m) => m.ServiciosList),
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./features/productos/productos-list').then((m) => m.ProductosList),
      },
      {
        path: 'ordenes-trabajo',
        loadComponent: () => import('./features/ordenes/ordenes-list').then((m) => m.OrdenesList),
      },
      {
        path: 'ordenes-trabajo/:id',
        loadComponent: () =>
          import('./features/ordenes/orden-detalle').then((m) => m.OrdenDetalle),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];

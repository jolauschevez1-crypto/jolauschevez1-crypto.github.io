import { Routes } from '@angular/router';

import { Inicio } from './components/inicio/inicio';
import { Tuors } from './components/tuors/tuors';
import { Link } from './components/appmovil/link';
import { Perfil } from './components/perfil/perfil';
import { About } from './components/about/about';
import { Login } from './components/login/login';
import { Registro } from './components/registro/registro';
import { Home } from './components/home/home';
import { Favoritos } from './components/favoritos/favoritos';
import { Misreservas } from './components/misreservas/misreservas';
import { Detalletour } from './components/detalletour/detalletour';
import { Contactanos } from './components/navbar-inicio/contactanos/contactanos';
import { Ayuda } from './components/navbar-inicio/ayuda/ayuda';
import { Dashboard } from './components/admin/dashboard/dashboard';
import { ToursAdmin } from './components/admin/tours/tours';
import { ReservasAdmin } from './components/admin/reservas/reservas';
import { UsuariosAdmin } from './components/admin/usuarios/usuarios';
import { PerfilAdmin } from './components/admin/perfil/perfil';
import { PagosAdmin } from './components/admin/pagos-admin/pagos-admin';
import { CategoriasAdmin } from './components/admin/categorias/categorias';
import { ReportesAdmin } from './components/admin/reportes/reportes';
import { roleGuard } from './components/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'home',
    component: Home,
  },
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'registro',
    component: Registro,
  },
  {
    path: 'inicio',
    component: Inicio,
  },
  {
    path: 'contactanos',
    component: Contactanos,
  },
  {
    path: 'ayuda',
    component: Ayuda,
  },
  {
    path: 'tours',
    component: Tuors,
  },
  {
    path: 'tour/:id',
    component: Detalletour,
  },
  {
    path: 'appmovil',
    component: Link,
  },
  {
    path: 'about',
    component: About,
  },

  {
    path: 'perfil',
    component: Perfil,
    canActivate: [roleGuard],
  },
  {
    path: 'favoritos',
    component: Favoritos,
    canActivate: [roleGuard],
  },
  {
    path: 'reservas',
    component: Misreservas,
    canActivate: [roleGuard],
  },
  {
    path: 'mis-reservas',
    component: Misreservas,
    canActivate: [roleGuard],
  },
  {
    path: 'reserva/:id',
    loadComponent: () => import('./components/reserva/reserva').then((modulo) => modulo.Reserva),
    canActivate: [roleGuard],
  },
  {
    path: 'pago/:idReserva',
    loadComponent: () => import('./components/pago/pago').then((modulo) => modulo.Pago),
    canActivate: [roleGuard],
  },

  {
    path: 'admin/dashboard',
    component: Dashboard,
    canActivate: [roleGuard],
    data: {
      roles: ['admin'],
    },
  },
  {
    path: 'admin/tours',
    component: ToursAdmin,
    canActivate: [roleGuard],
    data: {
      roles: ['admin'],
    },
  },
  {
    path: 'admin/categorias',
    component: CategoriasAdmin,
    canActivate: [roleGuard],
    data: {
      roles: ['admin'],
    },
  },
  {
    path: 'admin/reservas',
    component: ReservasAdmin,
    canActivate: [roleGuard],
    data: {
      roles: ['admin'],
    },
  },
  {
    path: 'admin/pagos',
    component: PagosAdmin,
    canActivate: [roleGuard],
    data: {
      roles: ['admin'],
    },
  },
  {
    path: 'admin/usuarios',
    component: UsuariosAdmin,
    canActivate: [roleGuard],
    data: {
      roles: ['admin'],
    },
  },
  {
    path: 'admin/reportes',
    component: ReportesAdmin,
    canActivate: [roleGuard],
    data: {
      roles: ['admin'],
    },
  },
  {
    path: 'admin/perfil',
    component: PerfilAdmin,
    canActivate: [roleGuard],
    data: {
      roles: ['admin'],
    },
  },

  {
    path: '**',
    redirectTo: 'home',
  },
];

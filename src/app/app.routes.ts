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
import { Reserva } from './components/reserva/reserva';
import { Dashboard } from './components/admin/dashboard/dashboard';
import { ToursAdmin } from './components/admin/tours/tours';
import { ReservasAdmin } from './components/admin/reservas/reservas';
import { UsuariosAdmin } from './components/admin/usuarios/usuarios';
import { Contactanos } from './components/navbar-inicio/contactanos/contactanos';

export const routes: Routes = [
    { path: '', pathMatch: 'full', component: Home },
    { path: 'home', component: Home },
    { path: 'login', component: Login },
    { path: 'registro', component: Registro },
    { path: 'inicio', component: Inicio },
    { path: 'contactanos', component: Contactanos },
    { path: 'tours', component: Tuors },
    { path: 'tour/:id', component: Detalletour },
    { path: 'reservar/:id', component: Reserva },
    { path: 'tuor/:id', redirectTo: 'tour/:id', pathMatch: 'full' },
    { path: 'appmovil', component: Link },
    { path: 'about', component: About },
    { path: 'perfil', component: Perfil },
    { path: 'favoritos', component: Favoritos },
    { path: 'reservas', component: Misreservas },
    { path: 'admin/dashboard', component: Dashboard },
    { path: 'admin/tours',     component: ToursAdmin },
    { path: 'admin/reservas',  component: ReservasAdmin },
    { path: 'admin/usuarios',  component: UsuariosAdmin },
    { path: '**', redirectTo: 'home' }
];

import { Routes } from '@angular/router';
import { Inicio } from './components/inicio/inicio';
import { Tuors } from './components/tuors/tuors';
import { Link } from './components/appmovil/link';
import { Perfil } from './components/perfil/perfil';
import { About } from './components/about/about';
import { Login } from './components/login/login';
import { Registro } from './components/registro/registro';
import { Home } from './components/home/home';
import { Destinos } from './components/destinos/destinos';
import { Favoritos } from './components/favoritos/favoritos';
import { Misreservas } from './components/misreservas/misreservas';

export const routes: Routes = [
    { path: '', pathMatch: 'full', component: Home },
    { path: 'home', component: Home },
    { path: 'login', component: Login },
    { path: 'registro', component: Registro },
    { path: 'inicio', component: Inicio },
    { path: 'tours', component: Tuors },
    { path: 'appmovil', component: Link },
    { path: 'about', component: About },
    { path: 'perfil', component: Perfil },
    { path: 'destinos', component: Destinos },
    { path: 'favoritos', component: Favoritos },
    { path: 'reservas', component: Misreservas },
    { path: '**', redirectTo: 'home' }
];

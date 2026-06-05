import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { NgIf } from '@angular/common';
import { Sidebar } from '../sidebar/sidebar';
import { NavbarAdmin } from '../navbar-admin/navbar-admin';
import { Fooster } from './fooster/fooster';

@Component({
  selector: 'app-navbar-inicio',
  standalone: true,
  imports: [RouterOutlet, Sidebar, NavbarAdmin, NgIf, RouterLink,Fooster],
  templateUrl: './navbar-inicio.html',
  styleUrls: ['./navbar-inicio.css'],
})
export class NavbarInicio {
  protected readonly title = signal('Proyecto-Tuor');
  protected readonly auth = inject(AuthService);
  protected readonly router = inject(Router);
}

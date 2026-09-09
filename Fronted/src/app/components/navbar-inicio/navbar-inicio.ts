import { NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { NavbarAdmin } from '../navbar-admin/navbar-admin';
import { Sidebar } from '../sidebar/sidebar';
import { Fooster } from './fooster/fooster';

@Component({
  selector: 'app-navbar-inicio',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Sidebar, NavbarAdmin, NgIf, Fooster],
  templateUrl: './navbar-inicio.html',
  styleUrls: ['./navbar-inicio.css'],
})
export class NavbarInicio {
  protected readonly title = signal('SITG');
  protected readonly auth = inject(AuthService);
  protected readonly router = inject(Router);
}

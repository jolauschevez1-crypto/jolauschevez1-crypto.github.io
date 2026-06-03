import { Component, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterOutlet, Router, RouterLink } from '@angular/router';
import { Sidebar } from './components/sidebar/sidebar';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Sidebar, NgIf, RouterLink],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('Proyecto-Tuor');
  protected readonly auth = inject(AuthService);
  protected readonly router = inject(Router);
}

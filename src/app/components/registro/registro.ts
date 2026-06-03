import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './registro.html',
  styleUrls: ['./registro.css'],
})
export class Registro {
  private readonly router = inject(Router);

  protected register(name: HTMLInputElement, email: HTMLInputElement, password: HTMLInputElement, confirmPassword: HTMLInputElement): void {
    if (!name.value || !email.value || !password.value || password.value !== confirmPassword.value) {
      return;
    }
    this.router.navigate(['/login']);
  }
}

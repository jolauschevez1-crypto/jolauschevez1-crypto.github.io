import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected submit(email: HTMLInputElement, password: HTMLInputElement): void {
    if (!email.value || !password.value) {
      return;
    }
    this.auth.login();
    this.router.navigate(['/inicio']);
  }
}

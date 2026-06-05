import { Component, inject } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  protected showPassword = false;
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected submit(email: HTMLInputElement, password: HTMLInputElement): void {

  const emailValue = email.value.trim();
  const passwordValue = password.value.trim();

  if (!emailValue) {
    alert('Ingrese su correo electrónico');
    email.focus();
    return;
  }

  if (!passwordValue) {
    alert('Ingrese su contraseña');
    password.focus();
    return;
  }

  // 2. formato email real
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailValue)) {
    alert('Correo inválido');
    email.focus();
    return;
  }

  if (passwordValue.length < 8) {
    alert('La contraseña debe tener mínimo 8 caracteres');
    password.focus();
    return;
  }

  if (!/[A-Z]/.test(passwordValue)) {
    alert('La contraseña debe tener al menos una letra mayúscula');
    password.focus();
    return;
  }

  if (!/[a-z]/.test(passwordValue)) {
    alert('La contraseña debe tener al menos una letra minúscula');
    password.focus();
    return;
  }

  if (!/[0-9]/.test(passwordValue)) {
    alert('La contraseña debe tener al menos un número');
    password.focus();
    return;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordValue)) {
    alert('La contraseña debe tener al menos un carácter especial');
    password.focus();
    return;
  }

  const role = emailValue.includes('@admin') ? 'admin' : 'user';
  this.auth.login(emailValue, undefined, role);

  // Prefer sessionStorage returnUrl (robusto), si no existe usar queryParam
  try {
    const stored = sessionStorage.getItem('returnUrl');
    if (stored) {
      sessionStorage.removeItem('returnUrl');
      // stored already contains encoded query params (ej: /detalletour?tour=Guayaquil%20Completo)
      this.router.navigateByUrl(stored);
      return;
    }
  } catch (e) {}

  const returnUrlParam = this.route.snapshot.queryParams['returnUrl'];
  if (returnUrlParam) {
    try {
      // algunos flujos pueden doble-encodear la URL; intentar decodificar varias veces
      let decoded = returnUrlParam;
      for (let i = 0; i < 5; i++) {
        try {
          const next = decodeURIComponent(decoded);
          if (next === decoded) break;
          decoded = next;
        } catch (err) {
          break;
        }
      }

      // Asegurar que la URL comienza por '/', si no, extraer desde la primera '/'
      if (!decoded.startsWith('/')) {
        const idx = decoded.indexOf('/');
        if (idx !== -1) decoded = decoded.substring(idx);
      }

      this.router.navigateByUrl(decoded);
      return;
    } catch (e) {
      // si falla decode, cae al inicio
    }
  }

  const redirectPath = role === 'admin' ? '/admin/dashboard' : '/inicio';
  this.router.navigate([redirectPath]);

  }
}

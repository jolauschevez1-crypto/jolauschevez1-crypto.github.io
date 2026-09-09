import { CommonModule } from '@angular/common';

import { Component, inject, signal } from '@angular/core';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  protected showPassword = false;

  protected readonly cargando = signal(false);

  protected readonly error = signal('');

  protected readonly auth = inject(AuthService);

  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);

  protected submit(email: HTMLInputElement, password: HTMLInputElement): void {
    const correo = email.value.trim().toLowerCase();

    const contrasena = password.value;

    this.error.set('');

    if (!correo) {
      this.error.set('Ingresa tu correo electrónico');
      email.focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(correo)) {
      this.error.set('El correo electrónico no es válido');
      email.focus();
      return;
    }

    if (!contrasena) {
      this.error.set('Ingresa tu contraseña');
      password.focus();
      return;
    }

    this.cargando.set(true);

    this.auth.login(correo, contrasena).subscribe({
      next: (respuesta) => {
        this.cargando.set(false);

        if (!respuesta.ok) {
          this.error.set(respuesta.mensaje || 'No se pudo iniciar sesión');
          return;
        }

        const destino = this.obtenerDestinoSeguro();

        if (destino) {
          this.router.navigateByUrl(destino);
          return;
        }

        const ruta = respuesta.usuario.rol === 'admin' ? '/admin/dashboard' : '/inicio';

        this.router.navigate([ruta]);
      },
      error: (error) => {
        console.error('Error de inicio de sesión:', error);

        this.cargando.set(false);

        if (error.status === 0) {
          this.error.set('No se pudo conectar con el backend');
          return;
        }

        this.error.set(error?.error?.mensaje || 'Correo o contraseña incorrectos');
      },
    });
  }

  private obtenerDestinoSeguro(): string | null {
    let destino = '';

    try {
      destino = sessionStorage.getItem('returnUrl') || '';

      sessionStorage.removeItem('returnUrl');
    } catch {
      destino = '';
    }

    if (!destino) {
      destino = this.route.snapshot.queryParamMap.get('returnUrl') || '';
    }

    if (!destino) {
      return null;
    }

    let decodificado = destino;

    for (let intento = 0; intento < 3; intento += 1) {
      try {
        const siguiente = decodeURIComponent(decodificado);

        if (siguiente === decodificado) {
          break;
        }

        decodificado = siguiente;
      } catch {
        break;
      }
    }

    if (!decodificado.startsWith('/') || decodificado.startsWith('//')) {
      return null;
    }

    return decodificado;
  }
}

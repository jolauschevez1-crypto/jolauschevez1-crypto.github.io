import { CommonModule } from '@angular/common';

import { Component, inject, signal } from '@angular/core';

import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './registro.html',
  styleUrls: ['./registro.css'],
})
export class Registro {
  protected showPassword = false;
  protected showConfirmPassword = false;

  protected readonly cargando = signal(false);

  protected readonly error = signal('');

  private readonly auth = inject(AuthService);

  private readonly router = inject(Router);

  protected register(
    name: HTMLInputElement,
    email: HTMLInputElement,
    phone: HTMLInputElement,
    password: HTMLInputElement,
    confirmPassword: HTMLInputElement,
  ): void {
    const nombre = name.value.trim();

    const correo = email.value.trim().toLowerCase();

    const telefono = phone.value.trim();

    const contrasena = password.value;

    const confirmacion = confirmPassword.value;

    this.error.set('');

    if (!nombre) {
      this.error.set('Ingresa tu nombre completo');
      name.focus();
      return;
    }

    if (nombre.length < 3) {
      this.error.set('El nombre debe tener al menos 3 caracteres');
      name.focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(correo)) {
      this.error.set('El correo electrónico no es válido');
      email.focus();
      return;
    }

    const telefonoRegex = /^[0-9]{10}$/;

    if (telefono && !telefonoRegex.test(telefono)) {
      this.error.set('El teléfono debe tener exactamente 10 números, sin espacios ni guiones');
      phone.focus();
      return;
    }

    if (contrasena.length < 8) {
      this.error.set('La contraseña debe tener mínimo 8 caracteres');
      password.focus();
      return;
    }

    if (!/[A-Z]/.test(contrasena)) {
      this.error.set('La contraseña debe contener una mayúscula');
      password.focus();
      return;
    }

    if (!/[a-z]/.test(contrasena)) {
      this.error.set('La contraseña debe contener una minúscula');
      password.focus();
      return;
    }

    if (!/[0-9]/.test(contrasena)) {
      this.error.set('La contraseña debe contener un número');
      password.focus();
      return;
    }

    if (!/[^A-Za-z0-9]/.test(contrasena)) {
      this.error.set('La contraseña debe contener un carácter especial');
      password.focus();
      return;
    }

    if (contrasena !== confirmacion) {
      this.error.set('Las contraseñas no coinciden');
      confirmPassword.focus();
      return;
    }

    this.cargando.set(true);

    this.auth
      .registrar({
        nombre,
        correo,
        telefono,
        contrasena,
      })
      .subscribe({
        next: (respuesta) => {
          this.cargando.set(false);

          if (!respuesta.ok) {
            this.error.set(respuesta.mensaje || 'No se pudo crear la cuenta');
            return;
          }

          this.router.navigate(['/inicio']);
        },
        error: (error) => {
          console.error('Error de registro:', error);

          this.cargando.set(false);

          if (error.status === 0) {
            this.error.set('No se pudo conectar con el backend');
            return;
          }

          this.error.set(
            error?.error?.mensaje || error?.error?.detalle || 'No se pudo registrar el usuario',
          );
        },
      });
  }
}
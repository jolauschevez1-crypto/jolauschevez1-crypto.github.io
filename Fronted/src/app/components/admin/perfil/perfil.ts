import { CommonModule } from '@angular/common';

import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { AdminService } from '../../../services/admin';

@Component({
  selector: 'app-perfil-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.css'],
})
export class PerfilAdmin implements OnInit {
  private readonly adminService = inject(AdminService);

  protected readonly nombre = signal('');

  protected readonly correo = signal('');

  protected readonly passwordActual = signal('');

  protected readonly passwordNueva = signal('');

  protected readonly confirmarPassword = signal('');

  protected readonly cargando = signal(true);

  protected readonly guardando = signal(false);

  protected readonly cambiandoPassword = signal(false);

  protected readonly error = signal('');

  protected readonly mensaje = signal('');

  protected readonly mostrarActual = signal(false);

  protected readonly mostrarNueva = signal(false);

  protected readonly mostrarConfirmacion = signal(false);

  protected readonly inicial = computed(() => {
    const nombreActual = this.nombre().trim();

    return nombreActual ? nombreActual.charAt(0).toUpperCase() : 'A';
  });

  protected readonly passwordsCoinciden = computed(() => {
    const nueva = this.passwordNueva();

    const confirmacion = this.confirmarPassword();

    if (!nueva || !confirmacion) {
      return true;
    }

    return nueva === confirmacion;
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.mensaje.set('');

    this.adminService.obtenerPerfil().subscribe({
      next: (respuesta) => {
        const administrador = respuesta.administrador;

        this.nombre.set(administrador?.nombre || '');

        this.correo.set(administrador?.correo || '');

        this.cargando.set(false);
      },

      error: (error) => {
        this.cargando.set(false);

        this.error.set(this.adminService.mensajeError(error, 'No se pudo cargar el perfil'));
      },
    });
  }

  protected guardarPerfil(): void {
    this.error.set('');
    this.mensaje.set('');

    const nombreLimpio = this.nombre().trim();

    const correoLimpio = this.correo().trim().toLowerCase();

    if (!nombreLimpio) {
      this.error.set('Ingresa el nombre del administrador');

      return;
    }

    if (!this.correoValido(correoLimpio)) {
      this.error.set('Ingresa un correo electrónico válido');

      return;
    }

    this.guardando.set(true);

    this.adminService
      .actualizarPerfil({
        nombre: nombreLimpio,
        correo: correoLimpio,
      })
      .subscribe({
        next: (respuesta) => {
          this.guardando.set(false);

          this.nombre.set(nombreLimpio);
          this.correo.set(correoLimpio);

          this.mensaje.set(respuesta.mensaje || 'Perfil actualizado correctamente');
        },

        error: (error) => {
          this.guardando.set(false);

          this.error.set(this.adminService.mensajeError(error, 'No se pudo actualizar el perfil'));
        },
      });
  }

  protected cambiarPassword(): void {
    this.error.set('');
    this.mensaje.set('');

    const actual = this.passwordActual();

    const nueva = this.passwordNueva();

    const confirmacion = this.confirmarPassword();

    if (!actual || !nueva || !confirmacion) {
      this.error.set('Completa todos los campos de contraseña');

      return;
    }

    if (nueva.length < 8) {
      this.error.set('La nueva contraseña debe tener al menos 8 caracteres');

      return;
    }

    if (nueva !== confirmacion) {
      this.error.set('Las contraseñas nuevas no coinciden');

      return;
    }

    if (actual === nueva) {
      this.error.set('La nueva contraseña debe ser diferente de la actual');

      return;
    }

    this.cambiandoPassword.set(true);

    this.adminService
      .cambiarPassword({
        passwordActual: actual,
        passwordNueva: nueva,
      })
      .subscribe({
        next: (respuesta) => {
          this.cambiandoPassword.set(false);

          this.mensaje.set(respuesta.mensaje || 'Contraseña actualizada correctamente');

          this.passwordActual.set('');
          this.passwordNueva.set('');
          this.confirmarPassword.set('');

          this.mostrarActual.set(false);
          this.mostrarNueva.set(false);
          this.mostrarConfirmacion.set(false);
        },

        error: (error) => {
          this.cambiandoPassword.set(false);

          this.error.set(this.adminService.mensajeError(error, 'No se pudo cambiar la contraseña'));
        },
      });
  }

  protected alternarPasswordActual(): void {
    this.mostrarActual.update((valor) => !valor);
  }

  protected alternarPasswordNueva(): void {
    this.mostrarNueva.update((valor) => !valor);
  }

  protected alternarConfirmacion(): void {
    this.mostrarConfirmacion.update((valor) => !valor);
  }

  private correoValido(correo: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  }
}

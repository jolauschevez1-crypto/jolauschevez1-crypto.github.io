import { CommonModule } from '@angular/common';

import { Component, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { finalize } from 'rxjs';

import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.css'],
})
export class Perfil implements OnInit {
  private readonly auth = inject(AuthService);

  /*
    Usamos signal() en vez de propiedades planas porque
    esta app corre sin zone.js (modo zoneless, default en
    Angular 21). Sin zone.js, Angular NO se entera de que
    debe repintar la vista cuando cambia una propiedad
    normal dentro de un callback async (subscribe de HTTP,
    setTimeout, FileReader, etc). Con signal(), cada
    .set()/.update() sí notifica a Angular que debe
    repintar. Antes de este cambio, el perfil se quedaba
    en "Cargando..." para siempre aunque los datos ya
    hubieran llegado, porque la vista nunca se refrescaba.
  */
  protected readonly nombre = signal('');
  protected readonly email = signal('');
  protected readonly telefono = signal('');
  protected readonly fotoPerfil = signal('/gente.png');

  protected readonly reservas = signal(0);
  protected readonly favoritos = signal(0);

  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');

  private datosOriginales = {
    nombre: '',
    email: '',
    telefono: '',
    fotoPerfil: '/gente.png',
  };

  ngOnInit(): void {
    this.cargarPerfil();
  }

  protected cargarPerfil(): void {
    this.cargando.set(true);
    this.error.set('');

    this.auth
      .obtenerPerfil()
      .pipe(
        finalize(() => {
          this.cargando.set(false);
        }),
      )
      .subscribe({
        next: (respuesta) => {
          if (!respuesta?.usuario) {
            this.cargarDatosLocales();
            this.error.set('El backend no devolvió los datos del usuario');
            return;
          }

          this.nombre.set(respuesta.usuario.nombre || '');

          this.email.set(respuesta.usuario.email || respuesta.usuario.correo || '');

          this.telefono.set(respuesta.usuario.telefono || '');

          this.fotoPerfil.set(
            respuesta.usuario.fotoPerfil || respuesta.usuario.foto_perfil || '/gente.png',
          );

          this.reservas.set(Number(respuesta.estadisticas?.reservas || 0));

          this.favoritos.set(Number(respuesta.estadisticas?.favoritos || 0));

          this.guardarOriginales();
        },
        error: (error) => {
          /*
            Muestra al menos los datos guardados
            y evita una pantalla en blanco.
          */
          this.cargarDatosLocales();

          this.error.set(this.obtenerMensajeError(error, 'No se pudo cargar tu perfil'));
        },
      });
  }

  protected seleccionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;

    const archivo = input.files?.[0];

    if (!archivo) {
      return;
    }

    this.error.set('');
    this.mensaje.set('');

    if (!archivo.type.startsWith('image/')) {
      this.error.set('Selecciona un archivo de imagen válido');
      input.value = '';
      return;
    }

    const maximoBytes = 4 * 1024 * 1024;

    if (archivo.size > maximoBytes) {
      this.error.set('La imagen no puede superar los 4 MB');
      input.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      this.fotoPerfil.set(String(reader.result || '/gente.png'));
    };

    reader.onerror = () => {
      this.error.set('No se pudo leer la imagen seleccionada');
    };

    reader.readAsDataURL(archivo);
    input.value = '';
  }

  protected restaurarFoto(): void {
    this.fotoPerfil.set('/gente.png');
    this.mensaje.set('');
    this.error.set('');
  }

  protected guardar(): void {
    this.error.set('');
    this.mensaje.set('');

    const nombre = this.nombre().trim();

    const correo = this.email().trim().toLowerCase();

    const telefono = this.telefono().trim();

    if (nombre.length < 2) {
      this.error.set('Ingresa un nombre válido');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(correo)) {
      this.error.set('Ingresa un correo válido');
      return;
    }

    this.guardando.set(true);

    this.auth
      .actualizarPerfil({
        nombre,
        correo,
        telefono,
        fotoPerfil: this.fotoPerfil(),
      })
      .pipe(
        finalize(() => {
          this.guardando.set(false);
        }),
      )
      .subscribe({
        next: (respuesta) => {
          this.nombre.set(respuesta.usuario.nombre);

          this.email.set(respuesta.usuario.email || respuesta.usuario.correo);

          this.telefono.set(respuesta.usuario.telefono || '');

          this.fotoPerfil.set(
            respuesta.usuario.fotoPerfil || respuesta.usuario.foto_perfil || '/gente.png',
          );

          this.reservas.set(Number(respuesta.estadisticas?.reservas || 0));

          this.favoritos.set(Number(respuesta.estadisticas?.favoritos || 0));

          this.guardarOriginales();

          this.mensaje.set(respuesta.mensaje || 'Perfil actualizado correctamente');
        },
        error: (error) => {
          this.error.set(this.obtenerMensajeError(error, 'No se pudo actualizar el perfil'));
        },
      });
  }

  protected cancelarCambios(): void {
    this.nombre.set(this.datosOriginales.nombre);

    this.email.set(this.datosOriginales.email);

    this.telefono.set(this.datosOriginales.telefono);

    this.fotoPerfil.set(this.datosOriginales.fotoPerfil);

    this.error.set('');
    this.mensaje.set('');
  }

  protected imagenError(event: Event): void {
    const imagen = event.target as HTMLImageElement;

    imagen.src = '/gente.png';
  }

  private cargarDatosLocales(): void {
    const usuario = this.auth.usuario;

    if (Number(usuario.id || usuario.idUsuario || 0) <= 0) {
      return;
    }

    this.nombre.set(usuario.nombre || 'Usuario');

    this.email.set(usuario.email || usuario.correo || '');

    this.telefono.set(usuario.telefono || '');

    this.fotoPerfil.set(usuario.fotoPerfil || usuario.foto_perfil || '/gente.png');

    this.guardarOriginales();
  }

  private guardarOriginales(): void {
    this.datosOriginales = {
      nombre: this.nombre(),
      email: this.email(),
      telefono: this.telefono(),
      fotoPerfil: this.fotoPerfil(),
    };
  }

  private obtenerMensajeError(error: unknown, predeterminado: string): string {
    const respuesta = error as {
      status?: number;
      name?: string;
      error?: {
        mensaje?: string;
        detalle?: string;
      };
      message?: string;
    };

    if (respuesta.status === 0) {
      return 'No se pudo conectar con el backend';
    }

    if (respuesta.name === 'TimeoutError' || respuesta.message?.includes('Timeout')) {
      return 'El backend tardó demasiado en responder';
    }

    return (
      respuesta.error?.mensaje || respuesta.error?.detalle || respuesta.message || predeterminado
    );
  }
}

import { CommonModule } from '@angular/common';

import { Component, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { RouterLink } from '@angular/router';

type SeccionAyuda = 'reserva' | 'antes' | 'cuenta';

interface TemaAyuda {
  valor: string;
  titulo: string;
  descripcion: string;
}

@Component({
  selector: 'app-ayuda',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ayuda.html',
  styleUrls: ['./ayuda.css'],
})
export class Ayuda {
  protected readonly seccionActiva = signal<SeccionAyuda>('reserva');

  protected numeroReserva = '';
  protected correoReserva = '';
  protected mensajeReserva = '';
  protected errorReserva = '';

  protected temaAntes = '';
  protected temaCuenta = '';

  protected readonly temasAntes: TemaAyuda[] = [
    {
      valor: 'como-reservar',
      titulo: 'Cómo reservar',
      descripcion:
        'Selecciona un tour, revisa sus detalles, elige la cantidad de personas y confirma la reserva.',
    },
    {
      valor: 'disponibilidad',
      titulo: 'Disponibilidad y fechas',
      descripcion:
        'La fecha disponible depende del tour y de los cupos registrados por el administrador.',
    },
    {
      valor: 'pagos',
      titulo: 'Métodos de pago',
      descripcion: 'Después de reservar podrás enviar el pago desde la sección Mis reservas.',
    },
    {
      valor: 'cancelaciones',
      titulo: 'Cancelaciones',
      descripcion: 'Puedes cancelar una reserva desde Mis reservas mientras su estado lo permita.',
    },
    {
      valor: 'menores',
      titulo: 'Adultos y menores',
      descripcion:
        'Algunos tours permiten menores gratis según la edad configurada por el administrador.',
    },
  ];

  protected readonly temasCuenta: TemaAyuda[] = [
    {
      valor: 'datos',
      titulo: 'Actualizar mis datos',
      descripcion: 'Puedes cambiar tu nombre, teléfono y foto desde la sección Perfil.',
    },
    {
      valor: 'favoritos',
      titulo: 'Mis favoritos',
      descripcion: 'Los tours marcados como favoritos quedan asociados a tu cuenta.',
    },
    {
      valor: 'contrasena',
      titulo: 'Problemas con la contraseña',
      descripcion:
        'Cierra sesión y usa el proceso de recuperación disponible en el inicio de sesión.',
    },
    {
      valor: 'sesion',
      titulo: 'Problemas para iniciar sesión',
      descripcion:
        'Comprueba que el correo y la contraseña sean correctos y que tu cuenta esté activa.',
    },
  ];

  protected seleccionarSeccion(seccion: SeccionAyuda): void {
    this.seccionActiva.set(seccion);
    this.mensajeReserva = '';
    this.errorReserva = '';
  }

  protected buscarReserva(): void {
    this.mensajeReserva = '';
    this.errorReserva = '';

    const numero = this.numeroReserva.trim();

    const correo = this.correoReserva.trim();

    if (!numero || !correo) {
      this.errorReserva = 'Ingresa el número de reserva y el correo electrónico.';
      return;
    }

    if (!correo.includes('@')) {
      this.errorReserva = 'Ingresa un correo electrónico válido.';
      return;
    }

    this.mensajeReserva =
      `Solicitud preparada para la reserva #${numero}. ` +
      'También puedes revisar su estado directamente en Mis reservas.';
  }

  protected obtenerTemaAntes(): TemaAyuda | undefined {
    return this.temasAntes.find((tema) => tema.valor === this.temaAntes);
  }

  protected obtenerTemaCuenta(): TemaAyuda | undefined {
    return this.temasCuenta.find((tema) => tema.valor === this.temaCuenta);
  }
}

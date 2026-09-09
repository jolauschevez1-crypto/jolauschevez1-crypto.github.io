import { CommonModule } from '@angular/common';

import { Component, signal } from '@angular/core';

import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-contactanos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contactanos.html',
  styleUrls: ['./contactanos.css'],
})
export class Contactanos {
  protected nombre = '';
  protected correo = '';
  protected asunto = '';
  protected mensaje = '';

  protected readonly enviando = signal(false);

  protected readonly mensajeExito = signal('');

  protected readonly mensajeError = signal('');

  protected enviarMensaje(formulario: NgForm): void {
    this.mensajeExito.set('');
    this.mensajeError.set('');

    if (formulario.invalid) {
      formulario.control.markAllAsTouched();

      this.mensajeError.set('Completa correctamente todos los campos obligatorios.');

      return;
    }

    this.enviando.set(true);

    window.setTimeout(() => {
      this.enviando.set(false);

      this.mensajeExito.set(
        'Tu mensaje fue preparado correctamente. Nuestro equipo se pondrá en contacto contigo.',
      );

      formulario.resetForm();
    }, 700);
  }
}

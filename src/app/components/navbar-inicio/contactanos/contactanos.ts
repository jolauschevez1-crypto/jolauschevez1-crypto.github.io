import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contactanos',
  imports: [FormsModule],
  templateUrl: './contactanos.html',
  styleUrl: './contactanos.css',
})
export class Contactanos {
nombre = '';
  correo = '';
  asunto = '';
  mensaje = '';

  enviar(): void {

    console.log({
      nombre: this.nombre,
      correo: this.correo,
      asunto: this.asunto,
      mensaje: this.mensaje
    });

    alert('Mensaje enviado correctamente');

    this.nombre = '';
    this.correo = '';
    this.asunto = '';
    this.mensaje = '';
  }
  limpiar(): void {
  this.nombre = '';
  this.correo = '';
  this.asunto = '';
  this.mensaje = '';
}
}

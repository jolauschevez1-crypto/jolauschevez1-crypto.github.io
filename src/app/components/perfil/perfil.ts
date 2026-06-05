import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReservaService } from '../../services/reserva';
import { Favorito } from '../../services/favorito';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [NgIf, FormsModule],
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.css'],
})
export class Perfil {
  protected readonly reservaService = inject(ReservaService);
  protected readonly favService = inject(Favorito);
  protected nombre = 'Usuario';
  protected email = 'usuario@correo.com';
  protected telefono = '';
  protected editMode = false;
  protected successMsg = '';

  protected editar(): void {
    this.editMode = true;
    this.successMsg = '';
  }

  protected guardar(): void {
    this.editMode = false;
    this.successMsg = 'Perfil actualizado correctamente.';
    setTimeout(() => (this.successMsg = ''), 3000);
  }
}

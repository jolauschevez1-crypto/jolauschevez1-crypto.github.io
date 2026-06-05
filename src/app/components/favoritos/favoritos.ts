import { Component, inject } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Favorito } from '../../services/favorito';

@Component({
  selector: 'app-favoritos',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink],
  templateUrl: './favoritos.html',
  styleUrl: './favoritos.css',
})
export class Favoritos {
  protected readonly favoritoService = inject(Favorito);
  protected readonly favoritos = this.favoritoService.favoritos;

  protected eliminar(index: number): void {
    const tour = this.favoritos()[index];
    if (tour) {
      this.favoritoService.eliminar(tour.id);
    }
  }
}

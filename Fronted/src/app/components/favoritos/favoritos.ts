import { CommonModule } from '@angular/common';

import { Component, OnInit, inject } from '@angular/core';

import { RouterLink } from '@angular/router';

import { Favorito, TourFavorito } from '../../services/favorito';

@Component({
  selector: 'app-favoritos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './favoritos.html',
  styleUrls: ['./favoritos.css'],
})
export class Favoritos implements OnInit {
  protected readonly favoritoService = inject(Favorito);

  protected readonly favoritos = this.favoritoService.favoritos;

  protected readonly cargando = this.favoritoService.cargando;

  protected readonly error = this.favoritoService.error;

  ngOnInit(): void {
    this.favoritoService.cargarFavoritos();
  }

  protected eliminar(tour: TourFavorito): void {
    this.favoritoService.eliminar(tour.idTour || tour.id);
  }

  protected procesando(tour: TourFavorito): boolean {
    return this.favoritoService.estaProcesando(tour.idTour || tour.id);
  }

  protected imagenError(event: Event): void {
    const imagen = event.target as HTMLImageElement;

    imagen.src = '/guayaquilcompleto.jpg';
  }
}

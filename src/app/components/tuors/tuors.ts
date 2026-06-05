import { Component, computed, inject, signal } from '@angular/core';
import { NgForOf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Tuorservicio } from '../../services/tuorservicio';
import { Favorito, TourFavorito } from '../../services/favorito';

@Component({
  selector: 'app-tuors',
  standalone: true,
  imports: [NgForOf, RouterLink],
  templateUrl: './tuors.html',
  styleUrls: ['./tuors.css'],
})
export class Tuors {
  private readonly tourService = inject(Tuorservicio);
  private readonly favoritoService = inject(Favorito);

  protected readonly tours = this.tourService.tours;
  protected readonly favoritos = this.favoritoService.favoritos;

  protected readonly busqueda = signal('');

  protected readonly toursFiltrados = computed(() => {
    const texto = this.busqueda().toLowerCase().trim();

    if (!texto) return this.tours();

    return this.tours().filter(t =>
      t.title.toLowerCase().includes(texto) ||
      t.description.toLowerCase().includes(texto)
    );
  });

  protected actualizarBusqueda(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.busqueda.set(value);
  }

  protected esFavorito(id: number): boolean {
    return this.favoritoService.esFavorito(id);
  }

  protected toggleFavorito(tour: TourFavorito): void {
    this.favoritoService.toggle({
      id: tour.id,
      title: tour.title,
      image: tour.image,
      duration: tour.duration,
      rating: tour.rating,
    });
  }

  protected reservar(nombre: string): void {
    alert(`Reserva iniciada para: ${nombre}`);
  }
}

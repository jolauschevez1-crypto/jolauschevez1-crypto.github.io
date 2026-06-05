import { Component, inject } from '@angular/core';
import { Tour, Tuorservicio } from '../../../services/tuorservicio';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tours',
    standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './tours.html',
  styleUrls: ['./tours.css'],
})
export class ToursAdmin {
 protected readonly tourService = inject(Tuorservicio);
  protected mostrarFormulario = false;

  protected nuevoTour: Partial<Tour> = {};

  protected agregar(): void {
    if (!this.nuevoTour.title) return;
    this.tourService.agregar({
      title: this.nuevoTour.title!,
      description: this.nuevoTour.description ?? '',
      duration: this.nuevoTour.duration ?? '',
      price: this.nuevoTour.price ?? '',
      precioNumerico: 0,
      rating: this.nuevoTour.rating ?? '⭐ 4.5',
      image: '/guayaquilcompleto.jpg',
      alt: this.nuevoTour.title!,
      badgeText: this.nuevoTour.duration ?? '',
      badgeClass: 'bg-primary',
    });
    this.nuevoTour = {};
    this.mostrarFormulario = false;
  }

  protected eliminar(id: number): void {
    this.tourService.eliminar(id);
  }
}

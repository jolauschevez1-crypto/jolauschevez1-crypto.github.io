import { Component, computed, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReservaService } from '../../services/reserva';
import { Tour, Tuorservicio } from '../../services/tuorservicio';

@Component({
  selector: 'app-reserva',
  standalone: true,
  imports: [NgIf, RouterLink],
  templateUrl: './reserva.html',
  styleUrls: ['./reserva.css'],
})
export class Reserva {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tourService = inject(Tuorservicio);
  private reservaService = inject(ReservaService);

  protected tour?: Tour;
  protected readonly fecha = signal('');
  protected readonly personas = signal(1);
  protected readonly minDate = new Date().toISOString().slice(0, 10);

  protected readonly total = computed(() =>
    this.tour ? this.tour.precioNumerico * this.personas() : 0
  );

  protected readonly puedeReservar = computed(
    () => !!this.tour && this.fecha().trim().length > 0 && this.personas() > 0
  );

  protected actualizarFecha(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.fecha.set(target.value);
  }

  protected actualizarPersonas(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = Number(target.value);
    this.personas.set(Math.max(1, isNaN(value) ? 1 : value));
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.tour = this.tourService.getById(id);
  }

  protected reservar(): void {
    if (!this.tour || !this.puedeReservar()) return;

    this.reservaService.agregar({
      tour: this.tour.title,
      imagen: this.tour.image,
      fecha: this.fecha(),
      personas: this.personas(),
      precioTotal: this.total(),
    });

    alert(`Reserva confirmada para ${this.personas()} persona(s) el ${this.fecha()}.`);
    this.router.navigate(['/reservas']);
  }
}

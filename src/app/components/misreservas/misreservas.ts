import { Component, computed, inject } from '@angular/core';
import { ReservaService } from '../../services/reserva';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
   selector: 'app-misreservas',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink],
  templateUrl: './misreservas.html',
  styleUrl: './misreservas.css',
})
export class Misreservas {
  protected readonly reservaService = inject(ReservaService);

  protected readonly reservas = this.reservaService.reservas;

  protected readonly totalReservas = computed(
    () => this.reservas().length
  );

  protected readonly confirmadas = computed(
    () => this.reservas().filter(r => r.estado === 'Confirmada').length
  );

  protected readonly pendientes = computed(
    () => this.reservas().filter(r => r.estado === 'Pendiente').length
  );

  protected readonly canceladas = computed(
    () => this.reservas().filter(r => r.estado === 'Cancelada').length
  );

}

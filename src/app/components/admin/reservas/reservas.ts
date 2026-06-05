import { Component, inject } from '@angular/core';
import { ReservaService } from '../../../services/reserva';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-reservas',
  imports: [NgFor],
  templateUrl: './reservas.html',
  styleUrl: './reservas.css',
})
export class ReservasAdmin {
protected readonly reservaService = inject(ReservaService);

  protected cambiarEstado(id: number, event: Event): void {
    const estado = (event.target as HTMLSelectElement).value as 'Confirmada' | 'Pendiente' | 'Cancelada';
    this.reservaService.editarEstado(id, estado);
}
}

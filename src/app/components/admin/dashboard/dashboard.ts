import { Component, computed, inject } from '@angular/core';
import { NgFor, NgClass } from '@angular/common';
import { ReservaService } from '../../../services/reserva';
import { UsuarioService } from '../../../services/usuario';
import { Tuorservicio } from '../../../services/tuorservicio';

@Component({
   selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, NgClass],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard {
  private readonly reservaService = inject(ReservaService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly tourService = inject(Tuorservicio);

  protected readonly totalesReservas = computed(() =>
    this.reservaService.getTotales()
  );

  protected readonly totalesUsuarios = computed(() =>
    this.usuarioService.getTotales()
  );

  protected readonly totalTours = computed(() =>
    this.tourService.tours().length
  );

  protected readonly ingresosTotales = computed(() =>
    this.reservaService
      .reservas()
      .filter(r => r.estado === 'Confirmada')
      .reduce((acc, r) => acc + r.precioTotal, 0)
  );

  protected readonly ultimasReservas = computed(() =>
    [...this.reservaService.reservas()]
      .slice(-5)
      .reverse()
  );
}


import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ReservaGuardada, ReservaService } from '../../services/reserva';

@Component({
  selector: 'app-misreservas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './misreservas.html',
  styleUrls: ['./misreservas.css'],
})
export class Misreservas implements OnInit {
  protected readonly reservaService = inject(ReservaService);

  protected readonly reservas = this.reservaService.reservas;

  protected readonly cargando = this.reservaService.cargando;

  protected readonly error = this.reservaService.error;

  protected readonly totalReservas = computed(() => {
    return this.reservas().length;
  });

  protected readonly confirmadas = computed(() => {
    return this.reservas().filter(
      (reserva) => String(reserva.estado).toLowerCase() === 'confirmada',
    ).length;
  });

  protected readonly pendientes = computed(() => {
    return this.reservas().filter((reserva) => String(reserva.estado).toLowerCase() === 'pendiente')
      .length;
  });

  protected readonly canceladas = computed(() => {
    return this.reservas().filter((reserva) => String(reserva.estado).toLowerCase() === 'cancelada')
      .length;
  });

  ngOnInit(): void {
    this.reservaService.cargarMisReservas();
  }

  protected cancelar(reserva: ReservaGuardada): void {
    if (reserva.estado === 'Cancelada') {
      return;
    }

    const confirmar = window.confirm(`¿Deseas cancelar la reserva de ${reserva.tour}?`);

    if (!confirmar) {
      return;
    }

    const idReserva = Number(reserva.idReserva || reserva.id);

    this.reservaService.cancelarReserva(idReserva).subscribe({
      next: (respuesta) => {
        if (respuesta.ok) {
          window.alert('Reserva cancelada correctamente');
        }
      },
      error: (error) => {
        window.alert(
          this.reservaService.obtenerMensajeError(error, 'No se pudo cancelar la reserva'),
        );
      },
    });
  }

  protected imagenError(event: Event): void {
    const imagen = event.target as HTMLImageElement;

    if (imagen.dataset['fallbackAplicado'] === 'true') {
      return;
    }

    imagen.dataset['fallbackAplicado'] = 'true';

    imagen.src = '/guayaquilcompleto.jpg';
  }
}

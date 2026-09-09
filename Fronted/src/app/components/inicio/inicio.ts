import { CommonModule } from '@angular/common';

import { Component, OnInit, computed, inject } from '@angular/core';

import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

import { Favorito } from '../../services/favorito';

import { ReservaGuardada, ReservaService } from '../../services/reserva';

import { Tour, Tuorservicio } from '../../services/tuorservicio';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css'],
})
export class Inicio implements OnInit {
  private readonly authService = inject(AuthService);

  private readonly reservaService = inject(ReservaService);

  private readonly favoritoService = inject(Favorito);

  private readonly tourService = inject(Tuorservicio);

  readonly reservas = this.reservaService.reservas;

  readonly cargandoReservas = this.reservaService.cargando;

  readonly errorReservas = this.reservaService.error;

  readonly cargandoTours = this.tourService.cargando;

  readonly errorTours = this.tourService.error;

  readonly nombreUsuario = this.authService.usuario.nombre || 'Usuario';

  readonly reservasConfirmadas = computed(() => {
    return this.reservas().filter((reserva) => reserva.estado === 'Confirmada');
  });

  readonly totalReservas = computed(() => {
    return this.reservasConfirmadas().length;
  });

  readonly proximasReservas = computed(() => {
    const hoy = this.obtenerFechaActual();

    return this.reservasConfirmadas()
      .filter((reserva) => {
        return this.obtenerFechaReserva(reserva) >= hoy;
      })
      .sort((reservaA, reservaB) => {
        return this.obtenerFechaReserva(reservaA).localeCompare(this.obtenerFechaReserva(reservaB));
      })
      .slice(0, 4);
  });

  readonly totalFavoritos = computed(() => {
    return this.favoritoService.favoritos().length;
  });

  readonly toursCompletados = computed(() => {
    const hoy = this.obtenerFechaActual();

    return this.reservasConfirmadas().filter((reserva) => {
      return this.obtenerFechaReserva(reserva) < hoy;
    }).length;
  });

  readonly recomendaciones = computed(() => {
    const disponibles = this.tourService.tours().filter((tour) => {
      return tour.activo !== false;
    });

    return this.mezclarTours(disponibles).slice(0, 3);
  });

  ngOnInit(): void {
    this.reservaService.cargarMisReservas();

    this.tourService.cargarTours();
  }

  obtenerIdTour(tour: Tour): number {
    return Number(tour.idTour || tour.id);
  }

  obtenerTituloTour(tour: Tour): string {
    return tour.title || tour.nombre || 'Tour';
  }

  obtenerImagenTour(tour: Tour): string {
    return tour.image || tour.imagen || '/guayaquilcompleto.jpg';
  }

  obtenerDescripcionTour(tour: Tour): string {
    return tour.description || tour.descripcion || 'Descubre este recorrido por Guayaquil';
  }

  obtenerDuracionTour(tour: Tour): string {
    if (tour.duration) {
      return tour.duration;
    }

    const horas = Number(tour.duracionHoras || 0);

    return horas > 0 ? `${horas} horas` : 'Duración por confirmar';
  }

  obtenerPrecioTour(tour: Tour): number {
    return Number(tour.precioNumerico || tour.precio || 0);
  }

  formatearFechaReserva(reserva: ReservaGuardada): string {
    const fecha = this.obtenerFechaReserva(reserva);

    if (!fecha) {
      return 'Fecha no disponible';
    }

    const partes = fecha.split('-');

    if (partes.length !== 3) {
      return fecha;
    }

    return `${partes[2]}/` + `${partes[1]}/` + `${partes[0]}`;
  }

  imagenError(event: Event): void {
    const imagen = event.target as HTMLImageElement;

    if (imagen.dataset['fallbackAplicado'] === 'true') {
      return;
    }

    imagen.dataset['fallbackAplicado'] = 'true';

    imagen.src = '/guayaquilcompleto.jpg';
  }

  private obtenerFechaReserva(reserva: ReservaGuardada): string {
    const fecha = String(reserva.fechaTour || reserva.fecha || '');

    return fecha.slice(0, 10);
  }

  private obtenerFechaActual(): string {
    const fecha = new Date();

    const anio = fecha.getFullYear();

    const mes = String(fecha.getMonth() + 1).padStart(2, '0');

    const dia = String(fecha.getDate()).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }

  private mezclarTours(tours: Tour[]): Tour[] {
    const resultado = [...tours];

    for (let indice = resultado.length - 1; indice > 0; indice--) {
      const aleatorio = Math.floor(Math.random() * (indice + 1));

      [resultado[indice], resultado[aleatorio]] = [resultado[aleatorio], resultado[indice]];
    }

    return resultado;
  }
}

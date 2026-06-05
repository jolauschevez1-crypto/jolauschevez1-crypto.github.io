import { Component, computed, inject } from '@angular/core';
import { ReservaService } from '../../services/reserva';
import { Favorito } from '../../services/favorito';
import { NgForOf, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [NgForOf, NgIf, RouterLink],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.css'],
})
export class Inicio {
 private readonly reservaService = inject(ReservaService);
  private readonly favoritoService = inject(Favorito);

  // SOLO CONFIRMADAS
 protected readonly totalReservas = computed(() =>
  this.reservaService
    .reservas()
    .filter(r => r.estado === 'Confirmada')
    .length
);

protected readonly proximasReservas = computed(() =>
  this.reservaService
    .reservas()
    .filter(r => r.estado === 'Confirmada')
    .slice(0, 4)
);

  protected readonly totalFavoritos = computed(() =>
    this.favoritoService.favoritos().length
  );

  protected readonly toursCompletados = computed(() =>
    this.reservaService
      .reservas()
      .filter(r => r.estado === 'Confirmada')
      .length
  );


}

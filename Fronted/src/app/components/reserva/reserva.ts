import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ReservaService } from '../../services/reserva';
import { Tour, Tuorservicio } from '../../services/tuorservicio';

@Component({
  selector: 'app-reserva',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './reserva.html',
  styleUrls: ['./reserva.css'],
})
export class Reserva implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tourService = inject(Tuorservicio);
  private readonly reservaService = inject(ReservaService);

  protected readonly tour = signal<Tour | null>(null);
  protected readonly fecha = signal('');
  protected readonly adultos = signal(1);
  protected readonly menores = signal(0);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');
  protected readonly minDate = this.obtenerFechaActual();
  protected readonly cuposDisponibles = signal(0);
  protected readonly consultandoCupos = signal(false);

  protected readonly selectorAbierto = signal(false);
  protected readonly adultosTemporales = signal(1);
  protected readonly menoresTemporales = signal(0);

  protected readonly precioAdulto = computed(() =>
    Number(this.tour()?.precioNumerico || this.tour()?.precio || 0),
  );

  protected readonly precioMenor = computed(() => Number(this.tour()?.precioMenor || 0));

  protected readonly cantidadPersonas = computed(() => this.adultos() + this.menores());

  protected readonly total = computed(
    () => this.adultos() * this.precioAdulto() + this.menores() * this.precioMenor(),
  );

  protected readonly totalTemporal = computed(
    () =>
      this.adultosTemporales() * this.precioAdulto() +
      this.menoresTemporales() * this.precioMenor(),
  );

  protected readonly puedeReservar = computed(
    () =>
      this.tour() !== null &&
      this.fecha().length === 10 &&
      this.fecha() >= this.minDate &&
      this.adultos() >= 1 &&
      this.cantidadPersonas() <= this.cuposDisponibles() &&
      !this.guardando() &&
      !this.consultandoCupos(),
  );

  ngOnInit(): void {
    const idTour = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(idTour) || idTour <= 0) {
      this.cargando.set(false);
      this.error.set('El identificador del tour no es válido');
      return;
    }

    const fechaQuery = String(this.route.snapshot.queryParamMap.get('fecha') || '').substring(
      0,
      10,
    );
    const adultosQuery = Number(this.route.snapshot.queryParamMap.get('adultos') || 1);
    const menoresQuery = Number(this.route.snapshot.queryParamMap.get('menores') || 0);

    if (fechaQuery.length === 10 && fechaQuery >= this.minDate) {
      this.fecha.set(fechaQuery);
    }

    this.adultos.set(Number.isInteger(adultosQuery) && adultosQuery > 0 ? adultosQuery : 1);
    this.menores.set(Number.isInteger(menoresQuery) && menoresQuery >= 0 ? menoresQuery : 0);

    this.cargarTour(idTour);
  }

  protected actualizarFecha(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fecha.set(input.value);
    this.error.set('');
    this.cargarDisponibilidad();
  }

  protected abrirSelector(): void {
    this.adultosTemporales.set(this.adultos());
    this.menoresTemporales.set(this.menores());
    this.selectorAbierto.set(true);
  }

  protected cerrarSelector(): void {
    this.selectorAbierto.set(false);
  }

  protected cambiarAdultos(cambio: number): void {
    const nuevo = this.adultosTemporales() + cambio;
    const totalNuevo = nuevo + this.menoresTemporales();

    if (nuevo < 1 || totalNuevo > this.cuposDisponibles()) {
      return;
    }

    this.adultosTemporales.set(nuevo);
  }

  protected cambiarMenores(cambio: number): void {
    const nuevo = this.menoresTemporales() + cambio;
    const totalNuevo = this.adultosTemporales() + nuevo;

    if (nuevo < 0 || totalNuevo > this.cuposDisponibles()) {
      return;
    }

    this.menoresTemporales.set(nuevo);
  }

  protected aceptarSelector(): void {
    this.adultos.set(this.adultosTemporales());
    this.menores.set(this.menoresTemporales());
    this.selectorAbierto.set(false);
    this.error.set('');
  }

  protected reservar(): void {
    if (this.guardando()) {
      return;
    }

    const tourActual = this.tour();

    if (!tourActual) {
      this.error.set('No se pudo identificar el tour');
      return;
    }

    if (!this.fecha()) {
      this.error.set('Selecciona una fecha');
      return;
    }

    if (!this.puedeReservar()) {
      this.error.set('Revisa la fecha, los cupos y la cantidad de personas');
      return;
    }

    if (!this.reservaService.tieneSesion()) {
      this.router.navigate(['/login'], {
        queryParams: {
          retorno: this.router.url,
        },
      });
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');

    this.reservaService
      .crearReserva({
        idTour: tourActual.idTour || tourActual.id,
        fecha: this.fecha(),
        cantidadAdultos: this.adultos(),
        cantidadMenores: this.menores(),
      })
      .subscribe({
        next: (respuesta) => {
          this.guardando.set(false);

          if (!respuesta.ok) {
            this.error.set(respuesta.mensaje || 'No se pudo crear la reserva');
            return;
          }

          this.mensaje.set(respuesta.mensaje);

          window.setTimeout(() => {
            this.router.navigate(['/mis-reservas']);
          }, 700);
        },
        error: (error) => {
          this.guardando.set(false);
          this.error.set(
            this.reservaService.obtenerMensajeError(error, 'No se pudo confirmar la reserva'),
          );
        },
      });
  }

  protected obtenerImagen(tour: Tour): string {
    return tour.image || tour.imagen || '/guayaquilcompleto.jpg';
  }

  protected obtenerTitulo(tour: Tour): string {
    return tour.title || tour.nombre || 'Tour';
  }

  protected obtenerDescripcion(tour: Tour): string {
    return tour.description || tour.descripcion || 'Información no disponible';
  }

  protected resumenPersonas(): string {
    const partes = [`${this.adultos()} ${this.adultos() === 1 ? 'adulto' : 'adultos'}`];

    if (this.menores() > 0) {
      partes.push(`${this.menores()} ${this.menores() === 1 ? 'menor' : 'menores'}`);
    }

    return partes.join(', ');
  }

  protected precioMenorTexto(): string {
    return this.precioMenor() === 0 ? 'Gratis' : `$${this.precioMenor().toFixed(2)}`;
  }

  protected imagenError(event: Event): void {
    const imagen = event.target as HTMLImageElement;

    if (imagen.dataset['fallbackAplicado'] === 'true') {
      return;
    }

    imagen.dataset['fallbackAplicado'] = 'true';
    imagen.src = '/guayaquilcompleto.jpg';
  }

  private cargarTour(idTour: number): void {
    this.cargando.set(true);
    this.error.set('');

    this.tourService.obtenerTourPorId(idTour).subscribe({
      next: (respuesta) => {
        this.cargando.set(false);

        if (!respuesta.ok || !respuesta.tour) {
          this.error.set('No se encontró el tour');
          return;
        }

        this.tour.set(respuesta.tour);
        this.cuposDisponibles.set(Number(respuesta.tour.cupoTotal || 0));

        if (!this.fecha()) {
          const fechaTour = String(respuesta.tour.fechaTour || '').substring(0, 10);

          this.fecha.set(
            fechaTour.length === 10 && fechaTour >= this.minDate ? fechaTour : this.minDate,
          );
        }

        this.cargarDisponibilidad();
      },
      error: (error) => {
        this.cargando.set(false);
        this.tour.set(null);
        this.error.set(error?.error?.mensaje || 'No se pudo cargar el tour');
      },
    });
  }

  private cargarDisponibilidad(): void {
    const tourActual = this.tour();

    if (!tourActual || !/^\d{4}-\d{2}-\d{2}$/.test(this.fecha())) {
      return;
    }

    this.consultandoCupos.set(true);

    this.reservaService
      .obtenerDisponibilidad(tourActual.idTour || tourActual.id, this.fecha())
      .subscribe({
        next: (respuesta) => {
          this.consultandoCupos.set(false);
          this.cuposDisponibles.set(Number(respuesta.cuposDisponibles || 0));

          const totalActual = this.cantidadPersonas();

          if (totalActual > this.cuposDisponibles()) {
            this.adultos.set(Math.max(1, this.cuposDisponibles()));
            this.menores.set(0);
          }
        },
        error: (error) => {
          this.consultandoCupos.set(false);
          this.cuposDisponibles.set(0);
          this.error.set(
            this.reservaService.obtenerMensajeError(error, 'No se pudieron consultar los cupos'),
          );
        },
      });
  }

  private obtenerFechaActual(): string {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}

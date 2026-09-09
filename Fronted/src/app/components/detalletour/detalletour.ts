import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { OpinionService, OpinionTour } from '../../services/opinion';
import { Tour, Tuorservicio } from '../../services/tuorservicio';

type TabDetalle = 'descripcion' | 'detalles' | 'opiniones';

@Component({
  selector: 'app-detalletour',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './detalletour.html',
  styleUrls: ['./detalletour.css'],
})
export class Detalletour implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly tourService = inject(Tuorservicio);
  private readonly opinionService = inject(OpinionService);

  protected readonly tour = signal<Tour | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  protected readonly tabActiva = signal<TabDetalle>('descripcion');

  protected readonly opiniones = signal<OpinionTour[]>([]);
  protected readonly cargandoOpiniones = signal(false);
  protected readonly promedioOpiniones = signal(0);
  protected readonly totalOpiniones = signal(0);
  protected readonly errorOpinion = signal('');
  protected readonly mensajeOpinion = signal('');
  protected readonly guardandoOpinion = signal(false);
  protected readonly mostrarFormularioOpinion = signal(false);

  protected formularioOpinion = {
    puntuacion: 5,
    comentario: '',
    ciudad: 'Guayaquil, Ecuador',
    tipoViaje: 'Solo',
  };

  protected readonly minDate = this.obtenerFechaActual();
  protected readonly fecha = signal(this.minDate);
  protected readonly adultos = signal(1);
  protected readonly menores = signal(0);
  protected readonly selectorPersonasAbierto = signal(false);
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

  protected readonly cuposDisponibles = computed(() => Number(this.tour()?.cuposDisponibles || 0));

  protected readonly tieneSesion = computed(() => this.opinionService.tieneSesion());

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      this.cargando.set(false);
      this.error.set('El identificador del tour no es válido');
      return;
    }

    this.cargarTour(id);
    this.cargarOpiniones(id);
  }

  protected cambiarTab(tab: TabDetalle): void {
    this.tabActiva.set(tab);
  }

  protected seleccionarPuntuacion(puntuacion: number): void {
    this.formularioOpinion.puntuacion = puntuacion;
  }

  protected alternarFormularioOpinion(): void {
    this.errorOpinion.set('');
    this.mensajeOpinion.set('');

    if (!this.tieneSesion()) {
      this.router.navigate(['/login'], {
        queryParams: {
          retorno: this.router.url,
        },
      });
      return;
    }

    this.mostrarFormularioOpinion.update((valor) => !valor);
  }

  protected guardarOpinion(): void {
    const tourActual = this.tour();
    const comentario = this.formularioOpinion.comentario.trim();

    if (!tourActual) {
      return;
    }

    if (comentario.length < 10) {
      this.errorOpinion.set('Escribe un comentario de al menos 10 caracteres');
      return;
    }

    this.guardandoOpinion.set(true);
    this.errorOpinion.set('');
    this.mensajeOpinion.set('');

    this.opinionService
      .guardar(tourActual.idTour || tourActual.id, {
        puntuacion: Number(this.formularioOpinion.puntuacion),
        comentario,
        ciudad: this.formularioOpinion.ciudad.trim() || 'Ecuador',
        tipoViaje: this.formularioOpinion.tipoViaje || 'Solo',
      })
      .subscribe({
        next: (respuesta) => {
          this.guardandoOpinion.set(false);
          this.mensajeOpinion.set(respuesta.mensaje);
          this.mostrarFormularioOpinion.set(false);
          this.formularioOpinion.comentario = '';
          this.cargarOpiniones(tourActual.idTour || tourActual.id);
        },
        error: (error) => {
          this.guardandoOpinion.set(false);
          this.errorOpinion.set(
            this.opinionService.mensajeError(error, 'No se pudo guardar el comentario'),
          );
        },
      });
  }

  protected abrirSelectorPersonas(): void {
    this.adultosTemporales.set(this.adultos());
    this.menoresTemporales.set(this.menores());
    this.selectorPersonasAbierto.set(true);
  }

  protected cerrarSelectorPersonas(): void {
    this.selectorPersonasAbierto.set(false);
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

  protected aceptarPersonas(): void {
    this.adultos.set(this.adultosTemporales());
    this.menores.set(this.menoresTemporales());
    this.selectorPersonasAbierto.set(false);
  }

  protected actualizarFecha(valor: string): void {
    this.fecha.set(valor);
  }

  protected reservar(): void {
    const tourActual = this.tour();

    if (!tourActual || !tourActual.activo || !this.fecha()) {
      return;
    }

    this.router.navigate(['/reserva', tourActual.idTour || tourActual.id], {
      queryParams: {
        fecha: this.fecha(),
        adultos: this.adultos(),
        menores: this.menores(),
      },
    });
  }

  protected volver(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
      return;
    }

    void this.router.navigate(['/tours']);
  }

  protected listaIncluido(tour: Tour): string[] {
    return tour.incluidoLista?.length ? tour.incluidoLista : this.separarLineas(tour.incluido);
  }

  protected listaNoIncluido(tour: Tour): string[] {
    return tour.noIncluidoLista?.length
      ? tour.noIncluidoLista
      : this.separarLineas(tour.noIncluido);
  }

  protected obtenerImagenPrincipal(tour: Tour): string {
    return tour.image || tour.imagenes?.[0] || '/guayaquilcompleto.jpg';
  }

  protected obtenerGaleria(tour: Tour): string[] {
    const principal = this.obtenerImagenPrincipal(tour);

    return [...(tour.imagenes || [])]
      .filter((imagen) => Boolean(imagen) && imagen !== principal)
      .filter((imagen, indice, lista) => lista.indexOf(imagen) === indice)
      .slice(0, 4);
  }

  protected estrellas(puntuacion: number): boolean[] {
    return Array.from({ length: 5 }, (_, indice) => indice < Math.round(puntuacion));
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

  private cargarTour(id: number): void {
    this.cargando.set(true);
    this.error.set('');

    this.tourService.obtenerTourPorId(id).subscribe({
      next: (respuesta) => {
        if (!respuesta.ok || !respuesta.tour) {
          this.tour.set(null);
          this.error.set('No se encontró el tour solicitado');
          this.cargando.set(false);
          return;
        }

        this.tour.set(respuesta.tour);

        const fechaTour = String(respuesta.tour.fechaTour || '').substring(0, 10);

        this.fecha.set(
          fechaTour.length === 10 && fechaTour >= this.minDate ? fechaTour : this.minDate,
        );

        this.cargando.set(false);
      },
      error: (error) => {
        console.error('Error al obtener el detalle:', error);
        this.tour.set(null);
        this.cargando.set(false);
        this.error.set(error?.error?.mensaje || 'No se pudo cargar la información del tour');
      },
    });
  }

  private cargarOpiniones(idTour: number): void {
    this.cargandoOpiniones.set(true);

    this.opinionService.listarPorTour(idTour).subscribe({
      next: (respuesta) => {
        this.cargandoOpiniones.set(false);
        this.opiniones.set(respuesta.opiniones || []);
        this.promedioOpiniones.set(Number(respuesta.promedio || 0));
        this.totalOpiniones.set(Number(respuesta.total || 0));
      },
      error: (error) => {
        console.error('Error al cargar opiniones:', error);
        this.cargandoOpiniones.set(false);
        this.opiniones.set([]);
      },
    });
  }

  private separarLineas(valor: string): string[] {
    return String(valor || '')
      .split(/\r?\n|;/)
      .map((linea) => linea.trim())
      .filter(Boolean);
  }

  private obtenerFechaActual(): string {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}

import { CommonModule } from '@angular/common';

import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';

import { RouterLink } from '@angular/router';

import { OpinionService, OpinionTour } from '../../services/opinion';

import { Tour, Tuorservicio } from '../../services/tuorservicio';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home implements OnInit, OnDestroy {
  private readonly tourService = inject(Tuorservicio);

  private readonly opinionService = inject(OpinionService);

  private carruselTimer: ReturnType<typeof setInterval> | undefined;

  protected readonly cargando = this.tourService.cargando;

  protected readonly error = this.tourService.error;

  protected readonly avisoVisible = signal(true);

  protected readonly indiceCarrusel = signal(0);

  protected readonly totalTours = computed(() => this.tourService.tours().length);

  protected readonly toursCarrusel = computed(() => {
    const tours = this.tourService.tours();

    if (tours.length === 0) {
      return [];
    }

    const cantidadVisible = Math.min(3, tours.length);

    return Array.from(
      {
        length: cantidadVisible,
      },
      (_, desplazamiento) => {
        const posicion = (this.indiceCarrusel() + desplazamiento) % tours.length;

        return tours[posicion];
      },
    );
  });

  protected readonly indicadoresCarrusel = computed(() =>
    Array.from(
      {
        length: this.tourService.tours().length,
      },
      (_, indice) => indice,
    ),
  );

  protected readonly opiniones = signal<OpinionTour[]>([]);

  protected readonly cargandoOpiniones = signal(true);

  protected readonly errorOpiniones = signal('');

  protected readonly totalOpiniones = signal(0);

  protected readonly promedioOpiniones = signal(0);

  protected readonly textoPromedioOpiniones = computed(() => {
    const promedio = this.promedioOpiniones();

    return promedio > 0 ? `${promedio.toFixed(1)}/5` : 'Sin opiniones';
  });

  ngOnInit(): void {
    this.tourService.cargarTours();
    this.cargarOpiniones();
    this.iniciarCarrusel();
  }

  ngOnDestroy(): void {
    this.detenerCarrusel();
  }

  protected cerrarAviso(): void {
    this.avisoVisible.set(false);
  }

  protected siguienteCarrusel(reiniciar = true): void {
    const total = this.totalTours();

    if (total <= 1) {
      return;
    }

    this.indiceCarrusel.update((indice) => (indice + 1) % total);

    if (reiniciar) {
      this.reiniciarCarrusel();
    }
  }

  protected anteriorCarrusel(): void {
    const total = this.totalTours();

    if (total <= 1) {
      return;
    }

    this.indiceCarrusel.update((indice) => (indice - 1 + total) % total);

    this.reiniciarCarrusel();
  }

  protected seleccionarCarrusel(indice: number): void {
    this.indiceCarrusel.set(indice);
    this.reiniciarCarrusel();
  }

  protected pausarCarrusel(): void {
    this.detenerCarrusel();
  }

  protected reanudarCarrusel(): void {
    this.iniciarCarrusel();
  }

  protected inicialesOpinion(opinion: OpinionTour): string {
    const nombre = String(opinion.nombreUsuario || 'Usuario').trim();

    const partes = nombre.split(/\s+/).filter(Boolean).slice(0, 2);

    return partes.map((parte) => parte.charAt(0).toUpperCase()).join('') || 'U';
  }

  protected fechaOpinion(fecha: string): string {
    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
      return 'Fecha no disponible';
    }

    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(valor);
  }

  protected estrellasOpinion(puntuacion: number): string {
    const valor = Math.min(Math.max(Math.round(Number(puntuacion) || 0), 0), 5);

    return '★'.repeat(valor) + '☆'.repeat(5 - valor);
  }

  protected imagenError(event: Event): void {
    const imagen = event.target as HTMLImageElement;

    imagen.src = '/guayaquilcompleto.jpg';
  }

  protected obtenerId(tour: Tour): number {
    return Number(tour.id || (tour as any).idTour || (tour as any).id_tour || 0);
  }

  protected obtenerTitulo(tour: Tour): string {
    return tour.title || (tour as any).nombre || 'Tour en Guayaquil';
  }

  protected obtenerDescripcion(tour: Tour): string {
    return (
      tour.description ||
      (tour as any).descripcion ||
      'Descubre una experiencia única en Guayaquil.'
    );
  }

  protected obtenerImagen(tour: Tour): string {
    return tour.image || (tour as any).imagen || '/guayaquilcompleto.jpg';
  }

  protected obtenerCategoria(tour: Tour): string {
    return tour.categoria || tour.badgeText || 'Experiencia';
  }

  protected obtenerPrecio(tour: Tour): string {
    const valor = (tour as any).price ?? (tour as any).precio;

    if (typeof valor === 'number') {
      return `$${valor.toFixed(2)}`;
    }

    const numero = Number(valor);

    if (valor !== null && valor !== undefined && valor !== '' && Number.isFinite(numero)) {
      return `$${numero.toFixed(2)}`;
    }

    return valor || 'Consultar';
  }

  private cargarOpiniones(): void {
    this.cargandoOpiniones.set(true);
    this.errorOpiniones.set('');

    this.opinionService.listarRecientes(6).subscribe({
      next: (respuesta) => {
        this.opiniones.set(respuesta.opiniones || []);

        this.totalOpiniones.set(Number(respuesta.total || 0));

        this.promedioOpiniones.set(Number(respuesta.promedio || 0));

        this.cargandoOpiniones.set(false);
      },
      error: (error) => {
        this.opiniones.set([]);
        this.totalOpiniones.set(0);
        this.promedioOpiniones.set(0);

        this.errorOpiniones.set(
          this.opinionService.mensajeError(error, 'No se pudieron cargar las opiniones'),
        );

        this.cargandoOpiniones.set(false);
      },
    });
  }

  private iniciarCarrusel(): void {
    this.detenerCarrusel();

    this.carruselTimer = setInterval(() => {
      this.siguienteCarrusel(false);
    }, 5000);
  }

  private detenerCarrusel(): void {
    if (this.carruselTimer) {
      clearInterval(this.carruselTimer);

      this.carruselTimer = undefined;
    }
  }

  private reiniciarCarrusel(): void {
    this.iniciarCarrusel();
  }
}

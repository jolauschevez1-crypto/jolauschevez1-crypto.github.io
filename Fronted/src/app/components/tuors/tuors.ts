import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Tour, Tuorservicio } from '../../services/tuorservicio';
import { Favorito, TourFavorito } from '../../services/favorito';

@Component({
  selector: 'app-tuors',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tuors.html',
  styleUrls: ['./tuors.css'],
})
export class Tuors implements OnInit {
  private readonly tourService = inject(Tuorservicio);
  private readonly favoritoService = inject(Favorito);
  private readonly router = inject(Router);

  protected readonly tours = this.tourService.tours;
  protected readonly cargando = this.tourService.cargando;
  protected readonly error = this.tourService.error;
  protected readonly categorias = this.tourService.categorias;
  protected readonly textoBusqueda = signal('');
  protected readonly busqueda = signal('');
  protected readonly categoriaSeleccionada = signal('todas');

  protected readonly categoriasDisponibles = computed(() => {
    const nombres = this.categorias()
      .map((categoria) => String(categoria.nombre || '').trim())
      .filter(Boolean);
    return Array.from(new Set(nombres)).sort((a, b) => a.localeCompare(b, 'es'));
  });

  protected readonly totalTours = computed(() => this.tours().length);

  protected readonly totalCategorias = computed(() => this.categoriasDisponibles().length);

  protected readonly totalOpiniones = computed(() =>
    this.tours().reduce((total, tour) => total + Number(tour.totalComentarios || 0), 0),
  );

  protected readonly calificacionGlobalTexto = computed(() => {
    const totalOpiniones = this.totalOpiniones();
    if (totalOpiniones <= 0) {
      return '0.0 / 10';
    }

    const sumaPonderada = this.tours().reduce((total, tour) => {
      const opiniones = Number(tour.totalComentarios || 0);
      const calificacion = Number(tour.calificacionPromedio || 0);
      return total + calificacion * opiniones;
    }, 0);

    const promedioSobreCinco = sumaPonderada / totalOpiniones;
    const promedioSobreDiez = promedioSobreCinco * 2;
    return `${promedioSobreDiez.toFixed(1)} / 10`;
  });

  protected readonly toursFiltrados = computed(() => {
    const texto = this.busqueda().toLowerCase().trim();
    const categoria = this.categoriaSeleccionada().toLowerCase().trim();

    return this.tours().filter((tour) => {
      const titulo = String(tour.title || '').toLowerCase();
      const descripcion = String(tour.description || '').toLowerCase();
      const categoriaTour = String(tour.categoria || '').toLowerCase();
      const puntoEncuentro = String(tour.puntoEncuentro || '').toLowerCase();

      const coincideCategoria = categoria === 'todas' || categoriaTour === categoria;
      const coincideBusqueda =
        texto.length === 0 ||
        titulo.includes(texto) ||
        descripcion.includes(texto) ||
        categoriaTour.includes(texto) ||
        puntoEncuentro.includes(texto);

      return coincideCategoria && coincideBusqueda;
    });
  });

  ngOnInit(): void {
    this.tourService.cargarTours();
    this.tourService.cargarCategorias();
  }

  protected actualizarTextoBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.textoBusqueda.set(input.value);
  }

  protected buscar(): void {
    this.busqueda.set(this.textoBusqueda());
    this.irAlListado();
  }

  protected limpiarBusqueda(): void {
    this.textoBusqueda.set('');
    this.busqueda.set('');
  }

  protected seleccionarCategoria(categoria: string): void {
    this.categoriaSeleccionada.set(categoria);
    this.busqueda.set(this.textoBusqueda());
    this.irAlListado();
  }

  protected limpiarFiltros(): void {
    this.textoBusqueda.set('');
    this.busqueda.set('');
    this.categoriaSeleccionada.set('todas');
  }

  protected esFavorito(id: number): boolean {
    return this.favoritoService.esFavorito(id);
  }

  protected toggleFavorito(tour: Tour): void {
    const favorito: TourFavorito = {
      id: tour.id,
      title: tour.title,
      image: tour.image,
      duration: tour.duration,
      rating: tour.rating,
    };
    this.favoritoService.toggle(favorito);
  }

  protected reservar(tour: Tour): void {
    this.router.navigate(['/reserva', tour.idTour || tour.id]);
  }

  protected imagenError(event: Event): void {
    const imagen = event.target as HTMLImageElement;
    imagen.src = '/guayaquilcompleto.jpg';
  }

  private irAlListado(): void {
    window.setTimeout(() => {
      document.getElementById('listadoTours')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  }
}

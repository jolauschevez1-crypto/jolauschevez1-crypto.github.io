import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { buildApiUrl } from '../config/api.config';

export interface Tour {
  id: number;
  idTour: number;

  title: string;
  nombre: string;
  description: string;
  descripcion: string;

  image: string;
  imagen: string;
  imagenes: string[];
  alt: string;

  idCategoria: number;
  categoria: string;

  fechaTour: string;
  cupoTotal: number;
  cuposDisponibles: number;

  precio: number;
  precioNumerico: number;
  price: string;
  precioMenor: number;
  edadGratis: number;

  duracionHoras: number;
  duration: string;
  badgeText: string;
  badgeClass: string;

  puntoEncuentro: string | null;
  idioma: string;
  incluido: string;
  incluidoLista: string[];
  noIncluido: string;
  noIncluidoLista: string[];
  horasAnticipacion: number;
  tipoBono: string;
  accesibilidad: string;
  sostenibilidad: string;
  indicaciones: string;

  activo: boolean;
  calificacionPromedio: number;
  totalComentarios: number;
  rating: string;
}

export interface CategoriaPublica {
  id_categoria: number;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
}

interface RespuestaCategorias {
  ok: boolean;
  total: number;
  categorias: CategoriaPublica[];
}

interface RespuestaTours {
  ok: boolean;
  total: number;
  tours: Tour[];
}

export interface RespuestaTour {
  ok: boolean;
  mensaje?: string;
  tour: Tour;
}

interface RespuestaEliminar {
  ok: boolean;
  mensaje: string;
}

@Injectable({
  providedIn: 'root',
})
export class Tuorservicio {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = buildApiUrl('/api/tours');
  private cargaIniciada = false;

  readonly tours = signal<Tour[]>([]);
  readonly categorias = signal<CategoriaPublica[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');

  constructor() {
    this.cargarTours();
    this.cargarCategorias();
  }

  cargarTours(forzar = false): void {
    if (this.cargaIniciada && !forzar) {
      return;
    }

    this.cargaIniciada = true;
    this.cargando.set(true);
    this.error.set('');

    this.http.get<RespuestaTours>(this.apiUrl).subscribe({
      next: (respuesta) => {
        this.tours.set(respuesta.ok && Array.isArray(respuesta.tours) ? respuesta.tours : []);

        if (!respuesta.ok) {
          this.error.set('No se pudieron obtener los tours');
        }

        this.cargando.set(false);
      },
      error: (error) => {
        console.error('Error al cargar los tours:', error);
        this.cargaIniciada = false;
        this.cargando.set(false);
        this.tours.set([]);
        this.error.set('No se pudo conectar con el servidor de tours');
      },
    });
  }

  cargarCategorias(): void {
    this.http.get<RespuestaCategorias>(`${this.apiUrl}/categorias`).subscribe({
      next: (respuesta) => {
        this.categorias.set(
          respuesta.ok && Array.isArray(respuesta.categorias) ? respuesta.categorias : [],
        );
      },
      error: (error) => {
        console.error('Error al cargar las categorías:', error);
        this.categorias.set([]);
      },
    });
  }

  getById(id: number): Tour | undefined {
    const idBuscado = Number(id);

    return this.tours().find(
      (tour) => Number(tour.id) === idBuscado || Number(tour.idTour) === idBuscado,
    );
  }

  obtenerTourPorId(id: number): Observable<RespuestaTour> {
    return this.http.get<RespuestaTour>(`${this.apiUrl}/${id}`);
  }

  agregar(datos: unknown): void {
    this.error.set('');

    this.http.post<RespuestaTour>(this.apiUrl, datos).subscribe({
      next: (respuesta) => {
        if (respuesta.ok && respuesta.tour) {
          this.tours.update((lista) => [...lista, respuesta.tour]);
        } else {
          this.cargarTours(true);
        }
      },
      error: (error) => {
        const mensaje = error?.error?.mensaje || 'No se pudo agregar el tour';
        this.error.set(mensaje);
        window.alert(mensaje);
      },
    });
  }

  actualizar(id: number, datos: unknown): void {
    this.error.set('');

    this.http.put<RespuestaTour>(`${this.apiUrl}/${id}`, datos).subscribe({
      next: () => this.cargarTours(true),
      error: (error) => {
        const mensaje = error?.error?.mensaje || 'No se pudo actualizar el tour';
        this.error.set(mensaje);
        window.alert(mensaje);
      },
    });
  }

  eliminar(id: number): void {
    if (!window.confirm('¿Seguro que deseas eliminar este tour?')) {
      return;
    }

    this.http.delete<RespuestaEliminar>(`${this.apiUrl}/${id}`).subscribe({
      next: () => this.cargarTours(true),
      error: (error) => {
        const mensaje = error?.error?.mensaje || 'No se pudo eliminar el tour';
        this.error.set(mensaje);
        window.alert(mensaje);
      },
    });
  }
}

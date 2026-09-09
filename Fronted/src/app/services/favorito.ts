import { HttpClient } from '@angular/common/http';

import { Injectable, effect, inject, signal, untracked } from '@angular/core';

import { Router } from '@angular/router';

import { finalize } from 'rxjs';

import { AuthService } from './auth.service';

export interface TourFavorito {
  idFavorito?: number;
  id: number;
  idTour?: number;
  title: string;
  nombre?: string;
  image: string;
  imagen?: string;
  duration: string;
  duracionHoras?: number;
  rating: string;
  calificacionPromedio?: number;
  precio?: number;
  price?: string;
  fechaCreacion?: string;
}

interface RespuestaFavoritos {
  ok: boolean;
  total: number;
  favoritos: TourFavorito[];
  mensaje?: string;
}

interface RespuestaFavorito {
  ok: boolean;
  mensaje: string;
  favorito: TourFavorito;
}

interface RespuestaEliminarFavorito {
  ok: boolean;
  eliminado: boolean;
  mensaje: string;
}

@Injectable({
  providedIn: 'root',
})
export class Favorito {
  private readonly http = inject(HttpClient);

  private readonly auth = inject(AuthService);

  private readonly router = inject(Router);

  private readonly apiUrl = 'http://localhost:3000/api/favoritos';

  private readonly _favoritos = signal<TourFavorito[]>([]);

  private readonly _cargando = signal(false);

  private readonly _error = signal('');

  private readonly _procesandoIds = signal<Set<number>>(new Set<number>());

  readonly favoritos = this._favoritos.asReadonly();

  readonly cargando = this._cargando.asReadonly();

  readonly error = this._error.asReadonly();

  constructor() {
    effect(() => {
      const token = this.auth.token();

      untracked(() => {
        if (token) {
          this.cargarFavoritos();
          return;
        }

        this._favoritos.set([]);
        this._error.set('');
        this._cargando.set(false);
      });
    });
  }

  total(): number {
    return this._favoritos().length;
  }

  cargarFavoritos(): void {
    if (!this.auth.isLoggedIn()) {
      this._favoritos.set([]);
      return;
    }

    this._cargando.set(true);
    this._error.set('');

    this.http
      .get<RespuestaFavoritos>(this.apiUrl)
      .pipe(
        finalize(() => {
          this._cargando.set(false);
        }),
      )
      .subscribe({
        next: (respuesta) => {
          this._favoritos.set(
            respuesta.ok && Array.isArray(respuesta.favoritos)
              ? respuesta.favoritos.map((favorito) => this.normalizar(favorito))
              : [],
          );
        },
        error: (error) => {
          console.error('Error al cargar favoritos:', error);

          this._favoritos.set([]);
          this._error.set(this.obtenerMensajeError(error, 'No se pudieron cargar tus favoritos'));
        },
      });
  }

  agregar(tour: TourFavorito): void {
    if (!this.comprobarSesion()) {
      return;
    }

    const idTour = Number(tour.idTour || tour.id);

    if (
      !Number.isInteger(idTour) ||
      idTour <= 0 ||
      this.estaProcesando(idTour) ||
      this.esFavorito(idTour)
    ) {
      return;
    }

    this.marcarProcesando(idTour, true);
    this._error.set('');

    this.http
      .post<RespuestaFavorito>(this.apiUrl, { idTour })
      .pipe(
        finalize(() => {
          this.marcarProcesando(idTour, false);
        }),
      )
      .subscribe({
        next: (respuesta) => {
          if (respuesta.ok && respuesta.favorito) {
            const favorito = this.normalizar(respuesta.favorito);

            this._favoritos.update((lista) => {
              const sinDuplicado = lista.filter((item) => Number(item.id) !== idTour);

              return [favorito, ...sinDuplicado];
            });
          }
        },
        error: (error) => {
          this._error.set(
            this.obtenerMensajeError(error, 'No se pudo agregar el tour a favoritos'),
          );
        },
      });
  }

  eliminar(id: number): void {
    if (!this.comprobarSesion()) {
      return;
    }

    const idTour = Number(id);

    if (!Number.isInteger(idTour) || idTour <= 0 || this.estaProcesando(idTour)) {
      return;
    }

    this.marcarProcesando(idTour, true);
    this._error.set('');

    this.http
      .delete<RespuestaEliminarFavorito>(`${this.apiUrl}/${idTour}`)
      .pipe(
        finalize(() => {
          this.marcarProcesando(idTour, false);
        }),
      )
      .subscribe({
        next: (respuesta) => {
          if (respuesta.ok) {
            this._favoritos.update((lista) =>
              lista.filter((favorito) => Number(favorito.id) !== idTour),
            );
          }
        },
        error: (error) => {
          this._error.set(this.obtenerMensajeError(error, 'No se pudo eliminar el favorito'));
        },
      });
  }

  esFavorito(id: number): boolean {
    const idTour = Number(id);

    return this._favoritos().some((favorito) => Number(favorito.idTour || favorito.id) === idTour);
  }

  estaProcesando(id: number): boolean {
    return this._procesandoIds().has(Number(id));
  }

  toggle(tour: TourFavorito): void {
    const idTour = Number(tour.idTour || tour.id);

    if (this.esFavorito(idTour)) {
      this.eliminar(idTour);
      return;
    }

    this.agregar({
      ...tour,
      id: idTour,
      idTour,
    });
  }

  private comprobarSesion(): boolean {
    if (this.auth.isLoggedIn()) {
      return true;
    }

    try {
      sessionStorage.setItem('returnUrl', this.router.url);
    } catch {
      // La navegación puede continuar aunque
      // el navegador bloquee sessionStorage.
    }

    this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: this.router.url,
      },
    });

    return false;
  }

  private normalizar(favorito: TourFavorito): TourFavorito {
    const idTour = Number(favorito.idTour || favorito.id);

    return {
      ...favorito,
      id: idTour,
      idTour,
      title: favorito.title || favorito.nombre || 'Tour',
      image: favorito.image || favorito.imagen || '/guayaquilcompleto.jpg',
      duration: favorito.duration || 'Duración por confirmar',
      rating: favorito.rating || 'Sin opiniones',
    };
  }

  private marcarProcesando(idTour: number, activo: boolean): void {
    this._procesandoIds.update((actuales) => {
      const nuevos = new Set(actuales);

      if (activo) {
        nuevos.add(idTour);
      } else {
        nuevos.delete(idTour);
      }

      return nuevos;
    });
  }

  private obtenerMensajeError(error: unknown, predeterminado: string): string {
    const respuesta = error as {
      status?: number;
      error?: {
        mensaje?: string;
        detalle?: string;
      };
      message?: string;
    };

    if (respuesta.status === 0) {
      return 'No se pudo conectar con el backend';
    }

    return (
      respuesta.error?.mensaje || respuesta.error?.detalle || respuesta.message || predeterminado
    );
  }
}

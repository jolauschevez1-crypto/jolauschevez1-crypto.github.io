import { Injectable, signal, inject } from '@angular/core';
import { Tuorservicio } from './tuorservicio';
export interface TourFavorito {
  id: number;
  title: string;
  image: string;
  duration: string;
  rating: string;
}
@Injectable({
  providedIn: 'root',
})
export class Favorito {
  private readonly tourService = inject(Tuorservicio);
  private readonly _favoritos = signal<TourFavorito[]>(this.loadFavorites());

  readonly favoritos = this._favoritos.asReadonly();

  total(): number {
    return this._favoritos().length;
  }

  private loadFavorites(): TourFavorito[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    try {
      const raw = window.localStorage.getItem('favoritos');
      const favorites = raw ? JSON.parse(raw) as Partial<TourFavorito>[] : [];
      const normalized = favorites.map(item => this.normalizeFavorite(item));
      if (raw) {
        // Persist normalized favorites back to localStorage to migrate old entries
        this.saveFavorites(normalized);
      }
      return normalized;
    } catch {
      return [];
    }
  }

  private normalizeFavorite(item: any): TourFavorito {
    const idNum = typeof item.id === 'number' ? item.id : (item.id ? Number(item.id) : undefined);
    const fromService = idNum ? this.tourService.getById(idNum) : undefined;

    const rawImage = item.image ?? item['imagen'] ?? item['img'] ?? item['imageUrl'] ?? item['imagenUrl'];
    const placeholderImage = '/logo.jpg';
    const imageFromItem = typeof rawImage === 'string' && rawImage.trim() ? rawImage.trim() : undefined;

    const finalImage = (imageFromItem && !imageFromItem.toLowerCase().includes('logo'))
      ? imageFromItem
      : (fromService?.image ?? placeholderImage);

    const rawTitle = typeof item.title === 'string' ? item.title.trim() : undefined;
    const finalTitle = (rawTitle && rawTitle.toLowerCase() !== 'favorito')
      ? rawTitle
      : (fromService?.title ?? 'Favorito');

    return {
      id: idNum ?? Date.now(),
      title: finalTitle,
      image: finalImage,
      duration: item.duration ?? fromService?.duration ?? '',
      rating: item.rating ?? fromService?.rating ?? '⭐',
    };
  }

  private saveFavorites(lista: TourFavorito[]): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    window.localStorage.setItem('favoritos', JSON.stringify(lista));
  }

  agregar(tour: TourFavorito): void {
    if (!this.esFavorito(tour.id)) {
      const favorito = this.normalizeFavorite(tour);
      this._favoritos.update(lista => {
        const nuevo = [...lista, favorito];
        this.saveFavorites(nuevo);
        return nuevo;
      });
    }
  }

  eliminar(id: number): void {
    this._favoritos.update(lista => {
      const nuevo = lista.filter(f => f.id !== id);
      this.saveFavorites(nuevo);
      return nuevo;
    });
  }

  esFavorito(id: number): boolean {
    return this._favoritos().some(f => f.id === id);
  }

  toggle(tour: TourFavorito): void {
    if (this.esFavorito(tour.id)) {
      this.eliminar(tour.id);
    } else {
      this.agregar(tour);
    }
  }
}

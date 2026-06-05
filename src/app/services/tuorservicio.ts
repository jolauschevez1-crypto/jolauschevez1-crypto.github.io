import { Injectable, signal } from '@angular/core';
export interface Tour {
  id: number;
  title: string;
  image: string;
  alt: string;
  description: string;
  duration: string;
  price: string;
  precioNumerico: number;
  badgeText: string;
  badgeClass: string;
  rating: string;
}
@Injectable({
  providedIn: 'root',
})
export class Tuorservicio {
   private readonly _tours = signal<Tour[]>([
    {
      id: 1,
      title: 'Guayaquil Completo',
      image: '/guayaquilcompleto.jpg',
      alt: 'Guayaquil Completo',
      description: 'Malecón 2000 → Parque Seminario → Catedral → Las Peñas → Cerro Santa Ana → Puerto Santa Ana',
      duration: '8 Horas',
      price: '$45 por persona',
      precioNumerico: 45,
      badgeText: '8 Horas',
      badgeClass: 'bg-primary',
      rating: '⭐ 4.9',
    },
    {
      id: 2,
      title: 'Tour Histórico',
      image: '/tuorhistorico.jpg',
      alt: 'Tour Histórico',
      description: 'Catedral Metropolitana → Parque Seminario → Palacio Municipal → Barrio Las Peñas',
      duration: '4 Horas',
      price: '$25 por persona',
      precioNumerico: 25,
      badgeText: '4 Horas',
      badgeClass: 'bg-success',
      rating: '⭐ 4.8',
    },
    {
      id: 3,
      title: 'Naturaleza y Fauna',
      image: '/tuornaturaleza.jpg',
      alt: 'Naturaleza y Fauna',
      description: 'Isla Santay → Parque Histórico → Manglares Churute',
      duration: '6 Horas',
      price: '$35 por persona',
      precioNumerico: 35,
      badgeText: '6 Horas',
      badgeClass: 'bg-info',
      rating: '⭐ 4.7',
    },
    {
      id: 4,
      title: 'Tour Fotográfico',
      image: '/tuorfoto.jpg',
      alt: 'Tour Fotográfico',
      description: 'Cerro Santa Ana → Faro → Puerto Santa Ana',
      duration: '3 Horas',
      price: '$20 por persona',
      precioNumerico: 20,
      badgeText: '3 Horas',
      badgeClass: 'bg-warning text-dark',
      rating: '⭐ 4.6',
    },
    {
      id: 5,
      title: 'Tour Gastronómico',
      image: '/mercado.jpg',
      alt: 'Tour Gastronómico',
      description: 'Mercado del Río → Puerto Santa Ana → Comida típica guayaquileña',
      duration: '5 Horas',
      price: '$30 por persona',
      precioNumerico: 30,
      badgeText: '5 Horas',
      badgeClass: 'bg-danger',
      rating: '⭐ 4.8',
    },
    {
      id: 6,
      title: 'Guayaquil Nocturno',
      image: '/tuornoche.jpg',
      alt: 'Guayaquil Nocturno',
      description: 'Malecón 2000 → Puerto Santa Ana → Cerro Santa Ana iluminado',
      duration: '4 Horas',
      price: '$28 por persona',
      precioNumerico: 28,
      badgeText: '4 Horas',
      badgeClass: 'bg-dark',
      rating: '⭐ 4.7',
    },
  ]);
readonly tours = this._tours.asReadonly();

 getAll(): Tour[] { return this._tours(); }
getById(id: number): Tour | undefined {
  return this._tours().find(t => t.id === id);
}

  agregar(tour: Omit<Tour, 'id'>): void {
  const nuevo: Tour = { ...tour, id: Date.now() };
  this._tours.update(lista => [...lista, nuevo]);
}

editar(id: number, datos: Partial<Tour>): void {
  this._tours.update(lista =>
    lista.map(t => t.id === id ? { ...t, ...datos } : t)
  );
}

eliminar(id: number): void {
  this._tours.update(lista => lista.filter(t => t.id !== id));
}
}

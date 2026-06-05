import { Injectable, signal } from '@angular/core';
export interface Reserva {
  id: number;
  tour: string;
  imagen: string;
  fecha: string;
  personas: number;
  precioTotal: number;
  estado: 'Confirmada' | 'Pendiente' | 'Cancelada';
  badgeClass: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReservaService {
   private readonly _reservas = signal<Reserva[]>([
    {
      id: 1,
      tour: 'Cerro Santa Ana',
      imagen: '/cerrosantaana.jpg',
      fecha: '2026-06-15',
      personas: 2,
      precioTotal: 40,
      estado: 'Confirmada',
      badgeClass: 'bg-success',
    },
    {
      id: 2,
      tour: 'Malecón 2000',
      imagen: '/malecon.jpg',
      fecha: '2026-06-22',
      personas: 4,
      precioTotal: 100,
      estado: 'Confirmada',
      badgeClass: 'bg-success',
    },
    {
      id: 3,
      tour: 'Tour Gastronómico',
      imagen: '/mercado.jpg',
      fecha: '2026-06-30',
      personas: 1,
      precioTotal: 30,
      estado: 'Pendiente',
      badgeClass: 'bg-warning text-dark',
    },
  ]);

   readonly reservas = this._reservas.asReadonly();

  agregar(
    reserva: Omit<Reserva, 'id' | 'estado' | 'badgeClass'>
  ): void {

    const nueva: Reserva = {
      ...reserva,
      id: Date.now(),
      estado: 'Confirmada',
      badgeClass: 'bg-success',
    };

    this._reservas.update(lista => [...lista, nueva]);
  }

  cancelar(id: number): void {
    const badges: Record<string, string> = {
      Confirmada: 'bg-success',
      Pendiente: 'bg-warning text-dark',
      Cancelada: 'bg-secondary',
    };

    this._reservas.update(lista =>
      lista.map(r =>
        r.id === id
          ? { ...r, estado: 'Cancelada', badgeClass: badges['Cancelada'] }
          : r
      )
    );
  }

  getTotales(): { realizadas: number; completadas: number } {

    const confirmadas = this._reservas().filter(
      r => r.estado === 'Confirmada'
    );

    return {
      realizadas: confirmadas.length,
      completadas: confirmadas.length,
    };

  }

  getTodasConUsuario(): (Reserva & { usuario: string })[] {

    return this._reservas().map(r => ({
      ...r,
      usuario: 'Usuario Demo',
    }));

  }

  editarEstado(
    id: number,
    estado: 'Confirmada' | 'Pendiente' | 'Cancelada'
  ): void {

    const badges: Record<string, string> = {
      Confirmada: 'bg-success',
      Pendiente: 'bg-warning text-dark',
      Cancelada: 'bg-secondary',
    };

    this._reservas.update(lista =>
      lista.map(r =>
        r.id === id
          ? {
              ...r,
              estado,
              badgeClass: badges[estado],
            }
          : r)
  );
}
}

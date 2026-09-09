import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

export type EstadoReserva = 'Confirmada' | 'Pendiente' | 'Cancelada';

export interface ReservaGuardada {
  id: number;
  idReserva: number;
  idUsuario: number;
  idTour: number;

  tour: string;
  nombreTour: string;
  imagen: string;

  fecha: string;
  fechaTour: string;

  personas: number;
  cantidadPersonas: number;
  cantidadAdultos: number;
  cantidadMenores: number;

  precioUnitario: number;
  precioAdulto: number;
  precioMenor: number;
  precioTotal: number;

  estado: EstadoReserva;
  badgeClass: string;

  idPago?: number | null;
  estadoPago?: 'pendiente' | 'pagado' | 'rechazado' | 'reembolsado' | null;
  metodoPago?: 'tarjeta' | 'transferencia' | 'efectivo' | null;
  referenciaPago?: string | null;

  usuario?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface CrearReserva {
  idTour: number;
  fecha: string;
  cantidadAdultos: number;
  cantidadMenores: number;
}

export interface RespuestaReserva {
  ok: boolean;
  mensaje: string;
  cuposDisponibles?: number;
  reserva: ReservaGuardada;
}

export interface RespuestaDisponibilidad {
  ok: boolean;
  idTour: number;
  fecha: string;
  cupoTotal: number;
  personasReservadas: number;
  cuposDisponibles: number;
  mensaje?: string;
}

export interface RespuestaReservas {
  ok: boolean;
  total: number;
  reservas: ReservaGuardada[];
}

export interface RespuestaSimple {
  ok: boolean;
  mensaje: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReservaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/reservas';

  private readonly _reservas = signal<ReservaGuardada[]>([]);
  readonly reservas = this._reservas.asReadonly();
  readonly cargando = signal(false);
  readonly error = signal('');

  crearReserva(datos: CrearReserva): Observable<RespuestaReserva> {
    this.error.set('');

    return this.http
      .post<RespuestaReserva>(this.apiUrl, datos, {
        headers: this.obtenerHeaders(),
      })
      .pipe(
        tap((respuesta) => {
          if (respuesta.ok && respuesta.reserva) {
            this._reservas.update((lista) => [respuesta.reserva, ...lista]);
          }
        }),
      );
  }

  obtenerDisponibilidad(idTour: number, fecha: string): Observable<RespuestaDisponibilidad> {
    const fechaCodificada = encodeURIComponent(fecha);

    return this.http.get<RespuestaDisponibilidad>(
      `${this.apiUrl}/disponibilidad/${idTour}?fecha=${fechaCodificada}`,
      {
        headers: this.obtenerHeaders(),
      },
    );
  }

  cargarMisReservas(): void {
    this.cargando.set(true);
    this.error.set('');

    this.http
      .get<RespuestaReservas>(`${this.apiUrl}/mis-reservas`, {
        headers: this.obtenerHeaders(),
      })
      .subscribe({
        next: (respuesta) => {
          this.cargando.set(false);
          this._reservas.set(
            respuesta.ok && Array.isArray(respuesta.reservas) ? respuesta.reservas : [],
          );
        },
        error: (error) => {
          console.error('Error al cargar reservas:', error);
          this.cargando.set(false);
          this._reservas.set([]);
          this.error.set(this.obtenerMensajeError(error, 'No se pudieron cargar las reservas'));
        },
      });
  }

  cancelarReserva(idReserva: number): Observable<RespuestaSimple> {
    return this.http
      .patch<RespuestaSimple>(
        `${this.apiUrl}/${idReserva}/cancelar`,
        {},
        {
          headers: this.obtenerHeaders(),
        },
      )
      .pipe(
        tap((respuesta) => {
          if (!respuesta.ok) {
            return;
          }

          this._reservas.update((lista) =>
            lista.map((reserva) => {
              const coincide =
                Number(reserva.id) === Number(idReserva) ||
                Number(reserva.idReserva) === Number(idReserva);

              return coincide
                ? {
                    ...reserva,
                    estado: 'Cancelada',
                    badgeClass: 'bg-secondary',
                  }
                : reserva;
            }),
          );
        }),
      );
  }

  getTotales(): {
    realizadas: number;
    completadas: number;
  } {
    const hoy = new Date();
    const fechaActual =
      `${hoy.getFullYear()}-` +
      `${String(hoy.getMonth() + 1).padStart(2, '0')}-` +
      `${String(hoy.getDate()).padStart(2, '0')}`;

    const confirmadas = this._reservas().filter((reserva) => reserva.estado === 'Confirmada');

    const completadas = confirmadas.filter((reserva) => {
      const fecha = String(reserva.fechaTour || reserva.fecha || '').substring(0, 10);

      return fecha.length === 10 && fecha < fechaActual;
    });

    return {
      realizadas: confirmadas.length,
      completadas: completadas.length,
    };
  }

  tieneSesion(): boolean {
    return this.obtenerToken().length > 0;
  }

  obtenerMensajeError(error: unknown, mensajePredeterminado: string): string {
    const respuesta = error as {
      status?: number;
      error?: {
        mensaje?: string;
        detalle?: string;
        error?: string;
        message?: string;
      };
      message?: string;
    };

    if (respuesta.status === 0) {
      return 'No se pudo conectar con el backend';
    }

    return (
      respuesta.error?.mensaje ||
      respuesta.error?.detalle ||
      respuesta.error?.error ||
      respuesta.error?.message ||
      respuesta.message ||
      mensajePredeterminado
    );
  }

  private obtenerHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    const token = this.obtenerToken();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private obtenerToken(): string {
    return sessionStorage.getItem('token') || localStorage.getItem('token') || '';
  }
}

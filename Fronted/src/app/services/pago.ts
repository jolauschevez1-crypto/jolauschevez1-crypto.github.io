import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { buildApiUrl } from '../config/api.config';

export type MetodoPago = 'tarjeta' | 'transferencia' | 'efectivo';

export type EstadoPago = 'pendiente' | 'pagado' | 'rechazado' | 'reembolsado';

export interface ReservaParaPago {
  id?: number;
  idReserva?: number;
  id_reserva?: number;

  idTour?: number;
  id_tour?: number;

  tour?: string;
  nombreTour?: string;
  nombre_tour?: string;

  imagen?: string;

  fecha?: string;
  fechaTour?: string;
  fecha_tour?: string;

  personas?: number;
  cantidadPersonas?: number;
  cantidad_personas?: number;

  precioUnitario?: number;
  precio_unitario?: number;

  precioTotal?: number;
  precio_total?: number;

  estado?: string;

  idPago?: number | null;
  estadoPago?: EstadoPago | null;
  metodoPago?: MetodoPago | null;
  referenciaPago?: string | null;
}

export interface PagoGuardado {
  id_pago: number;
  id_reserva: number;
  monto: number;
  fecha_pago: string;
  metodo_pago: MetodoPago;
  estado_pago: EstadoPago;
  referencia?: string | null;
  fecha_creacion?: string;
  fecha_actualizacion?: string;

  nombre_tour?: string | null;
  fecha_tour?: string | null;
  cantidad_personas?: number | null;
  nombre_usuario?: string | null;
  correo_usuario?: string | null;

  id_usuario?: number;
  id_tour?: number;
  estado_reserva?: string;
}

export interface RespuestaReservaPago {
  ok: boolean;
  mensaje?: string;
  reserva: ReservaParaPago;
}

export interface RespuestaPago {
  ok: boolean;
  mensaje: string;
  pago: PagoGuardado;
}

export interface RespuestaPagos {
  ok: boolean;
  total: number;
  pagos: PagoGuardado[];
}

export interface RespuestaSimplePago {
  ok: boolean;
  mensaje: string;
}

@Injectable({
  providedIn: 'root',
})
export class PagoService {
  private readonly http = inject(HttpClient);

  private readonly apiPagos = buildApiUrl('/api/pagos');

  private readonly apiReservas = buildApiUrl('/api/reservas');

  private readonly apiAdmin = buildApiUrl('/api/admin');

  obtenerReserva(idReserva: number): Observable<RespuestaReservaPago> {
    return this.http.get<RespuestaReservaPago>(`${this.apiReservas}/${idReserva}`, {
      headers: this.obtenerHeaders(),
    });
  }

  registrarPago(idReserva: number, metodoPago: MetodoPago): Observable<RespuestaPago> {
    return this.http.post<RespuestaPago>(
      this.apiPagos,
      {
        idReserva,
        metodoPago,
      },
      {
        headers: this.obtenerHeaders(),
      },
    );
  }

  obtenerPagoReserva(idReserva: number): Observable<RespuestaPago> {
    return this.http.get<RespuestaPago>(`${this.apiPagos}/reserva/${idReserva}`, {
      headers: this.obtenerHeaders(),
    });
  }

  listarPagosAdmin(): Observable<RespuestaPagos> {
    return this.http.get<RespuestaPagos>(`${this.apiAdmin}/pagos`, {
      headers: this.obtenerHeaders(),
    });
  }

  aprobarPago(idPago: number): Observable<RespuestaSimplePago> {
    return this.http.patch<RespuestaSimplePago>(
      `${this.apiAdmin}/pagos/${idPago}/aprobar`,
      {},
      {
        headers: this.obtenerHeaders(),
      },
    );
  }

  rechazarPago(idPago: number): Observable<RespuestaSimplePago> {
    return this.http.patch<RespuestaSimplePago>(
      `${this.apiAdmin}/pagos/${idPago}/rechazar`,
      {},
      {
        headers: this.obtenerHeaders(),
      },
    );
  }

  reembolsarPago(idPago: number): Observable<RespuestaSimplePago> {
    return this.http.patch<RespuestaSimplePago>(
      `${this.apiAdmin}/pagos/${idPago}/reembolsar`,
      {},
      {
        headers: this.obtenerHeaders(),
      },
    );
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
    const token = sessionStorage.getItem('token') || localStorage.getItem('token') || '';

    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }
}

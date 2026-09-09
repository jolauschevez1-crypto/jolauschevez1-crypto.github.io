import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface OpinionTour {
  idOpinion: number;
  idTour: number;
  idUsuario: number;
  nombreUsuario: string;
  nombreTour?: string | null;
  ciudad: string;
  tipoViaje: string;
  puntuacion: number;
  comentario: string;
  fechaCreacion: string;
  fechaActualizacion?: string;
}

export interface RespuestaOpiniones {
  ok: boolean;
  total: number;
  promedio: number;
  opiniones: OpinionTour[];
  mensaje?: string;
}

export interface CrearOpinion {
  puntuacion: number;
  comentario: string;
  ciudad: string;
  tipoViaje: string;
}

export interface RespuestaOpinion {
  ok: boolean;
  mensaje: string;
  opinion: OpinionTour;
}

@Injectable({
  providedIn: 'root',
})
export class OpinionService {
  private readonly http = inject(HttpClient);
  private readonly api = 'http://localhost:3000/api/opiniones';

  listarRecientes(limite = 6): Observable<RespuestaOpiniones> {
    return this.http.get<RespuestaOpiniones>(`${this.api}/recientes`, {
      params: {
        limite: String(limite),
      },
    });
  }

  listarPorTour(idTour: number): Observable<RespuestaOpiniones> {
    return this.http.get<RespuestaOpiniones>(`${this.api}/tour/${idTour}`);
  }

  guardar(idTour: number, datos: CrearOpinion): Observable<RespuestaOpinion> {
    return this.http.post<RespuestaOpinion>(`${this.api}/tour/${idTour}`, datos, {
      headers: this.obtenerHeaders(),
    });
  }

  tieneSesion(): boolean {
    return this.obtenerToken().length > 0;
  }

  mensajeError(error: unknown, predeterminado: string): string {
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

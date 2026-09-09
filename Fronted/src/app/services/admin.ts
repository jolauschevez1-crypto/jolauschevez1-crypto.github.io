import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Observable, timeout } from 'rxjs';

export interface DashboardAdmin {
  usuarios: number;
  tours: number;
  reservas: number;
  reservas_pendientes: number;
  reservas_confirmadas: number;
  pagos_pendientes: number;
  ingresos: number;
}

export interface ActividadRecienteAdmin {
  tipo: 'pago' | 'reserva' | 'usuario';
  id_referencia: number;
  estado_anterior: string | null;
  estado_nuevo: string;
  fecha_cambio: string;
}

export interface ResumenReporteAdmin {
  usuarios_registrados: number;
  usuarios_activos: number;
  tours_activos: number;
  total_reservas: number;
  reservas_confirmadas: number;
  pagos_aprobados: number;
  ingresos_aprobados: number;
}

export interface ClienteFrecuenteAdmin {
  id_usuario: number;
  turista: string;
  total_reservas: number;
  gasto_total: number;
}

export interface TourBajoRendimientoAdmin {
  id_tour: number;
  nombre: string;
  fecha_tour: string;
  total_reservas: number;
}
export interface ProximoTourAdmin {
  id_tour: number;
  nombre: string;
  fecha_tour: string;
  reservas_confirmadas: number;
  personas_confirmadas: number;
}

export interface ReservasEstadoReporteAdmin {
  pendiente: number;
  confirmada: number;
  cancelada: number;
  total: number;
}

export interface PagosEstadoReporteAdmin {
  pendiente: number;
  pagado: number;
  rechazado: number;
  reembolsado: number;
  total: number;
}

export interface IngresoMensualReporteAdmin {
  periodo: string;
  ingresos: number;
  pagos: number;
}

export interface TourReporteAdmin {
  id_tour: number;
  nombre: string;
  total_reservas: number;
  total_personas: number;
  ingresos: number;
}

export interface ReporteAdmin {
  periodo: {
    desde: string | null;
    hasta: string | null;
  };
  resumen: ResumenReporteAdmin;
  reservasPorEstado: ReservasEstadoReporteAdmin;
  pagosPorEstado: PagosEstadoReporteAdmin;
  ingresosPorMes: IngresoMensualReporteAdmin[];
  toursMasReservados: TourReporteAdmin[];
}

export interface RespuestaReporteAdmin extends ReporteAdmin {
  ok: boolean;
}

export interface CategoriaAdmin {
  id_categoria: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  total_tours?: number;
  tours_activos?: number;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface TourAdmin {
  id: number;
  idTour: number;
  idCategoria: number;
  categoria: string;
  categoriaActiva?: boolean;
  nombre: string;
  title: string;
  descripcion: string;
  description: string;
  fechaTour: string;
  cupoTotal: number;
  cuposDisponibles: number;
  precio: number;
  precioNumerico: number;
  price: string;
  imagen: string;
  image: string;
  duracionHoras: number;
  duration: string;
  puntoEncuentro: string;
  idioma: string;
  incluido: string;
  noIncluido: string;
  horasAnticipacion: number;
  tipoBono: string;
  accesibilidad: string;
  sostenibilidad: string;
  indicaciones: string;
  precioMenor: number;
  edadGratis: number;
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface UsuarioAdmin {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  foto_perfil?: string;
  activo: boolean;
  rol: 'user' | 'admin';
  es_admin_actual?: boolean;
  fecha_creacion?: string;
}

export interface ReservaAdmin {
  id_reserva: number;
  id_usuario: number;
  nombre_usuario: string;
  correo_usuario: string;
  id_tour: number;
  nombre_tour: string;
  fecha_creacion: string;
  fecha_tour: string;
  cantidad_personas: number;
  precio_unitario: number;
  precio_total: number;
  estado: 'Pendiente' | 'Confirmada' | 'Cancelada';
  id_pago?: number | null;
  estado_pago?: string | null;
}

export interface PagoAdmin {
  id_pago: number;
  id_reserva: number;
  monto: number;
  fecha_pago: string;
  metodo_pago: 'tarjeta' | 'transferencia' | 'efectivo';
  estado_pago: 'pendiente' | 'pagado' | 'rechazado' | 'reembolsado';
  referencia?: string;
  nombre_usuario: string;
  correo_usuario: string;
  nombre_tour: string;
  fecha_tour: string;
  estado_reserva: string;
}

export interface PerfilAdmin {
  id_admin: number;
  nombre: string;
  correo: string;
  activo: boolean;
}

export interface RespuestaSimple {
  ok: boolean;
  mensaje: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly http = inject(HttpClient);

  private readonly api = 'http://localhost:3000/api/admin';

  obtenerDashboard(): Observable<any> {
    return this.http.get(`${this.api}/dashboard`, this.opciones());
  }

  obtenerActividadReciente(): Observable<{
    ok: boolean;
    actividadReciente: ActividadRecienteAdmin[];
  }> {
    return this.http.get<{ ok: boolean; actividadReciente: ActividadRecienteAdmin[] }>(
      `${this.api}/reportes/actividad-reciente`,
      this.opciones(),
    );
  }

  obtenerClientesFrecuentes(): Observable<{
    ok: boolean;
    clientesFrecuentes: ClienteFrecuenteAdmin[];
  }> {
    return this.http.get<{ ok: boolean; clientesFrecuentes: ClienteFrecuenteAdmin[] }>(
      `${this.api}/reportes/clientes-frecuentes`,
      this.opciones(),
    );
  }

  obtenerToursBajoRendimiento(): Observable<{
    ok: boolean;
    toursBajoRendimiento: TourBajoRendimientoAdmin[];
  }> {
    return this.http.get<{ ok: boolean; toursBajoRendimiento: TourBajoRendimientoAdmin[] }>(
      `${this.api}/reportes/tours-bajo-rendimiento`,
      this.opciones(),
    );
  }

  obtenerProximosTours(): Observable<{ ok: boolean; proximosTours: ProximoTourAdmin[] }> {
    return this.http.get<{ ok: boolean; proximosTours: ProximoTourAdmin[] }>(
      `${this.api}/reportes/proximos-tours`,
      this.opciones(),
    );
  }

  obtenerReportes(desde: string, hasta: string): Observable<RespuestaReporteAdmin> {
    let parametros = new HttpParams();

    if (desde) {
      parametros = parametros.set('desde', desde);
    }

    if (hasta) {
      parametros = parametros.set('hasta', hasta);
    }

    return this.http
      .get<RespuestaReporteAdmin>(`${this.api}/reportes`, {
        ...this.opciones(),
        params: parametros,
      })
      .pipe(timeout(15000));
  }

  obtenerPerfil(): Observable<any> {
    return this.http.get(`${this.api}/perfil`, this.opciones()).pipe(
      /* Evita que el "Cargando..." se quede colgado para siempre. */
      timeout(12000),
    );
  }

  actualizarPerfil(datos: { nombre: string; correo: string }): Observable<any> {
    return this.http.put(`${this.api}/perfil`, datos, this.opciones());
  }

  cambiarPassword(datos: {
    passwordActual: string;
    passwordNueva: string;
  }): Observable<RespuestaSimple> {
    return this.http.patch<RespuestaSimple>(`${this.api}/perfil/password`, datos, this.opciones());
  }

  /*
    CATEGORÍAS
  */
  listarCategorias(): Observable<{
    ok: boolean;
    total: number;
    categorias: CategoriaAdmin[];
  }> {
    return this.http.get<any>(`${this.api}/categorias`, this.opciones());
  }

  crearCategoria(datos: { nombre: string; descripcion: string }): Observable<RespuestaSimple> {
    return this.http.post<RespuestaSimple>(`${this.api}/categorias`, datos, this.opciones());
  }

  actualizarCategoria(
    id: number,
    datos: {
      nombre: string;
      descripcion: string;
      activo: boolean;
    },
  ): Observable<RespuestaSimple> {
    return this.http.put<RespuestaSimple>(`${this.api}/categorias/${id}`, datos, this.opciones());
  }

  desactivarCategoria(id: number): Observable<RespuestaSimple> {
    return this.http.delete<RespuestaSimple>(`${this.api}/categorias/${id}`, this.opciones());
  }

  activarCategoria(id: number): Observable<RespuestaSimple> {
    return this.http.patch<RespuestaSimple>(
      `${this.api}/categorias/${id}/activar`,
      {},
      this.opciones(),
    );
  }

  /*
    TOURS
  */
  listarTours(): Observable<{
    ok: boolean;
    total: number;
    tours: TourAdmin[];
  }> {
    return this.http.get<any>(`${this.api}/tours`, this.opciones());
  }

  crearTour(datos: any): Observable<RespuestaSimple> {
    return this.http.post<RespuestaSimple>(`${this.api}/tours`, datos, this.opciones());
  }

  actualizarTour(id: number, datos: any): Observable<RespuestaSimple> {
    return this.http.put<RespuestaSimple>(`${this.api}/tours/${id}`, datos, this.opciones());
  }

  eliminarTour(id: number): Observable<RespuestaSimple> {
    return this.http.delete<RespuestaSimple>(`${this.api}/tours/${id}`, this.opciones());
  }

  activarTour(id: number): Observable<RespuestaSimple> {
    return this.http.patch<RespuestaSimple>(`${this.api}/tours/${id}/activar`, {}, this.opciones());
  }

  /*
    USUARIOS
  */
  listarUsuarios(): Observable<any> {
    return this.http.get(`${this.api}/usuarios`, this.opciones());
  }

  crearUsuario(datos: any): Observable<RespuestaSimple> {
    return this.http.post<RespuestaSimple>(`${this.api}/usuarios`, datos, this.opciones());
  }

  actualizarUsuario(id: number, datos: any): Observable<RespuestaSimple> {
    return this.http.put<RespuestaSimple>(`${this.api}/usuarios/${id}`, datos, this.opciones());
  }

  cambiarRolUsuario(
    id: number,
    rol: 'user' | 'admin',
  ): Observable<
    RespuestaSimple & {
      rol: 'user' | 'admin';
    }
  > {
    return this.http.patch<
      RespuestaSimple & {
        rol: 'user' | 'admin';
      }
    >(`${this.api}/usuarios/${id}/rol`, { rol }, this.opciones());
  }

  eliminarUsuario(id: number): Observable<RespuestaSimple> {
    return this.http.delete<RespuestaSimple>(`${this.api}/usuarios/${id}`, this.opciones());
  }

  /*
    RESERVAS
  */
  listarReservas(): Observable<any> {
    return this.http.get(`${this.api}/reservas`, this.opciones());
  }

  crearReserva(datos: any): Observable<RespuestaSimple> {
    return this.http.post<RespuestaSimple>(`${this.api}/reservas`, datos, this.opciones());
  }

  actualizarReserva(id: number, datos: any): Observable<RespuestaSimple> {
    return this.http.put<RespuestaSimple>(`${this.api}/reservas/${id}`, datos, this.opciones());
  }

  eliminarReserva(id: number): Observable<RespuestaSimple> {
    return this.http.delete<RespuestaSimple>(`${this.api}/reservas/${id}`, this.opciones());
  }

  /*
    PAGOS
  */
  listarPagos(): Observable<any> {
    return this.http.get(`${this.api}/pagos`, this.opciones());
  }

  crearPago(datos: any): Observable<RespuestaSimple> {
    return this.http.post<RespuestaSimple>(`${this.api}/pagos`, datos, this.opciones());
  }

  actualizarPago(id: number, datos: any): Observable<RespuestaSimple> {
    return this.http.put<RespuestaSimple>(`${this.api}/pagos/${id}`, datos, this.opciones());
  }

  eliminarPago(id: number): Observable<RespuestaSimple> {
    return this.http.delete<RespuestaSimple>(`${this.api}/pagos/${id}`, this.opciones());
  }

  aprobarPago(id: number): Observable<RespuestaSimple> {
    return this.http.patch<RespuestaSimple>(`${this.api}/pagos/${id}/aprobar`, {}, this.opciones());
  }

  rechazarPago(id: number): Observable<RespuestaSimple> {
    return this.http.patch<RespuestaSimple>(
      `${this.api}/pagos/${id}/rechazar`,
      {},
      this.opciones(),
    );
  }

  reembolsarPago(id: number): Observable<RespuestaSimple> {
    return this.http.patch<RespuestaSimple>(
      `${this.api}/pagos/${id}/reembolsar`,
      {},
      this.opciones(),
    );
  }

  mensajeError(error: any, predeterminado: string): string {
    if (error?.status === 0) {
      return 'No se pudo conectar con el backend';
    }

    if (error?.name === 'TimeoutError') {
      return 'El backend tardó demasiado en responder';
    }

    if (Array.isArray(error?.error?.errores)) {
      return error.error.errores.join(', ');
    }

    return error?.error?.mensaje || error?.error?.detalle || error?.message || predeterminado;
  }

  private opciones(): {
    headers: HttpHeaders;
  } {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token') || '';

    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',

        Authorization: `Bearer ${token}`,
      }),
    };
  }
}

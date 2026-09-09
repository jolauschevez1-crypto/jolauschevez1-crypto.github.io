import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Injectable, computed, inject, signal } from '@angular/core';

import { Observable, tap, timeout } from 'rxjs';

export type UserRole = 'user' | 'admin' | null;

export interface Usuario {
  idUsuario: number;
  id: number;
  nombre: string;
  email: string;
  correo: string;
  telefono: string;
  fotoPerfil?: string;
  foto_perfil?: string;
  rol: 'user' | 'admin';
}

export interface PerfilEstadisticas {
  reservas: number;
  favoritos: number;
}

export interface RespuestaLogin {
  ok: boolean;
  mensaje: string;
  token: string;
  usuario: Usuario;
}

export interface RespuestaPerfil {
  ok: boolean;
  mensaje?: string;
  token?: string;
  usuario: Usuario;
  estadisticas?: PerfilEstadisticas;
}

export interface ActualizarPerfilDatos {
  nombre: string;
  correo: string;
  telefono: string;
  fotoPerfil: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:3000/api/auth';

  private readonly _usuario = signal<Usuario | null>(this.cargarUsuarioGuardado());

  private readonly _token = signal<string>(this.obtenerTokenGuardado());

  readonly usuarioActual = this._usuario.asReadonly();

  readonly token = this._token.asReadonly();

  readonly isLoggedIn = computed(() => {
    return this._usuario() !== null && this._token().length > 0;
  });

  readonly isAdmin = computed(() => {
    return this._usuario()?.rol === 'admin';
  });

  readonly role = computed<UserRole>(() => {
    return this._usuario()?.rol || null;
  });

  get usuario(): Usuario {
    return (
      this._usuario() || {
        idUsuario: 0,
        id: 0,
        nombre: 'Usuario',
        email: '',
        correo: '',
        telefono: '',
        fotoPerfil: '/gente.png',
        foto_perfil: '/gente.png',
        rol: 'user',
      }
    );
  }

  login(correo: string, contrasena: string): Observable<RespuestaLogin> {
    return this.http
      .post<RespuestaLogin>(`${this.apiUrl}/login`, {
        correo,
        contrasena,
      })
      .pipe(
        timeout(12000),
        tap((respuesta) => {
          if (respuesta.ok && respuesta.token && respuesta.usuario) {
            this.guardarSesion(respuesta.token, respuesta.usuario);
          }
        }),
      );
  }

  registrar(datos: {
    nombre: string;
    correo: string;
    telefono?: string;
    contrasena: string;
  }): Observable<RespuestaLogin> {
    return this.http.post<RespuestaLogin>(`${this.apiUrl}/registro`, datos).pipe(
      timeout(12000),
      tap((respuesta) => {
        if (respuesta.ok && respuesta.token && respuesta.usuario) {
          this.guardarSesion(respuesta.token, respuesta.usuario);
        }
      }),
    );
  }

  obtenerPerfil(): Observable<RespuestaPerfil> {
    return this.http
      .get<RespuestaPerfil>(`${this.apiUrl}/perfil`, {
        headers: this.obtenerHeaders(),
      })
      .pipe(
        /* Evita que el cargador quede infinito. */
        timeout(12000),
        tap((respuesta) => {
          if (respuesta.ok && respuesta.usuario) {
            this.actualizarSesionLocal(respuesta.usuario);
          }
        }),
      );
  }

  cargarPerfil(): void {
    if (!this.obtenerTokenGuardado()) {
      return;
    }

    this.obtenerPerfil().subscribe({
      error: (error) => {
        if (error?.status === 401) {
          this.logout();
        }
      },
    });
  }

  actualizarPerfil(datos: ActualizarPerfilDatos): Observable<RespuestaPerfil> {
    return this.http
      .put<RespuestaPerfil>(`${this.apiUrl}/perfil`, datos, {
        headers: this.obtenerHeaders(),
      })
      .pipe(
        timeout(15000),
        tap((respuesta) => {
          if (respuesta.ok && respuesta.usuario) {
            if (respuesta.token) {
              this._token.set(respuesta.token);

              this.guardarEnStorageActivo('token', respuesta.token);
            }

            this.actualizarSesionLocal(respuesta.usuario);
          }
        }),
      );
  }

  logout(): void {
    this._token.set('');
    this._usuario.set(null);

    for (const almacenamiento of [sessionStorage, localStorage]) {
      almacenamiento.removeItem('token');
      almacenamiento.removeItem('usuario');
      almacenamiento.removeItem('rol');
      almacenamiento.removeItem('perfil_nombre');
      almacenamiento.removeItem('perfil_email');
      almacenamiento.removeItem('perfil_telefono');
      almacenamiento.removeItem('perfil_foto');
    }
  }

  private actualizarSesionLocal(usuario: Usuario): void {
    const normalizado: Usuario = {
      ...usuario,
      id: Number(usuario.id || usuario.idUsuario || 0),
      idUsuario: Number(usuario.idUsuario || usuario.id || 0),
      email: usuario.email || usuario.correo || '',
      correo: usuario.correo || usuario.email || '',
      telefono: usuario.telefono || '',
      fotoPerfil: usuario.fotoPerfil || usuario.foto_perfil || '/gente.png',
      foto_perfil: usuario.foto_perfil || usuario.fotoPerfil || '/gente.png',
    };

    this._usuario.set(normalizado);

    this.guardarEnStorageActivo('usuario', JSON.stringify(normalizado));

    this.guardarEnStorageActivo('rol', normalizado.rol);

    this.guardarEnStorageActivo('perfil_nombre', normalizado.nombre);

    this.guardarEnStorageActivo('perfil_email', normalizado.email);

    this.guardarEnStorageActivo('perfil_telefono', normalizado.telefono);

    this.guardarEnStorageActivo('perfil_foto', normalizado.fotoPerfil || '/gente.png');
  }

  private guardarSesion(token: string, usuario: Usuario): void {
    this._token.set(token);

    /*
      Respeta el almacenamiento que ya usa
      el proyecto. En una sesión nueva usa
      sessionStorage.
    */
    const almacenamiento = localStorage.getItem('token') ? localStorage : sessionStorage;

    almacenamiento.setItem('token', token);

    this.actualizarSesionLocal(usuario);
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.obtenerTokenGuardado();

    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private obtenerTokenGuardado(): string {
    return sessionStorage.getItem('token') || localStorage.getItem('token') || '';
  }

  private cargarUsuarioGuardado(): Usuario | null {
    const texto = sessionStorage.getItem('usuario') || localStorage.getItem('usuario');

    if (!texto) {
      return null;
    }

    try {
      return JSON.parse(texto) as Usuario;
    } catch {
      sessionStorage.removeItem('usuario');
      localStorage.removeItem('usuario');
      return null;
    }
  }

  private guardarEnStorageActivo(clave: string, valor: string): void {
    const usaSesion = Boolean(sessionStorage.getItem('token'));

    const usaLocal = Boolean(localStorage.getItem('token'));

    if (usaSesion) {
      sessionStorage.setItem(clave, valor);
    }

    if (usaLocal) {
      localStorage.setItem(clave, valor);
    }

    if (!usaSesion && !usaLocal) {
      sessionStorage.setItem(clave, valor);
    }
  }
}

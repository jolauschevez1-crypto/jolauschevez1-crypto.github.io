import { computed, Injectable, signal } from '@angular/core';

export type UserRole = 'user' | 'admin' | null;

export interface Usuario {
  nombre: string;
  email: string;
  telefono: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _role = signal<UserRole>(null);

  private _usuario: Usuario = {
    nombre: 'Usuario',
    email: 'usuario@correo.com',
    telefono: '',
  };

  public readonly isLoggedIn = computed(() => this._role() !== null);
  public readonly isAdmin    = computed(() => this._role() === 'admin');
  public readonly role       = this._role.asReadonly();

  get usuario(): Usuario {
    return { ...this._usuario };
  }

  login(email: string, nombre?: string, role: UserRole = 'user'): void {
    this._usuario.email = email;
    if (nombre) this._usuario.nombre = nombre;
    this._role.set(role);
  }

  logout(): void {
    this._role.set(null);
  }

  actualizarPerfil(datos: Partial<Usuario>): void {
    this._usuario = { ...this._usuario, ...datos };
  }

}

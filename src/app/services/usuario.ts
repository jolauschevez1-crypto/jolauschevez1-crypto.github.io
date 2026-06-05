import { Injectable, signal } from '@angular/core';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  rol: 'user' | 'admin';
  fechaRegistro: string;
}

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private readonly _usuarios = signal<Usuario[]>([
    { id: 1, nombre: 'Ana Torres',    email: 'ana@correo.com',    telefono: '+593 99 111 1111', rol: 'user',  fechaRegistro: '2026-01-10' },
    { id: 2, nombre: 'Luis Méndez',   email: 'luis@correo.com',   telefono: '+593 99 222 2222', rol: 'user',  fechaRegistro: '2026-02-14' },
    { id: 3, nombre: 'María Ponce',   email: 'maria@correo.com',  telefono: '+593 99 333 3333', rol: 'user',  fechaRegistro: '2026-03-05' },
    { id: 4, nombre: 'Admin JMJ',     email: 'admin@jmj.com',     telefono: '+593 99 000 0000', rol: 'admin', fechaRegistro: '2025-12-01' },
  ]);

  readonly usuarios = this._usuarios.asReadonly();

  eliminar(id: number): void {
    this._usuarios.update(lista => lista.filter(u => u.id !== id));
  }

  cambiarRol(id: number, rol: 'user' | 'admin'): void {
    this._usuarios.update(lista =>
      lista.map(u => u.id === id ? { ...u, rol } : u)
    );
  }

  getTotales() {
    const todos = this._usuarios();
    return {
      total:  todos.length,
      admins: todos.filter(u => u.rol === 'admin').length,
      users:  todos.filter(u => u.rol === 'user').length,
    };
  }
}

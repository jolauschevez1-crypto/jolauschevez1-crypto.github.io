import { CommonModule } from '@angular/common';

import { Component, OnInit, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { AdminService, CategoriaAdmin } from '../../../services/admin';

interface FormularioCategoria {
  nombre: string;
  descripcion: string;
  activo: boolean;
}

@Component({
  selector: 'app-categorias-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categorias.html',
  styleUrls: ['./categorias.css'],
})
export class CategoriasAdmin implements OnInit {
  private readonly adminService = inject(AdminService);

  protected readonly categorias = signal<CategoriaAdmin[]>([]);

  protected readonly cargando = signal(true);

  protected readonly guardando = signal(false);

  protected readonly procesandoId = signal(0);

  protected readonly error = signal('');

  protected readonly mensaje = signal('');

  protected mostrarFormulario = false;

  protected editandoId: number | null = null;

  protected formulario: FormularioCategoria = this.formularioVacio();

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.adminService.listarCategorias().subscribe({
      next: (respuesta) => {
        this.categorias.set(respuesta.categorias || []);

        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);

        this.error.set(
          this.adminService.mensajeError(error, 'No se pudieron cargar las categorías'),
        );
      },
    });
  }

  protected nueva(): void {
    this.editandoId = null;

    this.formulario = this.formularioVacio();

    this.mostrarFormulario = true;

    this.error.set('');
    this.mensaje.set('');
  }

  protected editar(categoria: CategoriaAdmin): void {
    this.editandoId = categoria.id_categoria;

    this.formulario = {
      nombre: categoria.nombre,

      descripcion: categoria.descripcion || '',

      activo: categoria.activo,
    };

    this.mostrarFormulario = true;

    this.error.set('');
    this.mensaje.set('');
  }

  protected cancelar(): void {
    this.mostrarFormulario = false;

    this.editandoId = null;

    this.formulario = this.formularioVacio();
  }

  protected guardar(): void {
    const nombre = this.formulario.nombre.trim();

    if (!nombre) {
      this.error.set('El nombre de la categoría es obligatorio');

      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');

    const datos = {
      nombre,

      descripcion: this.formulario.descripcion.trim(),

      activo: this.formulario.activo,
    };

    const peticion = this.editandoId
      ? this.adminService.actualizarCategoria(this.editandoId, datos)
      : this.adminService.crearCategoria(datos);

    peticion.subscribe({
      next: (respuesta) => {
        this.guardando.set(false);

        this.mensaje.set(respuesta.mensaje);

        this.mostrarFormulario = false;

        this.editandoId = null;

        this.cargar();
      },
      error: (error) => {
        this.guardando.set(false);

        this.error.set(this.adminService.mensajeError(error, 'No se pudo guardar la categoría'));
      },
    });
  }

  protected desactivar(categoria: CategoriaAdmin): void {
    const confirmar = window.confirm(`¿Desactivar la categoría "${categoria.nombre}"?`);

    if (!confirmar) {
      return;
    }

    this.procesandoId.set(categoria.id_categoria);

    this.error.set('');
    this.mensaje.set('');

    this.adminService.desactivarCategoria(categoria.id_categoria).subscribe({
      next: (respuesta) => {
        this.procesandoId.set(0);

        this.mensaje.set(respuesta.mensaje);

        this.cargar();
      },
      error: (error) => {
        this.procesandoId.set(0);

        this.error.set(this.adminService.mensajeError(error, 'No se pudo desactivar la categoría'));
      },
    });
  }

  protected activar(categoria: CategoriaAdmin): void {
    const confirmar = window.confirm(`¿Activar la categoría "${categoria.nombre}"?`);

    if (!confirmar) {
      return;
    }

    this.procesandoId.set(categoria.id_categoria);

    this.error.set('');
    this.mensaje.set('');

    this.adminService.activarCategoria(categoria.id_categoria).subscribe({
      next: (respuesta) => {
        this.procesandoId.set(0);

        this.mensaje.set(respuesta.mensaje);

        this.cargar();
      },
      error: (error) => {
        this.procesandoId.set(0);

        this.error.set(this.adminService.mensajeError(error, 'No se pudo activar la categoría'));
      },
    });
  }

  private formularioVacio(): FormularioCategoria {
    return {
      nombre: '',
      descripcion: '',
      activo: true,
    };
  }
}

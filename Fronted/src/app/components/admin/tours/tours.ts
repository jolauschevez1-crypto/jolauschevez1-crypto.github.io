import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { buildUploadUrl } from '../../../config/api.config';
import { AdminService, CategoriaAdmin, TourAdmin } from '../../../services/admin';

interface FormularioTour {
  idCategoria: number | null;
  nombre: string;
  descripcion: string;
  fechaTour: string;
  cupoTotal: number;
  precio: number;
  imagen: string;
  duracionHoras: number;
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
}

@Component({
  selector: 'app-tours',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tours.html',
  styleUrls: ['./tours.css'],
})
export class ToursAdmin implements OnInit {
  private readonly adminService = inject(AdminService);

  protected readonly tours = signal<TourAdmin[]>([]);
  protected readonly categorias = signal<CategoriaAdmin[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly procesandoId = signal(0);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');

  protected mostrarFormulario = false;
  protected editandoId: number | null = null;
  protected formulario: FormularioTour = this.formularioVacio();

  ngOnInit(): void {
    this.cargarTodo();
  }

  protected cargarTodo(): void {
    this.cargando.set(true);
    this.error.set('');

    this.adminService.listarCategorias().subscribe({
      next: (respuesta) => {
        this.categorias.set((respuesta.categorias || []).filter((categoria) => categoria.activo));
      },
      error: (error) => {
        this.error.set(
          this.adminService.mensajeError(error, 'No se pudieron cargar las categorías'),
        );
      },
    });

    this.adminService.listarTours().subscribe({
      next: (respuesta) => {
        this.tours.set(respuesta.tours || []);
        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);
        this.error.set(this.adminService.mensajeError(error, 'No se pudieron cargar los tours'));
      },
    });
  }

  protected nuevo(): void {
    this.editandoId = null;
    this.formulario = this.formularioVacio();
    this.formulario.idCategoria = this.categorias()[0]?.id_categoria || null;
    this.mostrarFormulario = true;
    this.error.set('');
    this.mensaje.set('');
  }

  protected editar(tour: TourAdmin): void {
    if (!tour.categoriaActiva) {
      this.error.set('Activa primero la categoría de este tour para editarlo');
      return;
    }

    this.editandoId = tour.idTour;
    this.formulario = {
      idCategoria: tour.idCategoria,
      nombre: tour.nombre,
      descripcion: tour.descripcion,
      fechaTour: String(tour.fechaTour || '').substring(0, 10),
      cupoTotal: tour.cupoTotal,
      precio: tour.precio,
      imagen: tour.imagen || '',
      duracionHoras: tour.duracionHoras,
      puntoEncuentro: tour.puntoEncuentro || '',
      idioma: tour.idioma || 'Español',
      incluido: tour.incluido || '',
      noIncluido: tour.noIncluido || '',
      horasAnticipacion: tour.horasAnticipacion ?? 9,
      tipoBono: tour.tipoBono || 'Electrónico, llévalo en tu teléfono',
      accesibilidad: tour.accesibilidad || '',
      sostenibilidad: tour.sostenibilidad || '',
      indicaciones: tour.indicaciones || '',
      precioMenor: tour.precioMenor || 0,
      edadGratis: tour.edadGratis ?? 4,
      activo: tour.activo,
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
    if (
      !this.formulario.idCategoria ||
      !this.formulario.nombre.trim() ||
      !this.formulario.descripcion.trim() ||
      !this.formulario.fechaTour ||
      this.formulario.cupoTotal <= 0 ||
      this.formulario.precio <= 0 ||
      this.formulario.duracionHoras <= 0 ||
      this.formulario.precioMenor < 0 ||
      this.formulario.edadGratis < 0 ||
      this.formulario.horasAnticipacion < 0
    ) {
      this.error.set('Completa correctamente todos los campos obligatorios');
      return;
    }

    this.guardando.set(true);
    this.error.set('');
    this.mensaje.set('');

    const peticion = this.editandoId
      ? this.adminService.actualizarTour(this.editandoId, this.formulario)
      : this.adminService.crearTour(this.formulario);

    peticion.subscribe({
      next: (respuesta) => {
        this.guardando.set(false);
        this.mensaje.set(respuesta.mensaje);
        this.mostrarFormulario = false;
        this.editandoId = null;
        this.cargarTodo();
      },
      error: (error) => {
        this.guardando.set(false);
        this.error.set(this.adminService.mensajeError(error, 'No se pudo guardar el tour'));
      },
    });
  }

  protected desactivar(tour: TourAdmin): void {
    if (!window.confirm(`¿Desactivar el tour "${tour.nombre}"?`)) {
      return;
    }

    this.procesandoId.set(tour.idTour);
    this.error.set('');
    this.mensaje.set('');

    this.adminService.eliminarTour(tour.idTour).subscribe({
      next: (respuesta) => {
        this.procesandoId.set(0);
        this.mensaje.set(respuesta.mensaje);
        this.cargarTodo();
      },
      error: (error) => {
        this.procesandoId.set(0);
        this.error.set(this.adminService.mensajeError(error, 'No se pudo desactivar el tour'));
      },
    });
  }

  protected obtenerImagen(tour: TourAdmin): string {
    const ruta = String(tour.imagen || tour.image || '').trim();

    if (!ruta) {
      return '/guayaquilcompleto.jpg';
    }

    if (ruta.startsWith('http://') || ruta.startsWith('https://') || ruta.startsWith('/')) {
      return ruta;
    }

    return buildUploadUrl(`/${ruta}`);
  }

  protected activar(tour: TourAdmin): void {
    if (!window.confirm(`¿Activar el tour "${tour.nombre}"?`)) {
      return;
    }

    this.procesandoId.set(tour.idTour);
    this.error.set('');
    this.mensaje.set('');

    this.adminService.activarTour(tour.idTour).subscribe({
      next: (respuesta) => {
        this.procesandoId.set(0);
        this.mensaje.set(respuesta.mensaje);
        this.cargarTodo();
      },
      error: (error) => {
        this.procesandoId.set(0);
        this.error.set(this.adminService.mensajeError(error, 'No se pudo activar el tour'));
      },
    });
  }

  private formularioVacio(): FormularioTour {
    return {
      idCategoria: null,
      nombre: '',
      descripcion: '',
      fechaTour: '',
      cupoTotal: 20,
      precio: 10,
      imagen: '',
      duracionHoras: 2,
      puntoEncuentro: '',
      idioma: 'Español',
      incluido: 'Guía durante el recorrido\nEntrada a los lugares indicados',
      noIncluido: 'Alimentación\nGastos personales',
      horasAnticipacion: 9,
      tipoBono: 'Electrónico, llévalo en tu teléfono',
      accesibilidad: 'Consulta previamente si necesitas asistencia de movilidad',
      sostenibilidad: 'Actividad realizada respetando los espacios turísticos y culturales',
      indicaciones: 'Lleva ropa cómoda, agua y protección solar',
      precioMenor: 0,
      edadGratis: 4,
      activo: true,
    };
  }
}

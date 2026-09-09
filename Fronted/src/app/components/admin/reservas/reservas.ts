import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, ReservaAdmin, TourAdmin, UsuarioAdmin } from '../../../services/admin';

interface FormReserva {
  idUsuario: number | null;
  idTour: number | null;
  fechaTour: string;
  cantidadPersonas: number;
  estado: 'Pendiente' | 'Confirmada' | 'Cancelada';
}

@Component({
  selector: 'app-reservas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservas.html',
  styleUrls: ['./reservas.css'],
})
export class ReservasAdmin implements OnInit {
  private readonly adminService = inject(AdminService);

  protected readonly reservas = signal<ReservaAdmin[]>([]);
  protected readonly usuarios = signal<UsuarioAdmin[]>([]);
  protected readonly tours = signal<TourAdmin[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly mensaje = signal('');

  protected mostrarFormulario = false;
  protected editandoId: number | null = null;
  protected formulario: FormReserva = this.vacio();

  ngOnInit(): void {
    this.cargarTodo();
  }

  protected cargarTodo(): void {
    this.cargando.set(true);

    this.adminService.listarUsuarios().subscribe({
      next: (respuesta) => {
        this.usuarios.set(respuesta.usuarios || []);
      },
    });

    this.adminService.listarTours().subscribe({
      next: (respuesta) => {
        this.tours.set(respuesta.tours || []);
      },
    });

    this.cargarReservas();
  }

  protected cargarReservas(): void {
    this.adminService.listarReservas().subscribe({
      next: (respuesta) => {
        this.reservas.set(respuesta.reservas || []);
        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);
        this.error.set(this.adminService.mensajeError(error, 'No se pudieron cargar las reservas'));
      },
    });
  }

  protected nueva(): void {
    this.editandoId = null;
    this.formulario = this.vacio();
    this.mostrarFormulario = true;
  }

  protected editar(reserva: ReservaAdmin): void {
    this.editandoId = reserva.id_reserva;
    this.formulario = {
      idUsuario: reserva.id_usuario,
      idTour: reserva.id_tour,
      fechaTour: String(reserva.fecha_tour).substring(0, 10),
      cantidadPersonas: reserva.cantidad_personas,
      estado: reserva.estado,
    };
    this.mostrarFormulario = true;
  }

  protected guardar(): void {
    if (
      !this.formulario.idUsuario ||
      !this.formulario.idTour ||
      !this.formulario.fechaTour ||
      this.formulario.cantidadPersonas < 1
    ) {
      this.error.set('Completa todos los campos');
      return;
    }

    const peticion = this.editandoId
      ? this.adminService.actualizarReserva(this.editandoId, this.formulario)
      : this.adminService.crearReserva(this.formulario);

    peticion.subscribe({
      next: (respuesta) => {
        this.mensaje.set(respuesta.mensaje);
        this.mostrarFormulario = false;
        this.cargarReservas();
      },
      error: (error) => {
        this.error.set(this.adminService.mensajeError(error, 'No se pudo guardar la reserva'));
      },
    });
  }

  protected eliminar(reserva: ReservaAdmin): void {
    if (!window.confirm(`¿Cancelar la reserva #${reserva.id_reserva}?`)) {
      return;
    }

    this.adminService.eliminarReserva(reserva.id_reserva).subscribe({
      next: (respuesta) => {
        this.mensaje.set(respuesta.mensaje);
        this.cargarReservas();
      },
      error: (error) => {
        this.error.set(this.adminService.mensajeError(error, 'No se pudo cancelar la reserva'));
      },
    });
  }

  protected cancelarFormulario(): void {
    this.mostrarFormulario = false;
    this.editandoId = null;
  }

  private vacio(): FormReserva {
    return {
      idUsuario: null,
      idTour: null,
      fechaTour: '',
      cantidadPersonas: 1,
      estado: 'Pendiente',
    };
  }
}

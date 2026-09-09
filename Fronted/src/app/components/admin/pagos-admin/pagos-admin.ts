import { CommonModule } from '@angular/common';

import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { PagoGuardado, PagoService } from '../../../services/pago';

@Component({
  selector: 'app-pagos-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagos-admin.html',
  styleUrls: ['./pagos-admin.css'],
})
export class PagosAdmin implements OnInit {
  private readonly pagoService = inject(PagoService);

  protected readonly pagos = signal<PagoGuardado[]>([]);

  protected readonly cargando = signal(true);

  protected readonly procesandoId = signal(0);

  protected readonly error = signal('');

  protected readonly mensaje = signal('');

  protected readonly filtro = signal<'todos' | 'pendiente' | 'pagado' | 'rechazado'>('pendiente');

  protected readonly pagosFiltrados = computed(() => {
    const filtro = this.filtro();

    if (filtro === 'todos') {
      return this.pagos();
    }

    return this.pagos().filter((pago) => pago.estado_pago === filtro);
  });

  protected readonly pendientes = computed(() => {
    return this.pagos().filter((pago) => pago.estado_pago === 'pendiente').length;
  });

  protected readonly pagados = computed(() => {
    return this.pagos().filter((pago) => pago.estado_pago === 'pagado').length;
  });

  protected readonly rechazados = computed(() => {
    return this.pagos().filter((pago) => pago.estado_pago === 'rechazado').length;
  });

  ngOnInit(): void {
    this.cargarPagos();
  }

  protected cargarPagos(): void {
    this.cargando.set(true);
    this.error.set('');

    this.pagoService.listarPagosAdmin().subscribe({
      next: (respuesta) => {
        this.pagos.set(respuesta.pagos || []);

        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);

        this.error.set(
          this.pagoService.obtenerMensajeError(error, 'No se pudieron cargar los pagos'),
        );
      },
    });
  }

  protected cambiarFiltro(event: Event): void {
    const select = event.target as HTMLSelectElement;

    const valor = select.value as 'todos' | 'pendiente' | 'pagado' | 'rechazado';

    this.filtro.set(valor);
  }

  protected aprobar(pago: PagoGuardado): void {
    if (pago.estado_pago === 'pagado') {
      return;
    }

    const confirmar = window.confirm(
      `¿Aprobar el pago #${pago.id_pago} y confirmar la reserva #${pago.id_reserva}?`,
    );

    if (!confirmar) {
      return;
    }

    this.procesandoId.set(pago.id_pago);

    this.error.set('');
    this.mensaje.set('');

    this.pagoService.aprobarPago(pago.id_pago).subscribe({
      next: (respuesta) => {
        this.procesandoId.set(0);
        this.mensaje.set(respuesta.mensaje);

        this.cargarPagos();
      },
      error: (error) => {
        this.procesandoId.set(0);

        this.error.set(this.pagoService.obtenerMensajeError(error, 'No se pudo aprobar el pago'));
      },
    });
  }

  protected rechazar(pago: PagoGuardado): void {
    if (pago.estado_pago === 'pagado') {
      return;
    }

    const confirmar = window.confirm(`¿Rechazar el pago #${pago.id_pago}?`);

    if (!confirmar) {
      return;
    }

    this.procesandoId.set(pago.id_pago);

    this.error.set('');
    this.mensaje.set('');

    this.pagoService.rechazarPago(pago.id_pago).subscribe({
      next: (respuesta) => {
        this.procesandoId.set(0);
        this.mensaje.set(respuesta.mensaje);

        this.cargarPagos();
      },
      error: (error) => {
        this.procesandoId.set(0);

        this.error.set(this.pagoService.obtenerMensajeError(error, 'No se pudo rechazar el pago'));
      },
    });
  }
  protected reembolsar(pago: PagoGuardado): void {
    const confirmar = window.confirm(
      `¿Reembolsar el pago #${pago.id_pago}? La reserva quedará cancelada.`,
    );

    if (!confirmar) {
      return;
    }

    this.procesandoId.set(pago.id_pago);

    this.error.set('');
    this.mensaje.set('');

    this.pagoService.reembolsarPago(pago.id_pago).subscribe({
      next: (respuesta) => {
        this.procesandoId.set(0);

        this.mensaje.set(respuesta.mensaje);

        this.cargarPagos();
      },

      error: (error) => {
        this.procesandoId.set(0);

        this.error.set(
          this.pagoService.obtenerMensajeError(error, 'No se pudo reembolsar el pago'),
        );
      },
    });
  }
}

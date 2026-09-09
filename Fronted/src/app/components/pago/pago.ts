import { CommonModule } from '@angular/common';

import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MetodoPago, PagoGuardado, PagoService, ReservaParaPago } from '../../services/pago';

@Component({
  selector: 'app-pago',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pago.html',
  styleUrls: ['./pago.css'],
})
export class Pago implements OnInit {
  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly pagoService = inject(PagoService);

  protected readonly reserva = signal<ReservaParaPago | null>(null);

  protected readonly pago = signal<PagoGuardado | null>(null);

  protected readonly metodoPago = signal<MetodoPago>('tarjeta');

  protected readonly cargando = signal(true);

  protected readonly procesando = signal(false);

  protected readonly error = signal('');

  protected readonly mensaje = signal('');

  protected readonly idReserva = signal(0);

  protected readonly nombreTour = computed(() => {
    const actual = this.reserva();

    return String(actual?.nombreTour || actual?.nombre_tour || actual?.tour || 'Tour reservado');
  });

  protected readonly fechaTour = computed(() => {
    const actual = this.reserva();

    return String(actual?.fechaTour || actual?.fecha_tour || actual?.fecha || '').substring(0, 10);
  });

  protected readonly personas = computed(() => {
    const actual = this.reserva();

    return Number(actual?.cantidadPersonas || actual?.cantidad_personas || actual?.personas || 0);
  });

  protected readonly monto = computed(() => {
    const actual = this.reserva();

    return Number(actual?.precioTotal || actual?.precio_total || 0);
  });

  protected readonly reservaCancelada = computed(() => {
    return String(this.reserva()?.estado || '').toLowerCase() === 'cancelada';
  });

  protected readonly pagoPendiente = computed(() => {
    return this.pago()?.estado_pago === 'pendiente';
  });

  protected readonly pagoAprobado = computed(() => {
    return this.pago()?.estado_pago === 'pagado';
  });

  protected readonly pagoRechazado = computed(() => {
    return this.pago()?.estado_pago === 'rechazado';
  });

  protected readonly mostrarFormulario = computed(() => {
    return !this.pago() || this.pagoRechazado();
  });

  protected readonly puedePagar = computed(() => {
    return (
      this.reserva() !== null &&
      this.monto() > 0 &&
      !this.reservaCancelada() &&
      this.mostrarFormulario() &&
      !this.procesando()
    );
  });

  ngOnInit(): void {
    const idReserva = Number(this.route.snapshot.paramMap.get('idReserva'));

    if (!Number.isInteger(idReserva) || idReserva <= 0) {
      this.cargando.set(false);

      this.error.set('El identificador de la reserva no es válido');

      return;
    }

    this.idReserva.set(idReserva);
    this.cargarReserva(idReserva);
  }

  private cargarReserva(idReserva: number): void {
    this.cargando.set(true);
    this.error.set('');

    this.pagoService.obtenerReserva(idReserva).subscribe({
      next: (respuesta) => {
        this.reserva.set(respuesta.reserva);

        this.cargando.set(false);
        this.consultarPagoExistente(idReserva);
      },
      error: (error) => {
        this.cargando.set(false);

        this.error.set(this.pagoService.obtenerMensajeError(error, 'No se pudo cargar la reserva'));
      },
    });
  }

  private consultarPagoExistente(idReserva: number): void {
    this.pagoService.obtenerPagoReserva(idReserva).subscribe({
      next: (respuesta) => {
        this.pago.set(respuesta.pago);

        if (respuesta.pago.estado_pago === 'pendiente') {
          this.mensaje.set('Tu pago está pendiente de revisión del administrador');
        }

        if (respuesta.pago.estado_pago === 'pagado') {
          this.mensaje.set('El administrador aprobó el pago y confirmó la reserva');
        }

        if (respuesta.pago.estado_pago === 'rechazado') {
          this.error.set('El pago fue rechazado, puedes volver a enviarlo');
        }
      },
      error: (error) => {
        if (error?.status !== 404) {
          this.error.set(
            this.pagoService.obtenerMensajeError(error, 'No se pudo consultar el pago'),
          );
        }
      },
    });
  }

  protected cambiarMetodo(event: Event): void {
    const select = event.target as HTMLSelectElement;

    const valor = select.value as MetodoPago;

    const permitidos: MetodoPago[] = ['tarjeta', 'transferencia', 'efectivo'];

    if (permitidos.includes(valor)) {
      this.metodoPago.set(valor);
    }

    this.error.set('');
  }

  protected confirmarPago(): void {
    if (!this.puedePagar()) {
      return;
    }

    const confirmar = window.confirm(
      `¿Enviar el pago de $${this.monto().toFixed(2)} para revisión?`,
    );

    if (!confirmar) {
      return;
    }

    this.procesando.set(true);
    this.error.set('');
    this.mensaje.set('');

    this.pagoService.registrarPago(this.idReserva(), this.metodoPago()).subscribe({
      next: (respuesta) => {
        this.procesando.set(false);

        this.pago.set(respuesta.pago);

        this.mensaje.set(respuesta.mensaje || 'Pago enviado para revisión');
      },
      error: (error) => {
        this.procesando.set(false);

        this.error.set(this.pagoService.obtenerMensajeError(error, 'No se pudo registrar el pago'));
      },
    });
  }

  protected volverReservas(): void {
    this.router.navigate(['/mis-reservas']);
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AdminService,
  DashboardAdmin,
  ActividadRecienteAdmin,
  ClienteFrecuenteAdmin,
  TourBajoRendimientoAdmin,
  ProximoTourAdmin,
} from '../../../services/admin';

const PALETA_AVATAR = ['#0d6efd', '#7d5ce8', '#168653', '#dc8b12', '#d92d3f', '#0aa39e'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit {
  private readonly adminService = inject(AdminService);

  protected readonly datos = signal<DashboardAdmin | null>(null);
  protected readonly ultimas = signal<any[]>([]);
  protected readonly actividadReciente = signal<ActividadRecienteAdmin[]>([]);
  protected readonly clientesFrecuentes = signal<ClienteFrecuenteAdmin[]>([]);
  protected readonly toursBajoRendimiento = signal<TourBajoRendimientoAdmin[]>([]);
  protected readonly proximosTours = signal<ProximoTourAdmin[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');

  protected readonly errorActividad = signal('');
  protected readonly errorClientes = signal('');
  protected readonly errorBajoRendimiento = signal('');
  protected readonly errorProximos = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.adminService.obtenerDashboard().subscribe({
      next: (respuesta) => {
        this.datos.set(respuesta.dashboard);
        this.ultimas.set(respuesta.ultimasReservas || []);
        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);
        this.error.set(this.adminService.mensajeError(error, 'No se pudo cargar el dashboard'));
      },
    });

    this.adminService.obtenerActividadReciente().subscribe({
      next: (r) => this.actividadReciente.set(r.actividadReciente || []),
      error: (err) => {
        console.error('Error cargando actividad reciente:', err);
        this.errorActividad.set(
          this.adminService.mensajeError(err, 'No se pudo cargar la actividad reciente'),
        );
      },
    });

    this.adminService.obtenerClientesFrecuentes().subscribe({
      next: (r) => this.clientesFrecuentes.set(r.clientesFrecuentes || []),
      error: (err) => {
        console.error('Error cargando clientes frecuentes:', err);
        this.errorClientes.set(
          this.adminService.mensajeError(err, 'No se pudo cargar los clientes frecuentes'),
        );
      },
    });

    this.adminService.obtenerToursBajoRendimiento().subscribe({
      next: (r) => this.toursBajoRendimiento.set(r.toursBajoRendimiento || []),
      error: (err) => {
        console.error('Error cargando tours con bajo rendimiento:', err);
        this.errorBajoRendimiento.set(
          this.adminService.mensajeError(err, 'No se pudo cargar los tours con bajo rendimiento'),
        );
      },
    });

    this.adminService.obtenerProximosTours().subscribe({
      next: (r) => this.proximosTours.set(r.proximosTours || []),
      error: (err) => {
        console.error('Error cargando próximos tours:', err);
        this.errorProximos.set(
          this.adminService.mensajeError(err, 'No se pudo cargar los próximos tours'),
        );
      },
    });
  }

  protected etiquetaTipo(tipo: string): string {
    if (tipo === 'pago') return 'Pago';
    if (tipo === 'reserva') return 'Reserva';
    return 'Usuario';
  }

  protected colorTipo(tipo: string): string {
    if (tipo === 'pago') return '#168653';
    if (tipo === 'reserva') return '#0d6efd';
    return '#7d5ce8';
  }

  protected claseEstado(estado: string | null): string {
    const e = (estado || '').toLowerCase();
    if (['confirmada', 'pagado', 'reactivado'].includes(e)) return 'badge-success';
    if (['cancelada', 'rechazado', 'desactivado'].includes(e)) return 'badge-danger';
    if (e === 'pendiente') return 'badge-warning';
    if (e === 'reembolsado') return 'badge-purple';
    return 'badge-neutral';
  }

  protected tiempoRelativo(fecha: string): string {
    const diffMs = Date.now() - new Date(fecha).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'justo ahora';
    if (diffMin < 60) return `hace ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `hace ${diffH} h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 30) return `hace ${diffD} d`;
    return new Date(fecha).toLocaleDateString('es-EC');
  }

  protected inicialesCliente(nombre: string): string {
    const partes = (nombre || '?').trim().split(/\s+/);
    return (
      partes
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('') || '?'
    );
  }

  protected colorAvatar(nombre: string): string {
    let hash = 0;
    for (const char of nombre || '') {
      hash = char.charCodeAt(0) + ((hash << 5) - hash);
    }
    return PALETA_AVATAR[Math.abs(hash) % PALETA_AVATAR.length];
  }

  protected maxReservasCliente(): number {
    const lista = this.clientesFrecuentes();
    return lista.length ? Math.max(...lista.map((c) => c.total_reservas), 1) : 1;
  }

  protected diasHasta(fecha: string): string {
    const dias = Math.round(
      (new Date(fecha).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000,
    );
    if (dias <= 0) return 'Hoy';
    if (dias === 1) return 'Mañana';
    return `En ${dias} días`;
  }
}

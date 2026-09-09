import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, ReporteAdmin } from '../../../services/admin';

function fechaLocal(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

@Component({
  selector: 'app-reportes-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.css'],
})
export class ReportesAdmin implements OnInit {
  private readonly adminService = inject(AdminService);

  private readonly fechaActual = new Date();
  private readonly inicioAnio = new Date(this.fechaActual.getFullYear(), 0, 1);

  protected readonly fechaDesde = signal(fechaLocal(this.inicioAnio));

  protected readonly fechaHasta = signal(fechaLocal(this.fechaActual));

  protected readonly reporte = signal<ReporteAdmin | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly actualizadoEn = signal<Date | null>(null);

  protected readonly maximoIngresoMensual = computed(() => {
    const meses = this.reporte()?.ingresosPorMes || [];

    return meses.reduce((maximo, mes) => Math.max(maximo, Number(mes.ingresos || 0)), 0);
  });

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.error.set('');

    if (!this.fechaDesde() || !this.fechaHasta()) {
      this.error.set('Selecciona la fecha inicial y la fecha final');
      return;
    }

    if (this.fechaDesde() > this.fechaHasta()) {
      this.error.set('La fecha inicial no puede ser mayor que la fecha final');
      return;
    }

    this.cargando.set(true);

    this.adminService.obtenerReportes(this.fechaDesde(), this.fechaHasta()).subscribe({
      next: (respuesta) => {
        this.reporte.set({
          periodo: respuesta.periodo,
          resumen: respuesta.resumen,
          reservasPorEstado: respuesta.reservasPorEstado,
          pagosPorEstado: respuesta.pagosPorEstado,
          ingresosPorMes: respuesta.ingresosPorMes || [],
          toursMasReservados: respuesta.toursMasReservados || [],
        });

        this.actualizadoEn.set(new Date());
        this.cargando.set(false);
      },
      error: (error) => {
        this.cargando.set(false);
        this.error.set(
          this.adminService.mensajeError(error, 'No se pudo cargar la sección de reportes'),
        );
      },
    });
  }

  protected restablecerPeriodo(): void {
    this.fechaDesde.set(fechaLocal(this.inicioAnio));
    this.fechaHasta.set(fechaLocal(this.fechaActual));
    this.cargar();
  }

  protected porcentaje(valor: number, total: number): number {
    if (!total) return 0;

    return Math.min(100, Math.max(0, Math.round((Number(valor) / Number(total)) * 100)));
  }

  protected alturaIngreso(valor: number): number {
    const maximo = this.maximoIngresoMensual();
    const ingreso = Number(valor || 0);

    if (!maximo || !ingreso) return 0;

    return Math.max(8, Math.round((ingreso / maximo) * 100));
  }

  protected fechaPresentacion(valor: string): string {
    const [anio, mes, dia] = valor.split('-');

    if (!anio || !mes || !dia) return valor;

    return `${dia}/${mes}/${anio}`;
  }

  protected nombreMes(periodo: string): string {
    const [anio, mes] = periodo.split('-').map(Number);

    if (!anio || !mes) return periodo;

    const texto = new Intl.DateTimeFormat('es-EC', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(anio, mes - 1, 1)));

    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  protected exportarCsv(): void {
    const datos = this.reporte();

    if (!datos || typeof window === 'undefined') return;

    const filas: Array<Array<string | number>> = [
      ['REPORTE ADMINISTRATIVO SITG'],
      ['Desde', this.fechaDesde()],
      ['Hasta', this.fechaHasta()],
      [],
      ['RESUMEN GENERAL'],
      ['Indicador', 'Valor'],
      ['Usuarios registrados', datos.resumen.usuarios_registrados],
      ['Usuarios activos', datos.resumen.usuarios_activos],
      ['Tours activos', datos.resumen.tours_activos],
      ['Total de reservas', datos.resumen.total_reservas],
      ['Reservas confirmadas', datos.resumen.reservas_confirmadas],
      ['Pagos aprobados', datos.resumen.pagos_aprobados],
      ['Ingresos aprobados', datos.resumen.ingresos_aprobados.toFixed(2)],
      [],
      ['RESERVAS POR ESTADO'],
      ['Estado', 'Cantidad'],
      ['Pendientes', datos.reservasPorEstado.pendiente],
      ['Confirmadas', datos.reservasPorEstado.confirmada],
      ['Canceladas', datos.reservasPorEstado.cancelada],
      [],
      ['PAGOS POR ESTADO'],
      ['Estado', 'Cantidad'],
      ['Pendientes', datos.pagosPorEstado.pendiente],
      ['Aprobados', datos.pagosPorEstado.pagado],
      ['Rechazados', datos.pagosPorEstado.rechazado],
      ['Reembolsados', datos.pagosPorEstado.reembolsado],
      [],
      ['INGRESOS POR MES'],
      ['Mes', 'Pagos aprobados', 'Ingresos'],
      ...datos.ingresosPorMes.map((mes) => [
        this.nombreMes(mes.periodo),
        mes.pagos,
        Number(mes.ingresos).toFixed(2),
      ]),
      [],
      ['TOURS MÁS RESERVADOS'],
      ['Posición', 'Tour', 'Reservas', 'Personas', 'Ingresos'],
      ...datos.toursMasReservados.map((tour, indice) => [
        indice + 1,
        tour.nombre,
        tour.total_reservas,
        tour.total_personas,
        Number(tour.ingresos).toFixed(2),
      ]),
    ];

    const contenido = filas
      .map((fila) => fila.map((valor) => this.celdaCsv(valor)).join(';'))
      .join('\r\n');

    const archivo = new Blob([`\ufeff${contenido}`], { type: 'text/csv;charset=utf-8;' });

    const enlace = document.createElement('a');
    const url = URL.createObjectURL(archivo);

    enlace.href = url;
    enlace.download = `reporte-sitg-${this.fechaDesde()}-${this.fechaHasta()}.csv`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(url);
  }

  protected guardarPdf(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const tituloAnterior = document.title;

    const elementosOcultos = Array.from(
      document.querySelectorAll<HTMLElement>(
        ['app-navbar-admin', '.admin-sidebar', '.sidebar-toggle', '.sidebar-overlay'].join(','),
      ),
    );

    const hostReporte = document.querySelector<HTMLElement>('app-reportes-admin');

    const elementosAjustados: HTMLElement[] = [];

    if (hostReporte) {
      let elemento: HTMLElement | null = hostReporte;

      while (elemento && elemento !== document.body) {
        elementosAjustados.push(elemento);
        elemento = elemento.parentElement;
      }
    }

    const estilosOriginales = new Map<HTMLElement, string | null>();

    const guardarEstilo = (elemento: HTMLElement): void => {
      if (!estilosOriginales.has(elemento)) {
        estilosOriginales.set(elemento, elemento.getAttribute('style'));
      }
    };

    elementosOcultos.forEach((elemento) => {
      guardarEstilo(elemento);

      elemento.style.setProperty('display', 'none', 'important');
    });

    elementosAjustados.forEach((elemento) => {
      guardarEstilo(elemento);

      elemento.style.setProperty('width', '100%', 'important');

      elemento.style.setProperty('max-width', 'none', 'important');

      elemento.style.setProperty('min-width', '0', 'important');

      elemento.style.setProperty('margin-left', '0', 'important');

      elemento.style.setProperty('padding-left', '0', 'important');

      elemento.style.setProperty('transform', 'none', 'important');

      elemento.style.setProperty('overflow', 'visible', 'important');
    });

    guardarEstilo(document.body);

    document.body.style.setProperty('margin', '0', 'important');

    document.body.style.setProperty('width', '100%', 'important');

    document.body.style.setProperty('overflow', 'visible', 'important');

    document.body.classList.add('generando-pdf-reportes');

    document.title = `Reporte SITG ${this.fechaDesde()} a ${this.fechaHasta()}`;

    let restaurado = false;

    const restaurarPagina = (): void => {
      if (restaurado) return;

      restaurado = true;

      estilosOriginales.forEach((estiloOriginal, elemento) => {
        if (estiloOriginal === null) {
          elemento.removeAttribute('style');
        } else {
          elemento.setAttribute('style', estiloOriginal);
        }
      });

      document.body.classList.remove('generando-pdf-reportes');

      document.title = tituloAnterior;

      window.removeEventListener('afterprint', restaurarPagina);
    };

    window.addEventListener('afterprint', restaurarPagina, { once: true });

    /*
      Se espera un instante para que Chrome aplique
      los estilos antes de construir la vista previa.
    */
    window.setTimeout(() => {
      window.print();

      /*
        Respaldo para navegadores que no disparan
        correctamente el evento afterprint.
      */
      window.setTimeout(restaurarPagina, 500);
    }, 100);
  }

  private celdaCsv(valor: string | number): string {
    let texto = String(valor ?? '');

    if (/^[=+\-@]/.test(texto)) {
      texto = `'${texto}`;
    }

    return `"${texto.replace(/"/g, '""')}"`;
  }
}

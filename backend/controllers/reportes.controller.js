import { pool } from "../config/db.js";

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function fechaValida(valor) {
  if (!valor) return true;

  if (!FECHA_REGEX.test(valor)) {
    return false;
  }

  const fecha = new Date(`${valor}T00:00:00Z`);

  return (
    !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
  );
}

function numero(valor) {
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : 0;
}

function entero(valor) {
  return Math.trunc(numero(valor));
}

function mapaEstados(filas, estados) {
  const resultado = Object.fromEntries(estados.map((estado) => [estado, 0]));

  for (const fila of filas) {
    const estado = String(fila.estado || "").toLowerCase();

    if (Object.prototype.hasOwnProperty.call(resultado, estado)) {
      resultado[estado] = entero(fila.cantidad);
    }
  }

  resultado.total = Object.values(resultado).reduce(
    (total, cantidad) => total + numero(cantidad),
    0,
  );

  return resultado;
}

function errorServidor(res, error) {
  console.error("No se pudo generar el reporte administrativo:", error);

  return res.status(500).json({
    ok: false,
    mensaje: "No se pudo generar el reporte",
    detalle: error.message,
  });
}

export async function obtenerReportesAdmin(req, res) {
  const desde = String(req.query.desde || "").trim() || null;
  const hasta = String(req.query.hasta || "").trim() || null;

  if (!fechaValida(desde) || !fechaValida(hasta)) {
    return res.status(400).json({
      ok: false,
      mensaje: "Las fechas deben tener el formato AAAA-MM-DD",
    });
  }

  if (desde && hasta && desde > hasta) {
    return res.status(400).json({
      ok: false,
      mensaje: "La fecha inicial no puede ser mayor que la fecha final",
    });
  }

  const parametros = [desde, hasta];

  try {
    const [
      resumenResultado,
      reservasEstadoResultado,
      pagosEstadoResultado,
      ingresosMesResultado,
      toursResultado,
    ] = await Promise.all([
      pool.query(
        `
          SELECT
            (SELECT COUNT(*)::integer FROM public.usuario)
              AS usuarios_registrados,
            (
              SELECT COUNT(*)::integer
              FROM public.usuario
              WHERE activo = true
            ) AS usuarios_activos,
            (
              SELECT COUNT(*)::integer
              FROM public.tour
              WHERE activo = true
            ) AS tours_activos,
            (
              SELECT COUNT(*)::integer
              FROM public.reserva r
              WHERE ($1::date IS NULL OR r.fecha_creacion >= $1::date)
                AND (
                  $2::date IS NULL OR
                  r.fecha_creacion < ($2::date + INTERVAL '1 day')
                )
            ) AS total_reservas,
            (
              SELECT COUNT(*)::integer
              FROM public.reserva r
              WHERE LOWER(r.estado) = 'confirmada'
                AND ($1::date IS NULL OR r.fecha_creacion >= $1::date)
                AND (
                  $2::date IS NULL OR
                  r.fecha_creacion < ($2::date + INTERVAL '1 day')
                )
            ) AS reservas_confirmadas,
            (
              SELECT COUNT(*)::integer
              FROM public.pago p
              WHERE LOWER(p.estado_pago) = 'pagado'
                AND ($1::date IS NULL OR p.fecha_pago >= $1::date)
                AND (
                  $2::date IS NULL OR
                  p.fecha_pago < ($2::date + INTERVAL '1 day')
                )
            ) AS pagos_aprobados,
            (
              SELECT COALESCE(SUM(p.monto), 0)
              FROM public.pago p
              WHERE LOWER(p.estado_pago) = 'pagado'
                AND ($1::date IS NULL OR p.fecha_pago >= $1::date)
                AND (
                  $2::date IS NULL OR
                  p.fecha_pago < ($2::date + INTERVAL '1 day')
                )
            ) AS ingresos_aprobados
        `,
        parametros,
      ),

      pool.query(
        `
          SELECT
            LOWER(r.estado) AS estado,
            COUNT(*)::integer AS cantidad
          FROM public.reserva r
          WHERE ($1::date IS NULL OR r.fecha_creacion >= $1::date)
            AND (
              $2::date IS NULL OR
              r.fecha_creacion < ($2::date + INTERVAL '1 day')
            )
          GROUP BY LOWER(r.estado)
        `,
        parametros,
      ),

      pool.query(
        `
          SELECT
            LOWER(p.estado_pago) AS estado,
            COUNT(*)::integer AS cantidad
          FROM public.pago p
          WHERE ($1::date IS NULL OR p.fecha_pago >= $1::date)
            AND (
              $2::date IS NULL OR
              p.fecha_pago < ($2::date + INTERVAL '1 day')
            )
          GROUP BY LOWER(p.estado_pago)
        `,
        parametros,
      ),

      pool.query(
        `
          WITH limites AS (
            SELECT
              DATE_TRUNC(
                'month',
                COALESCE($1::date, CURRENT_DATE - INTERVAL '11 months')
              ) AS inicio,
              DATE_TRUNC(
                'month',
                COALESCE($2::date, CURRENT_DATE)
              ) AS fin
          ),
          meses AS (
            SELECT GENERATE_SERIES(
              inicio,
              fin,
              INTERVAL '1 month'
            ) AS mes
            FROM limites
          )
          SELECT
            TO_CHAR(m.mes, 'YYYY-MM') AS periodo,
            COALESCE(SUM(p.monto), 0) AS ingresos,
            COUNT(p.id_pago)::integer AS pagos
          FROM meses m
          LEFT JOIN public.pago p
            ON DATE_TRUNC('month', p.fecha_pago) = m.mes
            AND LOWER(p.estado_pago) = 'pagado'
          GROUP BY m.mes
          ORDER BY m.mes ASC
        `,
        parametros,
      ),

      pool.query(
        `
          WITH reservas_periodo AS (
            SELECT
              r.id_reserva,
              r.id_tour,
              r.cantidad_personas
            FROM public.reserva r
            WHERE ($1::date IS NULL OR r.fecha_creacion >= $1::date)
              AND (
                $2::date IS NULL OR
                r.fecha_creacion < ($2::date + INTERVAL '1 day')
              )
          ),
          pagos_por_reserva AS (
            SELECT
              p.id_reserva,
              COALESCE(
                SUM(
                  CASE
                    WHEN LOWER(p.estado_pago) = 'pagado'
                      THEN p.monto
                    ELSE 0
                  END
                ),
                0
              ) AS ingresos
            FROM public.pago p
            GROUP BY p.id_reserva
          )
          SELECT
            t.id_tour,
            t.nombre,
            COUNT(rp.id_reserva)::integer AS total_reservas,
            COALESCE(SUM(rp.cantidad_personas), 0)::integer
              AS total_personas,
            COALESCE(SUM(pr.ingresos), 0) AS ingresos
          FROM public.tour t
          INNER JOIN reservas_periodo rp
            ON rp.id_tour = t.id_tour
          LEFT JOIN pagos_por_reserva pr
            ON pr.id_reserva = rp.id_reserva
          GROUP BY t.id_tour, t.nombre
          ORDER BY
            total_reservas DESC,
            total_personas DESC,
            t.nombre ASC
          LIMIT 10
        `,
        parametros,
      ),
    ]);

    const resumenFila = resumenResultado.rows[0] || {};

    return res.status(200).json({
      ok: true,
      periodo: {
        desde,
        hasta,
      },
      resumen: {
        usuarios_registrados: entero(resumenFila.usuarios_registrados),
        usuarios_activos: entero(resumenFila.usuarios_activos),
        tours_activos: entero(resumenFila.tours_activos),
        total_reservas: entero(resumenFila.total_reservas),
        reservas_confirmadas: entero(resumenFila.reservas_confirmadas),
        pagos_aprobados: entero(resumenFila.pagos_aprobados),
        ingresos_aprobados: numero(resumenFila.ingresos_aprobados),
      },
      reservasPorEstado: mapaEstados(reservasEstadoResultado.rows, [
        "pendiente",
        "confirmada",
        "cancelada",
      ]),
      pagosPorEstado: mapaEstados(pagosEstadoResultado.rows, [
        "pendiente",
        "pagado",
        "rechazado",
        "reembolsado",
      ]),
      ingresosPorMes: ingresosMesResultado.rows.map((fila) => ({
        periodo: fila.periodo,
        ingresos: numero(fila.ingresos),
        pagos: entero(fila.pagos),
      })),
      toursMasReservados: toursResultado.rows.map((fila) => ({
        id_tour: entero(fila.id_tour),
        nombre: fila.nombre,
        total_reservas: entero(fila.total_reservas),
        total_personas: entero(fila.total_personas),
        ingresos: numero(fila.ingresos),
      })),
    });
  } catch (error) {
    return errorServidor(res, error);
  }
}

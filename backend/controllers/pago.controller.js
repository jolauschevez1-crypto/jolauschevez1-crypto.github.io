import { pool } from "../config/db.js";

const METODOS_VALIDOS = ["tarjeta", "transferencia", "efectivo"];

function obtenerIdUsuario(req) {
  const valor =
    req.usuario?.idUsuario ??
    req.usuario?.id_usuario ??
    req.usuario?.id ??
    req.usuario?.sub ??
    null;

  const idUsuario = Number(valor);

  return Number.isInteger(idUsuario) && idUsuario > 0 ? idUsuario : null;
}

function normalizarMetodo(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase();
}

function transformarPago(fila) {
  return {
    id_pago: Number(fila.id_pago),
    id_reserva: Number(fila.id_reserva),
    monto: Number(fila.monto || 0),
    fecha_pago: fila.fecha_pago,
    metodo_pago: fila.metodo_pago,
    estado_pago: fila.estado_pago,
    referencia: fila.referencia || null,
    fecha_creacion: fila.fecha_creacion,
    fecha_actualizacion: fila.fecha_actualizacion,

    nombre_tour: fila.nombre_tour || null,
    fecha_tour: fila.fecha_tour || null,
    cantidad_personas:
      fila.cantidad_personas === undefined
        ? null
        : Number(fila.cantidad_personas),
    nombre_usuario: fila.nombre_usuario || null,
    correo_usuario: fila.correo_usuario || null,
  };
}

function responderError(res, error) {
  console.error("Error en pagos:", {
    message: error.message,
    code: error.code,
    detail: error.detail,
    constraint: error.constraint,
  });

  if (error.code === "23505") {
    return res.status(409).json({
      ok: false,
      mensaje: "La reserva ya tiene un pago registrado",
    });
  }

  if (error.code === "23503") {
    return res.status(400).json({
      ok: false,
      mensaje: "La reserva indicada no existe",
    });
  }

  if (error.code === "23514") {
    return res.status(400).json({
      ok: false,
      mensaje: "El método o el estado del pago no es válido",
      detalle: error.detail || "",
    });
  }

  return res.status(500).json({
    ok: false,
    mensaje: "No se pudo completar la operación de pago",
    detalle: error.message,
  });
}

export async function registrarPago(req, res) {
  const idUsuario = obtenerIdUsuario(req);

  const idReserva = Number(req.body.idReserva ?? req.body.id_reserva);

  const metodoPago = normalizarMetodo(
    req.body.metodoPago ?? req.body.metodo_pago,
  );

  if (!idUsuario) {
    return res.status(401).json({
      ok: false,
      mensaje: "Debes iniciar sesión para registrar el pago",
    });
  }

  if (!Number.isInteger(idReserva) || idReserva <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "La reserva no es válida",
    });
  }

  if (!METODOS_VALIDOS.includes(metodoPago)) {
    return res.status(400).json({
      ok: false,
      mensaje: "Selecciona tarjeta, transferencia o efectivo",
    });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultadoReserva = await cliente.query(
      `
          SELECT
            id_reserva,
            id_usuario,
            precio_total,
            estado
          FROM public.reserva
          WHERE id_reserva = $1
            AND id_usuario = $2
          FOR UPDATE
        `,
      [idReserva, idUsuario],
    );

    if (resultadoReserva.rowCount === 0) {
      await cliente.query("ROLLBACK");

      return res.status(404).json({
        ok: false,
        mensaje: "La reserva no existe o no pertenece al usuario",
      });
    }

    const reserva = resultadoReserva.rows[0];

    if (reserva.estado === "Cancelada") {
      await cliente.query("ROLLBACK");

      return res.status(409).json({
        ok: false,
        mensaje: "No puedes pagar una reserva cancelada",
      });
    }

    const monto = Number(reserva.precio_total || 0);

    if (monto <= 0) {
      await cliente.query("ROLLBACK");

      return res.status(400).json({
        ok: false,
        mensaje: "El monto de la reserva no es válido",
      });
    }

    const resultadoExistente = await cliente.query(
      `
          SELECT
            id_pago,
            estado_pago
          FROM public.pago
          WHERE id_reserva = $1
          FOR UPDATE
        `,
      [idReserva],
    );

    const referencia = `PAGO-${Date.now()}-${idReserva}`;

    let resultadoPago;

    if (resultadoExistente.rowCount > 0) {
      const estadoAnterior = resultadoExistente.rows[0].estado_pago;

      if (estadoAnterior === "pendiente" || estadoAnterior === "pagado") {
        await cliente.query("ROLLBACK");

        return res.status(409).json({
          ok: false,
          mensaje:
            estadoAnterior === "pagado"
              ? "El pago ya fue aprobado"
              : "El pago ya está pendiente de revisión",
        });
      }

      resultadoPago = await cliente.query(
        `
            UPDATE public.pago
            SET
              monto = $1,
              fecha_pago =
                CURRENT_DATE,
              metodo_pago = $2,
              estado_pago =
                'pendiente',
              referencia = $3,
              fecha_actualizacion =
                CURRENT_TIMESTAMP
            WHERE id_reserva = $4
            RETURNING *
          `,
        [monto, metodoPago, referencia, idReserva],
      );
    } else {
      resultadoPago = await cliente.query(
        `
            INSERT INTO public.pago (
              id_reserva,
              monto,
              fecha_pago,
              metodo_pago,
              estado_pago,
              referencia,
              fecha_creacion,
              fecha_actualizacion
            )
            VALUES (
              $1,
              $2,
              CURRENT_DATE,
              $3,
              'pendiente',
              $4,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
            )
            RETURNING *
          `,
        [idReserva, monto, metodoPago, referencia],
      );
    }

    await cliente.query(
      `
          UPDATE public.reserva
          SET
            estado = 'Pendiente',
            fecha_actualizacion =
              CURRENT_TIMESTAMP
          WHERE id_reserva = $1
        `,
      [idReserva],
    );

    await cliente.query("COMMIT");

    return res.status(201).json({
      ok: true,
      mensaje: "Pago enviado, está pendiente de revisión del administrador",
      pago: transformarPago(resultadoPago.rows[0]),
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    return responderError(res, error);
  } finally {
    cliente.release();
  }
}

export async function obtenerPagoReserva(req, res) {
  const idUsuario = obtenerIdUsuario(req);

  const idReserva = Number(req.params.idReserva);

  if (!idUsuario) {
    return res.status(401).json({
      ok: false,
      mensaje: "Sesión no válida",
    });
  }

  if (!Number.isInteger(idReserva) || idReserva <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "La reserva no es válida",
    });
  }

  try {
    const resultado = await pool.query(
      `
          SELECT
            p.*,
            r.fecha_tour,
            r.cantidad_personas,
            t.nombre AS nombre_tour
          FROM public.pago p
          INNER JOIN public.reserva r
            ON r.id_reserva =
              p.id_reserva
          INNER JOIN public.tour t
            ON t.id_tour =
              r.id_tour
          WHERE p.id_reserva = $1
            AND r.id_usuario = $2
        `,
      [idReserva, idUsuario],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "La reserva todavía no tiene pago",
      });
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Pago encontrado",
      pago: transformarPago(resultado.rows[0]),
    });
  } catch (error) {
    return responderError(res, error);
  }
}

export async function listarPagosAdmin(req, res) {
  try {
    const resultado = await pool.query(
      `
          SELECT
            p.*,
            r.fecha_tour,
            r.cantidad_personas,
            t.nombre AS nombre_tour,

            COALESCE(
              NULLIF(
                TRIM(
                  CONCAT_WS(
                    ' ',
                    to_jsonb(u) ->
                     > 'nombre',
                    to_jsonb(u) ->
                     > 'apellido'
                  )
                ),
                ''
              ),
              to_jsonb(u) ->
               > 'correo',
              to_jsonb(u) ->
               > 'email',
              'Usuario ' ||
                r.id_usuario::text
            ) AS nombre_usuario,

            COALESCE(
              to_jsonb(u) ->
               > 'correo',
              to_jsonb(u) ->
               > 'email',
              ''
            ) AS correo_usuario

          FROM public.pago p
          INNER JOIN public.reserva r
            ON r.id_reserva =
              p.id_reserva
          INNER JOIN public.tour t
            ON t.id_tour =
              r.id_tour
          INNER JOIN public.usuario u
            ON u.id_usuario =
              r.id_usuario

          ORDER BY
            CASE p.estado_pago
              WHEN 'pendiente'
                THEN 1
              WHEN 'rechazado'
                THEN 2
              WHEN 'pagado'
                THEN 3
              ELSE 4
            END,
            p.fecha_actualizacion DESC,
            p.id_pago DESC
        `,
    );

    const pagos = resultado.rows.map(transformarPago);

    return res.status(200).json({
      ok: true,
      total: pagos.length,
      pagos,
    });
  } catch (error) {
    return responderError(res, error);
  }
}

export async function aprobarPago(req, res) {
  const idPago = Number(req.params.idPago);

  if (!Number.isInteger(idPago) || idPago <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "El pago no es válido",
    });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado = await cliente.query(
      `
          SELECT
            p.id_pago,
            p.id_reserva,
            p.estado_pago,
            r.estado AS estado_reserva
          FROM public.pago p
          INNER JOIN public.reserva r
            ON r.id_reserva =
              p.id_reserva
          WHERE p.id_pago = $1
          FOR UPDATE OF p, r
        `,
      [idPago],
    );

    if (resultado.rowCount === 0) {
      await cliente.query("ROLLBACK");

      return res.status(404).json({
        ok: false,
        mensaje: "Pago no encontrado",
      });
    }

    const pago = resultado.rows[0];

    if (pago.estado_pago === "pagado") {
      await cliente.query("ROLLBACK");

      return res.status(409).json({
        ok: false,
        mensaje: "El pago ya fue aprobado",
      });
    }

    if (pago.estado_reserva === "Cancelada") {
      await cliente.query("ROLLBACK");

      return res.status(409).json({
        ok: false,
        mensaje: "No se puede aprobar el pago de una reserva cancelada",
      });
    }

    await cliente.query(
      `
          UPDATE public.pago
          SET
            estado_pago = 'pagado',
            fecha_actualizacion =
              CURRENT_TIMESTAMP
          WHERE id_pago = $1
        `,
      [idPago],
    );

    await cliente.query(
      `
          UPDATE public.reserva
          SET
            estado = 'Confirmada',
            fecha_actualizacion =
              CURRENT_TIMESTAMP
          WHERE id_reserva = $1
        `,
      [pago.id_reserva],
    );

    await cliente.query("COMMIT");

    return res.status(200).json({
      ok: true,
      mensaje: "Pago aprobado y reserva confirmada correctamente",
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    return responderError(res, error);
  } finally {
    cliente.release();
  }
}

export async function rechazarPago(req, res) {
  const idPago = Number(req.params.idPago);

  if (!Number.isInteger(idPago) || idPago <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "El pago no es válido",
    });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado = await cliente.query(
      `
          SELECT
            p.id_pago,
            p.id_reserva,
            p.estado_pago,
            r.estado AS estado_reserva
          FROM public.pago p
          INNER JOIN public.reserva r
            ON r.id_reserva =
              p.id_reserva
          WHERE p.id_pago = $1
          FOR UPDATE OF p, r
        `,
      [idPago],
    );

    if (resultado.rowCount === 0) {
      await cliente.query("ROLLBACK");

      return res.status(404).json({
        ok: false,
        mensaje: "Pago no encontrado",
      });
    }

    const pago = resultado.rows[0];

    if (pago.estado_pago === "pagado") {
      await cliente.query("ROLLBACK");

      return res.status(409).json({
        ok: false,
        mensaje: "Un pago aprobado no puede rechazarse desde esta operación",
      });
    }

    await cliente.query(
      `
          UPDATE public.pago
          SET
            estado_pago =
              'rechazado',
            fecha_actualizacion =
              CURRENT_TIMESTAMP
          WHERE id_pago = $1
        `,
      [idPago],
    );

    if (pago.estado_reserva !== "Cancelada") {
      await cliente.query(
        `
            UPDATE public.reserva
            SET
              estado = 'Pendiente',
              fecha_actualizacion =
                CURRENT_TIMESTAMP
            WHERE id_reserva = $1
          `,
        [pago.id_reserva],
      );
    }

    await cliente.query("COMMIT");

    return res.status(200).json({
      ok: true,
      mensaje: "Pago rechazado, el usuario puede volver a enviarlo",
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    return responderError(res, error);
  } finally {
    cliente.release();
  }
}

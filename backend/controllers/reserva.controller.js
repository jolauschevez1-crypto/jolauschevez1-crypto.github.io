import { pool } from "../config/db.js";

const ESTADOS_VALIDOS = ["Confirmada", "Pendiente", "Cancelada"];

function valorDefinido() {
  for (const valor of arguments) {
    if (valor !== undefined && valor !== null && valor !== "") {
      return valor;
    }
  }

  return null;
}

function obtenerIdUsuario(req) {
  if (!req.usuario) {
    return null;
  }

  const valor = valorDefinido(
    req.usuario.idUsuario,
    req.usuario.id_usuario,
    req.usuario.id,
    req.usuario.sub,
  );

  const idUsuario = Number(valor);

  if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
    return null;
  }

  return idUsuario;
}

function normalizarEstado(estado) {
  const texto = String(estado || "")
    .trim()
    .toLowerCase();

  const mapa = {
    confirmada: "Confirmada",
    pendiente: "Pendiente",
    cancelada: "Cancelada",
  };

  return mapa[texto] || null;
}

function claseEstado(estado) {
  const clases = {
    Confirmada: "bg-success",
    Pendiente: "bg-warning text-dark",
    Cancelada: "bg-secondary",
  };

  return clases[estado] || "bg-secondary";
}

function urlImagen(req, imagen) {
  if (!imagen) {
    return "/guayaquilcompleto.jpg";
  }

  const texto = String(imagen);

  if (
    texto.startsWith("http://") ||
    texto.startsWith("https://") ||
    texto.startsWith("/")
  ) {
    return texto;
  }

  return `${req.protocol}://${req.get("host")}/uploads/${texto}`;
}

function transformarReserva(req, fila) {
  const precioTotal = Number(fila.precio_total || 0);
  const precioUnitario = Number(fila.precio_unitario || 0);
  const personas = Number(fila.cantidad_personas || 0);
  const adultos = Number(fila.cantidad_adultos ?? personas ?? 1);
  const menores = Number(fila.cantidad_menores || 0);

  return {
    id: Number(fila.id_reserva),
    idReserva: Number(fila.id_reserva),
    idUsuario: Number(fila.id_usuario),
    idTour: Number(fila.id_tour),

    tour: fila.nombre_tour,
    nombreTour: fila.nombre_tour,
    imagen: urlImagen(req, fila.imagen_tour),

    fecha: fila.fecha_tour,
    fechaTour: fila.fecha_tour,
    personas,
    cantidadPersonas: personas,
    cantidadAdultos: adultos,
    cantidadMenores: menores,

    precioUnitario,
    precioAdulto: Number(fila.precio_adulto ?? precioUnitario),
    precioMenor: Number(fila.precio_menor || 0),
    precioTotal,

    estado: fila.estado,
    badgeClass: claseEstado(fila.estado),

    idPago:
      fila.id_pago === null || fila.id_pago === undefined
        ? null
        : Number(fila.id_pago),

    estadoPago: fila.estado_pago || null,
    metodoPago: fila.metodo_pago || null,
    referenciaPago: fila.referencia_pago || null,

    usuario: fila.nombre_usuario,
    fechaCreacion: fila.fecha_creacion,
    fechaActualizacion: fila.fecha_actualizacion,
  };
}

const consultaReservaBase = `
  SELECT
    r.id_reserva,
    r.id_usuario,
    r.id_tour,
    r.fecha_tour,
    r.cantidad_personas,
    r.cantidad_adultos,
    r.cantidad_menores,
    r.precio_unitario,
    r.precio_adulto,
    r.precio_menor,
    r.precio_total,
    r.estado,
    r.fecha_creacion,
    r.fecha_actualizacion,

    t.nombre AS nombre_tour,
    t.imagen AS imagen_tour,

    p.id_pago,
    p.estado_pago,
    p.metodo_pago,
    p.referencia AS referencia_pago,

    COALESCE(
      NULLIF(
        TRIM(
          CONCAT_WS(
            ' ',
            to_jsonb(u) ->> 'nombre',
            to_jsonb(u) ->> 'apellido'
          )
        ),
        ''
      ),
      to_jsonb(u) ->> 'correo',
      to_jsonb(u) ->> 'email',
      'Usuario ' || r.id_usuario::text
    ) AS nombre_usuario

  FROM public.reserva r
  INNER JOIN public.tour t
    ON t.id_tour = r.id_tour
  INNER JOIN public.usuario u
    ON u.id_usuario = r.id_usuario
  LEFT JOIN public.pago p
    ON p.id_reserva = r.id_reserva
`;

function responderError(res, error) {
  console.error("ERROR REAL DE RESERVA:", {
    message: error.message,
    code: error.code,
    detail: error.detail,
    table: error.table,
    column: error.column,
    constraint: error.constraint,
  });

  if (
    error.code === "23505" &&
    error.constraint === "uq_reserva_usuario_tour_fecha_activa"
  ) {
    return res.status(409).json({
      ok: false,
      mensaje:
        "Ya tienes una reserva activa para este tour en la fecha seleccionada",
    });
  }

  if (error.code === "23503") {
    return res.status(400).json({
      ok: false,
      mensaje: "El usuario o el tour seleccionado no existe",
      detalle: error.detail || "",
    });
  }

  if (error.code === "23514") {
    return res.status(400).json({
      ok: false,
      mensaje: "Los datos de la reserva no cumplen las reglas establecidas",
      detalle: error.detail || "",
      restriccion: error.constraint || "",
    });
  }

  if (error.code === "22P02") {
    return res.status(400).json({
      ok: false,
      mensaje: "Uno de los valores enviados no tiene un formato válido",
      detalle: error.message,
    });
  }

  return res.status(500).json({
    ok: false,
    mensaje: error.message || "No se pudo completar la operación de reserva",
    detalle: error.detail || "",
    codigo: error.code || "",
    restriccion: error.constraint || "",
  });
}

export async function obtenerDisponibilidad(req, res) {
  const idTour = Number(req.params.idTour);

  const fechaTour = String(req.query.fecha || "").trim();

  if (!Number.isInteger(idTour) || idTour <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "El tour seleccionado no es válido",
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTour)) {
    return res.status(400).json({
      ok: false,
      mensaje: "La fecha debe tener el formato AAAA-MM-DD",
    });
  }

  try {
    const resultado = await pool.query(
      `
        SELECT
          t.id_tour,
          t.cupo_total,

          COALESCE(
            SUM(r.cantidad_personas)
              FILTER (
                WHERE r.estado IN (
                  'Confirmada',
                  'Pendiente'
                )
              ),
            0
          )::integer AS personas_reservadas

        FROM public.tour AS t

        LEFT JOIN public.reserva AS r
          ON r.id_tour = t.id_tour
         AND r.fecha_tour = $2::date

        WHERE t.id_tour = $1

        GROUP BY
          t.id_tour,
          t.cupo_total
      `,
      [idTour, fechaTour],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "El tour no existe",
      });
    }

    const fila = resultado.rows[0];

    const cupoTotal = Number(fila.cupo_total || 0);

    const personasReservadas = Number(fila.personas_reservadas || 0);

    const cuposDisponibles = Math.max(0, cupoTotal - personasReservadas);

    return res.status(200).json({
      ok: true,
      idTour,
      fecha: fechaTour,
      cupoTotal,
      personasReservadas,
      cuposDisponibles,
    });
  } catch (error) {
    return responderError(res, error);
  }
}

export async function crearReserva(req, res) {
  const idUsuario = obtenerIdUsuario(req);

  if (!idUsuario) {
    return res.status(401).json({
      ok: false,
      mensaje: "Debes iniciar sesión para reservar",
    });
  }

  const idTour = Number(valorDefinido(req.body.idTour, req.body.id_tour));

  const fechaTour = String(
    valorDefinido(req.body.fechaTour, req.body.fecha_tour, req.body.fecha) ||
      "",
  ).trim();

  const cantidadAdultos = Number(
    valorDefinido(
      req.body.cantidadAdultos,
      req.body.cantidad_adultos,
      req.body.adultos,
      req.body.cantidadPersonas,
      req.body.cantidad_personas,
      req.body.personas,
      1,
    ),
  );

  const cantidadMenores = Number(
    valorDefinido(
      req.body.cantidadMenores,
      req.body.cantidad_menores,
      req.body.menores,
      0,
    ),
  );

  const cantidadPersonas = cantidadAdultos + cantidadMenores;

  if (!Number.isInteger(idTour) || idTour <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "El tour seleccionado no es válido",
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTour)) {
    return res.status(400).json({
      ok: false,
      mensaje: "La fecha debe tener el formato AAAA-MM-DD",
    });
  }

  if (!Number.isInteger(cantidadAdultos) || cantidadAdultos < 1) {
    return res.status(400).json({
      ok: false,
      mensaje: "Debes seleccionar al menos un adulto",
    });
  }

  if (!Number.isInteger(cantidadMenores) || cantidadMenores < 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "La cantidad de menores no es válida",
    });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultadoFecha = await cliente.query(
      "SELECT $1::date >= CURRENT_DATE AS fecha_valida",
      [fechaTour],
    );

    if (!resultadoFecha.rows[0].fecha_valida) {
      await cliente.query("ROLLBACK");
      return res.status(400).json({
        ok: false,
        mensaje: "No puedes reservar una fecha anterior a hoy",
      });
    }

    const resultadoTour = await cliente.query(
      `
                SELECT
                    id_tour,
                    nombre,
                    precio,
                    COALESCE(precio_menor, 0) AS precio_menor,
                    COALESCE(edad_gratis, 4) AS edad_gratis,
                    cupo_total,
                    COALESCE(activo, TRUE) AS activo
                FROM public.tour
                WHERE id_tour = $1
                FOR UPDATE
            `,
      [idTour],
    );

    if (resultadoTour.rowCount === 0) {
      await cliente.query("ROLLBACK");
      return res.status(404).json({
        ok: false,
        mensaje: "El tour no existe",
      });
    }

    const tour = resultadoTour.rows[0];

    if (!tour.activo) {
      await cliente.query("ROLLBACK");
      return res.status(409).json({
        ok: false,
        mensaje: "El tour ya no está disponible",
      });
    }

    const resultadoDuplicada = await cliente.query(
      `
                SELECT id_reserva
                FROM public.reserva
                WHERE id_usuario = $1
                  AND id_tour = $2
                  AND fecha_tour = $3::date
                  AND estado IN ('Confirmada', 'Pendiente')
                LIMIT 1
            `,
      [idUsuario, idTour, fechaTour],
    );

    if (resultadoDuplicada.rowCount > 0) {
      await cliente.query("ROLLBACK");
      return res.status(409).json({
        ok: false,
        mensaje:
          "Ya tienes una reserva activa para este tour en la fecha seleccionada",
      });
    }

    const resultadoOcupados = await cliente.query(
      `
                SELECT
                    COALESCE(SUM(cantidad_personas), 0)::integer
                        AS personas_reservadas
                FROM public.reserva
                WHERE id_tour = $1
                  AND fecha_tour = $2::date
                  AND estado IN ('Confirmada', 'Pendiente')
            `,
      [idTour, fechaTour],
    );

    const cupoTotal = Number(tour.cupo_total || 0);
    const ocupados = Number(resultadoOcupados.rows[0].personas_reservadas || 0);
    const disponibles = Math.max(0, cupoTotal - ocupados);

    if (cantidadPersonas > disponibles) {
      await cliente.query("ROLLBACK");
      return res.status(409).json({
        ok: false,
        mensaje: `Solo quedan ${disponibles} cupos disponibles para esa fecha`,
        cuposDisponibles: disponibles,
      });
    }

    const precioAdulto = Number(tour.precio || 0);
    const precioMenor = Number(tour.precio_menor || 0);
    const totalCalculado =
      cantidadAdultos * precioAdulto + cantidadMenores * precioMenor;

    const precioUnitarioPromedio =
      cantidadPersonas > 0 ? totalCalculado / cantidadPersonas : 0;

    const resultadoInsertar = await cliente.query(
      `
                INSERT INTO public.reserva (
                    id_usuario,
                    id_tour,
                    fecha_tour,
                    cantidad_personas,
                    cantidad_adultos,
                    cantidad_menores,
                    precio_unitario,
                    precio_adulto,
                    precio_menor,
                    estado
                )
                VALUES (
                    $1, $2, $3::date, $4, $5,
                    $6, $7, $8, $9, 'Pendiente'
                )
                RETURNING id_reserva
            `,
      [
        idUsuario,
        idTour,
        fechaTour,
        cantidadPersonas,
        cantidadAdultos,
        cantidadMenores,
        precioUnitarioPromedio,
        precioAdulto,
        precioMenor,
      ],
    );

    const idReserva = resultadoInsertar.rows[0].id_reserva;

    const resultadoReserva = await cliente.query(
      `
                ${consultaReservaBase}
                WHERE r.id_reserva = $1
            `,
      [idReserva],
    );

    await cliente.query("COMMIT");

    return res.status(201).json({
      ok: true,
      mensaje:
        "Reserva creada en estado Pendiente, realiza el pago para continuar",
      cuposDisponibles: Math.max(0, disponibles - cantidadPersonas),
      reserva: transformarReserva(req, resultadoReserva.rows[0]),
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    return responderError(res, error);
  } finally {
    cliente.release();
  }
}

export async function listarMisReservas(req, res) {
  const idUsuario = obtenerIdUsuario(req);

  if (!idUsuario) {
    return res.status(401).json({
      ok: false,
      mensaje: "Sesión no válida",
    });
  }

  try {
    const resultado = await pool.query(
      `
        ${consultaReservaBase}
        WHERE r.id_usuario = $1
        ORDER BY r.fecha_creacion DESC
      `,
      [idUsuario],
    );

    const reservas = resultado.rows.map((fila) =>
      transformarReserva(req, fila),
    );

    return res.status(200).json({
      ok: true,
      total: reservas.length,
      reservas,
    });
  } catch (error) {
    return responderError(res, error);
  }
}

export async function obtenerReservaPorId(req, res) {
  const idUsuario = obtenerIdUsuario(req);
  const idReserva = Number(req.params.id);

  if (!idUsuario) {
    return res.status(401).json({
      ok: false,
      mensaje: "Sesión no válida",
    });
  }

  if (!Number.isInteger(idReserva) || idReserva <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "El ID de la reserva no es válido",
    });
  }

  try {
    const resultado = await pool.query(
      `
        ${consultaReservaBase}
        WHERE r.id_reserva = $1
          AND r.id_usuario = $2
      `,
      [idReserva, idUsuario],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Reserva no encontrada",
      });
    }

    return res.status(200).json({
      ok: true,
      reserva: transformarReserva(req, resultado.rows[0]),
    });
  } catch (error) {
    return responderError(res, error);
  }
}

export async function cancelarReserva(req, res) {
  const idUsuario = obtenerIdUsuario(req);
  const idReserva = Number(req.params.id);

  if (!idUsuario) {
    return res.status(401).json({
      ok: false,
      mensaje: "Sesión no válida",
    });
  }

  if (!Number.isInteger(idReserva) || idReserva <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "El ID de la reserva no es válido",
    });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultadoReserva = await cliente.query(
      `
          SELECT
            id_reserva,
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
        mensaje: "La reserva no existe",
      });
    }

    if (resultadoReserva.rows[0].estado === "Cancelada") {
      await cliente.query("ROLLBACK");

      return res.status(409).json({
        ok: false,
        mensaje: "La reserva ya está cancelada",
      });
    }

    const resultadoPago = await cliente.query(
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

    if (
      resultadoPago.rowCount > 0 &&
      resultadoPago.rows[0].estado_pago === "pagado"
    ) {
      await cliente.query("ROLLBACK");

      return res.status(409).json({
        ok: false,
        mensaje:
          "La reserva ya tiene un pago aprobado, solicita la cancelación al administrador",
      });
    }

    await cliente.query(
      `
          UPDATE public.reserva
          SET
            estado = 'Cancelada',
            fecha_actualizacion =
              CURRENT_TIMESTAMP
          WHERE id_reserva = $1
        `,
      [idReserva],
    );

    await cliente.query(
      `
          UPDATE public.pago
          SET
            estado_pago = 'rechazado',
            fecha_actualizacion =
              CURRENT_TIMESTAMP
          WHERE id_reserva = $1
            AND estado_pago = 'pendiente'
        `,
      [idReserva],
    );

    await cliente.query("COMMIT");

    return res.status(200).json({
      ok: true,
      mensaje: "Reserva cancelada correctamente",
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    return responderError(res, error);
  } finally {
    cliente.release();
  }
}

export async function listarReservasAdmin(req, res) {
  try {
    const resultado = await pool.query(`
      ${consultaReservaBase}
      ORDER BY r.fecha_creacion DESC
    `);

    const reservas = resultado.rows.map((fila) =>
      transformarReserva(req, fila),
    );

    return res.status(200).json({
      ok: true,
      total: reservas.length,
      reservas,
    });
  } catch (error) {
    return responderError(res, error);
  }
}

export async function actualizarEstadoReserva(req, res) {
  const idReserva = Number(req.params.id);

  const estadoNuevo = normalizarEstado(req.body.estado);

  if (!Number.isInteger(idReserva) || idReserva <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "El ID de la reserva no es válido",
    });
  }

  if (!estadoNuevo || !ESTADOS_VALIDOS.includes(estadoNuevo)) {
    return res.status(400).json({
      ok: false,
      mensaje: "El estado debe ser Confirmada, Pendiente o Cancelada",
    });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultadoActual = await cliente.query(
      `
          SELECT
            r.id_reserva,
            r.id_tour,
            r.fecha_tour,
            r.cantidad_personas,
            r.estado,
            t.cupo_total
          FROM public.reserva AS r
          INNER JOIN public.tour AS t
            ON t.id_tour = r.id_tour
          WHERE r.id_reserva = $1
          FOR UPDATE OF r, t
        `,
      [idReserva],
    );

    if (resultadoActual.rowCount === 0) {
      await cliente.query("ROLLBACK");

      return res.status(404).json({
        ok: false,
        mensaje: "Reserva no encontrada",
      });
    }

    const reserva = resultadoActual.rows[0];

    const estabaCancelada = reserva.estado === "Cancelada";

    const quedaraActiva =
      estadoNuevo === "Confirmada" || estadoNuevo === "Pendiente";

    /*
          Si una reserva cancelada vuelve a activarse,
          se comprueba que existan cupos para esa fecha.
        */
    if (estabaCancelada && quedaraActiva) {
      const resultadoOcupados = await cliente.query(
        `
            SELECT
              COALESCE(
                SUM(cantidad_personas),
                0
              )::integer AS personas_reservadas
            FROM public.reserva
            WHERE id_tour = $1
              AND fecha_tour = $2::date
              AND id_reserva <> $3
              AND estado IN (
                'Confirmada',
                'Pendiente'
              )
          `,
        [reserva.id_tour, reserva.fecha_tour, idReserva],
      );

      const disponibles = Math.max(
        0,
        Number(reserva.cupo_total || 0) -
          Number(resultadoOcupados.rows[0].personas_reservadas || 0),
      );

      if (Number(reserva.cantidad_personas) > disponibles) {
        await cliente.query("ROLLBACK");

        return res.status(409).json({
          ok: false,
          mensaje: `Solo quedan ${disponibles} cupos disponibles para esa fecha`,
        });
      }
    }

    await cliente.query(
      `
        UPDATE public.reserva
        SET estado = $1
        WHERE id_reserva = $2
      `,
      [estadoNuevo, idReserva],
    );

    const resultadoReserva = await cliente.query(
      `
          ${consultaReservaBase}
          WHERE r.id_reserva = $1
        `,
      [idReserva],
    );

    await cliente.query("COMMIT");

    return res.status(200).json({
      ok: true,
      mensaje: "Estado actualizado correctamente",
      reserva: transformarReserva(req, resultadoReserva.rows[0]),
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    return responderError(res, error);
  } finally {
    cliente.release();
  }
}

export async function obtenerResumenReservas(req, res) {
  try {
    const resultado = await pool.query(`
      SELECT
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (
          WHERE estado = 'Confirmada'
        )::integer AS confirmadas,
        COUNT(*) FILTER (
          WHERE estado = 'Pendiente'
        )::integer AS pendientes,
        COUNT(*) FILTER (
          WHERE estado = 'Cancelada'
        )::integer AS canceladas,
        COALESCE(
          SUM(precio_total) FILTER (
            WHERE estado = 'Confirmada'
          ),
          0
        )::numeric(12, 2) AS ingresos_confirmados
      FROM public.reserva
    `);

    const fila = resultado.rows[0];

    return res.status(200).json({
      ok: true,
      resumen: {
        total: Number(fila.total || 0),
        confirmadas: Number(fila.confirmadas || 0),
        pendientes: Number(fila.pendientes || 0),
        canceladas: Number(fila.canceladas || 0),
        ingresosConfirmados: Number(fila.ingresos_confirmados || 0),
      },
    });
  } catch (error) {
    return responderError(res, error);
  }
}

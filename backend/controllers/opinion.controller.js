import { pool } from "../config/db.js";

function obtenerIdUsuario(req) {
  const valor =
    req.usuario?.idUsuario ??
    req.usuario?.id_usuario ??
    req.usuario?.id ??
    req.usuario?.sub;

  const idUsuario = Number(valor);

  return Number.isInteger(idUsuario) && idUsuario > 0 ? idUsuario : null;
}

function transformarOpinion(fila) {
  return {
    idOpinion: Number(fila.id_opinion),
    idTour: Number(fila.id_tour),
    idUsuario: Number(fila.id_usuario),
    nombreUsuario: fila.nombre_usuario,
    nombreTour: fila.nombre_tour || null,
    ciudad: fila.ciudad || "Ecuador",
    tipoViaje: fila.tipo_viaje || "Solo",
    puntuacion: Number(fila.puntuacion),
    comentario: fila.comentario,
    fechaCreacion: fila.fecha_creacion,
    fechaActualizacion: fila.fecha_actualizacion,
  };
}

const consultaOpiniones = `
  SELECT
    o.id_opinion,
    o.id_tour,
    o.id_usuario,
    o.puntuacion,
    o.comentario,
    o.ciudad,
    o.tipo_viaje,
    o.fecha_creacion,
    o.fecha_actualizacion,
    COALESCE(
      NULLIF(
        BTRIM(
          CONCAT_WS(
            ' ',
            u.nombre,
            u.apellido
          )
        ),
        ''
      ),
      u.correo,
      'Usuario'
    ) AS nombre_usuario
  FROM public.opinion_tour o
  INNER JOIN public.usuario u
    ON u.id_usuario = o.id_usuario
  WHERE o.id_tour = $1
    AND o.activo = true
`;

export async function listarOpinionesRecientes(req, res) {
  const limiteSolicitado = Number(req.query.limite || 6);

  const limite = Number.isInteger(limiteSolicitado)
    ? Math.min(Math.max(limiteSolicitado, 1), 12)
    : 6;

  try {
    const resultado = await pool.query(
      `
        SELECT
          o.id_opinion,
          o.id_tour,
          o.id_usuario,
          o.puntuacion,
          o.comentario,
          o.ciudad,
          o.tipo_viaje,
          o.fecha_creacion,
          o.fecha_actualizacion,
          t.nombre AS nombre_tour,
          COALESCE(
            NULLIF(
              BTRIM(
                CONCAT_WS(
                  ' ',
                  u.nombre,
                  u.apellido
                )
              ),
              ''
            ),
            u.correo,
            'Usuario'
          ) AS nombre_usuario,
          COUNT(*) OVER () AS total_opiniones,
          AVG(o.puntuacion) OVER () AS promedio_general
        FROM public.opinion_tour o
        INNER JOIN public.usuario u
          ON u.id_usuario = o.id_usuario
        INNER JOIN public.tour t
          ON t.id_tour = o.id_tour
        WHERE o.activo = true
          AND t.activo = true
        ORDER BY
          o.fecha_creacion DESC,
          o.id_opinion DESC
        LIMIT $1
      `,
      [limite],
    );

    const opiniones = resultado.rows.map(transformarOpinion);
    const primeraFila = resultado.rows[0];

    return res.status(200).json({
      ok: true,
      total: Number(primeraFila?.total_opiniones || 0),
      promedio: Number(Number(primeraFila?.promedio_general || 0).toFixed(1)),
      opiniones,
    });
  } catch (error) {
    console.error("Error al listar opiniones recientes:", error);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudieron cargar los comentarios recientes",
      detalle: error.message,
    });
  }
}

export async function listarOpinionesTour(req, res) {
  const idTour = Number(req.params.idTour);

  if (!Number.isInteger(idTour) || idTour <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "El tour no es válido",
    });
  }

  try {
    const resultado = await pool.query(
      `
        ${consultaOpiniones}
        ORDER BY o.fecha_creacion DESC
      `,
      [idTour],
    );

    const opiniones = resultado.rows.map(transformarOpinion);

    const promedio = opiniones.length
      ? opiniones.reduce((suma, opinion) => suma + opinion.puntuacion, 0) /
        opiniones.length
      : 0;

    return res.status(200).json({
      ok: true,
      total: opiniones.length,
      promedio: Number(promedio.toFixed(1)),
      opiniones,
    });
  } catch (error) {
    console.error("Error al listar opiniones:", error);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudieron cargar las opiniones",
      detalle: error.message,
    });
  }
}

export async function guardarOpinionTour(req, res) {
  const idUsuario = obtenerIdUsuario(req);
  const idTour = Number(req.params.idTour);
  const puntuacion = Number(req.body.puntuacion);
  const comentario = String(req.body.comentario || "").trim();
  const ciudad = String(req.body.ciudad || "Ecuador").trim();
  const tipoViaje = String(req.body.tipoViaje || "Solo").trim();

  if (!idUsuario) {
    return res.status(401).json({
      ok: false,
      mensaje: "Debes iniciar sesión para comentar",
    });
  }

  if (!Number.isInteger(idTour) || idTour <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "El tour no es válido",
    });
  }

  if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
    return res.status(400).json({
      ok: false,
      mensaje: "La puntuación debe estar entre 1 y 5",
    });
  }

  if (comentario.length < 10 || comentario.length > 1000) {
    return res.status(400).json({
      ok: false,
      mensaje: "El comentario debe tener entre 10 y 1000 caracteres",
    });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const tour = await cliente.query(
      `
        SELECT id_tour
        FROM public.tour
        WHERE id_tour = $1
          AND activo = true
      `,
      [idTour],
    );

    if (tour.rowCount === 0) {
      await cliente.query("ROLLBACK");

      return res.status(404).json({
        ok: false,
        mensaje: "El tour no existe o no está disponible",
      });
    }

    const reserva = await cliente.query(
      `
        SELECT r.id_reserva
        FROM public.reserva r
        LEFT JOIN public.pago p
          ON p.id_reserva = r.id_reserva
        WHERE r.id_usuario = $1
          AND r.id_tour = $2
          AND (
            r.estado = 'Confirmada'
            OR p.estado_pago = 'pagado'
          )
        LIMIT 1
      `,
      [idUsuario, idTour],
    );

    if (reserva.rowCount === 0) {
      await cliente.query("ROLLBACK");

      return res.status(403).json({
        ok: false,
        mensaje: "Solo puedes comentar tours que tengas confirmados",
      });
    }

    await cliente.query(
      `
        INSERT INTO public.opinion_tour (
          id_usuario,
          id_tour,
          puntuacion,
          comentario,
          ciudad,
          tipo_viaje,
          activo,
          fecha_creacion,
          fecha_actualizacion
        )
        VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (id_usuario, id_tour)
        DO UPDATE SET
          puntuacion = EXCLUDED.puntuacion,
          comentario = EXCLUDED.comentario,
          ciudad = EXCLUDED.ciudad,
          tipo_viaje = EXCLUDED.tipo_viaje,
          activo = true,
          fecha_actualizacion = CURRENT_TIMESTAMP
      `,
      [
        idUsuario,
        idTour,
        puntuacion,
        comentario,
        ciudad || "Ecuador",
        tipoViaje || "Solo",
      ],
    );

    const resultado = await cliente.query(
      `
        ${consultaOpiniones}
          AND o.id_usuario = $2
        LIMIT 1
      `,
      [idTour, idUsuario],
    );

    await cliente.query("COMMIT");

    return res.status(200).json({
      ok: true,
      mensaje: "Comentario guardado correctamente",
      opinion: transformarOpinion(resultado.rows[0]),
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    console.error("Error al guardar opinión:", error);

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo guardar el comentario",
      detalle: error.message,
    });
  } finally {
    cliente.release();
  }
}

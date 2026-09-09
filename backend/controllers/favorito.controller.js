import { pool } from "../config/db.js";

function obtenerIdUsuario(req) {
  return Number(
    req.usuario?.idUsuario ||
      req.usuario?.id_usuario ||
      req.usuario?.id ||
      req.usuario?.sub ||
      0,
  );
}

function validarUsuario(req, res) {
  const idUsuario = obtenerIdUsuario(req);
  const rol = String(req.usuario?.rol || "").toLowerCase();

  if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
    res.status(401).json({
      ok: false,
      mensaje: "No se pudo identificar al usuario de la sesión",
    });

    return 0;
  }

  if (rol === "admin") {
    res.status(403).json({
      ok: false,
      mensaje: "Los favoritos pertenecen a cuentas de usuario",
    });

    return 0;
  }

  return idUsuario;
}

function urlImagen(req, imagen) {
  if (!imagen) {
    return "/guayaquilcompleto.jpg";
  }

  const ruta = String(imagen).trim();

  if (
    ruta.startsWith("http://") ||
    ruta.startsWith("https://") ||
    ruta.startsWith("/")
  ) {
    return ruta;
  }

  if (ruta.startsWith("uploads/")) {
    return `${req.protocol}://${req.get("host")}/${ruta}`;
  }

  return `${req.protocol}://${req.get("host")}/uploads/${ruta}`;
}

function transformarFavorito(req, fila) {
  const duracion = Number(fila.duracion_horas || 0);
  const calificacion = Number(fila.calificacion_promedio || 0);
  const precio = Number(fila.precio || 0);

  return {
    idFavorito: Number(fila.id_favorito),
    id: Number(fila.id_tour),
    idTour: Number(fila.id_tour),
    title: fila.nombre,
    nombre: fila.nombre,
    image: urlImagen(req, fila.imagen),
    imagen: fila.imagen || "",
    duration: duracion > 0 ? `${duracion} Horas` : "Duración por confirmar",
    duracionHoras: duracion,
    rating:
      calificacion > 0 ? `${calificacion.toFixed(1)} / 5` : "Sin opiniones",
    calificacionPromedio: calificacion,
    precio,
    price: `$${precio.toFixed(2)} por persona`,
    fechaCreacion: fila.fecha_creacion,
  };
}

function consultaFavorito(condicion) {
  return `
    SELECT
      f.id_favorito,
      f.fecha_creacion,
      t.id_tour,
      t.nombre,
      t.imagen,
      t.duracion_horas,
      t.precio,
      COALESCE(opiniones.calificacion_promedio, 0)
        AS calificacion_promedio
    FROM public.favorito f
    INNER JOIN public.tour t
      ON t.id_tour = f.id_elemento
     AND f.tipo = 'tour'
    LEFT JOIN LATERAL (
      SELECT
        ROUND(AVG(o.puntuacion)::numeric, 1)
          AS calificacion_promedio
      FROM public.opinion_tour o
      WHERE o.id_tour = t.id_tour
        AND o.activo = true
    ) opiniones ON true
    ${condicion}
  `;
}

async function obtenerFavorito(req, idUsuario, idTour) {
  const resultado = await pool.query(
    `
      ${consultaFavorito(`
        WHERE f.id_usuario = $1
          AND f.id_elemento = $2
          AND f.tipo = 'tour'
      `)}
      LIMIT 1
    `,
    [idUsuario, idTour],
  );

  return resultado.rows[0] || null;
}

function responderError(res, error) {
  console.error("Error en favoritos:", error);

  if (error.code === "42P01") {
    return res.status(500).json({
      ok: false,
      mensaje: "Falta crear la tabla de favoritos",
      detalle: error.message,
    });
  }

  return res.status(500).json({
    ok: false,
    mensaje: "No se pudo completar la operación de favoritos",
    detalle: error.message,
  });
}

export async function listarFavoritos(req, res) {
  const idUsuario = validarUsuario(req, res);

  if (!idUsuario) {
    return;
  }

  try {
    const resultado = await pool.query(
      `
        ${consultaFavorito(`
          WHERE f.id_usuario = $1
            AND f.tipo = 'tour'
            AND t.activo = true
        `)}
        ORDER BY f.fecha_creacion DESC, f.id_favorito DESC
      `,
      [idUsuario],
    );

    return res.status(200).json({
      ok: true,
      total: resultado.rows.length,
      favoritos: resultado.rows.map((fila) => transformarFavorito(req, fila)),
    });
  } catch (error) {
    return responderError(res, error);
  }
}

export async function agregarFavorito(req, res) {
  const idUsuario = validarUsuario(req, res);

  if (!idUsuario) {
    return;
  }

  const idTour = Number(
    req.body.idTour || req.body.id_tour || req.body.id || 0,
  );

  if (!Number.isInteger(idTour) || idTour <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "El ID del tour no es válido",
    });
  }

  try {
    const tour = await pool.query(
      `
        SELECT id_tour
        FROM public.tour
        WHERE id_tour = $1
          AND activo = true
        LIMIT 1
      `,
      [idTour],
    );

    if (tour.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "El tour no existe o está inactivo",
      });
    }

    await pool.query(
      `
        INSERT INTO public.favorito (
          id_usuario,
          tipo,
          id_elemento,
          fecha_creacion
        )
        VALUES ($1, 'tour', $2, CURRENT_TIMESTAMP)
        ON CONFLICT (id_usuario, tipo, id_elemento)
        DO NOTHING
      `,
      [idUsuario, idTour],
    );

    const favorito = await obtenerFavorito(req, idUsuario, idTour);

    return res.status(201).json({
      ok: true,
      mensaje: "Tour agregado a favoritos",
      favorito: transformarFavorito(req, favorito),
    });
  } catch (error) {
    return responderError(res, error);
  }
}

export async function eliminarFavorito(req, res) {
  const idUsuario = validarUsuario(req, res);

  if (!idUsuario) {
    return;
  }

  const idTour = Number(req.params.idTour);

  if (!Number.isInteger(idTour) || idTour <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "El ID del tour no es válido",
    });
  }

  try {
    const resultado = await pool.query(
      `
        DELETE FROM public.favorito
        WHERE id_usuario = $1
          AND tipo = 'tour'
          AND id_elemento = $2
        RETURNING id_favorito
      `,
      [idUsuario, idTour],
    );

    return res.status(200).json({
      ok: true,
      eliminado: resultado.rowCount > 0,
      mensaje:
        resultado.rowCount > 0
          ? "Tour eliminado de favoritos"
          : "El tour no estaba en favoritos",
    });
  } catch (error) {
    return responderError(res, error);
  }
}

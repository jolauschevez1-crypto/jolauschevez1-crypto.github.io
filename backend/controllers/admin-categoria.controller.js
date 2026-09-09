import { pool } from "../config/db.js";

function texto(valor) {
  return String(valor ?? "").trim();
}

function entero(valor) {
  const numero = Number(valor);

  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function booleano(valor, predeterminado = true) {
  if (valor === undefined || valor === null || valor === "") {
    return predeterminado;
  }

  if (typeof valor === "boolean") {
    return valor;
  }

  return ["true", "1", "si", "sí", "activo"].includes(
    texto(valor).toLowerCase(),
  );
}

function responderError(res, error, mensaje) {
  console.error(mensaje, error);

  if (error.code === "23505") {
    return res.status(409).json({
      ok: false,
      mensaje: "Ya existe una categoría con ese nombre",
    });
  }

  return res.status(500).json({
    ok: false,
    mensaje,
    detalle: error.message,
  });
}

export async function listarCategoriasAdmin(req, res) {
  try {
    const resultado = await pool.query(`
        SELECT
          c.id_categoria,
          c.nombre,
          c.descripcion,
          c.activo,
          c.fecha_creacion,
          c.fecha_actualizacion,

          COUNT(
            t.id_tour
          )::integer AS total_tours,

          COUNT(
            t.id_tour
          ) FILTER (
            WHERE t.activo = true
          )::integer AS tours_activos

        FROM public.categoria_tour c

        LEFT JOIN public.tour t
          ON t.id_categoria =
            c.id_categoria

        GROUP BY
          c.id_categoria,
          c.nombre,
          c.descripcion,
          c.activo,
          c.fecha_creacion,
          c.fecha_actualizacion

        ORDER BY
          c.activo DESC,
          c.nombre
      `);

    return res.status(200).json({
      ok: true,
      total: resultado.rows.length,
      categorias: resultado.rows,
    });
  } catch (error) {
    return responderError(res, error, "No se pudieron cargar las categorías");
  }
}

export async function obtenerCategoriaAdmin(req, res) {
  const idCategoria = entero(req.params.id);

  if (!idCategoria) {
    return res.status(400).json({
      ok: false,
      mensaje: "La categoría no es válida",
    });
  }

  try {
    const resultado = await pool.query(
      `
          SELECT
            id_categoria,
            nombre,
            descripcion,
            activo,
            fecha_creacion,
            fecha_actualizacion
          FROM public.categoria_tour
          WHERE id_categoria = $1
        `,
      [idCategoria],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Categoría no encontrada",
      });
    }

    return res.status(200).json({
      ok: true,
      categoria: resultado.rows[0],
    });
  } catch (error) {
    return responderError(res, error, "No se pudo cargar la categoría");
  }
}

export async function crearCategoriaAdmin(req, res) {
  const nombre = texto(req.body.nombre);

  const descripcion = texto(req.body.descripcion);

  if (!nombre) {
    return res.status(400).json({
      ok: false,
      mensaje: "El nombre de la categoría es obligatorio",
    });
  }

  try {
    const resultado = await pool.query(
      `
          INSERT INTO public.categoria_tour (
            nombre,
            descripcion,
            activo,
            fecha_creacion,
            fecha_actualizacion
          )
          VALUES (
            $1,
            $2,
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
          RETURNING
            id_categoria,
            nombre,
            descripcion,
            activo,
            fecha_creacion,
            fecha_actualizacion
        `,
      [nombre, descripcion || null],
    );

    return res.status(201).json({
      ok: true,
      mensaje: "Categoría creada correctamente",
      categoria: resultado.rows[0],
    });
  } catch (error) {
    return responderError(res, error, "No se pudo crear la categoría");
  }
}

export async function actualizarCategoriaAdmin(req, res) {
  const idCategoria = entero(req.params.id);

  const nombre = texto(req.body.nombre);

  const descripcion = texto(req.body.descripcion);

  const activo = booleano(req.body.activo, true);

  if (!idCategoria) {
    return res.status(400).json({
      ok: false,
      mensaje: "La categoría no es válida",
    });
  }

  if (!nombre) {
    return res.status(400).json({
      ok: false,
      mensaje: "El nombre de la categoría es obligatorio",
    });
  }

  try {
    const resultado = await pool.query(
      `
          UPDATE public.categoria_tour
          SET
            nombre = $1,
            descripcion = $2,
            activo = $3,
            fecha_actualizacion =
              CURRENT_TIMESTAMP
          WHERE id_categoria = $4
          RETURNING
            id_categoria,
            nombre,
            descripcion,
            activo,
            fecha_creacion,
            fecha_actualizacion
        `,
      [nombre, descripcion || null, activo, idCategoria],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Categoría no encontrada",
      });
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Categoría actualizada correctamente",
      categoria: resultado.rows[0],
    });
  } catch (error) {
    return responderError(res, error, "No se pudo actualizar la categoría");
  }
}

export async function desactivarCategoriaAdmin(req, res) {
  const idCategoria = entero(req.params.id);

  if (!idCategoria) {
    return res.status(400).json({
      ok: false,
      mensaje: "La categoría no es válida",
    });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const categoria = await cliente.query(
      `
          SELECT
            id_categoria,
            nombre,
            activo
          FROM public.categoria_tour
          WHERE id_categoria = $1
          FOR UPDATE
        `,
      [idCategoria],
    );

    if (categoria.rowCount === 0) {
      await cliente.query("ROLLBACK");

      return res.status(404).json({
        ok: false,
        mensaje: "Categoría no encontrada",
      });
    }

    const toursActivos = await cliente.query(
      `
          SELECT COUNT(*)::integer
            AS total
          FROM public.tour
          WHERE id_categoria = $1
            AND activo = true
        `,
      [idCategoria],
    );

    if (Number(toursActivos.rows[0].total) > 0) {
      await cliente.query("ROLLBACK");

      return res.status(409).json({
        ok: false,
        mensaje:
          "No puedes desactivar esta categoría mientras tenga tours activos, desactiva o cambia de categoría esos tours primero",
      });
    }

    await cliente.query(
      `
        UPDATE public.categoria_tour
        SET
          activo = false,
          fecha_actualizacion =
            CURRENT_TIMESTAMP
        WHERE id_categoria = $1
      `,
      [idCategoria],
    );

    await cliente.query("COMMIT");

    return res.status(200).json({
      ok: true,
      mensaje: "Categoría desactivada correctamente",
    });
  } catch (error) {
    await cliente.query("ROLLBACK");

    return responderError(res, error, "No se pudo desactivar la categoría");
  } finally {
    cliente.release();
  }
}

export async function activarCategoriaAdmin(req, res) {
  const idCategoria = entero(req.params.id);

  if (!idCategoria) {
    return res.status(400).json({
      ok: false,
      mensaje: "La categoría no es válida",
    });
  }

  try {
    const resultado = await pool.query(
      `
          UPDATE public.categoria_tour
          SET
            activo = true,
            fecha_actualizacion =
              CURRENT_TIMESTAMP
          WHERE id_categoria = $1
          RETURNING id_categoria
        `,
      [idCategoria],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Categoría no encontrada",
      });
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Categoría activada correctamente",
    });
  } catch (error) {
    return responderError(res, error, "No se pudo activar la categoría");
  }
}

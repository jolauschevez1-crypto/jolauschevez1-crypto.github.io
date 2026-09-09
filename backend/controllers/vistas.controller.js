import { pool } from "../config/db.js";

function errorServidor(res, error, mensaje) {
  console.error(mensaje, error);

  return res.status(500).json({
    ok: false,
    mensaje,
    detalle: error.message,
  });
}

export async function obtenerDisponibilidadTours(req, res) {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM vista_disponibilidad_tours ORDER BY fecha_tour",
    );
    return res.json({ ok: true, disponibilidad: rows });
  } catch (error) {
    return errorServidor(
      res,
      error,
      "No se pudo obtener la disponibilidad de tours",
    );
  }
}

export async function obtenerCalificacionTours(req, res) {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM vista_calificacion_tours ORDER BY calificacion_promedio DESC NULLS LAST",
    );
    return res.json({ ok: true, calificaciones: rows });
  } catch (error) {
    return errorServidor(
      res,
      error,
      "No se pudo obtener la calificación de los tours",
    );
  }
}

export async function obtenerIngresosMensuales(req, res) {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM vista_ingresos_mensuales ORDER BY mes",
    );
    return res.json({ ok: true, ingresos: rows });
  } catch (error) {
    return errorServidor(
      res,
      error,
      "No se pudo obtener los ingresos mensuales",
    );
  }
}

export async function obtenerResumenPagosEstado(req, res) {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM vista_resumen_pagos_estado",
    );
    return res.json({ ok: true, resumenPagos: rows });
  } catch (error) {
    return errorServidor(res, error, "No se pudo obtener el resumen de pagos");
  }
}

export async function obtenerCategoriasPopulares(req, res) {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM vista_categorias_populares",
    );
    return res.json({ ok: true, categorias: rows });
  } catch (error) {
    return errorServidor(
      res,
      error,
      "No se pudo obtener las categorías populares",
    );
  }
}

export async function obtenerToursBajoRendimiento(req, res) {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM vista_tours_bajo_rendimiento",
    );
    return res.json({ ok: true, toursBajoRendimiento: rows });
  } catch (error) {
    return errorServidor(
      res,
      error,
      "No se pudo obtener los tours de bajo rendimiento",
    );
  }
}

export async function obtenerProximosTours(req, res) {
  try {
    const { rows } = await pool.query("SELECT * FROM vista_proximos_tours");
    return res.json({ ok: true, proximosTours: rows });
  } catch (error) {
    return errorServidor(res, error, "No se pudo obtener los próximos tours");
  }
}

export async function obtenerClientesFrecuentes(req, res) {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM vista_clientes_frecuentes LIMIT 20",
    );
    return res.json({ ok: true, clientesFrecuentes: rows });
  } catch (error) {
    return errorServidor(
      res,
      error,
      "No se pudo obtener los clientes frecuentes",
    );
  }
}

export async function obtenerActividadReciente(req, res) {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM vista_actividad_reciente LIMIT 50",
    );
    return res.json({ ok: true, actividadReciente: rows });
  } catch (error) {
    return errorServidor(
      res,
      error,
      "No se pudo obtener la actividad reciente",
    );
  }
}

export async function obtenerPerfilCompletoUsuario(req, res) {
  const idUsuario = Number(req.params.id);

  if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
    return res
      .status(400)
      .json({ ok: false, mensaje: "id de usuario inválido" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT * FROM vista_perfil_completo_usuario WHERE id_usuario = $1",
      [idUsuario],
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, mensaje: "Usuario no encontrado" });
    }

    return res.json({ ok: true, perfil: rows[0] });
  } catch (error) {
    return errorServidor(
      res,
      error,
      "No se pudo obtener el perfil del usuario",
    );
  }
}

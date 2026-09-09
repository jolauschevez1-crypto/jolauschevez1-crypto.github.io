import { pool } from "../config/db.js";

function texto(valor, predeterminado = "") {
  const resultado = String(valor ?? "").trim();
  return resultado || predeterminado;
}

function entero(valor, permitirCero = false) {
  const numero = Number(valor);

  if (!Number.isInteger(numero)) {
    return null;
  }

  if (permitirCero ? numero < 0 : numero <= 0) {
    return null;
  }

  return numero;
}

function decimal(valor, predeterminado = null) {
  if (valor === undefined || valor === null || valor === "") {
    return predeterminado;
  }

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
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

function obtenerIdAdmin(req) {
  return entero(
    req.usuario?.idAdmin ??
      req.usuario?.id_admin ??
      req.usuario?.id ??
      req.usuario?.sub,
  );
}

function datosTour(body = {}, actual = {}) {
  return {
    idCategoria: entero(
      body.idCategoria ?? body.id_categoria ?? actual.id_categoria,
    ),
    nombre: texto(body.nombre ?? body.title ?? actual.nombre),
    descripcion: texto(
      body.descripcion ?? body.description ?? actual.descripcion,
    ),
    fechaTour: body.fechaTour ?? body.fecha_tour ?? actual.fecha_tour ?? null,
    cupoTotal: entero(body.cupoTotal ?? body.cupo_total ?? actual.cupo_total),
    precio: decimal(body.precio ?? body.precioNumerico ?? actual.precio),
    imagen: texto(body.imagen ?? body.image ?? actual.imagen),
    duracionHoras: decimal(
      body.duracionHoras ?? body.duracion_horas ?? actual.duracion_horas,
    ),
    puntoEncuentro: texto(
      body.puntoEncuentro ?? body.punto_encuentro ?? actual.punto_encuentro,
    ),
    idioma: texto(body.idioma ?? actual.idioma, "Español"),
    incluido: texto(body.incluido ?? actual.incluido),
    noIncluido: texto(
      body.noIncluido ?? body.no_incluido ?? actual.no_incluido,
    ),
    horasAnticipacion:
      entero(
        body.horasAnticipacion ??
          body.horas_anticipacion ??
          actual.horas_anticipacion ??
          9,
        true,
      ) ?? 9,
    tipoBono: texto(
      body.tipoBono ?? body.tipo_bono ?? actual.tipo_bono,
      "Electrónico, llévalo en tu teléfono",
    ),
    accesibilidad: texto(body.accesibilidad ?? actual.accesibilidad),
    sostenibilidad: texto(body.sostenibilidad ?? actual.sostenibilidad),
    indicaciones: texto(body.indicaciones ?? actual.indicaciones),
    precioMenor:
      decimal(
        body.precioMenor ?? body.precio_menor ?? actual.precio_menor,
        0,
      ) ?? 0,
    edadGratis:
      entero(
        body.edadGratis ?? body.edad_gratis ?? actual.edad_gratis ?? 4,
        true,
      ) ?? 4,
    activo: booleano(body.activo, actual.activo ?? true),
  };
}

function validarTour(datos) {
  const errores = [];

  if (!datos.idCategoria) errores.push("Selecciona una categoría");
  if (!datos.nombre) errores.push("El nombre es obligatorio");
  if (!datos.descripcion) errores.push("La descripción es obligatoria");
  if (!datos.fechaTour) errores.push("La fecha es obligatoria");
  if (!datos.cupoTotal) errores.push("El cupo debe ser mayor que cero");

  if (datos.precio === null || datos.precio <= 0) {
    errores.push("El precio debe ser mayor que cero");
  }

  if (datos.duracionHoras === null || datos.duracionHoras <= 0) {
    errores.push("La duración debe ser mayor que cero");
  }

  if (datos.precioMenor < 0) {
    errores.push("El precio del menor no puede ser negativo");
  }

  if (datos.horasAnticipacion < 0 || datos.edadGratis < 0) {
    errores.push("Las horas de anticipación y la edad deben ser válidas");
  }

  return errores;
}

function transformarTour(fila) {
  const precio = Number(fila.precio || 0);
  const duracion = Number(fila.duracion_horas || 0);

  return {
    id: Number(fila.id_tour),
    idTour: Number(fila.id_tour),
    idCategoria: Number(fila.id_categoria),
    categoria: fila.categoria || "",
    categoriaActiva: fila.categoria_activa !== false,
    nombre: fila.nombre,
    title: fila.nombre,
    descripcion: fila.descripcion || "",
    description: fila.descripcion || "",
    fechaTour: fila.fecha_tour,
    cupoTotal: Number(fila.cupo_total || 0),
    cuposDisponibles: Number(fila.cupos_disponibles ?? fila.cupo_total ?? 0),
    precio,
    precioNumerico: precio,
    price: `$${precio.toFixed(2)} por persona`,
    imagen: fila.imagen || "",
    image: fila.imagen || "",
    duracionHoras: duracion,
    duration: `${duracion} Horas`,
    puntoEncuentro: fila.punto_encuentro || "",
    idioma: fila.idioma || "Español",
    incluido: fila.incluido || "",
    noIncluido: fila.no_incluido || "",
    horasAnticipacion: Number(fila.horas_anticipacion ?? 9),
    tipoBono: fila.tipo_bono || "",
    accesibilidad: fila.accesibilidad || "",
    sostenibilidad: fila.sostenibilidad || "",
    indicaciones: fila.indicaciones || "",
    precioMenor: Number(fila.precio_menor || 0),
    edadGratis: Number(fila.edad_gratis ?? 4),
    activo: fila.activo !== false,
    fechaCreacion: fila.fecha_creacion,
    fechaActualizacion: fila.fecha_actualizacion,
  };
}

function consultaTours(condicion = "") {
  return `
    SELECT
      t.*,
      c.nombre AS categoria,
      c.activo AS categoria_activa,
      GREATEST(
        t.cupo_total - COALESCE(
          (
            SELECT SUM(r.cantidad_personas)
            FROM public.reserva r
            WHERE r.id_tour = t.id_tour
              AND r.fecha_tour = t.fecha_tour
              AND r.estado IN ('Pendiente', 'Confirmada')
          ),
          0
        ),
        0
      )::integer AS cupos_disponibles
    FROM public.tour t
    INNER JOIN public.categoria_tour c
      ON c.id_categoria = t.id_categoria
    ${condicion}
  `;
}

async function categoriaActiva(idCategoria) {
  const resultado = await pool.query(
    `
      SELECT id_categoria
      FROM public.categoria_tour
      WHERE id_categoria = $1
        AND activo = true
    `,
    [idCategoria],
  );

  return resultado.rowCount > 0;
}

function responderError(res, error, mensaje) {
  console.error(mensaje, error);

  if (error.code === "23503") {
    return res.status(400).json({
      ok: false,
      mensaje: "La categoría seleccionada no existe",
    });
  }

  return res.status(500).json({
    ok: false,
    mensaje,
    detalle: error.message,
  });
}

export async function listarToursAdmin(req, res) {
  try {
    const resultado = await pool.query(`
      ${consultaTours()}
      ORDER BY t.activo DESC, t.id_tour DESC
    `);

    return res.status(200).json({
      ok: true,
      total: resultado.rows.length,
      tours: resultado.rows.map(transformarTour),
    });
  } catch (error) {
    return responderError(res, error, "No se pudieron cargar los tours");
  }
}

export async function obtenerTourAdmin(req, res) {
  const idTour = entero(req.params.id);

  if (!idTour) {
    return res.status(400).json({ ok: false, mensaje: "El tour no es válido" });
  }

  try {
    const resultado = await pool.query(
      `${consultaTours("WHERE t.id_tour = $1")}`,
      [idTour],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ ok: false, mensaje: "Tour no encontrado" });
    }

    return res.status(200).json({
      ok: true,
      tour: transformarTour(resultado.rows[0]),
    });
  } catch (error) {
    return responderError(res, error, "No se pudo cargar el tour");
  }
}

export async function crearTourAdmin(req, res) {
  const datos = datosTour(req.body);
  const errores = validarTour(datos);

  if (errores.length) {
    return res.status(400).json({
      ok: false,
      mensaje: "Completa correctamente el formulario",
      errores,
    });
  }

  try {
    if (!(await categoriaActiva(datos.idCategoria))) {
      return res.status(400).json({
        ok: false,
        mensaje: "Selecciona una categoría activa",
      });
    }

    const resultado = await pool.query(
      `
        INSERT INTO public.tour (
          id_categoria,
          nombre,
          descripcion,
          fecha_tour,
          cupo_total,
          precio,
          id_admin,
          imagen,
          duracion_horas,
          punto_encuentro,
          idioma,
          incluido,
          no_incluido,
          horas_anticipacion,
          tipo_bono,
          accesibilidad,
          sostenibilidad,
          indicaciones,
          precio_menor,
          edad_gratis,
          activo,
          fecha_creacion,
          fecha_actualizacion
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING id_tour
      `,
      [
        datos.idCategoria,
        datos.nombre,
        datos.descripcion,
        datos.fechaTour,
        datos.cupoTotal,
        datos.precio,
        obtenerIdAdmin(req),
        datos.imagen || null,
        datos.duracionHoras,
        datos.puntoEncuentro || null,
        datos.idioma,
        datos.incluido || null,
        datos.noIncluido || null,
        datos.horasAnticipacion,
        datos.tipoBono || null,
        datos.accesibilidad || null,
        datos.sostenibilidad || null,
        datos.indicaciones || null,
        datos.precioMenor,
        datos.edadGratis,
        datos.activo,
      ],
    );

    return res.status(201).json({
      ok: true,
      mensaje: "Tour creado correctamente",
      idTour: resultado.rows[0].id_tour,
    });
  } catch (error) {
    return responderError(res, error, "No se pudo crear el tour");
  }
}

export async function actualizarTourAdmin(req, res) {
  const idTour = entero(req.params.id);

  if (!idTour) {
    return res.status(400).json({ ok: false, mensaje: "El tour no es válido" });
  }

  try {
    const actual = await pool.query(
      "SELECT * FROM public.tour WHERE id_tour = $1",
      [idTour],
    );

    if (actual.rowCount === 0) {
      return res.status(404).json({ ok: false, mensaje: "Tour no encontrado" });
    }

    const datos = datosTour(req.body, actual.rows[0]);
    const errores = validarTour(datos);

    if (errores.length) {
      return res.status(400).json({
        ok: false,
        mensaje: "Completa correctamente el formulario",
        errores,
      });
    }

    if (!(await categoriaActiva(datos.idCategoria))) {
      return res.status(400).json({
        ok: false,
        mensaje: "Selecciona una categoría activa",
      });
    }

    await pool.query(
      `
        UPDATE public.tour
        SET
          id_categoria = $1,
          nombre = $2,
          descripcion = $3,
          fecha_tour = $4,
          cupo_total = $5,
          precio = $6,
          id_admin = $7,
          imagen = $8,
          duracion_horas = $9,
          punto_encuentro = $10,
          idioma = $11,
          incluido = $12,
          no_incluido = $13,
          horas_anticipacion = $14,
          tipo_bono = $15,
          accesibilidad = $16,
          sostenibilidad = $17,
          indicaciones = $18,
          precio_menor = $19,
          edad_gratis = $20,
          activo = $21,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_tour = $22
      `,
      [
        datos.idCategoria,
        datos.nombre,
        datos.descripcion,
        datos.fechaTour,
        datos.cupoTotal,
        datos.precio,
        obtenerIdAdmin(req),
        datos.imagen || null,
        datos.duracionHoras,
        datos.puntoEncuentro || null,
        datos.idioma,
        datos.incluido || null,
        datos.noIncluido || null,
        datos.horasAnticipacion,
        datos.tipoBono || null,
        datos.accesibilidad || null,
        datos.sostenibilidad || null,
        datos.indicaciones || null,
        datos.precioMenor,
        datos.edadGratis,
        datos.activo,
        idTour,
      ],
    );

    return res.status(200).json({
      ok: true,
      mensaje: "Tour actualizado correctamente",
    });
  } catch (error) {
    return responderError(res, error, "No se pudo actualizar el tour");
  }
}

export async function desactivarTourAdmin(req, res) {
  const idTour = entero(req.params.id);

  if (!idTour) {
    return res.status(400).json({ ok: false, mensaje: "El tour no es válido" });
  }

  try {
    const resultado = await pool.query(
      `
        UPDATE public.tour
        SET activo = false,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_tour = $1
        RETURNING id_tour
      `,
      [idTour],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ ok: false, mensaje: "Tour no encontrado" });
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Tour desactivado correctamente",
    });
  } catch (error) {
    return responderError(res, error, "No se pudo desactivar el tour");
  }
}

export async function activarTourAdmin(req, res) {
  const idTour = entero(req.params.id);

  if (!idTour) {
    return res.status(400).json({ ok: false, mensaje: "El tour no es válido" });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado = await cliente.query(
      `
        SELECT
          t.id_tour,
          c.activo AS categoria_activa
        FROM public.tour t
        INNER JOIN public.categoria_tour c
          ON c.id_categoria = t.id_categoria
        WHERE t.id_tour = $1
        FOR UPDATE OF t, c
      `,
      [idTour],
    );

    if (resultado.rowCount === 0) {
      await cliente.query("ROLLBACK");
      return res.status(404).json({ ok: false, mensaje: "Tour no encontrado" });
    }

    if (!resultado.rows[0].categoria_activa) {
      await cliente.query("ROLLBACK");
      return res.status(409).json({
        ok: false,
        mensaje: "Activa primero la categoría del tour",
      });
    }

    await cliente.query(
      `
        UPDATE public.tour
        SET activo = true,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_tour = $1
      `,
      [idTour],
    );

    await cliente.query("COMMIT");

    return res.status(200).json({
      ok: true,
      mensaje: "Tour activado correctamente",
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    return responderError(res, error, "No se pudo activar el tour");
  } finally {
    cliente.release();
  }
}

import bcrypt from "bcrypt";
import { pool } from "../config/db.js";

const ESTADOS_RESERVA = ["Pendiente", "Confirmada", "Cancelada"];
const ESTADOS_PAGO = ["pendiente", "pagado", "rechazado", "reembolsado"];
const METODOS_PAGO = ["tarjeta", "transferencia", "efectivo"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(valor) {
  return String(valor ?? "").trim();
}

function entero(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function decimal(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function idAdmin(req) {
  return entero(
    req.usuario?.idAdmin ||
      req.usuario?.id_admin ||
      req.usuario?.id ||
      req.usuario?.sub,
  );
}

function estadoReserva(valor) {
  const estado = texto(valor).toLowerCase();
  if (estado === "confirmada") return "Confirmada";
  if (estado === "cancelada") return "Cancelada";
  return "Pendiente";
}

function booleano(valor, predeterminado = true) {
  if (valor === undefined || valor === null || valor === "") {
    return predeterminado;
  }

  if (typeof valor === "boolean") return valor;

  return ["true", "1", "si", "sí", "activo"].includes(
    texto(valor).toLowerCase(),
  );
}

function errorServidor(res, error, mensaje) {
  console.error(mensaje, error);
  return res.status(500).json({
    ok: false,
    mensaje,
    detalle: error.message,
  });
}

export async function obtenerDashboard(req, res) {
  try {
    const resumen = await pool.query(`
      SELECT
        (SELECT COUNT(*)::integer FROM public.usuario WHERE activo = true)
          AS usuarios,
        (SELECT COUNT(*)::integer FROM public.tour WHERE activo = true)
          AS tours,
        (SELECT COUNT(*)::integer FROM public.reserva)
          AS reservas,
        (
          SELECT COUNT(*)::integer
          FROM public.reserva
          WHERE LOWER(estado) = 'pendiente'
        ) AS reservas_pendientes,
        (
          SELECT COUNT(*)::integer
          FROM public.reserva
          WHERE LOWER(estado) = 'confirmada'
        ) AS reservas_confirmadas,
        (
          SELECT COUNT(*)::integer
          FROM public.pago
          WHERE estado_pago = 'pendiente'
        ) AS pagos_pendientes,
        (
          SELECT COALESCE(SUM(monto), 0)
          FROM public.pago
          WHERE estado_pago = 'pagado'
        ) AS ingresos
    `);

    const ultimas = await pool.query(`
      SELECT
        r.id_reserva,
        CONCAT_WS(' ', u.nombre, u.apellido) AS usuario,
        t.nombre AS tour,
        r.fecha_tour,
        r.cantidad_personas,
        r.precio_total,
        r.estado
      FROM public.reserva r
      INNER JOIN public.usuario u
        ON u.id_usuario = r.id_usuario
      INNER JOIN public.tour t
        ON t.id_tour = r.id_tour
      ORDER BY r.fecha_creacion DESC, r.id_reserva DESC
      LIMIT 5
    `);

    return res.status(200).json({
      ok: true,
      dashboard: {
        ...resumen.rows[0],
        ingresos: Number(resumen.rows[0].ingresos || 0),
      },
      ultimasReservas: ultimas.rows,
    });
  } catch (error) {
    return errorServidor(res, error, "No se pudo cargar el dashboard");
  }
}

export async function obtenerPerfilAdmin(req, res) {
  const id = idAdmin(req);

  if (!id) {
    return res.status(401).json({
      ok: false,
      mensaje: "Sesión administrativa no válida",
    });
  }

  try {
    const resultado = await pool.query(
      `
        SELECT
          id_admin,
          nombre,
          correo,
          activo,
          fecha_creacion,
          fecha_actualizacion
        FROM public.administrador
        WHERE id_admin = $1
      `,
      [id],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Administrador no encontrado",
      });
    }

    return res.status(200).json({
      ok: true,
      administrador: resultado.rows[0],
    });
  } catch (error) {
    return errorServidor(res, error, "No se pudo cargar el perfil");
  }
}

export async function actualizarPerfilAdmin(req, res) {
  const id = idAdmin(req);
  const nombre = texto(req.body.nombre);
  const correo = texto(req.body.correo).toLowerCase();

  if (!id) {
    return res.status(401).json({
      ok: false,
      mensaje: "Sesión administrativa no válida",
    });
  }

  if (!nombre || !EMAIL_REGEX.test(correo)) {
    return res.status(400).json({
      ok: false,
      mensaje: "Nombre o correo no válido",
    });
  }

  try {
    const resultado = await pool.query(
      `
        UPDATE public.administrador
        SET
          nombre = $1,
          correo = $2,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_admin = $3
        RETURNING
          id_admin,
          nombre,
          correo,
          activo,
          fecha_creacion,
          fecha_actualizacion
      `,
      [nombre, correo, id],
    );

    return res.status(200).json({
      ok: true,
      mensaje: "Perfil actualizado correctamente",
      administrador: resultado.rows[0],
    });
  } catch (error) {
    return res.status(error.code === "23505" ? 409 : 500).json({
      ok: false,
      mensaje:
        error.code === "23505"
          ? "El correo ya está registrado"
          : "No se pudo actualizar el perfil",
      detalle: error.message,
    });
  }
}

export async function cambiarPasswordAdmin(req, res) {
  const id = idAdmin(req);
  const actual = String(req.body.passwordActual || "");
  const nueva = String(req.body.passwordNueva || "");

  if (!id) {
    return res.status(401).json({
      ok: false,
      mensaje: "Sesión administrativa no válida",
    });
  }

  if (!actual || nueva.length < 8) {
    return res.status(400).json({
      ok: false,
      mensaje: "La nueva contraseña debe tener mínimo 8 caracteres",
    });
  }

  try {
    const resultado = await pool.query(
      `SELECT password_hash FROM public.administrador WHERE id_admin = $1`,
      [id],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Administrador no encontrado",
      });
    }

    const coincide = await bcrypt.compare(
      actual,
      resultado.rows[0].password_hash,
    );

    if (!coincide) {
      return res.status(401).json({
        ok: false,
        mensaje: "La contraseña actual es incorrecta",
      });
    }

    const hash = await bcrypt.hash(nueva, 12);

    await pool.query(
      `
        UPDATE public.administrador
        SET
          password_hash = $1,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_admin = $2
      `,
      [hash, id],
    );

    return res.status(200).json({
      ok: true,
      mensaje: "Contraseña actualizada correctamente",
    });
  } catch (error) {
    return errorServidor(res, error, "No se pudo cambiar la contraseña");
  }
}

export async function listarUsuariosAdmin(req, res) {
  try {
    const resultado = await pool.query(`
      SELECT
        id_usuario,
        nombre,
        apellido,
        correo,
        telefono,
        foto_perfil,
        activo,
        fecha_creacion,
        fecha_actualizacion
      FROM public.usuario
      ORDER BY id_usuario DESC
    `);

    return res.status(200).json({
      ok: true,
      total: resultado.rows.length,
      usuarios: resultado.rows,
    });
  } catch (error) {
    return errorServidor(res, error, "No se pudieron cargar los usuarios");
  }
}

export async function obtenerUsuarioAdmin(req, res) {
  const id = entero(req.params.id);

  try {
    const resultado = await pool.query(
      `
        SELECT
          id_usuario,
          nombre,
          apellido,
          correo,
          telefono,
          foto_perfil,
          activo,
          fecha_creacion,
          fecha_actualizacion
        FROM public.usuario
        WHERE id_usuario = $1
      `,
      [id],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    return res.status(200).json({
      ok: true,
      usuario: resultado.rows[0],
    });
  } catch (error) {
    return errorServidor(res, error, "No se pudo cargar el usuario");
  }
}

export async function crearUsuarioAdmin(req, res) {
  const nombre = texto(req.body.nombre);
  const apellido = texto(req.body.apellido);
  const correo = texto(req.body.correo || req.body.email).toLowerCase();
  const telefono = texto(req.body.telefono);
  const password = String(req.body.password || req.body.contrasena || "");

  if (
    !nombre ||
    !apellido ||
    !EMAIL_REGEX.test(correo) ||
    password.length < 8
  ) {
    return res.status(400).json({
      ok: false,
      mensaje:
        "Completa nombre, apellido, correo y una contraseña de 8 caracteres",
    });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const resultado = await pool.query(
      `
        INSERT INTO public.usuario (
          nombre,
          apellido,
          correo,
          password_hash,
          telefono,
          foto_perfil,
          activo,
          fecha_creacion,
          fecha_actualizacion
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING
          id_usuario,
          nombre,
          apellido,
          correo,
          telefono,
          foto_perfil,
          activo
      `,
      [
        nombre,
        apellido,
        correo,
        hash,
        telefono || null,
        texto(req.body.fotoPerfil || req.body.foto_perfil) || null,
        booleano(req.body.activo, true),
      ],
    );

    return res.status(201).json({
      ok: true,
      mensaje: "Usuario creado correctamente",
      usuario: resultado.rows[0],
    });
  } catch (error) {
    return res.status(error.code === "23505" ? 409 : 500).json({
      ok: false,
      mensaje:
        error.code === "23505"
          ? "El correo ya está registrado"
          : "No se pudo crear el usuario",
      detalle: error.message,
    });
  }
}

export async function actualizarUsuarioAdmin(req, res) {
  const id = entero(req.params.id);

  try {
    const actual = await pool.query(
      `SELECT * FROM public.usuario WHERE id_usuario = $1`,
      [id],
    );

    if (actual.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    const fila = actual.rows[0];
    const nombre = texto(req.body.nombre ?? fila.nombre);
    const apellido = texto(req.body.apellido ?? fila.apellido);
    const correo = texto(req.body.correo ?? fila.correo).toLowerCase();
    const telefono = texto(req.body.telefono ?? fila.telefono);
    const password = String(req.body.password || "");
    const hash = password
      ? await bcrypt.hash(password, 12)
      : fila.password_hash;

    if (!nombre || !apellido || !EMAIL_REGEX.test(correo)) {
      return res.status(400).json({
        ok: false,
        mensaje: "Nombre, apellido o correo no válido",
      });
    }

    await pool.query(
      `
        UPDATE public.usuario
        SET
          nombre = $1,
          apellido = $2,
          correo = $3,
          password_hash = $4,
          telefono = $5,
          foto_perfil = $6,
          activo = $7,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_usuario = $8
      `,
      [
        nombre,
        apellido,
        correo,
        hash,
        telefono || null,
        texto(
          req.body.fotoPerfil ?? req.body.foto_perfil ?? fila.foto_perfil,
        ) || null,
        booleano(req.body.activo, fila.activo),
        id,
      ],
    );

    return res.status(200).json({
      ok: true,
      mensaje: "Usuario actualizado correctamente",
    });
  } catch (error) {
    return res.status(error.code === "23505" ? 409 : 500).json({
      ok: false,
      mensaje:
        error.code === "23505"
          ? "El correo ya está registrado"
          : "No se pudo actualizar el usuario",
      detalle: error.message,
    });
  }
}

export async function eliminarUsuarioAdmin(req, res) {
  const id = entero(req.params.id);

  try {
    const resultado = await pool.query(
      `
        UPDATE public.usuario
        SET
          activo = false,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_usuario = $1
        RETURNING id_usuario
      `,
      [id],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Usuario desactivado correctamente",
    });
  } catch (error) {
    return errorServidor(res, error, "No se pudo desactivar el usuario");
  }
}

function transformarTour(fila) {
  const precio = Number(fila.precio || 0);
  const duracion = Number(fila.duracion_horas || 0);

  return {
    id: Number(fila.id_tour),
    idTour: Number(fila.id_tour),
    idCategoria: Number(fila.id_categoria),
    categoria: fila.categoria || "",
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
    activo: fila.activo !== false,
  };
}

function datosTour(body, actual = {}) {
  return {
    idCategoria: entero(
      body.idCategoria ?? body.id_categoria ?? actual.id_categoria,
    ),
    nombre: texto(body.nombre ?? body.title ?? actual.nombre),
    descripcion: texto(
      body.descripcion ?? body.description ?? actual.descripcion,
    ),
    fechaTour: body.fechaTour ?? body.fecha_tour ?? actual.fecha_tour,
    cupoTotal: entero(body.cupoTotal ?? body.cupo_total ?? actual.cupo_total),
    precio: decimal(body.precio ?? body.precioNumerico ?? actual.precio),
    imagen: texto(body.imagen ?? body.image ?? actual.imagen),
    duracionHoras: decimal(
      body.duracionHoras ?? body.duracion_horas ?? actual.duracion_horas,
    ),
    puntoEncuentro: texto(
      body.puntoEncuentro ?? body.punto_encuentro ?? actual.punto_encuentro,
    ),
    activo: booleano(body.activo, actual.activo ?? true),
  };
}

function validarTour(datos) {
  return Boolean(
    datos.idCategoria &&
    datos.nombre &&
    datos.descripcion &&
    datos.fechaTour &&
    datos.cupoTotal &&
    datos.precio !== null &&
    datos.precio > 0 &&
    datos.duracionHoras !== null &&
    datos.duracionHoras > 0,
  );
}

export async function listarCategoriasAdmin(req, res) {
  try {
    const resultado = await pool.query(`
      SELECT id_categoria, nombre, descripcion
      FROM public.categoria_tour
      ORDER BY nombre
    `);

    return res.status(200).json({
      ok: true,
      categorias: resultado.rows,
    });
  } catch (error) {
    return errorServidor(res, error, "No se pudieron cargar las categorías");
  }
}

export async function listarToursAdmin(req, res) {
  try {
    const resultado = await pool.query(`
      SELECT v.*
      FROM public.vista_tours_api v
      ORDER BY v.id_tour DESC
    `);

    return res.status(200).json({
      ok: true,
      total: resultado.rows.length,
      tours: resultado.rows.map(transformarTour),
    });
  } catch (error) {
    return errorServidor(res, error, "No se pudieron cargar los tours");
  }
}

export async function obtenerTourAdmin(req, res) {
  const id = entero(req.params.id);

  try {
    const resultado = await pool.query(
      `SELECT * FROM public.vista_tours_api WHERE id_tour = $1`,
      [id],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Tour no encontrado",
      });
    }

    return res.status(200).json({
      ok: true,
      tour: transformarTour(resultado.rows[0]),
    });
  } catch (error) {
    return errorServidor(res, error, "No se pudo cargar el tour");
  }
}

export async function crearTourAdmin(req, res) {
  const datos = datosTour(req.body);

  if (!validarTour(datos)) {
    return res.status(400).json({
      ok: false,
      mensaje: "Completa correctamente todos los datos del tour",
    });
  }

  try {
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
          activo,
          fecha_creacion,
          fecha_actualizacion
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id_tour
      `,
      [
        datos.idCategoria,
        datos.nombre,
        datos.descripcion,
        datos.fechaTour,
        datos.cupoTotal,
        datos.precio,
        idAdmin(req),
        datos.imagen || null,
        datos.duracionHoras,
        datos.puntoEncuentro || null,
        datos.activo,
      ],
    );

    return res.status(201).json({
      ok: true,
      mensaje: "Tour creado correctamente",
      idTour: resultado.rows[0].id_tour,
    });
  } catch (error) {
    return res.status(error.code === "23503" ? 400 : 500).json({
      ok: false,
      mensaje:
        error.code === "23503"
          ? "La categoría seleccionada no existe"
          : "No se pudo crear el tour",
      detalle: error.message,
    });
  }
}

export async function actualizarTourAdmin(req, res) {
  const id = entero(req.params.id);

  try {
    const actual = await pool.query(
      `SELECT * FROM public.tour WHERE id_tour = $1`,
      [id],
    );

    if (actual.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Tour no encontrado",
      });
    }

    const datos = datosTour(req.body, actual.rows[0]);

    if (!validarTour(datos)) {
      return res.status(400).json({
        ok: false,
        mensaje: "Completa correctamente todos los datos del tour",
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
          activo = $11,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_tour = $12
      `,
      [
        datos.idCategoria,
        datos.nombre,
        datos.descripcion,
        datos.fechaTour,
        datos.cupoTotal,
        datos.precio,
        idAdmin(req),
        datos.imagen || null,
        datos.duracionHoras,
        datos.puntoEncuentro || null,
        datos.activo,
        id,
      ],
    );

    return res.status(200).json({
      ok: true,
      mensaje: "Tour actualizado correctamente",
    });
  } catch (error) {
    return errorServidor(res, error, "No se pudo actualizar el tour");
  }
}

export async function eliminarTourAdmin(req, res) {
  const id = entero(req.params.id);

  try {
    const resultado = await pool.query(
      `
        UPDATE public.tour
        SET
          activo = false,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_tour = $1
        RETURNING id_tour
      `,
      [id],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Tour no encontrado",
      });
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Tour desactivado correctamente",
    });
  } catch (error) {
    return errorServidor(res, error, "No se pudo desactivar el tour");
  }
}

function consultaReservas(condicion = "") {
  return `
    SELECT
      r.id_reserva,
      r.id_usuario,
      CONCAT_WS(' ', u.nombre, u.apellido) AS nombre_usuario,
      u.correo AS correo_usuario,
      r.id_tour,
      t.nombre AS nombre_tour,
      t.imagen,
      r.fecha_creacion,
      r.fecha_tour,
      r.cantidad_personas,
      r.precio_unitario,
      r.precio_total,
      r.estado,
      p.id_pago,
      p.estado_pago
    FROM public.reserva r
    INNER JOIN public.usuario u
      ON u.id_usuario = r.id_usuario
    INNER JOIN public.tour t
      ON t.id_tour = r.id_tour
    LEFT JOIN public.pago p
      ON p.id_reserva = r.id_reserva
    ${condicion}
  `;
}

async function comprobarCupos(
  cliente,
  idTour,
  fechaTour,
  cantidad,
  excluirId = null,
) {
  const tour = await cliente.query(
    `
      SELECT id_tour, nombre, cupo_total, precio, activo
      FROM public.tour
      WHERE id_tour = $1
      FOR UPDATE
    `,
    [idTour],
  );

  if (tour.rowCount === 0) {
    return { ok: false, mensaje: "El tour no existe" };
  }

  if (tour.rows[0].activo === false) {
    return { ok: false, mensaje: "El tour está desactivado" };
  }

  const resultado = await cliente.query(
    `
      SELECT COALESCE(SUM(cantidad_personas), 0)::integer AS total
      FROM public.reserva
      WHERE id_tour = $1
        AND fecha_tour = $2
        AND LOWER(estado) IN ('pendiente', 'confirmada')
        AND ($3::integer IS NULL OR id_reserva <> $3)
    `,
    [idTour, fechaTour, excluirId],
  );

  const disponibles =
    Number(tour.rows[0].cupo_total) - Number(resultado.rows[0].total);

  if (cantidad > disponibles) {
    return {
      ok: false,
      mensaje: `Solo quedan ${Math.max(disponibles, 0)} cupos para esa fecha`,
    };
  }

  return { ok: true, tour: tour.rows[0] };
}

export async function listarReservasAdmin(req, res) {
  try {
    const resultado = await pool.query(`
      ${consultaReservas()}
      ORDER BY r.fecha_creacion DESC, r.id_reserva DESC
    `);

    return res.status(200).json({
      ok: true,
      total: resultado.rows.length,
      reservas: resultado.rows,
    });
  } catch (error) {
    return errorServidor(res, error, "No se pudieron cargar las reservas");
  }
}

export async function obtenerReservaAdmin(req, res) {
  const id = entero(req.params.id);

  try {
    const resultado = await pool.query(
      `${consultaReservas("WHERE r.id_reserva = $1")}`,
      [id],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Reserva no encontrada",
      });
    }

    return res.status(200).json({
      ok: true,
      reserva: resultado.rows[0],
    });
  } catch (error) {
    return errorServidor(res, error, "No se pudo cargar la reserva");
  }
}

export async function crearReservaAdmin(req, res) {
  const idUsuario = entero(req.body.idUsuario ?? req.body.id_usuario);
  const idTour = entero(req.body.idTour ?? req.body.id_tour);
  const cantidad = entero(
    req.body.cantidadPersonas ?? req.body.cantidad_personas,
  );
  const fechaTour = req.body.fechaTour ?? req.body.fecha_tour;
  const estado = estadoReserva(req.body.estado);

  if (!idUsuario || !idTour || !cantidad || !fechaTour) {
    return res.status(400).json({
      ok: false,
      mensaje: "Completa usuario, tour, fecha y cantidad",
    });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const usuario = await cliente.query(
      `SELECT id_usuario FROM public.usuario WHERE id_usuario = $1 AND activo = true`,
      [idUsuario],
    );

    if (usuario.rowCount === 0) {
      await cliente.query("ROLLBACK");
      return res.status(400).json({
        ok: false,
        mensaje: "El usuario no existe o está inactivo",
      });
    }

    const cupos = await comprobarCupos(cliente, idTour, fechaTour, cantidad);

    if (!cupos.ok) {
      await cliente.query("ROLLBACK");
      return res.status(409).json({
        ok: false,
        mensaje: cupos.mensaje,
      });
    }

    const resultado = await cliente.query(
      `
        INSERT INTO public.reserva (
          id_usuario,
          id_tour,
          fecha_creacion,
          cantidad_personas,
          estado,
          fecha_tour,
          precio_unitario,
          fecha_actualizacion
        )
        VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        RETURNING id_reserva
      `,
      [idUsuario, idTour, cantidad, estado, fechaTour, cupos.tour.precio],
    );

    await cliente.query("COMMIT");

    return res.status(201).json({
      ok: true,
      mensaje: "Reserva creada correctamente",
      idReserva: resultado.rows[0].id_reserva,
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    return errorServidor(res, error, "No se pudo crear la reserva");
  } finally {
    cliente.release();
  }
}

export async function actualizarReservaAdmin(req, res) {
  const id = entero(req.params.id);
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const actual = await cliente.query(
      `SELECT * FROM public.reserva WHERE id_reserva = $1 FOR UPDATE`,
      [id],
    );

    if (actual.rowCount === 0) {
      await cliente.query("ROLLBACK");
      return res.status(404).json({
        ok: false,
        mensaje: "Reserva no encontrada",
      });
    }

    const fila = actual.rows[0];
    const idUsuario = entero(
      req.body.idUsuario ?? req.body.id_usuario ?? fila.id_usuario,
    );
    const idTour = entero(req.body.idTour ?? req.body.id_tour ?? fila.id_tour);
    const cantidad = entero(
      req.body.cantidadPersonas ??
        req.body.cantidad_personas ??
        fila.cantidad_personas,
    );
    const fechaTour =
      req.body.fechaTour ?? req.body.fecha_tour ?? fila.fecha_tour;
    const estado = estadoReserva(req.body.estado ?? fila.estado);

    const cupos = await comprobarCupos(
      cliente,
      idTour,
      fechaTour,
      cantidad,
      id,
    );

    if (!cupos.ok) {
      await cliente.query("ROLLBACK");
      return res.status(409).json({
        ok: false,
        mensaje: cupos.mensaje,
      });
    }

    await cliente.query(
      `
        UPDATE public.reserva
        SET
          id_usuario = $1,
          id_tour = $2,
          cantidad_personas = $3,
          estado = $4,
          fecha_tour = $5,
          precio_unitario = $6,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_reserva = $7
      `,
      [idUsuario, idTour, cantidad, estado, fechaTour, cupos.tour.precio, id],
    );

    await cliente.query("COMMIT");

    return res.status(200).json({
      ok: true,
      mensaje: "Reserva actualizada correctamente",
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    return errorServidor(res, error, "No se pudo actualizar la reserva");
  } finally {
    cliente.release();
  }
}

export async function eliminarReservaAdmin(req, res) {
  const id = entero(req.params.id);
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado = await cliente.query(
      `
        UPDATE public.reserva
        SET
          estado = 'Cancelada',
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_reserva = $1
        RETURNING id_reserva
      `,
      [id],
    );

    if (resultado.rowCount === 0) {
      await cliente.query("ROLLBACK");
      return res.status(404).json({
        ok: false,
        mensaje: "Reserva no encontrada",
      });
    }

    await cliente.query(
      `
        UPDATE public.pago
        SET
          estado_pago = 'rechazado',
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_reserva = $1
          AND estado_pago = 'pendiente'
      `,
      [id],
    );

    await cliente.query("COMMIT");

    return res.status(200).json({
      ok: true,
      mensaje: "Reserva cancelada correctamente",
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    return errorServidor(res, error, "No se pudo cancelar la reserva");
  } finally {
    cliente.release();
  }
}

function consultaPagos(condicion = "") {
  return `
    SELECT
      p.id_pago,
      p.id_reserva,
      p.monto,
      p.fecha_pago,
      p.metodo_pago,
      p.estado_pago,
      p.referencia,
      p.fecha_creacion,
      p.fecha_actualizacion,
      r.id_usuario,
      CONCAT_WS(' ', u.nombre, u.apellido) AS nombre_usuario,
      u.correo AS correo_usuario,
      r.id_tour,
      t.nombre AS nombre_tour,
      r.fecha_tour,
      r.estado AS estado_reserva
    FROM public.pago p
    INNER JOIN public.reserva r
      ON r.id_reserva = p.id_reserva
    INNER JOIN public.usuario u
      ON u.id_usuario = r.id_usuario
    INNER JOIN public.tour t
      ON t.id_tour = r.id_tour
    ${condicion}
  `;
}

async function aplicarEstadoPago(idPago, nuevoEstado) {
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
          ON r.id_reserva = p.id_reserva
        WHERE p.id_pago = $1
        FOR UPDATE OF p, r
      `,
      [idPago],
    );

    if (resultado.rowCount === 0) {
      await cliente.query("ROLLBACK");
      return {
        ok: false,
        status: 404,
        mensaje: "Pago no encontrado",
      };
    }

    const pago = resultado.rows[0];

    if (
      nuevoEstado === "pagado" &&
      texto(pago.estado_reserva).toLowerCase() === "cancelada"
    ) {
      await cliente.query("ROLLBACK");
      return {
        ok: false,
        status: 409,
        mensaje: "No se puede aprobar una reserva cancelada",
      };
    }

    await cliente.query(
      `
        UPDATE public.pago
        SET
          estado_pago = $1,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_pago = $2
      `,
      [nuevoEstado, idPago],
    );

    if (nuevoEstado === "pagado") {
      await cliente.query(
        `
          UPDATE public.reserva
          SET
            estado = 'Confirmada',
            fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id_reserva = $1
        `,
        [pago.id_reserva],
      );
    }

    if (nuevoEstado === "rechazado") {
      await cliente.query(
        `
          UPDATE public.reserva
          SET
            estado = 'Pendiente',
            fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id_reserva = $1
            AND LOWER(estado) <> 'cancelada'
        `,
        [pago.id_reserva],
      );
    }

    if (nuevoEstado === "reembolsado") {
      await cliente.query(
        `
          UPDATE public.reserva
          SET
            estado = 'Cancelada',
            fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id_reserva = $1
        `,
        [pago.id_reserva],
      );
    }

    await cliente.query("COMMIT");

    const mensajes = {
      pagado: "Pago aprobado y reserva confirmada",
      rechazado: "Pago rechazado",
      reembolsado: "Pago reembolsado y reserva cancelada",
    };

    return {
      ok: true,
      status: 200,
      mensaje: mensajes[nuevoEstado] || "Estado actualizado",
    };
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

export async function listarPagosAdmin(req, res) {
  try {
    const resultado = await pool.query(`
      ${consultaPagos()}
      ORDER BY
        CASE p.estado_pago
          WHEN 'pendiente' THEN 1
          WHEN 'rechazado' THEN 2
          WHEN 'pagado' THEN 3
          ELSE 4
        END,
        p.id_pago DESC
    `);

    return res.status(200).json({
      ok: true,
      total: resultado.rows.length,
      pagos: resultado.rows,
    });
  } catch (error) {
    return errorServidor(res, error, "No se pudieron cargar los pagos");
  }
}

export async function obtenerPagoAdmin(req, res) {
  const id = entero(req.params.id);

  try {
    const resultado = await pool.query(
      `${consultaPagos("WHERE p.id_pago = $1")}`,
      [id],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Pago no encontrado",
      });
    }

    return res.status(200).json({
      ok: true,
      pago: resultado.rows[0],
    });
  } catch (error) {
    return errorServidor(res, error, "No se pudo cargar el pago");
  }
}

export async function crearPagoAdmin(req, res) {
  const idReserva = entero(req.body.idReserva ?? req.body.id_reserva);
  const metodo = texto(
    req.body.metodoPago ?? req.body.metodo_pago,
  ).toLowerCase();
  const estado = texto(
    req.body.estadoPago ?? req.body.estado_pago ?? "pendiente",
  ).toLowerCase();
  const referencia = texto(req.body.referencia) || `ADMIN-${Date.now()}`;

  if (
    !idReserva ||
    !METODOS_PAGO.includes(metodo) ||
    !ESTADOS_PAGO.includes(estado)
  ) {
    return res.status(400).json({
      ok: false,
      mensaje: "Reserva, método o estado no válido",
    });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const reserva = await cliente.query(
      `
        SELECT id_reserva, precio_total, estado
        FROM public.reserva
        WHERE id_reserva = $1
        FOR UPDATE
      `,
      [idReserva],
    );

    if (reserva.rowCount === 0) {
      await cliente.query("ROLLBACK");
      return res.status(404).json({
        ok: false,
        mensaje: "Reserva no encontrada",
      });
    }

    const existente = await cliente.query(
      `
        SELECT id_pago
        FROM public.pago
        WHERE id_reserva = $1
        FOR UPDATE
      `,
      [idReserva],
    );

    if (existente.rowCount > 0) {
      await cliente.query("ROLLBACK");
      return res.status(409).json({
        ok: false,
        mensaje: "La reserva ya tiene un pago",
      });
    }

    const resultado = await cliente.query(
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
        VALUES ($1, $2, CURRENT_DATE, $3, $4, $5,
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id_pago
      `,
      [idReserva, reserva.rows[0].precio_total, metodo, estado, referencia],
    );

    if (estado === "pagado") {
      await cliente.query(
        `
          UPDATE public.reserva
          SET
            estado = 'Confirmada',
            fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id_reserva = $1
        `,
        [idReserva],
      );
    }

    await cliente.query("COMMIT");

    return res.status(201).json({
      ok: true,
      mensaje: "Pago creado correctamente",
      idPago: resultado.rows[0].id_pago,
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    return errorServidor(res, error, "No se pudo crear el pago");
  } finally {
    cliente.release();
  }
}

export async function actualizarPagoAdmin(req, res) {
  const id = entero(req.params.id);
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const actual = await cliente.query(
      `SELECT * FROM public.pago WHERE id_pago = $1 FOR UPDATE`,
      [id],
    );

    if (actual.rowCount === 0) {
      await cliente.query("ROLLBACK");
      return res.status(404).json({
        ok: false,
        mensaje: "Pago no encontrado",
      });
    }

    const fila = actual.rows[0];
    const metodo = texto(
      req.body.metodoPago ?? req.body.metodo_pago ?? fila.metodo_pago,
    ).toLowerCase();
    const estado = texto(
      req.body.estadoPago ?? req.body.estado_pago ?? fila.estado_pago,
    ).toLowerCase();
    const referencia = texto(req.body.referencia ?? fila.referencia);

    if (!METODOS_PAGO.includes(metodo) || !ESTADOS_PAGO.includes(estado)) {
      await cliente.query("ROLLBACK");
      return res.status(400).json({
        ok: false,
        mensaje: "Método o estado no válido",
      });
    }

    await cliente.query(
      `
        UPDATE public.pago
        SET
          metodo_pago = $1,
          estado_pago = $2,
          referencia = $3,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_pago = $4
      `,
      [metodo, estado, referencia || null, id],
    );

    if (estado === "pagado") {
      await cliente.query(
        `
          UPDATE public.reserva
          SET estado = 'Confirmada', fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id_reserva = $1
        `,
        [fila.id_reserva],
      );
    } else if (estado === "rechazado") {
      await cliente.query(
        `
          UPDATE public.reserva
          SET estado = 'Pendiente', fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id_reserva = $1 AND LOWER(estado) <> 'cancelada'
        `,
        [fila.id_reserva],
      );
    } else if (estado === "reembolsado") {
      await cliente.query(
        `
          UPDATE public.reserva
          SET estado = 'Cancelada', fecha_actualizacion = CURRENT_TIMESTAMP
          WHERE id_reserva = $1
        `,
        [fila.id_reserva],
      );
    }

    await cliente.query("COMMIT");

    return res.status(200).json({
      ok: true,
      mensaje: "Pago actualizado correctamente",
    });
  } catch (error) {
    await cliente.query("ROLLBACK");
    return errorServidor(res, error, "No se pudo actualizar el pago");
  } finally {
    cliente.release();
  }
}

export async function eliminarPagoAdmin(req, res) {
  const id = entero(req.params.id);

  try {
    const actual = await pool.query(
      `SELECT estado_pago FROM public.pago WHERE id_pago = $1`,
      [id],
    );

    if (actual.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Pago no encontrado",
      });
    }

    if (actual.rows[0].estado_pago === "pagado") {
      return res.status(409).json({
        ok: false,
        mensaje: "Un pago aprobado debe reembolsarse, no eliminarse",
      });
    }

    const resultado = await aplicarEstadoPago(id, "rechazado");
    return res.status(resultado.status).json(resultado);
  } catch (error) {
    return errorServidor(res, error, "No se pudo eliminar el pago");
  }
}

export async function aprobarPagoAdmin(req, res) {
  try {
    const resultado = await aplicarEstadoPago(entero(req.params.id), "pagado");
    return res.status(resultado.status).json(resultado);
  } catch (error) {
    return errorServidor(res, error, "No se pudo aprobar el pago");
  }
}

export async function rechazarPagoAdmin(req, res) {
  try {
    const resultado = await aplicarEstadoPago(
      entero(req.params.id),
      "rechazado",
    );
    return res.status(resultado.status).json(resultado);
  } catch (error) {
    return errorServidor(res, error, "No se pudo rechazar el pago");
  }
}

export async function reembolsarPagoAdmin(req, res) {
  const idPago = Number(req.params.id);

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultadoPago = await cliente.query(
      `
          SELECT
            id_pago,
            id_reserva,
            estado_pago
          FROM public.pago
          WHERE id_pago = $1
          FOR UPDATE
        `,
      [idPago],
    );

    if (resultadoPago.rowCount === 0) {
      await cliente.query("ROLLBACK");

      return res.status(404).json({
        ok: false,
        mensaje: "Pago no encontrado",
      });
    }

    const pago = resultadoPago.rows[0];

    if (pago.estado_pago !== "pagado") {
      await cliente.query("ROLLBACK");

      return res.status(409).json({
        ok: false,
        mensaje: "Solo se pueden reembolsar pagos aprobados",
      });
    }

    await cliente.query(
      `
        UPDATE public.pago
        SET
          estado_pago =
            'reembolsado',
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
          estado = 'Cancelada',
          fecha_actualizacion =
            CURRENT_TIMESTAMP
        WHERE id_reserva = $1
      `,
      [pago.id_reserva],
    );

    await cliente.query("COMMIT");

    return res.status(200).json({
      ok: true,
      mensaje: "Pago reembolsado y reserva cancelada correctamente",
    });
  } catch (error) {
    await cliente.query("ROLLBACK");

    return res.status(500).json({
      ok: false,
      mensaje: "No se pudo reembolsar el pago",
      detalle: error.message,
    });
  } finally {
    cliente.release();
  }
}

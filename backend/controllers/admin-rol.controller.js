import bcrypt from "bcrypt";
import { pool } from "../config/db.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function idAdminActual(req) {
  return entero(
    req.usuario?.idAdmin ||
      req.usuario?.id_admin ||
      req.usuario?.id ||
      req.usuario?.sub,
  );
}

function nombreAdministrador(usuario) {
  return [texto(usuario.nombre), texto(usuario.apellido)]
    .filter(Boolean)
    .join(" ");
}

function respuestaError(res, error, mensaje) {
  console.error(mensaje, error);

  return res.status(error.code === "23505" ? 409 : 500).json({
    ok: false,
    mensaje:
      error.code === "23505"
        ? "El correo ya está registrado en otra cuenta administrativa"
        : mensaje,
    detalle: error.message,
  });
}

export async function listarUsuariosConRolesAdmin(req, res) {
  const adminActual = idAdminActual(req) || 0;

  try {
    const resultado = await pool.query(
      `
        SELECT
          u.id_usuario,
          u.nombre,
          u.apellido,
          u.correo,
          u.telefono,
          u.foto_perfil,
          u.activo,
          u.fecha_creacion,
          u.fecha_actualizacion,

          CASE
            WHEN EXISTS (
              SELECT 1
              FROM public.administrador a
              WHERE
                LOWER(a.correo) =
                  LOWER(u.correo)
                AND a.activo = true
            )
            THEN 'admin'
            ELSE 'user'
          END AS rol,

          EXISTS (
            SELECT 1
            FROM public.administrador a
            WHERE
              LOWER(a.correo) =
                LOWER(u.correo)
              AND a.id_admin = $1
          ) AS es_admin_actual

        FROM public.usuario u
        ORDER BY u.id_usuario DESC
      `,
      [adminActual],
    );

    return res.status(200).json({
      ok: true,
      total: resultado.rows.length,
      usuarios: resultado.rows,
    });
  } catch (error) {
    return respuestaError(
      res,
      error,
      "No se pudieron cargar los usuarios y sus roles",
    );
  }
}

export async function actualizarUsuarioConRolAdmin(req, res) {
  const id = entero(req.params.id);

  if (!id) {
    return res.status(400).json({
      ok: false,
      mensaje: "El identificador del usuario no es válido",
    });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const actual = await cliente.query(
      `
          SELECT *
          FROM public.usuario
          WHERE id_usuario = $1
          FOR UPDATE
        `,
      [id],
    );

    if (actual.rowCount === 0) {
      await cliente.query("ROLLBACK");

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

    const activo = booleano(req.body.activo, fila.activo);

    const foto =
      texto(req.body.fotoPerfil ?? req.body.foto_perfil ?? fila.foto_perfil) ||
      null;

    if (!nombre || !apellido || !EMAIL_REGEX.test(correo)) {
      await cliente.query("ROLLBACK");

      return res.status(400).json({
        ok: false,
        mensaje: "Nombre, apellido o correo no válido",
      });
    }

    await cliente.query(
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
          fecha_actualizacion =
            CURRENT_TIMESTAMP
        WHERE id_usuario = $8
      `,
      [nombre, apellido, correo, hash, telefono || null, foto, activo, id],
    );

    await cliente.query(
      `
        UPDATE public.administrador
        SET
          nombre = $1,
          correo = $2,
          password_hash = $3,
          activo = $4,
          fecha_actualizacion =
            CURRENT_TIMESTAMP
        WHERE
          LOWER(correo) =
            LOWER($5)
      `,
      [
        nombreAdministrador({
          nombre,
          apellido,
        }),
        correo,
        hash,
        activo,
        fila.correo,
      ],
    );

    await cliente.query("COMMIT");

    return res.status(200).json({
      ok: true,
      mensaje: "Usuario actualizado correctamente",
    });
  } catch (error) {
    await cliente.query("ROLLBACK");

    return respuestaError(res, error, "No se pudo actualizar el usuario");
  } finally {
    cliente.release();
  }
}

export async function desactivarUsuarioConRolAdmin(req, res) {
  const id = entero(req.params.id);

  const adminActual = idAdminActual(req);

  if (!id) {
    return res.status(400).json({
      ok: false,
      mensaje: "El identificador del usuario no es válido",
    });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const usuario = await cliente.query(
      `
          SELECT
            id_usuario,
            nombre,
            apellido,
            correo,
            activo
          FROM public.usuario
          WHERE id_usuario = $1
          FOR UPDATE
        `,
      [id],
    );

    if (usuario.rowCount === 0) {
      await cliente.query("ROLLBACK");

      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    const fila = usuario.rows[0];

    const administrador = await cliente.query(
      `
          SELECT id_admin
          FROM public.administrador
          WHERE
            LOWER(correo) =
              LOWER($1)
          LIMIT 1
          FOR UPDATE
        `,
      [fila.correo],
    );

    if (
      administrador.rowCount > 0 &&
      Number(administrador.rows[0].id_admin) === adminActual
    ) {
      await cliente.query("ROLLBACK");

      return res.status(400).json({
        ok: false,
        mensaje: "No puedes desactivar tu propia cuenta administrativa",
      });
    }

    await cliente.query(
      `
        UPDATE public.usuario
        SET
          activo = false,
          fecha_actualizacion =
            CURRENT_TIMESTAMP
        WHERE id_usuario = $1
      `,
      [id],
    );

    await cliente.query(
      `
        DELETE FROM public.administrador
        WHERE
          LOWER(correo) =
            LOWER($1)
      `,
      [fila.correo],
    );

    await cliente.query("COMMIT");

    return res.status(200).json({
      ok: true,
      mensaje: "Usuario desactivado correctamente",
    });
  } catch (error) {
    await cliente.query("ROLLBACK");

    return respuestaError(res, error, "No se pudo desactivar el usuario");
  } finally {
    cliente.release();
  }
}

export async function cambiarRolUsuarioAdmin(req, res) {
  const id = entero(req.params.id);

  const nuevoRol = texto(req.body.rol).toLowerCase();

  const adminActual = idAdminActual(req);

  if (!id) {
    return res.status(400).json({
      ok: false,
      mensaje: "El identificador del usuario no es válido",
    });
  }

  if (nuevoRol !== "admin" && nuevoRol !== "user") {
    return res.status(400).json({
      ok: false,
      mensaje: "El rol debe ser admin o user",
    });
  }

  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const usuario = await cliente.query(
      `
          SELECT
            id_usuario,
            nombre,
            apellido,
            correo,
            password_hash,
            activo
          FROM public.usuario
          WHERE id_usuario = $1
          FOR UPDATE
        `,
      [id],
    );

    if (usuario.rowCount === 0) {
      await cliente.query("ROLLBACK");

      return res.status(404).json({
        ok: false,
        mensaje: "Usuario no encontrado",
      });
    }

    const fila = usuario.rows[0];

    const administrador = await cliente.query(
      `
          SELECT
            id_admin,
            activo
          FROM public.administrador
          WHERE
            LOWER(correo) =
              LOWER($1)
          LIMIT 1
          FOR UPDATE
        `,
      [fila.correo],
    );

    if (nuevoRol === "admin") {
      if (fila.activo === false) {
        await cliente.query("ROLLBACK");

        return res.status(400).json({
          ok: false,
          mensaje: "Activa al usuario antes de convertirlo en administrador",
        });
      }

      const nombreAdmin = nombreAdministrador(fila);

      if (administrador.rowCount > 0) {
        await cliente.query(
          `
            UPDATE public.administrador
            SET
              nombre = $1,
              password_hash = $2,
              activo = true,
              fecha_actualizacion =
                CURRENT_TIMESTAMP
            WHERE id_admin = $3
          `,
          [nombreAdmin, fila.password_hash, administrador.rows[0].id_admin],
        );
      } else {
        await cliente.query(
          `
            INSERT INTO public.administrador (
              nombre,
              correo,
              password_hash,
              activo,
              fecha_creacion,
              fecha_actualizacion
            )
            VALUES (
              $1,
              $2,
              $3,
              true,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
            )
          `,
          [nombreAdmin, fila.correo, fila.password_hash],
        );
      }

      await cliente.query("COMMIT");

      return res.status(200).json({
        ok: true,
        mensaje: `${nombreAdmin} ahora es administrador`,
        rol: "admin",
      });
    }

    /*
      CAMBIO A USUARIO
    */
    if (administrador.rowCount === 0) {
      await cliente.query("COMMIT");

      return res.status(200).json({
        ok: true,
        mensaje: "La cuenta ya tiene rol de usuario",
        rol: "user",
      });
    }

    const idAdministrador = Number(administrador.rows[0].id_admin);

    if (adminActual && idAdministrador === adminActual) {
      await cliente.query("ROLLBACK");

      return res.status(400).json({
        ok: false,
        mensaje: "No puedes quitarte tu propio rol de administrador",
      });
    }

    await cliente.query(
      `
        DELETE FROM public.administrador
        WHERE id_admin = $1
      `,
      [idAdministrador],
    );

    await cliente.query("COMMIT");

    return res.status(200).json({
      ok: true,
      mensaje: `${nombreAdministrador(fila)} ahora es usuario`,
      rol: "user",
    });
  } catch (error) {
    await cliente.query("ROLLBACK");

    return respuestaError(res, error, "No se pudo cambiar el rol");
  } finally {
    cliente.release();
  }
}

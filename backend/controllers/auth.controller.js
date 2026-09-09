import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_REGEX = /^[0-9]{10}$/;
const FOTO_DATA_URL_REGEX = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i;
const FOTO_MAX_CARACTERES = 7_000_000;

function texto(valor) {
  return String(valor ?? '').trim();
}

function correo(valor) {
  return texto(valor).toLowerCase();
}

function esHash(valor) {
  return /^\$2[aby]\$/.test(texto(valor));
}

function validarPassword(password) {
  if (password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres';
  if (!/[A-Z]/.test(password)) return 'La contraseña debe contener una mayúscula';
  if (!/[a-z]/.test(password)) return 'La contraseña debe contener una minúscula';
  if (!/[0-9]/.test(password)) return 'La contraseña debe contener un número';
  if (!/[^A-Za-z0-9]/.test(password)) return 'La contraseña debe contener un carácter especial';
  return '';
}

function separarNombre(nombreCompleto, apellidoRecibido) {
  const completo = texto(nombreCompleto);
  const apellido = texto(apellidoRecibido);

  if (apellido) {
    return {
      nombre: completo,
      apellido,
    };
  }

  const partes = completo.split(/\s+/).filter(Boolean);

  return {
    nombre: partes.shift() || completo,
    apellido: partes.join(' ') || 'Sin apellido',
  };
}

function transformarCuenta(fila, rol) {
  if (rol === 'admin') {
    const id = Number(fila.id_admin);

    return {
      id,
      idUsuario: id,
      idAdmin: id,
      nombre: fila.nombre,
      email: fila.correo,
      correo: fila.correo,
      telefono: '',
      fotoPerfil: fila.foto_perfil || '/gente.png',
      foto_perfil: fila.foto_perfil || '/gente.png',
      rol: 'admin',
    };
  }

  const id = Number(fila.id_usuario);

  return {
    id,
    idUsuario: id,
    nombre: [fila.nombre, fila.apellido]
      .filter((parte) => parte && parte !== 'Sin apellido')
      .join(' '),
    email: fila.correo,
    correo: fila.correo,
    telefono: fila.telefono || '',
    fotoPerfil: fila.foto_perfil || '/gente.png',
    foto_perfil: fila.foto_perfil || '/gente.png',
    rol: 'user',
  };
}

function crearToken(cuenta) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está configurado');
  }

  const payload = {
    sub: cuenta.id,
    id: cuenta.id,
    nombre: cuenta.nombre,
    correo: cuenta.correo,
    email: cuenta.email,
    rol: cuenta.rol,
  };

  if (cuenta.rol === 'admin') {
    payload.idAdmin = cuenta.idAdmin;
    payload.id_admin = cuenta.idAdmin;
  } else {
    payload.idUsuario = cuenta.idUsuario;
    payload.id_usuario = cuenta.idUsuario;
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

function obtenerIdUsuario(req) {
  return Number(
    req.usuario?.idUsuario ||
      req.usuario?.id_usuario ||
      req.usuario?.id ||
      req.usuario?.sub ||
      0,
  );
}

function validarFotoPerfil(valor) {
  const foto = texto(valor);

  if (!foto) {
    return {
      ok: true,
      foto: '/gente.png',
    };
  }

  if (foto.length > FOTO_MAX_CARACTERES) {
    return {
      ok: false,
      mensaje: 'La imagen seleccionada es demasiado grande',
    };
  }

  const esRutaPermitida =
    foto.startsWith('/') ||
    foto.startsWith('http://') ||
    foto.startsWith('https://') ||
    FOTO_DATA_URL_REGEX.test(foto);

  if (!esRutaPermitida) {
    return {
      ok: false,
      mensaje: 'El formato de la foto de perfil no es válido',
    };
  }

  return {
    ok: true,
    foto,
  };
}

async function obtenerEstadisticasUsuario(
  idUsuario,
  ejecutor = pool,
) {
  const reservasResultado =
    await ejecutor.query({
      text: `
        SELECT COUNT(*)::integer AS total
        FROM public.reserva
        WHERE id_usuario = $1
      `,
      values: [idUsuario],
      query_timeout: 8000,
    });

  let favoritos = 0;

  try {
    const favoritosResultado =
      await ejecutor.query({
        text: `
          SELECT COUNT(*)::integer AS total
          FROM public.favorito
          WHERE id_usuario = $1
        `,
        values: [idUsuario],
        query_timeout: 8000,
      });

    favoritos = Number(
      favoritosResultado.rows[0]?.total || 0,
    );
  } catch (error) {
    /*
      42P01 significa que la tabla favorito
      todavía no existe. El perfil puede cargar
      igualmente mostrando cero favoritos.
    */
    if (error.code !== '42P01') {
      throw error;
    }
  }

  return {
    reservas: Number(
      reservasResultado.rows[0]?.total || 0,
    ),
    favoritos,
  };
}

async function buscarCuenta(correoCuenta) {
  const admin = await pool.query(
    `
      SELECT
        id_admin,
        nombre,
        correo,
        password_hash,
        activo
      FROM public.administrador
      WHERE LOWER(correo) = LOWER($1)
      LIMIT 1
    `,
    [correoCuenta],
  );

  if (admin.rowCount > 0) {
    return {
      rol: 'admin',
      fila: admin.rows[0],
    };
  }

  const usuario = await pool.query(
    `
      SELECT
        id_usuario,
        nombre,
        apellido,
        correo,
        password_hash,
        telefono,
        foto_perfil,
        activo
      FROM public.usuario
      WHERE LOWER(correo) = LOWER($1)
      LIMIT 1
    `,
    [correoCuenta],
  );

  if (usuario.rowCount > 0) {
    return {
      rol: 'user',
      fila: usuario.rows[0],
    };
  }

  return null;
}

async function passwordCorrecto(password, hashGuardado) {
  if (!hashGuardado) return false;

  return esHash(hashGuardado)
    ? bcrypt.compare(password, hashGuardado)
    : password === hashGuardado;
}

async function convertirHashLegado(cuenta, password) {
  if (esHash(cuenta.fila.password_hash)) return;

  const hash = await bcrypt.hash(password, 12);
  const tabla = cuenta.rol === 'admin' ? 'administrador' : 'usuario';
  const campoId = cuenta.rol === 'admin' ? 'id_admin' : 'id_usuario';
  const id =
    cuenta.rol === 'admin'
      ? cuenta.fila.id_admin
      : cuenta.fila.id_usuario;

  await pool.query(
    `
      UPDATE public.${tabla}
      SET
        password_hash = $1,
        fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE ${campoId} = $2
    `,
    [hash, id],
  );
}

export async function registrar(req, res) {
  const nombreCompleto = texto(req.body.nombre);
  const correoCuenta = correo(req.body.correo || req.body.email);
  const telefono = texto(req.body.telefono);
  const password = String(req.body.contrasena || req.body.password || '');

  if (!nombreCompleto) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Ingresa tu nombre',
    });
  }

  if (!EMAIL_REGEX.test(correoCuenta)) {
    return res.status(400).json({
      ok: false,
      mensaje: 'El correo no es válido',
    });
  }

  if (telefono && !TELEFONO_REGEX.test(telefono)) {
    return res.status(400).json({
      ok: false,
      mensaje: 'El teléfono debe tener exactamente 10 números, sin espacios ni guiones',
    });
  }

  const errorPassword = validarPassword(password);

  if (errorPassword) {
    return res.status(400).json({
      ok: false,
      mensaje: errorPassword,
    });
  }

  const nombres = separarNombre(nombreCompleto, req.body.apellido);
  const cliente = await pool.connect();

  try {
    await cliente.query('BEGIN');

    const existe = await cliente.query(
      `
        SELECT 1
        FROM public.usuario
        WHERE LOWER(correo) = LOWER($1)
      `,
      [correoCuenta],
    );

    if (existe.rowCount > 0) {
      await cliente.query('ROLLBACK');

      return res.status(409).json({
        ok: false,
        mensaje: 'El correo ya está registrado',
      });
    }

    const hash = await bcrypt.hash(password, 12);

    const resultado = await cliente.query(
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
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          '/gente.png',
          true,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
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
        nombres.nombre,
        nombres.apellido,
        correoCuenta,
        hash,
        telefono || null,
      ],
    );

    const usuario = transformarCuenta(resultado.rows[0], 'user');
    const token = crearToken(usuario);

    await cliente.query('COMMIT');

    return res.status(201).json({
      ok: true,
      mensaje: 'Usuario registrado correctamente',
      token,
      usuario,
    });
  } catch (error) {
    await cliente.query('ROLLBACK');

    return res.status(error.code === '23505' ? 409 : 500).json({
      ok: false,
      mensaje:
        error.code === '23505'
          ? 'El correo ya está registrado'
          : 'No se pudo registrar el usuario',
      detalle: error.message,
    });
  } finally {
    cliente.release();
  }
}

export async function login(req, res) {
  const correoCuenta = correo(req.body.correo || req.body.email);
  const password = String(req.body.contrasena || req.body.password || '');

  if (!EMAIL_REGEX.test(correoCuenta)) {
    return res.status(400).json({
      ok: false,
      mensaje: 'El correo no es válido',
    });
  }

  if (!password) {
    return res.status(400).json({
      ok: false,
      mensaje: 'Ingresa tu contraseña',
    });
  }

  try {
    const cuenta = await buscarCuenta(correoCuenta);

    if (!cuenta || cuenta.fila.activo === false) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Correo o contraseña incorrectos',
      });
    }

    const coincide = await passwordCorrecto(
      password,
      cuenta.fila.password_hash,
    );

    if (!coincide) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Correo o contraseña incorrectos',
      });
    }

    await convertirHashLegado(cuenta, password);

    const usuario = transformarCuenta(cuenta.fila, cuenta.rol);
    const token = crearToken(usuario);

    return res.status(200).json({
      ok: true,
      mensaje:
        cuenta.rol === 'admin'
          ? 'Acceso de administrador correcto'
          : 'Inicio de sesión correcto',
      token,
      usuario,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'No se pudo iniciar sesión',
      detalle: error.message,
    });
  }
}

export async function obtenerPerfil(req, res) {
  const rol = texto(req.usuario?.rol).toLowerCase();

  try {
    if (rol === 'admin' || rol === 'administrador') {
      const id = Number(
        req.usuario?.idAdmin ||
          req.usuario?.id_admin ||
          req.usuario?.id ||
          req.usuario?.sub,
      );

      const resultado = await pool.query(
        `
          SELECT
            id_admin,
            nombre,
            correo,
            activo
          FROM public.administrador
          WHERE id_admin = $1
        `,
        [id],
      );

      if (resultado.rowCount === 0) {
        return res.status(404).json({
          ok: false,
          mensaje: 'Administrador no encontrado',
        });
      }

      return res.status(200).json({
        ok: true,
        usuario: transformarCuenta(resultado.rows[0], 'admin'),
        estadisticas: {
          reservas: 0,
          favoritos: 0,
        },
      });
    }

    const idUsuario = obtenerIdUsuario(req);

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      return res.status(401).json({
        ok: false,
        mensaje: 'No se pudo identificar al usuario de la sesión',
      });
    }

    const resultado = await pool.query(
      `
        SELECT
          id_usuario,
          nombre,
          apellido,
          correo,
          telefono,
          foto_perfil,
          activo
        FROM public.usuario
        WHERE id_usuario = $1
          AND activo = true
      `,
      [idUsuario],
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado',
      });
    }

    const estadisticas = await obtenerEstadisticasUsuario(idUsuario);

    return res.status(200).json({
      ok: true,
      usuario: transformarCuenta(resultado.rows[0], 'user'),
      estadisticas,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'No se pudo cargar el perfil',
      detalle: error.message,
    });
  }
}

export async function actualizarPerfil(req, res) {
  const rol = texto(req.usuario?.rol).toLowerCase();

  if (rol === 'admin' || rol === 'administrador') {
    return res.status(403).json({
      ok: false,
      mensaje: 'Utiliza el perfil administrativo para modificar esta cuenta',
    });
  }

  const idUsuario = obtenerIdUsuario(req);
  const nombreCompleto = texto(req.body.nombre);
  const correoCuenta = correo(req.body.correo || req.body.email);
  const telefono = texto(req.body.telefono);
  const fotoRecibida =
    req.body.fotoPerfil ??
    req.body.foto_perfil ??
    req.body.foto ??
    '/gente.png';

  if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
    return res.status(401).json({
      ok: false,
      mensaje: 'No se pudo identificar al usuario de la sesión',
    });
  }

  if (nombreCompleto.length < 2 || nombreCompleto.length > 150) {
    return res.status(400).json({
      ok: false,
      mensaje: 'El nombre debe contener entre 2 y 150 caracteres',
    });
  }

  if (!EMAIL_REGEX.test(correoCuenta)) {
    return res.status(400).json({
      ok: false,
      mensaje: 'El correo no es válido',
    });
  }

  if (telefono.length > 30) {
    return res.status(400).json({
      ok: false,
      mensaje: 'El teléfono no puede superar los 30 caracteres',
    });
  }

  const validacionFoto = validarFotoPerfil(fotoRecibida);

  if (!validacionFoto.ok) {
    return res.status(400).json({
      ok: false,
      mensaje: validacionFoto.mensaje,
    });
  }

  const nombres = separarNombre(nombreCompleto, '');
  const cliente = await pool.connect();

  try {
    await cliente.query('BEGIN');

    const correoOcupado = await cliente.query(
      `
        SELECT 1
        FROM public.usuario
        WHERE LOWER(correo) = LOWER($1)
          AND id_usuario <> $2
        LIMIT 1
      `,
      [correoCuenta, idUsuario],
    );

    if (correoOcupado.rowCount > 0) {
      await cliente.query('ROLLBACK');

      return res.status(409).json({
        ok: false,
        mensaje: 'El correo ya pertenece a otro usuario',
      });
    }

    const resultado = await cliente.query(
      `
        UPDATE public.usuario
        SET
          nombre = $1,
          apellido = $2,
          correo = $3,
          telefono = $4,
          foto_perfil = $5,
          fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_usuario = $6
          AND activo = true
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
        nombres.nombre,
        nombres.apellido,
        correoCuenta,
        telefono || null,
        validacionFoto.foto,
        idUsuario,
      ],
    );

    if (resultado.rowCount === 0) {
      await cliente.query('ROLLBACK');

      return res.status(404).json({
        ok: false,
        mensaje: 'Usuario no encontrado',
      });
    }

    const usuario = transformarCuenta(resultado.rows[0], 'user');
    const estadisticas = await obtenerEstadisticasUsuario(
      idUsuario,
      cliente,
    );
    const token = crearToken(usuario);

    await cliente.query('COMMIT');

    return res.status(200).json({
      ok: true,
      mensaje: 'Perfil actualizado correctamente',
      token,
      usuario,
      estadisticas,
    });
  } catch (error) {
    await cliente.query('ROLLBACK');

    return res.status(error.code === '23505' ? 409 : 500).json({
      ok: false,
      mensaje:
        error.code === '23505'
          ? 'El correo ya pertenece a otro usuario'
          : 'No se pudo actualizar el perfil',
      detalle: error.message,
    });
  } finally {
    cliente.release();
  }
}
import jwt from "jsonwebtoken";

function obtenerToken(req) {
  const autorizacion = req.headers.authorization;

  if (!autorizacion) {
    return null;
  }

  const partes = autorizacion.trim().split(/\s+/);

  if (partes.length !== 2 || partes[0].toLowerCase() !== "bearer") {
    return null;
  }

  return partes[1];
}

export function verificarToken(req, res, next) {
  const token = obtenerToken(req);

  if (!token) {
    return res.status(401).json({
      ok: false,
      mensaje: "No se proporcionó un token de acceso",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      ok: false,
      mensaje: "JWT_SECRET no está configurado",
    });
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);

    return next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      mensaje:
        error.name === "TokenExpiredError"
          ? "La sesión expiró"
          : "El token no es válido",
    });
  }
}

export function verificarAdmin(req, res, next) {
  const rol = String(
    req.usuario?.rol || req.usuario?.role || req.usuario?.tipo || "",
  )
    .trim()
    .toLowerCase();

  if (rol !== "admin" && rol !== "administrador") {
    return res.status(403).json({
      ok: false,
      mensaje: "Acceso exclusivo para administradores",
    });
  }

  return next();
}

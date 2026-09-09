import express from "express";

import {
  actualizarPerfil,
  login,
  obtenerPerfil,
  registrar,
} from "../controllers/auth.controller.js";

import { verificarToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/registro", registrar);
router.post("/login", login);
router.get("/perfil", verificarToken, obtenerPerfil);
router.put("/perfil", verificarToken, actualizarPerfil);
router.patch("/perfil", verificarToken, actualizarPerfil);

export default router;

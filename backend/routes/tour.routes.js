import express from "express";

import {
  listarCategorias,
  listarTours,
  obtenerTourPorId,
} from "../controllers/tour.controller.js";

import {
  actualizarTourAdmin,
  crearTourAdmin,
  desactivarTourAdmin,
  listarToursAdmin,
} from "../controllers/admin-tour.controller.js";

import { verificarToken } from "../middleware/auth.middleware.js";

import { verificarAdmin } from "../middleware/admin.middleware.js";

const router = express.Router();

router.get("/", listarTours);
router.get("/categorias", listarCategorias);

router.get("/admin", verificarToken, verificarAdmin, listarToursAdmin);

router.post("/", verificarToken, verificarAdmin, crearTourAdmin);

router.put("/:id", verificarToken, verificarAdmin, actualizarTourAdmin);

router.delete("/:id", verificarToken, verificarAdmin, desactivarTourAdmin);

router.get("/:id", obtenerTourPorId);

export default router;

import express from "express";

import {
  actualizarEstadoReserva,
  cancelarReserva,
  crearReserva,
  listarMisReservas,
  listarReservasAdmin,
  obtenerDisponibilidad,
  obtenerReservaPorId,
  obtenerResumenReservas,
} from "../controllers/reserva.controller.js";

import { verificarToken } from "../middleware/auth.middleware.js";

import { verificarAdmin } from "../middleware/admin.middleware.js";

const router = express.Router();

router.use(verificarToken);

router.get("/admin/todas", verificarAdmin, listarReservasAdmin);

router.get("/admin/resumen", verificarAdmin, obtenerResumenReservas);

router.patch("/admin/:id/estado", verificarAdmin, actualizarEstadoReserva);

router.get("/disponibilidad/:idTour", obtenerDisponibilidad);

router.get("/mis-reservas", listarMisReservas);
router.post("/", crearReserva);
router.patch("/:id/cancelar", cancelarReserva);
router.get("/:id", obtenerReservaPorId);

export default router;

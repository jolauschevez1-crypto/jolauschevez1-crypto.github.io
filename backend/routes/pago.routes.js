import express from "express";
import {
  aprobarPago,
  listarPagosAdmin,
  obtenerPagoReserva,
  rechazarPago,
  registrarPago,
} from "../controllers/pago.controller.js";
import { verificarToken } from "../middleware/auth.middleware.js";
import { verificarAdmin } from "../middleware/admin.middleware.js";

const router = express.Router();
router.use(verificarToken);
router.get("/admin/todos", verificarAdmin, listarPagosAdmin);
router.patch("/admin/:idPago/aprobar", verificarAdmin, aprobarPago);
router.patch("/admin/:idPago/rechazar", verificarAdmin, rechazarPago);
router.post("/", registrarPago);
router.get("/reserva/:idReserva", obtenerPagoReserva);

export default router;

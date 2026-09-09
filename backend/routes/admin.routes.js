import express from "express";
import { verificarToken } from "../middleware/auth.middleware.js";
import { verificarAdmin } from "../middleware/admin.middleware.js";
import {
  actualizarPagoAdmin,
  actualizarPerfilAdmin,
  actualizarReservaAdmin,
  aprobarPagoAdmin,
  cambiarPasswordAdmin,
  crearPagoAdmin,
  crearReservaAdmin,
  crearUsuarioAdmin,
  eliminarPagoAdmin,
  eliminarReservaAdmin,
  listarPagosAdmin,
  listarReservasAdmin,
  obtenerDashboard,
  obtenerPagoAdmin,
  obtenerPerfilAdmin,
  obtenerReservaAdmin,
  obtenerUsuarioAdmin,
  rechazarPagoAdmin,
  reembolsarPagoAdmin,
} from "../controllers/admin.controller.js";
import {
  obtenerDisponibilidadTours,
  obtenerCalificacionTours,
  obtenerIngresosMensuales,
  obtenerResumenPagosEstado,
  obtenerCategoriasPopulares,
  obtenerToursBajoRendimiento,
  obtenerProximosTours,
  obtenerClientesFrecuentes,
  obtenerActividadReciente,
  obtenerPerfilCompletoUsuario,
} from "../controllers/vistas.controller.js";
import {
  actualizarUsuarioConRolAdmin,
  cambiarRolUsuarioAdmin,
  desactivarUsuarioConRolAdmin,
  listarUsuariosConRolesAdmin,
} from "../controllers/admin-rol.controller.js";
import {
  activarCategoriaAdmin,
  actualizarCategoriaAdmin,
  crearCategoriaAdmin,
  desactivarCategoriaAdmin,
  listarCategoriasAdmin,
  obtenerCategoriaAdmin,
} from "../controllers/admin-categoria.controller.js";
import { obtenerReportesAdmin } from "../controllers/reportes.controller.js";
import {
  activarTourAdmin,
  actualizarTourAdmin,
  crearTourAdmin,
  desactivarTourAdmin,
  listarToursAdmin,
  obtenerTourAdmin,
} from "../controllers/admin-tour.controller.js";

const router = express.Router();

router.use(verificarToken, verificarAdmin);
router.get("/dashboard", obtenerDashboard);

router.get("/reportes", obtenerReportesAdmin);

router.get("/perfil", obtenerPerfilAdmin);

router.put("/perfil", actualizarPerfilAdmin);

router.patch("/perfil/password", cambiarPasswordAdmin);
router.get("/categorias", listarCategoriasAdmin);

router.get("/categorias/:id", obtenerCategoriaAdmin);

router.post("/categorias", crearCategoriaAdmin);

router.put("/categorias/:id", actualizarCategoriaAdmin);

router.delete("/categorias/:id", desactivarCategoriaAdmin);

router.patch("/categorias/:id/activar", activarCategoriaAdmin);

router.get("/tours", listarToursAdmin);

router.get("/tours/:id", obtenerTourAdmin);

router.post("/tours", crearTourAdmin);

router.put("/tours/:id", actualizarTourAdmin);

router.delete("/tours/:id", desactivarTourAdmin);

router.patch("/tours/:id/activar", activarTourAdmin);

router.get("/usuarios", listarUsuariosConRolesAdmin);

router.get("/usuarios/:id", obtenerUsuarioAdmin);

router.post("/usuarios", crearUsuarioAdmin);

router.put("/usuarios/:id", actualizarUsuarioConRolAdmin);

router.patch("/usuarios/:id/rol", cambiarRolUsuarioAdmin);

router.delete("/usuarios/:id", desactivarUsuarioConRolAdmin);
router.get("/reportes/disponibilidad", obtenerDisponibilidadTours);
router.get("/reportes/calificaciones", obtenerCalificacionTours);
router.get("/reportes/ingresos-mensuales", obtenerIngresosMensuales);
router.get("/reportes/pagos-por-estado", obtenerResumenPagosEstado);
router.get("/reportes/categorias-populares", obtenerCategoriasPopulares);
router.get("/reportes/tours-bajo-rendimiento", obtenerToursBajoRendimiento);
router.get("/reportes/proximos-tours", obtenerProximosTours);
router.get("/reportes/clientes-frecuentes", obtenerClientesFrecuentes);
router.get("/reportes/actividad-reciente", obtenerActividadReciente);
router.get("/usuarios/:id/perfil-completo", obtenerPerfilCompletoUsuario);

router.get("/reservas", listarReservasAdmin);

router.get("/reservas/:id", obtenerReservaAdmin);

router.post("/reservas", crearReservaAdmin);

router.put("/reservas/:id", actualizarReservaAdmin);

router.delete("/reservas/:id", eliminarReservaAdmin);

router.get("/pagos", listarPagosAdmin);

router.get("/pagos/:id", obtenerPagoAdmin);

router.post("/pagos", crearPagoAdmin);

router.put("/pagos/:id", actualizarPagoAdmin);

router.delete("/pagos/:id", eliminarPagoAdmin);

router.patch("/pagos/:id/aprobar", aprobarPagoAdmin);

router.patch("/pagos/:id/rechazar", rechazarPagoAdmin);

router.patch("/pagos/:id/reembolsar", reembolsarPagoAdmin);

export default router;

import express from "express";

import {
  agregarFavorito,
  eliminarFavorito,
  listarFavoritos,
} from "../controllers/favorito.controller.js";

import { verificarToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    mensaje: "Rutas de favoritos funcionando",
  });
});

router.use(verificarToken);

router.get("/", listarFavoritos);
router.post("/", agregarFavorito);
router.delete("/:idTour", eliminarFavorito);

export default router;

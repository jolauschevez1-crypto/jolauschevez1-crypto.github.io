import express from "express";

import {
  guardarOpinionTour,
  listarOpinionesRecientes,
  listarOpinionesTour,
} from "../controllers/opinion.controller.js";

import { verificarToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    mensaje: "Rutas de opiniones funcionando",
    tabla: "public.opinion_tour",
  });
});

router.get("/recientes", listarOpinionesRecientes);
router.get("/tour/:idTour", listarOpinionesTour);
router.post("/tour/:idTour", verificarToken, guardarOpinionTour);

export default router;

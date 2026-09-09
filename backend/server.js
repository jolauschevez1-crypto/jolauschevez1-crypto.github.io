import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pagoRoutes from "./routes/pago.routes.js";
import authRoutes from "./routes/auth.routes.js";
import tourRoutes from "./routes/tour.routes.js";
import reservaRoutes from "./routes/reserva.routes.js";
import favoritoRoutes from "./routes/favorito.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import opinionRoutes from "./routes/opinion.routes.js";
import { verificarConexion } from "./config/db.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.join(__dirname, "../Fronted/dist/Proyecto-Tuor/browser");
const frontendPublicPath = path.join(__dirname, "../Fronted/public");

/* =========================
   CONFIGURACIÓN
========================= */

app.disable("x-powered-by");

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:4200",
  "http://127.0.0.1:4200",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.options("*", cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* =========================
   ARCHIVOS E IMÁGENES
========================= */

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

if (fs.existsSync(frontendPublicPath)) {
  app.use(express.static(frontendPublicPath));
}

/* =========================
   RUTA PRINCIPAL
========================= */

app.get("/", (req, res) => {
  if (fs.existsSync(frontendDistPath)) {
    return res.sendFile(path.join(frontendDistPath, "index.html"));
  }

  return res.status(200).json({
    ok: true,
    mensaje: "API REST del sistema turístico funcionando",
  });
});

/* =========================
   RUTAS REALES
========================= */

app.use("/api/auth", authRoutes);
app.use("/api/tours", tourRoutes);
app.use("/api/reservas", reservaRoutes);
app.use("/api/favoritos", favoritoRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/opiniones", opinionRoutes);
app.use("/api/pagos", pagoRoutes);

/* =========================
   RUTA NO ENCONTRADA
========================= */

app.use((req, res, next) => {
  if (fs.existsSync(frontendDistPath) && req.method === "GET") {
    return res.sendFile(path.join(frontendDistPath, "index.html"));
  }

  return res.status(404).json({
    ok: false,
    mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

/* =========================
   MANEJO GLOBAL DE ERRORES
========================= */

app.use((error, req, res, next) => {
  console.error("Error del servidor:", error);

  if (res.headersSent) {
    return next(error);
  }

  const estado = error.status || error.statusCode || 500;

  res.status(estado).json({
    ok: false,
    mensaje: estado === 500 ? "Error interno del servidor" : error.message,
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

/* =========================
   INICIAR SERVIDOR
========================= */

async function iniciarServidor() {
  try {
    await verificarConexion();

    app.listen(PORT, () => {
      console.log("======================================");
      console.log("API REST iniciada correctamente");
      console.log(`Servidor: http://localhost:${PORT}`);
      console.log(
        `Frontend: ${process.env.FRONTEND_URL || "http://localhost:4200"}`,
      );
      console.log("PostgreSQL conectado");
      console.log("======================================");
    });
  } catch (error) {
    console.error("No se pudo iniciar el backend");
    console.error(error.message);
    process.exit(1);
  }
}

iniciarServidor();

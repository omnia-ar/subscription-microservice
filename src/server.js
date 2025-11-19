import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import http from "http";
import rateLimit from "express-rate-limit";

// Midleware de errores
import { errorHandler } from "./middleware/errorHandler.js";
// Midleware de JWT
import { validateJWT } from "./middleware/validateJWT.js";

import indexRouter from "./routes/index.routes.js";

dotenv.config();

const app = express();

// Configuración de rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10000, // límite de 100 requests por ventana
  message: "Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.",
});

app.use(limiter);
app.use(express.json());
app.use(helmet());

// Lista de orígenes permitidos
const allowedOrigins = [
  // Frontends
  process.env.FRONTEND_URL, // https://omnia-ar.com
  process.env.FRONTEND_URL_VERCEL, // https://omnia-ai-nine.vercel.app
  "https://www.omnia-ar.com", // Si usas www

  process.env.API_BACK_URL,
  process.env.PAYMENT_MICROSERVICE_URL,
  process.env.NOTIFICATIO_MICROSERVICE_URL,

  // Desarrollo local
  "http://localhost:3000",
  "http://localhost:9002",
].filter(Boolean); // Elimina valores undefined/null

console.log("✅ Backend Principal - Orígenes CORS permitidos:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (server-to-server, Postman, mobile apps)
      if (!origin) {
        console.log("ℹ️ Request sin origin - permitido");
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        console.log(`✅ Origen permitido: ${origin}`);
        return callback(null, true);
      }

      console.error(`❌ Origen bloqueado por CORS: ${origin}`);
      return callback(
        new Error(`El origen '${origin}' no está permitido por CORS.`)
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "Accept"],
    exposedHeaders: ["Set-Cookie"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Health check endpoint (sin autenticación)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", validateJWT, indexRouter);

// Manejo de errores 404
app.use((req, res, next) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.originalUrl,
  });
});

// Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  });
});

// Middleware de manejo de errores global
app.use(errorHandler);

const server = http.createServer(app);

const PORT = process.env.PORT || 8083;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

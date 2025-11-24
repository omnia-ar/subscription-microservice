import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import http from "http";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

// Logger y utilidades
import logger from "./utils/logger.js";
import circuitBreakerManager from "./utils/circuitBreaker.js";

// Middleware de errores
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { sanitizeStrings } from "./middleware/requestValidator.js";

// Cron Job
import cron from "node-cron";
import { exec } from "child_process";

import indexRouter from "./routes/index.routes.js";
import userSubscriptionRouter from "./routes/user-subscription/userSubscription.routes.js";
import subscriptionPlansRouter from "./routes/subscription-plans/subscriptionPlans.routes.js";

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
app.use(cookieParser());

// Obtiene ruta absoluta para el script de evaluación de suscripciones
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(
  __dirname,
  "cron-jobs/evaluateSubscriptions.js"
);

// Cron Job - ejecucion
cron.schedule("0 * * * *", () => {
  //  console.log("Ejecutando evaluación de suscripciones...");
  exec(`node ${scriptPath}`, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error: ${stderr}`);
    } else {
      console.log(stdout);
    }
  });
});

// Lista de orígenes permitidos
const allowedOrigins = [
  // Frontends
  process.env.FRONTEND_URL, // https://omnia-ar.com
  process.env.FRONTEND_URL_VERCEL, // https://omnia-ai-nine.vercel.app
  "https://www.omnia-ar.com", // Si usas www

  process.env.API_BACK_URL,
  process.env.PAYMENT_MICROSERVICE_URL,
  process.env.GATEWAY_URL,

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

// Middleware de sanitización global
app.use(sanitizeStrings);

// Health check endpoint mejorado (sin autenticación)
app.get("/health", (req, res) => {
  const circuitBreakers = circuitBreakerManager.getAllStates();
  const allHealthy = Object.values(circuitBreakers).every(
    (cb) => cb.state === "CLOSED"
  );

  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    circuitBreakers,
    healthy: allHealthy,
  });
});

app.use("/api", indexRouter);
app.use("/user-subscription", userSubscriptionRouter);
app.use("/subscription-plans", subscriptionPlansRouter);

// Manejador de rutas no encontradas
app.use(notFoundHandler);

// Middleware de manejo de errores global
app.use(errorHandler);

const server = http.createServer(app);

const PORT = process.env.PORT || 8083;

server.listen(PORT, "0.0.0.0", () => {
  logger.info(`Subscription microservice started`, {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
  });
});

// Manejo de errores no capturados
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception - shutting down gracefully", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection - shutting down gracefully", reason, {
    promise: promise.toString(),
  });
  gracefulShutdown("unhandledRejection");
});

// Manejo de señales de terminación
process.on("SIGTERM", () => {
  logger.info("SIGTERM received - shutting down gracefully");
  gracefulShutdown("SIGTERM");
});

process.on("SIGINT", () => {
  logger.info("SIGINT received - shutting down gracefully");
  gracefulShutdown("SIGINT");
});

/**
 * Apagado graceful del servidor
 */
function gracefulShutdown(signal) {
  logger.info(`Graceful shutdown initiated by ${signal}`);

  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

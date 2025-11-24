import logger from "../utils/logger.js";
import {
  ApiError,
  ExternalServiceError,
  DatabaseError,
  ValidationError,
  CircuitBreakerError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  TimeoutError,
} from "../errors/CustomErrors.js";

/**
 * Middleware de manejo de errores global mejorado
 * Maneja diferentes tipos de errores y proporciona respuestas consistentes
 */
export const errorHandler = (err, req, res, next) => {
  // Determinar el código de estado
  let statusCode = err.statusCode || 500;
  let message = err.message || "Error interno del servidor";
  let errorType = err.name || "Error";

  // Contexto adicional para el log
  const context = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    ...(err.context || {}),
  };

  // Manejo específico según el tipo de error
  if (err instanceof ValidationError) {
    statusCode = 400;
    errorType = "ValidationError";
    logger.warn(`Validation error: ${message}`, context);
  } else if (err instanceof AuthenticationError) {
    statusCode = 401;
    errorType = "AuthenticationError";
    logger.warn(`Authentication error: ${message}`, context);
  } else if (err instanceof NotFoundError) {
    statusCode = 404;
    errorType = "NotFoundError";
    logger.info(`Resource not found: ${message}`, context);
  } else if (err instanceof ConflictError) {
    statusCode = 409;
    errorType = "ConflictError";
    logger.warn(`Conflict error: ${message}`, context);
  } else if (err instanceof TimeoutError) {
    statusCode = 408;
    errorType = "TimeoutError";
    logger.error(`Timeout error: ${message}`, err, context);
  } else if (err instanceof CircuitBreakerError) {
    statusCode = 503;
    errorType = "CircuitBreakerError";
    logger.error(`Circuit breaker error: ${message}`, err, context);
  } else if (err instanceof ExternalServiceError) {
    statusCode = 503;
    errorType = "ExternalServiceError";
    logger.error(`External service error: ${message}`, err, context);
  } else if (err instanceof DatabaseError) {
    statusCode = 500;
    errorType = "DatabaseError";
    logger.error(`Database error: ${message}`, err, context);
  } else if (err instanceof ApiError) {
    // ApiError genérico
    logger.error(`API error: ${message}`, err, context);
  } else {
    // Error no manejado
    statusCode = 500;
    errorType = "UnhandledError";
    logger.error(`Unhandled error: ${message}`, err, context);
  }

  // En producción, sanitizar el mensaje de error
  if (process.env.NODE_ENV === "production" && statusCode === 500) {
    message = "Error interno del servidor";
  }

  // Construir respuesta de error consistente
  const errorResponse = {
    success: false,
    error: {
      type: errorType,
      message: message,
      statusCode: statusCode,
      timestamp: new Date().toISOString(),
    },
  };

  // En desarrollo, incluir información adicional
  if (process.env.NODE_ENV === "development") {
    errorResponse.error.stack = err.stack;
    errorResponse.error.context = err.context;
  }

  // Enviar respuesta
  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware para manejar rutas no encontradas
 */
export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError("Ruta", req.originalUrl);
  next(error);
};

/**
 * Wrapper para async route handlers
 * Captura errores en funciones async y los pasa al error handler
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

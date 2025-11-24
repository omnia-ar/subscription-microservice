/**
 * Sistema de errores personalizados para el microservicio de suscripciones
 * Proporciona categorización y contexto detallado para mejor debugging y logging
 */

/**
 * Error base mejorado con contexto adicional
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.isOperational = true; // Error esperado vs error de programación
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === "development" && { stack: this.stack }),
    };
  }
}

/**
 * Error para fallos en llamadas a servicios externos
 * Incluye información sobre el servicio afectado y la operación
 */
export class ExternalServiceError extends ApiError {
  constructor(
    message,
    serviceName,
    operation,
    originalError = null,
    context = {}
  ) {
    super(message, 503, {
      ...context,
      serviceName,
      operation,
      originalError: originalError?.message,
    });
    this.serviceName = serviceName;
    this.operation = operation;
    this.originalError = originalError;
  }
}

/**
 * Error para fallos en operaciones de base de datos
 */
export class DatabaseError extends ApiError {
  constructor(message, operation, originalError = null, context = {}) {
    super(message, 500, {
      ...context,
      operation,
      originalError: originalError?.message,
    });
    this.operation = operation;
    this.originalError = originalError;
  }
}

/**
 * Error para validación de datos
 */
export class ValidationError extends ApiError {
  constructor(message, field = null, value = null, context = {}) {
    super(message, 400, {
      ...context,
      field,
      value: process.env.NODE_ENV === "development" ? value : undefined,
    });
    this.field = field;
  }
}

/**
 * Error cuando el Circuit Breaker está abierto
 */
export class CircuitBreakerError extends ApiError {
  constructor(serviceName, context = {}) {
    super(
      `El servicio ${serviceName} no está disponible temporalmente. Por favor, intenta más tarde.`,
      503,
      {
        ...context,
        serviceName,
        reason: "Circuit breaker is OPEN",
      }
    );
    this.serviceName = serviceName;
  }
}

/**
 * Error de autenticación/autorización
 */
export class AuthenticationError extends ApiError {
  constructor(message = "No autorizado", context = {}) {
    super(message, 401, context);
  }
}

/**
 * Error de recurso no encontrado
 */
export class NotFoundError extends ApiError {
  constructor(resource, identifier = null, context = {}) {
    super(
      `${resource} no encontrado${identifier ? `: ${identifier}` : ""}`,
      404,
      {
        ...context,
        resource,
        identifier,
      }
    );
    this.resource = resource;
    this.identifier = identifier;
  }
}

/**
 * Error de conflicto (ej: recurso ya existe)
 */
export class ConflictError extends ApiError {
  constructor(message, resource = null, context = {}) {
    super(message, 409, {
      ...context,
      resource,
    });
    this.resource = resource;
  }
}

/**
 * Error de timeout
 */
export class TimeoutError extends ApiError {
  constructor(operation, timeout, context = {}) {
    super(
      `La operación '${operation}' excedió el tiempo límite de ${timeout}ms`,
      408,
      {
        ...context,
        operation,
        timeout,
      }
    );
    this.operation = operation;
    this.timeout = timeout;
  }
}

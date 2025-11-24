/**
 * Sistema de logging centralizado y estructurado
 * Proporciona logging consistente con niveles, contexto y formato apropiado
 */

const LOG_LEVELS = {
  ERROR: "ERROR",
  WARN: "WARN",
  INFO: "INFO",
  DEBUG: "DEBUG",
};

const LOG_COLORS = {
  ERROR: "\x1b[31m", // Rojo
  WARN: "\x1b[33m", // Amarillo
  INFO: "\x1b[36m", // Cyan
  DEBUG: "\x1b[35m", // Magenta
  RESET: "\x1b[0m",
};

class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL?.toUpperCase() || "INFO";
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  /**
   * Determina si un nivel de log debe ser mostrado
   */
  shouldLog(level) {
    const levels = Object.keys(LOG_LEVELS);
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  /**
   * Formatea el mensaje de log
   */
  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();

    if (this.isDevelopment) {
      // Formato legible para desarrollo
      const color = LOG_COLORS[level] || LOG_COLORS.RESET;
      const reset = LOG_COLORS.RESET;

      let formatted = `${color}[${timestamp}] [${level}]${reset} ${message}`;

      if (Object.keys(context).length > 0) {
        formatted += `\n${color}Context:${reset} ${JSON.stringify(
          context,
          null,
          2
        )}`;
      }

      return formatted;
    } else {
      // Formato JSON estructurado para producción
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...context,
      });
    }
  }

  /**
   * Log de error
   */
  error(message, error = null, context = {}) {
    if (!this.shouldLog(LOG_LEVELS.ERROR)) return;

    const logContext = {
      ...context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...(error.context && { context: error.context }),
          ...(error.statusCode && { statusCode: error.statusCode }),
        },
      }),
    };

    console.error(this.formatMessage(LOG_LEVELS.ERROR, message, logContext));
  }

  /**
   * Log de advertencia
   */
  warn(message, context = {}) {
    if (!this.shouldLog(LOG_LEVELS.WARN)) return;
    console.warn(this.formatMessage(LOG_LEVELS.WARN, message, context));
  }

  /**
   * Log de información
   */
  info(message, context = {}) {
    if (!this.shouldLog(LOG_LEVELS.INFO)) return;
    console.log(this.formatMessage(LOG_LEVELS.INFO, message, context));
  }

  /**
   * Log de debug
   */
  debug(message, context = {}) {
    if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;
    console.log(this.formatMessage(LOG_LEVELS.DEBUG, message, context));
  }

  /**
   * Log específico para operaciones de base de datos
   */
  database(operation, details = {}) {
    this.debug(`Database operation: ${operation}`, {
      category: "database",
      ...details,
    });
  }

  /**
   * Log específico para llamadas a servicios externos
   */
  externalService(serviceName, operation, details = {}) {
    this.debug(`External service call: ${serviceName}.${operation}`, {
      category: "external_service",
      serviceName,
      operation,
      ...details,
    });
  }

  /**
   * Log específico para requests HTTP
   */
  http(method, url, statusCode, duration = null, details = {}) {
    const message = `${method} ${url} ${statusCode}${
      duration ? ` (${duration}ms)` : ""
    }`;

    if (statusCode >= 500) {
      this.error(message, null, {
        category: "http",
        method,
        url,
        statusCode,
        duration,
        ...details,
      });
    } else if (statusCode >= 400) {
      this.warn(message, {
        category: "http",
        method,
        url,
        statusCode,
        duration,
        ...details,
      });
    } else {
      this.info(message, {
        category: "http",
        method,
        url,
        statusCode,
        duration,
        ...details,
      });
    }
  }

  /**
   * Log de métricas de rendimiento
   */
  performance(operation, duration, details = {}) {
    this.info(`Performance: ${operation} completed in ${duration}ms`, {
      category: "performance",
      operation,
      duration,
      ...details,
    });
  }

  /**
   * Log de seguridad
   */
  security(event, details = {}) {
    this.warn(`Security event: ${event}`, {
      category: "security",
      event,
      ...details,
    });
  }
}

// Exportar instancia singleton
export default new Logger();

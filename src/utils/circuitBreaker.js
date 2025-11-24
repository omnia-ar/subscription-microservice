/**
 * Implementación del patrón Circuit Breaker
 * Protege el microservicio de fallos en cascada cuando servicios externos fallan
 */

import logger from "./logger.js";
import { CircuitBreakerError } from "../errors/CustomErrors.js";

const CIRCUIT_STATE = {
  CLOSED: "CLOSED", // Funcionamiento normal
  OPEN: "OPEN", // Bloqueado por muchos fallos
  HALF_OPEN: "HALF_OPEN", // Probando si el servicio se recuperó
};

class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = CIRCUIT_STATE.CLOSED;

    // Configuración
    this.failureThreshold = options.failureThreshold || 5; // Fallos antes de abrir
    this.successThreshold = options.successThreshold || 2; // Éxitos para cerrar desde HALF_OPEN
    this.timeout = options.timeout || 60000; // Tiempo antes de intentar HALF_OPEN (1 min)
    this.resetTimeout = options.resetTimeout || 30000; // Tiempo para resetear contadores

    // Contadores
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.lastFailureTime = null;

    // Métricas
    this.metrics = {
      totalCalls: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      totalRejected: 0,
    };
  }

  /**
   * Ejecuta una función protegida por el circuit breaker
   */
  async execute(fn, fallback = null) {
    this.metrics.totalCalls++;

    // Si el circuito está abierto, rechazar inmediatamente
    if (this.state === CIRCUIT_STATE.OPEN) {
      if (Date.now() < this.nextAttempt) {
        this.metrics.totalRejected++;
        logger.warn(`Circuit breaker OPEN for ${this.name}`, {
          state: this.state,
          failureCount: this.failureCount,
          nextAttempt: new Date(this.nextAttempt).toISOString(),
        });

        if (fallback) {
          logger.info(`Using fallback for ${this.name}`);
          return await fallback();
        }

        throw new CircuitBreakerError(this.name);
      }

      // Tiempo de espera cumplido, intentar HALF_OPEN
      this.state = CIRCUIT_STATE.HALF_OPEN;
      this.successCount = 0;
      logger.info(
        `Circuit breaker transitioning to HALF_OPEN for ${this.name}`
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Maneja un éxito
   */
  onSuccess() {
    this.metrics.totalSuccesses++;
    this.failureCount = 0;

    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        this.state = CIRCUIT_STATE.CLOSED;
        this.successCount = 0;
        logger.info(`Circuit breaker CLOSED for ${this.name}`, {
          state: this.state,
        });
      }
    }
  }

  /**
   * Maneja un fallo
   */
  onFailure() {
    this.metrics.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      // En HALF_OPEN, cualquier fallo vuelve a abrir el circuito
      this.state = CIRCUIT_STATE.OPEN;
      this.nextAttempt = Date.now() + this.timeout;
      logger.warn(`Circuit breaker reopened for ${this.name}`, {
        state: this.state,
        reason: "Failure in HALF_OPEN state",
      });
    } else if (this.failureCount >= this.failureThreshold) {
      // Alcanzado el umbral de fallos, abrir el circuito
      this.state = CIRCUIT_STATE.OPEN;
      this.nextAttempt = Date.now() + this.timeout;
      logger.error(`Circuit breaker OPENED for ${this.name}`, null, {
        state: this.state,
        failureCount: this.failureCount,
        threshold: this.failureThreshold,
        nextAttempt: new Date(this.nextAttempt).toISOString(),
      });
    }
  }

  /**
   * Resetea manualmente el circuit breaker
   */
  reset() {
    this.state = CIRCUIT_STATE.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    logger.info(`Circuit breaker manually reset for ${this.name}`);
  }

  /**
   * Obtiene el estado actual
   */
  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      metrics: this.metrics,
      nextAttempt:
        this.state === CIRCUIT_STATE.OPEN
          ? new Date(this.nextAttempt).toISOString()
          : null,
    };
  }

  /**
   * Verifica si el circuito está disponible
   */
  isAvailable() {
    return (
      this.state === CIRCUIT_STATE.CLOSED ||
      this.state === CIRCUIT_STATE.HALF_OPEN
    );
  }
}

/**
 * Gestor de múltiples circuit breakers
 */
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Obtiene o crea un circuit breaker
   */
  getBreaker(name, options = {}) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name);
  }

  /**
   * Obtiene el estado de todos los circuit breakers
   */
  getAllStates() {
    const states = {};
    for (const [name, breaker] of this.breakers.entries()) {
      states[name] = breaker.getState();
    }
    return states;
  }

  /**
   * Resetea todos los circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    logger.info("All circuit breakers reset");
  }
}

// Exportar instancia singleton del manager
export default new CircuitBreakerManager();

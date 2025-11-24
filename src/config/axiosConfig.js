/**
 * Configuración centralizada de Axios con interceptores
 * Incluye retry logic, circuit breaker, y logging automático
 */

import axios from "axios";
import logger from "../utils/logger.js";
import circuitBreakerManager from "../utils/circuitBreaker.js";
import { ExternalServiceError, TimeoutError } from "../errors/CustomErrors.js";

/**
 * Configuración de retry con backoff exponencial
 */
const DEFAULT_RETRY_CONFIG = {
  retries: parseInt(process.env.AXIOS_RETRY_COUNT) || 3,
  retryDelay: parseInt(process.env.AXIOS_RETRY_DELAY) || 1000,
  retryCondition: (error) => {
    // Reintentar en errores de red o errores 5xx
    return (
      !error.response ||
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ENOTFOUND" ||
      error.code === "ECONNREFUSED" ||
      (error.response && error.response.status >= 500) ||
      (error.response && error.response.status === 429) // Rate limit
    );
  },
};

/**
 * Calcula el delay para el siguiente intento con backoff exponencial
 */
function getRetryDelay(retryCount, baseDelay = 1000) {
  const delay = baseDelay * Math.pow(2, retryCount - 1);
  const jitter = Math.random() * 200; // Agregar jitter para evitar thundering herd
  return delay + jitter;
}

/**
 * Crea una instancia de Axios configurada con interceptores
 */
export function createAxiosInstance(config = {}) {
  const {
    baseURL,
    timeout = 10000,
    serviceName = "unknown",
    enableCircuitBreaker = true,
    enableRetry = true,
    retryConfig = DEFAULT_RETRY_CONFIG,
    headers = {},
  } = config;

  const instance = axios.create({
    baseURL,
    timeout,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  // Obtener o crear circuit breaker para este servicio
  const circuitBreaker = enableCircuitBreaker
    ? circuitBreakerManager.getBreaker(serviceName, {
        failureThreshold:
          parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD) || 5,
        successThreshold:
          parseInt(process.env.CIRCUIT_BREAKER_SUCCESS_THRESHOLD) || 2,
        timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 60000,
      })
    : null;

  /**
   * Request Interceptor
   */
  instance.interceptors.request.use(
    (config) => {
      // Agregar timestamp para medir duración
      config.metadata = { startTime: Date.now() };

      logger.externalService(serviceName, config.method.toUpperCase(), {
        url: config.url,
        baseURL: config.baseURL,
      });

      return config;
    },
    (error) => {
      logger.error("Request interceptor error", error, {
        serviceName,
      });
      return Promise.reject(error);
    }
  );

  /**
   * Response Interceptor con retry logic
   */
  instance.interceptors.response.use(
    (response) => {
      // Calcular duración de la llamada
      const duration = Date.now() - response.config.metadata.startTime;

      logger.http(
        response.config.method.toUpperCase(),
        `${serviceName}${response.config.url}`,
        response.status,
        duration
      );

      // Notificar éxito al circuit breaker
      if (circuitBreaker) {
        circuitBreaker.onSuccess();
      }

      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Calcular duración si está disponible
      const duration = originalRequest.metadata
        ? Date.now() - originalRequest.metadata.startTime
        : null;

      // Inicializar contador de reintentos si no existe
      if (!originalRequest._retryCount) {
        originalRequest._retryCount = 0;
      }

      // Determinar si debemos reintentar
      const shouldRetry =
        enableRetry &&
        originalRequest._retryCount < retryConfig.retries &&
        retryConfig.retryCondition(error);

      if (shouldRetry) {
        originalRequest._retryCount++;

        const delay = getRetryDelay(
          originalRequest._retryCount,
          retryConfig.retryDelay
        );

        logger.warn(
          `Retrying request to ${serviceName} (attempt ${originalRequest._retryCount}/${retryConfig.retries})`,
          {
            serviceName,
            url: originalRequest.url,
            attempt: originalRequest._retryCount,
            delay,
            error: error.message,
          }
        );

        // Esperar antes de reintentar
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Reintentar la petición
        return instance(originalRequest);
      }

      // No se puede reintentar más, registrar el error
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message;

      logger.error(`External service error: ${serviceName}`, error, {
        serviceName,
        url: originalRequest.url,
        method: originalRequest.method,
        statusCode,
        duration,
        retries: originalRequest._retryCount,
      });

      // Notificar fallo al circuit breaker
      if (circuitBreaker) {
        circuitBreaker.onFailure();
      }

      // Transformar a error personalizado
      let customError;

      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        customError = new TimeoutError(
          `${serviceName}.${originalRequest.method}`,
          originalRequest.timeout,
          {
            url: originalRequest.url,
            serviceName,
          }
        );
      } else {
        customError = new ExternalServiceError(
          errorMessage || `Error en servicio externo: ${serviceName}`,
          serviceName,
          originalRequest.method,
          error,
          {
            url: originalRequest.url,
            statusCode,
            retries: originalRequest._retryCount,
          }
        );
      }

      return Promise.reject(customError);
    }
  );

  /**
   * Wrapper para ejecutar requests con circuit breaker
   */
  if (enableCircuitBreaker) {
    const originalRequest = instance.request.bind(instance);

    instance.request = async function (config) {
      return circuitBreaker.execute(
        () => originalRequest(config),
        config.fallback // Fallback opcional
      );
    };
  }

  return instance;
}

/**
 * Helper para crear un fallback que retorna datos por defecto
 */
export function createFallback(defaultValue) {
  return async () => {
    logger.info("Using fallback value", { defaultValue });
    return { data: defaultValue };
  };
}

/**
 * Helper para ejecutar una llamada con manejo de errores completo
 */
export async function safeExternalCall(
  axiosInstance,
  requestConfig,
  options = {}
) {
  const {
    fallback = null,
    errorMessage = "Error en llamada externa",
    serviceName = "unknown",
  } = options;

  try {
    const response = await axiosInstance.request(requestConfig);
    return { success: true, data: response.data, error: null };
  } catch (error) {
    logger.error(errorMessage, error, {
      serviceName,
      url: requestConfig.url,
    });

    // Si hay fallback, usarlo
    if (fallback) {
      const fallbackData =
        typeof fallback === "function" ? await fallback() : fallback;
      return { success: false, data: fallbackData, error };
    }

    // Si no hay fallback, retornar el error
    return { success: false, data: null, error };
  }
}

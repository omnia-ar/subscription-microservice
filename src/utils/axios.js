import dotenv from "dotenv";
import { createAxiosInstance } from "../config/axiosConfig.js";

dotenv.config();

/**
 * Instancia de Axios para el API principal
 * Con retry logic, circuit breaker y logging automático
 */
export const axiosInstanceApiMain = createAxiosInstance({
  baseURL: process.env.API_BACK_URL,
  timeout: parseInt(process.env.AXIOS_TIMEOUT_API_MAIN) || 15000,
  serviceName: "api-main",
  enableCircuitBreaker: true,
  enableRetry: true,
});

/**
 * Instancia de Axios para el microservicio de notificaciones
 * Con retry logic, circuit breaker y logging automático
 */
export const axiosInstanceNotificationMicroservice = createAxiosInstance({
  baseURL: process.env.NOTIFICATION_MICROSERVICE_URL,
  timeout: parseInt(process.env.AXIOS_TIMEOUT_NOTIFICATION) || 10000,
  serviceName: "notification-service",
  enableCircuitBreaker: true,
  enableRetry: true,
});

/**
 * Instancia de Axios para el microservicio de pagos
 * Con retry logic, circuit breaker y logging automático
 */
export const axiosInstancePaymentMicroservice = createAxiosInstance({
  baseURL: process.env.PAYMENT_MICROSERVICE_URL,
  timeout: parseInt(process.env.AXIOS_TIMEOUT_PAYMENT) || 20000,
  serviceName: "payment-service",
  enableCircuitBreaker: true,
  enableRetry: true,
});

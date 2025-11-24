# Variables de Entorno - Microservicio de Suscripciones

## Variables Nuevas para Manejo de Errores

### Circuit Breaker Configuration

El Circuit Breaker protege tu microservicio de fallos en cascada cuando servicios externos fallan.

| Variable                            | Valor por Defecto | Descripción                                                               |
| ----------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| `CIRCUIT_BREAKER_FAILURE_THRESHOLD` | `5`               | Número de fallos consecutivos antes de abrir el circuito                  |
| `CIRCUIT_BREAKER_SUCCESS_THRESHOLD` | `2`               | Número de éxitos necesarios para cerrar el circuito desde HALF_OPEN       |
| `CIRCUIT_BREAKER_TIMEOUT`           | `60000`           | Tiempo (ms) que el circuito permanece abierto antes de intentar HALF_OPEN |
| `CIRCUIT_BREAKER_RESET_TIMEOUT`     | `30000`           | Tiempo (ms) para resetear contadores de fallos                            |

### Retry Configuration

Configuración de reintentos automáticos con backoff exponencial.

| Variable            | Valor por Defecto | Descripción                                                                  |
| ------------------- | ----------------- | ---------------------------------------------------------------------------- |
| `AXIOS_RETRY_COUNT` | `3`               | Número de reintentos automáticos para llamadas fallidas                      |
| `AXIOS_RETRY_DELAY` | `1000`            | Delay base (ms) entre reintentos (se aplica backoff exponencial: 1s, 2s, 4s) |

### Timeout Configuration

Timeouts específicos por servicio externo.

| Variable                     | Valor por Defecto | Descripción                                                   |
| ---------------------------- | ----------------- | ------------------------------------------------------------- |
| `AXIOS_TIMEOUT_API_MAIN`     | `15000`           | Timeout (ms) para llamadas al API principal                   |
| `AXIOS_TIMEOUT_NOTIFICATION` | `10000`           | Timeout (ms) para llamadas al microservicio de notificaciones |
| `AXIOS_TIMEOUT_PAYMENT`      | `20000`           | Timeout (ms) para llamadas al microservicio de pagos          |

### Logging Configuration

Sistema de logging estructurado.

| Variable    | Valor por Defecto | Descripción                                        |
| ----------- | ----------------- | -------------------------------------------------- |
| `LOG_LEVEL` | `info`            | Nivel de logging: `ERROR`, `WARN`, `INFO`, `DEBUG` |
| `NODE_ENV`  | `development`     | Ambiente de ejecución: `development`, `production` |

## Ejemplo de Configuración

```bash
# Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=2
CIRCUIT_BREAKER_TIMEOUT=60000
CIRCUIT_BREAKER_RESET_TIMEOUT=30000

# Retry Logic
AXIOS_RETRY_COUNT=3
AXIOS_RETRY_DELAY=1000

# Timeouts
AXIOS_TIMEOUT_API_MAIN=15000
AXIOS_TIMEOUT_NOTIFICATION=10000
AXIOS_TIMEOUT_PAYMENT=20000

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

## Notas Importantes

- **Todas estas variables son opcionales** - el sistema usa valores por defecto si no están definidas
- En **producción**, considera usar `LOG_LEVEL=warn` para reducir el volumen de logs
- Los timeouts deben ajustarse según la latencia esperada de cada servicio
- El Circuit Breaker se activa automáticamente cuando un servicio falla repetidamente

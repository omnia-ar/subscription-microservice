#!/bin/bash

# ======================================================
# Script de despliegue a Cloud Run
# Microservicio de Suscripciones
# ======================================================

# Configuración de Google Cloud
PROJECT_ID="omnia-web-472519"
REPO_NAME="omnia"
SERVICE_NAME="omnia-subscription-service"
REGION="southamerica-east1"

# ======================================================
# Despliegue con variables de entorno
# ======================================================

gcloud run deploy ${SERVICE_NAME} \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --timeout 300s \
  --concurrency 80 \
  --min-instances 0 \
  --max-instances 10 \
  --port 8080 \
  --set-env-vars="NODE_ENV=production,\
PORT=8080,\
FRONT_URL=https://omnia-ar.com,\
FRONTEND_URL_VERCEL=https://omnia-ai-nine.vercel.app,\
API_BACK_URL=https://api.omnia-ar.com,\
GATEWAY_URL=https://edge.omnia-ar.com,\
PAYMENT_MICROSERVICE_URL=https://omnia-payment-microservice-628423787756.southamerica-east1.run.app,\
PAYMENTS_MICROSERVICE_URL=https://omnia-payment-microservice-628423787756.southamerica-east1.run.app,\
NOTIFICATION_MICROSERVICE_URL=https://notification.omnia-ar.com,\
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5,\
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=2,\
CIRCUIT_BREAKER_TIMEOUT=60000,\
CIRCUIT_BREAKER_RESET_TIMEOUT=30000,\
AXIOS_RETRY_COUNT=3,\
AXIOS_RETRY_DELAY=1000,\
AXIOS_TIMEOUT_API_MAIN=15000,\
AXIOS_TIMEOUT_NOTIFICATION=10000,\
AXIOS_TIMEOUT_PAYMENT=20000,\
LOG_LEVEL=warn,\
DB_HOST=db.qlgesrdmytlfvzxvngxz.supabase.co,\
DB_PORT=6543,\
DB_NAME=postgres,\
DB_USER=postgres" \
  --set-secrets "DB_PASSWORD=DB_PASSWORD:latest,\
PAYMENTS_MICROSERVICE_TOKEN=PAYMENTS_MICROSERVICE_TOKEN:latest"

# ======================================================
# NOTAS:
# ======================================================
# 1. Las variables sensibles (DB_PASSWORD y tokens) se obtienen de Secret Manager
# 2. Antes de ejecutar, crea los secretos con: ./create-secrets.sh
# 3. Para deploy con todas las variables inline: ./deploy-cloud-run-inline.sh
# ======================================================

echo ""
echo "✅ Despliegue completado"
echo "📌 URL del servicio:"
gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(status.url)'

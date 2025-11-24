#!/bin/bash

# ======================================================
# Script de despliegue SIMPLIFICADO (todas las vars inline)
# Servicio: omnia-subscription-service
# ⚠️  Solo para desarrollo/testing - NO para producción
# ======================================================

# Configuración de Google Cloud
PROJECT_ID="omnia-web-472519"
REPO_NAME="omnia"
SERVICE_NAME="omnia-subscription-service"
REGION="southamerica-east1"

DB_PASSWORD="120625.Omnia$"  
PAYMENTS_TOKEN="4ac01f134609b211f4b90feead29232d7e052fab41b70f03679fd0c845c26104" 

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
  --set-env-vars "\
NODE_ENV=production,\
PORT=8080,\
FRONT_URL=https://omnia-ar.com,\
FRONTEND_URL_VERCEL=https://omnia-ai-nine.vercel.app,\
API_BACK_URL=https://api.omnia-ar.com,\
PAYMENT_MICROSERVICE_URL=https://payments.omnia-ar.com,\
PAYMENTS_MICROSERVICE_URL=https://payments.omnia-ar.com,\
PAYMENTS_MICROSERVICE_TOKEN=${PAYMENTS_TOKEN},\
DB_HOST=db.qlgesrdmytlfvzxvngxz.supabase.co,\
DB_PORT=6543,\
DB_NAME=postgres,\
DB_USER=postgres,\
DB_PASSWORD=${DB_PASSWORD}"

echo ""
echo "✅ Despliegue completado"
echo "⚠️  ADVERTENCIA: Este script expone credenciales. Para producción usa: ./deploy-cloud-run.sh"
echo ""
echo "📌 URL del servicio:"
gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(status.url)'

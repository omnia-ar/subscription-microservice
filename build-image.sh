#!/bin/bash

# ======================================================
# Script para construir y subir imagen Docker
# Microservicio de Suscripciones
# ======================================================

set -e

PROJECT_ID="omnia-web-472519"
REPO_NAME="omnia"
SERVICE_NAME="omnia-subscription-service"
REGION="southamerica-east1"

echo "======================================"
echo "🏗️  Construcción de Imagen Docker"
echo "======================================"
echo "📦 Proyecto: ${PROJECT_ID}"
echo "🗄️  Repositorio: ${REPO_NAME}"
echo "🤖 Servicio: ${SERVICE_NAME}"
echo "🌎 Región: ${REGION}"
echo "======================================"
echo ""

# Verificar proyecto
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo "📝 Cambiando al proyecto: $PROJECT_ID"
    gcloud config set project $PROJECT_ID
fi

# Build con Cloud Build
echo "🏗️  Construyendo imagen con Cloud Build..."
echo ""

IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"

gcloud builds submit \
  --tag ${IMAGE_URL} \
  --timeout=15m

echo ""
echo "======================================"
echo "✅ Imagen construida exitosamente"
echo "======================================"
echo "📦 Imagen: ${IMAGE_URL}"
echo ""
echo "🚀 Para desplegar, ejecuta:"
echo "   ./deploy-cloud-run.sh"
echo "======================================"

#!/bin/bash

# ================================================================
# 🚀 Script de Despliegue Completo a Google Cloud Run
# ================================================================
# Proyecto: omnia-web-472519
# Repositorio: omnia (Artifact Registry)
# Servicio: omnia-subscription-service
# Región: southamerica-east1
# ================================================================

set -e  # Detener si hay error

PROJECT_ID="omnia-web-472519"
REPO_NAME="omnia"
SERVICE_NAME="omnia-subscription-service"
REGION="southamerica-east1"

echo "======================================"
echo "🚀 Despliegue de Omnia Subscription Service"
echo "======================================"
echo "📦 Proyecto: ${PROJECT_ID}"
echo "🗄️  Repositorio: ${REPO_NAME}"
echo "🤖 Servicio: ${SERVICE_NAME}"
echo "🌎 Región: ${REGION}"
echo "======================================"
echo ""

# Paso 1: Verificar que estamos en el proyecto correcto
echo "1️⃣  Verificando proyecto de Google Cloud..."
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo "⚠️  Proyecto actual: $CURRENT_PROJECT"
    echo "📝 Cambiando al proyecto: $PROJECT_ID"
    gcloud config set project $PROJECT_ID
fi
echo "✅ Proyecto configurado: $PROJECT_ID"
echo ""

# Paso 2: Crear secretos en Secret Manager
echo "2️⃣  ¿Deseas crear/actualizar los secretos en Secret Manager? (recomendado)"
read -p "   Ejecutar create-secrets.sh? (s/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    echo "🔐 Ejecutando create-secrets.sh..."
    ./create-secrets.sh
    echo ""
    
    # Asignar permisos a la cuenta de servicio
    echo "🔑 Asignando permisos de Secret Manager..."
    PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
    SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
    
    gcloud projects add-iam-policy-binding $PROJECT_ID \
      --member="serviceAccount:${SERVICE_ACCOUNT}" \
      --role="roles/secretmanager.secretAccessor" \
      --condition=None 2>/dev/null || echo "ℹ️  Permisos ya asignados"
    
    echo "✅ Secretos configurados"
    echo ""
else
    echo "⏭️  Saltando configuración de secretos"
    echo ""
fi

# Paso 3: Build de la imagen Docker
echo "3️⃣  ¿Deseas construir una nueva imagen Docker? (si ya la tienes, puedes saltar)"
read -p "   Ejecutar build? (s/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    echo "🏗️  Construyendo imagen Docker..."
    gcloud builds submit \
      --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest
    echo "✅ Imagen construida y subida"
    echo ""
else
    echo "⏭️  Usando imagen existente"
    echo ""
fi

# Paso 4: Desplegar a Cloud Run
echo "4️⃣  Desplegando a Cloud Run..."
echo ""
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
  --set-env-vars="NODE_ENV=production,FRONT_URL=https://omnia-ar.com,FRONTEND_URL_VERCEL=https://omnia-ai-nine.vercel.app,API_BACK_URL=https://api.omnia-ar.com,PAYMENT_MICROSERVICE_URL=https://payments.omnia-ar.com,PAYMENTS_MICROSERVICE_URL=https://payments.omnia-ar.com,DB_HOST=db.qlgesrdmytlfvzxvngxz.supabase.co,DB_PORT=6543,DB_NAME=postgres,DB_USER=postgres" \
  --set-secrets "DB_PASSWORD=DB_PASSWORD:latest,PAYMENTS_MICROSERVICE_TOKEN=PAYMENTS_MICROSERVICE_TOKEN:latest"
echo ""
echo "======================================"
echo "✅ Despliegue completado exitosamente"
echo "======================================"
echo ""

# Paso 5: Obtener URL del servicio
echo "5️⃣  Información del servicio:"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(status.url)')
echo "🌐 URL: ${SERVICE_URL}"
echo ""

# Paso 6: Test básico
echo "6️⃣  Probando el endpoint /health..."
sleep 3  # Dar tiempo a que el servicio esté listo
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" ${SERVICE_URL}/health || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Servicio respondiendo correctamente"
else
    echo "⚠️  El servicio no responde (HTTP $HTTP_CODE). Revisa los logs:"
    echo "   gcloud run services logs tail ${SERVICE_NAME} --region ${REGION}"
fi

echo ""
echo "======================================"
echo "📊 Comandos útiles:"
echo "======================================"
echo "Ver logs:"
echo "  gcloud run services logs tail ${SERVICE_NAME} --region ${REGION}"
echo ""
echo "Ver logs en tiempo real:"
echo "  gcloud run services logs tail ${SERVICE_NAME} --region ${REGION} --follow"
echo ""
echo "Ver detalles del servicio:"
echo "  gcloud run services describe ${SERVICE_NAME} --region ${REGION}"
echo ""
echo "Actualizar variables de entorno:"
echo "  gcloud run services update ${SERVICE_NAME} --region ${REGION} --update-env-vars KEY=VALUE"
echo ""
echo "Probar el servicio:"
echo "  curl ${SERVICE_URL}/health"
echo ""
echo "======================================"

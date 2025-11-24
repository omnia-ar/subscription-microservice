#!/bin/bash

# ======================================================
# Script para crear secretos en Google Secret Manager
# Servicio: omnia-subscription-service
# ======================================================

# Configuración de Google Cloud
PROJECT_ID="omnia-web-472519"

echo "🔐 Creando secretos en Secret Manager"
echo "📦 Proyecto: ${PROJECT_ID}"
echo "📦 Servicio: omnia-subscription-service"
echo ""

# Función para crear o actualizar un secreto
create_or_update_secret() {
  local SECRET_NAME=$1
  local SECRET_VALUE=$2
  
  # Verificar si el secreto existe
  if gcloud secrets describe ${SECRET_NAME} --project=${PROJECT_ID} &>/dev/null; then
    echo "📝 Actualizando secreto: ${SECRET_NAME}"
    echo -n "${SECRET_VALUE}" | gcloud secrets versions add ${SECRET_NAME} \
      --project=${PROJECT_ID} \
      --data-file=-
  else
    echo "✨ Creando nuevo secreto: ${SECRET_NAME}"
    echo -n "${SECRET_VALUE}" | gcloud secrets create ${SECRET_NAME} \
      --project=${PROJECT_ID} \
      --replication-policy="automatic" \
      --data-file=-
  fi
}

# ======================================================
# Crear secretos sensibles
# ======================================================

echo "⚠️  IMPORTANTE: Edita este script y reemplaza los valores de ejemplo con tus credenciales reales"
echo ""

# Password de la base de datos PostgreSQL
DB_PASSWORD="120625.Omnia$"  
create_or_update_secret "DB_PASSWORD" "${DB_PASSWORD}"

# Token para comunicación con microservicio de pagos
PAYMENTS_TOKEN="4ac01f134609b211f4b90feead29232d7e052fab41b70f03679fd0c845c26104"  
create_or_update_secret "PAYMENTS_MICROSERVICE_TOKEN" "${PAYMENTS_TOKEN}"

echo ""
echo "✅ Secretos creados/actualizados"
echo ""
echo "⚠️  Asignando permisos a Cloud Run..."

# Obtener el número de proyecto y asignar permisos
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "📌 Cuenta de servicio: ${SERVICE_ACCOUNT}"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None 2>/dev/null || echo "ℹ️  Permisos ya asignados"

echo ""
echo "✅ Configuración completada"
echo ""
echo "📋 Verificar secretos:"
echo "    gcloud secrets list --project=${PROJECT_ID}"

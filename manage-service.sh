#!/bin/bash

# ======================================================
# Script de gestión del servicio en Cloud Run
# ======================================================

PROJECT_ID="omnia-web-472519"
SERVICE_NAME="omnia-subscription-service"
REGION="southamerica-east1"

show_menu() {
    echo ""
    echo "======================================"
    echo "🔧 Gestión de omnia-subscription-service"
    echo "======================================"
    echo "1. Ver logs en tiempo real"
    echo "2. Ver estado del servicio"
    echo "3. Ver últimos logs"
    echo "4. Obtener URL del servicio"
    echo "5. Ver métricas"
    echo "6. Listar revisiones"
    echo "7. Actualizar variable de entorno"
    echo "8. Reiniciar servicio"
    echo "9. Ver secretos configurados"
    echo "10. Probar endpoint /health"
    echo "0. Salir"
    echo "======================================"
    echo -n "Selecciona una opción: "
}

ver_logs_tiempo_real() {
    echo ""
    echo "📊 Logs en tiempo real (Ctrl+C para salir)..."
    gcloud run services logs tail ${SERVICE_NAME} \
      --region ${REGION} \
      --follow
}

ver_estado() {
    echo ""
    echo "📋 Estado del servicio:"
    gcloud run services describe ${SERVICE_NAME} \
      --region ${REGION} \
      --format="table(
        metadata.name,
        status.url,
        status.conditions.type,
        status.conditions.status,
        metadata.generation
      )"
}

ver_ultimos_logs() {
    echo -n "¿Cuántos logs quieres ver? (default: 50): "
    read LIMIT
    LIMIT=${LIMIT:-50}
    
    echo ""
    echo "📄 Últimos ${LIMIT} logs:"
    gcloud run services logs read ${SERVICE_NAME} \
      --region ${REGION} \
      --limit ${LIMIT} \
      --format "table(timestamp,severity,textPayload)"
}

obtener_url() {
    echo ""
    SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
      --region ${REGION} \
      --format='value(status.url)')
    echo "🌐 URL del servicio:"
    echo "${SERVICE_URL}"
    echo ""
    echo "Endpoints disponibles:"
    echo "  - ${SERVICE_URL}/health"
    echo "  - ${SERVICE_URL}/socket.io/ (WebSocket)"
}

ver_metricas() {
    echo ""
    echo "📈 Abriendo métricas en Cloud Console..."
    echo "https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/metrics?project=${PROJECT_ID}"
    xdg-open "https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/metrics?project=${PROJECT_ID}" 2>/dev/null || \
    open "https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}/metrics?project=${PROJECT_ID}" 2>/dev/null || \
    echo "Copia el enlace anterior en tu navegador"
}

listar_revisiones() {
    echo ""
    echo "📦 Revisiones del servicio:"
    gcloud run revisions list \
      --service ${SERVICE_NAME} \
      --region ${REGION} \
      --format="table(
        metadata.name,
        status.conditions.status,
        metadata.creationTimestamp,
        spec.containers[0].image
      )"
}

actualizar_variable() {
    echo ""
    echo -n "Nombre de la variable: "
    read VAR_NAME
    echo -n "Nuevo valor: "
    read VAR_VALUE
    
    echo ""
    echo "🔄 Actualizando ${VAR_NAME}=${VAR_VALUE}..."
    gcloud run services update ${SERVICE_NAME} \
      --region ${REGION} \
      --update-env-vars "${VAR_NAME}=${VAR_VALUE}"
    
    echo "✅ Variable actualizada"
}

reiniciar_servicio() {
    echo ""
    echo "⚠️  ¿Estás seguro de reiniciar el servicio? (s/n): "
    read -n 1 CONFIRM
    echo ""
    
    if [[ $CONFIRM =~ ^[SsYy]$ ]]; then
        echo "🔄 Reiniciando servicio..."
        gcloud run services update ${SERVICE_NAME} \
          --region ${REGION} \
          --update-labels "restart=$(date +%s)"
        echo "✅ Servicio reiniciado"
    else
        echo "❌ Reinicio cancelado"
    fi
}

ver_secretos() {
    echo ""
    echo "🔐 Secretos configurados para el servicio:"
    gcloud run services describe ${SERVICE_NAME} \
      --region ${REGION} \
      --format="value(spec.template.spec.containers[0].env)" | \
      grep -E "(valueFrom|name)" | \
      sed 's/.*name: /  - /g'
}

probar_health() {
    echo ""
    SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
      --region ${REGION} \
      --format='value(status.url)')
    
    echo "🔍 Probando ${SERVICE_URL}/health..."
    echo ""
    
    HTTP_CODE=$(curl -s -o /tmp/health_response.txt -w "%{http_code}" ${SERVICE_URL}/health)
    RESPONSE=$(cat /tmp/health_response.txt)
    
    echo "HTTP Status: ${HTTP_CODE}"
    echo "Response:"
    echo "${RESPONSE}" | jq . 2>/dev/null || echo "${RESPONSE}"
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo ""
        echo "✅ Servicio funcionando correctamente"
    else
        echo ""
        echo "❌ Servicio tiene problemas"
    fi
    
    rm -f /tmp/health_response.txt
}

# Main loop
while true; do
    show_menu
    read OPTION
    
    case $OPTION in
        1) ver_logs_tiempo_real ;;
        2) ver_estado ;;
        3) ver_ultimos_logs ;;
        4) obtener_url ;;
        5) ver_metricas ;;
        6) listar_revisiones ;;
        7) actualizar_variable ;;
        8) reiniciar_servicio ;;
        9) ver_secretos ;;
        10) probar_health ;;
        0) 
            echo ""
            echo "👋 ¡Hasta luego!"
            exit 0
            ;;
        *)
            echo "❌ Opción inválida"
            ;;
    esac
    
    echo ""
    read -p "Presiona Enter para continuar..."
done

import { query } from "../config/database.js";
import { statesApp } from "../utils/statesApp.js";
import { axiosInstanceNotificationMicroservice } from "../utils/axios.js";
import generateToken from "../utils/generateToken.js";
import logger from "../utils/logger.js";
import { DatabaseError, ExternalServiceError } from "../errors/CustomErrors.js";

/**
 * Evalúa y actualiza las suscripciones basándose en fechas de expiración
 * - Marca trials expirados como 'expired'
 * - Marca períodos actuales expirados como 'inactive'
 * - Marca suscripciones canceladas como 'canceled'
 */
async function evaluateAndUpdateSubscriptions() {
  const startTime = Date.now();
  const now = new Date();

  logger.info("Starting subscription evaluation", {
    timestamp: now.toISOString(),
  });

  try {
    // 1. Consulta para obtener suscripciones que necesitan actualización
    logger.debug("Querying subscriptions that need updates");

    let subscriptionsToUpdate;
    try {
      subscriptionsToUpdate = await query(
        `SELECT 
        us.id,
        us.user_sub,
        us.trial_end,
        us.current_period_end,
        us.canceled_at,
        us.status,
        us.user_sub,
        u.email,
        -- Determinar el nuevo estado basado en las condiciones
        CASE 
          -- Trial expirado
          WHEN us.trial_end IS NOT NULL 
               AND us.trial_end < $1 
               AND us.status = $2 
          THEN $3
          
          -- Período actual expirado
          WHEN us.current_period_end < $1 
               AND us.status != $4 
          THEN $4
          
          -- Cancelada
          WHEN us.canceled_at IS NOT NULL 
               AND us.canceled_at <= $1 
               AND us.status != $5 
          THEN $5
          
          ELSE us.status
        END as new_status,
        
        -- Determinar si necesita ended_at
        CASE 
          WHEN us.canceled_at IS NOT NULL 
               AND us.canceled_at <= $1 
               AND us.status != $5 
          THEN $1
          ELSE us.ended_at
        END as new_ended_at
        
      FROM user_subscription us
      JOIN users u ON us.user_sub = u.sub
      WHERE 
        -- Solo suscripciones que necesitan actualización
        (
          -- Trial expirado
          (us.trial_end IS NOT NULL 
           AND us.trial_end < $1 
           AND us.status = $2)
          OR
          -- Período actual expirado
          (us.current_period_end < $1 
           AND us.status != $4)
          OR
          -- Cancelada
          (us.canceled_at IS NOT NULL 
           AND us.canceled_at <= $1 
           AND us.status != $5)
        )
    `,
        [
          now,
          statesApp.user_suscription.active, // $2
          statesApp.user_suscription.expired, // $3
          statesApp.user_suscription.inactive, // $4
          statesApp.user_suscription.canceled, // $5
        ]
      );
    } catch (dbError) {
      throw new DatabaseError(
        "Error al consultar suscripciones para actualizar",
        "SELECT subscriptions",
        dbError
      );
    }

    if (subscriptionsToUpdate.rows.length === 0) {
      logger.info("No subscriptions need updating");
      return;
    }

    logger.info(
      `Found ${subscriptionsToUpdate.rows.length} subscriptions to update`
    );

    // 2. Actualizar todas las suscripciones en una sola transacción
    logger.debug("Starting database transaction");

    try {
      await query("BEGIN");
    } catch (dbError) {
      throw new DatabaseError(
        "Error al iniciar transacción",
        "BEGIN transaction",
        dbError
      );
    }

    try {
      // Preparar arrays para la actualización en lote
      const subscriptionIds = [];
      const newStatuses = [];
      const newEndedAts = [];
      const emailNotifications = [];

      for (const sub of subscriptionsToUpdate.rows) {
        subscriptionIds.push(sub.id);
        newStatuses.push(sub.new_status);
        newEndedAts.push(sub.new_ended_at);

        // Preparar notificaciones de email solo si el estado cambió y no es 'active'
        if (
          sub.status !== sub.new_status &&
          sub.new_status !== statesApp.user_suscription.active
        ) {
          emailNotifications.push({
            email: sub.email,
            previousStatus: sub.status,
            newStatus: sub.new_status,
            subscriptionId: sub.id,
          });
        }
      }

      logger.debug(
        `Updating ${subscriptionIds.length} subscriptions in database`
      );

      // Actualización masiva usando unnest
      try {
        await query(
          `
          UPDATE user_subscription 
          SET 
            status = data.new_status,
            ended_at = data.new_ended_at,
            updated_at = $1
          FROM (
            SELECT 
              unnest($2::integer[]) as id,
              unnest($3::varchar[]) as new_status,
              unnest($4::timestamp[]) as new_ended_at
          ) as data
          WHERE user_subscription.id = data.id
        `,
          [now, subscriptionIds, newStatuses, newEndedAts]
        );
      } catch (dbError) {
        throw new DatabaseError(
          "Error al actualizar suscripciones",
          "UPDATE subscriptions",
          dbError
        );
      }

      try {
        await query("COMMIT");
        logger.info(
          `Successfully updated ${subscriptionIds.length} subscriptions`
        );
      } catch (dbError) {
        throw new DatabaseError(
          "Error al hacer commit de transacción",
          "COMMIT transaction",
          dbError
        );
      }

      // 3. Enviar emails de notificación de forma asíncrona
      if (emailNotifications.length > 0) {
        logger.info(`Sending ${emailNotifications.length} email notifications`);

        // Enviar emails en paralelo y esperar a que terminen
        const notificationResults = await Promise.allSettled(
          emailNotifications.map((notification) =>
            sendSubscriptionStatusChangeEmail(notification)
          )
        );

        // Contar éxitos y fallos
        const successful = notificationResults.filter(
          (r) => r.status === "fulfilled"
        ).length;
        const failed = notificationResults.filter(
          (r) => r.status === "rejected"
        ).length;

        logger.info(
          `Email notifications sent: ${successful} successful, ${failed} failed`
        );

        // Loggear errores específicos
        notificationResults.forEach((result, index) => {
          if (result.status === "rejected") {
            logger.error(
              `Failed to send notification for subscription ${emailNotifications[index].subscriptionId}`,
              result.reason
            );
          }
        });
      }
    } catch (updateError) {
      logger.error(
        "Error during subscription update, rolling back",
        updateError
      );

      try {
        await query("ROLLBACK");
        logger.info("Transaction rolled back successfully");
      } catch (rollbackError) {
        logger.error("Error during rollback", rollbackError);
      }

      throw updateError;
    }

    const duration = Date.now() - startTime;
    logger.performance("Subscription evaluation completed", duration, {
      subscriptionsUpdated: subscriptionsToUpdate.rows.length,
    });
  } catch (error) {
    logger.error("Error evaluating subscriptions", error);
    throw error;
  }
}

/**
 * Función auxiliar para envío de emails
 * @param {Object} params - Parámetros del email
 * @param {string} params.email - Email del usuario
 * @param {string} params.previousStatus - Estado anterior de la suscripción
 * @param {string} params.newStatus - Nuevo estado de la suscripción
 * @param {number} params.subscriptionId - ID de la suscripción
 */
async function sendSubscriptionStatusChangeEmail({
  email,
  previousStatus,
  newStatus,
  subscriptionId,
}) {
  try {
    logger.debug(`Sending email notification to ${email}`, {
      subscriptionId,
      previousStatus,
      newStatus,
    });

    const tokenToMicroservice = generateToken({
      data: "notification-suscripcion-update",
    });

    const response = await axiosInstanceNotificationMicroservice.post(
      "api/emails/change-status-subscription",
      {
        email,
        status: newStatus,
      },
      {
        headers: {
          Authorization: `Bearer ${tokenToMicroservice}`,
        },
      }
    );

    logger.info(`Email notification sent successfully to ${email}`, {
      subscriptionId,
      newStatus,
    });

    return response.data;
  } catch (error) {
    // Loggear el error pero no relanzarlo para no afectar el proceso principal
    logger.error(
      `Error sending subscription status change email to ${email}`,
      error,
      {
        subscriptionId,
        email,
        newStatus,
        serviceName: "notification-service",
      }
    );

    // No relanzar el error - las notificaciones son secundarias
    return null;
  }
}

// Ejecutar la evaluación
evaluateAndUpdateSubscriptions()
  .then(() => {
    logger.info("Subscription evaluation completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Fatal error in subscription evaluation", error);
    process.exit(1);
  });

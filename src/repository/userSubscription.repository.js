import { query } from "../config/database.js";
import { ApiError } from "../utils/apiError.js";

class UserSubscriptionRepository {
  /**
   * Get user subscription data by sub
   * @param {string} sub - User subscription identifier
   * @returns {Promise<Object>} Subscription data
   */
  static async getUserSubscriptionData(sub) {
    try {
      // Obtener información de suscripción
      const subscriptionInfo = await query(
        `SELECT get_user_subscription_info($1) as subscription_data`,
        [sub]
      );

      // El resultado estará en subscriptionInfo.rows[0].subscription_data
      const data = subscriptionInfo.rows[0]?.subscription_data;

      if (!data) {
        throw new ApiError("No se encontró la suscripción del usuario", 404);
      }

      return data;
    } catch (error) {
      console.error("Error al obtener suscripción de usuario", error);
      throw new ApiError("Error al obtener datos de usuario", 404);
    }
  }

  /**
   * Validate if user subscription exists
   * @param {string} sub - User subscription identifier
   * @returns {Promise<Object|boolean>} Subscription data or false
   */
  static async validateExisteUserSuscription(sub) {
    try {
      // Obtener información de suscripción
      const subscriptionInfo = await query(
        `SELECT get_user_subscription_info($1) as subscription_data`,
        [sub]
      );

      // El resultado estará en subscriptionInfo.rows[0].subscription_data
      const data = subscriptionInfo.rows[0]?.subscription_data;

      if (!data.user_subscription) return false;

      return data;
    } catch (error) {
      console.error("Error al obtener suscripción de usuario", error);
    }
  }

  /**
   * Create a new user subscription
   * @param {string} sub - User subscription identifier
   * @param {number} plan_id - Plan ID
   * @param {string} status - Subscription status
   * @param {string} billing_cycle - Billing cycle
   * @param {any} trial_start - Trial start date
   * @param {any} trial_end - Trial end date
   * @param {Date} current_period_start - Current period start date
   * @param {Date} current_period_end - Current period end date
   * @param {any} canceled_at - Cancellation date
   * @param {Date} ended_at - End date
   * @param {number} current_agents_count - Current agents count
   * @param {number} current_tokens_count - Current tokens count
   * @param {number} current_users_count - Current users count
   * @param {number} amount_paid - Amount paid
   * @param {string} currency - Currency
   * @returns {Promise<Object>} Created subscription
   */
  static async createUserSubscription(
    sub,
    plan_id,
    status,
    billing_cycle,
    trial_start,
    trial_end,
    current_period_start,
    current_period_end,
    canceled_at,
    ended_at,
    current_agents_count,
    current_tokens_count,
    current_users_count,
    amount_paid,
    currency
  ) {
    console.log("planId", plan_id);

    try {
      const userSubscription = await query(
        `
        INSERT INTO user_subscription (
          created_at,
          updated_at,
          plan_id,
          status,
          billing_cycle,
          trial_start,
          trial_end,
          current_period_start,
          current_period_end,
          canceled_at,
          ended_at,
          current_agents_count,
          current_tokens_count,
          current_users_count,
          amount_paid,
          currency,
          user_sub
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING * 
      `,
        [
          new Date(), // created_at
          new Date(), // updated_at
          plan_id,
          status,
          billing_cycle,
          trial_start,
          trial_end,
          current_period_start,
          current_period_end,
          canceled_at,
          ended_at,
          current_agents_count,
          current_tokens_count,
          current_users_count,
          amount_paid,
          currency,
          sub,
        ]
      );

      if (!userSubscription || userSubscription.rows.length === 0) {
        throw new ApiError(
          "Error al crear suscripción de prueba gratuita",
          404
        );
      }

      return userSubscription.rows[0];
    } catch (error) {
      console.log(
        "error al crear suscripcion en user-suscriptionModel - line 114",
        error
      );
      throw new ApiError("Error al crear suscripción de prueba gratuita", 404);
    }
  }

  /**
   * Update user subscription
   * @param {string} sub - User subscription identifier
   * @param {number} plan_id - Plan ID
   * @param {string} status - Subscription status
   * @param {string} billing_cycle - Billing cycle
   * @param {any} trial_start - Trial start date
   * @param {any} trial_end - Trial end date
   * @param {Date} current_period_start - Current period start date
   * @param {Date} current_period_end - Current period end date
   * @param {any} canceled_at - Cancellation date
   * @param {Date} ended_at - End date
   * @param {number} current_agents_count - Current agents count
   * @param {number} current_tokens_count - Current tokens count
   * @param {number} current_users_count - Current users count
   * @param {number} amount_paid - Amount paid
   * @param {string} currency - Currency
   * @param {any} client - Optional database client for transactions
   * @returns {Promise<Object>} Updated subscription
   */
  static async updateUserSubscription(
    sub,
    plan_id,
    status,
    billing_cycle,
    trial_start,
    trial_end,
    current_period_start,
    current_period_end,
    canceled_at,
    ended_at,
    current_agents_count,
    current_tokens_count,
    current_users_count,
    amount_paid,
    currency,
    client
  ) {
    try {
      const userSubscription = await query(
        `UPDATE user_subscription
          SET plan_id = $1,
              status = $2,
              billing_cycle = $3,
              trial_start = $4,
              trial_end = $5,
              current_period_start = $6,
              current_period_end = $7,
              canceled_at = $8,
              ended_at = $9,
              current_agents_count = $10,
              current_tokens_count = $11,
              current_users_count = $12,
              amount_paid = $13,
              currency = $14
          WHERE user_sub = $15
          RETURNING *`,
        [
          plan_id,
          status,
          billing_cycle,
          trial_start,
          trial_end,
          current_period_start,
          current_period_end,
          canceled_at,
          ended_at,
          current_agents_count,
          current_tokens_count,
          current_users_count,
          amount_paid,
          currency,
          sub,
        ],
        client
      );

      if (!userSubscription)
        throw new ApiError(
          "Error al actualizar suscripción de prueba gratuita",
          404
        );

      return userSubscription.rows[0];
    } catch (error) {
      console.error("Error al actualizar suscripción", error);
      throw new ApiError(
        "Error al actualizar suscripción de prueba gratuita",
        404
      );
    }
  }

  /**
   * Update current agent count
   * @param {string} sub - User subscription identifier
   * @param {number} count - Count to increment/decrement
   * @param {string} operationType - Operation type: 'increment' or 'decrement'
   * @returns {Promise<Object>} Updated subscription
   */
  static async updateCurrentAgentCount(sub, count, operationType) {
    if (
      !sub ||
      !count ||
      (operationType !== "increment" && operationType !== "decrement")
    ) {
      throw new ApiError("Parámetros inválidos para la actualización", 400);
    }

    try {
      const updateOperation = operationType === "increment" ? count : -count;

      const updated = await query(
        `
        UPDATE user_subscription
        SET current_agents_count = current_agents_count + $1
        WHERE user_sub = $2`,
        [updateOperation, sub]
      );

      if (!updated)
        throw new ApiError(
          "Error al actualizar cantidad de agentes actuales",
          404
        );

      return updated.rows[0];
    } catch (error) {
      throw new ApiError(
        "Error al actualizar cantidad de agentes actuales: " + error.message,
        500
      );
    }
  }

  /**
   * Cancel user subscription
   * @param {string} sub - User subscription identifier
   * @returns {Promise<any>} Cancellation result
   */
  static async cancelUserSubscription(sub) {
    try {
      const sub_val = sub.toString();

      const cancelResult = await query(
        `SELECT cancel_subscription($1) as result`,
        [sub_val]
      );

      if (!cancelResult)
        throw new ApiError("Error al cancelar suscripción", 404);

      return cancelResult.rows[0].result;
    } catch (error) {
      console.error("Error al cancelar suscripción", error);
      throw new ApiError("Error al cancelar suscripción", 404);
    }
  }
}

export default UserSubscriptionRepository;

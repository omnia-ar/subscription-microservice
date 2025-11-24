import { query } from "../config/database.js";
import { ApiError } from "../utils/apiError.js";

export class SubscriptionPlansRepository {
  /**
   * Get all subscription plans
   * @returns {Promise<Array>} Array of subscription plans
   */
  static async getSubscriptionPlans() {
    try {
      const data = await query(`
        SELECT 
          id,
          created_at,
          updated_at,
          name,
          description,
          price_monthly,
          price_yearly,
          currency,
          max_agents,
          max_tokens_per_month,
          max_users,
          features,
          is_active,
          is_custom
        FROM subscription_plans
      `);

      console.log("data", data.rows);

      if (!data.rows || data.rows.length === 0) {
        throw new ApiError("No se encontro planes de subscripcion", 404);
      }

      return data.rows;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError("Error al obtener planes de subscripcion", 500);
    }
  }

  /**
   * Get all active subscription plans
   * @returns {Promise<Array>} Array of active subscription plans
   */
  static async getSuscriptionPlanActive() {
    try {
      const data = await query(`
        SELECT
          id,
          created_at,
          updated_at,
          name,
          description,
          price_monthly,
          price_yearly,
          currency,
          max_agents,
          max_tokens_per_month,
          max_users,
          features,
          is_active,
          is_custom
        FROM subscription_plans
        WHERE is_active = true
      `);

      if (!data.rows || data.rows.length === 0) {
        throw new ApiError("No se encontro planes de subscripcion", 404);
      }

      return data.rows;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        "Error al obtener planes de subscripcion activos",
        500
      );
    }
  }

  /**
   * Get subscription plan by ID
   * @param {number} id - Subscription plan ID
   * @returns {Promise<Object>} Subscription plan object
   */
  static async getSubscriptionPlanById(id) {
    try {
      const data = await query(
        `
        SELECT
          id,
          created_at,
          updated_at,
          name,
          description,
          price_monthly,
          price_yearly,
          currency,
          max_agents,
          max_tokens_per_month,
          max_users,
          features,
          is_active,
          is_custom
        FROM subscription_plans
        WHERE id = $1
      `,
        [id]
      );

      if (!data.rows || data.rows.length === 0) {
        throw new ApiError("No se encontro planes de subscripcion", 404);
      }

      return data.rows[0];
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError("Error al obtener planes de subscripcion", 500);
    }
  }
}
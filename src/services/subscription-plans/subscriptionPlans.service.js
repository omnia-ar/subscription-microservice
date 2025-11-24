import { SubscriptionPlansRepository } from "../../repository/subscriptionPlans.repository.js";
import { ApiError } from "../../utils/apiError.js";

class SubscriptionPlanService {
  /**
   * Get all subscription plans
   * @returns {Promise<Object>} Object with status and data
   */
  async getSubscriptionPlans() {
    try {
      const subscriptionPlans =
        await SubscriptionPlansRepository.getSubscriptionPlans();

      return { status: true, data: subscriptionPlans };
    } catch (error) {
      throw new ApiError("Error al obtener planes de subscripcion", 404);
    }
  }

  /**
   * Get all active subscription plans
   * @returns {Promise<Object>} Object with status and data
   */
  async getSuscriptionPlanActive() {
    try {
      const subscriptionPlanActive =
        await SubscriptionPlansRepository.getSuscriptionPlanActive();

      return { status: true, data: subscriptionPlanActive };
    } catch (error) {
      throw new ApiError(
        "Error al obtener planes de subscripcion activos",
        404
      );
    }
  }

  /**
   * Get subscription plan by ID
   * @param {string} id - Subscription plan ID
   * @returns {Promise<Object>} Object with status and data
   */
  async getSubscriptionPlanById(id) {
    try {
      let idPlan = parseInt(id);

      const subscriptionPlan =
        await SubscriptionPlansRepository.getSubscriptionPlanById(idPlan);

      return { status: true, data: subscriptionPlan };
    } catch (error) {
      throw new ApiError("Error al obtener planes de subscripcion", 404);
    }
  }
}

export default new SubscriptionPlanService();

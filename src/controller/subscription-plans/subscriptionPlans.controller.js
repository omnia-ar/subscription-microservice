import subscriptionPlanService from "../../services/subscription-plans/subscriptionPlans.service.js";

class SubscriptionPlansController {
  /**
   * Get all subscription plans
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getSubscriptionPlans(req, res, next) {
    try {
      const subscriptionPlans =
        await subscriptionPlanService.getSubscriptionPlans();

      res.status(200).json(subscriptionPlans);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all active subscription plans
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getSuscriptionPlanActive(req, res, next) {
    try {
      const subscriptionPlanActive =
        await subscriptionPlanService.getSuscriptionPlanActive();

      res.status(200).json(subscriptionPlanActive);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get subscription plan by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getSuscriptionPlanById(req, res, next) {
    try {
      const { id } = req.params;
      const subscriptionPlan =
        await subscriptionPlanService.getSubscriptionPlanById(id);
      res.status(200).json(subscriptionPlan);
    } catch (error) {
      next(error);
    }
  }
}

export default new SubscriptionPlansController();

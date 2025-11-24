import userSubscriptionService from "../../services/user-subscription/userSubscription.service.js";

class UserSubscriptionController {
  async getUserSubscriptionData(req, res, next) {
    try {
      const { sub } = req.user;

      if (!sub) return res.status(404).json({ error: "No se encontro sub" });

      const userSubscriptionData =
        await userSubscriptionService.getUserSubscriptionData(sub);
      res.status(200).json(userSubscriptionData);
    } catch (error) {
      next(error);
    }
  }

  async createFreeTrial(req, res, next) {
    try {
      const { sub } = req.user;
      console.log("req.user");
      const plan_id = req.body.plan_id;

      if (!sub) return res.status(404).json({ error: "No se encontro sub" });

      const userSubscriptionData =
        await userSubscriptionService.createFreeTrial(sub, plan_id);

      res.status(200).json(userSubscriptionData);
    } catch (error) {
      next(error);
    }
  }

  async register(req, res, next) {
    try {
      const { sub } = req.user;
      const data = req.body;

      if (!sub) return res.status(404).json({ error: "No se encontro sub" });

      const userSubscriptionData = await userSubscriptionService.register(
        sub,
        data
      );

      res.status(200).json(userSubscriptionData);
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const { sub } = req.user;

      if (!sub) return res.status(404).json({ error: "No se encontro sub" });

      const userSubscriptionData = await userSubscriptionService.cancel(sub);

      res.status(200).json(userSubscriptionData);
    } catch (error) {
      next(error);
    }
  }
}

export default new UserSubscriptionController();

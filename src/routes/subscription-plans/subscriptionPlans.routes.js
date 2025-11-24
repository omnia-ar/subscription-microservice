import { Router } from "express";

import subscriptionPlansController from "../../controller/subscription-plans/subscriptionPlans.controller.js";

const router = Router();

router.get("/", subscriptionPlansController.getSubscriptionPlans);

router.get("/active", subscriptionPlansController.getSuscriptionPlanActive);

router.get("/:id", subscriptionPlansController.getSuscriptionPlanById);

export default router;

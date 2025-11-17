import { Router } from "express";

import {
  activeSubscriptionController,
  canceledSubscriptionController,
  expiredSubscriptionController,
  pendingSubscriptionController,
  paymentFailedController,
  revokeSubscriptionController,
} from "../../controller/subscriptions/subscription.controller.js";

const router = Router();

router.post("/pending", pendingSubscriptionController);

router.post("/active", activeSubscriptionController);

router.post("/canceled", canceledSubscriptionController);

router.post("/expired", expiredSubscriptionController);

router.post("/payment-failed", paymentFailedController);

router.post("/revoke", revokeSubscriptionController);

export default router;

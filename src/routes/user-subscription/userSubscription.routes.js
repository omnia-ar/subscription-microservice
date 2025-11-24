import { Router } from "express";

import userSubscriptionController from "../../controller/user-subscription/userSubscription.controller.js";

import { verifyTokenFromCookie } from "../../middleware/authMiddlewareCookies.js";

const router = Router();

router.get(
  "/",
  verifyTokenFromCookie,
  userSubscriptionController.getUserSubscriptionData
);

router.post(
  "/create-free-trial",
  verifyTokenFromCookie,
  userSubscriptionController.createFreeTrial
);

router.post(
  "/register",
  verifyTokenFromCookie,
  userSubscriptionController.register
);

router.put("/cancel", verifyTokenFromCookie, userSubscriptionController.cancel);

export default router;

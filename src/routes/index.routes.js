import { Router } from "express";

import subscriptionRouter from "./subscriptions/subscription.routes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

router.use("/subscription", subscriptionRouter);

export default router;

import { Router } from "express";

import subscriptionRouter from "./subscriptions/subscription.routes.js";

import { validateJWT } from "../middleware/validateJWT.js";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

router.use("/subscription", validateJWT, subscriptionRouter);

export default router;

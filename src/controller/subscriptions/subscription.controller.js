import {
  activeSubscription,
  canceledSubscription,
  expiredSubscription,
  pendingSubscription,
  handlePaymentFailure,
  revokeSubscription,
} from "../../services/subscriptions/subscription.service.js";

export const pendingSubscriptionController = async (req, res) => {
  try {
    const { user_sub, subscription_id, status_subscription } = req.body;

    const result = await pendingSubscription({
      user_sub,
      subscription_id,
      status_subscription,
    });

    // TODO: Send email to user

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const activeSubscriptionController = async (req, res) => {
  try {
    const { user_sub, subscription_id, status_subscription } = req.body;

    const result = await activeSubscription({
      user_sub,
      subscription_id,
      status_subscription,
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const canceledSubscriptionController = async (req, res) => {
  try {
    const { user_sub, subscription_id, status_subscription } = req.body;
    const result = await canceledSubscription({
      user_sub,
      subscription_id,
      status_subscription,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const expiredSubscriptionController = async (req, res) => {
  try {
    const { user_sub, subscription_id, status_subscription } = req.body;
    const result = await expiredSubscription({
      user_sub,
      subscription_id,
      status_subscription,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const paymentFailedController = async (req, res) => {
  try {
    const { user_sub, status_subscription } = req.body;
    const result = await handlePaymentFailure({
      user_sub,
      status_subscription,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const revokeSubscriptionController = async (req, res) => {
  try {
    const { user_sub, status_subscription } = req.body;
    const result = await revokeSubscription({
      user_sub,
      status_subscription,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

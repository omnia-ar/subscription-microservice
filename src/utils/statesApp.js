export const statesApp = {
  payment_history: {
    pending: "pending",
    in_process: "in-process",
    cancel: "cancel",
    success: "success",
    failed: "failed",
  },
  user_suscription: {
    pending: "pending",
    active: "active",
    inactive: "inactive",
    trial: "trial",
    canceled: "canceled",
    expired: "expired",
  },
  users: {
    true: true,
    false: false,
  },
  access_request: {
    pending: "pending",
    in_process: "in_process",
    replied: "replied",
    rejected: "rejected",
    canceled: "canceled",
  },
};

export const SUBSCRIPTION_STATUSES = [
  { value: "active", label: "Activo", color: "text-green-600 bg-green-100" },
  { value: "inactive", label: "Inactivo", color: "text-red-600 bg-red-100" },
  { value: "trial", label: "Prueba", color: "text-blue-600 bg-blue-100" },
  { value: "canceled", label: "Cancelado", color: "text-gray-600 bg-gray-100" },
  {
    value: "expired",
    label: "Expirado",
    color: "text-orange-600 bg-orange-100",
  },
];

export const AGENT_FREE_PLAN = "CreatiBot"

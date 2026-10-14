import api from "./api";

/**
 * Creates Cashfree order for Hotel Registration Checkout
 */
export const createRegistrationOrder = async (registrationId) => {
  const response = await api.post("/payments/registration/create-order", {
    registrationId,
  });
  return response.data;
};

/**
 * Verifies payment for Hotel Registration with backend
 */
export const verifyRegistrationPayment = async ({ registrationId, orderId }) => {
  const response = await api.post("/payments/registration/verify-payment", {
    registrationId,
    orderId,
  });
  return response.data;
};

/**
 * Creates Cashfree order for Hotel Subscription Upgrade / Renewal
 */
export const createSubscriptionUpgradeOrder = async ({ planId, billingCycle }) => {
  const response = await api.post("/payments/subscription-upgrade/create-order", {
    planId,
    billingCycle,
  });
  return response.data;
};

/**
 * Verifies payment for Hotel Subscription Upgrade with backend
 */
export const verifySubscriptionUpgradePayment = async ({
  orderId,
  planId,
  billingCycle,
}) => {
  const response = await api.post("/payments/subscription-upgrade/verify-payment", {
    orderId,
    planId,
    billingCycle,
  });
  return response.data;
};

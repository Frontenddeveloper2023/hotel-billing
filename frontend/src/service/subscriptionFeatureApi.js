import { getMySubscription } from "./subscriptionApi";

// ============================================================
// GET SUBSCRIPTION + PLAN ACCESS
// ============================================================
export const getSubscriptionAccess = async () => {
  try {
    const response = await getMySubscription();

    const subscription = response?.data || null;

    if (!subscription) {
      return {
        success: false,
        allowed: false,
        message:
          "Your hotel does not currently have an active subscription.",
        subscription: null,
        plan: null,
      };
    }

    const allowedSubscriptionStatuses = [
      "trial",
      "active",
      "expiring_soon",
      "grace_period",
    ];

    const subscriptionStatusAllowed =
      allowedSubscriptionStatuses.includes(subscription.status);

    const endDate = subscription.endDate
      ? new Date(subscription.endDate)
      : null;

    const subscriptionNotExpired =
      endDate &&
      !Number.isNaN(endDate.getTime()) &&
      endDate > new Date();

    // getMySubscription already populates planId
    const plan = subscription.planId || null;

    const planIsActive = plan?.isActive === true;

    const allowed =
      subscriptionStatusAllowed &&
      subscriptionNotExpired &&
      planIsActive;

    return {
      success: true,
      allowed,
      message: allowed
        ? ""
        : "Your subscription or subscription plan is not active.",
      subscription,
      plan,
    };
  } catch (error) {
    return {
      success: false,
      allowed: false,
      message:
        error?.response?.data?.message ||
        error?.message ||
        "Unable to check your subscription.",
      subscription: null,
      plan: null,
    };
  }
};

// ============================================================
// FOOD SERVICE ACCESS
// ============================================================
export const checkFoodServiceAccess = async () => {
  const result = await getSubscriptionAccess();

  if (!result.allowed) {
    return {
      ...result,
      featureAllowed: false,
    };
  }

  const subscriptionFoodEnabled =
    result.subscription?.features?.foodService === true;

  const planFoodEnabled =
    result.plan?.features?.foodService === true;

  const featureAllowed =
    subscriptionFoodEnabled && planFoodEnabled;

  return {
    ...result,
    featureAllowed,
    message: featureAllowed
      ? ""
      : "Food Service is not included in your current subscription plan.",
  };
};

// ============================================================
// ROOM SERVICE ACCESS
// ============================================================
export const checkRoomServiceAccess = async () => {
  const result = await getSubscriptionAccess();

  if (!result.allowed) {
    return {
      ...result,
      featureAllowed: false,
    };
  }

  const subscriptionRoomEnabled =
    result.subscription?.features?.roomService === true;

  const planRoomEnabled =
    result.plan?.features?.roomService === true;

  const featureAllowed =
    subscriptionRoomEnabled && planRoomEnabled;

  return {
    ...result,
    featureAllowed,
    message: featureAllowed
      ? ""
      : "Room Service is not included in your current subscription plan.",
  };
};
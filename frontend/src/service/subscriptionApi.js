import api from "./api";

// ==========================================
// CREATE SUBSCRIPTION
// ==========================================
export const createSubscription = async (subscriptionData) => {
  try {
    const response = await api.post(
      "/subscriptions/add-subscription",
      subscriptionData
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message,
      }
    );
  }
};


// ==========================================
// GET ALL SUBSCRIPTIONS
// ==========================================
export const getAllSubscriptions = async () => {
  try {
    const response = await api.get(
      "/subscriptions/list-subscriptions"
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message,
      }
    );
  }
};


// ==========================================
// GET SUBSCRIPTION BY ID
// ==========================================
export const getSubscriptionById = async (id) => {
  try {
    const response = await api.get(
      `/subscriptions/${id}`
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message,
      }
    );
  }
};


// ==========================================
// GET MY CURRENT HOTEL SUBSCRIPTION
// ==========================================
//
// Used by logged-in hotel users.
//
// IMPORTANT:
// No hotelId is sent from frontend.
// Backend gets hotelId from req.user.hotelId.
//
// ==========================================
export const getMySubscription = async () => {
  try {
    const response = await api.get(
      "/subscriptions/my-subscription"
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message,
      }
    );
  }
};


// ==========================================
// UPGRADE HOTEL SUBSCRIPTION (IMMEDIATE)
// ==========================================
//
// Immediately activates upgraded plan for logged-in hotel
// without needing admin approval.
//
// ==========================================
export const upgradeHotelSubscription = async ({ planId, billingCycle }) => {
  try {
    const response = await api.post(
      "/subscriptions/upgrade",
      {
        planId,
        billingCycle,
      }
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message,
      }
    );
  }
};


// ==========================================
// GET HOTEL SUBSCRIPTION
// ==========================================
//
// Used by SaaS Admin when checking a specific hotel.
//
// ==========================================
export const getHotelSubscription = async (hotelId) => {
  try {
    const response = await api.get(
      `/subscriptions/hotel/${hotelId}`
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message,
      }
    );
  }
};


// ==========================================
// UPDATE SUBSCRIPTION
// ==========================================
export const updateSubscription = async (
  id,
  subscriptionData
) => {
  try {
    const response = await api.put(
      `/subscriptions/update-subscription/${id}`,
      subscriptionData
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message,
      }
    );
  }
};


// ==========================================
// CANCEL SUBSCRIPTION
// ==========================================
export const cancelSubscription = async (id, reason = "") => {
  try {
    const response = await api.delete(
      `/subscriptions/cancel-subscription/${id}`,
      {
        data: { reason },
      }
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message,
      }
    );
  }
};
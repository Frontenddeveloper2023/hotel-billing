import api from "./api";

// GET ADMIN NOTIFICATIONS
export const getAdminNotifications = async () => {
  try {
    const response = await api.get(
      "/saas-notifications/admin"
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

// MARK NOTIFICATION AS READ
export const markNotificationAsRead = async (id) => {
  try {
    const response = await api.put(
      `/saas-notifications/read/${id}`
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
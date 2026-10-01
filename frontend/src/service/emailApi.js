import api from "./api";

// ============================================================
// SEND ADMIN EMAIL
// ============================================================

export const sendAdminEmail = async ({
  hotelId,
  subHotelId = null,
  recipientEmail,
  recipientName = "",
  subject,
  message,
  registrationId = null,
  subscriptionId = null,
}) => {
  try {
    const response = await api.post("/emails/send", {
      hotelId,
      subHotelId,
      recipientEmail,
      recipientName,
      subject,
      message,
      registrationId,
      subscriptionId,
    });

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message:
          error.message || "Unable to send email.",
      }
    );
  }
};


// ============================================================
// GET EMAIL HISTORY
// ============================================================

export const getEmailHistory = async ({
  hotelId,
  subHotelId = null,
}) => {
  try {
    if (!hotelId) {
      throw {
        success: false,
        message: "hotelId is required.",
      };
    }

    const params = {
      hotelId,
    };

    if (subHotelId) {
      params.subHotelId = subHotelId;
    }

    const response = await api.get("/emails/history", {
      params,
    });

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message:
          error.message ||
          "Unable to fetch email history.",
      }
    );
  }
};
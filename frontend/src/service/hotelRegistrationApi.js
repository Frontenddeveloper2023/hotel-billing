import api from "./api";

// CREATE HOTEL REGISTRATION
export const createRegistration = async (registrationData) => {
  try {
    const response = await api.post(
      "/hotel-registrations/register",
      registrationData
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


export const getRegistrationStatus = async (registrationId) => {
  try {
    const response = await api.get(
      `/hotel-registrations/status/${registrationId}`
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message:
          error.message ||
          "Unable to get application status.",
      }
    );
  }
};

// GET ALL REGISTRATIONS - ADMIN
export const getAllRegistrations = async () => {
  try {
    const response = await api.get(
      "/hotel-registrations/list-registrations"
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

// GET REGISTRATION BY ID
export const getRegistrationById = async (id) => {
  try {
    const response = await api.get(
      `/hotel-registrations/${id}`
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

// CONFIRM DUMMY PAYMENT
export const confirmDummyPayment = async (registrationId) => {
  try {
    const response = await api.post(
      `/hotel-registrations/payment/${registrationId}`
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

// APPROVE REGISTRATION
export const approveRegistration = async (id) => {
  try {
    const response = await api.put(
      `/hotel-registrations/approve/${id}`
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

// REJECT REGISTRATION
export const rejectRegistration = async (id, rejectionReason, rejectionDetails = "") => {
  try {
    const response = await api.put(
      `/hotel-registrations/reject/${id}`,
      {
        rejectionReason,
        rejectionDetails,
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




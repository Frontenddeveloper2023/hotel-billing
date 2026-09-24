import api from "./api";

// =====================================================
// GET BOOKING BY ID
// =====================================================

export const getBookingById = async (bookingId) => {
  try {
    const response = await api.get(
      `/bookings/${bookingId}`
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


// =====================================================
// ADD FOOD TO BOOKING ROOM
// =====================================================

export const addFoodService = async (
  bookingId,
  roomId,
  foodData
) => {
  try {
    const response = await api.post(
      `/bookings/${bookingId}/rooms/${roomId}/food`,
      foodData
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


// =====================================================
// MARK FOOD SERVICES AS PAID
// =====================================================

export const markFoodServicesPaid = async (
  bookingId,
  roomId
) => {
  try {
    const response = await api.patch(
      `/bookings/${bookingId}/rooms/${roomId}/food/paid`
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


// =====================================================
// DELETE FOOD SERVICE
// =====================================================

export const deleteFoodService = async (
  bookingId,
  roomId,
  foodServiceId
) => {
  try {
    const response = await api.delete(
      `/bookings/${bookingId}/rooms/${roomId}/food/${foodServiceId}`
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


// =====================================================
// UPDATE FOOD SERVICE
// =====================================================

export const updateFoodService = async (
  bookingId,
  roomId,
  foodServiceId,
  data
) => {
  try {
    const response = await api.put(
      `/bookings/${bookingId}/rooms/${roomId}/food/${foodServiceId}`,
      data
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


// =====================================================
// ADD ROOM SERVICE
// =====================================================

export const addRoomService = async (
  bookingId,
  roomId,
  serviceData
) => {
  try {
    const response = await api.post(
      `/bookings/${bookingId}/rooms/${roomId}/room-service`,
      serviceData
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


// =====================================================
// MARK ROOM SERVICES AS PAID
// =====================================================

export const markRoomServicesPaid = async (
  bookingId,
  roomId
) => {
  try {
    const response = await api.patch(
      `/bookings/${bookingId}/rooms/${roomId}/room-service/paid`
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


// =====================================================
// DELETE ROOM SERVICE
// =====================================================

export const deleteRoomService = async (
  bookingId,
  roomId,
  serviceId
) => {
  try {
    const response = await api.delete(
      `/bookings/${bookingId}/rooms/${roomId}/room-service/${serviceId}`
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


// =====================================================
// UPDATE ROOM SERVICE
// =====================================================

export const updateRoomService = async (
  bookingId,
  roomId,
  serviceId,
  data
) => {
  try {
    const response = await api.put(
      `/bookings/${bookingId}/rooms/${roomId}/room-service/${serviceId}`,
      data
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
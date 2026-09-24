import api from "./api";

// =====================================================
// 1. CREATE BOOKING
// =====================================================

export const createBooking = async (bookingData) => {
  try {
    const response = await api.post(
      "/bookings",
      bookingData
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
// 2. GET ALL BOOKINGS
// =====================================================

export const getAllBookings = async () => {
  try {
    const response = await api.get(
      "/bookings"
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
// 3. GET ALL ACTIVE BOOKINGS
// =====================================================

export const getActiveBookings = async () => {
  try {
    const response = await api.get(
      "/bookings/active"
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
// 4. GET BOOKINGS BY CUSTOMER
// =====================================================

export const getBookingsByCustomer = async (
  customerId
) => {
  try {
    const response = await api.get(
      `/bookings/customer/${customerId}`
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
// 5. GET SINGLE BOOKING
// =====================================================

export const getBookingById = async (
  bookingId
) => {
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
// 6. UPDATE BOOKING
// =====================================================

export const updateBooking = async (
  bookingId,
  updateData
) => {
  try {
    const response = await api.put(
      `/bookings/${bookingId}`,
      updateData
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
// 7. DELETE BOOKING
// =====================================================

export const deleteBooking = async (
  bookingId
) => {
  try {
    const response = await api.delete(
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
// 8. ADD BOOKING PAYMENT
// =====================================================

export const addBookingPayment = async (
  bookingId,
  paymentData
) => {
  try {
    const response = await api.post(
      `/bookings/${bookingId}/payment`,
      paymentData
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
// 9. CHECKOUT SELECTED ROOMS
// =====================================================

export const checkoutRooms = async (
  bookingId,
  checkoutData
) => {
  try {
    const response = await api.post(
      `/bookings/${bookingId}/checkout`,
      checkoutData
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
// 10. ADD FOOD SERVICE TO BOOKING ROOM
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
// 11. MARK FOOD SERVICES AS PAID
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
// 12. DELETE FOOD SERVICE
// =====================================================

export const deleteFoodService = async (
  bookingId,
  roomId,
  foodServiceId
) => {
  try {
    const response = await api.delete(
      `food-services/bookings/${bookingId}/rooms/${roomId}/food/${foodServiceId}`
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
// 13. UPDATE FOOD SERVICE
// =====================================================

export const updateFoodService = async (
  bookingId,
  roomId,
  foodServiceId,
  foodData
) => {
  try {
    const response = await api.put(
      `/bookings/${bookingId}/rooms/${roomId}/food/${foodServiceId}`,
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
// 14. ADD ROOM SERVICE
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
// 15. MARK ROOM SERVICES AS PAID
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
// 16. DELETE ROOM SERVICE
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
// 17. UPDATE ROOM SERVICE
// =====================================================

export const updateRoomService = async (
  bookingId,
  roomId,
  serviceId,
  serviceData
) => {
  try {
    const response = await api.put(
      `/bookings/${bookingId}/rooms/${roomId}/room-service/${serviceId}`,
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
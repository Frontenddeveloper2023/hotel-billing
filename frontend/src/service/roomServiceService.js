import api from "./api";

// =====================================================
// ADD ROOM SERVICE
// POST /api/room-services/bookings/:bookingId/rooms/:roomId
// =====================================================

const addRoomService = async (bookingId, roomId, data) => {
  try {
    const response = await api.post(
      `/room-services/bookings/${bookingId}/rooms/${roomId}`,
      data
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message || "Failed to add room service.",
      }
    );
  }
};


// =====================================================
// GET ALL ROOM SERVICES
// GET /api/room-services/
// =====================================================

const listRoomServices = async () => {
  try {
    const response = await api.get(
      "/room-services/"
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message || "Failed to load room services.",
      }
    );
  }
};


// =====================================================
// GET ROOM SERVICES BY BOOKING
// GET /api/room-services/booking/:bookingId
// =====================================================

const getRoomServicesByBooking = async (bookingId) => {
  try {
    const response = await api.get(
      `/room-services/booking/${bookingId}`
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message || "Failed to load booking room services.",
      }
    );
  }
};


// =====================================================
// UPDATE ROOM SERVICE
// PUT /api/room-services/bookings/:bookingId/rooms/:roomId/:serviceId
// =====================================================

const updateRoomService = async (
  bookingId,
  roomId,
  serviceId,
  data
) => {
  try {
    const response = await api.put(
      `/room-services/bookings/${bookingId}/rooms/${roomId}/${serviceId}`,
      data
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message || "Failed to update room service.",
      }
    );
  }
};


// =====================================================
// DELETE ROOM SERVICE
// DELETE /api/room-services/bookings/:bookingId/rooms/:roomId/:serviceId
// =====================================================

const deleteRoomService = async (
  bookingId,
  roomId,
  serviceId
) => {
  try {
    const response = await api.delete(
      `/room-services/bookings/${bookingId}/rooms/${roomId}/${serviceId}`
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message || "Failed to delete room service.",
      }
    );
  }
};


// =====================================================
// MARK ROOM SERVICES PAID
// PATCH /api/room-services/bookings/:bookingId/rooms/:roomId/paid
// =====================================================

const markRoomServicesPaid = async (
  bookingId,
  roomId
) => {
  try {
    const response = await api.patch(
      `/room-services/bookings/${bookingId}/rooms/${roomId}/paid`
    );

    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: error.message || "Failed to mark room services as paid.",
      }
    );
  }
};


// =====================================================
// EXPORT
// =====================================================

export {
  addRoomService,
  listRoomServices,
  getRoomServicesByBooking,
  updateRoomService,
  deleteRoomService,
  markRoomServicesPaid,
};
import api from "./api";


// ==========================================
// CREATE HOTEL
// ==========================================
export const createHotel = async (hotelData) => {
  try {
    const response = await api.post(
      "/hotels/add-hotel",
      hotelData
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
// GET ALL HOTELS
// ==========================================
export const getAllHotels = async () => {
  try {
    const response = await api.get(
      "/hotels/list-hotels"
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
// GET HOTEL BY ID
// ==========================================
export const getHotelById = async (id) => {
  try {
    const response = await api.get(
      `/hotels/${id}`
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
// UPDATE HOTEL
// ==========================================
export const updateHotel = async (id, hotelData) => {
  try {
    const response = await api.put(
      `/hotels/update-hotel/${id}`,
      hotelData
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
// DELETE HOTEL
// ==========================================
export const deleteHotel = async (id) => {
  try {
    const response = await api.delete(
      `/hotels/delete-hotel/${id}`
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
// GET PUBLIC HOTEL INFO
// ==========================================
export const getPublicHotelInfo = async (id) => {
  try {
    const response = await api.get(
      `/hotels/public/${id}`
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
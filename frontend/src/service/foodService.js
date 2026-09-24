import api from "./api";



export const createFood = async (foodFormData) => {
  try {
    const response = await api.post("/foods-management/food-img-upload", foodFormData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};


export const getAllFoods = async () => {
  try {
    const response = await api.get("/foods-management/get-foods");
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};


export const getFoodById = async (id) => {
  try {
    const response = await api.get(`/foods-management/get-food/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};


export const updateFood = async (id, foodFormData) => {
  try {
    const response = await api.put(`/foods-management/update-food/${id}`, foodFormData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};


export const deleteFood = async (id) => {
  try {
    const response = await api.delete(`/foods-management/delete-food/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};
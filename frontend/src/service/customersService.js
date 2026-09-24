import api from "./api";

export const createCustomer = async (customerData) => {
  try {
    const response = await api.post("customers/create-customer", customerData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const getAllCustomers = async () => {
  try {
    const response = await api.get("customers/get-customer");
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};



export const getCustomerById = async (id) => {
  try {
    // Fixed endpoint path to match backend router
    const response = await api.get(`customers/get-customer/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const updateCustomer = async (id, customerData) => {
  try {
    const response = await api.put(`customers/update-customer/${id}`, customerData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export const deleteCustomer = async (id) => {
  try {
    const response = await api.delete(`customers/delete-customer/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};
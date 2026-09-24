import api from "./api";

// 1. Create a new checkout bill
export const createCheckoutBill = async (billData) => {
  try {
    const response = await api.post("/checkout-bills/create", billData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// 2. Get all checkout bills
export const getAllCheckoutBills = async () => {
  try {
    const response = await api.get("/checkout-bills/all");
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// 3. Get a single checkout bill by its ID
export const getCheckoutBillById = async (id) => {
  try {
    const response = await api.get(`/checkout-bills/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// 4. Update an existing checkout bill
export const updateCheckoutBill = async (id, updateData) => {
  try {
    const response = await api.put(`/checkout-bills/update/${id}`, updateData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// 5. Delete a checkout bill
export const deleteCheckoutBill = async (id) => {
  try {
    const response = await api.delete(`/checkout-bills/delete/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};
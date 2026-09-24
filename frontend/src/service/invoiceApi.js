import api from "./api";

// 1. Create a new invoice
export const createInvoice = async (invoiceData) => {
  try {
    const response = await api.post("/invoice-management", invoiceData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// 2. Get all invoices
export const getAllInvoices = async () => {
  try {
    const response = await api.get("/invoice-management");
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// 3. Get a single invoice by its ID
export const getInvoiceById = async (id) => {
  try {
    const response = await api.get(`/invoice-management/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// 4. Delete an invoice
export const deleteInvoice = async (id) => {
  try {
    const response = await api.delete(`/invoice-management/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};
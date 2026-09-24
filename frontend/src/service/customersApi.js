import api from "./api";

export const getCustomerManagementData = async () => {
    try {
        const response = await api.get("/customers/management-data");
        return response.data;
    } catch (err) {
        throw err.response?.data || {
            success: false,
            message: err.message || "Failed to load customer data.",
        };
    }
};

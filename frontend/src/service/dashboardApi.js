import api from "./api";

export const getDashboardSummary = async () => {
    try {
        const response = await api.get("/dashboard/summary");
        return response.data;
    } catch (err) {
        throw err.response?.data || {
            success: false,
            message: err.message || "Failed to load dashboard summary.",
        };
    }
};

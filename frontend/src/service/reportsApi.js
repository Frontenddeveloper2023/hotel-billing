import api from "./api";

export const getReportsSummary = async () => {
    try {
        const response = await api.get("/reports/summary");
        return response.data;
    } catch (err) {
        throw err.response?.data || {
            success: false,
            message: err.message || "Failed to load reports summary.",
        };
    }
};

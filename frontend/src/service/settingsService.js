import api from "./api";

// =====================================================
// GET COMPANY SETTINGS
// =====================================================

export const getSettings = async () => {
    try {
        console.info(
            "[Settings Service] Fetching settings..."
        );

        const response = await api.get(
            "/settings/get-settings"
        );

        console.info(
            "[Settings Service] Settings fetched successfully."
        );

        return response.data;
    } catch (error) {
        console.error(
            "[Settings Service] Failed to fetch settings:",
            error
        );

        throw (
            error.response?.data || {
                success: false,
                message:
                    error.message ||
                    "Unable to load hotel settings. Please try again.",
            }
        );
    }
};

// =====================================================
// UPDATE COMPANY SETTINGS
// =====================================================

export const updateSettings = async (
    settingsData
) => {
    try {
        const isFormData =
            settingsData instanceof FormData;

        console.info(
            "[Settings Service] Updating settings..."
        );

        const response = await api.put(
            "/settings/update-settings",
            settingsData,
            isFormData
                ? {
                      // IMPORTANT:
                      // Do NOT manually set multipart
                      // Content-Type.
                      //
                      // Axios/browser automatically adds:
                      // multipart/form-data; boundary=...
                  }
                : undefined
        );

        console.info(
            "[Settings Service] Settings updated successfully."
        );

        return response.data;
    } catch (error) {
        console.error(
            "[Settings Service] Failed to update settings:",
            error
        );

        throw (
            error.response?.data || {
                success: false,
                message:
                    error.message ||
                    "Unable to update hotel settings. Please try again.",
            }
        );
    }
};
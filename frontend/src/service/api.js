import axios from "axios";

const baseURL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;

const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        "Accept": "application/json",
    },
});

api.interceptors.request.use((config) => {
    // Attach tab-isolated Bearer token if present in sessionStorage
    const token = sessionStorage.getItem("hotelToken");
    if (token && !config.headers["Authorization"]) {
        config.headers["Authorization"] = `Bearer ${token}`;
    }

    const cookieName = sessionStorage.getItem("hotelCookieName");
    if (cookieName && !config.headers["x-cookie-name"]) {
        config.headers["x-cookie-name"] = cookieName;
    }

    // Only set automatically if not explicitly provided by the service call
    if (!config.headers["x-portal"]) {
        const path = window.location.pathname;

        if (/\/saas-admin($|\/)/.test(path) || /\/login($|\/)/.test(path)) {
            config.headers["x-portal"] = "admin";
        } else {
            // Use sessionStorage to determine if this tab is owner or staff
            const hotelPortal = sessionStorage.getItem("hotelPortal");
            config.headers["x-portal"] = hotelPortal || "owner";
        }
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const data = error.response?.data;

        // If backend issues a LOGOUT action (due to hotel blocked or cancelled by admin)
        if (status === 403 && data?.action === "LOGOUT") {
            const logoutMsg = data?.message || "Your session was terminated.";
            sessionStorage.setItem("hotelLogoutToast", logoutMsg);

            // Clear session data
            sessionStorage.removeItem("hotelToken");
            sessionStorage.removeItem("hotelCookieName");
            sessionStorage.removeItem("hotelPortal");
            sessionStorage.removeItem("user");
            localStorage.removeItem("hotelUser");

            // Redirect immediately to hotel login
            const basename = import.meta.env.VITE_BASENAME || "";
            const loginPath = `${basename}/hotel-login`;
            if (window.location.pathname !== loginPath) {
                window.location.href = loginPath;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
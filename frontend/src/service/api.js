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

export default api;
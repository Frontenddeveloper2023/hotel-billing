import axios from "axios";

const baseURL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;

const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        "Accept": "application/json",
    },
});

export default api;
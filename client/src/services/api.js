import axios from "axios";

const backendUrl = import.meta.env.VITE_ENV === "production"
    ? import.meta.env.VITE_BACKEND_URL_PROD
    : import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const api = axios.create({
    baseURL: backendUrl,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json"
    }
});

export default api;

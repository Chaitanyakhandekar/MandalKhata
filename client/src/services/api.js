import axios from "axios";
import { userAuthStore } from "../store/userStore.js";

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

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const requestUrl = error.config?.url || "";

        const isAuthEndpoint =
            requestUrl.includes("/login") || requestUrl.includes("/register");

        if (status === 401 && !isAuthEndpoint && window.location.pathname !== "/login") {
            userAuthStore.getState().logout();
            window.location.href = "/login";
        }

        return Promise.reject(error);
    }
);

export default api;
import axios from "axios";


const baseURL = import.meta.env.VITE_ENV === "production"
    ? import.meta.env.VITE_BACKEND_URL_PROD
    : import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const userApi = {
    login: async (credentials) => {
        try {
            const response = await axios.post(`${baseURL}/api/users/login`, credentials, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Login failed"
            };
        }
    },

    register: async (userData) => {
        try {
            const response = await axios.post(`${baseURL}/api/users/register`, userData, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Registration failed"
            };
        }
    },

    logout: async () => {
        try {
            const response = await axios.get(`${baseURL}/api/users/logout`, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Logout failed"
            };
        }
    },

    authMe: async () => {
        try {
            const response = await axios.get(`${baseURL}/api/users/auth-me`, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Unauthorized"
            };
        }
    },

    updateProfile: async (profileData) => {
        try {
            const response = await axios.put(`${baseURL}/api/users/update-profile`, profileData, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to update profile"
            };
        }
    }
};

import api from "../services/api.js";

export const userApi = {
    login: async (credentials) => {
        try {
            const response = await api.post("/api/users/login", credentials);
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
            const response = await api.post("/api/users/register", userData);
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
            const response = await api.get("/api/users/logout");
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
            const response = await api.get("/api/users/auth-me");
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
            const response = await api.put("/api/users/update-profile", profileData);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to update profile"
            };
        }
    }
};

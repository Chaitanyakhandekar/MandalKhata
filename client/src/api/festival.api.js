import api from "../services/api.js";

export const festivalApi = {
    getYears: async () => {
        try {
            const response = await api.get("/api/festivals");
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch festival years"
            };
        }
    },

    createYear: async (yearData) => {
        try {
            const response = await api.post("/api/festivals", yearData);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to create festival year"
            };
        }
    },

    setActiveYear: async (id) => {
        try {
            const response = await api.patch(`/api/festivals/${id}/active`);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to set active festival year"
            };
        }
    },

    deleteYear: async (id) => {
        try {
            const response = await api.delete(`/api/festivals/${id}`);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to delete festival year"
            };
        }
    }
};
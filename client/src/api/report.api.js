import api from "../services/api.js";

export const reportApi = {
    getDashboardStats: async (params) => {
        try {
            const response = await api.get("/api/reports/dashboard", { params });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch dashboard stats"
            };
        }
    },

    getLedger: async (params) => {
        try {
            const response = await api.get("/api/reports/ledger", { params });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch ledger details"
            };
        }
    }
};
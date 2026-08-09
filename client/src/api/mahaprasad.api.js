import api from "../services/api.js";

export const mahaprasadApi = {
    getMahaprasad: async (params) => {
        try {
            const response = await api.get("/api/mahaprasad", { params });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch Mahaprasad planning"
            };
        }
    },

    updateMahaprasad: async (data) => {
        try {
            const response = await api.put("/api/mahaprasad", data);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to save Mahaprasad planning"
            };
        }
    }
};
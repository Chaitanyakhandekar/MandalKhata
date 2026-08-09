import api from "../services/api.js";

export const externalDonorApi = {
    getExternalDonors: async (params) => {
        try {
            const response = await api.get("/api/donors", { params });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch external donors"
            };
        }
    },

    getDonorDetails: async (id, params) => {
        try {
            const response = await api.get(`/api/donors/${id}/donations`, { params });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch donor details"
            };
        }
    },

    createExternalDonor: async (donorData) => {
        try {
            const response = await api.post("/api/donors", donorData);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to create external donor"
            };
        }
    },

    updateExternalDonor: async (id, donorData) => {
        try {
            const response = await api.put(`/api/donors/${id}`, donorData);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to update external donor"
            };
        }
    },

    toggleDonorActive: async (id, active) => {
        try {
            const response = await api.patch(`/api/donors/${id}/active`, { active });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to update donor status"
            };
        }
    },

    deleteExternalDonor: async (id) => {
        try {
            const response = await api.delete(`/api/donors/${id}`);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to delete external donor"
            };
        }
    }
};
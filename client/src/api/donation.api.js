import api from "../services/api.js";

export const donationApi = {
    getDonations: async (params) => {
        try {
            const response = await api.get("/api/donations", { params });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch donations"
            };
        }
    },

    createDonation: async (donationData) => {
        try {
            const response = await api.post("/api/donations", donationData);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to record donation",
                ...(error.response?.data || {})
            };
        }
    },

    updateDonation: async (id, donationData) => {
        try {
            const response = await api.put(`/api/donations/${id}`, donationData);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to update donation"
            };
        }
    },

    deleteDonation: async (id) => {
        try {
            const response = await api.delete(`/api/donations/${id}`);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to delete donation"
            };
        }
    }
};
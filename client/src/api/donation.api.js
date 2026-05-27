import api from "../services/api.js";
import axios from "axios";


const baseURL = import.meta.env.VITE_ENV === "production"
    ? import.meta.env.VITE_BACKEND_URL_PROD
    : import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";


export const donationApi = {
    getDonations: async (params) => {
        try {
            const response = await axios.get(`${baseURL}/api/donations`, { params, withCredentials: true });
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
            const response = await axios.post(`${baseURL}/api/donations`, donationData, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to record donation"
            };
        }
    },

    updateDonation: async (id, donationData) => {
        try {
            const response = await axios.put(`${baseURL}/api/donations/${id}`, donationData, {
                withCredentials: true
            });
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
            const response = await axios.delete(`${baseURL}/api/donations/${id}`, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to delete donation"
            };
        }
    }
};

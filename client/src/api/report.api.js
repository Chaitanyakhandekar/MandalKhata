import api from "../services/api.js";
import axios from "axios";


const baseURL = import.meta.env.VITE_ENV === "production"
    ? import.meta.env.VITE_BACKEND_URL_PROD
    : import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";


export const reportApi = {
    getDashboardStats: async (params) => {
        try {
            const response = await axios.get(`${baseURL}/api/reports/dashboard`, { params, withCredentials: true });
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
            const response = await axios.get(`${baseURL}/api/reports/ledger`, { params, withCredentials: true });
            return response.data;

        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch ledger details"
            };
        }
    }
};

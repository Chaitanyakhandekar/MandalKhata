import axios from "axios";
import api from "../services/api.js";

const baseURL = import.meta.env.VITE_ENV === "production"
    ? import.meta.env.VITE_BACKEND_URL_PROD
    : import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const festivalApi = {
    getYears: async () => {
        try {
            const response = await axios.get(`${baseURL}/api/festivals`, {
                withCredentials: true
            });
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
            const response = await axios.post(`${baseURL}/api/festivals`, yearData, {
                withCredentials: true,
                headers: {
                    "Content-Type": "application/json"
                }
            });
            console.log(response.data);
            return response.data;

        } catch (error) {
            console.log("Error: ", error);
            return {
                success: false,
                message: error.response?.data?.message || "Failed to create festival year"
            };
        }
    },

    setActiveYear: async (id) => {
        try {
            const response = await axios.patch(`${baseURL}/api/festivals/${id}/active`, {
                withCredentials: true
            });
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
            const response = await axios.delete(`${baseURL}/api/festivals/${id}`, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to delete festival year"
            };
        }
    }
};

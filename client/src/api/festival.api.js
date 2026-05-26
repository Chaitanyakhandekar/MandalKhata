import axios from "axios";
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
            const response = await axios.post("http://localhost:8000/api/festivals", yearData, {
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

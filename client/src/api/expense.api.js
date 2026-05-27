import api from "../services/api.js";
import axios from "axios";


const baseURL = import.meta.env.VITE_ENV === "production"
    ? import.meta.env.VITE_BACKEND_URL_PROD
    : import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";


export const expenseApi = {
    getExpenses: async (params) => {
        try {
            const response = await axios.get(`${baseURL}/api/expenses`, { params, withCredentials: true });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch expenses"
            };
        }
    },

    createExpense: async (formData) => {
        try {
            const response = await axios.post(`${baseURL}/api/expenses`, formData, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to record expense"
            };
        }
    },

    updateExpense: async (id, formData) => {
        try {
            const response = await axios.put(`${baseURL}/api/expenses/${id}`, formData, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to update expense"
            };
        }
    },

    deleteExpense: async (id) => {
        try {
            const response = await axios.delete(`${baseURL}/api/expenses/${id}`, {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to delete expense"
            };
        }
    }
};

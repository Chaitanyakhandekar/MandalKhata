import api from "../services/api.js";

export const expenseApi = {
    getExpenses: async (params) => {
        try {
            const response = await api.get("/api/expenses", { params });
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
            const response = await api.post("/api/expenses", formData);
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
            const response = await api.put(`/api/expenses/${id}`, formData);
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
            const response = await api.delete(`/api/expenses/${id}`);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to delete expense"
            };
        }
    },

    addPayment: async (id, paymentData) => {
        try {
            const response = await api.post(`/api/expenses/${id}/payments`, paymentData);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to record payment"
            };
        }
    }
};
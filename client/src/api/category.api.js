import api from "../services/api.js";

export const categoryApi = {
    getCategories: async () => {
        try {
            const response = await api.get("/api/categories");
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch categories"
            };
        }
    },

    createCategory: async (data) => {
        try {
            const response = await api.post("/api/categories", data);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to create category"
            };
        }
    },

    updateCategory: async (id, data) => {
        try {
            const response = await api.put(`/api/categories/${id}`, data);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to update category"
            };
        }
    },

    deleteCategory: async (id) => {
        try {
            const response = await api.delete(`/api/categories/${id}`);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to delete category",
                data: error.response?.data?.data
            };
        }
    }
};

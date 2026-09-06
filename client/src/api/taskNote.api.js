import api from "../services/api.js";

export const taskNoteApi = {
    // Summary
    getSummary: async (params) => {
        try {
            const response = await api.get("/api/tasks-notes/summary", { params });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch summary",
            };
        }
    },

    // Tasks
    getTasks: async (params) => {
        try {
            const response = await api.get("/api/tasks-notes/tasks", { params });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch tasks",
            };
        }
    },

    createTask: async (data) => {
        try {
            const response = await api.post("/api/tasks-notes/tasks", data);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to create task",
            };
        }
    },

    updateTask: async (id, data) => {
        try {
            const response = await api.put(`/api/tasks-notes/tasks/${id}`, data);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to update task",
            };
        }
    },

    toggleTaskComplete: async (id) => {
        try {
            const response = await api.patch(`/api/tasks-notes/tasks/${id}/toggle`);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to toggle task",
            };
        }
    },

    deleteTask: async (id) => {
        try {
            const response = await api.delete(`/api/tasks-notes/tasks/${id}`);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to delete task",
            };
        }
    },

    // Shopping Items
    getShoppingItems: async (params) => {
        try {
            const response = await api.get("/api/tasks-notes/shopping", { params });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch shopping items",
            };
        }
    },

    createShoppingItem: async (data) => {
        try {
            const response = await api.post("/api/tasks-notes/shopping", data);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to create shopping item",
            };
        }
    },

    updateShoppingItem: async (id, data) => {
        try {
            const response = await api.put(`/api/tasks-notes/shopping/${id}`, data);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to update shopping item",
            };
        }
    },

    toggleShoppingItemPurchased: async (id) => {
        try {
            const response = await api.patch(`/api/tasks-notes/shopping/${id}/toggle`);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to toggle shopping item",
            };
        }
    },

    deleteShoppingItem: async (id) => {
        try {
            const response = await api.delete(`/api/tasks-notes/shopping/${id}`);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to delete shopping item",
            };
        }
    },

    // Notes
    getNotes: async (params) => {
        try {
            const response = await api.get("/api/tasks-notes/notes", { params });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch notes",
            };
        }
    },

    createNote: async (data) => {
        try {
            const response = await api.post("/api/tasks-notes/notes", data);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to create note",
            };
        }
    },

    updateNote: async (id, data) => {
        try {
            const response = await api.put(`/api/tasks-notes/notes/${id}`, data);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to update note",
            };
        }
    },

    deleteNote: async (id) => {
        try {
            const response = await api.delete(`/api/tasks-notes/notes/${id}`);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to delete note",
            };
        }
    },
};

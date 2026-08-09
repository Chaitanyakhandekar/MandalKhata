import api from "../services/api.js";

export const householdApi = {
    getHouseholds: async (params) => {
        try {
            const response = await api.get("/api/households", { params });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch households"
            };
        }
    },

    getHouseholdOverview: async () => {
        try {
            const response = await api.get("/api/households/overview");
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch household statistics"
            };
        }
    },

    createHousehold: async (householdData) => {
        try {
            const response = await api.post("/api/households", householdData);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to register household"
            };
        }
    },

    updateHousehold: async (id, householdData) => {
        try {
            const response = await api.put(`/api/households/${id}`, householdData);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to update household"
            };
        }
    },

    toggleHouseholdActive: async (id, active) => {
        try {
            const response = await api.patch(`/api/households/${id}/active`, { active });
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to update household status"
            };
        }
    },

    deleteHousehold: async (id) => {
        try {
            const response = await api.delete(`/api/households/${id}`);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to delete household"
            };
        }
    }
};
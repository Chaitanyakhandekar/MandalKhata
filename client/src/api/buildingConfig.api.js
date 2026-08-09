import api from "../services/api.js";

export const buildingConfigApi = {
    getBuildingConfigs: async () => {
        try {
            const response = await api.get("/api/building-configs");
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to fetch building configurations"
            };
        }
    },

    createBuildingConfig: async (configData) => {
        try {
            const response = await api.post("/api/building-configs", configData);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to create building configuration"
            };
        }
    },

    updateBuildingConfig: async (id, configData) => {
        try {
            const response = await api.put(`/api/building-configs/${id}`, configData);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to update building configuration"
            };
        }
    },

    deleteBuildingConfig: async (id) => {
        try {
            const response = await api.delete(`/api/building-configs/${id}`);
            return response.data;
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Failed to delete building configuration"
            };
        }
    }
};
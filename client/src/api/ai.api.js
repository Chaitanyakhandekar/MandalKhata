import api from "../services/api.js";

class AIApi {
    constructor() {
        this.baseUrl = `/api/ai`;
    }

    chat = async (message) => {
        try {
            const response = await api.post(`${this.baseUrl}/chat`, { message });
            console.log("RESPONSE ::::::::::::: ", response.data)
            return { success: true, message: response.data.data, data: response.data.data };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message, error };
        }
    };
}

export const aiApi = new AIApi();
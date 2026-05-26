import axios from "axios";

class AIApi {
    constructor() {
        this.baseUrl = `${import.meta.env.VITE_ENV === "production" ? import.meta.env.VITE_BACKEND_URL_PROD : import.meta.env.VITE_BACKEND_URL}/api/ai`;
    }

    chat = async (message) => {
        try {
            const response = await axios.post(`${this.baseUrl}/chat`, { message }, { withCredentials: true });
            console.log("RESPONSE ::::::::::::: ", response.data)
            return { success: true, message: response.data.data, data: response.data.data };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || error.message, error };
        }
    };
}

export const aiApi = new AIApi();
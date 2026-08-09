import api from "../services/api.js";

const triggerBlobDownload = (blob, fallbackName) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fallbackName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

export const downloadBulkTemplate = async (type, format) => {
    const response = await api.get(`/api/bulk-import/templates/${type}`, {
        params: { format },
        responseType: "blob"
    });
    const contentDisposition = response.headers["content-disposition"] || "";
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `template-${type}.${format}`;
    triggerBlobDownload(response.data, filename);
};

export const uploadBulkPreview = async (type, file) => {
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);
    const response = await api.post("/api/bulk-import/upload", formData);
    return response.data;
};

export const confirmBulkImport = async (type, rows) => {
    const response = await api.post("/api/bulk-import/confirm", { type, rows });
    return response.data;
};

export const downloadBulkErrorReport = async ({ type, fileName, statuses }) => {
    const response = await api.post(
        "/api/bulk-import/error-report",
        { type, fileName, statuses },
        { responseType: "blob" }
    );
    triggerBlobDownload(response.data, `${type}-import-errors.csv`);
};
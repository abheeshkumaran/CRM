import { api } from './api';

const API_URL = '/trash';

export const getTrashItems = async () => {
    const response = await api.get(API_URL);
    return response.data.data;
};

export const restoreItem = async (type: string, id: string) => {
    const response = await api.post(`${API_URL}/restore`, { type, id });
    return response.data;
};

export const permanentDelete = async (type: string, id: string) => {
    const response = await api.delete(`${API_URL}/permanent`, { data: { type, id } });
    return response.data;
};

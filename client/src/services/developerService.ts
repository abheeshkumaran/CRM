import { api } from './api';

// --- API Keys ---

export const getApiKeys = async () => {
    const response = await api.get('/api-keys');
    return response.data;
};

export const createApiKey = async (data: { name: string, scopes?: string[] }) => {
    const response = await api.post('/api-keys', data);
    return response.data;
};

export const revokeApiKey = async (id: string) => {
    const response = await api.post(`/api-keys/${id}/revoke`);
    return response.data;
};

export const deleteApiKey = async (id: string) => {
    const response = await api.delete(`/api-keys/${id}`);
    return response.data;
};

// --- Webhooks ---

export const getWebhooks = async () => {
    const response = await api.get('/webhooks');
    return response.data;
};

export const createWebhook = async (data: { url: string, events: string[], isActive?: boolean }) => {
    const response = await api.post('/webhooks', data);
    return response.data;
};

export const updateWebhook = async (id: string, data: Partial<{ url: string, events: string[], isActive: boolean }>) => {
    const response = await api.put(`/webhooks/${id}`, data);
    return response.data;
};

export const deleteWebhook = async (id: string) => {
    const response = await api.delete(`/webhooks/${id}`);
    return response.data;
};

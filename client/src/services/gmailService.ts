import { api } from './api';

export const getGmailAuthUrl = async (): Promise<{ authUrl: string }> => {
    const response = await api.get('/gmail/auth-url');
    return response.data;
};

export const connectGmail = async (code: string) => {
    const response = await api.post('/gmail/callback', { code });
    return response.data;
};

export const getGmailStatus = async (): Promise<{ connected: boolean; email?: string }> => {
    const response = await api.get('/gmail/status');
    return response.data;
};

export const sendGmailEmail = async (data: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    leadId?: string;
    contactId?: string;
}) => {
    const response = await api.post('/gmail/send', data);
    return response.data;
};

export const disconnectGmail = async () => {
    const response = await api.post('/gmail/disconnect');
    return response.data;
};

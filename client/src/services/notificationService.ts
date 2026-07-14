import { api } from './api';

export interface CRMNotification {
    id: string;
    recipient: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    relatedResource?: string;
    relatedId?: string;
    isRead: boolean;
    createdAt: string;
}

export const getNotifications = async (page = 1, type?: string, isRead?: boolean) => {
    const params = new URLSearchParams({ page: page.toString() });

    if (type && type !== 'all') params.append('type', type);
    if (isRead !== undefined) params.append('isRead', isRead.toString());

    const response = await api.get(`/notifications?${params.toString()}`);
    return response.data;
};

export const markAsRead = async (id: string) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
};

export const markAllAsRead = async () => {
    const response = await api.put(`/notifications/read-all`);
    return response.data;
};

export const broadcastNotification = async (title: string, message: string) => {
    const response = await api.post('/notifications/broadcast', { title, message });
    return response.data;
};

export const broadcastToOrgAdmins = async (title: string, message: string) => {
    const response = await api.post('/super-admin/broadcast-notification', { title, message });
    return response.data;
};

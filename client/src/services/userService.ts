import { api } from './api';

export interface UserStats {
    totalLeads: number;
    convertedLeads: number;
    lostLeads: number;
    conversionRate: number;
    totalSalesValue: number;
}

export const getUserStats = async (userId: string) => {
    const response = await api.get(`/users/${userId}/stats`);
    return response.data;
};

export const getUserById = async (userId: string) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
};

export const getUsers = async (params?: { organisationId?: string }) => {
    const response = await api.get('/users', { params });
    return response.data;
};

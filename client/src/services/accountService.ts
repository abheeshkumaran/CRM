import { api } from './api';

export interface Account {
    id: string;
    name: string;
    industry?: string;
    website?: string;
    size?: string;
    annualRevenue?: number;
    phone?: string;
    type: 'prospect' | 'customer' | 'partner' | 'vendor';
    owner?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        zip?: string;
    };
    createdAt: string;
}

export interface AccountQueryParams {
    type?: 'prospect' | 'customer' | 'partner' | 'vendor';
    industry?: string;
    owner?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface CreateAccountData {
    name: string;
    industry?: string;
    website?: string;
    size?: string;
    annualRevenue?: number;
    phone?: string;
    type: 'prospect' | 'customer' | 'partner' | 'vendor';
    owner?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        zip?: string;
    };
}

export type UpdateAccountData = Partial<CreateAccountData>;

export const getAccounts = async (params?: AccountQueryParams) => {
    const response = await api.get('/accounts', { params });
    return response.data;
};

export const getAccountById = async (id: string) => {
    const response = await api.get(`/accounts/${id}`);
    return response.data;
};

export const createAccount = async (data: CreateAccountData) => {
    const response = await api.post('/accounts', data);
    return response.data;
};

export const updateAccount = async (id: string, data: UpdateAccountData) => {
    const response = await api.put(`/accounts/${id}`, data);
    return response.data;
};

export const deleteAccount = async (id: string) => {
    const response = await api.delete(`/accounts/${id}`);
    return response.data;
};

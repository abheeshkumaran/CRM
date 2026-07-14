import { api } from './api';

export interface Contact {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phones?: {
        type: string;
        number: string;
    }[];
    jobTitle?: string;
    department?: string;
    account?: {
        id: string;
        name: string;
    };
    owner?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    createdAt: string;
}

export interface ContactQueryParams {
    account?: string;
    owner?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface CreateContactData {
    firstName: string;
    lastName: string;
    email?: string;
    phones?: {
        type: string;
        number: string;
    }[];
    jobTitle?: string;
    department?: string;
    account?: string;
    owner?: string;
}

export type UpdateContactData = Partial<CreateContactData>;

export const getContacts = async (params?: ContactQueryParams) => {
    const response = await api.get('/contacts', { params });
    return response.data;
};

export const getContactById = async (id: string) => {
    const response = await api.get(`/contacts/${id}`);
    return response.data;
};

export const createContact = async (data: CreateContactData) => {
    try {
        const response = await api.post('/contacts', data);
        return response.data;
    } catch (error: unknown) {
        const err = error as { response?: { data?: unknown } };
        throw err.response?.data || error;
    }
};

export const updateContact = async (id: string, data: UpdateContactData) => {
    const response = await api.put(`/contacts/${id}`, data);
    return response.data;
};

export const deleteContact = async (id: string) => {
    const response = await api.delete(`/contacts/${id}`);
    return response.data;
};

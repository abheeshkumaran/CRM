import { api } from './api';

export interface Commission {
    id: string;
    userId: string;
    amount: number;
    currency: string;
    status: 'pending' | 'approved' | 'paid' | 'rejected';
    type: string;
    description?: string;
    dealId?: string;
    date: string;
    createdAt: string;
}

export interface CreateCommissionData {
    userId: string;
    amount: number;
    type: string;
    description?: string;
    dealId?: string;
    date?: string;
    status?: string;
}

export const getCommissions = async () => {
    const response = await api.get<Commission[]>('/commissions');
    return response.data;
};

export const createCommission = async (data: CreateCommissionData) => {
    const response = await api.post<Commission>('/commissions', data);
    return response.data;
};

export const updateCommission = async (id: string, data: Partial<CreateCommissionData>) => {
    const response = await api.put<Commission>(`/commissions/${id}`, data);
    return response.data;
};

export const deleteCommission = async (id: string) => {
    await api.delete(`/commissions/${id}`);
};

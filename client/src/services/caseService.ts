import { api } from './api';

export interface Case {
    id: string;
    caseNumber: string;
    subject: string;
    description?: string;
    status: 'new' | 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    type: 'question' | 'problem' | 'feature_request' | 'other';
    contact?: { id: string; firstName: string; lastName: string };
    account?: { id: string; name: string };
    assignedTo?: { id: string; firstName: string; lastName: string };
    createdAt: string;
}

export interface CaseSearchParams {
    search?: string;
    status?: string;
    priority?: string;
}

export type CaseInput = Omit<Case, 'id' | 'caseNumber' | 'createdAt'>;

export const getCases = async (params?: CaseSearchParams) => {
    const response = await api.get('/cases', { params });
    return response.data;
};

export const createCase = async (data: CaseInput) => {
    const response = await api.post('/cases', data);
    return response.data;
};

export const updateCase = async (id: string, data: Partial<CaseInput>) => {
    const response = await api.put(`/cases/${id}`, data);
    return response.data;
};

export const deleteCase = async (id: string) => {
    const response = await api.delete(`/cases/${id}`);
    return response.data;
};

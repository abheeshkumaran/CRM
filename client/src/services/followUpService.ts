import { api } from './api';

export interface FollowUpTask {
    id: string;
    subject: string;
    description?: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'deferred';
    priority: 'high' | 'medium' | 'low';
    dueDate: string;
    assignedTo?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    createdBy?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    relatedTo?: any;
    leadId?: string;
    onModel?: 'Lead' | 'Contact' | 'Account' | 'Opportunity';
    branch?: {
        id: string;
        name: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface FollowUpSearchParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    branchId?: string;
    userId?: string;
}

export const getFollowUps = async (params?: FollowUpSearchParams) => {
    const response = await api.get('/follow-ups', { params });
    return response.data;
};

export const createFollowUp = async (data: Partial<FollowUpTask>) => {
    const response = await api.post('/follow-ups', data);
    return response.data;
};

export const updateFollowUp = async (id: string, data: Partial<FollowUpTask>) => {
    const response = await api.put(`/follow-ups/${id}`, data);
    return response.data;
};

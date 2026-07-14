import { api } from './api';

export interface Interaction {
    id: string;
    type: 'call' | 'email' | 'meeting' | 'sms' | 'whatsapp' | 'note' | 'other';
    direction: 'inbound' | 'outbound';
    status: 'planned' | 'completed' | 'missed' | 'cancelled';
    subject: string;
    description?: string;
    date: string;
    duration?: number;
    relatedTo?: {
        id: string;
        firstName?: string;
        lastName?: string;
        name?: string;
        email?: string;
    };
    onModel: 'Lead' | 'Contact' | 'Account' | 'Opportunity';
    createdBy: {
        id: string;
        firstName: string;
        lastName: string;
    };
    createdAt: string;
}

export interface InteractionQueryParams {
    type?: 'call' | 'email' | 'meeting' | 'sms' | 'whatsapp' | 'note' | 'other';
    status?: 'planned' | 'completed' | 'missed' | 'cancelled';
    relatedTo?: string;
    onModel?: 'Lead' | 'Contact' | 'Account' | 'Opportunity';
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export interface CreateInteractionData {
    type: 'call' | 'email' | 'meeting' | 'sms' | 'whatsapp' | 'note' | 'other';
    direction: 'inbound' | 'outbound';
    status: 'planned' | 'completed' | 'missed' | 'cancelled';
    subject: string;
    description?: string;
    date: string;
    duration?: number;
    relatedTo: string; // ID
    onModel: 'Lead' | 'Contact' | 'Account' | 'Opportunity';
}

export const getInteractions = async (params?: InteractionQueryParams) => {
    const response = await api.get('/interactions', { params });
    return response.data;
};

export const createInteraction = async (data: CreateInteractionData) => {
    const response = await api.post('/interactions', data);
    return response.data;
};

export const deleteInteraction = async (id: string) => {
    const response = await api.delete(`/interactions/${id}`);
    return response.data;
};

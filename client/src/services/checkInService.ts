import { api } from './api';

export interface CheckIn {
    id: string;
    type: 'CHECK_IN' | 'CHECK_OUT' | 'VISIT' | 'MEETING';
    latitude?: number;
    longitude?: number;
    address?: string;
    notes?: string;
    photoUrl?: string;
    userId: string;
    organisationId: string;
    leadId?: string;
    contactId?: string;
    accountId?: string;
    createdAt: string;
    user?: {
        firstName: string;
        lastName: string;
    };
    lead?: {
        firstName: string;
        lastName: string;
        company: string;
    };
    contact?: {
        firstName: string;
        lastName: string;
    };
    account?: {
        name: string;
    };
}

export const getCheckIns = async (params?: { date?: string; userId?: string; branchId?: string; limit?: number; offset?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }) => {
    const response = await api.get('/checkins', { params });
    return response.data;
};

export const createCheckIn = async (data: Partial<CheckIn>) => {
    const response = await api.post('/checkins', data);
    return response.data;
};

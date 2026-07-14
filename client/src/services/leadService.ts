import { api } from './api';

export interface Lead {
    id: string;
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string;
    secondaryPhone?: string;
    company?: string;
    enquiryAbout?: string;
    jobTitle?: string;
    leadScore: number;
    status: string;
    source: string;
    assignedTo?: {
        id: string;
        firstName: string;
        lastName: string;
    };
    address?: {
        street: string;
        city: string;
        state: string;
        country: string;
        zip: string;
    };
    activities?: {
        type: string;
        description: string;
        createdAt: string;
        createdBy: string;
    }[];
    convertedOpportunities?: {
        id: string;
        stage: string;
    }[];
    // Re-enquiry fields
    isReEnquiry?: boolean;
    reEnquiryCount?: number;
    lastEnquiryDate?: string;
    country?: string;
    countryCode?: string;
    phoneCountryCode?: string;
    sourceDetails?: {
        message?: string;
        originalSource?: string;
        campaignName?: string;
        metaCampaignName?: string;
        metaCreatedTime?: string;
        rawPayload?: any;
    };
    branchId?: string;
    branch?: {
        name: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface LeadQueryParams {
    status?: string;
    source?: string;
    assignedTo?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    branchId?: string;
    startDate?: string;
    endDate?: string;
}

export interface CreateLeadData {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    secondaryPhone?: string;
    company?: string;
    jobTitle?: string;
    leadScore?: number;
    status?: string;
    source: string;
    assignedTo?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        zip?: string;
    };
    phoneCountryCode?: string;
    country?: string;
    countryCode?: string;
    branchId?: string;
    enquiryAbout?: string;
}

export type UpdateLeadData = Partial<CreateLeadData>;

export const getLeads = async (params?: LeadQueryParams) => {
    const response = await api.get('/leads', { params });
    return response.data;
};

export const getLeadById = async (id: string) => {
    const response = await api.get(`/leads/${id}`);
    return response.data;
};

export const createLead = async (data: CreateLeadData) => {
    try {
        const response = await api.post('/leads', data);
        return response.data;
    } catch (error: unknown) {
        const err = error as { response?: { data?: unknown } };
        throw err.response?.data || error;
    }
};

export const updateLead = async (id: string, data: UpdateLeadData) => {
    const response = await api.put(`/leads/${id}`, data);
    return response.data;
};

export const deleteLead = async (id: string) => {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
};

export const importLeads = async (leads: CreateLeadData[], options?: { assignmentRuleId?: string, applyAssignmentRules?: boolean, splitUserIds?: string[], flagAsReEnquiry?: boolean }) => {
    const payload = options ? { leads, ...options } : leads;
    const response = await api.post('/leads/bulk', payload);
    return response.data;
};

export const bulkAssignLeads = async (leadIds: string[], assignedTo: string) => {
    const response = await api.post('/leads/bulk-assign', { leadIds, assignedTo });
    return response.data;
};

export const bulkLeadAction = async (action: string, leadIds: string[], data?: any) => {
    const response = await api.post('/bulk/leads', { action, leadIds, data });
    return response.data;
};

export const getLeadHistory = async (id: string) => {
    const response = await api.get(`/leads/${id}/history`);
    return response.data;
};

export const getReEnquiryLeads = async () => {
    const response = await api.get('/leads/re-enquiries');
    return response.data;
};

export const getDuplicateLeads = async () => {
    const response = await api.get('/leads/duplicates');
    return response.data;
};

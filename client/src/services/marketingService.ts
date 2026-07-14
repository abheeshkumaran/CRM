import { api } from './api';

export interface EmailList {
    id: string;
    name: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    contacts?: Record<string, unknown>[];
}

export interface Campaign {
    id: string;
    name: string;
    subject?: string;
    status: string;
    stats?: {
        sent: number;
        opened: number;
        clicked: number;
    };
    sentAt?: string;
    createdAt?: string;
    objective?: string; // Added for AdsManager
}

export const getAdAccounts = async () => {
    const response = await api.get('/marketing/ad-accounts');
    return response.data;
};

export const getMetaCampaigns = async (adAccountId: string) => {
    if (!adAccountId) return { data: [] }; // Safety check
    const response = await api.get(`/marketing/${adAccountId}/campaigns`);
    return response.data;
};

export const getEmailCampaigns = async () => {
    const response = await api.get('/campaigns');
    return response.data.campaigns;
};

export const createMetaCampaign = async (adAccountId: string, data: Partial<Campaign> & Record<string, unknown>) => {
    const response = await api.post(`/marketing/${adAccountId}/campaigns`, data);
    return response.data;
};

export const createEmailCampaign = async (data: Partial<Campaign> & Record<string, unknown>) => {
    const response = await api.post('/campaigns', data);
    return response.data;
};

export const getEmailLists = async () => {
    const response = await api.get('/marketing/lists');
    return response.data;
};

export const createEmailList = async (data: Partial<EmailList>) => {
    const response = await api.post('/marketing/lists', data);
    return response.data;
};

export const getEmailListById = async (id: string) => {
    const response = await api.get(`/marketing/lists/${id}`);
    return response.data;
};

export const deleteEmailList = async (id: string) => {
    const response = await api.delete(`/marketing/lists/${id}`);
    return response.data;
};

// --- Ads Analytics ---
export interface AdInsight {
    impressions: string;
    clicks: string;
    spend: string;
    cpc: string;
    cpm: string;
    cpp: string;
    ctr: string;
    unique_clicks: string;
    reach: string;
    actions?: { action_type: string; value: string }[];
    date_start?: string;
    date_stop?: string;
    campaign_name?: string;
    campaign_id?: string;
}

export const getAccountInsights = async () => {
    const response = await api.get('/ads/meta/account/insights');
    return response.data;
};

export const getCampaignInsights = async () => {
    const response = await api.get('/ads/meta/insights', { params: { level: 'campaign' } });
    return response.data;
};

import { api } from './api';

export interface SMSCampaign {
    id: string;
    name: string;
    message: string;
    status: 'draft' | 'scheduled' | 'sent' | 'failed';
    scheduledAt?: string;
    sentAt?: string;
    recipientCount: number;
    stats?: Record<string, number>;
    createdAt: string;
}

export interface CreateSMSCampaignData {
    name: string;
    message: string;
    recipientCount?: number;
    scheduledAt?: string;
}

export const getSMSCampaigns = async () => {
    const response = await api.get<SMSCampaign[]>('/sms-campaigns');
    return response.data;
};

export const createSMSCampaign = async (data: CreateSMSCampaignData) => {
    const response = await api.post<SMSCampaign>('/sms-campaigns', data);
    return response.data;
};

export const updateSMSCampaign = async (id: string, data: Partial<CreateSMSCampaignData>) => {
    const response = await api.put<SMSCampaign>(`/sms-campaigns/${id}`, data);
    return response.data;
};

export const deleteSMSCampaign = async (id: string) => {
    await api.delete(`/sms-campaigns/${id}`);
};

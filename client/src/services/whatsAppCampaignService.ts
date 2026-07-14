import { api } from './api';

export interface WhatsAppCampaign {
    id: string;
    name: string;
    message: string;
    templateId?: string;
    status: 'draft' | 'scheduled' | 'sent' | 'failed';
    scheduledAt?: string;
    sentAt?: string;
    recipients?: string[] | { leadIds?: string[]; segmentId?: string[] };
    testNumber?: string;
    stats?: Record<string, number>;
    createdAt: string;
}

export interface CreateWhatsAppCampaignData {
    name: string;
    message: string;
    templateId?: string;
    scheduledAt?: string;
    testNumber?: string;
}

export const getWhatsAppCampaigns = async () => {
    const response = await api.get<WhatsAppCampaign[]>('/whatsapp-campaigns');
    return response.data;
};

export const createWhatsAppCampaign = async (data: CreateWhatsAppCampaignData) => {
    const response = await api.post<WhatsAppCampaign>('/whatsapp-campaigns', data);
    return response.data;
};

export const updateWhatsAppCampaign = async (id: string, data: Partial<CreateWhatsAppCampaignData>) => {
    const response = await api.put<WhatsAppCampaign>(`/whatsapp-campaigns/${id}`, data);
    return response.data;
};

export const deleteWhatsAppCampaign = async (id: string) => {
    await api.delete(`/whatsapp-campaigns/${id}`);
};

import { api } from './api';

export interface WhatsAppMessage {
    id: string;
    conversationId: string;
    phoneNumber: string;
    direction: 'incoming' | 'outgoing';
    messageType: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'template' | 'interactive';
    content: {
        text?: string;
        mediaUrl?: string;
        mediaType?: string;
        fileName?: string;
        caption?: string;
        latitude?: number;
        longitude?: number;
        templateName?: string;
        templateParams?: string[];
    };
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
    waMessageId?: string;
    errorCode?: string;
    errorMessage?: string;
    sentAt?: string;
    deliveredAt?: string;
    readAt?: string;
    createdAt: string;
    updatedAt: string;
    agent?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    lead?: {
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
    };
    contact?: {
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
        phones?: string[];
    };
}

export interface WhatsAppTemplate {
    id: string;
    name: string;
    status: string;
    category: string;
    language: string;
    components: Array<Record<string, unknown>>;
}

export interface SendMessageRequest {
    to: string;
    message?: string;
    type?: 'text' | 'template';
    templateName?: string;
    languageCode?: string;
    components?: Array<Record<string, unknown>>;
}

export const sendWhatsAppMessage = async (data: SendMessageRequest) => {
    const response = await api.post('/whatsapp/send', data);
    return response.data;
};

export const getWhatsAppMessages = async (phoneNumber?: string, limit = 50, offset = 0) => {
    const response = await api.get('/whatsapp/messages', {
        params: { phoneNumber, limit, offset }
    });
    return response.data;
};

export const getWhatsAppTemplates = async () => {
    const response = await api.get('/whatsapp/templates');
    return response.data;
};

export const testWhatsAppConnection = async () => {
    const response = await api.post('/whatsapp/test');
    return response.data;
};

export const getWhatsAppCampaigns = async () => {
    const response = await api.get('/whatsapp-campaigns');
    return response.data;
};

export const getWhatsAppStatistics = async () => {
    const response = await api.get('/whatsapp/messages/statistics');
    return response.data;
};
import { api } from './api';

export interface CallSettings {
    id: string;
    autoRecordOutbound: boolean;
    autoRecordInbound: boolean;
    recordingQuality: 'low' | 'medium' | 'high';
    storageType: 'local' | 'cloud';
    retentionDays: number;
    autoDeleteEnabled: boolean;
    popupOnIncoming: boolean;
    autoFollowupReminder: boolean;
    followupDelayMinutes: number;
    syncNonCrmContacts: boolean;
    organisationId: string;
    createdAt: string;
    updatedAt: string;
}

export const getCallSettings = async (): Promise<CallSettings> => {
    const response = await api.get('/call-settings');
    return response.data;
};

export const updateCallSettings = async (data: Partial<CallSettings>): Promise<CallSettings> => {
    const response = await api.put('/call-settings', data);
    return response.data;
};

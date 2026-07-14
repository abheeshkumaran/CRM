import { api } from './api';

export interface CallUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

export interface CallLead {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    company?: string;
}

export interface CallContact {
    id: string;
    firstName: string;
    lastName: string;
}

export interface Call {
    id: string;
    type: 'call';
    direction: 'inbound' | 'outbound';
    subject: string;
    description?: string;
    date: string;
    duration?: number;
    recordingUrl?: string;
    recordingDuration?: number;
    callStatus?: string;
    phoneNumber?: string;
    callerId?: string;
    createdBy?: CallUser;
    lead?: CallLead;
    contact?: CallContact;
    createdAt: string;
    updatedAt: string;
}

export interface CallsResponse {
    calls: Call[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface CallStats {
    totalCalls: number;
    outboundCalls: number;
    inboundCalls: number;
    missedCalls: number;
    completedCalls: number;
    avgDuration: number;
    callsWithRecording: number;
    period: string;
}

export interface CallFilters {
    page?: number;
    limit?: number;
    direction?: 'inbound' | 'outbound' | 'all';
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    hasRecording?: boolean | string;
    branchId?: string;
}

export const getCalls = async (filters: CallFilters = {}): Promise<CallsResponse> => {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.direction) params.append('direction', filters.direction);
    if (filters.status) params.append('status', filters.status);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.search) params.append('search', filters.search);
    if (filters.hasRecording) params.append('hasRecording', filters.hasRecording.toString());
    if (filters.branchId) params.append('branchId', filters.branchId);

    const response = await api.get(`/calls?${params.toString()}`);
    return response.data;
};

export const getCallStats = async (period: 'today' | 'week' | 'month' = 'week', userId?: string): Promise<CallStats> => {
    let url = `/calls/stats?period=${period}`;
    if (userId && userId !== 'all') {
        url += `&userId=${userId}`;
    }
    const response = await api.get(url);
    return response.data;
};

export const deleteCallRecording = async (callId: string): Promise<void> => {
    await api.delete(`/calls/${callId}/recording`);
};

export const downloadRecording = async (filename: string): Promise<Blob> => {
    const response = await api.get(`/calls/recording/${filename}`, {
        responseType: 'blob'
    });
    return response.data;
};

export interface UserCallAnalyticsResponse {
    reportData: {
        userId: string;
        agentName: string;
        branch: string;
        totalCalls: number;
        connectedCalls: number;
        totalDurationSeconds: number;
    }[];
    period: string;
    direction: string;
}

export const getUserCallAnalytics = async (period: string = 'today', direction: string = 'all', branchId?: string): Promise<UserCallAnalyticsResponse> => {
    let url = `/calls/reports/user-analytics?period=${period}&direction=${direction}`;
    if (branchId) url += `&branchId=${branchId}`;
    const response = await api.get(url);
    return response.data;
};

import { api } from './api';

export interface CalendarEvent {
    id: string;
    title: string;
    type: 'meeting' | 'call' | 'demo' | 'follow_up' | 'task' | 'reminder';
    startTime: string;
    endTime: string;
    location?: string;
    description?: string;

    // Relations (simplified for frontend)
    lead?: { id: string; firstName: string; lastName: string };
    contact?: { id: string; firstName: string; lastName: string };

    virtualMeeting?: {
        provider: 'zoom' | 'google_meet' | 'teams';
        url: string;
    };

    status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
    createdAt: string;
}

export interface CreateEventData {
    title: string;
    type: string;
    startTime: string; // ISO
    endTime: string;   // ISO
    location?: string;
    description?: string;
    lead?: string;
    contact?: string;
    status?: string;
}

export const getEvents = async (start: string, end: string) => {
    const response = await api.get(`/calendar?start=${start}&end=${end}`);
    return response.data;
};

export const createEvent = async (data: CreateEventData) => {
    const response = await api.post('/calendar', data);
    return response.data;
};

export const deleteEvent = async (id: string) => {
    const response = await api.delete(`/calendar/${id}`);
    return response.data;
};

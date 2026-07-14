import { api } from './api';

export interface Task {
    id: string;
    subject: string;
    description?: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'deferred';
    priority: 'high' | 'medium' | 'low';
    dueDate?: string;

    assignedTo?: { _id: string; firstName: string; lastName: string; email: string };
    relatedTo?: { _id: string; firstName?: string; lastName?: string; name?: string };
    onModel?: 'Lead' | 'Contact' | 'Account' | 'Opportunity';
    leadId?: string;

    createdAt: string;
}

export interface CreateTaskData {
    subject: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    assignedTo?: string;
    relatedTo?: string;
    onModel?: string;
}

export interface TaskSearchParams {
    status?: string;
    priority?: string;
    assignedTo?: string;
    branchId?: string;
    limit?: number;
}

export const getTasks = async (params?: TaskSearchParams) => {
    const response = await api.get('/tasks', { params });
    return response.data;
};

export const createTask = async (data: CreateTaskData) => {
    const response = await api.post('/tasks', data);
    return response.data;
};

export const updateTask = async (id: string, data: Partial<CreateTaskData>) => {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
};

export const deleteTask = async (id: string) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
};

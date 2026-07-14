import { api } from './api';

export interface WorkflowCondition {
    field: string;
    operator: string;
    value: string | number | boolean;
}

export interface WorkflowAction {
    type: string;
    config: Record<string, string | number | boolean>;
}

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    triggerEntity: string;
    triggerEvent: string;
    conditions: WorkflowCondition[];
    actions: WorkflowAction[];
    executionCount: number;
    lastExecutedAt?: string;
    createdAt: string;
}

export interface CreateWorkflowData {
    name: string;
    description?: string;
    triggerEntity: string;
    triggerEvent: string;
    conditions?: WorkflowCondition[];
    actions?: WorkflowAction[];
    isActive?: boolean;
}

export interface WorkflowSearchParams {
    isActive?: boolean;
    triggerEntity?: string;
}

export const getWorkflows = async (params?: WorkflowSearchParams) => {
    const response = await api.get('/workflows', { params });
    return response.data;
};

export const getWorkflowById = async (id: string) => {
    const response = await api.get(`/workflows/${id}`);
    return response.data;
};

export const createWorkflow = async (data: CreateWorkflowData) => {
    const response = await api.post('/workflows', data);
    return response.data;
};

export const updateWorkflow = async (id: string, data: Partial<CreateWorkflowData>) => {
    const response = await api.put(`/workflows/${id}`, data);
    return response.data;
};

export const deleteWorkflow = async (id: string) => {
    const response = await api.delete(`/workflows/${id}`);
    return response.data;
};

export const runWorkflow = async (id: string, entityId: string) => {
    const response = await api.post(`/workflows/${id}/run`, { entityId });
    return response.data;
};

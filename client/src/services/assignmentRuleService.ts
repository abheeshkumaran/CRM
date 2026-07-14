import { api } from './api';

export interface AssignmentRule {
    id: string;
    name: string;
    description?: string;
    entity: string;
    criteria: {
        field: string;
        operator: string;
        value: string;
    }[];
    distributionType: string;
    assignTo: {
        type: string;
        value?: string;
        users?: string[];
    };
    priority: number;
    isActive: boolean;
    enableRotation?: boolean;
    timeLimitMinutes?: number;
    rotationType?: 'random' | 'selective' | 'manager';
    rotationPool?: string[];
    branchId?: string;
    branch?: { id: string; name: string } | null;
}

export interface CreateAssignmentRuleData {
    name: string;
    description?: string;
    entity: string;
    criteria: {
        field: string;
        operator: string;
        value: string;
    }[];
    distributionType: string;
    assignTo: {
        type: string;
        value?: string;
        users?: string[];
    };
    priority: number;
    isActive: boolean;
    enableRotation?: boolean;
    timeLimitMinutes?: number;
    rotationType?: 'random' | 'selective' | 'manager';
    rotationPool?: string[];
    branchId?: string;
}

export const getAssignmentRules = async (entity?: string, branchId?: string) => {
    const response = await api.get('/assignment-rules', { params: { entity, branchId } });
    return response.data;
};

export const createAssignmentRule = async (data: CreateAssignmentRuleData) => {
    const response = await api.post('/assignment-rules', data);
    return response.data;
};

export const updateAssignmentRule = async (id: string, data: Partial<CreateAssignmentRuleData>) => {
    const response = await api.put(`/assignment-rules/${id}`, data);
    return response.data;
};

export const deleteAssignmentRule = async (id: string) => {
    const response = await api.delete(`/assignment-rules/${id}`);
    return response.data;
};

export const reorderAssignmentRules = async (ids: string[]) => {
    const response = await api.post('/assignment-rules/reorder', { ids });
    return response.data;
};

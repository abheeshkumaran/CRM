import { api } from './api';

export interface Goal {
    id: string;
    name: string;
    description?: string;
    type: 'revenue' | 'deals' | 'leads' | 'calls' | 'meetings' | 'custom';
    targetValue: number;
    currentValue: number;
    period: string;
    startDate: string;
    endDate: string;
    status: 'active' | 'completed' | 'missed' | 'cancelled';
    achievementPercent: number;
    assignedTo?: { id: string; firstName: string; lastName: string };
    createdAt: string;
}

export type GoalInput = Pick<Goal, 'name' | 'type' | 'targetValue' | 'period'> & { description?: string };

export const getGoals = async () => {
    const response = await api.get('/goals');
    return response.data;
};

export const createGoal = async (data: GoalInput) => {
    const response = await api.post('/goals', data);
    return response.data;
};

export const updateGoal = async (id: string, data: Partial<Goal>) => {
    const response = await api.put(`/goals/${id}`, data);
    return response.data;
};

export const deleteGoal = async (id: string) => {
    const response = await api.delete(`/goals/${id}`);
    return response.data;
};

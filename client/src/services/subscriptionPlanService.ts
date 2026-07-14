import { api } from './api';

export interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    billingType: 'flat_rate' | 'per_user';
    durationDays: number;
    maxUsers: number;
    description?: string;
    isActive: boolean;
    features?: string[];
    discount?: number;
}

export const getSubscriptionPlans = async () => {
    // This endpoint should be public or accessible by authenticated users to view available plans
    const response = await api.get<{ plans: SubscriptionPlan[] }>('/plans');
    return response.data;
};

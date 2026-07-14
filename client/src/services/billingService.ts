import { api } from './api';

export interface CreateCheckoutSessionParams {
    planId: string;
    organisationId: string;
}

export const billingService = {
    createCheckoutSession: async ({ planId, organisationId }: CreateCheckoutSessionParams) => {
        const { data } = await api.post('/stripe/create-checkout-session', { planId, organisationId });
        return data;
    },

    createPortalSession: async (organisationId: string) => {
        const { data } = await api.post('/stripe/create-portal-session', { organisationId });
        return data;
    }
};

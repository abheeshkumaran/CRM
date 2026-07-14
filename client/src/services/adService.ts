import { api } from './api';

export interface MetaCampaign {
    id: string;
    name: string;
    status: string;
    objective: string;
    daily_budget?: string;
    lifetime_budget?: string;
    start_time?: string;
    stop_time?: string;
}

export interface MetaAdSet {
    id: string;
    name: string;
    status: string;
    daily_budget?: string;
    lifetime_budget?: string;
    start_time?: string;
    end_time?: string;
    targeting?: Record<string, unknown>;
}

export interface MetaAd {
    id: string;
    name: string;
    status: string;
    creative?: {
        id: string;
        title?: string;
        body?: string;
        image_url?: string;
    };
}

export interface MetaInsights {
    impressions: string;
    clicks: string;
    spend: string;
    cpc: string;
    cpm: string;
    cpp: string;
    ctr: string;
    unique_clicks: string;
    reach: string;
    actions?: Array<Record<string, unknown>>;
}

export const getMetaCampaigns = async () => {
    try {
        const response = await api.get('/ads/meta/campaigns');
        // Handle both direct array and object with campaigns property
        if (response.data?.campaigns) {
            return Array.isArray(response.data.campaigns) ? response.data.campaigns : [];
        }
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Error fetching Meta campaigns:', error);
        return [];
    }
};

export const getMetaAdSets = async (campaignId?: string) => {
    try {
        const response = await api.get('/ads/meta/adsets', { params: { campaignId } });
        // Handle both direct array and object with adSets property
        if (response.data?.adSets) {
            return Array.isArray(response.data.adSets) ? response.data.adSets : [];
        }
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Error fetching Meta ad sets:', error);
        return [];
    }
};

export const getMetaAds = async (adSetId?: string) => {
    try {
        const response = await api.get('/ads/meta/ads', { params: { adSetId } });
        // Handle both direct array and object with ads property
        if (response.data?.ads) {
            return Array.isArray(response.data.ads) ? response.data.ads : [];
        }
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Error fetching Meta ads:', error);
        return [];
    }
};

export const getMetaInsights = async (level: 'campaign' | 'adset' | 'ad' | 'account' = 'account') => {
    try {
        const response = await api.get('/ads/meta/insights', { params: { level } });
        // Handle both direct array and object with insights property
        if (response.data?.insights) {
            return Array.isArray(response.data.insights) ? response.data.insights : [];
        }
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('Error fetching Meta insights:', error);
        return [];
    }
};

export const testMetaConnection = async () => {
    try {
        const response = await api.post('/ads/meta/test');
        return response.data || { success: false, message: 'No response' };
    } catch (error) {
        console.error('Error testing Meta connection:', error);
        return { success: false, message: 'Connection test failed' };
    }
};

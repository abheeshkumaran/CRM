import axios from 'axios';

interface AdAccount {
    id: string;
    name: string;
    account_id: string;
    account_status: number;
    currency: string;
    timezone_name: string;
}

interface Campaign {
    id: string;
    name: string;
    status: string;
    objective: string;
    daily_budget?: string;
    lifetime_budget?: string;
}

class MarketingAPIService {
    private customAxios: any;
    private apiVersion = 'v19.0';
    private baseUrl = `https://graph.facebook.com/${this.apiVersion}`;

    constructor(accessToken: string) {
        this.customAxios = axios.create({
            baseURL: this.baseUrl,
            params: {
                access_token: accessToken,
            },
        });
    }

    /**
     * Fetch all Ad Accounts the user has access to
     */
    async getAdAccounts(fields = 'id,name,account_id,account_status,currency,timezone_name'): Promise<AdAccount[]> {
        try {
            const response = await this.customAxios.get('/me/adaccounts', {
                params: { fields },
            });
            return response.data.data;
        } catch (error: any) {
            this.handleError(error, 'fetching ad accounts');
            return []; // Unreachable code due to throw, but keeps TS happy if return type strict
        }
    }

    /**
     * Fetch Campaigns for a specific Ad Account
     */
    async getCampaigns(adAccountId: string, fields = 'id,name,status,objective,daily_budget,lifetime_budget'): Promise<Campaign[]> {
        try {
            // Ensure adAccountId starts with 'act_'
            const formattedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

            const response = await this.customAxios.get(`/${formattedId}/campaigns`, {
                params: { fields },
            });
            return response.data.data;
        } catch (error: any) {
            this.handleError(error, `fetching campaigns for ${adAccountId}`);
            return [];
        }
    }

    /**
     * Create a new Campaign
     */
    async createCampaign(adAccountId: string, campaignData: {
        name: string;
        objective: string;
        status: 'PAUSED' | 'ACTIVE';
        special_ad_categories: string[];
    }): Promise<Campaign> {
        try {
            const formattedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

            const response = await this.customAxios.post(`/${formattedId}/campaigns`, {
                ...campaignData,
                is_adset_budget_sharing_enabled: false
            });
            return response.data;
        } catch (error: any) {
            this.handleError(error, `creating campaign for ${adAccountId}`);
            throw error; // redundant but clear
        }
    }

    private handleError(error: any, context: string) {
        const status = error.response?.status;
        const data = error.response?.data;
        const message = data?.error?.message || error.message;

        console.error(`Error ${context}:`, message);

        // Propagate 401 as 400 to avoid global logout if it's just meta token issue
        // Actually controller handles user-level token missing. 
        // If meta returns 401, it means the token is invalid/expired.
        // We should throw a specific error that controller can catch.

        const err: any = new Error(message);
        err.status = status;
        err.metaError = data?.error;
        throw err;
    }
}

export default MarketingAPIService;

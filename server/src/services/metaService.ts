import axios from 'axios';

interface MetaConfig {
    accessToken: string;
    adAccountId: string;
    appId?: string;
    appSecret?: string;
}

export class MetaService {
    private baseUrl = 'https://graph.facebook.com/v18.0';

    async makeRequest(endpoint: string, accessToken: string, params: any = {}, retries: number = 3) {
        let lastError: any;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await axios.get(`${this.baseUrl}/${endpoint}`, {
                    params: {
                        access_token: accessToken,
                        ...params
                    },
                    timeout: 30000 // 30 second timeout
                });
                return response.data;
            } catch (error: any) {
                lastError = error;
                console.error(`Meta API Error (attempt ${attempt}/${retries}):`, error.response?.data || error.message);

                // Don't retry on client errors (4xx) except rate limiting
                if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
                    break;
                }

                // Wait before retrying (exponential backoff)
                if (attempt < retries) {
                    const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        const errorMsg = lastError?.response?.data?.error?.message || lastError?.message || 'Failed to fetch data from Meta API';
        const errorType = lastError?.response?.data?.error?.type;
        const errorCode = lastError?.response?.data?.error?.code;
        const errorSubcode = lastError?.response?.data?.error?.error_subcode;

        console.error(`[MetaService] Final Error: ${errorMsg} (Type: ${errorType}, Code: ${errorCode}, Subcode: ${errorSubcode})`);

        if (errorCode === 190) { // OAuth Error
            throw new Error(`Invalid or expired Meta Access Token. Please reconnect your account. (Code: 190, Subcode: ${errorSubcode})`);
        }

        throw new Error(errorMsg);
    }

    async makePostRequest(endpoint: string, accessToken: string, data: any = {}, retries: number = 2) {
        let lastError: any;
        console.log(`[MetaService] POST request to ${endpoint} starting (retries: ${retries})...`);

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await axios.post(`${this.baseUrl}/${endpoint}`, data, {
                    params: { access_token: accessToken },
                    timeout: 60000 // Post might take longer
                });
                console.log(`[MetaService] POST request to ${endpoint} SUCCESS on attempt ${attempt}`);
                return response.data;
            } catch (error: any) {
                lastError = error;
                console.error(`[MetaService] POST request to ${endpoint} FAILED (attempt ${attempt}/${retries}):`, error.response?.data || error.message);

                if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
                    break;
                }

                if (attempt < retries) {
                    const delay = Math.pow(2, attempt) * 2000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        const metaError = lastError?.response?.data?.error;
        const errorMsg = metaError?.error_user_msg || metaError?.message || lastError?.message || 'Failed to post data to Meta API';
        console.error(`[MetaService] POST request to ${endpoint} FINAL FAILURE: ${errorMsg}`);
        throw new Error(errorMsg);
    }

    async exchangeForLongLivedToken(shortLivedToken: string, config?: MetaConfig): Promise<{ accessToken: string, expiresAt?: Date }> {
        try {
            // Prefer config values (from DB), fallback to env vars (system default)
            const appId = config?.appId || process.env.META_APP_ID;
            const appSecret = config?.appSecret || process.env.META_APP_SECRET;

            if (!appId || !appSecret) {
                console.warn('Meta App ID or Secret not configured (neither in DB nor ENV), skipping token exchange');
                return { accessToken: shortLivedToken };
            }

            const response = await axios.get(`${this.baseUrl}/oauth/access_token`, {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: appId,
                    client_secret: appSecret,
                    fb_exchange_token: shortLivedToken
                }
            });

            if (response.data && response.data.access_token) {
                console.log('Successfully exchanged for long-lived Meta token');
                const result: { accessToken: string, expiresAt?: Date } = {
                    accessToken: response.data.access_token
                };

                if (response.data.expires_in) {
                    result.expiresAt = new Date(Date.now() + (response.data.expires_in * 1000));
                }

                return result;
            }

            return { accessToken: shortLivedToken };
        } catch (error: any) {
            console.error('Failed to exchange Meta token:', error.response?.data || error.message);
            // Return original token on failure to avoid breaking the flow completely
            return { accessToken: shortLivedToken };
        }
    }

    async getCampaigns(config: MetaConfig) {
        const fields = 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time';
        const data = await this.makeRequest(`${this.getFormattedAdAccountId(config.adAccountId)}/campaigns`, config.accessToken, {
            fields,
            limit: 50
        });
        return data.data; // Meta returns { data: [], paging: {} }
    }

    async getAdSets(config: MetaConfig, campaignId?: string) {
        const fields = 'id,name,status,start_time,end_time,daily_budget,lifetime_budget,targeting';
        const endpoint = campaignId ? `${campaignId}/adsets` : `${this.getFormattedAdAccountId(config.adAccountId)}/adsets`;

        const data = await this.makeRequest(endpoint, config.accessToken, {
            fields,
            limit: 50
        });
        return data.data;
    }

    async getAds(config: MetaConfig, adSetId?: string) {
        const fields = 'id,name,status,creative{id,title,body,image_url}';
        const endpoint = adSetId ? `${adSetId}/ads` : `${this.getFormattedAdAccountId(config.adAccountId)}/ads`;

        const data = await this.makeRequest(endpoint, config.accessToken, {
            fields,
            limit: 50
        });
        return data.data;
    }

    async getInsights(config: MetaConfig, level: 'campaign' | 'adset' | 'ad' | 'account' = 'account') {
        const fields = 'impressions,clicks,spend,cpc,cpm,cpp,ctr,unique_clicks,reach,actions';
        // Default to last 30 days
        const date_preset = 'last_30d';

        const data = await this.makeRequest(`${this.getFormattedAdAccountId(config.adAccountId)}/insights`, config.accessToken, {
            level,
            fields,
            date_preset
        });
        return data.data;
    }

    async testConnection(config: MetaConfig) {
        // Try to fetch the ad account details to verify credentials
        const data = await this.makeRequest(this.getFormattedAdAccountId(config.adAccountId), config.accessToken, {
            fields: 'name,account_status'
        });
        return {
            success: true,
            accountName: data.name,
            status: data.account_status
        };
    }

    async createCampaign(config: MetaConfig, details: { name: string, objective: string, status?: string }) {
        const adAccountId = this.getFormattedAdAccountId(config.adAccountId);
        return await this.makePostRequest(`${adAccountId}/campaigns`, config.accessToken, {
            name: details.name,
            objective: details.objective,
            status: details.status || 'PAUSED', // Always create as paused by default
            special_ad_categories: ['NONE'],
            is_adset_budget_sharing_enabled: false
        });
    }

    async createAdSet(config: MetaConfig, details: {
        name: string,
        campaignId: string,
        bidAmount?: number,
        billingEvent?: string,
        dailyBudget?: number,
        optimizationGoal?: string,
        status?: string,
        targeting: any
    }) {
        const adAccountId = this.getFormattedAdAccountId(config.adAccountId);
        const data: any = {
            name: details.name,
            campaign_id: details.campaignId,
            optimization_goal: details.optimizationGoal || 'REACH',
            billing_event: details.billingEvent || 'IMPRESSIONS',
            bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
            status: details.status || 'PAUSED',
            targeting: details.targeting
        };

        if (details.dailyBudget) {
            data.daily_budget = details.dailyBudget;
        }

        if (details.bidAmount) {
            data.bid_amount = details.bidAmount;
            // If explicit bid amount is given, use BID_CAP strategy instead
            data.bid_strategy = 'LOWEST_COST_WITH_BID_CAP';
        }

        return await this.makePostRequest(`${adAccountId}/adsets`, config.accessToken, data);
    }

    async createAdCreative(config: MetaConfig, details: {
        name: string,
        pageId: string,
        message: string,
        link: string,
        imageHash?: string,
        videoUrl?: string
    }) {
        const adAccountId = this.getFormattedAdAccountId(config.adAccountId);
        const object_story_spec: any = {
            page_id: details.pageId,
            link_data: {
                message: details.message,
                link: details.link,
                call_to_action: { type: 'LEARN_MORE' }
            }
        };

        if (details.imageHash) {
            object_story_spec.link_data.image_hash = details.imageHash;
        }

        return await this.makePostRequest(`${adAccountId}/adcreatives`, config.accessToken, {
            name: details.name,
            object_story_spec
        });
    }

    async createAd(config: MetaConfig, details: {
        name: string,
        adSetId: string,
        creativeId: string,
        status?: string
    }) {
        const adAccountId = this.getFormattedAdAccountId(config.adAccountId);
        return await this.makePostRequest(`${adAccountId}/ads`, config.accessToken, {
            name: details.name,
            adset_id: details.adSetId,
            creative: { creative_id: details.creativeId },
            status: details.status || 'PAUSED'
        });
    }

    async uploadImage(config: MetaConfig, imageUrl: string) {
        const adAccountId = this.getFormattedAdAccountId(config.adAccountId);
        // This is a simplified version, usually we'd pass a buffer or stream
        // But Graph API accepts URL for images in some cases or we can use the bytes parameter
        return await this.makePostRequest(`${adAccountId}/adimages`, config.accessToken, {
            url: imageUrl
        });
    }

    private getFormattedAdAccountId(adAccountId: string): string {
        if (!adAccountId) return '';
        // If it already starts with act_, return it
        if (adAccountId.startsWith('act_')) {
            return adAccountId;
        }
        // Otherwise prepend act_
        return `act_${adAccountId}`;
    }

    /**
     * Subscribes a Facebook Page to the CRM's App
     * This enables automatic lead delivery via webhooks
     */
    async subscribePageToApp(pageId: string, pageAccessToken: string) {
        try {
            console.log(`[MetaService] Attempting to subscribe Page ${pageId} to app...`);
            const response = await this.makePostRequest(`${pageId}/subscribed_apps`, pageAccessToken, {
                subscribed_fields: ['leadgen', 'ads']
            });
            console.log(`[MetaService] Successfully subscribed Page ${pageId}:`, response);
            return response;
        } catch (error: any) {
            console.error(`[MetaService] Failed to subscribe Page ${pageId}:`, error.message);
            // Don't throw, just log. Subscription might fail if permissions are missing.
            return null;
        }
    }
}

export const metaService = new MetaService();

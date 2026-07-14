import { Twilio } from 'twilio';
import prisma from '../config/prisma';


interface TwilioConfig {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
}

export class TelephonyService {
    private client: Twilio | null = null;
    private config: TwilioConfig | null = null;

    constructor(config?: TwilioConfig) {
        if (config) {
            this.config = config;
            this.client = new Twilio(config.accountSid, config.authToken);
        }
    }

    static async getClientForOrg(orgId: string): Promise<TelephonyService | null> {
        const org = await prisma.organisation.findUnique({
            where: { id: orgId },
            select: { integrations: true }
        });

        if (!org || !org.integrations) return null;

        const integrations = org.integrations as any;
        const twilioConfig = integrations.twilio;

        if (!twilioConfig || !twilioConfig.accountSid || !twilioConfig.authToken) return null;

        return new TelephonyService(twilioConfig);
    }

    async makeCall(to: string, url: string) {
        if (!this.client || !this.config) throw new Error('Twilio client not initialized');

        return this.client.calls.create({
            to,
            from: this.config.phoneNumber,
            url
        });
    }

    async sendSms(to: string, body: string) {
        if (!this.client || !this.config) throw new Error('Twilio client not initialized');

        return this.client.messages.create({
            to,
            from: this.config.phoneNumber,
            body
        });
    }
}

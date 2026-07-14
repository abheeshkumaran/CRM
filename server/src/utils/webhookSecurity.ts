import crypto from 'crypto';

export class WebhookSecurity {
    /**
     * Verify Meta webhook signature
     */
    static verifyMetaSignature(payload: string, signature: string, secret: string): boolean {
        try {
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');
            
            const providedSignature = signature.replace('sha256=', '');
            
            return crypto.timingSafeEqual(
                Buffer.from(expectedSignature, 'hex'),
                Buffer.from(providedSignature, 'hex')
            );
        } catch (error) {
            console.error('[WebhookSecurity] Meta signature verification failed:', error);
            return false;
        }
    }

    /**
     * Verify WhatsApp webhook signature
     */
    static verifyWhatsAppSignature(payload: string, signature: string, secret: string): boolean {
        try {
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');
            
            const providedSignature = signature.replace('sha256=', '');
            
            return crypto.timingSafeEqual(
                Buffer.from(expectedSignature, 'hex'),
                Buffer.from(providedSignature, 'hex')
            );
        } catch (error) {
            console.error('[WebhookSecurity] WhatsApp signature verification failed:', error);
            return false;
        }
    }

    /**
     * Generate webhook signature for testing
     */
    static generateSignature(payload: string, secret: string): string {
        return 'sha256=' + crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
    }
}
import nodemailer from 'nodemailer';
import { GmailService } from './gmailService';
import prisma from '../config/prisma';


const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_pass'
    }
});

export const EmailService = {
    /**
     * Send an email — prefers user's Gmail if connected, falls back to SMTP
     */
    async sendEmail(
        to: string,
        subject: string,
        html: string,
        organisationId?: string,
        createdById?: string,
        context?: { leadId?: string; contactId?: string }
    ): Promise<boolean> {
        try {
            console.log(`[EmailService] Sending email to ${to} | Subject: ${subject}`);

            let sentViaGmail = false;

            // Try Gmail first if user is specified
            if (createdById) {
                try {
                    const isGmailConnected = await GmailService.isConnected(createdById);
                    if (isGmailConnected) {
                        await GmailService.sendEmail(createdById, { to, subject, html });
                        sentViaGmail = true;
                        console.log('[EmailService] Sent via Gmail API');
                    }
                } catch (gmailErr) {
                    console.warn('[EmailService] Gmail send failed, falling back to SMTP:', gmailErr);
                }
            }

            // Fallback to SMTP
            if (!sentViaGmail) {
                const info = await transporter.sendMail({
                    from: '"PYPE" <no-reply@pype.com>',
                    to,
                    subject,
                    html
                });
                console.log('[EmailService] Message sent via SMTP:', info.messageId);
            }

            // Save to Interactions
            if (organisationId) {
                await prisma.interaction.create({
                    data: {
                        type: InteractionType.email,
                        direction: InteractionDirection.outbound,
                        subject: subject,
                        description: `Email sent to ${to}. Content snippet: ${html.substring(0, 100)}...`,
                        organisationId,
                        createdById,
                        leadId: context?.leadId,
                        contactId: context?.contactId,
                        date: new Date()
                    }
                }).catch(err => console.error('[EmailService] Failed to log interaction:', err));
            }

            return true;
        } catch (error) {
            console.error('[EmailService] Error sending email:', error);
            return false;
        }
    },

    /**
     * Replace placeholders like {{firstName}} with actual values
     */
    personalize(text: string, data: Record<string, any>): string {
        let personalized = text;
        for (const key in data) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            personalized = personalized.replace(regex, data[key] || '');
        }
        return personalized;
    }
};

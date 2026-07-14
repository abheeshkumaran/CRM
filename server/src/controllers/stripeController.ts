import { Request, Response } from 'express';
import { StripeService } from '../services/stripeService';
import prisma from '../config/prisma';


export const createCheckoutSession = async (req: Request, res: Response) => {
    try {
        const { planId } = req.body;
        const user = (req as any).user;
        const userEmail = user.email;
        const organisationId = user.organisationId;

        if (!organisationId) {
            return res.status(403).json({ message: 'User has no organisation' });
        }

        const plan = await prisma.subscriptionPlan.findUnique({
            where: { id: planId }
        });

        if (!plan) return res.status(404).json({ message: 'Plan not found' });

        const session = await StripeService.createCheckoutSession(plan, organisationId, userEmail);
        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const createPortalSession = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organisationId = user.organisationId;

        if (!organisationId) {
            return res.status(403).json({ message: 'User has no organisation' });
        }

        const org = await prisma.organisation.findUnique({
            where: { id: organisationId }
        });

        if (!org) {
            return res.status(404).json({ message: 'Organisation not found' });
        }

        if (!org.subscription) {
            return res.status(404).json({ message: 'No subscription found. Please subscribe to a plan first.' });
        }

        const subscription = org.subscription as any;
        if (!subscription.stripeCustomerId) {
            return res.status(404).json({ message: 'Stripe customer not found. Please contact support.' });
        }

        const session = await StripeService.createPortalSession(subscription.stripeCustomerId);
        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating portal session:', error);
        res.status(500).json({ message: 'Internal server error', error: (error as Error).message });
    }
};

export const handleWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];

    try {
        if (!sig) throw new Error('No signature');
        // Note: Stripe Webhook requires the RAW body. 
        // Ensure express.raw() is used in routes for this endpoint.
        await StripeService.handleWebhook(sig as string, req.body);
        res.json({ received: true });
    } catch (err) {
        console.error('Webhook Error:', (err as Error).message);
        res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }
};

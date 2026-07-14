import Stripe from 'stripe';
import prisma from '../config/prisma';


// Lazy initialization of Stripe to prevent crashes when STRIPE_SECRET_KEY is not set
let stripeInstance: Stripe | null = null;

const getStripe = (): Stripe => {
    if (!stripeInstance) {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new Error('STRIPE_SECRET_KEY environment variable is not configured. Please add it to your Render environment variables.');
        }
        stripeInstance = new Stripe(secretKey, {
            apiVersion: '2023-10-16' as any, // Use a stable API version
        });
    }
    return stripeInstance;
};

export const StripeService = {
    /**
     * Create a Checkout Session for a subscription
     */
    async createCheckoutSession(plan: any, organisationId: string, userEmail: string) {
        if (!plan.price) throw new Error('Plan has no price');
        if (!process.env.CLIENT_URL) throw new Error('CLIENT_URL environment variable is not configured');

        const session = await getStripe().checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: plan.currency.toLowerCase(),
                        product_data: {
                            name: plan.name,
                            description: plan.description || undefined,
                        },
                        unit_amount: Math.round(plan.price * 100), // Stripe expects cents
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                organisationId,
                planId: plan.id,
            },
            customer_email: userEmail,
            success_url: `${process.env.CLIENT_URL}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/settings/billing?canceled=true`,
        });

        return session;
    },

    /**
     * Create a Customer Portal Session (for managing subs)
     */
    async createPortalSession(customerId: string) {
        if (!process.env.CLIENT_URL) throw new Error('CLIENT_URL environment variable is not configured');

        const session = await getStripe().billingPortal.sessions.create({
            customer: customerId,
            return_url: `${process.env.CLIENT_URL}/settings/billing`,
        });
        return session;
    },

    /**
     * Handle Webhooks
     */
    async handleWebhook(signature: string, payload: Buffer) {
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
        }

        const event = getStripe().webhooks.constructEvent(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        console.log(`[StripeWebhook] Handling event: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed':
                await this.handleCheckoutCompleted(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await this.handleSubscriptionDeleted(event.data.object);
                break;
            case 'customer.subscription.updated':
                await this.handleSubscriptionUpdated(event.data.object);
                break;
            default:
                console.log(`[StripeWebhook] Unhandled event type: ${event.type}`);
        }
    },

    async handleCheckoutCompleted(session: any) {
        const orgId = session.metadata?.organisationId;
        const planId = session.metadata?.planId;

        if (orgId && planId) {
            // Fetch Plan Details
            const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });

            // Update Organisation Subscription and Limits using Prisma
            await prisma.organisation.update({
                where: { id: orgId },
                data: {
                    userLimit: plan?.maxUsers || 5,
                    contactLimit: plan?.maxContacts || 500,
                    storageLimit: plan?.maxStorage || 1000,
                    subscription: {
                        status: 'active',
                        planId: planId,
                        startDate: new Date().toISOString(),
                        stripeCustomerId: session.customer as string,
                        stripeSubscriptionId: session.subscription as string
                    }
                }
            });
            console.log(`[StripeWebhook] Activated subscription and synced limits for Org: ${orgId}`);
        }
    },

    async handleSubscriptionDeleted(subscription: any) {
        const customerId = subscription.customer;

        // Find org by stripeCustomerId
        const org = await prisma.organisation.findFirst({
            where: {
                subscription: {
                    path: ['stripeCustomerId'],
                    equals: customerId
                }
            }
        });

        if (org) {
            await prisma.organisation.update({
                where: { id: org.id },
                data: {
                    subscription: {
                        ...(org.subscription as any),
                        status: 'cancelled',
                        endDate: new Date().toISOString()
                    }
                }
            });
            console.log(`[StripeWebhook] Cancelled subscription for Org: ${org.id}`);
        }
    },

    async handleSubscriptionUpdated(subscription: any) {
        const customerId = subscription.customer;

        const org = await prisma.organisation.findFirst({
            where: {
                subscription: {
                    path: ['stripeCustomerId'],
                    equals: customerId
                }
            }
        });

        if (org) {
            const planId = (org.subscription as any)?.planId;
            const plan = planId ? await prisma.subscriptionPlan.findUnique({ where: { id: planId } }) : null;

            await prisma.organisation.update({
                where: { id: org.id },
                data: {
                    userLimit: plan?.maxUsers || org.userLimit,
                    contactLimit: plan?.maxContacts || org.contactLimit,
                    storageLimit: plan?.maxStorage || org.storageLimit,
                    subscription: {
                        ...(org.subscription as any),
                        status: subscription.status === 'active' ? 'active' : 'inactive',
                        stripeSubscriptionId: subscription.id
                    }
                }
            });
            console.log(`[StripeWebhook] Updated subscription and limits for Org: ${org.id}, Status: ${subscription.status}`);
        }
    }
};

import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function checkLicenses() {
    try {
        console.log('Checking licenses and organisations...\n');

        // Get all organisations
        const orgs = await prisma.organisation.findMany({
            select: {
                id: true,
                name: true,
                status: true,
            }
        });

        console.log(`Found ${orgs.length} organisations:\n`);
        orgs.forEach((org: any) => {
            console.log(`- ${org.name} (${org.id}) - Status: ${org.status}`);
        });

        console.log('\n---\n');

        // Get all licenses
        const licenses = await prisma.license.findMany({
            include: {
                organisation: {
                    select: { name: true }
                },
                plan: {
                    select: { name: true, price: true }
                }
            }
        });

        console.log(`Found ${licenses.length} licenses:\n`);
        licenses.forEach((license: any) => {
            console.log(`License ID: ${license.id}`);
            console.log(`  Organisation: ${license.organisation.name}`);
            console.log(`  Plan: ${license.plan.name} (${license.plan.price})`);
            console.log(`  Status: ${license.status}`);
            console.log(`  Start: ${license.startDate}`);
            console.log(`  End: ${license.endDate}`);
            console.log(`  Max Users: ${license.maxUsers}`);
            console.log('');
        });

        console.log('\n---\n');

        // Get all subscription plans
        const plans = await prisma.subscriptionPlan.findMany({
            select: {
                id: true,
                name: true,
                price: true,
                pricingModel: true,
                pricePerUser: true,
                maxUsers: true,
                durationDays: true,
                isActive: true,
            }
        });

        console.log(`Found ${plans.length} subscription plans:\n`);
        plans.forEach((plan: any) => {
            console.log(`Plan: ${plan.name} (${plan.id})`);
            console.log(`  Price: ${plan.price}`);
            console.log(`  Model: ${plan.pricingModel}`);
            console.log(`  Price per user: ${plan.pricePerUser || 'N/A'}`);
            console.log(`  Max Users: ${plan.maxUsers}`);
            console.log(`  Duration: ${plan.durationDays} days`);
            console.log(`  Active: ${plan.isActive}`);
            console.log('');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLicenses();

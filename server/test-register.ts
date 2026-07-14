import prisma from './src/config/prisma';
import bcrypt from 'bcryptjs';

async function testRegistration() {
    const firstName = "Test";
    const lastName = "User";
    const email = `test.user.${Date.now()}@example.com`;
    const password = "password123";
    const companyName = `Test Corp ${Date.now()}`;

    try {
        const defaultPlan = { id: 'starter-plan' };
        const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substr(2, 4);

        const result = await prisma.$transaction(async (tx: any) => {
            const org = await tx.organisation.create({
                data: {
                    name: companyName,
                    slug,
                    domain: `${slug}.${email.split('@')[1] || 'unknown.com'}`,
                    status: 'active',
                    subscription: {
                        status: 'trialing',
                        planId: defaultPlan?.id,
                        startDate: new Date(),
                        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
                        autoRenew: false
                    },
                    userIdCounter: 1
                }
            });

            const prefix = (companyName.substring(0, 3) + 'USR').substring(0, 3).toUpperCase();
            const generatedUserId = `${prefix}${Math.floor(10000 + Math.random() * 90000)}`;

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const user = await tx.user.create({
                data: {
                    firstName,
                    lastName,
                    email,
                    password: hashedPassword,
                    role: 'admin',
                    organisationId: org.id,
                    userId: generatedUserId,
                    isActive: true
                }
            });

            await tx.organisation.update({
                where: { id: org.id },
                data: { createdBy: user.id }
            });

            return { user, org };
        });

        console.log("Registration SUCCESS:", result.user.email);
    } catch (error: any) {
        console.error("Registration FAILED:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testRegistration();

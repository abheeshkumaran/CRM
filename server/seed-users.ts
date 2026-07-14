import { PrismaClient } from './src/generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedUsers() {
    try {
        console.log("Seeding dummy users...");
        
        const defaultPlan = { id: 'starter-plan' };
        
        const dummyUsers = [
            { firstName: 'Alice', lastName: 'Smith', companyName: 'Alice Tech', email: 'alice@example.com' },
            { firstName: 'Bob', lastName: 'Johnson', companyName: 'Bob Logistics', email: 'bob@example.com' },
            { firstName: 'Charlie', lastName: 'Brown', companyName: 'Charlie Consulting', email: 'charlie@example.com' },
        ];
        
        for (const userData of dummyUsers) {
            const { firstName, lastName, companyName, email } = userData;
            
            // Check if user exists
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                console.log(`User ${email} already exists, skipping.`);
                continue;
            }
            
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
                            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                            autoRenew: false
                        },
                        userIdCounter: 1
                    }
                });

                const prefix = (companyName.substring(0, 3) + 'USR').substring(0, 3).toUpperCase();
                const generatedUserId = `${prefix}${Math.floor(10000 + Math.random() * 90000)}`;

                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash('password123', salt);

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
            console.log(`Created dummy user: ${email} with company: ${companyName}`);
        }
        
        console.log("Seeding complete!");
    } catch (error) {
        console.error("Seeding failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

seedUsers();

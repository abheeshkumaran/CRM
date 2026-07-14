
import prisma from '../src/config/prisma';
import bcrypt from 'bcryptjs';

const resetPassword = async () => {
    const email = 'edufolio@dad.com';
    const passwordRaw = 'password123';

    try {
        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash(passwordRaw, salt);

        // Find ANY org or specific one
        let org = await prisma.organisation.findFirst();
        if (!org) {
            org = await prisma.organisation.findUnique({ where: { slug: 'default-org' } });
        }

        let organisationId;
        if (org) {
            organisationId = org.id;
        } else {
            console.log('No organisation found, creating one...');
            const newOrg = await prisma.organisation.create({
                data: { name: 'Default Org', slug: 'default-org-' + Date.now() } // Ensure unique
            });
            organisationId = newOrg.id;
        }

        const user = await prisma.user.upsert({
            where: { email },
            update: { password },
            create: {
                email,
                password,
                firstName: 'Test',
                lastName: 'User',
                role: 'admin',
                organisationId: organisationId,
                isActive: true
            }
        });

        console.log(`User ${email} upserted. Password: ${passwordRaw}`);

    } catch (e) {
        console.error('Error upserting user:', e);
    } finally {
        await prisma.$disconnect();
    }
};

resetPassword();


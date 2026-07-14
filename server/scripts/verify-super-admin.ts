import prisma from '../src/config/prisma';

async function verifySuperAdmin() {
    try {
        console.log('🔍 Verifying Super Admin Status...\n');

        const superAdmins = await prisma.user.findMany({
            where: { role: 'super_admin' },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                organisationId: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (superAdmins.length === 0) {
            console.log('❌ NO SUPER ADMIN FOUND!');
            console.log('Run: npx ts-node src/scripts/seed.ts');
            process.exit(1);
        }

        console.log(`✅ Found ${superAdmins.length} Super Admin(s):\n`);

        superAdmins.forEach((admin, index) => {
            console.log(`Super Admin #${index + 1}:`);
            console.log(`  Email: ${admin.email}`);
            console.log(`  Name: ${admin.firstName} ${admin.lastName}`);
            console.log(`  Role: ${admin.role}`);
            console.log(`  Organisation ID: ${admin.organisationId || 'NULL (PROTECTED ✅)'}`);
            console.log(`  Active: ${admin.isActive ? 'Yes ✅' : 'No ❌'}`);
            console.log(`  Created: ${admin.createdAt}`);
            console.log(`  Updated: ${admin.updatedAt}`);
            
            if (admin.organisationId) {
                console.log(`  ⚠️  WARNING: Super admin should NOT be linked to organisation!`);
            } else {
                console.log(`  ✅ PROTECTED: Not linked to any organisation`);
            }
            console.log('');
        });

        // Check total users
        const totalUsers = await prisma.user.count();
        const activeUsers = await prisma.user.count({ where: { isActive: true } });
        
        console.log(`📊 User Statistics:`);
        console.log(`  Total Users: ${totalUsers}`);
        console.log(`  Active Users: ${activeUsers}`);
        console.log(`  Super Admins: ${superAdmins.length}`);
        console.log('');

        // Check organisations
        const totalOrgs = await prisma.organisation.count();
        const activeOrgs = await prisma.organisation.count({ where: { isDeleted: false } });
        
        console.log(`🏢 Organisation Statistics:`);
        console.log(`  Total Organisations: ${totalOrgs}`);
        console.log(`  Active Organisations: ${activeOrgs}`);
        console.log('');

        console.log('✅ Verification Complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error verifying super admin:', error);
        process.exit(1);
    }
}

verifySuperAdmin();
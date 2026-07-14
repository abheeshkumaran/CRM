
import 'dotenv/config';
import prisma from '../src/config/prisma';

async function checkHealth() {
    console.log("----------------------------------------------------------------");
    console.log("Starting Database Health Check...");
    console.log("----------------------------------------------------------------");

    try {
        // 1. Connection Check
        console.log("1. Testing Connection...");
        await prisma.$connect();
        console.log("✅ Database Connected Successfully.");

        // 2. User Count
        const userCount = await prisma.user.count();
        console.log(`✅ User Count: ${userCount}`);

        // 3. User Data Integrity
        if (userCount > 0) {
            console.log("\n2. Checking First 5 Users:");
            const users = await prisma.user.findMany({
                take: 5,
                select: { id: true, email: true, role: true, isActive: true, organisationId: true }
            });

            users.forEach((u: any) => {
                console.log(`   - [${u.role}] ${u.email} (Active: ${u.isActive}, Org: ${u.organisationId})`);
            });
        } else {
            console.log("⚠️ No users found in database.");
        }

        // 4. Organisation Check
        const orgCount = await prisma.organisation.count();
        console.log(`\n3. Organisation Count: ${orgCount}`);

        // 3b. List organisations
        const orgs = await prisma.organisation.findMany({ select: { id: true, name: true } });
        orgs.forEach(o => console.log(`   - Org ID: ${o.id}, Name: ${o.name}`));

        // 5. Simulate Login Query
        console.log("\n4. Simulating Login Query...");
        const loginUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: { equals: 'admin@example.com', mode: 'insensitive' } }, // Replace with a valid email from DB if known, or just test query syntax
                    { userId: 'USR001' }
                ]
            },
            include: {
                organisation: true
            }
        });
        console.log(`✅ Login Query Executed (Result: ${loginUser ? 'Found' : 'Not Found'})`);

        console.log("\n----------------------------------------------------------------");
        console.log("✅ HEALTH CHECK PASSED");
        console.log("----------------------------------------------------------------");
    } catch (error) {
        console.error("\n❌ HEALTH CHECK FAILED");
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkHealth();

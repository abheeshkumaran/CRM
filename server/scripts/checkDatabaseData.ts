import prisma from '../src/config/prisma';

async function checkDatabaseData() {
    try {
        console.log('🔍 Checking database for existing data...\n');

        // Check Users
        const userCount = await prisma.user.count();
        console.log(`👥 Users: ${userCount}`);
        
        if (userCount > 0) {
            const users = await prisma.user.findMany({
                take: 5,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    organisationId: true
                }
            });
            console.log('   Sample users:');
            users.forEach(user => {
                console.log(`   - ${user.email} (${user.firstName} ${user.lastName}) - Role: ${user.role}, Active: ${user.isActive}`);
            });
        }

        // Check Organisations
        const orgCount = await prisma.organisation.count();
        console.log(`\n🏢 Organisations: ${orgCount}`);
        
        if (orgCount > 0) {
            const orgs = await prisma.organisation.findMany({
                take: 5,
                select: {
                    id: true,
                    name: true,
                    status: true,
                    createdAt: true
                }
            });
            console.log('   Sample organisations:');
            orgs.forEach(org => {
                console.log(`   - ${org.name} (Status: ${org.status}, Created: ${org.createdAt.toISOString().split('T')[0]})`);
            });
        }

        // Check Leads
        const leadCount = await prisma.lead.count();
        console.log(`\n📋 Leads: ${leadCount}`);
        
        if (leadCount > 0) {
            const leads = await prisma.lead.findMany({
                take: 5,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    status: true,
                    isReEnquiry: true,
                    reEnquiryCount: true
                }
            });
            console.log('   Sample leads:');
            leads.forEach(lead => {
                const reEnquiry = lead.isReEnquiry ? ` (Re-enquiry: ${lead.reEnquiryCount}x)` : '';
                console.log(`   - ${lead.firstName} ${lead.lastName} - ${lead.email} - Status: ${lead.status}${reEnquiry}`);
            });
        }

        // Check Products
        const productCount = await prisma.product.count();
        console.log(`\n📦 Products: ${productCount}`);

        // Check ProductShares
        const shareCount = await prisma.productShare.count();
        console.log(`🔗 Product Shares: ${shareCount}`);

        // Check Contacts
        const contactCount = await prisma.contact.count();
        console.log(`📞 Contacts: ${contactCount}`);

        // Check Accounts
        const accountCount = await prisma.account.count();
        console.log(`🏦 Accounts: ${accountCount}`);

        // Check Opportunities
        const opportunityCount = await prisma.opportunity.count();
        console.log(`💼 Opportunities: ${opportunityCount}`);

        // Check if migrations are applied
        console.log('\n📊 Checking schema...');
        
        // Try to query new fields to verify migrations
        try {
            const leadWithNewFields = await prisma.lead.findFirst({
                select: {
                    country: true,
                    countryCode: true,
                    phoneCountryCode: true,
                    isReEnquiry: true,
                    reEnquiryCount: true,
                    lastEnquiryDate: true
                }
            });
            console.log('✅ New lead fields (country, re-enquiry) are present in schema');
        } catch (error) {
            console.log('❌ New lead fields are NOT present - migrations may not have run');
            console.error('   Error:', (error as Error).message);
        }

        // Summary
        console.log('\n📈 Summary:');
        console.log(`   Total Records: ${userCount + orgCount + leadCount + productCount + contactCount + accountCount + opportunityCount}`);
        
        if (userCount === 0) {
            console.log('\n⚠️  WARNING: No users found in database!');
            console.log('   You may need to:');
            console.log('   1. Run seed script: npm run seed');
            console.log('   2. Register a new user via /register endpoint');
            console.log('   3. Check if migrations cleared the data');
        }

        if (orgCount === 0) {
            console.log('\n⚠️  WARNING: No organisations found!');
            console.log('   Users need organisations to log in.');
        }

        console.log('\n✅ Database check complete!');

    } catch (error) {
        console.error('❌ Error checking database:', error);
        console.error('Full error:', (error as Error).message);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabaseData();

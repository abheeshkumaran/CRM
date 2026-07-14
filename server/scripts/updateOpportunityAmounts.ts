/// <reference types="node" />
import prisma from '../src/config/prisma';

/**
 * Script to update opportunity amounts based on account products
 * Run this to fix opportunities that were created with ₹0.00 before the auto-calculation fix
 */

async function updateOpportunityAmounts() {
    console.log('🔍 Finding opportunities with zero amount that have products...\n');

    try {
        // Find all opportunities with amount = 0
        const opportunities = await prisma.opportunity.findMany({
            where: {
                amount: 0,
                isDeleted: false
            },
            include: {
                account: {
                    include: {
                        accountProducts: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            }
        });

        console.log(`Found ${opportunities.length} opportunities with zero amount\n`);

        let updatedCount = 0;
        let skippedCount = 0;

        for (const opp of opportunities) {
            const products = opp.account?.accountProducts || [];

            if (products.length === 0) {
                console.log(`⏭️  Skipping ${opp.name} (${opp.id}) - No products`);
                skippedCount++;
                continue;
            }

            // Calculate total from products
            const calculatedAmount = products.reduce((sum, ap) => {
                return sum + (ap.product.basePrice * ap.quantity);
            }, 0);

            if (calculatedAmount > 0) {
                // Update the opportunity
                await prisma.opportunity.update({
                    where: { id: opp.id },
                    data: { amount: calculatedAmount }
                });

                console.log(`✅ Updated ${opp.name} (${opp.id})`);
                console.log(`   Old Amount: ₹0.00`);
                console.log(`   New Amount: ₹${calculatedAmount.toFixed(2)}`);
                console.log(`   Products: ${products.length}\n`);
                updatedCount++;
            } else {
                console.log(`⏭️  Skipping ${opp.name} (${opp.id}) - Products have zero value`);
                skippedCount++;
            }
        }

        console.log('\n📊 Summary:');
        console.log(`   Total opportunities checked: ${opportunities.length}`);
        console.log(`   Updated: ${updatedCount}`);
        console.log(`   Skipped: ${skippedCount}`);
        console.log('\n✅ Done!');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
updateOpportunityAmounts()
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });

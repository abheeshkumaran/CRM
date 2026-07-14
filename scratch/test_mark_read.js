const { PrismaClient } = require('../server/src/generated/client/index.js');
const prisma = new PrismaClient();

async function main() {
    console.log('--- UNREAD POPUP NOTIFICATIONS ---');
    const notifs = await prisma.notification.findMany({
        where: { type: 'popup', isRead: false },
        take: 5,
        select: {
            id: true,
            title: true,
            message: true,
            recipientId: true,
            isRead: true
        }
    });
    console.dir(notifs);

    if (notifs.length > 0) {
        const testId = notifs[0].id;
        console.log(`\nTesting update (markAsRead) for ID: ${testId}`);
        try {
            const result = await prisma.notification.update({
                where: { id: testId },
                data: { isRead: true }
            });
            console.log('Successfully updated notification:', result);
            
            // Revert it back to false
            await prisma.notification.update({
                where: { id: testId },
                data: { isRead: false }
            });
            console.log('Successfully reverted notification back to unread.');
        } catch (err) {
            console.error('Error updating notification:', err);
        }
    } else {
        console.log('No unread popup notifications found to test.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

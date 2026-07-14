import prisma from '../src/config/prisma';

async function main() {
  const notifs = await prisma.notification.findMany({
    where: {
      type: 'popup',
      isRead: false
    },
    take: 10
  });
  console.log('Unread popup notifications:', JSON.stringify(notifs, null, 2));
}

main().catch(console.error);

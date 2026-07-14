const { PrismaClient } = require('../server/src/generated/client');
const prisma = new PrismaClient();

async function findDuplicates() {
  const users = await prisma.user.findMany({
    select: { userId: true, email: true, id: true }
  });

  const userIdMap = {};
  const duplicates = [];

  for (const user of users) {
    if (user.userId) {
      if (userIdMap[user.userId]) {
        duplicates.push({
          userId: user.userId,
          first: userIdMap[user.userId],
          second: user
        });
      }
      userIdMap[user.userId] = user;
    }
  }

  if (duplicates.length > 0) {
    console.log('Found duplicates:', JSON.stringify(duplicates, null, 2));
  } else {
    console.log('No duplicate userIds found.');
  }

  process.exit(0);
}

findDuplicates();

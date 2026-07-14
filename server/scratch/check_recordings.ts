import prisma from '../src/config/prisma';

async function check() {
  try {
    const recordings = await prisma.callRecording.findMany({
      where: {
        fileUrl: { not: '' }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`Found ${recordings.length} recordings with fileUrl:`);
    for (const rec of recordings) {
      console.log(`ID: ${rec.id}, duration: ${rec.duration}, fileUrl: ${rec.fileUrl}, callType: ${rec.callType}, timestamp: ${rec.timestamp.toISOString()}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();

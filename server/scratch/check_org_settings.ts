import prisma from './src/config/prisma';

async function check() {
  const user = await prisma.user.findFirst({
    where: { email: 'info@prohostix.com' },
    include: { organisation: true }
  });
  
  if (user) {
    console.log('Organisation ID:', user.organisationId);
    console.log('WhatsApp Scraping Enabled:', user.organisation.whatsAppScrapingEnabled);
  } else {
    console.log('User not found');
  }
}

check();

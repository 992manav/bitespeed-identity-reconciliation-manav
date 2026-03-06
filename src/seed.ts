import prisma from './config/database';
import logger from './utils/logger';

async function seed(): Promise<void> {
  try {
    logger.info('Starting database seed...');

    await prisma.contact.deleteMany();
    logger.info('Cleared existing contacts');

    const contact1 = await prisma.contact.create({
      data: {
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        linkPrecedence: 'primary',
      },
    });
    logger.info('Created contact 1', { id: contact1.id });

    const contact2 = await prisma.contact.create({
      data: {
        email: 'john@gmail.com',
        phoneNumber: null,
        linkedId: contact1.id,
        linkPrecedence: 'secondary',
      },
    });
    logger.info('Created contact 2', { id: contact2.id });

    const contact3 = await prisma.contact.create({
      data: {
        email: null,
        phoneNumber: '+9876543210',
        linkedId: contact1.id,
        linkPrecedence: 'secondary',
      },
    });
    logger.info('Created contact 3', { id: contact3.id });

    logger.info('Database seeded successfully');
  } catch (error) {
    logger.error('Seed failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();

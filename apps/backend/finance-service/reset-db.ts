import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDb() {
    try {
        console.log('Starting DB reset...');
        
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE finance."Transaction", finance."Category", finance."GroupMember", identity."User" CASCADE;`);
        
        console.log('Database successfully wiped. Environment is now perfectly clean and isolated.');
    } catch (e) {
        console.error('Failed to wipe DB:', e);
    } finally {
        await prisma.$disconnect();
    }
}

resetDb();

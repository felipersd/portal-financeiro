import { createDatabaseClient } from './src/Infrastructure/Database/createDatabaseClient';

if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DISPOSABLE_DATABASE_RESET !== 'yes') throw new Error('Reset is allowed only for an explicitly disposable database.');
const prisma = createDatabaseClient();

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

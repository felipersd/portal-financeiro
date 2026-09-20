import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
export function createDatabaseClient() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is required');
    const url = new URL(connectionString);
    const schema = url.searchParams.get('schema') || 'public';
    return new PrismaClient({ adapter: new PrismaPg({ connectionString,
        max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 }, { schema }) });
}

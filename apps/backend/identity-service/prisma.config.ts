import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'prisma/config';
const url = process.env.DATABASE_URL || (process.env.DATABASE_URL_FILE ? readFileSync(process.env.DATABASE_URL_FILE, 'utf8').trim() : undefined);
export default defineConfig({ schema: 'prisma/schema.prisma', migrations: { path: 'prisma/migrations' }, datasource: { url } });

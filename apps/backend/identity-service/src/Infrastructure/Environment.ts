import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: process.env.ENV_FILE || '.env.local' });
for (const name of ['DATABASE_URL', 'CLERK_SECRET_KEY', 'CLERK_WEBHOOK_SECRET', 'INTERNAL_API_TOKEN']) {
    const file = process.env[`${name}_FILE`];
    if (file) process.env[name] = readFileSync(file, 'utf8').trim();
}
if (process.env.NODE_ENV === 'production') {
    for (const name of ['DATABASE_URL', 'CLERK_SECRET_KEY', 'CLERK_PUBLISHABLE_KEY', 'INTERNAL_API_TOKEN', 'ALLOWED_ORIGIN']) {
        if (!process.env[name]) throw new Error(`Missing production configuration: ${name}`);
    }
}

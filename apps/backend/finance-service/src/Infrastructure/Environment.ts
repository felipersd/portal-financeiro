import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: process.env.ENV_FILE || '.env.local' });
for (const name of ['DATABASE_URL', 'CLERK_SECRET_KEY', 'INTERNAL_API_TOKEN']) {
    const file = process.env[`${name}_FILE`];
    if (file) process.env[name] = readFileSync(file, 'utf8').trim();
}
if (process.env.VAPID_CONFIG_FILE) {
    const keys = JSON.parse(readFileSync(process.env.VAPID_CONFIG_FILE, 'utf8'));
    if (typeof keys.publicKey !== 'string' || typeof keys.privateKey !== 'string')
        throw new Error('Invalid push configuration');
    process.env.VAPID_PUBLIC_KEY = keys.publicKey;
    process.env.VAPID_PRIVATE_KEY = keys.privateKey;
}
if (Boolean(process.env.VAPID_PUBLIC_KEY) !== Boolean(process.env.VAPID_PRIVATE_KEY))
    throw new Error('Configure both VAPID keys');
if (process.env.NODE_ENV === 'production') {
    for (const name of [
        'DATABASE_URL',
        'CLERK_SECRET_KEY',
        'CLERK_PUBLISHABLE_KEY',
        'INTERNAL_API_TOKEN',
        'ALLOWED_ORIGIN',
    ]) {
        if (!process.env[name]) throw new Error(`Missing production configuration: ${name}`);
    }
}

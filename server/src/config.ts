import dotenv from 'dotenv';

// Load environment variables from .env file if present (for local dev)
dotenv.config();

interface Config {
    port: number;
    databaseUrl: string;
    auth0: {
        domain: string;
        clientId: string;
        clientSecret: string;
        callbackUrl: string;
    };
    sessionSecret: string;
}

const getEnv = (key: string, required: boolean = true): string => {
    const value = process.env[key];
    if (required && !value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value || '';
};

export const config: Config = {
    port: parseInt(process.env.PORT || '3000', 10),
    databaseUrl: getEnv('DATABASE_URL'),
    auth0: {
        domain: getEnv('AUTH0_DOMAIN'),
        clientId: getEnv('AUTH0_CLIENT_ID'),
        clientSecret: getEnv('AUTH0_CLIENT_SECRET'),
        callbackUrl: getEnv('AUTH0_CALLBACK_URL', false) || '/api/auth/callback',
    },
    sessionSecret: getEnv('SESSION_SECRET', false) || 'secret-key-change-me',
};

export const validateConfig = () => {
    // Accessing the properties will trigger the validation in getEnv
    console.log('Configuration validated.');
    console.log(`- Port: ${config.port}`);
    console.log(`- Database URL: ${config.databaseUrl ? 'Set' : 'Missing'}`);
    console.log(`- Auth0 Domain: ${config.auth0.domain}`);
    console.log(`- Auth0 Client ID: ${config.auth0.clientId ? 'Set' : 'Missing'}`);
};

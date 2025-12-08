import passport from 'passport';
import Auth0Strategy from 'passport-auth0';
import dotenv from 'dotenv';

dotenv.config();

export const configurePassport = () => {
    const strategy = new Auth0Strategy(
        {
            domain: process.env.AUTH0_DOMAIN || '',
            clientID: process.env.AUTH0_CLIENT_ID || '',
            clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
            callbackURL: process.env.AUTH0_CALLBACK_URL || 'http://localhost:3001/api/auth/callback', // Will be overridden by controller
        },
        (accessToken: string, refreshToken: string, extraParams: any, profile: any, done: (error: any, user?: any) => void) => {
            // Just pass the profile to the controller callback
            return done(null, profile);
        }
    );

    passport.use(strategy);
};

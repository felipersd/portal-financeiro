import passport from 'passport';
import Auth0Strategy from 'passport-auth0';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

export const configurePassport = () => {
    const strategy = new Auth0Strategy(
        {
            domain: process.env.AUTH0_DOMAIN || '',
            clientID: process.env.AUTH0_CLIENT_ID || '',
            clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
            callbackURL: process.env.AUTH0_CALLBACK_URL || '/api/auth/callback'
        },
        async (accessToken, refreshToken, extraParams, profile, done) => {
            console.log('Auth0 Callback initiated');
            try {
                console.log('Profile received:', JSON.stringify(profile, null, 2));

                const auth0Id = profile.id;
                const email = profile.emails?.[0].value;
                const name = profile.displayName || profile.nickname || 'User';
                const avatar = profile.picture;

                console.log('Extracted data:', { auth0Id, email, name });

                if (!email) {
                    console.error('No email found in profile');
                    return done(new Error('No email found'), undefined);
                }

                // Find or create user
                console.log('Querying DB for user...');
                let user = await prisma.user.findUnique({ where: { auth0Id } });
                console.log('User found:', user);

                if (!user) {
                    // Check if user exists by email (legacy/migration case) or create new
                    console.log('User not found by ID, checking email...');
                    const existingByEmail = await prisma.user.findUnique({ where: { email } });
                    if (existingByEmail) {
                        console.log('User found by email, linking account...');
                        // Link account
                        user = await prisma.user.update({
                            where: { id: existingByEmail.id },
                            data: { auth0Id, avatar }
                        });
                    } else {
                        console.log('Creating new user...');
                        user = await prisma.user.create({
                            data: {
                                auth0Id,
                                email,
                                name,
                                avatar
                            }
                        });
                    }
                } else {
                    // Update info
                    console.log('Updating existing user...');
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { name, avatar }
                    });
                }

                console.log('Auth successful, user:', user);
                return done(null, user);
            } catch (err) {
                console.error('Auth Error:', err);
                return done(err, undefined);
            }
        }
    );

    passport.use(strategy);
};

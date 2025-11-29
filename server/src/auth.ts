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
                // console.log('Profile received:', JSON.stringify(profile, null, 2));

                const auth0Id = profile.id;
                const email = profile.emails?.[0].value;
                const profileAny = profile as any;
                const name = profile.displayName || profileAny.nickname || 'User';
                const avatar = profileAny.picture;

                // console.log('Extracted data:', { auth0Id, email, name });

                if (!email) {
                    console.error('No email found in profile');
                    return done(new Error('No email found'), undefined);
                }

                // Find or create user
                // console.log('Querying DB for user...');
                let user = await prisma.user.findUnique({ where: { auth0Id } });
                // console.log('User found:', user);

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
                    // console.log('Updating existing user...');
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { name, avatar }
                    });
                }

                // --- SEED DEFAULT CATEGORIES IF NONE EXIST ---
                const categoryCount = await prisma.category.count({
                    where: { userId: user.id }
                });

                if (categoryCount === 0) {
                    console.log('User has 0 categories. Seeding defaults...');
                    const defaultCategories = [
                        // Income
                        { name: 'Salário', type: 'income' },
                        { name: 'Investimentos', type: 'income' },
                        { name: 'Outros', type: 'income' },
                        // Expense
                        { name: 'Alimentação', type: 'expense' },
                        { name: 'Moradia', type: 'expense' },
                        { name: 'Transporte', type: 'expense' },
                        { name: 'Lazer', type: 'expense' },
                        { name: 'Saúde', type: 'expense' },
                        { name: 'Educação', type: 'expense' },
                        { name: 'Contas Fixas', type: 'expense' },
                        { name: 'Compras', type: 'expense' },
                    ];

                    await prisma.category.createMany({
                        data: defaultCategories.map(c => ({
                            ...c,
                            userId: user.id
                        }))
                    });
                    console.log('Default categories created.');
                }
                // ---------------------------------------------

                // console.log('Auth successful, user:', user);
                return done(null, user);
            } catch (err) {
                console.error('Auth Error:', err);
                return done(err, undefined);
            }
        }
    );

    passport.use(strategy);
};

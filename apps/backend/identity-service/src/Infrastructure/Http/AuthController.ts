import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { GetOrCreateUser } from '../../Application/UseCases/GetOrCreateUser';
import { UserRepository } from '../../Domain/Interfaces/UserRepository';
import { Logger } from '../Logger';

export class AuthController {
    constructor(
        private getOrCreateUser: GetOrCreateUser,
        private userRepository: UserRepository
    ) { }

    login(req: Request, res: Response, next: NextFunction) {
        const callbackURL = process.env.AUTH0_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/auth/callback`;
        Logger.info('Initiating login flow', { callbackURL, headers: req.headers });

        passport.authenticate('auth0', {
            scope: 'openid email profile',
            callbackURL: callbackURL,
        } as any)(req, res, next);
    }

    callback(req: Request, res: Response, next: NextFunction) {
        const callbackURL = process.env.AUTH0_CALLBACK_URL || `${req.protocol}://${req.get('host')}/api/auth/callback`;
        Logger.info('Processing auth callback', { callbackURL });

        passport.authenticate('auth0', {
            session: false,
            callbackURL: callbackURL,
        } as any, async (err: any, user: any, info: any) => {
            if (err) {
                Logger.error('Auth0 authentication error', err);
                return next(err);
            }
            if (!user) {
                Logger.warn('No user returned from Auth0', { info });
                return res.redirect('/');
            }

            try {
                Logger.info('User authenticated, creating local session', { auth0Id: user.id, email: user.emails?.[0]?.value });

                const dbUser = await this.getOrCreateUser.execute({
                    auth0Id: user.id,
                    email: user.emails[0].value,
                    name: user.displayName || user.nickname || 'User',
                    avatar: user.picture,
                });

                const token = jwt.sign(
                    { sub: dbUser.id, email: dbUser.email },
                    process.env.JWT_SECRET || 'default_secret',
                    { expiresIn: '7d' }
                );

                res.cookie('access_token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                    path: '/',
                });

                // Redirect to root (relative) to support any domain
                res.redirect('/');
            } catch (error) {
                Logger.error('Error creating user session', error);
                next(error);
            }
        })(req, res, next);
    }

    logout(req: Request, res: Response) {
        Logger.info('User logging out');
        res.clearCookie('access_token');
        // Construct returnTo dynamically based on the current host
        const returnTo = `${req.protocol}://${req.get('host')}`;
        const clientId = process.env.AUTH0_CLIENT_ID;
        const domain = process.env.AUTH0_DOMAIN;

        if (domain && clientId) {
            res.redirect(`https://${domain}/v2/logout?client_id=${clientId}&returnTo=${returnTo}`);
        } else {
            res.redirect('/');
        }
    }

    async me(req: Request, res: Response) {
        if ((req as any).user) {
            const userId = (req as any).user.sub;
            try {
                const user = await this.userRepository.findById(userId);
                if (user) {
                    res.json(user);
                } else {
                    Logger.warn('User found in token but not in DB', { userId });
                    res.status(404).json({ message: 'User not found' });
                }
            } catch (error) {
                Logger.error('Error fetching current user profile', error, { userId });
                res.status(500).json({ message: 'Internal server error' });
            }
        } else {
            res.status(401).json({ message: 'Not authenticated' });
        }
    }
}

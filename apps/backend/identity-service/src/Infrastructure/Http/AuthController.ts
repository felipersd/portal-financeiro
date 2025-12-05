import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { GetOrCreateUser } from '../../Application/UseCases/GetOrCreateUser';
import { UserRepository } from '../../Domain/Interfaces/UserRepository';

export class AuthController {
    constructor(
        private getOrCreateUser: GetOrCreateUser,
        private userRepository: UserRepository
    ) { }

    login(req: Request, res: Response, next: NextFunction) {
        passport.authenticate('auth0', {
            scope: 'openid email profile',
        })(req, res, next);
    }

    callback(req: Request, res: Response, next: NextFunction) {
        passport.authenticate('auth0', { session: false }, async (err: any, user: any, info: any) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                return res.redirect('/');
            }

            try {
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

                res.redirect('/');
            } catch (error) {
                next(error);
            }
        })(req, res, next);
    }

    logout(req: Request, res: Response) {
        res.clearCookie('access_token');
        const returnTo = process.env.AUTH0_LOGOUT_URL || 'http://localhost:8080';
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
                    res.status(404).json({ message: 'User not found' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Internal server error' });
            }
        } else {
            res.status(401).json({ message: 'Not authenticated' });
        }
    }
}

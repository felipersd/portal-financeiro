import { AuthController } from './AuthController';
import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { Logger } from '../Logger';

// Mocks
jest.mock('passport');
jest.mock('jsonwebtoken');
jest.mock('../Logger');

describe('AuthController', () => {
    let authController: AuthController;
    let mockGetOrCreateUser: any;
    let mockUserRepository: any;
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        mockGetOrCreateUser = { execute: jest.fn() };
        mockUserRepository = { findById: jest.fn() };
        authController = new AuthController(mockGetOrCreateUser, mockUserRepository);

        req = {
            protocol: 'http',
            get: jest.fn().mockReturnValue('localhost:8080'),
            headers: {}
        };
        res = {
            redirect: jest.fn(),
            cookie: jest.fn(),
            clearCookie: jest.fn(),
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('login', () => {
        it('should use AUTH0_CALLBACK_URL if present', () => {
            process.env.AUTH0_CALLBACK_URL = 'http://env-url/callback';
            (passport.authenticate as jest.Mock).mockReturnValue(jest.fn());

            authController.login(req as Request, res as Response, next);

            expect(passport.authenticate).toHaveBeenCalledWith('auth0', expect.objectContaining({
                callbackURL: 'http://env-url/callback'
            }));
            expect(Logger.info).toHaveBeenCalledWith('Initiating login flow', expect.anything());
        });

        it('should fallback to dynamic URL if env var missing', () => {
            delete process.env.AUTH0_CALLBACK_URL;
            (passport.authenticate as jest.Mock).mockReturnValue(jest.fn());

            authController.login(req as Request, res as Response, next);

            expect(passport.authenticate).toHaveBeenCalledWith('auth0', expect.objectContaining({
                callbackURL: 'http://localhost:8080/api/auth/callback'
            }));
        });
    });

    describe('callback', () => {
        it('should redirect to / if no user returned', () => {
            (passport.authenticate as jest.Mock).mockImplementation((strategy, options, callback) => {
                return (req: Request, res: Response, next: NextFunction) => {
                    callback(null, false, { message: 'No user' });
                };
            });

            authController.callback(req as Request, res as Response, next);

            expect(res.redirect).toHaveBeenCalledWith('/');
            expect(Logger.warn).toHaveBeenCalledWith('No user returned from Auth0', expect.anything());
        });

        it('should create user and set cookie on success', async () => {
            const mockAuth0User = { id: 'auth0|123', emails: [{ value: 'test@example.com' }], picture: 'pic.jpg' };
            const mockDbUser = { id: '1', email: 'test@example.com' };

            (passport.authenticate as jest.Mock).mockImplementation((strategy, options, callback) => {
                return (req: Request, res: Response, next: NextFunction) => {
                    callback(null, mockAuth0User, {});
                };
            });
            mockGetOrCreateUser.execute.mockResolvedValue(mockDbUser);
            (jwt.sign as jest.Mock).mockReturnValue('mock-token');

            await authController.callback(req as Request, res as Response, next);

            expect(mockGetOrCreateUser.execute).toHaveBeenCalledWith({
                auth0Id: 'auth0|123',
                email: 'test@example.com',
                name: 'User',
                avatar: 'pic.jpg'
            });
            expect(res.cookie).toHaveBeenCalledWith('access_token', 'mock-token', expect.anything());
            expect(res.redirect).toHaveBeenCalledWith('/');
            expect(Logger.info).toHaveBeenCalledWith('User authenticated, creating local session', expect.anything());
        });

        it('should handle errors during user creation', async () => {
            const mockAuth0User = { id: 'auth0|123', emails: [{ value: 'test@example.com' }] };
            (passport.authenticate as jest.Mock).mockImplementation((strategy, options, callback) => {
                return (req: Request, res: Response, next: NextFunction) => {
                    callback(null, mockAuth0User, {});
                };
            });
            mockGetOrCreateUser.execute.mockRejectedValue(new Error('DB Error'));

            await authController.callback(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith('Error creating user session', expect.anything());
            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });

        it('should handle auth0 error', () => {
            (passport.authenticate as jest.Mock).mockImplementation((strategy, options, callback) => {
                return (req: Request, res: Response, next: NextFunction) => {
                    callback(new Error('Auth0 Fail'), null, null);
                };
            });

            authController.callback(req as Request, res as Response, next);

            expect(Logger.error).toHaveBeenCalledWith('Auth0 authentication error', expect.anything());
            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('logout', () => {
        it('should clear cookie and redirect to auth0 logout', () => {
            process.env.AUTH0_DOMAIN = 'test.auth0.com';
            process.env.AUTH0_CLIENT_ID = 'client123';

            authController.logout(req as Request, res as Response);

            expect(res.clearCookie).toHaveBeenCalledWith('access_token');
            expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('https://test.auth0.com/v2/logout?client_id=client123'));
        });

        it('should redirect to root if env vars missing', () => {
            delete process.env.AUTH0_DOMAIN;

            authController.logout(req as Request, res as Response);

            expect(res.redirect).toHaveBeenCalledWith('/');
        });
    });

    describe('me', () => {
        it('should return 401 if no user in request', async () => {
            (req as any).user = undefined;
            await authController.me(req as Request, res as Response);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
        });

        it('should return user config if found', async () => {
            (req as any).user = { sub: '1' };
            mockUserRepository.findById.mockResolvedValue({ id: '1', name: 'Test' });

            await authController.me(req as Request, res as Response);

            expect(res.json).toHaveBeenCalledWith({ id: '1', name: 'Test' });
        });

        it('should return 404 if user not found in DB', async () => {
            (req as any).user = { sub: '1' };
            mockUserRepository.findById.mockResolvedValue(null);

            await authController.me(req as Request, res as Response);

            expect(Logger.warn).toHaveBeenCalledWith('User found in token but not in DB', { userId: '1' });
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return 500 on repository error', async () => {
            (req as any).user = { sub: '1' };
            mockUserRepository.findById.mockRejectedValue(new Error('DB Fail'));

            await authController.me(req as Request, res as Response);

            expect(Logger.error).toHaveBeenCalledWith('Error fetching current user profile', expect.anything(), expect.anything());
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});

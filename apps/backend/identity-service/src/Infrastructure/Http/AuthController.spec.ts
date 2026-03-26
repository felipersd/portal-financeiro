import { AuthController } from './AuthController';
import { Request, Response } from 'express';
import { Logger } from '../Logger';

jest.mock('../Logger');
jest.mock('@clerk/clerk-sdk-node', () => ({
    createClerkClient: () => ({
        users: {
            getUser: jest.fn()
        }
    })
}));

describe('AuthController', () => {
    let authController: AuthController;
    let mockGetOrCreateUser: any;
    let mockUserRepository: any;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        mockGetOrCreateUser = { execute: jest.fn() };
        mockUserRepository = { findByProviderId: jest.fn() };
        authController = new AuthController(mockGetOrCreateUser, mockUserRepository);

        req = {
            headers: {}
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('me', () => {
        it('should return 401 if no user in request auth', async () => {
            (req as any).auth = undefined;
            await authController.me(req as Request, res as Response);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
        });

        it('should return user from DB if found', async () => {
            (req as any).auth = { userId: 'clerk_123' };
            mockUserRepository.findByProviderId.mockResolvedValue({ id: '1', name: 'Test' });

            await authController.me(req as Request, res as Response);

            expect(mockUserRepository.findByProviderId).toHaveBeenCalledWith('clerk', 'clerk_123');
            expect(res.json).toHaveBeenCalledWith({ id: '1', name: 'Test' });
        });

        it('should return 500 on repository error', async () => {
            (req as any).auth = { userId: 'clerk_123' };
            mockUserRepository.findByProviderId.mockRejectedValue(new Error('DB Fail'));

            await authController.me(req as Request, res as Response);

            expect(Logger.error).toHaveBeenCalledWith('Error fetching current user profile', expect.anything(), expect.anything());
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});

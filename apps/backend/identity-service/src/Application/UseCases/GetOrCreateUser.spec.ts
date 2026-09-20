import { GetOrCreateUser } from './GetOrCreateUser';
import { User } from '../../Domain/Entities/User';

describe('GetOrCreateUser', () => {
    let useCase: GetOrCreateUser;
    let mockUserRepository: any;

    beforeEach(() => {
        jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
        mockUserRepository = {
            findByProviderId: jest.fn(),
            findByEmail: jest.fn(),
            create: jest.fn(),
            linkIdentity: jest.fn(),
        };
        useCase = new GetOrCreateUser(mockUserRepository);
    });

    afterEach(() => jest.restoreAllMocks());

    it('should return existing user if found by provider', async () => {
        const existingUser = new User('1', 'test@example.com', 'Test', null, new Date());
        mockUserRepository.findByProviderId.mockResolvedValue(existingUser);

        const result = await useCase.execute({
            provider: 'clerk',
            providerId: 'clerk_1',
            email: 'test@example.com',
            name: 'Test',
            avatar: null
        });

        expect(result).toBe(existingUser);
        expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
        expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('does not link a different account merely because it reuses an email', async () => {
        mockUserRepository.findByProviderId.mockResolvedValue(null);
        mockUserRepository.findByEmail.mockResolvedValue(new User('1', 'test@example.com', 'Test', null, new Date()));
        await expect(useCase.execute({ provider: 'clerk', providerId: 'different-clerk-user',
            email: 'test@example.com', name: 'New Person', avatar: null })).rejects.toThrow('IDENTITY_LINK_REQUIRED');
        expect(mockUserRepository.linkIdentity).not.toHaveBeenCalled();
        expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
    it('should create new user if not found by provider or email', async () => {
        mockUserRepository.findByProviderId.mockResolvedValue(null);
        mockUserRepository.findByEmail.mockResolvedValue(null);

        const result = await useCase.execute({
            provider: 'clerk',
            providerId: 'clerk_new',
            email: 'new@example.com',
            name: 'New',
            avatar: null
        });

        expect(result).toBeInstanceOf(User);
        expect(result.email).toBe('new@example.com');
        expect(mockUserRepository.create).toHaveBeenCalledWith(result, 'clerk', 'clerk_new');
    });
});

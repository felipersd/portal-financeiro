import { GetOrCreateUser } from './GetOrCreateUser';
import { User } from '../../Domain/Entities/User';

describe('GetOrCreateUser', () => {
    let useCase: GetOrCreateUser;
    let mockUserRepository: any;

    beforeEach(() => {
        mockUserRepository = {
            findByProviderId: jest.fn(),
            findByEmail: jest.fn(),
            create: jest.fn(),
            linkIdentity: jest.fn(),
        };
        useCase = new GetOrCreateUser(mockUserRepository);
    });

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

    it('should link identity and return user if found by email but not by provider', async () => {
        const existingUser = new User('1', 'test@example.com', 'Test', null, new Date());
        mockUserRepository.findByProviderId.mockResolvedValue(null);
        mockUserRepository.findByEmail.mockResolvedValue(existingUser);

        const result = await useCase.execute({
            provider: 'clerk',
            providerId: 'clerk_1',
            email: 'test@example.com',
            name: 'Test',
            avatar: null
        });

        expect(result).toBe(existingUser);
        expect(mockUserRepository.linkIdentity).toHaveBeenCalledWith('1', 'clerk', 'clerk_1');
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

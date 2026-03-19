import { GetOrCreateUser } from './GetOrCreateUser';
import { User } from '../../Domain/Entities/User';

describe('GetOrCreateUser', () => {
    let useCase: GetOrCreateUser;
    let mockUserRepository: any;

    beforeEach(() => {
        mockUserRepository = {
            findByClerkId: jest.fn(),
            create: jest.fn()
        };
        useCase = new GetOrCreateUser(mockUserRepository);
    });

    it('should return existing user if found', async () => {
        const existingUser = new User('1', 'clerk_1', 'test@example.com', 'Test', null, new Date());
        mockUserRepository.findByClerkId.mockResolvedValue(existingUser);

        const result = await useCase.execute({
            clerkId: 'clerk_1',
            email: 'test@example.com',
            name: 'Test',
            avatar: null
        });

        expect(result).toBe(existingUser);
        expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should create new user if not found', async () => {
        mockUserRepository.findByClerkId.mockResolvedValue(null);

        const result = await useCase.execute({
            clerkId: 'clerk_new',
            email: 'new@example.com',
            name: 'New',
            avatar: null
        });

        expect(result).toBeInstanceOf(User);
        expect(result.clerkId).toBe('clerk_new');
        expect(mockUserRepository.create).toHaveBeenCalledWith(result);
    });
});

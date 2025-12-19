import { GetOrCreateUser } from './GetOrCreateUser';
import { User } from '../../Domain/Entities/User';

describe('GetOrCreateUser', () => {
    let useCase: GetOrCreateUser;
    let mockUserRepository: any;

    beforeEach(() => {
        mockUserRepository = {
            findByAuth0Id: jest.fn(),
            create: jest.fn()
        };
        useCase = new GetOrCreateUser(mockUserRepository);
    });

    it('should return existing user if found', async () => {
        const existingUser = new User('1', 'auth0|1', 'test@example.com', 'Test', null, new Date());
        mockUserRepository.findByAuth0Id.mockResolvedValue(existingUser);

        const result = await useCase.execute({
            auth0Id: 'auth0|1',
            email: 'test@example.com',
            name: 'Test',
            avatar: null
        });

        expect(result).toBe(existingUser);
        expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should create new user if not found', async () => {
        mockUserRepository.findByAuth0Id.mockResolvedValue(null);

        const result = await useCase.execute({
            auth0Id: 'auth0|new',
            email: 'new@example.com',
            name: 'New',
            avatar: null
        });

        expect(result).toBeInstanceOf(User);
        expect(result.auth0Id).toBe('auth0|new');
        expect(mockUserRepository.create).toHaveBeenCalledWith(result);
    });
});

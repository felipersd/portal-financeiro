import { DeleteUserAccount } from './DeleteUserAccount';

describe('Account cleanup retries', () => {
    afterEach(() => jest.restoreAllMocks());
    it('preserves identity if financial cleanup fails, permitting webhook retry', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 503 } as Response);
        const repository = { findByProviderId: jest.fn().mockResolvedValue({ id: 'user-1' }), deleteUserAndIdentities: jest.fn() };
        await expect(new DeleteUserAccount(repository as any).execute('clerk', 'clerk-1')).rejects.toThrow();
        expect(repository.deleteUserAndIdentities).not.toHaveBeenCalled();
    });
    it('deletes identity only after finance confirms cleanup', async () => {
        const repository = { findByProviderId: jest.fn().mockResolvedValue({ id: 'user-1' }), deleteUserAndIdentities: jest.fn() };
        jest.spyOn(global, 'fetch').mockImplementation(async () => {
            expect(repository.deleteUserAndIdentities).not.toHaveBeenCalled();
            return { ok: true } as Response;
        });
        await new DeleteUserAccount(repository as any).execute('clerk', 'clerk-1');
        expect(repository.deleteUserAndIdentities).toHaveBeenCalledWith('user-1');
    });
});

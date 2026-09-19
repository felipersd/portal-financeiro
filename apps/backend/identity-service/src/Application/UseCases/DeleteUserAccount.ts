import { UserRepository } from '../../Domain/Interfaces/UserRepository';

export class DeleteUserAccount {
    constructor(private userRepository: UserRepository) {}

    async execute(provider: string, providerId: string): Promise<void> {
        const user = await this.userRepository.findByProviderId(provider, providerId);
        
        if (!user) {
            console.log(`[DeleteUserAccount] User ${providerId} not found locally. Noting to delete.`);
            return;
        }

        const localId = user.id;

        // Preserve the local identity until finance confirms cleanup, so webhook retries work.
        try {
            const financeHost = process.env.FINANCE_SERVICE_HOST || 'finance-service';
            const financePort = process.env.FINANCE_SERVICE_PORT || '3002';
            
            const response = await fetch(`http://${financeHost}:${financePort}/internal/users/${localId}/delete`, {
                method: 'DELETE',
                headers: { 'X-Internal-Token': process.env.INTERNAL_API_TOKEN || '' },
                signal: AbortSignal.timeout(10000),
            });
            
            if (!response.ok) {
                throw new Error(`Finance cleanup failed: ${response.status}`);
            } else {
                console.log(`[DeleteUserAccount] Finance Service confirmed deletion for user: ${localId}`);
            }
        } catch (error) {
            console.error('[DeleteUserAccount] Failed to communicate with Finance Service for deletion:', error);
            throw error;
        }
        await this.userRepository.deleteUserAndIdentities(localId);
    }
}

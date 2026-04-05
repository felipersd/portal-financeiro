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

        // 1. Delete user locally
        await this.userRepository.deleteUserAndIdentities(localId);

        // 2. Trigger Finance Service to CASCADE delete all financial data
        try {
            const financeHost = process.env.FINANCE_SERVICE_HOST || 'finance-service';
            const financePort = process.env.FINANCE_SERVICE_PORT || '3002';
            
            const response = await fetch(`http://${financeHost}:${financePort}/internal/users/${localId}/delete`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                console.error(`[DeleteUserAccount] Finance Service delete failed with status: ${response.status}`);
            } else {
                console.log(`[DeleteUserAccount] Finance Service confirmed deletion for user: ${localId}`);
            }
        } catch (error) {
            console.error('[DeleteUserAccount] Failed to communicate with Finance Service for deletion:', error);
            // Non-blocking but logged for manual retry
        }
    }
}

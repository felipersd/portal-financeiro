import { User } from '../../Domain/Entities/User';
import { UserRepository } from '../../Domain/Interfaces/UserRepository';
import { v4 as uuidv4 } from 'uuid';

export class GetOrCreateUser {
    constructor(private userRepository: UserRepository) { }

    async execute(data: { provider: string; providerId: string; email: string; name: string; avatar: string | null }): Promise<User> {
        let user = await this.userRepository.findByProviderId(data.provider, data.providerId);
        
        if (!user) {
            user = await this.userRepository.findByEmail(data.email);
            
            if (user) {
                await this.userRepository.linkIdentity(user.id, data.provider, data.providerId);
            } else {
                user = new User(uuidv4(), data.email, data.name, data.avatar, new Date());
                await this.userRepository.create(user, data.provider, data.providerId);
                
                // Triggers Data Seeding on Finance Service (Internal Call)
                try {
                    // Try reaching finance-service via Docker internal network
                    const financeHost = process.env.FINANCE_SERVICE_HOST || 'finance-service';
                    const financePort = process.env.FINANCE_SERVICE_PORT || '3002';
                    const response = await fetch(`http://${financeHost}:${financePort}/internal/users/${user.id}/seed`, {
                        method: 'POST',
                    });
                    if (!response.ok) {
                        console.error('[GetOrCreateUser] Finance Service seed returned non-200 status:', response.status);
                    } else {
                        console.log(`[GetOrCreateUser] Successfully seeded default categories for new user: ${user.id}`);
                    }
                } catch (error) {
                    console.error('[GetOrCreateUser] Failed to communicate with Finance Service for seeding:', error);
                    // Do not block user creation if seeding fails
                }
            }
        }
        return user;
    }
}

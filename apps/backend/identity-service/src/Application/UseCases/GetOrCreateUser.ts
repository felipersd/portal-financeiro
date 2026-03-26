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
            }
        }
        return user;
    }
}

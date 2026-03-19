import { User } from '../../Domain/Entities/User';
import { UserRepository } from '../../Domain/Interfaces/UserRepository';
import { v4 as uuidv4 } from 'uuid';

export class GetOrCreateUser {
    constructor(private userRepository: UserRepository) { }

    async execute(data: { clerkId: string; email: string; name: string; avatar: string | null }): Promise<User> {
        let user = await this.userRepository.findByClerkId(data.clerkId);
        if (!user) {
            user = new User(uuidv4(), data.clerkId, data.email, data.name, data.avatar, new Date());
            await this.userRepository.create(user);
        }
        return user;
    }
}

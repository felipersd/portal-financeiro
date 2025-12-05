import { User } from '../../Domain/Entities/User';
import { UserRepository } from '../../Domain/Interfaces/UserRepository';
import { v4 as uuidv4 } from 'uuid';

export class GetOrCreateUser {
    constructor(private userRepository: UserRepository) { }

    async execute(data: { auth0Id: string; email: string; name: string; avatar: string | null }): Promise<User> {
        let user = await this.userRepository.findByAuth0Id(data.auth0Id);
        if (!user) {
            user = new User(uuidv4(), data.auth0Id, data.email, data.name, data.avatar, new Date());
            await this.userRepository.create(user);
        }
        return user;
    }
}

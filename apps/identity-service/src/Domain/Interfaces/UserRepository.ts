import { User } from '../Entities/User';

export interface UserRepository {
    findByAuth0Id(auth0Id: string): Promise<User | null>;
    create(user: User): Promise<User>;
    findById(id: string): Promise<User | null>;
}

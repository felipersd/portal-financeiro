import { User } from '../Entities/User';

export interface UserRepository {
    findByClerkId(clerkId: string): Promise<User | null>;
    create(user: User): Promise<User>;
    findById(id: string): Promise<User | null>;
}

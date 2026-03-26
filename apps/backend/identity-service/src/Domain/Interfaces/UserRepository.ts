import { User } from '../Entities/User';

export interface UserRepository {
    findByProviderId(provider: string, providerId: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    create(user: User, provider?: string, providerId?: string): Promise<User>;
    linkIdentity(userId: string, provider: string, providerId: string): Promise<void>;
    findById(id: string): Promise<User | null>;
}

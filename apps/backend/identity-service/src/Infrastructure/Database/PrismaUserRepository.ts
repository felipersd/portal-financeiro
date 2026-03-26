import { PrismaClient } from '@prisma/client';
import { User } from '../../Domain/Entities/User';
import { UserRepository } from '../../Domain/Interfaces/UserRepository';

export class PrismaUserRepository implements UserRepository {
    constructor(private prisma: PrismaClient) { }

    async findByProviderId(provider: string, providerId: string): Promise<User | null> {
        const data = await this.prisma.user.findFirst({
            where: {
                identities: {
                    some: { provider, providerId }
                }
            }
        });
        if (!data) return null;
        return new User(data.id, data.email, data.name, data.avatar, data.createdAt);
    }

    async findByEmail(email: string): Promise<User | null> {
        const data = await this.prisma.user.findUnique({
            where: { email }
        });
        if (!data) return null;
        return new User(data.id, data.email, data.name, data.avatar, data.createdAt);
    }

    async create(user: User, provider?: string, providerId?: string): Promise<User> {
        const createData: any = {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            createdAt: user.createdAt,
        };

        if (provider && providerId) {
            createData.identities = {
                create: [{ provider, providerId }]
            };
        }

        const data = await this.prisma.user.create({
            data: createData,
        });
        return new User(data.id, data.email, data.name, data.avatar, data.createdAt);
    }

    async linkIdentity(userId: string, provider: string, providerId: string): Promise<void> {
        await this.prisma.userIdentity.create({
            data: {
                userId,
                provider,
                providerId
            }
        });
    }

    async findById(id: string): Promise<User | null> {
        const data = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!data) return null;
        return new User(data.id, data.email, data.name, data.avatar, data.createdAt);
    }
}

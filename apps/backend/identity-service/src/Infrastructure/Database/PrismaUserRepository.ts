import { PrismaClient } from '@prisma/client';
import { User } from '../../Domain/Entities/User';
import { UserRepository } from '../../Domain/Interfaces/UserRepository';

export class PrismaUserRepository implements UserRepository {
    constructor(private prisma: PrismaClient) { }

    async findByClerkId(clerkId: string): Promise<User | null> {
        const data = await this.prisma.user.findUnique({
            where: { clerkId },
        });
        if (!data) return null;
        return new User(data.id, data.clerkId, data.email, data.name, data.avatar, data.createdAt);
    }

    async create(user: User): Promise<User> {
        const data = await this.prisma.user.create({
            data: {
                id: user.id,
                clerkId: user.clerkId,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                createdAt: user.createdAt,
            },
        });
        return new User(data.id, data.clerkId, data.email, data.name, data.avatar, data.createdAt);
    }

    async findById(id: string): Promise<User | null> {
        const data = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!data) return null;
        return new User(data.id, data.clerkId, data.email, data.name, data.avatar, data.createdAt);
    }
}

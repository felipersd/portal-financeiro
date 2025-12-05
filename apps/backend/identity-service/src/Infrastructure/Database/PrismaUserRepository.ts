import { PrismaClient } from '@prisma/client';
import { User } from '../../Domain/Entities/User';
import { UserRepository } from '../../Domain/Interfaces/UserRepository';

export class PrismaUserRepository implements UserRepository {
    constructor(private prisma: PrismaClient) { }

    async findByAuth0Id(auth0Id: string): Promise<User | null> {
        const data = await this.prisma.user.findUnique({
            where: { auth0Id },
        });
        if (!data) return null;
        return new User(data.id, data.auth0Id, data.email, data.name, data.avatar, data.createdAt);
    }

    async create(user: User): Promise<User> {
        const data = await this.prisma.user.create({
            data: {
                id: user.id,
                auth0Id: user.auth0Id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                createdAt: user.createdAt,
            },
        });
        return new User(data.id, data.auth0Id, data.email, data.name, data.avatar, data.createdAt);
    }

    async findById(id: string): Promise<User | null> {
        const data = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!data) return null;
        return new User(data.id, data.auth0Id, data.email, data.name, data.avatar, data.createdAt);
    }
}

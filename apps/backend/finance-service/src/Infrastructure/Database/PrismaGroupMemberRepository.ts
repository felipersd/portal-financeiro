import { PrismaClient } from '@prisma/client';
import { GroupMember } from '../../Domain/Entities/GroupMember';
import { GroupMemberRepository } from '../../Domain/Interfaces/GroupMemberRepository';

export class PrismaGroupMemberRepository implements GroupMemberRepository {
    constructor(private prisma: PrismaClient) { }

    async create(member: GroupMember): Promise<GroupMember> {
        const data = await this.prisma.groupMember.create({
            data: {
                id: member.id,
                name: member.name,
                surname: member.surname,
                email: member.email,
                category: member.category,
                userId: member.userId,
                createdAt: member.createdAt,
            },
        });
        return new GroupMember(data.id, data.name, data.surname, data.email, data.category, data.userId, data.createdAt);
    }

    async findByUserId(userId: string): Promise<GroupMember[]> {
        const data = await this.prisma.groupMember.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });
        return data.map(d => new GroupMember(d.id, d.name, d.surname, d.email, d.category, d.userId, d.createdAt));
    }

    async findById(id: string): Promise<GroupMember | null> {
        const data = await this.prisma.groupMember.findUnique({
            where: { id },
        });
        if (!data) return null;
        return new GroupMember(data.id, data.name, data.surname, data.email, data.category, data.userId, data.createdAt);
    }

    async update(member: GroupMember): Promise<GroupMember> {
        const data = await this.prisma.groupMember.update({
            where: { id: member.id },
            data: {
                name: member.name,
                surname: member.surname,
                email: member.email,
                category: member.category,
            },
        });
        return new GroupMember(data.id, data.name, data.surname, data.email, data.category, data.userId, data.createdAt);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.groupMember.delete({
            where: { id },
        });
    }
}

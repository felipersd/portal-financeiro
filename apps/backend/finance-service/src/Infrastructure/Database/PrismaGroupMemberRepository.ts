import { PrismaClient } from '@prisma/client';
import { GroupMember } from '../../Domain/Entities/GroupMember';
import { GroupMemberRepository } from '../../Domain/Interfaces/GroupMemberRepository';
import { FinanceError } from '../../Domain/FinanceError';
import { atomic } from './atomic';
export class PrismaGroupMemberRepository implements GroupMemberRepository {
    constructor(private prisma: PrismaClient) {}
    async create(member: GroupMember): Promise<GroupMember> {
        return atomic(this.prisma, async tx => {
            if (await tx.groupMember.count({ where: { userId: member.userId } }) >= 10) throw new FinanceError(400, 'Limite de 10 membros atingido.');
            return tx.groupMember.create({ data: member });
        });
    }
    async findByUserId(userId: string): Promise<GroupMember[]> {
        return this.prisma.groupMember.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    }
    async findById(id: string): Promise<GroupMember | null> {
        return this.prisma.groupMember.findUnique({ where: { id } });
    }
    async update(member: GroupMember): Promise<GroupMember> {
        return atomic(this.prisma, async tx => {
            const current = await tx.groupMember.findUnique({ where: { id: member.id }, include: { connection: true } });
            if (!current || current.userId !== member.userId) throw new FinanceError(404, 'Membro não encontrado.');
            if (current.connection && current.email !== member.email) throw new FinanceError(409, 'O e-mail de um membro convidado não pode ser trocado. Adicione outro membro para outra pessoa.');
            return tx.groupMember.update({ where: { id: member.id }, data: { name: member.name, surname: member.surname,
                email: member.email, category: member.category } });
        });
    }
    async delete(id: string): Promise<void> {
        await atomic(this.prisma, async tx => {
            const member = await tx.groupMember.findUnique({ where: { id }, include: { connection: true } });
            if (!member) throw new FinanceError(404, 'Membro não encontrado.');
            if (member.connection && ['pending', 'accepted'].includes(member.connection.status)) throw new FinanceError(409, 'Encerre o vínculo antes de remover este membro.');
            const used = await tx.transaction.count({ where: { userId: member.userId, OR: [{ payer: id }, { splits: { some: { memberId: id } } }] } });
            if (used) throw new FinanceError(409, 'Este membro possui lançamentos. Preserve-o para manter o histórico correto.');
            await tx.groupMember.delete({ where: { id } });
        });
    }
}

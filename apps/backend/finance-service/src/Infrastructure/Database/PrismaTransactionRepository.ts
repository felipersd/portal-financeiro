import { Prisma, PrismaClient, Transaction as Row } from '@prisma/client';
import { Transaction } from '../../Domain/Entities/Transaction';
import { TransactionRepository } from '../../Domain/Interfaces/TransactionRepository';
import { FinanceError } from '../../Domain/FinanceError';
import { atomic } from './atomic';

const entity = (d: Row) => new Transaction(d.id, d.description, d.amount, d.type as 'income' | 'expense',
    d.category, d.date, d.isShared, d.payer, d.userId, d.createdAt, d.recurrenceId, d.splitDetails, d.isFixed);
const fields = (t: Transaction) => ({ description: t.description, amount: t.amount, type: t.type,
    category: t.category, date: t.date, isShared: t.isShared, isFixed: t.isFixed, payer: t.payer,
    recurrenceId: t.recurrenceId, splitDetails: t.splitDetails ?? Prisma.DbNull });

async function validateMembers(tx: Prisma.TransactionClient, t: Transaction) {
    const ids = new Set<string>((t.splitDetails?.splits || []).map((s: { memberId: string }) => s.memberId));
    ids.add(t.payer); ids.delete('me');
    if (ids.size && await tx.groupMember.count({ where: { userId: t.userId, id: { in: [...ids] } } }) !== ids.size) {
        throw new FinanceError(400, 'Selecione apenas membros da sua lista.');
    }
}
async function requireEditable(tx: Prisma.TransactionClient, ids: string[]) {
    if (await tx.expenseShare.count({ where: { transactionId: { in: ids }, status: { in: ['pending', 'accepted'] } } })) {
        throw new FinanceError(409, 'Esta conta possui compartilhamento pendente ou aceito. Cancele os pendentes antes de editar; valores aceitos são preservados.');
    }
}

export class PrismaTransactionRepository implements TransactionRepository {
    constructor(private prisma: PrismaClient) {}
    async create(t: Transaction) { await this.createMany([t]); return t; }
    async createMany(transactions: Transaction[]) {
        await atomic(this.prisma, async tx => {
            if (transactions.length) await validateMembers(tx, transactions[0]);
            await tx.transaction.createMany({ data: transactions.map(t => ({ ...fields(t), id: t.id, userId: t.userId, createdAt: t.createdAt })) });
        });
    }
    async findByUserId(userId: string, year?: number): Promise<Transaction[]> {
        const date = year ? { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } : undefined;
        const [owned, received] = await Promise.all([
            this.prisma.transaction.findMany({ where: { userId, date }, orderBy: { date: 'desc' } }),
            this.prisma.expenseShare.findMany({ where: { recipientId: userId, status: 'accepted', date }, orderBy: { date: 'desc' } }),
        ]);
        const incoming = received.map(s => Object.assign(new Transaction(`share:${s.id}`, s.description,
            s.amountCents / 100, 'expense', 'Compartilhadas', s.date, false, 'me', userId, s.createdAt),
            { readOnly: true, sharedFromName: s.ownerName, receivedShareId: s.id }));
        return [...owned.map(entity), ...incoming].sort((a, b) => b.date.getTime() - a.date.getTime());
    }
    async findById(id: string) {
        const row = await this.prisma.transaction.findUnique({ where: { id } });
        return row ? entity(row) : null;
    }
    async findFutureByRecurrenceId(recurrenceId: string, fromDate: Date, userId: string) {
        return (await this.prisma.transaction.findMany({ where: { recurrenceId, userId, date: { gte: fromDate } }, orderBy: { date: 'asc' } })).map(entity);
    }
    async update(t: Transaction) { await this.updateMany([t]); return t; }
    async updateMany(transactions: Transaction[]) {
        await atomic(this.prisma, async tx => {
            await requireEditable(tx, transactions.map(t => t.id));
            if (transactions.length) await validateMembers(tx, transactions[0]);
            for (const t of transactions) {
                const result = await tx.transaction.updateMany({ where: { id: t.id, userId: t.userId }, data: fields(t) });
                if (!result.count) throw new FinanceError(404, 'Conta não encontrada.');
            }
        });
    }
    async delete(id: string) {
        await atomic(this.prisma, async tx => {
            await requireEditable(tx, [id]);
            await tx.transaction.delete({ where: { id } });
        });
    }
}

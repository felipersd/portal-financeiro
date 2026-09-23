import { Prisma, PrismaClient } from '@prisma/client';
import { Transaction } from '../../Domain/Entities/Transaction';
import { TransactionRepository } from '../../Domain/Interfaces/TransactionRepository';
import { FinanceError } from '../../Domain/FinanceError';
import { atomic } from './atomic';
export const transactionInclude = { categoryRef: true, splits: true, shares: true } as const;
type Loaded = Prisma.TransactionGetPayload<{ include: typeof transactionInclude }>;
export const transactionEntity = (d: Loaded) => Object.assign(new Transaction(d.id, d.description, Number(d.amount), d.type as 'income' | 'expense',
    d.categoryRef?.name || d.category, d.date, d.isShared, d.payer, d.userId, d.createdAt, d.recurrenceId,
    d.isShared ? { splits: d.splits.map(s => ({ memberId: s.participantKey, amount: s.amountCents / 100 })) } : undefined,
    d.isFixed, d.categoryId || undefined), { sharedWith: d.shares.map(s => ({ memberId: s.memberId, status: s.status })), settlements: d.shares.filter(s => s.status === 'accepted').map(s => ({ memberId: s.memberId, paidAmount: s.paidCents / 100 })) });
const splitRows = (t: Transaction): Array<{participantKey: string; memberId: string | null; amountCents: number}> => (t.isShared ? t.splitDetails?.splits || [] : []).map((s: { memberId: string; amount: number }) =>
    ({ participantKey: s.memberId, memberId: s.memberId === 'me' ? null : s.memberId, amountCents: Math.round(s.amount * 100) }));
async function categoryFor(tx: Prisma.TransactionClient, t: Transaction) {
    const category = await tx.category.findFirst({ where: { userId: t.userId, type: t.type,
        ...(t.categoryId ? { id: t.categoryId } : { name: t.category }) }, orderBy: { id: 'asc' } });
    if (category) return category.id;
    if (t.categoryId) throw new FinanceError(400, 'Categoria inválida para esta conta.');
    // Compatibility with existing clients that send category names.
    if (await tx.category.count({ where: { userId: t.userId } }) >= 200) throw new FinanceError(400, 'Limite de categorias atingido.');
    return (await tx.category.create({ data: { name: t.category, type: t.type, userId: t.userId } })).id;
}
const fields = (t: Transaction) => ({ description: t.description, amount: new Prisma.Decimal(t.amount.toFixed(2)), type: t.type,
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
            for (const t of transactions) {
                await validateMembers(tx, t);
                const categoryId = await categoryFor(tx, t);
                if (t.isFixed && t.recurrenceId) {
                    if (await tx.fixedRule.count({where:{userId:t.userId,endMonth:null}})>=100) throw new FinanceError(400,'Limite de 100 recorrências ativas atingido.');
                    await tx.fixedRule.create({data:{id:t.recurrenceId,userId:t.userId,anchorDate:t.date,anchorDay:t.date.getUTCDate()}});
                }
                await tx.transaction.create({ data: { ...fields(t), categoryId, id: t.id, userId: t.userId,
                    createdAt: t.createdAt, ...(t.isFixed && t.recurrenceId ? {fixedRuleId:t.recurrenceId,occurrenceMonth:t.date.toISOString().slice(0,7)} : {}), splits: { create: splitRows(t) } } });
            }
        });
    }
    async findByUserId(userId: string, year?: number): Promise<Transaction[]> {
        const date = year ? { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } : undefined;
        const [owned, received] = await Promise.all([
            this.prisma.transaction.findMany({ include: transactionInclude, where: { userId, date, deletedAt:null }, orderBy: { date: 'desc' } }),
            this.prisma.expenseShare.findMany({ where: { recipientId: userId, status: 'accepted', date }, orderBy: { date: 'desc' } }),
        ]);
        const incoming = received.map(s => Object.assign(new Transaction(`share:${s.id}`, s.description,
            s.amountCents / 100, 'expense', 'Compartilhadas', s.date, false, 'me', userId, s.createdAt),
            { readOnly: true, sharedFromName: s.ownerName, receivedShareId: s.id }));
        return [...owned.map(transactionEntity), ...incoming].sort((a, b) => b.date.getTime() - a.date.getTime());
    }
    async findById(id: string) {
        const row = await this.prisma.transaction.findUnique({ where: { id }, include: transactionInclude });
        return row && !row.deletedAt ? transactionEntity(row) : null;
    }
    async findFutureByRecurrenceId(recurrenceId: string, fromDate: Date, userId: string) {
        return (await this.prisma.transaction.findMany({ include: transactionInclude, where: { recurrenceId, userId, date: { gte: fromDate } }, orderBy: { date: 'asc' } } )).map(transactionEntity);
    }
    async update(t: Transaction) { await this.updateMany([t]); return t; }
    async updateMany(transactions: Transaction[]) {
        await atomic(this.prisma, async tx => {
            for (const id of [...new Set(transactions.filter(t=>t.isFixed && t.recurrenceId).map(t=>t.recurrenceId!))].sort()) {
                await tx.fixedRule.updateMany({where:{id},data:{updatedAt:new Date()}});
            }
            const changes = [...transactions];
            const first = transactions[0];
            if (first?.isFixed && first.recurrenceId) {
                const latest = await tx.transaction.findMany({where:{userId:first.userId,fixedRuleId:first.recurrenceId,date:{gte:first.date}}});
                for (const row of latest) if (!changes.some(t=>t.id===row.id)) changes.push({...first,id:row.id,date:row.date,createdAt:row.createdAt});
            }
            await requireEditable(tx, changes.map(t => t.id));
            for (const t of changes) {
                await validateMembers(tx, t);
                const categoryId = await categoryFor(tx, t);
                const result = await tx.transaction.updateMany({ where: { id: t.id, userId: t.userId }, data: { ...fields(t), categoryId } });
                if (!result.count) throw new FinanceError(404, 'Conta não encontrada.');
                await tx.transactionSplit.deleteMany({ where: { transactionId: t.id } });
                if (t.isShared) await tx.transactionSplit.createMany({ data: splitRows(t).map(s => ({ ...s, transactionId: t.id })) });
            }
        });
    }
    async delete(id: string) {
        await atomic(this.prisma, async tx => {
            await requireEditable(tx, [id]);
            const row = await tx.transaction.findUniqueOrThrow({where:{id}});
            if (row.fixedRuleId) {
                await tx.fixedRule.update({where:{id:row.fixedRuleId},data:{updatedAt:new Date()}});
                await tx.transaction.update({where:{id},data:{deletedAt:new Date()}});
            } else await tx.transaction.delete({ where: { id } });
        });
    }
}

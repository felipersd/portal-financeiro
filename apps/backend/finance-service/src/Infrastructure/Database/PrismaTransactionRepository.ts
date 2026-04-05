import { PrismaClient } from '@prisma/client';
import { Transaction } from '../../Domain/Entities/Transaction';
import { TransactionRepository } from '../../Domain/Interfaces/TransactionRepository';

export class PrismaTransactionRepository implements TransactionRepository {
    constructor(private prisma: PrismaClient) { }

    async create(transaction: Transaction): Promise<Transaction> {
        const data = await this.prisma.transaction.create({
            data: {
                id: transaction.id,
                description: transaction.description,
                amount: transaction.amount,
                type: transaction.type,
                category: transaction.category,
                date: transaction.date,
                isShared: transaction.isShared,
                isFixed: transaction.isFixed,
                payer: transaction.payer,
                userId: transaction.userId,
                createdAt: transaction.createdAt,
                recurrenceId: transaction.recurrenceId,
                splitDetails: transaction.splitDetails,
            },
        });
        return new Transaction(
            data.id,
            data.description,
            data.amount,
            data.type as 'income' | 'expense',
            data.category,
            data.date,
            data.isShared,
            data.payer as 'me' | 'spouse',
            data.userId,
            data.createdAt,
            data.recurrenceId,
            data.splitDetails,
            data.isFixed
        );
    }

    async findByUserId(userId: string, year?: number): Promise<Transaction[]> {
        const whereClause: any = { userId };
        
        if (year) {
            whereClause.date = {
                gte: new Date(year, 0, 1),
                lte: new Date(year, 11, 31, 23, 59, 59, 999)
            };
        }

        const transactions = await this.prisma.transaction.findMany({
            where: whereClause,
            orderBy: { date: 'desc' },
        });
        return transactions.map(
            (data: any) =>
                new Transaction(
                    data.id,
                    data.description,
                    data.amount,
                    data.type as 'income' | 'expense',
                    data.category,
                    data.date,
                    data.isShared,
                    data.payer as 'me' | 'spouse',
                    data.userId,
                    data.createdAt,
                    data.recurrenceId,
                    data.splitDetails,
                    data.isFixed
                )
        );
    }
    async findById(id: string): Promise<Transaction | null> {
        const data = await this.prisma.transaction.findUnique({
            where: { id },
        });
        if (!data) return null;
        return new Transaction(
            data.id,
            data.description,
            data.amount,
            data.type as 'income' | 'expense',
            data.category,
            data.date,
            data.isShared,
            data.payer as 'me' | 'spouse',
            data.userId,
            data.createdAt,
            data.recurrenceId,
            data.splitDetails,
            data.isFixed
        );
    }

    async update(transaction: Transaction): Promise<Transaction> {
        const data = await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: {
                description: transaction.description,
                amount: transaction.amount,
                type: transaction.type,
                category: transaction.category,
                date: transaction.date,
                isShared: transaction.isShared,
                isFixed: transaction.isFixed,
                payer: transaction.payer,
                recurrenceId: transaction.recurrenceId,
                splitDetails: transaction.splitDetails,
            },
        });
        return new Transaction(
            data.id,
            data.description,
            data.amount,
            data.type as 'income' | 'expense',
            data.category,
            data.date,
            data.isShared,
            data.payer as 'me' | 'spouse',
            data.userId,
            data.createdAt,
            data.recurrenceId,
            data.splitDetails,
            data.isFixed
        );
    }

    async findFutureByRecurrenceId(recurrenceId: string, fromDate: Date): Promise<Transaction[]> {
        const transactions = await this.prisma.transaction.findMany({
            where: { recurrenceId, date: { gte: fromDate } },
            orderBy: { date: 'asc' },
        });
        return transactions.map((data: any) => new Transaction(
            data.id,
            data.description,
            data.amount,
            data.type as 'income' | 'expense',
            data.category,
            data.date,
            data.isShared,
            data.payer as 'me' | 'spouse',
            data.userId,
            data.createdAt,
            data.recurrenceId,
            data.splitDetails,
            data.isFixed
        ));
    }

    async updateMany(transactions: Transaction[]): Promise<void> {
        await this.prisma.$transaction(
            transactions.map(t => this.prisma.transaction.update({
                where: { id: t.id },
                data: {
                    description: t.description,
                    amount: t.amount,
                    type: t.type,
                    category: t.category,
                    date: t.date,
                    isShared: t.isShared,
                    isFixed: t.isFixed,
                    payer: t.payer,
                    splitDetails: t.splitDetails,
                }
            }))
        );
    }

    async delete(id: string): Promise<void> {
        await this.prisma.transaction.delete({
            where: { id },
        });
    }
}

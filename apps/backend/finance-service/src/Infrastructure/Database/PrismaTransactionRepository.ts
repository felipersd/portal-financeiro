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
            data.splitDetails
        );
    }

    async findByUserId(userId: string): Promise<Transaction[]> {
        const transactions = await this.prisma.transaction.findMany({
            where: { userId },
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
                    data.splitDetails
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
            data.splitDetails
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
            data.splitDetails
        );
    }

    async delete(id: string): Promise<void> {
        await this.prisma.transaction.delete({
            where: { id },
        });
    }
}

import { Transaction } from '../../Domain/Entities/Transaction';
import { TransactionRepository } from '../../Domain/Interfaces/TransactionRepository';
import { randomUUID as uuidv4 } from 'crypto';

export class CreateTransaction {
    constructor(private transactionRepository: TransactionRepository) { }

    async execute(data: {
        description: string;
        amount: number;
        type: 'income' | 'expense';
        category: string;
        categoryId?: string;
        date: Date;
        isShared: boolean;
        payer: string;
        userId: string;
        recurrenceId?: string | null;
        splitDetails?: any | null;
        installments?: number;
        isFixed?: boolean;
        frequency?: 'monthly' | 'weekly' | 'yearly' | 'daily' | 'fixed';
    }): Promise<Transaction> {
        const frequency = data.frequency || 'monthly';
        const isFixed = data.isFixed || frequency === 'fixed';
        const installments = isFixed ? 1 : (data.installments || 1);

        // If installments > 1, generate a recurrenceId if not provided
        const recurrenceId = ((installments > 1 || isFixed) && !data.recurrenceId) ? uuidv4() : data.recurrenceId;

        if (!Number.isInteger(installments) || installments < 1 || installments > 120) throw new Error('Invalid installment count');
        const transactions: Transaction[] = [];

        for (let i = 0; i < installments; i++) {
            const transactionDate = new Date(data.date);

            if (i > 0) {
                if (frequency === 'monthly' || frequency === 'fixed') {
                    const day = transactionDate.getUTCDate();
                    transactionDate.setUTCDate(1);
                    transactionDate.setUTCMonth(transactionDate.getUTCMonth() + i);
                    const lastDay = new Date(Date.UTC(transactionDate.getUTCFullYear(), transactionDate.getUTCMonth() + 1, 0)).getUTCDate();
                    transactionDate.setUTCDate(Math.min(day, lastDay));
                } else if (frequency === 'weekly') {
                    transactionDate.setUTCDate(transactionDate.getUTCDate() + (i * 7));
                } else if (frequency === 'daily') {
                    transactionDate.setUTCDate(transactionDate.getUTCDate() + i);
                } else if (frequency === 'yearly') {
                    const month = transactionDate.getUTCMonth();
                    transactionDate.setUTCFullYear(transactionDate.getUTCFullYear() + i);
                    if (transactionDate.getUTCMonth() !== month) transactionDate.setUTCDate(0);
                }
            }

            const description = (!isFixed && installments > 1)
                ? `${data.description} (${i + 1}/${installments})`
                : data.description;

            const transaction = new Transaction(
                uuidv4(),
                description,
                data.amount,
                data.type,
                data.category,
                transactionDate,
                data.isShared,
                data.payer,
                data.userId,
                new Date(),
                recurrenceId,
                data.splitDetails,
                isFixed, data.categoryId
            );

            transactions.push(transaction);
        }

        await this.transactionRepository.createMany(transactions);
        return transactions[0];
    }
}

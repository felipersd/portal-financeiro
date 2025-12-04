import { Transaction } from '../../Domain/Entities/Transaction';
import { TransactionRepository } from '../../Domain/Interfaces/TransactionRepository';
import { v4 as uuidv4 } from 'uuid';

export class CreateTransaction {
    constructor(private transactionRepository: TransactionRepository) { }

    async execute(data: {
        description: string;
        amount: number;
        type: 'income' | 'expense';
        category: string;
        date: Date;
        isShared: boolean;
        payer: 'me' | 'spouse';
        userId: string;
        recurrenceId?: string | null;
        splitDetails?: any | null;
        installments?: number;
        frequency?: 'monthly' | 'weekly' | 'yearly';
    }): Promise<Transaction> {
        const installments = data.installments || 1;
        const frequency = data.frequency || 'monthly';

        // If installments > 1, generate a recurrenceId if not provided
        const recurrenceId = (installments > 1 && !data.recurrenceId) ? uuidv4() : data.recurrenceId;

        let firstTransaction: Transaction | null = null;

        for (let i = 0; i < installments; i++) {
            const transactionDate = new Date(data.date);

            if (i > 0) {
                if (frequency === 'monthly') {
                    transactionDate.setMonth(transactionDate.getMonth() + i);
                } else if (frequency === 'weekly') {
                    transactionDate.setDate(transactionDate.getDate() + (i * 7));
                } else if (frequency === 'yearly') {
                    transactionDate.setFullYear(transactionDate.getFullYear() + i);
                }
            }

            const description = installments > 1
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
                data.splitDetails
            );

            const created = await this.transactionRepository.create(transaction);
            if (i === 0) {
                firstTransaction = created;
            }
        }

        return firstTransaction!;
    }
}

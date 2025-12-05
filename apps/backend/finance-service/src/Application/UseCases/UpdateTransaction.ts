import { Transaction } from '../../Domain/Entities/Transaction';
import { TransactionRepository } from '../../Domain/Interfaces/TransactionRepository';

export class UpdateTransaction {
    constructor(private transactionRepository: TransactionRepository) { }

    async execute(id: string, data: {
        description: string;
        amount: number;
        type: 'income' | 'expense';
        category: string;
        date: Date;
        isShared: boolean;
        payer: 'me' | 'spouse';
        userId: string;
        splitDetails?: any | null;
    }): Promise<Transaction> {
        const transaction = await this.transactionRepository.findById(id);
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        if (transaction.userId !== data.userId) {
            throw new Error('Unauthorized');
        }

        // Create a new instance with updated values (or update the existing one)
        // Since entities are usually immutable-ish, we create a new one or update properties
        // Here we just construct a new one with the same ID and CreatedAt
        const updatedTransaction = new Transaction(
            id,
            data.description,
            data.amount,
            data.type,
            data.category,
            data.date,
            data.isShared,
            data.payer,
            data.userId,
            transaction.createdAt,
            transaction.recurrenceId,
            data.splitDetails
        );

        return this.transactionRepository.update(updatedTransaction);
    }
}

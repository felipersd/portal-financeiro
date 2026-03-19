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
        payer: string;
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
            data.splitDetails,
            transaction.isFixed
        );

        const saved = await this.transactionRepository.update(updatedTransaction);
        
        if (transaction.isFixed && transaction.recurrenceId) {
            const futures = await this.transactionRepository.findFutureByRecurrenceId(transaction.recurrenceId, transaction.date);
            const toUpdate = futures.filter(f => f.id !== transaction.id).map(f => {
                return new Transaction(
                    f.id,
                    data.description,
                    data.amount,
                    data.type,
                    data.category,
                    f.date,
                    data.isShared,
                    data.payer,
                    f.userId,
                    f.createdAt,
                    f.recurrenceId,
                    data.splitDetails,
                    f.isFixed
                );
            });
            if (toUpdate.length > 0) {
                await this.transactionRepository.updateMany(toUpdate);
            }
        }

        return saved;
    }
}

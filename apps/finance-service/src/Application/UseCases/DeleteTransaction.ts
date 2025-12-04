import { TransactionRepository } from '../../Domain/Interfaces/TransactionRepository';

export class DeleteTransaction {
    constructor(private transactionRepository: TransactionRepository) { }

    async execute(id: string, userId: string): Promise<void> {
        const transaction = await this.transactionRepository.findById(id);
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        if (transaction.userId !== userId) {
            throw new Error('Unauthorized');
        }

        await this.transactionRepository.delete(id);
    }
}

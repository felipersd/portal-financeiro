import { Transaction } from '../../Domain/Entities/Transaction';
import { TransactionRepository } from '../../Domain/Interfaces/TransactionRepository';

export class GetTransactions {
    constructor(private transactionRepository: TransactionRepository) { }

    async execute(userId: string, year?: number): Promise<Transaction[]> {
        return this.transactionRepository.findByUserId(userId, year);
    }
}

import { Transaction } from '../Entities/Transaction';

export interface TransactionRepository {
    create(transaction: Transaction): Promise<Transaction>;
    findByUserId(userId: string): Promise<Transaction[]>;
    findById(id: string): Promise<Transaction | null>;
    update(transaction: Transaction): Promise<Transaction>;
    delete(id: string): Promise<void>;
}

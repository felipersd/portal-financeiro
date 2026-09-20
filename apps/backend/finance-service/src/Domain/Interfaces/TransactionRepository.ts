import { Transaction } from '../Entities/Transaction';

export interface TransactionRepository {
    create(transaction: Transaction): Promise<Transaction>;
    createMany(transactions: Transaction[]): Promise<void>;
    findByUserId(userId: string, year?: number): Promise<Transaction[]>;
    findById(id: string): Promise<Transaction | null>;
    update(transaction: Transaction): Promise<Transaction>;
    delete(id: string): Promise<void>;
    findFutureByRecurrenceId(recurrenceId: string, fromDate: Date, userId: string): Promise<Transaction[]>;
    updateMany(transactions: Transaction[]): Promise<void>;
}

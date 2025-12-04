export interface Category {
    id: string;
    name: string;
    type: 'income' | 'expense';
}

export type Payer = 'me' | 'spouse';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: TransactionType;
    category: string; // We store the category name or ID
    date: string;
    isShared: boolean;
    payer: Payer;
    recurrenceId?: string;
    createdAt: string;
    splitDetails?: {
        mode: 'equal' | 'custom';
        myShare: number;
        spouseShare: number;
    };
}

export interface FinanceSummary {
    totalIncome: number;
    totalSpent: number;
    currentBalance: number; // Income - Expenses
    netBalance: number; // Couple settlement
    mePaidShared: number;
    spousePaidShared: number;
    hasSharedTransactions: boolean;
}

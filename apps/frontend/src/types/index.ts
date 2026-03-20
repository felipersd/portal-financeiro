export interface Category {
    id: string;
    name: string;
    type: 'income' | 'expense';
}

export type Payer = string;

export interface GroupMember {
    id: string;
    name: string;
    surname: string | null;
    email: string | null;
    category: string;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: TransactionType;
    category: string; // We store the category name or ID
    date: string;
    isShared: boolean;
    isFixed?: boolean;
    payer: string;
    userId: string;
    recurrenceId?: string;
    createdAt: string;
    splitDetails?: {
        splits: Array<{ memberId: string; amount: number }>;
    };
}

export interface FinanceSummary {
    totalIncome: number;
    totalSpent: number;
    currentBalance: number; // Income - Expenses
    netBalance: number; // Couple settlement
    memberBalances: Record<string, number>;
    hasSharedTransactions: boolean;
}

export interface User {
    id: string;
    name: string;
    email: string;
    avatar: string;
}

export interface BudgetRule {
    id: string;
    userId: string;
    month: string;
    needsPct: number;
    wantsPct: number;
    savingsPct: number;
    mapping: Record<string, 'needs' | 'wants' | 'savings'>;
}

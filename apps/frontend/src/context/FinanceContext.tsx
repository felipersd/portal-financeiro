import { createContext, useContext } from 'react';
import type { Transaction, FinanceSummary, Category, User, GroupMember, BudgetRule } from '../types';

interface FinanceContextType {
    user: User | null;
    transactions: Transaction[]; // All transactions (for annual charts)
    filteredTransactions: Transaction[]; // Filtered by selected month
    categories: Category[];
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    addTransaction: (t: Omit<Transaction, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
    updateTransaction: (id: string, t: Partial<Transaction>) => Promise<void>;
    removeTransaction: (id: string) => Promise<void>;
    addCategory: (name: string, type: 'income' | 'expense') => Promise<void>;
    updateCategory: (id: string, name: string, type: 'income' | 'expense') => Promise<void>;
    removeCategory: (id: string) => Promise<void>;
    members: GroupMember[];
    addMember: (name: string, surname: string | undefined, email: string | undefined, category: string) => Promise<void>;
    updateMember: (id: string, name: string, surname: string | undefined, email: string | undefined, category: string) => Promise<void>;
    removeMember: (id: string) => Promise<void>;
    budgetRule: BudgetRule | null;
    fetchBudgetRule: (month: string) => Promise<void>;
    updateBudgetRule: (month: string, data: Partial<BudgetRule>) => Promise<void>;
    getSummary: () => FinanceSummary;
    logout: () => void;
}

export const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (!context) {
        throw new Error('useFinance must be used within a FinanceProvider');
    }
    return context;
};

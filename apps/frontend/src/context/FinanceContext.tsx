import { createContext, useContext } from 'react';
import type { Transaction, FinanceSummary, Category, User, GroupMember, BudgetRule, SharingState } from '../types';

interface FinanceContextType {
    user: User | null;
    transactions: Transaction[]; // All transactions (for annual charts)
    filteredTransactions: Transaction[]; // Filtered by selected month
    categories: Category[];
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    addTransaction: (t: Omit<Transaction, 'id' | 'userId' | 'createdAt'>) => Promise<boolean>;
    updateTransaction: (id: string, t: Partial<Transaction>) => Promise<boolean>;
    removeTransaction: (id: string) => Promise<boolean>;
    addCategory: (name: string, type: 'income' | 'expense') => Promise<boolean>;
    updateCategory: (id: string, name: string, type: 'income' | 'expense') => Promise<boolean>;
    removeCategory: (id: string) => Promise<boolean>;
    members: GroupMember[];
    addMember: (name: string, surname: string | undefined, email: string | undefined, category: string) => Promise<boolean>;
    updateMember: (id: string, name: string, surname: string | undefined, email: string | undefined, category: string) => Promise<boolean>;
    removeMember: (id: string) => Promise<boolean>;
    budgetRule: BudgetRule | null;
    fetchBudgetRule: (month: string) => Promise<boolean>;
    updateBudgetRule: (month: string, data: Partial<BudgetRule>) => Promise<boolean>;
    getSummary: () => FinanceSummary;
    sharing: SharingState;
    sharingError: string | null;
    isProcessing: boolean;
    inviteMember: (id: string) => Promise<boolean>;
    decideConnection: (id: string, action: 'accept' | 'decline' | 'revoke') => Promise<boolean>;
    shareExpense: (transactionId: string, memberId: string) => Promise<boolean>;
    decideShare: (id: string, action: 'accept' | 'decline' | 'cancel') => Promise<boolean>;
    refreshSharing: () => void;
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

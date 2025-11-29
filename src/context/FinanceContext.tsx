import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Transaction, FinanceSummary, Category } from '../types';
import { Login } from '../components/Login';

interface User {
    id: string;
    name: string;
    email: string;
    avatar: string;
}

interface FinanceContextType {
    user: User | null;
    transactions: Transaction[]; // All transactions (for annual charts)
    filteredTransactions: Transaction[]; // Filtered by selected month
    categories: Category[];
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    addTransaction: (t: any) => Promise<void>;
    updateTransaction: (id: string, t: any) => Promise<void>;
    removeTransaction: (id: string) => Promise<void>;
    addCategory: (name: string, type: 'income' | 'expense') => Promise<void>;
    removeCategory: (id: string) => Promise<void>;
    getSummary: () => FinanceSummary;
    logout: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Use relative path for proxy
    const API_URL = '/api';

    const checkAuth = async () => {
        try {
            const res = await fetch(`${API_URL}/auth/me`);
            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
                fetchTransactions();
                fetchCategories();
            }
        } catch (error) {
            console.error('Not authenticated');
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            const res = await fetch(`${API_URL}/transactions`);
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_URL}/categories`);
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    // Filter transactions by selected Month/Year
    const filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === selectedDate.getMonth() &&
            tDate.getFullYear() === selectedDate.getFullYear();
    });

    const addTransaction = async (t: any) => {
        try {
            await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(t)
            });
            await fetchTransactions();
        } catch (error) {
            console.error('Error adding transaction:', error);
        }
    };

    const updateTransaction = async (id: string, t: any) => {
        try {
            await fetch(`${API_URL}/transactions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(t)
            });
            await fetchTransactions();
        } catch (error) {
            console.error('Error updating transaction:', error);
        }
    };

    const removeTransaction = async (id: string) => {
        try {
            await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error('Error deleting transaction:', error);
        }
    };

    const addCategory = async (name: string, type: 'income' | 'expense') => {
        try {
            const res = await fetch(`${API_URL}/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, type })
            });
            const newCat = await res.json();
            setCategories(prev => [...prev, newCat]);
        } catch (error) {
            console.error('Error adding category:', error);
        }
    };

    const removeCategory = async (id: string) => {
        try {
            await fetch(`${API_URL}/categories/${id}`, { method: 'DELETE' });
            setCategories(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    const logout = () => {
        window.location.href = `${API_URL}/auth/logout`;
    };

    const getSummary = () => {
        // Summary uses FILTERED transactions
        const totalIncome = filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + t.amount, 0);

        const totalSpent = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => {
                const amount = t.isShared ? t.amount / 2 : t.amount;
                return acc + amount;
            }, 0);

        const currentBalance = totalIncome - totalSpent;

        let mePaidShared = 0;
        let spousePaidShared = 0;

        filteredTransactions.filter(t => t.isShared && t.type === 'expense').forEach(t => {
            if (t.payer === 'me') {
                mePaidShared += t.amount;
            } else {
                spousePaidShared += t.amount;
            }
        });

        const spouseOwesMe = mePaidShared / 2;
        const meOwesSpouse = spousePaidShared / 2;
        const netBalance = spouseOwesMe - meOwesSpouse;

        return {
            totalIncome,
            totalSpent,
            currentBalance,
            netBalance,
            mePaidShared,
            spousePaidShared,
            hasSharedTransactions: filteredTransactions.some(t => t.isShared)
        };
    };

    if (loading) {
        return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>Carregando...</div>;
    }

    if (!user) {
        return <Login />;
    }

    return (
        <FinanceContext.Provider value={{
            user, transactions, filteredTransactions, categories,
            selectedDate, setSelectedDate,
            addTransaction, updateTransaction, removeTransaction,
            addCategory, removeCategory,
            getSummary, logout
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (!context) {
        throw new Error('useFinance must be used within a FinanceProvider');
    }
    return context;
};

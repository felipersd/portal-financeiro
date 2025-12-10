import React, { useState, useEffect } from 'react';
import { FinanceContext } from './FinanceContext';
import { Login } from '../components/Login';
import type { User, Transaction, Category } from '../types';

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Use environment variable or relative path
    const API_URL = '/api';

    const fetchTransactions = React.useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/transactions`);
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
        }
    }, [API_URL]);

    const fetchCategories = React.useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/categories`);
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }, [API_URL]);

    const checkAuth = React.useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
            if (res.ok) {
                const userData = await res.json();
                setUser(userData);
                fetchTransactions();
                fetchCategories();
            } else if (res.status === 401) {
                // Normal state for unauthenticated user
                setUser(null);
            } else {
                console.error('Auth check failed:', res.status, res.statusText);
            }
        } catch (error) {
            console.error('Network error checking auth:', error);
        } finally {
            setLoading(false);
        }
    }, [API_URL, fetchTransactions, fetchCategories]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Filter transactions by selected Month/Year
    const filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === selectedDate.getMonth() &&
            tDate.getFullYear() === selectedDate.getFullYear();
    });

    const addTransaction = async (t: Omit<Transaction, 'id' | 'userId'>) => {
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

    const updateTransaction = async (id: string, t: Partial<Transaction>) => {
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

    const updateCategory = async (id: string, name: string, type: 'income' | 'expense') => {
        try {
            const res = await fetch(`${API_URL}/categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, type })
            });
            if (res.ok) {
                const updatedCat = await res.json();
                setCategories(prev => prev.map(c => c.id === id ? updatedCat : c));
            }
        } catch (error) {
            console.error('Error updating category:', error);
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
                let amount = t.amount;
                if (t.isShared) {
                    if (t.splitDetails && t.splitDetails.mode === 'custom') {
                        amount = t.splitDetails.myShare;
                    } else {
                        amount = t.amount / 2;
                    }
                }
                return acc + amount;
            }, 0);

        const currentBalance = totalIncome - totalSpent;

        let mePaidShared = 0;
        let spousePaidShared = 0;

        filteredTransactions.filter(t => t.isShared && t.type === 'expense').forEach(t => {
            // If I paid
            if (t.payer === 'me') {
                mePaidShared += t.amount;
            } else {
                spousePaidShared += t.amount;
            }
        });

        // Calculate who owes whom based on SHARES, not just 50/50
        let spouseOwesMe = 0;
        let meOwesSpouse = 0;

        filteredTransactions.filter(t => t.isShared && t.type === 'expense').forEach(t => {
            const myShare = (t.splitDetails && t.splitDetails.mode === 'custom')
                ? t.splitDetails.myShare
                : t.amount / 2;

            const spouseShare = (t.splitDetails && t.splitDetails.mode === 'custom')
                ? t.splitDetails.spouseShare
                : t.amount / 2;

            if (t.payer === 'me') {
                // I paid everything, so spouse owes me their share
                spouseOwesMe += spouseShare;
            } else {
                // Spouse paid everything, so I owe spouse my share
                meOwesSpouse += myShare;
            }
        });

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
            addCategory, updateCategory, removeCategory,
            getSummary, logout
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

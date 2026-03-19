import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { FinanceContext } from './FinanceContext';
import { Login } from '../components/Login';
import type { User, Transaction, Category, GroupMember } from '../types';

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
    const { getToken, signOut } = useAuth();

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const API_URL = import.meta.env.VITE_API_URL || '/api';

    const authFetch = React.useCallback(async (url: string, options: RequestInit = {}) => {
        const token = await getToken();
        if (token) {
            options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        }
        return fetch(url, options);
    }, [getToken]);

    const fetchTransactions = React.useCallback(async () => {
        try {
            const res = await authFetch(`${API_URL}/transactions`);
            if (res.ok) setTransactions(await res.json());
        } catch (error) { console.error(error); }
    }, [API_URL, authFetch]);

    const fetchCategories = React.useCallback(async () => {
        try {
            const res = await authFetch(`${API_URL}/categories`);
            if (res.ok) setCategories(await res.json());
        } catch (error) { console.error(error); }
    }, [API_URL, authFetch]);

    const fetchMembers = React.useCallback(async () => {
        try {
            const res = await authFetch(`${API_URL}/members`);
            if (res.ok) setMembers(await res.json());
        } catch (error) { console.error(error); }
    }, [API_URL, authFetch]);

    const checkAuth = React.useCallback(async () => {
        try {
            const res = await authFetch(`${API_URL}/auth/me`);
            if (res.ok) {
                setUser(await res.json());
                fetchTransactions();
                fetchCategories();
                fetchMembers();
            } else if (res.status === 401) {
                setUser(null);
            }
        } catch (error) {
            console.error('Network error checking auth:', error);
        } finally {
            setLoading(false);
        }
    }, [API_URL, fetchTransactions, fetchCategories, fetchMembers, authFetch]);

    useEffect(() => {
        if (isClerkLoaded) {
            if (clerkUser) checkAuth();
            else { setUser(null); setLoading(false); }
        }
    }, [isClerkLoaded, clerkUser, checkAuth]);

    const filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === selectedDate.getMonth() && tDate.getFullYear() === selectedDate.getFullYear();
    });

    const addTransaction = async (t: Omit<Transaction, 'id' | 'userId' | 'createdAt'>) => {
        try {
            await authFetch(`${API_URL}/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) });
            await fetchTransactions();
        } catch (error) { console.error(error); }
    };

    const updateTransaction = async (id: string, t: Partial<Transaction>) => {
        try {
            await authFetch(`${API_URL}/transactions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) });
            await fetchTransactions();
        } catch (error) { console.error(error); }
    };

    const removeTransaction = async (id: string) => {
        try {
            await authFetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (error) { console.error(error); }
    };

    const addCategory = async (name: string, type: 'income' | 'expense') => {
        try {
            const res = await authFetch(`${API_URL}/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, type }) });
            if (res.ok) {
                const data = await res.json();
                setCategories(prev => [...prev, data]);
            }
        } catch (error) { console.error(error); }
    };

    const updateCategory = async (id: string, name: string, type: 'income' | 'expense') => {
        try {
            const res = await authFetch(`${API_URL}/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, type }) });
            if (res.ok) {
                const updatedCat = await res.json();
                setCategories(prev => prev.map(c => c.id === id ? updatedCat : c));
            }
        } catch (error) { console.error(error); }
    };

    const removeCategory = async (id: string) => {
        try {
            await authFetch(`${API_URL}/categories/${id}`, { method: 'DELETE' });
            setCategories(prev => prev.filter(c => c.id !== id));
        } catch (error) { console.error(error); }
    };

    const addMember = async (name: string, surname: string | undefined, email: string | undefined, category: string) => {
        try {
            const res = await authFetch(`${API_URL}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, surname, email, category }) });
            if (res.ok) {
                const data = await res.json();
                setMembers(prev => [...prev, data]);
            } else {
                const errorData = await res.json();
                alert(errorData.error || 'Erro ao adicionar membro');
            }
        } catch (error) { console.error(error); }
    };

    const updateMember = async (id: string, name: string, surname: string | undefined, email: string | undefined, category: string) => {
        try {
            const res = await authFetch(`${API_URL}/members/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, surname, email, category }) });
            if (res.ok) {
                const updated = await res.json();
                setMembers(prev => prev.map(m => m.id === id ? updated : m));
            }
        } catch (error) { console.error(error); }
    };

    const removeMember = async (id: string) => {
        try {
            await authFetch(`${API_URL}/members/${id}`, { method: 'DELETE' });
            setMembers(prev => prev.filter(m => m.id !== id));
        } catch (error) { console.error(error); }
    };

    const logout = () => signOut();

    const getSummary = () => {
        const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);

        const totalSpent = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => {
            let myShare = t.amount;
            if (t.isShared && t.splitDetails?.splits) {
                const meSplit = t.splitDetails.splits.find((s: any) => s.memberId === 'me');
                if (meSplit) myShare = meSplit.amount;
                else myShare = 0;
            }
            return acc + myShare;
        }, 0);

        const currentBalance = totalIncome - totalSpent;

        const memberBalances: Record<string, number> = {};
        members.forEach(m => memberBalances[m.id] = 0);

        filteredTransactions.filter(t => t.isShared && t.type === 'expense').forEach(t => {
            if (!t.splitDetails?.splits) return;

            t.splitDetails.splits.forEach((split: any) => {
                if (split.memberId === t.payer) return;

                if (t.payer === 'me') {
                    if (memberBalances[split.memberId] !== undefined) {
                        memberBalances[split.memberId] += split.amount;
                    }
                } else {
                    if (split.memberId === 'me') {
                        if (memberBalances[t.payer] !== undefined) {
                            memberBalances[t.payer] -= split.amount;
                        }
                    }
                }
            });
        });

        const netBalance = Object.values(memberBalances).reduce((acc, val) => acc + val, 0);

        return {
            totalIncome,
            totalSpent,
            currentBalance,
            netBalance,
            memberBalances,
            hasSharedTransactions: filteredTransactions.some(t => t.isShared)
        };
    };

    if (!isClerkLoaded || loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>Carregando...</div>;
    if (!clerkUser || !user) return <Login />;

    return (
        <FinanceContext.Provider value={{
            user, transactions, filteredTransactions, categories, selectedDate, setSelectedDate,
            addTransaction, updateTransaction, removeTransaction,
            addCategory, updateCategory, removeCategory,
            members, addMember, updateMember, removeMember,
            getSummary, logout
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

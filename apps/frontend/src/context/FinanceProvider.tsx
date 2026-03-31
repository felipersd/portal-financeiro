import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { FinanceContext } from './FinanceContext';
import { Login } from '../components/Login';
import { LoadingScreen } from '../components/LoadingScreen';
import type { User, Transaction, Category, GroupMember, BudgetRule } from '../types';

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
    const { getToken, signOut } = useAuth();

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [serverError, setServerError] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [budgetRule, setBudgetRule] = useState<BudgetRule | null>(null);
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

    const fetchBudgetRule = React.useCallback(async (month: string) => {
        try {
            const res = await authFetch(`${API_URL}/budget-rules/${month}`);
            if (res.ok) setBudgetRule(await res.json());
        } catch (error) { console.error(error); }
    }, [API_URL, authFetch]);

    const checkAuth = React.useCallback(async () => {
        try {
            const res = await authFetch(`${API_URL}/auth/me`);
            if (res.ok) {
                setServerError(false);
                setUser(await res.json());
                fetchTransactions();
                fetchCategories();
                fetchMembers();
            } else if (res.status === 401) {
                setServerError(false);
                setUser(null);
                try {
                    await signOut();
                } catch (e) {
                    console.error('Error signing out:', e);
                }
            } else {
                setServerError(true);
            }
        } catch (error) {
            console.error('Network error checking auth:', error);
            setServerError(true);
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

    useEffect(() => {
        if (user) {
            const monthStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
            fetchBudgetRule(monthStr);
        }
    }, [selectedDate, user, fetchBudgetRule]);

    const filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === selectedDate.getMonth() && tDate.getFullYear() === selectedDate.getFullYear();
    });

    const addTransaction = async (t: Omit<Transaction, 'id' | 'userId' | 'createdAt'>) => {
        setIsProcessing(true);
        try {
            await authFetch(`${API_URL}/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) });
            await fetchTransactions();
        } catch (error) { console.error(error); } finally { setIsProcessing(false); }
    };

    const updateTransaction = async (id: string, t: Partial<Transaction>) => {
        setIsProcessing(true);
        try {
            await authFetch(`${API_URL}/transactions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) });
            await fetchTransactions();
        } catch (error) { console.error(error); } finally { setIsProcessing(false); }
    };

    const removeTransaction = async (id: string) => {
        setIsProcessing(true);
        try {
            await authFetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' });
            setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (error) { console.error(error); } finally { setIsProcessing(false); }
    };

    const addCategory = async (name: string, type: 'income' | 'expense') => {
        setIsProcessing(true);
        try {
            const res = await authFetch(`${API_URL}/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, type }) });
            if (res.ok) {
                const data = await res.json();
                setCategories(prev => [...prev, data]);
            }
        } catch (error) { console.error(error); } finally { setIsProcessing(false); }
    };

    const updateCategory = async (id: string, name: string, type: 'income' | 'expense') => {
        setIsProcessing(true);
        try {
            const res = await authFetch(`${API_URL}/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, type }) });
            if (res.ok) {
                const updatedCat = await res.json();
                setCategories(prev => prev.map(c => c.id === id ? updatedCat : c));
            }
        } catch (error) { console.error(error); } finally { setIsProcessing(false); }
    };

    const removeCategory = async (id: string) => {
        setIsProcessing(true);
        try {
            await authFetch(`${API_URL}/categories/${id}`, { method: 'DELETE' });
            setCategories(prev => prev.filter(c => c.id !== id));
        } catch (error) { console.error(error); } finally { setIsProcessing(false); }
    };

    const addMember = async (name: string, surname: string | undefined, email: string | undefined, category: string) => {
        setIsProcessing(true);
        try {
            const res = await authFetch(`${API_URL}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, surname, email, category }) });
            if (res.ok) {
                const data = await res.json();
                setMembers(prev => [...prev, data]);
            } else {
                const errorData = await res.json();
                alert(errorData.error || 'Erro ao adicionar membro');
            }
        } catch (error) { console.error(error); } finally { setIsProcessing(false); }
    };

    const updateMember = async (id: string, name: string, surname: string | undefined, email: string | undefined, category: string) => {
        setIsProcessing(true);
        try {
            const res = await authFetch(`${API_URL}/members/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, surname, email, category }) });
            if (res.ok) {
                const updated = await res.json();
                setMembers(prev => prev.map(m => m.id === id ? updated : m));
            }
        } catch (error) { console.error(error); } finally { setIsProcessing(false); }
    };

    const removeMember = async (id: string) => {
        setIsProcessing(true);
        try {
            await authFetch(`${API_URL}/members/${id}`, { method: 'DELETE' });
            setMembers(prev => prev.filter(m => m.id !== id));
        } catch (error) { console.error(error); } finally { setIsProcessing(false); }
    };

    const updateBudgetRule = async (month: string, data: Partial<BudgetRule>) => {
        setIsProcessing(true);
        try {
            const res = await authFetch(`${API_URL}/budget-rules/${month}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) setBudgetRule(await res.json());
        } catch (error) { console.error(error); } finally { setIsProcessing(false); }
    };

    const logout = () => signOut();

    const getSummary = () => {
        const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);

        const totalSpent = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => {
            let myShare = t.amount;
            if (t.isShared && t.splitDetails?.splits) {
                const meSplit = t.splitDetails.splits.find((s: { memberId: string; amount: number }) => s.memberId === 'me');
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

            t.splitDetails.splits.forEach((split: { memberId: string; amount: number }) => {
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

    if (!isClerkLoaded || loading) return <LoadingScreen />;
    if (serverError) return <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', textAlign: 'center', padding: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--danger)' }}>Erro de Conexão</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Não foi possível conectar ao servidor. Por favor, verifique sua conexão ou tente novamente mais tarde.</p>
        <button onClick={() => window.location.reload()} className="btn-primary" style={{ padding: '0.75rem 2rem', borderRadius: '0.5rem', background: 'var(--primary-gradient)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Tentar Novamente</button>
    </div>;
    if (!clerkUser || !user) return <Login />;

    return (
        <FinanceContext.Provider value={{
            user, transactions, filteredTransactions, categories, selectedDate, setSelectedDate,
            addTransaction, updateTransaction, removeTransaction,
            addCategory, updateCategory, removeCategory,
            members, addMember, updateMember, removeMember,
            budgetRule, fetchBudgetRule, updateBudgetRule,
            getSummary, logout
        }}>
            {isProcessing && <LoadingScreen />}
            {children}
        </FinanceContext.Provider>
    );
};

import React, { useState, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { FinanceContext } from './FinanceContext';
import { Login } from '../components/Login';
import { LoadingScreen } from '../components/LoadingScreen';
import { summarize } from '../utils/summary';
import type { User, Transaction, Category, GroupMember, BudgetRule, SharingState } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';
class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
}

// The entire in-memory cache is replaced when the signed-in account changes.
const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [client] = useState(() => new QueryClient({ defaultOptions: {
        queries: { staleTime: 30000, gcTime: 300000, retry: (count, error) => count < 1 && (!(error instanceof ApiError) || error.status >= 500) },
        mutations: { retry: false },
    } }));
    return <QueryClientProvider client={client}><FinanceData>{children}</FinanceData></QueryClientProvider>;
};
export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoaded } = useUser();
    if (!isLoaded) return <LoadingScreen />;
    if (!user) return <Login />;
    return <AccountProvider key={user.id}>{children}</AccountProvider>;
};

const FinanceData: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { getToken, signOut } = useAuth();
    const client = useQueryClient();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const writeLock = useRef(false);
    const year = selectedDate.getFullYear();
    const month = `${year}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
        const token = await getToken();
        if (!token) throw new ApiError(401, 'Sua sessão expirou. Entre novamente.');
        const headers = new Headers(options.headers);
        headers.set('Authorization', `Bearer ${token}`);
        if (options.body) headers.set('Content-Type', 'application/json');
        const signal = AbortSignal.any([AbortSignal.timeout(15000), ...(options.signal ? [options.signal] : [])]);
        const response = await fetch(`${API_URL}${path}`, { ...options, headers, signal, cache: 'no-store' });
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new ApiError(response.status, body.error || body.message || 'Não foi possível concluir. Tente novamente.');
        }
        return response.status === 204 ? undefined as T : response.json();
    }
    const profile = useQuery({ queryKey: ['profile'], queryFn: ({ signal }) => api<User>('/auth/me', { signal }), staleTime: 300000 });
    const enabled = profile.isSuccess;
    const txQuery = useQuery({ queryKey: ['transactions', year], queryFn: ({ signal }) => api<Transaction[]>(`/transactions?year=${year}`, { signal }), enabled });
    const catQuery = useQuery({ queryKey: ['categories'], queryFn: ({ signal }) => api<Category[]>('/categories', { signal }), enabled });
    const memberQuery = useQuery({ queryKey: ['members'], queryFn: ({ signal }) => api<GroupMember[]>('/members', { signal }), enabled });
    const budgetQuery = useQuery({ queryKey: ['budget', month], queryFn: ({ signal }) => api<BudgetRule>(`/budget-rules/${month}`, { signal }), enabled });
    const sharingQuery = useQuery({ queryKey: ['sharing'], queryFn: ({ signal }) => api<SharingState>('/sharing', { signal }), enabled, refetchInterval: 60000 });
    const mutation = useMutation({ mutationFn: (input: { path: string; method: string; body?: unknown }) =>
        api(input.path, { method: input.method, body: input.body === undefined ? undefined : JSON.stringify(input.body) }) });

    async function write(path: string, method: string, body: unknown, keys: string[]): Promise<boolean> {
        if (writeLock.current) return false;
        writeLock.current = true;
        setErrorMessage(null);
        try {
            await mutation.mutateAsync({ path, method, body });
            await Promise.all(keys.map(key => client.invalidateQueries({ queryKey: [key] })));
            return true;
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Erro de conexão. Seus dados não foram confirmados.');
            return false;
        } finally { writeLock.current = false; }
    }
    const transactions = txQuery.data || [];
    const categories = catQuery.data || [];
    const members = memberQuery.data || [];
    const filteredTransactions = transactions.filter(t => t.date.slice(0, 7) === month);
    const initialError = [profile, txQuery, catQuery, memberQuery, budgetQuery].find(q => q.isError);
    if (initialError) return <main className="card" role="alert"><h2>Não foi possível carregar suas finanças</h2>
        <p>{initialError.error?.message}</p><button className="btn-primary" onClick={() => void client.refetchQueries()}>Tentar novamente</button>
        <button className="btn-secondary" onClick={() => { client.clear(); void signOut(); }}>Sair</button></main>;
    if (profile.isPending || txQuery.isPending || catQuery.isPending || memberQuery.isPending || budgetQuery.isPending) return <LoadingScreen />;
    return <FinanceContext.Provider value={{
        user: profile.data || null, transactions, filteredTransactions, categories, members, selectedDate, setSelectedDate,
        budgetRule: budgetQuery.data || null,
        getSummary: () => summarize(filteredTransactions, members),
        addTransaction: t => write('/transactions', 'POST', t, ['transactions', 'sharing']),
        updateTransaction: (id, t) => write(`/transactions/${id}`, 'PUT', t, ['transactions']),
        removeTransaction: id => write(`/transactions/${id}`, 'DELETE', undefined, ['transactions', 'sharing']),
        addCategory: (name, type) => write('/categories', 'POST', { name, type }, ['categories']),
        updateCategory: (id, name, type) => write(`/categories/${id}`, 'PUT', { name, type }, ['categories']),
        removeCategory: id => write(`/categories/${id}`, 'DELETE', undefined, ['categories']),
        addMember: (name, surname, email, category) => write('/members', 'POST', { name, surname, email, category }, ['members']),
        updateMember: (id, name, surname, email, category) => write(`/members/${id}`, 'PUT', { name, surname, email, category }, ['members']),
        removeMember: id => write(`/members/${id}`, 'DELETE', undefined, ['members', 'sharing']),
        fetchBudgetRule: async () => { await client.invalidateQueries({ queryKey: ['budget'] }); return true; },
        updateBudgetRule: (period, data) => write(`/budget-rules/${period}`, 'PUT', data, ['budget']),
        sharing: sharingQuery.data || { connections: [], shares: [] },
        sharingError: sharingQuery.error?.message || null,
        isProcessing: mutation.isPending,
        inviteMember: memberId => write('/sharing/connections', 'POST', { memberId }, ['sharing']),
        decideConnection: (id, action) => write(`/sharing/connections/${id}/${action}`, 'POST', undefined, ['sharing']),
        shareExpense: (id, memberId) => write(`/sharing/transactions/${id}`, 'POST', { memberId }, ['sharing']),
        decideShare: (id, action) => write(`/sharing/expenses/${id}/${action}`, 'POST', undefined, ['sharing', 'transactions']),
        refreshSharing: () => { void client.invalidateQueries({ queryKey: ['sharing'] }); void client.invalidateQueries({ queryKey: ['transactions'] }); },
        logout: () => { client.clear(); void signOut(); },
    }}>
        {errorMessage && <div role="alert" className="operation-error"><span>{errorMessage}</span><button onClick={() => setErrorMessage(null)} aria-label="Fechar aviso">×</button></div>}
        {mutation.isPending && <div role="status" className="operation-status">Salvando…</div>}
        {children}
    </FinanceContext.Provider>;
};

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FinanceProvider } from './FinanceProvider';
import { useFinance } from './FinanceContext';

const auth = vi.hoisted(() => ({ user: { id: 'alice' }, getToken: vi.fn(async () => 'token'), signOut: vi.fn() }));
vi.mock('@clerk/clerk-react', () => ({ useUser: () => ({ user: auth.user, isLoaded: true }), useAuth: () => auth }));

function Probe() {
    const finance = useFinance();
    return <div><span>{finance.user?.name}</span><span data-testid="count">{finance.transactions.length}</span>
        <button onClick={() => finance.setSelectedDate(new Date(2026, 8, 1))}>Set September</button>
        <button onClick={() => finance.setSelectedDate(new Date(2026, 9, 1))}>Set October</button>
        <button onClick={() => void finance.removeTransaction('owned')}>Delete</button></div>;
}
describe('Account cache and write feedback', () => {
    let calls: Array<{ path: string; method: string }>;
    beforeEach(() => {
        auth.user = { id: 'alice' };
        calls = [];
        vi.stubGlobal('fetch', vi.fn(async (url: string, options: RequestInit = {}) => {
            const path = url.replace('/api', '');
            calls.push({ path, method: options.method || 'GET' });
            if (options.method === 'DELETE') return new Response(JSON.stringify({ error: 'Conta aceita não pode ser excluída.' }), { status: 409 });
            let data: unknown = [];
            if (path === '/auth/me') data = { id: auth.user.id, name: auth.user.id, email: `${auth.user.id}@example.test` };
            if (path.startsWith('/transactions')) data = [{ id: 'owned', description: 'Private', amount: 10, type: 'expense', date: '2026-09-20', userId: auth.user.id }];
            if (path.startsWith('/budget-rules')) data = { divisions: [], mapping: {} };
            if (path === '/sharing') data = { connections: [], shares: [] };
            return new Response(JSON.stringify(data), { status: 200 });
        }));
    });
    afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
    it('does not reauthenticate or reload members when switching months within one year', async () => {
        render(<FinanceProvider><Probe /></FinanceProvider>);
        await screen.findByText('alice');
        fireEvent.click(screen.getByText('Set September'));
        await screen.findByText('Set October');
        const txCalls = calls.filter(c => c.path === '/transactions?year=2026').length;
        fireEvent.click(screen.getByText('Set October'));
        await waitFor(() => expect(calls.some(c => c.path === '/budget-rules/2026-10')).toBe(true));
        expect(calls.filter(c => c.path === '/auth/me')).toHaveLength(1);
        expect(calls.filter(c => c.path === '/members')).toHaveLength(1);
        expect(calls.filter(c => c.path === '/transactions?year=2026')).toHaveLength(txCalls);
    });
    it('retains the item and shows an error when deletion is rejected', async () => {
        render(<FinanceProvider><Probe /></FinanceProvider>);
        await screen.findByText('alice');
        fireEvent.click(screen.getByText('Delete'));
        expect(await screen.findByRole('alert')).toHaveTextContent('Conta aceita não pode ser excluída.');
        expect(screen.getByTestId('count')).toHaveTextContent('1');
    });
    it('creates a fresh cache for a different signed-in account', async () => {
        const view = render(<FinanceProvider><Probe /></FinanceProvider>);
        await screen.findByText('alice');
        auth.user = { id: 'bob' };
        view.rerender(<FinanceProvider><Probe /></FinanceProvider>);
        expect(screen.queryByText('alice')).not.toBeInTheDocument();
        await screen.findByText('bob');
        expect(calls.filter(c => c.path === '/auth/me')).toHaveLength(2);
    });
});

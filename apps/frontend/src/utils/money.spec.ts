import { describe, it, expect } from 'vitest';
import { splitEqually, cents } from './money';
import { summarize } from './summary';

describe('Exact shared finances', () => {
    it('allocates every cent exactly once', () => {
        expect(splitEqually(100, ['me', 'a', 'b']).map(s => s.amount)).toEqual([33.34, 33.33, 33.33]);
        for (let value = 1; value < 500; value++) {
            expect(splitEqually(value / 100, ['me', 'a', 'b']).reduce((sum, s) => sum + cents(s.amount), 0)).toBe(value);
        }
    });
    it('counts only my share, with exact balance arithmetic', () => {
        const base = { id: 'one', description: 'Test', category: 'Casa', date: '2026-09-20', createdAt: '', userId: 'owner', payer: 'me' };
        const summary = summarize([
            { ...base, type: 'income', amount: 100, isShared: false },
            { ...base, type: 'expense', amount: 100, isShared: true, splitDetails: { splits: splitEqually(100, ['me', 'a', 'b']) } },
            { ...base, type: 'expense', amount: 0.1, isShared: false },
            { ...base, type: 'expense', amount: 0.2, isShared: false },
        ], [{ id: 'a', name: 'Ana', surname: null, email: null, category: 'Amiga' }, { id: 'b', name: 'Bia', surname: null, email: null, category: 'Amiga' }]);
        expect(summary.totalSpent).toBe(33.64);
        expect(summary.currentBalance).toBe(66.36);
        expect(summary.netBalance).toBe(66.66);
    });
});

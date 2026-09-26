import { describe, expect, it } from 'vitest';
import { monthlyAnalysis } from './monthlyAnalysis';
import type { Transaction } from '../types';
const base: Transaction = {
    id: 'one',
    userId: 'owner',
    description: 'Fixture',
    amount: 0.3,
    type: 'expense',
    category: 'Alimentação',
    date: '2026-09-01T12:00:00Z',
    createdAt: '2026-09-01T12:00:00Z',
    isShared: false,
    payer: 'me',
};
describe('Monthly personal reports', () => {
    it('uses exact cents and only the owner portion, plus accepted incoming expenses', () => {
        const result = monthlyAnalysis(
            [
                {
                    ...base,
                    isShared: true,
                    splitDetails: {
                        splits: [
                            { memberId: 'me', amount: 0.1 },
                            { memberId: 'friend', amount: 0.2 },
                        ],
                    },
                },
                { ...base, id: 'received', amount: 0.2, readOnly: true },
                { ...base, id: 'salary', type: 'income', amount: 1 },
            ],
            new Date(2026, 8, 1),
        );
        expect(result.expense).toBe(0.3);
        expect(result.balance).toBe(0.7);
        expect(result.shared).toBe(0.3);
        expect(result.daily[29].balance).toBe(0.7);
    });
    it('filters by financial date and groups shared tags by normalized name, without adding tags to expenses', () => {
        const result = monthlyAnalysis(
            [
                {
                    ...base,
                    tags: [
                        { id: 'local', name: 'Mercado', color: '#ffffff' },
                        { id: 'two', name: 'Casa', color: '#ffffff' },
                    ],
                },
                {
                    ...base,
                    id: 'shared',
                    amount: 0.7,
                    tags: [{ id: 'shared:mercado', name: 'mercado', color: '#ffffff' }],
                },
                { ...base, id: 'old', date: '2026-08-31T23:00:00Z' },
            ],
            new Date(2026, 8, 1),
        );
        expect(result.count).toBe(2);
        expect(result.expense).toBe(1);
        expect(result.tags).toEqual([
            { name: 'Mercado', value: 1 },
            { name: 'Casa', value: 0.3 },
        ]);
        expect(result.untagged).toBe(0);
    });
    it('supports an empty leap month and distinguishes recurring expenses from variable ones', () => {
        expect(monthlyAnalysis([], new Date(2024, 1, 1)).daily).toHaveLength(29);
        const result = monthlyAnalysis(
            [
                { ...base, isFixed: true },
                { ...base, id: 'two', amount: 0.7 },
            ],
            new Date(2026, 8, 1),
        );
        expect(result.fixed).toBe(0.3);
        expect(result.variable).toBe(0.7);
        expect(result.untagged).toBe(1);
    });
});

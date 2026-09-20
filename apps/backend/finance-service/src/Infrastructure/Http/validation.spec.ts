import { transactionSchema, memberSchema } from './validation';

const valid = { description: 'Mercado', amount: 100, type: 'expense', category: 'Casa', date: '2026-09-20' };
describe('Financial contracts', () => {
    it.each([-1, 0, Infinity, NaN, 1.001, '10junk', '10', 10000001])('rejects invalid amount %p', amount => {
        expect(transactionSchema.safeParse({ ...valid, amount }).success).toBe(false);
    });
    it.each(['2026-02-30', 'invalid', '2026-13-01'])('rejects invalid date %s', date => {
        expect(transactionSchema.safeParse({ ...valid, date }).success).toBe(false);
    });
    it.each([0, -2, 2.5, 121, Infinity])('bounds recurrence %p', recurrenceCount => {
        expect(transactionSchema.safeParse({ ...valid, recurrenceCount }).success).toBe(false);
    });
    it('checks split sum and duplicate members', () => {
        const parse = (splits: unknown) => transactionSchema.safeParse({ ...valid, isShared: true, splitDetails: { splits } }).success;
        expect(parse([{ memberId: 'me', amount: 50 }, { memberId: 'friend', amount: 50 }])).toBe(true);
        expect(parse([{ memberId: 'me', amount: 50 }, { memberId: 'me', amount: 50 }])).toBe(false);
        expect(parse([{ memberId: 'me', amount: 60 }, { memberId: 'friend', amount: 50 }])).toBe(false);
    });
    it('keeps offline members optional and normalizes email', () => {
        expect(memberSchema.parse({ name: ' Ana ', category: 'Amiga' }).name).toBe('Ana');
        expect(memberSchema.parse({ name: 'Ana', category: 'Amiga', email: ' ANA@example.com ' }).email).toBe('ana@example.com');
    });
});

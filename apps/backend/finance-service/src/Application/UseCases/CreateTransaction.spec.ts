import { CreateTransaction } from './CreateTransaction';
import { Transaction } from '../../Domain/Entities/Transaction';

describe('CreateTransaction', () => {
    let useCase: CreateTransaction;
    let mockTransactionRepository: any;

    beforeEach(() => {
        mockTransactionRepository = {
            createMany: jest.fn().mockResolvedValue(undefined),
        };
        useCase = new CreateTransaction(mockTransactionRepository);
    });

    it.each([
        ['monthly', '2024-01-31T12:00:00Z', ['2024-01-31', '2024-02-29', '2024-03-31']],
        ['yearly', '2024-02-29T12:00:00Z', ['2024-02-29', '2025-02-28', '2026-02-28']],
        ['daily', '2024-12-31T12:00:00Z', ['2024-12-31', '2025-01-01', '2025-01-02']],
    ])('keeps %s recurrences on real calendar dates', async (frequency, date, expected) => {
        await useCase.execute({
            description: 'Calendar',
            amount: 10,
            type: 'expense',
            category: 'Casa',
            date: new Date(date as string),
            isShared: false,
            payer: 'me',
            userId: 'user-1',
            installments: 3,
            frequency: frequency as 'monthly' | 'yearly' | 'daily',
        });
        const saved: Transaction[] = mockTransactionRepository.createMany.mock.calls[0][0];
        expect(saved.map((t) => t.date.toISOString().slice(0, 10))).toEqual(expected);
    });

    it('repeats salary income with tags and clamps the payday at month end', async () => {
        await useCase.execute({
            description: 'Salary',
            amount: 2500,
            type: 'income',
            category: 'Trabalho',
            date: new Date('2026-01-31T12:00:00Z'),
            isShared: false,
            payer: 'me',
            userId: 'user-1',
            frequency: 'monthly',
            installments: 3,
            tagIds: ['tag-1'],
        });
        const saved: Transaction[] = mockTransactionRepository.createMany.mock.calls[0][0];
        expect(saved.map((transaction) => transaction.date.toISOString().slice(0, 10))).toEqual([
            '2026-01-31',
            '2026-02-28',
            '2026-03-31',
        ]);
        expect(
            saved.every(
                (transaction) =>
                    transaction.type === 'income' &&
                    transaction.amount === 2500 &&
                    transaction.tagIds[0] === 'tag-1',
            ),
        ).toBe(true);
    });

    it('should create a single transaction', async () => {
        const data = {
            description: 'Test',
            amount: 100,
            type: 'expense' as const,
            category: 'Food',
            date: new Date('2023-01-01'),
            isShared: false,
            payer: 'me' as const,
            userId: 'user-1',
        };

        const result = await useCase.execute(data);

        expect(result).toBeInstanceOf(Transaction);
        expect(result.description).toBe('Test');
        expect(mockTransactionRepository.createMany).toHaveBeenCalledTimes(1);
    });
    it('creates only one seed occurrence for a fixed rule instead of ten years of rows', async () => {
        await useCase.execute({
            description: 'Rent',
            amount: 100,
            type: 'expense',
            category: 'Casa',
            date: new Date('2026-09-23'),
            isShared: false,
            payer: 'me',
            userId: 'user-1',
            frequency: 'fixed',
        });
        const saved: Transaction[] = mockTransactionRepository.createMany.mock.calls[0][0];
        expect(saved).toHaveLength(1);
        expect(saved[0].isFixed).toBe(true);
        expect(saved[0].recurrenceId).toBeTruthy();
    });

    it('should create recurring transactions', async () => {
        const data = {
            description: 'Rent',
            amount: 1000,
            type: 'expense' as const,
            category: 'Housing',
            date: new Date(2023, 0, 1), // Jan 1, 2023 Local Time
            isShared: true,
            payer: 'me' as const,
            userId: 'user-1',
            installments: 3,
            frequency: 'monthly' as const,
        };

        const result = await useCase.execute(data);

        expect(mockTransactionRepository.createMany).toHaveBeenCalledTimes(1);

        // Check recurrence ID is same for all
        const calls = mockTransactionRepository.createMany.mock.calls[0][0].map((t: Transaction) => [t]);
        const recurrenceId = calls[0][0].recurrenceId;
        expect(recurrenceId).toBeDefined();
        expect(calls[1][0].recurrenceId).toBe(recurrenceId);
        expect(calls[2][0].recurrenceId).toBe(recurrenceId);

        // Check descriptions
        expect(calls[0][0].description).toBe('Rent (1/3)');
        expect(calls[1][0].description).toBe('Rent (2/3)');
        expect(calls[2][0].description).toBe('Rent (3/3)');

        // Check dates
        expect(calls[0][0].date).toEqual(new Date(2023, 0, 1));
        expect(calls[1][0].date).toEqual(new Date(2023, 1, 1)); // Feb 1
        expect(calls[2][0].date).toEqual(new Date(2023, 2, 1)); // Mar 1
    });

    it('should handle weekly recurrence', async () => {
        const data = {
            description: 'Weekly',
            amount: 50,
            type: 'expense' as const,
            category: 'Food',
            date: new Date(2023, 0, 1),
            isShared: false,
            payer: 'me' as const,
            userId: 'user-1',
            installments: 2,
            frequency: 'weekly' as const,
        };

        await useCase.execute(data);

        const calls = mockTransactionRepository.createMany.mock.calls[0][0].map((t: Transaction) => [t]);
        expect(calls[0][0].date).toEqual(new Date(2023, 0, 1));
        expect(calls[1][0].date).toEqual(new Date(2023, 0, 8)); // +7 days
    });

    it('should handle yearly recurrence', async () => {
        const data = {
            description: 'Yearly',
            amount: 100,
            type: 'expense' as const,
            category: 'Tax',
            date: new Date(2023, 0, 1),
            isShared: false,
            payer: 'me' as const,
            userId: 'user-1',
            installments: 2,
            frequency: 'yearly' as const,
        };

        await useCase.execute(data);

        const calls = mockTransactionRepository.createMany.mock.calls[0][0].map((t: Transaction) => [t]);
        expect(calls[0][0].date).toEqual(new Date(2023, 0, 1));
        expect(calls[1][0].date).toEqual(new Date(2024, 0, 1)); // +1 year
    });
});

import { CreateTransaction } from './CreateTransaction';
import { Transaction } from '../../Domain/Entities/Transaction';

describe('CreateTransaction', () => {
    let useCase: CreateTransaction;
    let mockTransactionRepository: any;

    beforeEach(() => {
        mockTransactionRepository = {
            create: jest.fn().mockImplementation((t) => Promise.resolve(t))
        };
        useCase = new CreateTransaction(mockTransactionRepository);
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
            userId: 'user-1'
        };

        const result = await useCase.execute(data);

        expect(result).toBeInstanceOf(Transaction);
        expect(result.description).toBe('Test');
        expect(mockTransactionRepository.create).toHaveBeenCalledTimes(1);
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
            frequency: 'monthly' as const
        };

        const result = await useCase.execute(data);

        expect(mockTransactionRepository.create).toHaveBeenCalledTimes(3);

        // Check recurrence ID is same for all
        const calls = mockTransactionRepository.create.mock.calls;
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
            frequency: 'weekly' as const
        };

        await useCase.execute(data);

        const calls = mockTransactionRepository.create.mock.calls;
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
            frequency: 'yearly' as const
        };

        await useCase.execute(data);

        const calls = mockTransactionRepository.create.mock.calls;
        expect(calls[0][0].date).toEqual(new Date(2023, 0, 1));
        expect(calls[1][0].date).toEqual(new Date(2024, 0, 1)); // +1 year
    });
});

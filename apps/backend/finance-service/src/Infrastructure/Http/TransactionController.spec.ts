import { TransactionController } from './TransactionController';
import { Request, Response } from 'express';

describe('TransactionController', () => {
    let controller: TransactionController;
    let mockCreateTransaction: any;
    let mockGetTransactions: any;
    let mockUpdateTransaction: any;
    let mockDeleteTransaction: any;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        mockCreateTransaction = { execute: jest.fn() };
        mockGetTransactions = { execute: jest.fn() };
        mockUpdateTransaction = { execute: jest.fn() };
        mockDeleteTransaction = { execute: jest.fn() };
        controller = new TransactionController(
            mockCreateTransaction,
            mockGetTransactions,
            mockUpdateTransaction,
            mockDeleteTransaction
        );

        req = {
            body: {},
            params: {},
            query: {},
            user: { sub: 'user-1' }
        } as any;

        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
    });

    describe('handleCreate', () => {
        it('should create a transaction successfully', async () => {
            req.body = {
                description: 'Test',
                amount: 100,
                type: 'expense',
                category: 'Food',
                date: '2023-01-01',
                userId: 'user-1'
            };
            mockCreateTransaction.execute.mockResolvedValue(req.body);

            await controller.handleCreate(req as Request, res as Response);

            expect(mockCreateTransaction.execute).toHaveBeenCalledWith(expect.objectContaining({
                description: 'Test',
                amount: 100
            }));
            expect(res.json).toHaveBeenCalledWith(req.body);
        });

        it('should return 400 if required fields are missing', async () => {
            req.body = { description: 'Test' }; // Missing amount, etc.
            await controller.handleCreate(req as Request, res as Response);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should handle errors', async () => {
            req.body = {
                description: 'Test',
                amount: 100,
                type: 'expense',
                category: 'Food',
                date: '2023-01-01',
                userId: 'user-1'
            };
            mockCreateTransaction.execute.mockRejectedValue(new Error('Fail'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await controller.handleCreate(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(500);
            consoleSpy.mockRestore();
        });
    });

    describe('handleGet', () => {
        it('should return transactions for user', async () => {
            req.query = { userId: 'user-1' };
            mockGetTransactions.execute.mockResolvedValue([]);
            await controller.handleGet(req as Request, res as Response);
            expect(mockGetTransactions.execute).toHaveBeenCalledWith('user-1');
            expect(res.json).toHaveBeenCalledWith([]);
        });

        it('should handle service errors', async () => {
            req.query = { userId: 'user-1' };
            mockGetTransactions.execute.mockRejectedValue(new Error('Fail'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await controller.handleGet(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(500);
            consoleSpy.mockRestore();
        });
    });

    describe('handleUpdate', () => {
        it('should update transaction', async () => {
            req.params = { id: 'tx-1' };
            req.body = { description: 'Updated' };
            (req as any).user.sub = 'user-1';

            mockUpdateTransaction.execute.mockResolvedValue({});

            await controller.handleUpdate(req as Request, res as Response);

            expect(mockUpdateTransaction.execute).toHaveBeenCalledWith('tx-1', expect.objectContaining({
                description: 'Updated'
            }));
            expect(res.json).toHaveBeenCalled();
        });

        it('should fail if user not authenticated', async () => {
            (req as any).user = undefined;
            await controller.handleUpdate(req as Request, res as Response);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should handle service errors', async () => {
            req.params = { id: 'tx-1' };
            (req as any).user.sub = 'user-1';
            mockUpdateTransaction.execute.mockRejectedValue(new Error('Fail'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await controller.handleUpdate(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(500);
            consoleSpy.mockRestore();
        });
    });

    describe('handleDelete', () => {
        it('should delete transaction', async () => {
            req.params = { id: 'tx-1' };
            (req as any).user.sub = 'user-1';

            await controller.handleDelete(req as Request, res as Response);

            expect(mockDeleteTransaction.execute).toHaveBeenCalledWith('tx-1', 'user-1');
            expect(res.status).toHaveBeenCalledWith(204);
            expect(res.send).toHaveBeenCalled();
        });

        it('should fail if user not authenticated', async () => {
            (req as any).user = undefined;
            await controller.handleDelete(req as Request, res as Response);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should handle service errors', async () => {
            req.params = { id: 'tx-1' };
            (req as any).user.sub = 'user-1';
            mockDeleteTransaction.execute.mockRejectedValue(new Error('Fail'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await controller.handleDelete(req as Request, res as Response);

            expect(res.status).toHaveBeenCalledWith(500);
            consoleSpy.mockRestore();
        });
    });
});

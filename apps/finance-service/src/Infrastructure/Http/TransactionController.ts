import { Request, Response } from 'express';
import { CreateTransaction } from '../../Application/UseCases/CreateTransaction';
import { GetTransactions } from '../../Application/UseCases/GetTransactions';
import { UpdateTransaction } from '../../Application/UseCases/UpdateTransaction';
import { DeleteTransaction } from '../../Application/UseCases/DeleteTransaction';

export class TransactionController {
    constructor(
        private createTransaction: CreateTransaction,
        private getTransactions: GetTransactions,
        private updateTransaction: UpdateTransaction,
        private deleteTransaction: DeleteTransaction
    ) { }

    async handleCreate(req: Request, res: Response): Promise<void> {
        try {
            const { description, amount, type, category, date, isShared, payer, recurrenceId, splitDetails } = req.body;
            const userId = (req as any).user?.sub || req.body.userId;

            if (!description || !amount || !type || !category || !date || !userId) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            const transaction = await this.createTransaction.execute({
                description,
                amount,
                type,
                category,
                date: new Date(date),
                isShared: isShared || false,
                payer: payer || 'me',
                userId,
                recurrenceId,
                splitDetails
            });
            res.json(transaction);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async handleGet(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).user?.sub || req.query.userId;

            if (!userId || typeof userId !== 'string') {
                res.status(400).json({ error: 'Missing userId' });
                return;
            }

            const transactions = await this.getTransactions.execute(userId);
            res.json(transactions);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async handleUpdate(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { description, amount, type, category, date, isShared, payer, splitDetails } = req.body;
            const userId = (req as any).user?.sub;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const transaction = await this.updateTransaction.execute(id, {
                description,
                amount,
                type,
                category,
                date: new Date(date),
                isShared: isShared || false,
                payer: payer || 'me',
                userId,
                splitDetails
            });
            res.json(transaction);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async handleDelete(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const userId = (req as any).user?.sub;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            await this.deleteTransaction.execute(id, userId);
            res.status(204).send();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

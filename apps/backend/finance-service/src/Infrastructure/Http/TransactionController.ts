import { Request, Response } from 'express';
import { CreateTransaction } from '../../Application/UseCases/CreateTransaction';
import { GetTransactions } from '../../Application/UseCases/GetTransactions';
import { UpdateTransaction } from '../../Application/UseCases/UpdateTransaction';
import { DeleteTransaction } from '../../Application/UseCases/DeleteTransaction';
import { z } from 'zod';

// Validador Zod Oficial para DTO de Transações (Bloqueia sujeira e lixo gerado no payload)
const transactionSchema = z.object({
    description: z.string().min(2, "A descrição deve ter pelo menos 2 caracteres"),
    amount: z.number().positive("O valor deve ser maior que zero").or(z.string().transform(v => parseFloat(v)).refine(v => v > 0)),
    type: z.enum(['income', 'expense']),
    category: z.string().min(1),
    date: z.string().datetime().or(z.date()).or(z.string()), // Flexible by accepting valid Date strings
    isShared: z.boolean().optional().default(false),
    payer: z.string().optional().default('me'),
    recurrenceId: z.string().optional(),
    splitDetails: z.any().optional(),
    recurrenceFrequency: z.enum(['none', 'monthly', 'fixed']).optional(),
    recurrenceCount: z.number().optional()
});

export class TransactionController {
    constructor(
        private createTransaction: CreateTransaction,
        private getTransactions: GetTransactions,
        private updateTransaction: UpdateTransaction,
        private deleteTransaction: DeleteTransaction
    ) { }

    async handleCreate(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).internalUserId || req.body.userId;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized: Missing User Identification' });
                return;
            }

            // Validação de Contrato Firme usando Zod DTO
            const parsedData = transactionSchema.safeParse(req.body);
            
            if (!parsedData.success) {
                const errors = parsedData.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }));
                res.status(400).json({ error: 'Payload de Transação Inválido (Bad Request)', details: errors });
                return;
            }

            const payload = parsedData.data;

            const transaction = await this.createTransaction.execute({
                description: payload.description,
                amount: Number(payload.amount),
                type: payload.type,
                category: payload.category,
                date: new Date(payload.date),
                isShared: payload.isShared,
                payer: payload.payer,
                userId,
                recurrenceId: payload.recurrenceId,
                splitDetails: payload.splitDetails,
                frequency: payload.recurrenceFrequency === 'none' ? undefined : payload.recurrenceFrequency,
                isFixed: payload.recurrenceFrequency === 'fixed',
                installments: payload.recurrenceCount
            });
            res.json(transaction);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    async handleGet(req: Request, res: Response): Promise<void> {
        try {
            const userId = (req as any).internalUserId || req.query.userId;
            const yearStr = req.query.year as string;
            const year = yearStr ? parseInt(yearStr, 10) : undefined;

            if (!userId || typeof userId !== 'string') {
                res.status(400).json({ error: 'Missing userId' });
                return;
            }

            const transactions = await this.getTransactions.execute(userId, year);
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
            const userId = (req as any).internalUserId;

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
            const userId = (req as any).internalUserId;

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

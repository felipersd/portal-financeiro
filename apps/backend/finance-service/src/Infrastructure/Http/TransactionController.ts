import { pathParam } from './pathParam';
import { Request, Response } from 'express';
import { CreateTransaction } from '../../Application/UseCases/CreateTransaction';
import { GetTransactions } from '../../Application/UseCases/GetTransactions';
import { UpdateTransaction } from '../../Application/UseCases/UpdateTransaction';
import { DeleteTransaction } from '../../Application/UseCases/DeleteTransaction';
import { FinanceError } from '../../Domain/FinanceError';
import { transactionSchema } from './validation';

export function respondError(res: Response, error: unknown) {
    if (error instanceof FinanceError) return res.status(error.status).json({ error: error.message });
    if (error instanceof Error && ['Unauthorized', 'Transaction not found', 'Group member not found'].includes(error.message)) {
        return res.status(404).json({ error: 'Registro não encontrado.' });
    }
    console.error('Finance operation failed', error instanceof Error ? error.name : 'UnknownError');
    return res.status(500).json({ error: 'Não foi possível concluir a operação. Tente novamente.' });
}

export class TransactionController {
    constructor(private createTransaction: CreateTransaction, private getTransactions: GetTransactions,
        private updateTransaction: UpdateTransaction, private deleteTransaction: DeleteTransaction) {}
    async handleCreate(req: Request, res: Response): Promise<void> {
        const userId = (req as any).internalUserId;
        if (!userId) { res.status(401).json({ error: 'Não autenticado.' }); return; }
        const parsed = transactionSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message, details: parsed.error.issues }); return; }
        try {
            const data = parsed.data;
            res.json(await this.createTransaction.execute({ ...data, userId, date: new Date(data.date),
                frequency: data.recurrenceFrequency === 'none' ? undefined : data.recurrenceFrequency,
                isFixed: data.recurrenceFrequency === 'fixed', installments: data.recurrenceFrequency && data.recurrenceFrequency !== 'none' ? data.recurrenceCount : 1 }));
        } catch (error) { respondError(res, error); }
    }
    async handleGet(req: Request, res: Response): Promise<void> {
        const userId = (req as any).internalUserId;
        if (!userId) { res.status(401).json({ error: 'Não autenticado.' }); return; }
        const year = req.query.year === undefined ? undefined : Number(req.query.year);
        if (year !== undefined && (!Number.isInteger(year) || year < 1900 || year > 2200)) {
            res.status(400).json({ error: 'Ano inválido.' }); return;
        }
        try { res.json(await this.getTransactions.execute(userId, year)); }
        catch (error) { respondError(res, error); }
    }
    async handleUpdate(req: Request, res: Response): Promise<void> {
        const userId = (req as any).internalUserId;
        if (!userId) { res.status(401).json({ error: 'Não autenticado.' }); return; }
        const parsed = transactionSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message, details: parsed.error.issues }); return; }
        try { res.json(await this.updateTransaction.execute(pathParam(req, 'id'), { ...parsed.data, userId, date: new Date(parsed.data.date) })); }
        catch (error) { respondError(res, error); }
    }
    async handleDelete(req: Request, res: Response): Promise<void> {
        const userId = (req as any).internalUserId;
        if (!userId) { res.status(401).json({ error: 'Não autenticado.' }); return; }
        try { await this.deleteTransaction.execute(pathParam(req, 'id'), userId); res.status(204).send(); }
        catch (error) { respondError(res, error); }
    }
}

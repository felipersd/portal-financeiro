import { FinanceError } from '../../Domain/FinanceError';
import { pathParam } from './pathParam';
import { Request, Response } from 'express';
import { GetBudgetRule } from '../../Application/UseCases/GetBudgetRule';
import { UpdateBudgetRule } from '../../Application/UseCases/UpdateBudgetRule';
import { Logger } from '../Logger';
import { budgetSchema } from './validation';

export class BudgetRuleController {
    constructor(
        private getBudgetRule: GetBudgetRule,
        private updateBudgetRule: UpdateBudgetRule
    ) {}

    async handleGet(req: Request, res: Response) {
        try {
            const userId = (req as any).internalUserId;
            const month = pathParam(req, 'month');

            if (!month.match(/^(19|20|21|22)\d{2}-(0[1-9]|1[0-2])$/)) {
                return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM.' });
            }

            const rule = await this.getBudgetRule.execute(userId, month);
            res.json(rule);
        } catch (error) {
            Logger.error('Error fetching budget rule', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async handleUpdate(req: Request, res: Response) {
        try {
            const userId = (req as any).internalUserId;
            const month = pathParam(req, 'month');
            
            if (!month.match(/^(19|20|21|22)\d{2}-(0[1-9]|1[0-2])$/)) {
                return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM.' });
            }

            const parsed = budgetSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ error: 'Revise as divisões do orçamento: elas precisam somar 100%.', details: parsed.error.issues });
            const rule = await this.updateBudgetRule.execute(userId, month, parsed.data);
            res.json(rule);
        } catch (error: any) {
            if (error instanceof FinanceError) return res.status(error.status).json({ error: error.message });
            Logger.error('Error updating budget rule', error);
            if (error.message === 'Rule not found for this month') {
                return res.status(404).json({ error: error.message });
            }
            if (error.message.includes('A soma das divisẽes') || error.message.includes('Limite máximo')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

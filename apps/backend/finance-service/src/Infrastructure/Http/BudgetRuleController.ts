import { Request, Response } from 'express';
import { GetBudgetRule } from '../../Application/UseCases/GetBudgetRule';
import { UpdateBudgetRule } from '../../Application/UseCases/UpdateBudgetRule';
import { Logger } from '../Logger';

export class BudgetRuleController {
    constructor(
        private getBudgetRule: GetBudgetRule,
        private updateBudgetRule: UpdateBudgetRule
    ) {}

    async handleGet(req: Request, res: Response) {
        try {
            const userId = (req as any).internalUserId;
            const month = req.params.month;

            if (!month.match(/^\d{4}-\d{2}$/)) {
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
            const month = req.params.month;
            
            if (!month.match(/^\d{4}-\d{2}$/)) {
                return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM.' });
            }

            const rule = await this.updateBudgetRule.execute(userId, month, req.body);
            res.json(rule);
        } catch (error: any) {
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

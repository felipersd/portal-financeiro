import { FinanceError } from '../../Domain/FinanceError';
import { BudgetRule } from '../../Domain/Entities/BudgetRule';
import { BudgetRuleRepository } from '../../Domain/Interfaces/BudgetRuleRepository';
export class UpdateBudgetRule {
    constructor(private repository: BudgetRuleRepository) {}
    async execute(userId: string, month: string, updateData: Partial<BudgetRule>): Promise<BudgetRule> {
        // Will only update the specific month rule to preserve history
        let rule = await this.repository.findByMonth(userId, month);
        if (!rule) {
            throw new Error('Rule not found for this month');
        }
        if (updateData.revision !== undefined && updateData.revision !== rule.revision) throw new FinanceError(409, 'Este orçamento foi alterado em outra sessão. Atualize antes de salvar.');
        if (updateData.divisions !== undefined) rule.divisions = updateData.divisions;
        if (updateData.mapping !== undefined) rule.mapping = updateData.mapping;
        const updatedRule = await this.repository.update(rule.id, rule);
        return updatedRule;
    }
}
